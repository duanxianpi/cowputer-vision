jest.mock("@/api/client", () => {
  const { z } = require("zod");
  return {
    api: {},
    schemas: {
      TrackingData: z.object({}),
      AlertRule: z.object({ id: z.number() }),
      AlertEvent: z.object({ id: z.number() }),
      AlertRuleWriteRequest: z.object({
        name: z.string(),
        description: z.string().optional(),
        conditions: z.any(),
        actions: z.string(),
        is_active: z.boolean(),
      }),
    },
  };
});

jest.mock("@/hooks/track", () => ({
  useTracks: jest.fn(),
}));

jest.mock("@/hooks/alert", () => ({
  useAlertsList: jest.fn(),
}));

import { render, screen } from "@testing-library/react";
import OverviewPage from "@/app/dashboard/overview/page";
import { useTracks } from "@/hooks/track";
import { useAlertsList } from "@/hooks/alert";

const mockTracks = [
  { cow_id: "cow-1", timestamp: 1000, behavior: "walking" },
  { cow_id: "cow-1", timestamp: 1000, behavior: "feeding_head_down" },
  { cow_id: "cow-2", timestamp: 2000, behavior: "lying" },
  { cow_id: "cow-2", timestamp: 2000, behavior: "standing" },
  { cow_id: "cow-3", timestamp: 3000, behavior: "walking" },
  { cow_id: "cow-3", timestamp: 3000, behavior: "feeding_head_up" },
];

describe("OverviewPage", () => {
  beforeEach(() => {
    (useAlertsList as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
    });
  });

  it("renders loading state", () => {
    (useTracks as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
    });
    render(<OverviewPage />);
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Detected Cows")).toBeInTheDocument();
  });

  it("renders with track data", () => {
    (useTracks as jest.Mock).mockReturnValue({
      data: mockTracks,
      isLoading: false,
    });
    render(<OverviewPage />);
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Detected Cows")).toBeInTheDocument();
    expect(screen.getByText("Walking/Standing")).toBeInTheDocument();
    expect(screen.getByText("Feeding")).toBeInTheDocument();
    expect(screen.getByText("Resting")).toBeInTheDocument();
    expect(screen.getByText("Current Behaviour")).toBeInTheDocument();
    expect(screen.getByText("Behaviour Trend (5-min)")).toBeInTheDocument();
  });

  it("renders with empty data showing zeros", () => {
    (useTracks as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
    });
    render(<OverviewPage />);
    const zeros = screen.getAllByText("0");
    expect(zeros.length).toBeGreaterThanOrEqual(4);
  });

  it("renders alert summary with events", () => {
    (useTracks as jest.Mock).mockReturnValue({
      data: mockTracks,
      isLoading: false,
    });
    (useAlertsList as jest.Mock).mockReturnValue({
      data: [
        {
          id: 1,
          name: "Alert One",
          is_active: true,
          events: [
            {
              id: 101,
              triggered_at: new Date().toISOString(),
              details: { behavior: "walking", cow_id: "cow-1" },
            },
          ],
        },
        {
          id: 2,
          name: "Alert Two",
          is_active: false,
          events: [],
        },
      ],
      isLoading: false,
    });
    render(<OverviewPage />);
    expect(screen.getByText("Alerts")).toBeInTheDocument();
    expect(screen.getAllByText("1").length).toBeGreaterThanOrEqual(1); // active count
    expect(screen.getByText("View all")).toBeInTheDocument();
  });

  it("renders alert loading state", () => {
    (useTracks as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
    });
    (useAlertsList as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
    });
    render(<OverviewPage />);
    expect(screen.getByText("Alerts")).toBeInTheDocument();
  });

  it("shows no events message when alerts have no events", () => {
    (useTracks as jest.Mock).mockReturnValue({
      data: mockTracks,
      isLoading: false,
    });
    (useAlertsList as jest.Mock).mockReturnValue({
      data: [{ id: 1, name: "A", is_active: true, events: [] }],
      isLoading: false,
    });
    render(<OverviewPage />);
    expect(screen.getByText("No events triggered yet")).toBeInTheDocument();
  });
});
