/**
 * Live state and highlights hooks.
 *
 * TEST MOUNTING POINT: mock fetchLiveState and fetchHighlights to assert
 * refetch cadence, error handling, and staleTime behaviour.
 */
import { useQuery } from "@tanstack/react-query";
import { fetchLiveState, fetchHighlights } from "@/services/liveApi";

/**
 * Polls the live state (real FIFA match data + simulated crowd/transit)
 * every `intervalMs` milliseconds when the tab is active.
 */
export function useLiveState(intervalMs = 4000) {
  return useQuery({
    queryKey: ["live-state"],
    queryFn: fetchLiveState,
    refetchInterval: intervalMs,
    refetchIntervalInBackground: false,
    staleTime: 0,
    retry: 2,
  });
}

/**
 * Fetches official FIFA 2026 highlights from YouTube Data API v3.
 * Cached client-side for 10 minutes. Stale for 5 minutes before a background
 * refetch is triggered.
 */
export function useHighlights() {
  return useQuery({
    queryKey: ["highlights"],
    queryFn: fetchHighlights,
    staleTime: 5 * 60_000, // 5 minutes
    gcTime: 10 * 60_000,   // 10 minutes
    retry: 1,
  });
}
