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
