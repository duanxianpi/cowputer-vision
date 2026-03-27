"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { useReportsList } from "@/hooks/report";
import CPPageHeader from "@/components/CPPageHeader";
import ReportModal from "@/components/modal/ReportModal";

function ReportsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const viewId = searchParams.get("view");

  const { data: reports, isLoading, isError } = useReportsList();

  const openViewModal = (reportId: string) => {
    router.push(`reports?view=${reportId}`, { scroll: false });
  };

  const closeModal = () => {
    router.push("reports", { scroll: false });
  };

  return (
    <div className="p-6">
      { (reports?.length !== 0) ? (
        <div className="p-6">
          <CPPageHeader title="Reports" />
        </div>
      ) : (
        <></>
      )}
      <div className="mx-auto bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        {/* Empty state or table */}
        {!isLoading && !isError && (!reports || (Array.isArray(reports) && reports.length === 0)) ? (
          <div className="flex flex-col items-center justify-center py-20 px-6">
            <Image src="/images/empty_state.svg" alt="No reports" width={200} height={200} />
            <h2 className="mt-6 text-lg font-semibold text-gray-900">No Reports Yet</h2>
            <p className="mt-2 text-sm text-gray-500 text-center max-w-sm">
              Everything is quiet. Start by setting up your reports.
            </p>
          </div>
        ) : (
          <>
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-700">
                <thead>
                  <tr className="border-b border-gray-100 bg-white">
                    <th className="py-4 pl-6 px-4 font-medium text-gray-900">Report Type</th>
                    <th className="py-4 pr-6 pl-4 font-medium text-gray-900">Generated At</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-4 pl-6 px-4"><Skeleton width={120} /></td>
                      <td className="py-4 pr-6 pl-4"><Skeleton width={160} /></td>
                    </tr>
                  ))}
                  {isError && (
                    <tr>
                      <td colSpan={2} className="p-6 text-center text-red-500">
                        Error loading reports.
                      </td>
                    </tr>
                  )}
                  {Array.isArray(reports) &&
                    reports.map((report) => (
                      <tr
                        key={report.report_id}
                        onClick={() => openViewModal(report.report_id)}
                        className="border-b border-gray-50 last:border-none transition-colors cursor-pointer hover:bg-gray-50/50"
                      >
                        <td className="py-4 pl-6 px-4">{report.report_type}</td>
                        <td className="py-4 pr-6 pl-4">
                          {new Date(report.generated_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <ReportModal isOpen={viewId !== null} onClose={closeModal} reportId={viewId} />
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={
      <div className="p-6">
        <Skeleton width={100} height={28} className="mb-6" />
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={20} className="mb-4" />
          ))}
        </div>
      </div>
    }>
      <ReportsContent />
    </Suspense>
  );
}