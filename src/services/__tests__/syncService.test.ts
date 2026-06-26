import * as outboxDao from '@/db/outboxDao';
import * as stopsDao from '@/db/stopsDao';
import * as stopsService from '@/services/stopsService';
import { drainOutbox, refreshStops } from '../syncService';
import type { Stop } from '@/types';
import type { OutboxRow } from '@/db/outboxDao';

jest.mock('@/db/outboxDao');
jest.mock('@/db/stopsDao');
jest.mock('@/services/stopsService');

const mockedOutbox = outboxDao as jest.Mocked<typeof outboxDao>;
const mockedStops = stopsDao as jest.Mocked<typeof stopsDao>;
const mockedApi = stopsService as jest.Mocked<typeof stopsService>;

function makeStop(id = 'stop-1', status: Stop['status'] = 'loaded'): Stop {
  return {
    id,
    slot: 'afternoon',
    customer: 'Fatima Al-Harbi',
    area: 'Olaya',
    address: '10 King Fahd Rd',
    lat: 24.7,
    lng: 46.7,
    items: ['Balloon arch'],
    must_finish_by: '16:00',
    status,
    notes: null,
    proof_photo_url: null,
    failed_reason: null,
  };
}

function makeOutboxRow(
  id: string,
  stopId: string,
  status: Stop['status'] = 'en_route',
  createdAt = Date.now(),
): OutboxRow {
  return {
    id,
    stop_id: stopId,
    payload: { status },
    sync_state: 'pending',
    retry_count: 0,
    created_at: createdAt,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedOutbox.getPending.mockResolvedValue([]);
  mockedOutbox.remove.mockResolvedValue(undefined);
  mockedOutbox.markFailed.mockResolvedValue(undefined);
  mockedStops.getAll.mockResolvedValue([]);
  mockedStops.upsertAll.mockResolvedValue(undefined);
  mockedStops.upsertOne.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// drainOutbox
// ---------------------------------------------------------------------------

describe('drainOutbox', () => {
  it('returns current DB stops and calls no API when outbox is empty', async () => {
    const cached = [makeStop()];
    mockedStops.getAll.mockResolvedValue(cached);

    const result = await drainOutbox();

    expect(mockedApi.updateStopStatus).not.toHaveBeenCalled();
    expect(result).toEqual(cached);
  });

  it('calls updateStopStatus → upsertOne → remove on success', async () => {
    const row = makeOutboxRow('ob-1', 'stop-1', 'en_route');
    const updated = makeStop('stop-1', 'en_route');
    mockedOutbox.getPending.mockResolvedValue([row]);
    mockedApi.updateStopStatus.mockResolvedValue(updated);

    await drainOutbox();

    expect(mockedApi.updateStopStatus).toHaveBeenCalledWith(
      'stop-1',
      'en_route',
      undefined,
      undefined,
      undefined,
    );
    expect(mockedStops.upsertOne).toHaveBeenCalledWith(updated);
    expect(mockedOutbox.remove).toHaveBeenCalledWith('ob-1');
    expect(mockedOutbox.markFailed).not.toHaveBeenCalled();
  });

  it('remove is called AFTER upsertOne, not before', async () => {
    const callOrder: string[] = [];
    const row = makeOutboxRow('ob-1', 'stop-1');
    mockedOutbox.getPending.mockResolvedValue([row]);
    mockedApi.updateStopStatus.mockResolvedValue(makeStop('stop-1', 'en_route'));
    mockedStops.upsertOne.mockImplementation(async () => { callOrder.push('upsert'); });
    mockedOutbox.remove.mockImplementation(async () => { callOrder.push('remove'); });

    await drainOutbox();

    expect(callOrder).toEqual(['upsert', 'remove']);
  });

  it('calls markFailed — NOT remove or upsertOne — when API throws', async () => {
    const row = makeOutboxRow('ob-1', 'stop-1');
    mockedOutbox.getPending.mockResolvedValue([row]);
    mockedApi.updateStopStatus.mockRejectedValue(new Error('Network error'));

    await drainOutbox();

    expect(mockedOutbox.markFailed).toHaveBeenCalledWith('ob-1');
    expect(mockedOutbox.remove).not.toHaveBeenCalled();
    expect(mockedStops.upsertOne).not.toHaveBeenCalled();
  });

  it('continues processing subsequent entries when one fails', async () => {
    const rows = [
      makeOutboxRow('ob-1', 'stop-a', 'en_route', 100),
      makeOutboxRow('ob-2', 'stop-b', 'arrived', 200),
    ];
    mockedOutbox.getPending.mockResolvedValue(rows);
    mockedApi.updateStopStatus
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce(makeStop('stop-b', 'arrived'));

    await drainOutbox();

    expect(mockedOutbox.markFailed).toHaveBeenCalledWith('ob-1');
    expect(mockedOutbox.remove).toHaveBeenCalledWith('ob-2');
  });

  it('processes entries in FIFO order', async () => {
    const order: string[] = [];
    const rows = [
      makeOutboxRow('ob-1', 'stop-a', 'en_route', 100),
      makeOutboxRow('ob-2', 'stop-b', 'arrived', 200),
      makeOutboxRow('ob-3', 'stop-c', 'completed', 300),
    ];
    mockedOutbox.getPending.mockResolvedValue(rows);
    mockedApi.updateStopStatus.mockImplementation(async (id) => {
      order.push(id);
      return makeStop(id, 'en_route');
    });

    await drainOutbox();

    expect(order).toEqual(['stop-a', 'stop-b', 'stop-c']);
  });

  it('passes failedReason, photoUri, and notes from the payload', async () => {
    const row: OutboxRow = {
      id: 'ob-1',
      stop_id: 'stop-1',
      payload: {
        status: 'failed',
        failedReason: 'No access',
        photoUri: 'file://photo.jpg',
        notes: 'Gate locked',
      },
      sync_state: 'pending',
      retry_count: 0,
      created_at: Date.now(),
    };
    mockedOutbox.getPending.mockResolvedValue([row]);
    mockedApi.updateStopStatus.mockResolvedValue(makeStop('stop-1', 'failed'));

    await drainOutbox();

    expect(mockedApi.updateStopStatus).toHaveBeenCalledWith(
      'stop-1',
      'failed',
      'No access',
      'file://photo.jpg',
      'Gate locked',
    );
  });

  it('returns all stops from local DB after draining', async () => {
    const allStops = [makeStop('stop-1'), makeStop('stop-2')];
    mockedStops.getAll.mockResolvedValue(allStops);

    const result = await drainOutbox();

    expect(mockedStops.getAll).toHaveBeenCalled();
    expect(result).toEqual(allStops);
  });
});

// ---------------------------------------------------------------------------
// refreshStops
// ---------------------------------------------------------------------------

describe('refreshStops', () => {
  it('fetches from API and persists to local DB', async () => {
    const stops = [makeStop('stop-1'), makeStop('stop-2')];
    mockedApi.fetchStops.mockResolvedValue(stops);

    const result = await refreshStops();

    expect(mockedApi.fetchStops).toHaveBeenCalledTimes(1);
    expect(mockedStops.upsertAll).toHaveBeenCalledWith(stops);
    expect(result).toEqual(stops);
  });
});
