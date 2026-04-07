jest.mock("@/api/client", () => {
  const { z } = require("zod");
  return {
    api: {},
    schemas: { TrackingData: z.object({}) },
  };
});

jest.mock("@/hooks/track", () => ({
  useTracks: jest.fn(),
}));

jest.mock("@/components/CPVideoWithBBox", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: (props: any) =>
      React.createElement("div", { "data-testid": "video-bbox" }),
  };
});

import { render, screen, fireEvent } from "@testing-library/react";
import LiveCameraPage from "@/app/dashboard/live-camera/page";
import { useTracks } from "@/hooks/track";

const mockTracks = [
  { cow_id: "cow-1", timestamp: 1000, behavior: "walking" },
  { cow_id: "cow-1", timestamp: 1000, behavior: "feeding_head_down" },
  { cow_id: "cow-2", timestamp: 2000, behavior: "lying" },
  { cow_id: "cow-2", timestamp: 2000, behavior: "standing" },
  { cow_id: "cow-3", timestamp: 3000, behavior: "walking" },
];

describe("LiveCameraPage", () => {
  it("renders page with loading state", () => {
    (useTracks as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
    });
    render(<LiveCameraPage />);
    expect(screen.getByText("Live Camera")).toBeInTheDocument();
    expect(screen.getByText("LIVE")).toBeInTheDocument();
    expect(screen.getByText("Display Config")).toBeInTheDocument();
  });

  it("renders with track data and charts", () => {
    (useTracks as jest.Mock).mockReturnValue({
      data: mockTracks,
      isLoading: false,
    });
    render(<LiveCameraPage />);
    expect(screen.getByText("Live Camera")).toBeInTheDocument();
    expect(screen.getByTestId("video-bbox")).toBeInTheDocument();
    expect(screen.getByText("Behaviour Trend (5-min)")).toBeInTheDocument();
    expect(screen.getByText("Per-Cow State Timeline")).toBeInTheDocument();
  });

  it("toggles behavior filters", () => {
    (useTracks as jest.Mock).mockReturnValue({
      data: mockTracks,
      isLoading: false,
    });
    render(<LiveCameraPage />);
    const walkingButton = screen.getByText("Walking");
    // Initially active
    expect(walkingButton.className).not.toContain("line-through");
    // Click to deactivate
    fireEvent.click(walkingButton);
    expect(walkingButton.className).toContain("line-through");
    // Click again to reactivate
    fireEvent.click(walkingButton);
    expect(walkingButton.className).not.toContain("line-through");
  });

  it("toggles advanced config", () => {
    (useTracks as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
    });
    render(<LiveCameraPage />);
    expect(screen.queryByText(/Fine-tune Offset/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Advanced Config"));
    expect(screen.getByText(/Fine-tune Offset/)).toBeInTheDocument();
  });

  it("adjusts offset via slider", () => {
    (useTracks as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
    });
    render(<LiveCameraPage />);
    fireEvent.click(screen.getByText("Advanced Config"));
    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "500" } });
    expect(screen.getByText("Fine-tune Offset: 500ms")).toBeInTheDocument();
  });

  it("selects cow from dropdown", () => {
    (useTracks as jest.Mock).mockReturnValue({
      data: mockTracks,
      isLoading: false,
    });
    render(<LiveCameraPage />);
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "cow-2" } });
    expect((select as HTMLSelectElement).value).toBe("cow-2");
  });

  it("renders with empty data", () => {
    (useTracks as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
    });
    render(<LiveCameraPage />);
    expect(screen.getByText("Live Camera")).toBeInTheDocument();
  });
});
