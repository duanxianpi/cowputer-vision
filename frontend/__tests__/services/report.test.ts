jest.mock("@/api/client", () => ({
  api: {
    api_reports_retrieve: jest.fn(),
  },
  schemas: {
    ReportDetail: {},
  },
}));

import { reportService } from "@/services/report";
import { api } from "@/api/client";

const mockApi = api as jest.Mocked<typeof api>;

describe("reportService", () => {
  it("fetches all reports", () => {
    reportService.fetchReports();
    expect(mockApi.api_reports_retrieve).toHaveBeenCalledWith();
  });

  it("retrieves one report by id", () => {
    reportService.retrieveReport("abc-123");
    expect(mockApi.api_reports_retrieve).toHaveBeenCalledWith({
      queries: { report_id: "abc-123" },
    });
  });
});
