import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as stopsDao from '@/db/stopsDao';
import * as outboxDao from '@/db/outboxDao';
import * as syncService from '@/services/syncService';
import { StopsProvider, useStopsContext } from '../StopsContext';
import type { Stop } from '@/types';

jest.mock('@/db/stopsDao');
jest.mock('@/db/outboxDao');
jest.mock('@/services/syncService');

// Controlled network state — tests toggle isConnected before rendering
let mockIsConnected = true;
let mockNetworkLoaded = true;

jest.mock('../network-mock', () => ({
  useNetworkMock: () => ({
    isConnected: mockIsConnected,
    networkLoaded: mockNetworkLoaded,
  }),
}));

const mockedStops = stopsDao as jest.Mocked<typeof stopsDao>;
const mockedOutbox = outboxDao as jest.Mocked<typeof outboxDao>;
const mockedSync = syncService as jest.Mocked<typeof syncService>;

function makeStop(id = 'stop-1', status: Stop['status'] = 'loaded'): Stop {
  return {
    id,
    slot: 'afternoon',
    customer: 'Hind Al-Rashid',
    area: 'Malaz',
    address: '5 Prince Sultan Rd',
    lat: 24.68,
    lng: 46.71,
    items: ['Backdrop 3×2m'],
    must_finish_by: '15:00',
    status,
    notes: null,
    proof_photo_url: null,
    failed_reason: null,
  };
}

function wrapper({ children }: { children: React.ReactNode }) {
  return <StopsProvider>{children}</StopsProvider>;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockIsConnected = true;
  mockNetworkLoaded = true;

  mockedStops.getAll.mockResolvedValue([]);
  mockedStops.getById.mockResolvedValue(null);
  mockedStops.upsertOne.mockResolvedValue(undefined);
  mockedStops.upsertAll.mockResolvedValue(undefined);
  mockedOutbox.enqueue.mockResolvedValue(undefined);
  mockedOutbox.getPendingStopIds.mockResolvedValue([]);
  mockedSync.refreshStops.mockResolvedValue([]);
  mockedSync.drainOutbox.mockResolvedValue([]);
});

// ---------------------------------------------------------------------------
// Initial load
// ---------------------------------------------------------------------------

describe('initial load', () => {
  it('shows fresh API data after online startup', async () => {
    const fresh = [makeStop('stop-1', 'en_route')];
    mockedSync.refreshStops.mockResolvedValue(fresh);

    const { result } = renderHook(() => useStopsContext(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockedSync.refreshStops).toHaveBeenCalledTimes(1);
    expect(result.current.stops).toEqual(fresh);
  });

  it('shows cached SQLite data when offline (no API call)', async () => {
    mockIsConnected = false;
    const cached = [makeStop()];
    mockedStops.getAll.mockResolvedValue(cached);

    const { result } = renderHook(() => useStopsContext(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockedSync.refreshStops).not.toHaveBeenCalled();
    expect(result.current.stops).toEqual(cached);
  });
});

// ---------------------------------------------------------------------------
// enqueueUpdate
// ---------------------------------------------------------------------------

describe('enqueueUpdate', () => {
  it('persists to SQLite and enqueues to outbox regardless of connectivity', async () => {
    const stop = makeStop('stop-1', 'loaded');
    mockedStops.getById.mockResolvedValue(stop);
    mockedStops.getAll.mockResolvedValue([stop]);

    const { result } = renderHook(() => useStopsContext(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.enqueueUpdate('stop-1', 'en_route');
    });

    expect(mockedStops.upsertOne).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'stop-1', status: 'en_route' }),
    );
    expect(mockedOutbox.enqueue).toHaveBeenCalledWith(
      'stop-1',
      expect.objectContaining({ status: 'en_route' }),
    );
  });

  it('applies the optimistic update to in-memory state immediately', async () => {
    const stop = makeStop('stop-1', 'loaded');
    // Ensure the stop exists in both SQLite and the in-memory stops list
    mockedStops.getById.mockResolvedValue(stop);
    mockedStops.getAll.mockResolvedValue([stop]);
    mockedSync.refreshStops.mockResolvedValue([stop]);
    // Keep drainOutbox pending so we can assert the optimistic state before it settles
    mockedSync.drainOutbox.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useStopsContext(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.enqueueUpdate('stop-1', 'en_route');
    });

    await waitFor(() => {
      const updated = result.current.stops.find((s) => s.id === 'stop-1');
      expect(updated?.status).toBe('en_route');
    });
  });

  it('drains the outbox when online', async () => {
    const stop = makeStop('stop-1', 'loaded');
    mockedStops.getById.mockResolvedValue(stop);
    mockedStops.getAll.mockResolvedValue([stop]);

    const { result } = renderHook(() => useStopsContext(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.enqueueUpdate('stop-1', 'en_route');
    });

    expect(mockedSync.drainOutbox).toHaveBeenCalled();
  });

  it('does NOT drain the outbox when offline', async () => {
    mockIsConnected = false;
    const stop = makeStop('stop-1', 'loaded');
    mockedStops.getById.mockResolvedValue(stop);
    mockedStops.getAll.mockResolvedValue([stop]);

    const { result } = renderHook(() => useStopsContext(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.enqueueUpdate('stop-1', 'en_route');
    });

    expect(mockedSync.drainOutbox).not.toHaveBeenCalled();
  });

  it('does nothing when the stop id does not exist', async () => {
    mockedStops.getById.mockResolvedValue(null);

    const { result } = renderHook(() => useStopsContext(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.enqueueUpdate('nonexistent', 'en_route');
    });

    expect(mockedStops.upsertOne).not.toHaveBeenCalled();
    expect(mockedOutbox.enqueue).not.toHaveBeenCalled();
  });

  it('passes photoUri and failedReason into the outbox payload', async () => {
    const stop = makeStop('stop-1', 'arrived');
    mockedStops.getById.mockResolvedValue(stop);
    mockedStops.getAll.mockResolvedValue([stop]);

    const { result } = renderHook(() => useStopsContext(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.enqueueUpdate(
        'stop-1', 'completed', undefined, 'file://proof.jpg', 'All good',
      );
    });

    expect(mockedOutbox.enqueue).toHaveBeenCalledWith(
      'stop-1',
      expect.objectContaining({
        status: 'completed',
        photoUri: 'file://proof.jpg',
        notes: 'All good',
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// Reconnect — drains outbox when going online
// ---------------------------------------------------------------------------

describe('reconnect behavior', () => {
  it('drains outbox and refreshes when isConnected transitions false → true', async () => {
    mockIsConnected = false;
    mockedStops.getAll.mockResolvedValue([makeStop()]);

    const { result, rerender } = renderHook(() => useStopsContext(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Simulate reconnect
    mockIsConnected = true;
    await act(async () => {
      rerender({});
    });

    await waitFor(() => {
      expect(mockedSync.drainOutbox).toHaveBeenCalled();
      expect(mockedSync.refreshStops).toHaveBeenCalled();
    });
  });
});
