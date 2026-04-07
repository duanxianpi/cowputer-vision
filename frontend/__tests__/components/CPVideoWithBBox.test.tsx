jest.mock("@/hooks/hls-sync", () => ({
  useHLSTrackSync: jest.fn(),
}));

import { render } from "@testing-library/react";
import CPVideoWithBBox from "@/components/CPVideoWithBBox";
import { useHLSTrackSync } from "@/hooks/hls-sync";

describe("CPVideoWithBBox", () => {
  it("renders video and canvas elements", () => {
    const { container } = render(
      <CPVideoWithBBox streamUrl="http://example.com/stream.m3u8" />
    );
    expect(container.querySelector("video")).toBeInTheDocument();
    expect(container.querySelector("canvas")).toBeInTheDocument();
  });

  it("passes props to useHLSTrackSync", () => {
    render(
      <CPVideoWithBBox
        streamUrl="http://test.com/live.m3u8"
        activeBehaviors={["walking", "lying"]}
        offsetMs={200}
      />
    );
    expect(useHLSTrackSync).toHaveBeenCalledWith(
      expect.objectContaining({
        streamUrl: "http://test.com/live.m3u8",
        activeBehaviors: ["walking", "lying"],
        offsetMs: 200,
      })
    );
  });

  it("uses default values for optional props", () => {
    render(<CPVideoWithBBox streamUrl="http://test.com/stream.m3u8" />);
    expect(useHLSTrackSync).toHaveBeenCalledWith(
      expect.objectContaining({
        streamUrl: "http://test.com/stream.m3u8",
        activeBehaviors: [],
        offsetMs: 0,
      })
    );
  });
});
