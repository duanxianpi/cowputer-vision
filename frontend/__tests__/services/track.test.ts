jest.mock("@/api/client", () => ({
  api: {
    api_tracks_create: jest.fn(),
  },
  schemas: {
    TrackingData: {},
  },
}));

import { trackService } from "@/services/track";
import { api } from "@/api/client";

const mockApi = api as jest.Mocked<typeof api>;

describe("trackService", () => {
  it("builds a combined JsonLogic query from filter", () => {
    trackService.fetchTracks({
      behavior: ["walking"],
      sinceTimestamp: 100,
      cowId: "cow-1",
    });

    expect(mockApi.api_tracks_create).toHaveBeenCalledWith({
      and: [
        { in: [{ var: "behavior" }, ["walking"]] },
        { ">=": [{ var: "timestamp" }, 100] },
        { "==": [{ var: "cow_id" }, "cow-1"] },
      ],
    });
  });

  it("fetches explicit window", async () => {
    await trackService.fetchTracksWindow(10, 20);
    expect(mockApi.api_tracks_create).toHaveBeenCalledWith({
      and: [
        { ">=": [{ var: "timestamp" }, 10] },
        { "<=": [{ var: "timestamp" }, 20] },
      ],
    });
  });
});
