'use client';

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import CPButton from "@/components/CPButton";
import CPInput from "@/components/CPInput";
import { useSettings, useUpdateSettings } from "@/hooks/settings";
import {
  SETTINGS_FIELD_KEYS,
  type SettingFieldKey,
  type SettingsPayload,
} from "@/services/settings";

const integerString = ({
  label,
  min,
  max,
}: {
  label: string;
  min?: number;
  max?: number;
}) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .refine((value) => /^-?\d+$/.test(value), {
      message: `${label} must be a whole number.`,
    })
    .refine((value) => (min === undefined ? true : Number(value) >= min), {
      message: `${label} must be at least ${min}.`,
    })
    .refine((value) => (max === undefined ? true : Number(value) <= max), {
      message: `${label} must be at most ${max}.`,
    });

const decimalString = ({
  label,
  min,
  max,
}: {
  label: string;
  min?: number;
  max?: number;
}) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .refine((value) => !Number.isNaN(Number(value)), {
      message: `${label} must be a valid number.`,
    })
    .refine((value) => (min === undefined ? true : Number(value) >= min), {
      message: `${label} must be at least ${min}.`,
    })
    .refine((value) => (max === undefined ? true : Number(value) <= max), {
      message: `${label} must be at most ${max}.`,
    });

const detectionClassesString = z
  .string()
  .trim()
  .min(1, "Detection classes are required.")
  .refine((value) => {
    const parts = value.split(",").map((part) => part.trim());
    return parts.length > 0 && parts.every((part) => /^\d+$/.test(part));
  }, {
    message: 'Use a comma-separated list of class IDs, like "0,1,2".',
  });

const settingsFormSchema = z.object({
  retention_days: integerString({ label: "Retention days", min: 1 }),
  retention_max_disk_gb: decimalString({
    label: "Retention max disk size",
    min: 0,
  }),
  retention_check_interval: integerString({
    label: "Retention check interval",
    min: 1,
  }),
  report_hour: integerString({ label: "Report hour", min: 0, max: 23 }),
  report_minute: integerString({ label: "Report minute", min: 0, max: 59 }),
  alert_dedup_minutes: integerString({
    label: "Alert dedup minutes",
    min: 0,
  }),
  alert_rule_refresh_seconds: integerString({
    label: "Alert rule refresh seconds",
    min: 1,
  }),
  event_poll_interval: decimalString({
    label: "Event poll interval",
    min: 0.05,
  }),
  event_lookback_seconds: integerString({
    label: "Event lookback seconds",
    min: 1,
  }),
  inference_interval: decimalString({
    label: "Inference interval",
    min: 0,
  }),
  db_write_batch_size: integerString({
    label: "DB write batch size",
    min: 1,
  }),
  db_write_interval: decimalString({
    label: "DB write interval",
    min: 0.01,
  }),
  confidence_threshold: decimalString({
    label: "Confidence threshold",
    min: 0,
    max: 1,
  }),
  detection_classes: detectionClassesString,
  min_bbox_area: integerString({ label: "Minimum bounding box area", min: 1 }),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

type SettingsFieldConfig = {
  key: SettingFieldKey;
  label: string;
  description: string;
  type: "number" | "text";
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
};

type SettingsSection = {
  title: string;
  description: string;
  fields: SettingsFieldConfig[];
};

const DEFAULT_SETTINGS: SettingsFormValues = {
  retention_days: "30",
  retention_max_disk_gb: "100",
  retention_check_interval: "3600",
  report_hour: "0",
  report_minute: "0",
  alert_dedup_minutes: "5",
  alert_rule_refresh_seconds: "30",
  event_poll_interval: "1.0",
  event_lookback_seconds: "60",
  inference_interval: "0",
  db_write_batch_size: "50",
  db_write_interval: "1.0",
  confidence_threshold: "0.5",
  detection_classes: "0,1,2,3,4,5,6,7",
  min_bbox_area: "1000",
};

const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    title: "Retention",
    description: "Tune how long recordings are kept and how often cleanup runs.",
    fields: [
      {
        key: "retention_days",
        label: "Retention Days",
        description: "Delete recording data older than this many days.",
        type: "number",
        min: 1,
        step: 1,
      },
      {
        key: "retention_max_disk_gb",
        label: "Retention Max Disk (GB)",
        description: "Cap archived recording storage before older segments are removed.",
        type: "number",
        min: 0,
        step: 0.1,
      },
      {
        key: "retention_check_interval",
        label: "Retention Check Interval (s)",
        description: "How often the retention daemon checks storage usage.",
        type: "number",
        min: 1,
        step: 1,
      },
    ],
  },
  {
    title: "Reporting And Alerts",
    description: "Control report scheduling and alert refresh behavior.",
    fields: [
      {
        key: "report_hour",
        label: "Report Hour",
        description: "UTC hour when the daily report job should run.",
        type: "number",
        min: 0,
        max: 23,
        step: 1,
      },
      {
        key: "report_minute",
        label: "Report Minute",
        description: "UTC minute when the daily report job should run.",
        type: "number",
        min: 0,
        max: 59,
        step: 1,
      },
      {
        key: "alert_dedup_minutes",
        label: "Alert Dedup Minutes",
        description: "Suppress repeated alerts for the same event within this window.",
        type: "number",
        min: 0,
        step: 1,
      },
      {
        key: "alert_rule_refresh_seconds",
        label: "Alert Rule Refresh (s)",
        description: "How often active alert rules are reloaded from storage.",
        type: "number",
        min: 1,
        step: 1,
      },
    ],
  },
  {
    title: "Event Monitor",
    description: "Adjust how frequently monitoring jobs scan recent detections.",
    fields: [
      {
        key: "event_poll_interval",
        label: "Event Poll Interval (s)",
        description: "How often the monitor polls for new tracking data.",
        type: "number",
        min: 0.05,
        step: 0.05,
      },
      {
        key: "event_lookback_seconds",
        label: "Event Lookback (s)",
        description: "Window size used when aggregating recent events.",
        type: "number",
        min: 1,
        step: 1,
      },
    ],
  },
  {
    title: "Inference",
    description: "Change runtime inference cadence, filtering, and database batching.",
    fields: [
      {
        key: "inference_interval",
        label: "Inference Interval (s)",
        description: "Delay between inference runs. Use 0 for as-fast-as-possible mode.",
        type: "number",
        min: 0,
        step: 0.01,
      },
      {
        key: "db_write_batch_size",
        label: "DB Write Batch Size",
        description: "Flush detections to the database once this batch size is reached.",
        type: "number",
        min: 1,
        step: 1,
      },
      {
        key: "db_write_interval",
        label: "DB Write Interval (s)",
        description: "Flush detection batches after this many seconds even if the batch is not full.",
        type: "number",
        min: 0.01,
        step: 0.01,
      },
      {
        key: "confidence_threshold",
        label: "Confidence Threshold",
        description: "Only detections at or above this confidence score are kept.",
        type: "number",
        min: 0,
        max: 1,
        step: 0.01,
      },
      {
        key: "detection_classes",
        label: "Detection Classes",
        description: 'Comma-separated class IDs, for example "0,1,2".',
        type: "text",
        placeholder: "0,1,2",
      },
      {
        key: "min_bbox_area",
        label: "Minimum Bounding Box Area",
        description: "Ignore detections smaller than this many pixels squared.",
        type: "number",
        min: 1,
        step: 1,
      },
    ],
  },
];

function toFormValues(settings?: Record<string, string>): SettingsFormValues {
  return {
    ...DEFAULT_SETTINGS,
    ...Object.fromEntries(
      SETTINGS_FIELD_KEYS.map((key) => [
        key,
        settings?.[key] ?? DEFAULT_SETTINGS[key],
      ])
    ),
  } as SettingsFormValues;
}

function normalizePayload(values: SettingsFormValues): SettingsPayload {
  return {
    retention_days: values.retention_days.trim(),
    retention_max_disk_gb: values.retention_max_disk_gb.trim(),
    retention_check_interval: values.retention_check_interval.trim(),
    report_hour: values.report_hour.trim(),
    report_minute: values.report_minute.trim(),
    alert_dedup_minutes: values.alert_dedup_minutes.trim(),
    alert_rule_refresh_seconds: values.alert_rule_refresh_seconds.trim(),
    event_poll_interval: values.event_poll_interval.trim(),
    event_lookback_seconds: values.event_lookback_seconds.trim(),
    inference_interval: values.inference_interval.trim(),
    db_write_batch_size: values.db_write_batch_size.trim(),
    db_write_interval: values.db_write_interval.trim(),
    confidence_threshold: values.confidence_threshold.trim(),
    detection_classes: values.detection_classes
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .join(","),
    min_bbox_area: values.min_bbox_area.trim(),
  };
}

export default function SettingsPage() {
  const settingsQuery = useSettings({
    retry: false,
  });
  const updateSettingsMutation = useUpdateSettings();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: DEFAULT_SETTINGS,
  });

  useEffect(() => {
    if (settingsQuery.data) {
      reset(toFormValues(settingsQuery.data));
    }
  }, [settingsQuery.data, reset]);

  const onSubmit = handleSubmit(async (values) => {
    const payload = normalizePayload(values);
    await updateSettingsMutation.mutateAsync(payload);
    reset(payload);
  });

  const handleResetChanges = () => {
    reset(toFormValues(settingsQuery.data));
  };

  const isSaving = isSubmitting || updateSettingsMutation.isPending;

  return (
    <div className="min-h-screen p-6 text-black">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                Runtime Controls
              </p>
              <h1 className="mt-2 text-3xl font-bold text-gray-900">Settings</h1>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Update daemon and reporting behavior without leaving the dashboard.
                Saved values are written to the backend settings store and picked up
                by the backend on its next refresh cycle.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleResetChanges}
                disabled={isSaving}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-400 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Reset Changes
              </button>
              <CPButton
                type="submit"
                form="settings-form"
                disabled={isSaving}
                label={isSaving ? "Saving..." : "Save Settings"}
              />
            </div>
          </div>

          {settingsQuery.isLoading && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              Loading saved settings from the backend.
            </div>
          )}

          {settingsQuery.isError && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Saved settings could not be loaded right now. The form is still
              usable with backend fallback defaults, so you can keep building the UI.
            </div>
          )}

          {updateSettingsMutation.isError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Settings could not be saved. Please check the backend connection and
              try again.
            </div>
          )}

          {updateSettingsMutation.isSuccess && !isDirty && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {updateSettingsMutation.data.detail}
            </div>
          )}

          {isDirty && (
            <div className="rounded-xl border border-primary/20 bg-secondary/40 px-4 py-3 text-sm text-gray-800">
              You have unsaved changes.
            </div>
          )}
        </div>

        <form id="settings-form" onSubmit={onSubmit} className="grid gap-6 xl:grid-cols-2">
          {SETTINGS_SECTIONS.map((section) => (
            <section
              key={section.title}
              className="rounded-2xl bg-white p-6 shadow-sm"
            >
              <div className="mb-6 border-b border-gray-100 pb-4">
                <h2 className="text-lg font-semibold text-gray-900">{section.title}</h2>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {section.description}
                </p>
              </div>

              <div className="space-y-5">
                {section.fields.map((field) => (
                  <div key={field.key} className="rounded-xl border border-gray-100 p-4">
                    <CPInput
                      id={field.key}
                      label={field.label}
                      type={field.type}
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      placeholder={field.placeholder}
                      {...register(field.key)}
                    />
                    <p className="mt-2 text-sm text-gray-500">{field.description}</p>
                    {errors[field.key] && (
                      <p className="mt-2 text-sm font-medium text-red-600">
                        {errors[field.key]?.message}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </form>
      </div>
    </div>
  );
}
