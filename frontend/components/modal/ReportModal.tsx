"use client";

import React from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { useRetrieveReport } from "@/hooks/report";
import CPButton from "@/components/CPButton";
import CPModal from "@/components/CPModal";
import CPDoughnutPlot from "@/components/visualizations/CPDoughnutPlot";
import { ReportDetail } from "@/services/report";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportId: string | null;
}

interface BehaviorStat {
  record_count: number;
  estimated_duration_seconds: number;
  percentage: number;
}

interface PerCowEntry {
  total_records: number;
  behaviors: Record<string, number>;
}

interface ReportData {
  date: string;
  total_cows: number;
  total_records: number;
  behavior_summary: Record<string, BehaviorStat>;
  per_cow: Record<string, PerCowEntry>;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function ReportModal({ isOpen, onClose, reportId }: ReportModalProps) {
  const { data: report, isLoading } = useRetrieveReport(reportId) as { data: ReportDetail; isLoading: boolean };

  const data = report?.data as ReportData | undefined;

  const doughnutData = data?.behavior_summary
    ? Object.entries(data.behavior_summary).map(([name, stat]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value: stat.record_count,
      }))
    : [];

  const behaviorEntries = data?.behavior_summary
    ? Object.entries(data.behavior_summary)
    : [];

  const perCowEntries = data?.per_cow
    ? Object.entries(data.per_cow)
    : [];

  const allBehaviors = behaviorEntries.map(([name]) => name);

  return (
    <CPModal isOpen={isOpen} onClose={onClose} title="Report Details" maxWidth="max-w-4xl">
      <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
        {isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                  <Skeleton width={80} height={12} className="mb-2" />
                  <Skeleton width={100} height={22} />
                </div>
              ))}
            </div>
            <Skeleton height={200} borderRadius={8} />
            <Skeleton height={120} borderRadius={8} />
          </div>
        ) : report && data ? (
          <>
            {/* Header stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Date</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">{data.date}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Cows</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">{data.total_cows}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Records</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">{data.total_records.toLocaleString()}</p>
              </div>
            </div>

            {/* Behavior distribution chart */}
            {doughnutData.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Behavior Distribution</h3>
                <div className="bg-gray-50 rounded-lg border border-gray-100 p-2">
                  <CPDoughnutPlot data={doughnutData} />
                </div>
              </div>
            )}

            {/* Behavior summary table */}
            {behaviorEntries.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Behavior Summary</h3>
                <div className="overflow-x-auto rounded-lg border border-gray-100">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="bg-gray-50 text-gray-600">
                        <th className="px-4 py-2.5 font-medium">Behavior</th>
                        <th className="px-4 py-2.5 font-medium text-right">Records</th>
                        <th className="px-4 py-2.5 font-medium text-right">Duration</th>
                        <th className="px-4 py-2.5 font-medium text-right">Percentage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {behaviorEntries.map(([behavior, stat]) => (
                        <tr key={behavior} className="border-t border-gray-50">
                          <td className="px-4 py-2.5 text-gray-900 capitalize">{behavior}</td>
                          <td className="px-4 py-2.5 text-gray-700 text-right">{stat.record_count.toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-gray-700 text-right">{formatDuration(stat.estimated_duration_seconds)}</td>
                          <td className="px-4 py-2.5 text-right">
                            <span className="inline-flex items-center gap-1.5">
                              <span className="text-gray-700">{stat.percentage}%</span>
                              <span className="inline-block w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <span
                                  className="block h-full bg-[#82A781] rounded-full"
                                  style={{ width: `${Math.min(stat.percentage, 100)}%` }}
                                />
                              </span>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Per-cow breakdown */}
            {perCowEntries.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Per-Cow Breakdown</h3>
                <div className="overflow-x-auto rounded-lg border border-gray-100">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="bg-gray-50 text-gray-600">
                        <th className="px-4 py-2.5 font-medium">Cow ID</th>
                        <th className="px-4 py-2.5 font-medium text-right">Records</th>
                        {allBehaviors.map((b) => (
                          <th key={b} className="px-4 py-2.5 font-medium text-right capitalize">{b}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {perCowEntries.map(([cowId, cow]) => (
                        <tr key={cowId} className="border-t border-gray-50">
                          <td className="px-4 py-2.5 text-gray-900 font-mono text-xs">{cowId}</td>
                          <td className="px-4 py-2.5 text-gray-700 text-right">{cow.total_records.toLocaleString()}</td>
                          {allBehaviors.map((b) => (
                            <td key={b} className="px-4 py-2.5 text-gray-700 text-right">
                              {cow.behaviors[b]?.toLocaleString() ?? "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Report meta */}
            <div className="flex items-center gap-4 text-xs text-gray-400 pt-2">
              <span>Type: {report.report_type}</span>
              <span>Generated: {new Date(report.generated_at).toLocaleString()}</span>
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-500">Report not found.</p>
        )}
      </div>

      <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end shrink-0">
        <CPButton
          type="button"
          variant="secondary"
          onClick={onClose}
          label="Close"
        />
      </div>
    </CPModal>
  );
}
