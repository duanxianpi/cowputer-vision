import { TrackingData, trackService } from "@/services/track";
import { useQuery, UseQueryOptions } from "@tanstack/react-query";

export type TrackFilter = {
    behavior?: string[];
    cowId?: string;
    timeWindowMinutes?: number;
  };

export function useTracks(
  filter: TrackFilter,
  options?: Omit<UseQueryOptions<TrackingData[]>, "queryKey" | "queryFn">
) {
    return useQuery({
      queryKey: ["tracks", filter.behavior, filter.cowId, filter.timeWindowMinutes],
      
      queryFn: () => {
        const sinceTimestamp = filter.timeWindowMinutes 
          ? Date.now() - filter.timeWindowMinutes * 60 * 1000 
          : undefined;
  
        return trackService.fetchTracks({
          behavior: filter.behavior,
          cowId: filter.cowId,
          sinceTimestamp,
        });
      },
      ...options,
    });
  }