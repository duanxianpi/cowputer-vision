import { useQuery } from "@tanstack/react-query";
import { reportService } from "@/services/report";

export const useReportsList = () => {
  return useQuery({
    queryKey: ["reports"],
    queryFn: () => reportService.fetchReports(),
  });
};

export const useRetrieveReport = (reportId: string | null) => {
  return useQuery({
    queryKey: ["report", reportId],
    queryFn: () => reportService.retrieveReport(reportId!),
    enabled: !!reportId,
  });
};
