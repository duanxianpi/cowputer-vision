import { z } from "zod";
import { api, schemas } from "@/api/client";

export type ReportDetail = z.infer<typeof schemas.ReportDetail>;

export const reportService = {
  fetchReports: () => api.api_reports_retrieve(),

  retrieveReport: (reportId: string) =>
    api.api_reports_retrieve({ queries: { report_id: reportId } }),
};
