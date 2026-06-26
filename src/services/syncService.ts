import * as outboxDao from '@/db/outboxDao';
import * as stopsDao from '@/db/stopsDao';
import { fetchStops, updateStopStatus } from '@/services/stopsService';
import type { Stop } from '@/types';

export async function refreshStops(): Promise<Stop[]> {
  const stops = await fetchStops();
  await stopsDao.upsertAll(stops);
  return stops;
}

export async function drainOutbox(): Promise<Stop[]> {
  const pending = await outboxDao.getPending();
  for (const row of pending) {
    try {
      const updated = await updateStopStatus(
        row.stop_id,
        row.payload.status,
        row.payload.failedReason,
        row.payload.photoUri,
        row.payload.notes ?? undefined,
      );
      await stopsDao.upsertOne(updated);
      await outboxDao.remove(row.id);
    } catch {
      await outboxDao.markFailed(row.id);
    }
  }
  return stopsDao.getAll();
}
