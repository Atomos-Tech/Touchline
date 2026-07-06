// Business logic hook: subscribes to the simulated live sports feed via polling.
// TEST MOUNTING POINT: mock fetchLiveState and assert refetch cadence.
import { useQuery } from "@tanstack/react-query";
import { fetchLiveState, fetchHighlights } from "@/services/liveApi";

export function useLiveState(intervalMs = 4000) {
  return useQuery({
    queryKey: ["live-state"],
    queryFn: fetchLiveState,
    refetchInterval: intervalMs,
    refetchIntervalInBackground: false,
    staleTime: 0,
  });
}

export function useHighlights() {
  return useQuery({
    queryKey: ["highlights"],
    queryFn: fetchHighlights,
    staleTime: 5 * 60_000,
  });
}
