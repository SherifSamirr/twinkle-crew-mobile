import { useStopsContext } from '@/context/StopsContext';

export function useStopDetail(id: string | undefined) {
  const { stops, pendingStopIds, loading, error, enqueueUpdate } = useStopsContext();
  const stop = id ? (stops.find((s) => s.id === id) ?? null) : null;
  const hasPendingSync = id ? pendingStopIds.has(id) : false;
  return { stop, hasPendingSync, loading, error, enqueueUpdate };
}
