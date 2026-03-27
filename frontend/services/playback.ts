import { api, schemas } from "@/api/client";
import { z } from "zod";

export type VideoSegment = z.infer<typeof schemas.VideoSegment>;

export const playbackService = {
  fetchSegments: async (date: string): Promise<VideoSegment[]> => {
    const [year, month, day] = date.split("-").map(Number);
    const start = new Date(year, month - 1, day, 0, 0, 0, 0).getTime();
    const end = new Date(year, month - 1, day, 23, 59, 59, 999).getTime();

    const data = await api.api_playback_list({ queries: { start, end } });
    return [...data].sort(
      (a, b) => a.start_ts - b.start_ts
    ) as VideoSegment[];
  },

  /** Get a signed streaming URL for the segment (no blob download). */
  fetchStreamUrl: async (segment: VideoSegment): Promise<string> => {
    const { url } = await api.api_media_token_retrieve({
      queries: { filename: segment.filename },
    });
    return url;
  },
};
