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
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  unit?: string;
  placeholder?: string;
};

export type SettingsSection = {
  title: string;
  description: string;
  fields: SettingsFieldConfig[];
};

export const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    title: "Data Retention",
    description: "Control how long recordings are stored and when old data is cleaned up.",
    fields: [
      {
        key: "retention_days",
        label: "Retention Period",
        unit: "days",
        inputMode: "numeric",
        description: "Recordings older than this are automatically deleted.",
      },
      {
        key: "retention_max_disk_gb",
        label: "Max Disk Usage",
        unit: "GB",
        inputMode: "decimal",
        description: "Trigger cleanup when archived storage exceeds this limit.",
      },
      {
        key: "retention_check_interval",
        label: "Check Interval",
        unit: "seconds",
        inputMode: "numeric",
        description: "How often the system checks for data that exceeds the retention limits.",
      },
    ],
  },
  {
    title: "Reports & Alerts",
    description: "Schedule daily summary reports and configure alert deduplication behavior.",
    fields: [
      {
        key: "report_hour",
        label: "Report Hour",
        unit: "UTC (0–23)",
        inputMode: "numeric",
        description: "Hour of the day when the daily summary report is generated.",
      },
      {
        key: "report_minute",
        label: "Report Minute",
        unit: "UTC (0–59)",
        inputMode: "numeric",
        description: "Minute of the hour when the daily summary report is generated.",
      },
      {
        key: "alert_dedup_minutes",
        label: "Deduplication Window",
        unit: "minutes",
        inputMode: "numeric",
        description: "Identical alerts will be suppressed if they fire within this window.",
      },
      {
        key: "alert_rule_refresh_seconds",
        label: "Rule Refresh Interval",
        unit: "seconds",
        inputMode: "numeric",
        description: "How often active alert rules are reloaded from the database.",
      },
    ],
  },
  {
    title: "Event Monitor",
    description: "Tune how frequently detection data is polled and aggregated.",
    fields: [
      {
        key: "event_poll_interval",
        label: "Poll Interval",
        unit: "seconds",
        inputMode: "decimal",
        description: "How often the monitor checks for new tracking data.",
      },
      {
        key: "event_lookback_seconds",
        label: "Lookback Window",
        unit: "seconds",
        inputMode: "numeric",
        description: "How far back to look when aggregating recent detections.",
      },
    ],
  },
  {
    title: "Inference Engine",
    description: "Configure inference speed, confidence filtering, and detection criteria.",
    fields: [
      {
        key: "inference_interval",
        label: "Inference Interval",
        unit: "seconds",
        inputMode: "decimal",
        description: "Pause between inference runs. Set to 0 for maximum throughput.",
      },
      {
        key: "db_write_batch_size",
        label: "Write Batch Size",
        unit: "detections",
        inputMode: "numeric",
        description: "Number of detections to accumulate before flushing to the database.",
      },
      {
        key: "db_write_interval",
        label: "Write Flush Interval",
        unit: "seconds",
        inputMode: "decimal",
        description: "Force a database write after this delay, even if the batch isn't full.",
      },
      {
        key: "confidence_threshold",
        label: "Confidence Threshold",
        unit: "0–1",
        inputMode: "decimal",
        description: "Detections below this confidence score are discarded.",
      },
      {
        key: "detection_classes",
        label: "Detection Classes",
        placeholder: "e.g. 0, 1, 2",
        description: "YOLO class IDs to track, entered as comma-separated integers.",
      },
      {
        key: "min_bbox_area",
        label: "Min. Bounding Box Area",
        unit: "px²",
        inputMode: "numeric",
        description: "Detections smaller than this pixel area are ignored.",
      },
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
