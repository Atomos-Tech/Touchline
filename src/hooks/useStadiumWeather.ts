/**
 * useStadiumWeather — React Query hook for real weather at a FIFA 2026 stadium.
 *
 * Polls Open-Meteo every 10 minutes (weather updates every 15 min on their end).
 * TEST MOUNTING POINT: mock fetchStadiumWeather and assert staleTime + refetchInterval.
 */
import { useQuery } from "@tanstack/react-query";
import { fetchStadiumWeather, type StadiumWeather } from "@/services/weatherApi";

export function useStadiumWeather(stadiumId: string | undefined) {
  return useQuery<StadiumWeather | null>({
    queryKey: ["weather", stadiumId],
    queryFn: () =>
      stadiumId ? fetchStadiumWeather(stadiumId) : Promise.resolve(null),
    enabled: Boolean(stadiumId),
    staleTime: 9 * 60_000,       // consider fresh for 9 min
    gcTime: 15 * 60_000,         // keep in cache 15 min
    refetchInterval: 10 * 60_000, // refetch every 10 min
    refetchIntervalInBackground: false,
    retry: 1,
  });
}
