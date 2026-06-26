import { useStopsContext } from '@/context/StopsContext';

export function useStops() {
  const { stops, pendingStopIds, loading, error } = useStopsContext();
  return { stops, pendingStopIds, loading, error };
}
