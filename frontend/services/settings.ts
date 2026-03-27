import { z } from "zod";
import { api } from "@/api/client";

export const SETTINGS_FIELD_KEYS = [
  "retention_days",
  "retention_max_disk_gb",
  "retention_check_interval",
  "report_hour",
  "report_minute",
  "alert_dedup_minutes",
  "alert_rule_refresh_seconds",
  "event_poll_interval",
  "event_lookback_seconds",
  "inference_interval",
  "db_write_batch_size",
  "db_write_interval",
  "confidence_threshold",
  "detection_classes",
  "min_bbox_area",
] as const;

export type SettingFieldKey = (typeof SETTINGS_FIELD_KEYS)[number];
export type SettingsPayload = Record<SettingFieldKey, string>;
export type SettingsResponse = Record<string, string>;
export type SettingsUpdateResponse = {
  detail: string;
};

// --- Validation helpers ---

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

// --- Settings form schema ---

export const settingsFormSchema = z.object({
  retention_days: integerString({ label: "Retention days", min: 1 }),
  retention_max_disk_gb: decimalString({ label: "Retention max disk size", min: 0 }),
  retention_check_interval: integerString({ label: "Retention check interval", min: 1 }),
  report_hour: integerString({ label: "Report hour", min: 0, max: 23 }),
  report_minute: integerString({ label: "Report minute", min: 0, max: 59 }),
  alert_dedup_minutes: integerString({ label: "Alert dedup minutes", min: 0 }),
  alert_rule_refresh_seconds: integerString({ label: "Alert rule refresh seconds", min: 1 }),
  event_poll_interval: decimalString({ label: "Event poll interval", min: 0.05 }),
  event_lookback_seconds: integerString({ label: "Event lookback seconds", min: 1 }),
  inference_interval: decimalString({ label: "Inference interval", min: 0 }),
  db_write_batch_size: integerString({ label: "DB write batch size", min: 1 }),
  db_write_interval: decimalString({ label: "DB write interval", min: 0.01 }),
  confidence_threshold: decimalString({ label: "Confidence threshold", min: 0, max: 1 }),
  detection_classes: detectionClassesString,
  min_bbox_area: integerString({ label: "Minimum bounding box area", min: 1 }),
});

export type SettingsFormValues = z.infer<typeof settingsFormSchema>;

export const DEFAULT_SETTINGS: SettingsFormValues = {
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

export function toFormValues(settings?: Record<string, string>): SettingsFormValues {
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

export function normalizePayload(values: SettingsFormValues): SettingsPayload {
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

// --- Field config types ---

export type SettingsFieldConfig = {
  key: SettingFieldKey;
  label: string;
  description: string;
  type: "number" | "text";
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
};

export type SettingsSection = {
  title: string;
  description: string;
  fields: SettingsFieldConfig[];
};

export const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    title: "Retention",
    description: "Tune how long recordings are kept and how often cleanup runs.",
    fields: [
      { key: "retention_days", label: "Retention Days", description: "Delete recording data older than this many days.", type: "number", min: 1, step: 1 },
      { key: "retention_max_disk_gb", label: "Retention Max Disk (GB)", description: "Cap archived recording storage before older segments are removed.", type: "number", min: 0, step: 0.1 },
      { key: "retention_check_interval", label: "Retention Check Interval (s)", description: "How often the retention daemon checks storage usage.", type: "number", min: 1, step: 1 },
    ],
  },
  {
    title: "Reporting And Alerts",
    description: "Control report scheduling and alert refresh behavior.",
    fields: [
      { key: "report_hour", label: "Report Hour", description: "UTC hour when the daily report job should run.", type: "number", min: 0, max: 23, step: 1 },
      { key: "report_minute", label: "Report Minute", description: "UTC minute when the daily report job should run.", type: "number", min: 0, max: 59, step: 1 },
      { key: "alert_dedup_minutes", label: "Alert Dedup Minutes", description: "Suppress repeated alerts for the same event within this window.", type: "number", min: 0, step: 1 },
      { key: "alert_rule_refresh_seconds", label: "Alert Rule Refresh (s)", description: "How often active alert rules are reloaded from storage.", type: "number", min: 1, step: 1 },
    ],
  },
  {
    title: "Event Monitor",
    description: "Adjust how frequently monitoring jobs scan recent detections.",
    fields: [
      { key: "event_poll_interval", label: "Event Poll Interval (s)", description: "How often the monitor polls for new tracking data.", type: "number", min: 0.05, step: 0.05 },
      { key: "event_lookback_seconds", label: "Event Lookback (s)", description: "Window size used when aggregating recent events.", type: "number", min: 1, step: 1 },
    ],
  },
  {
    title: "Inference",
    description: "Change runtime inference cadence, filtering, and database batching.",
    fields: [
      { key: "inference_interval", label: "Inference Interval (s)", description: "Delay between inference runs. Use 0 for as-fast-as-possible mode.", type: "number", min: 0, step: 0.01 },
      { key: "db_write_batch_size", label: "DB Write Batch Size", description: "Flush detections to the database once this batch size is reached.", type: "number", min: 1, step: 1 },
      { key: "db_write_interval", label: "DB Write Interval (s)", description: "Flush detection batches after this many seconds even if the batch is not full.", type: "number", min: 0.01, step: 0.01 },
      { key: "confidence_threshold", label: "Confidence Threshold", description: "Only detections at or above this confidence score are kept.", type: "number", min: 0, max: 1, step: 0.01 },
      { key: "detection_classes", label: "Detection Classes", description: 'Comma-separated class IDs, for example "0,1,2".', type: "text", placeholder: "0,1,2" },
      { key: "min_bbox_area", label: "Minimum Bounding Box Area", description: "Ignore detections smaller than this many pixels squared.", type: "number", min: 1, step: 1 },
    ],
  },
];

// --- Service ---

export const settingsService = {
  getSettings: async (): Promise<SettingsResponse> => {
    const response = await api.api_settings_retrieve();
    return response as SettingsResponse;
  },

  updateSettings: async (
    payload: SettingsPayload
  ): Promise<SettingsUpdateResponse> => {
    const response = await api.api_settings_create(payload);
    return response as SettingsUpdateResponse;
  },
};
