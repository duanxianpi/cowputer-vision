jest.mock("@/api/client", () => ({
  api: {
    api_playback_list: jest.fn(),
    api_media_token_retrieve: jest.fn(),
  },
  schemas: {
    VideoSegment: {},
  },
}));

import { playbackService } from "@/services/playback";
import { api } from "@/api/client";

const mockApi = api as any;

describe("playbackService", () => {
  it("fetches and sorts segments", async () => {
    mockApi.api_playback_list.mockResolvedValueOnce([
      { id: 1, filename: "b.ts", start_ts: 20, end_ts: 30, url: "u2" },
      { id: 2, filename: "a.ts", start_ts: 10, end_ts: 15, url: "u1" },
    ]);

    const segments = await playbackService.fetchSegments("2026-04-06");
    expect(segments.map((s) => s.start_ts)).toEqual([10, 20]);

    expect(mockApi.api_playback_list).toHaveBeenCalledTimes(1);
    const arg = mockApi.api_playback_list.mock.calls[0][0];
    expect(arg.queries.start).toBeLessThan(arg.queries.end);
  });

  it("retrieves stream URL", async () => {
    const mediaTokenRetrieveMock = mockApi.api_media_token_retrieve as jest.Mock;
    mediaTokenRetrieveMock.mockResolvedValueOnce({
      token: "abc",
      url: "https://signed",
      expires_in: 60,
    });

    const url = await playbackService.fetchStreamUrl({
      id: 2,
      filename: "a.ts",
      start_ts: 1,
      end_ts: 2,
      url: "",
    });

    expect(url).toBe("https://signed");
    expect(mockApi.api_media_token_retrieve).toHaveBeenCalledWith({
      queries: { filename: "a.ts" },
    });
  });
});
