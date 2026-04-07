jest.mock("@/api/client", () => {
  const { z } = require("zod");
  return {
    api: {},
    schemas: { ReportDetail: z.object({}) },
  };
});

jest.mock("@/hooks/report", () => ({
  useReportsList: jest.fn(),
  useRetrieveReport: jest.fn(() => ({ data: undefined, isLoading: false })),
}));

import { render, screen, fireEvent } from "@testing-library/react";
import ReportsPage from "@/app/dashboard/reports/page";
import { useReportsList } from "@/hooks/report";

describe("ReportsPage", () => {
  it("renders loading state", () => {
    (useReportsList as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });
    render(<ReportsPage />);
    // Loading skeleton shown
    expect(screen.queryByText("No Reports Yet")).not.toBeInTheDocument();
  });

  it("renders empty state", () => {
    (useReportsList as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });
    render(<ReportsPage />);
    expect(screen.getByText("No Reports Yet")).toBeInTheDocument();
  });

  it("renders error state", () => {
    (useReportsList as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });
    render(<ReportsPage />);
    expect(screen.getByText("Error loading reports.")).toBeInTheDocument();
  });

  it("renders reports table", () => {
    const reports = [
      {
        report_id: "r-1",
        report_type: "daily",
        generated_at: "2026-04-06T08:00:00Z",
      },
      {
        report_id: "r-2",
        report_type: "weekly",
        generated_at: "2026-04-05T08:00:00Z",
      },
    ];
    (useReportsList as jest.Mock).mockReturnValue({
      data: reports,
      isLoading: false,
      isError: false,
    });
    render(<ReportsPage />);
    expect(screen.getByText("Reports")).toBeInTheDocument();
    expect(screen.getByText("daily")).toBeInTheDocument();
    expect(screen.getByText("weekly")).toBeInTheDocument();
  });

  it("opens report modal when clicking a row", () => {
    const reports = [
      {
        report_id: "r-1",
        report_type: "daily",
        generated_at: "2026-04-06T08:00:00Z",
      },
    ];
    (useReportsList as jest.Mock).mockReturnValue({
      data: reports,
      isLoading: false,
      isError: false,
    });
    render(<ReportsPage />);
    fireEvent.click(screen.getByText("daily"));
    // router.push("reports?view=r-1") is called
  });
});
