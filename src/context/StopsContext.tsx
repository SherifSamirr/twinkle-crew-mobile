import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import * as outboxDao from '@/db/outboxDao';
import * as stopsDao from '@/db/stopsDao';
import * as syncService from '@/services/syncService';
import type { Stop, StopStatus } from '@/types';

import { useNetworkMock } from './network-mock';

interface StopsContextValue {
  stops: Stop[];
  pendingStopIds: Set<string>;
  loading: boolean;
  error: string | null;
  enqueueUpdate(
    stopId: string,
    status: StopStatus,
    failedReason?: string,
    photoUri?: string,
    notes?: string | null,
  ): Promise<void>;
  refresh(): Promise<void>;
}

const StopsContext = createContext<StopsContextValue>({
  stops: [],
  pendingStopIds: new Set(),
  loading: true,
  error: null,
  enqueueUpdate: async () => {},
  refresh: async () => {},
});

async function derivePendingIds(): Promise<Set<string>> {
  const ids = await outboxDao.getPendingStopIds();
  return new Set(ids);
}

export function StopsProvider({ children }: { children: React.ReactNode }) {
  const { isConnected, networkLoaded } = useNetworkMock();
  const [stops, setStops] = useState<Stop[]>([]);
  const [pendingStopIds, setPendingStopIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track the previous isConnected value to detect false → true transitions
  const prevConnectedRef = useRef<boolean | null>(null);

  // Initial load: wait for the persisted network state to be read from AsyncStorage
  // before deciding whether to hit the API. isConnected is intentionally read via
  // closure here — the effect only runs once when networkLoaded first becomes true.
  useEffect(() => {
    if (!networkLoaded) return;
    let cancelled = false;
    async function init() {
      try {
        const cached = await stopsDao.getAll();
        if (!cancelled) setStops(cached);

        if (isConnected) {
          const fresh = await syncService.refreshStops();
          if (!cancelled) setStops(fresh);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load stops');
        }
      } finally {
        if (!cancelled) setLoading(false);
        if (!cancelled) setPendingStopIds(await derivePendingIds());
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [networkLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reconnect: drain outbox then refresh
  useEffect(() => {
    if (prevConnectedRef.current === false && isConnected) {
      async function onReconnect() {
        try {
          await syncService.drainOutbox();
          const fresh = await syncService.refreshStops();
          setStops(fresh);
        } catch {
          // best effort — outbox will be retried on next reconnect
        } finally {
          setPendingStopIds(await derivePendingIds());
        }
      }
      onReconnect();
    }
    prevConnectedRef.current = isConnected;
  }, [isConnected]);

  const enqueueUpdate = useCallback(
    async (
      stopId: string,
      status: StopStatus,
      failedReason?: string,
      photoUri?: string,
      notes?: string | null,
    ) => {
      const current = await stopsDao.getById(stopId);
      if (!current) return;

      const optimistic: Stop = {
        ...current,
        status,
        notes: notes !== undefined ? notes : current.notes,
        proof_photo_url: photoUri ?? current.proof_photo_url,
        failed_reason: failedReason ?? current.failed_reason,
      };

      await stopsDao.upsertOne(optimistic);
      await outboxDao.enqueue(stopId, { status, failedReason, photoUri, notes });

      // Reflect optimistic update in UI immediately
      setStops((prev) => prev.map((s) => (s.id === stopId ? optimistic : s)));

      if (isConnected) {
        try {
          const synced = await syncService.drainOutbox();
          setStops(synced);
        } catch {
          // outbox will drain on next reconnect
        }
      }

      setPendingStopIds(await derivePendingIds());
    },
    [isConnected],
  );

  const refresh = useCallback(async () => {
    try {
      if (isConnected) {
        await syncService.drainOutbox();
        await syncService.refreshStops();
      }
    } catch {
      // best effort
    } finally {
      // Always sync in-memory state from SQLite so callers like reset
      // (which clear the table directly) see an empty list immediately.
      setStops(await stopsDao.getAll());
      setPendingStopIds(await derivePendingIds());
    }
  }, [isConnected]);

  return (
    <StopsContext.Provider value={{ stops, pendingStopIds, loading, error, enqueueUpdate, refresh }}>
      {children}
    </StopsContext.Provider>
  );
}

export function useStopsContext(): StopsContextValue {
  return useContext(StopsContext);
}
