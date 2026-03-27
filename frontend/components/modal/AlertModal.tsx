"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type RuleGroupType } from "react-querybuilder";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useCreateAlert, useUpdateAlert, useDeleteAlert, useRetrieveAlert } from "@/hooks/alert";
import { AlertRule, AlertEvent } from "@/services/alert";
import CPModal from "@/components/CPModal";
import CPButton from "@/components/CPButton";
import CPInput from "@/components/CPInput";
import { alertRuleWriteRequestSchema, AlertRuleWriteRequestFormValues } from "@/services/alert";
import ConditionQueryBuilder, {
  defaultQuery,
  queryToJsonLogic,
  jsonLogicToQuery,
} from "@/components/ConditionQueryBuilder";
import { getBehaviorBadge } from "@/constants/behaviorColors";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function EventEntry({ event }: { event: AlertEvent }) {
  const [open, setOpen] = useState(false);
  const details = (event.details ?? {}) as Record<string, unknown>;
  const behavior = String(details.behavior ?? "unknown");
  const colorClass = getBehaviorBadge(behavior);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm hover:bg-gray-50 transition-colors"
      >
        {open ? (
          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
        )}
        <span className="text-gray-500 tabular-nums">
          {formatDateTime(event.triggered_at)}
        </span>
        <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
          {behavior}
        </span>
      </button>
      {open && (
        <div className="px-4 pb-3 pt-0 border-t border-gray-100 text-sm space-y-1">
          {details.cow_id != null && (
            <p className="text-gray-600">
              <span className="font-medium text-gray-700">Cow ID:</span> {String(details.cow_id)}
            </p>
          )}
          {details.duration_seconds != null && (
            <p className="text-gray-600">
              <span className="font-medium text-gray-700">Duration:</span> {String(details.duration_seconds)}s
            </p>
          )}
        </div>
      )}
    </div>
  );
}

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  alert?: AlertRule | null;
}

export default function AlertModal({ isOpen, onClose, alert }: AlertModalProps) {
  const createMutation = useCreateAlert();
  const updateMutation = useUpdateAlert();
  const deleteMutation = useDeleteAlert();
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [conditionQuery, setConditionQuery] = useState<RuleGroupType>(defaultQuery);
  const [conditionError, setConditionError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"form" | "history">("form");
  const [emailEnabled, setEmailEnabled] = useState(false);

  // Fetch alert detail with events when editing
  const { data: alertDetail, isLoading: isLoadingDetail } = useRetrieveAlert(
    alert?.id ?? 0,
    { enabled: !!alert && isOpen },
  );

  const events: AlertEvent[] = (alertDetail as AlertRule | undefined)?.events ?? [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AlertRuleWriteRequestFormValues>({
    resolver: zodResolver(alertRuleWriteRequestSchema),
    defaultValues: {
      name: "",
      description: "",
      is_active: true,
      actions: "",
    },
  });

  useEffect(() => {
    if (isOpen && alert) {
      const actions = alert.actions as Record<string, string> | undefined;
      const email = actions?.email ?? "";
      reset({
        name: alert.name ?? "",
        description: alert.description ?? "",
        is_active: alert.is_active ?? true,
        actions: email,
      });
      setEmailEnabled(!!email);
      setConditionQuery(jsonLogicToQuery(alert.conditions));
      setJsonError(null);
      setConditionError(null);
      setActiveTab("form");
    }

    if (isOpen && !alert) {
      reset({
        name: "",
        is_active: true,
        actions: "",
      });
      setEmailEnabled(false);
      setConditionQuery(defaultQuery);
      setJsonError(null);
      setConditionError(null);
      setActiveTab("form");
    }
  }, [alert, isOpen, reset]);

  const onSubmit = async (formData: AlertRuleWriteRequestFormValues) => {
    setJsonError(null);
    setConditionError(null);

    const parsedConditions = queryToJsonLogic(conditionQuery);
    if (!parsedConditions) {
      setConditionError("Please add at least one condition rule.");
      return;
    }

    const parsedActions = emailEnabled ? { email: formData.actions } : {};

    if (emailEnabled && !formData.actions?.trim()) {
      setJsonError("Email address is required when email notification is enabled.");
      return;
    }

    const payload = {
      name: formData.name,
      description: formData.description ?? "",
      is_active: formData.is_active,
      conditions: parsedConditions,
      actions: parsedActions,
    };

    try {
      if (alert) {
        await updateMutation.mutateAsync({ id: alert.id, data: payload as any });
      } else {
        await createMutation.mutateAsync(payload as any);
      }
      onClose();
    } catch {
      setJsonError("Failed to save alert.");
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
  const modalTitle = alert ? "Edit Alert" : "Create New Alert";

  return (
    <CPModal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      maxWidth="max-w-2xl"
    >
      {/* Tabs — only in edit mode */}
      {alert && (
        <div className="flex border-b border-gray-200 px-6">
          {(["form", "history"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "form" ? "Form" : "Alert History"}
            </button>
          ))}
        </div>
      )}

      {/* Form tab */}
      {activeTab === "form" && (
        <form id="alert-form" onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          <div className="grid grid-cols-1 gap-5">
            <CPInput
              {...register("name")}
              label="Alert Name"
              placeholder="e.g., Low feeding activity"
              error={errors.name?.message}
              required
            />

            <CPInput
              {...register("description")}
              label="Description"
              placeholder="Briefly describe what this alert monitors..."
              error={errors.description?.message}
            />

            <div className="flex items-center">
              <input
                id="is_active"
                type="checkbox"
                {...register("is_active")}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900 cursor-pointer">
                Enabled
              </label>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 required-field">
                Conditions
              </label>
              <ConditionQueryBuilder
                query={conditionQuery}
                onChange={setConditionQuery}
              />
              {conditionError && <p className="text-xs text-red-600">{conditionError}</p>}
            </div>

            {/* Email notification toggle */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Email Notification
                </label>
                <button
                  type="button"
                  role="switch"
                  aria-checked={emailEnabled}
                  onClick={() => setEmailEnabled((v) => !v)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    emailEnabled ? "bg-primary" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform ${
                      emailEnabled ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {emailEnabled && (
                <CPInput
                  {...register("actions")}
                  label="Email Address"
                  placeholder="alerts@example.com"
                  error={errors.actions?.message}
                  required
                />
              )}
            </div>
          </div>

          {jsonError && <p className="text-sm text-red-600">{jsonError}</p>}
        </form>
      )}

      {/* History tab */}
      {activeTab === "history" && (
        <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
          {isLoadingDetail ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} height={48} borderRadius={8} />
            ))
          ) : events.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              No alert events have been triggered yet.
            </p>
          ) : (
            events.map((event) => <EventEntry key={event.id} event={event} />)
          )}
        </div>
      )}

      <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center shrink-0">
        {alert && (
          <CPButton
            type="button"
            variant="danger"
            disabled={isPending}
            onClick={async () => {
              if (!confirm("Are you sure you want to delete this alert?")) return;
              await deleteMutation.mutateAsync(alert.id);
              onClose();
            }}
            label={deleteMutation.isPending ? "Deleting..." : "Delete"}
          />
        )}
        <div className="ml-auto flex gap-3">
          <CPButton
            type="button"
            variant="secondary"
            onClick={onClose}
            label="Cancel"
          />
          {activeTab === "form" && (
            <CPButton
              type="submit"
              form="alert-form"
              disabled={isPending}
              label={isPending ? "Saving..." : alert ? "Save Changes" : "Create Alert"}
            />
          )}
        </div>
      </div>
    </CPModal>
  );
}
