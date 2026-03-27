import { useQuery } from "@tanstack/react-query";
import { playbackService, VideoSegment } from "@/services/playback";

export function usePlaybackSegments(date: string) {
  return useQuery<VideoSegment[]>({
    queryKey: ["playback-segments", date],
    queryFn: () => playbackService.fetchSegments(date),
    enabled: !!date,
  });
}
