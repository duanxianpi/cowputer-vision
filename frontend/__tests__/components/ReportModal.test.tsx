jest.mock("@/api/client", () => {
  const { z } = require("zod");
  return {
    api: {},
    schemas: {
      ReportDetail: z.object({}),
    },
  };
});

jest.mock("@/hooks/report", () => ({
  useRetrieveReport: jest.fn(),
}));

import { render, screen, fireEvent } from "@testing-library/react";
import ReportModal from "@/components/modal/ReportModal";
import { useRetrieveReport } from "@/hooks/report";

describe("ReportModal", () => {
  beforeEach(() => {
    (useRetrieveReport as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
    });
  });

  it("does not render content when closed", () => {
    const { container } = render(
      <ReportModal isOpen={false} onClose={jest.fn()} reportId={null} />
    );
    expect(container.querySelector("table")).not.toBeInTheDocument();
  });

  it("shows loading skeletons", () => {
    (useRetrieveReport as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
    });
    render(<ReportModal isOpen={true} onClose={jest.fn()} reportId="r-1" />);
    expect(screen.getByText("Report Details")).toBeInTheDocument();
  });

  it("shows 'Report not found' when no data", () => {
    render(<ReportModal isOpen={true} onClose={jest.fn()} reportId="r-1" />);
    expect(screen.getByText("Report not found.")).toBeInTheDocument();
  });

  it("renders full report with data", () => {
    const report = {
      report_type: "daily",
      generated_at: "2026-04-06T08:00:00Z",
      data: {
        date: "2026-04-06",
        total_cows: 10,
        total_records: 500,
        behavior_summary: {
          walking: {
            record_count: 100,
            estimated_duration_seconds: 3600,
            percentage: 20,
          },
          lying: {
            record_count: 200,
            estimated_duration_seconds: 7200,
            percentage: 40,
          },
          feeding_head_down: {
            record_count: 150,
            estimated_duration_seconds: 120,
            percentage: 30,
          },
        },
        per_cow: {
          "cow-1": {
            total_records: 50,
            behaviors: { walking: 20, lying: 30 },
          },
          "cow-2": {
            total_records: 100,
            behaviors: { walking: 40, lying: 60 },
          },
        },
      },
    };
    (useRetrieveReport as jest.Mock).mockReturnValue({
      data: report,
      isLoading: false,
    });
    render(<ReportModal isOpen={true} onClose={jest.fn()} reportId="r-1" />);

    // Header stats
    expect(screen.getByText("2026-04-06")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("500")).toBeInTheDocument();

    // Behavior summary table
    expect(screen.getByText("Behavior Summary")).toBeInTheDocument();
    expect(screen.getAllByText("walking").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("20%")).toBeInTheDocument();

    // Per-cow breakdown
    expect(screen.getByText("Per-Cow Breakdown")).toBeInTheDocument();
    expect(screen.getByText("cow-1")).toBeInTheDocument();
    expect(screen.getByText("cow-2")).toBeInTheDocument();

    // Meta
    expect(screen.getByText(/Type: daily/)).toBeInTheDocument();
  });

  it("formats durations correctly", () => {
    const report = {
      report_type: "daily",
      generated_at: "2026-04-06T08:00:00Z",
      data: {
        date: "2026-04-06",
        total_cows: 1,
        total_records: 10,
        behavior_summary: {
          walking: { record_count: 5, estimated_duration_seconds: 30, percentage: 50 },
          lying: { record_count: 5, estimated_duration_seconds: 3700, percentage: 50 },
        },
        per_cow: {},
      },
    };
    (useRetrieveReport as jest.Mock).mockReturnValue({
      data: report,
      isLoading: false,
    });
    render(<ReportModal isOpen={true} onClose={jest.fn()} reportId="r-1" />);
    expect(screen.getByText("30s")).toBeInTheDocument();
    expect(screen.getByText("1h 2m")).toBeInTheDocument();
  });

  it("calls onClose when Close button is clicked", () => {
    const onClose = jest.fn();
    render(<ReportModal isOpen={true} onClose={onClose} reportId="r-1" />);
    fireEvent.click(screen.getByText("Close"));
    expect(onClose).toHaveBeenCalled();
  });
});
