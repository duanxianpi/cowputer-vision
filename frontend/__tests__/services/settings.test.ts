jest.mock("@/api/client", () => ({
  api: {
    api_settings_retrieve: jest.fn(),
    api_settings_create: jest.fn(),
  },
}));

import {
  DEFAULT_SETTINGS,
  normalizePayload,
  settingsFormSchema,
  settingsService,
  toFormValues,
} from "@/services/settings";
import { api } from "@/api/client";

const mockApi = api as jest.Mocked<typeof api>;

describe("settings helpers", () => {
  beforeEach(() => {
    jest.spyOn(Date.prototype, "getTimezoneOffset").mockReturnValue(0);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("maps API settings to form values", () => {
    const values = toFormValues({
      ...DEFAULT_SETTINGS,
      report_hour: "8",
      report_minute: "15",
      email: "ops@example.com",
    });

    expect(values.email).toBe("ops@example.com");
    expect(values.report_hour).toBe("8");
    expect(values.report_minute).toBe("15");
  });

  it("normalizes payload values", () => {
    const payload = normalizePayload({
      ...DEFAULT_SETTINGS,
      email: "  ops@example.com  ",
      detection_classes: " 0, 1 ,2 ,,",
      report_hour: "9",
      report_minute: "5",
    });

    expect(payload.email).toBe("ops@example.com");
    expect(payload.detection_classes).toBe("0,1,2");
    expect(payload.report_hour).toBe("9");
    expect(payload.report_minute).toBe("5");
  });

  it("validates settings form fields", () => {
    const result = settingsFormSchema.safeParse({
      ...DEFAULT_SETTINGS,
      retention_days: "0",
    });

    expect(result.success).toBe(false);
  });
});

describe("settingsService", () => {
  it("gets and updates settings", async () => {
    mockApi.api_settings_retrieve.mockResolvedValueOnce({ key: "value" });
    mockApi.api_settings_create.mockResolvedValueOnce({ detail: "ok" });

    await expect(settingsService.getSettings()).resolves.toEqual({ key: "value" });
    await expect(settingsService.updateSettings({ ...DEFAULT_SETTINGS })).resolves.toEqual({
      detail: "ok",
    });
  });
});
