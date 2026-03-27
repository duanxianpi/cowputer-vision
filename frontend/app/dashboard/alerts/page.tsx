"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { Plus, CheckCircle2, XCircle } from "lucide-react";
import { useAlertsList } from "@/hooks/alert";
import CPButton from "@/components/CPButton";
import CPPageHeader from "@/components/CPPageHeader";
import AlertModal from "@/components/modal/AlertModal";

function AlertsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get modal state from URL
  const isNew = searchParams.get("new") === "true";
  const editIdParam = searchParams.get("edit");
  const editId = editIdParam ? parseInt(editIdParam, 10) : null;

  const { data: alerts, isLoading, isError, error } = useAlertsList();

  const editingAlert = editId && alerts ? alerts.find(a => a.id === editId) : null;

  // --- Navigation helpers ---
  const openNewModal = () => {
    router.push("alerts?new=true", { scroll: false });
  };

  const openEditModal = (id: number) => {
    router.push(`alerts?edit=${id}`, { scroll: false });
  };

  const closeModal = () => {
    router.push("alerts", { scroll: false });
  };

  return (
    <div className="p-6">
      {/* Header Actions */}
      {alerts?.length !== 0 ? (
      <div>
        <CPPageHeader
          title="Alerts"
          actions={
            <CPButton onClick={openNewModal} size="sm" className="flex items-center gap-1">
              <Plus className="w-4 h-4 text-base" />
              New Alert
            </CPButton>
          }
        />
      </div>
      ) : (
        <></>
      )}
      <div className="mx-auto bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        {/* Table */}
        {!isLoading && !isError && alerts?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6">
            <Image src="/images/empty_state.svg" alt="No alerts" width={200} height={200} />
            <h2 className="mt-6 text-lg font-semibold text-gray-900">No Alerts Yet</h2>
            <p className="mt-2 text-sm text-gray-500 text-center max-w-sm">
              Everything is quiet. Create a alert to get notified when your camera detects specific activities.
            </p>
            <CPButton onClick={openNewModal} className="mt-6 flex items-center gap-1">
              <Plus className="w-4 h-4" />
              New Alert
            </CPButton>
          </div>
        ) : (
        <>
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-700">
              <thead>
                <tr className="border-b border-gray-100 bg-white">
                  <th className="py-4 pl-6 px-4 font-medium text-gray-900">Name</th>
                  <th className="py-4 px-4 font-medium text-gray-900">Description</th>
                  <th className="py-4 px-4 font-medium text-gray-900">Last Modified Time</th>
                  <th className="py-4 pr-6 pl-4 font-medium text-gray-900">Status</th>
                </tr>
              </thead>
              
              <tbody>
                {isLoading && Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-4 pl-6 px-4"><Skeleton width={120} /></td>
                    <td className="py-4 px-4"><Skeleton width={180} /></td>
                    <td className="py-4 px-4"><Skeleton width={140} /></td>
                    <td className="py-4 pr-6 pl-4"><Skeleton width={80} borderRadius={999} /></td>
                  </tr>
                ))}
                {isError && (
                  <tr><td colSpan={5} className="p-6 text-center text-red-500">Error loading alerts.</td></tr>
                )}
                
                {alerts?.map((alert) => {
                  const isActive = alert.is_active !== false;
                  
                  return (
                    <tr 
                      key={alert.id} 
                      onClick={() => openEditModal(alert.id)}
                      className="border-b border-gray-50 last:border-none transition-colors cursor-pointer hover:bg-gray-50/50"
                    >
                      <td className="py-4 pl-6 px-4">{alert.name}</td>
                      <td className="py-4 px-4 text-gray-400">
                        {alert.description || "Some Description..."}
                      </td>
                      <td className="py-4 px-4">
                        {alert.last_modified_at || "4:02PM, 1/19/2026"}
                      </td>
                      <td className="py-4 pr-6 pl-4">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium bg-[#E6F3E6] text-[#2E7D32]">
                            <CheckCircle2 className="w-4 h-4 fill-[#4CAF50] text-white" />
                            Enabled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium bg-[#FDEAEB] text-[#C62828]">
                            <XCircle className="w-4 h-4 fill-[#D32F2F] text-white" />
                            Disabled
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
        )}
      </div>

      {/* Modal controlled by URL params */}
      <AlertModal 
        isOpen={isNew || editId !== null} 
        onClose={closeModal} 
        alert={editingAlert} 
      />
    </div>
  );
}

// Page component with Suspense for useSearchParams
export default function AlertsPage() {
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
      <AlertsContent />
    </Suspense>
  );
}