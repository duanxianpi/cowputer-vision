jest.mock("@/api/client", () => {
  const { z } = require("zod");

  return {
    api: {
      api_alerts_list: jest.fn(),
      api_alerts_retrieve: jest.fn(),
      api_alerts_create: jest.fn(),
      api_alerts_update: jest.fn(),
      api_alerts_destroy: jest.fn(),
      api_alerts_events_destroy: jest.fn(),
    },
    schemas: {
      AlertRuleWriteRequest: z.object({
        name: z.string(),
        description: z.string().optional(),
        conditions: z.any(),
        actions: z.string(),
        is_active: z.boolean().optional(),
      }),
      AlertRule: z.object({ id: z.number() }),
      AlertEvent: z.object({ id: z.number() }),
    },
  };
});

import { alertService } from "@/services/alert";
import { api } from "@/api/client";

const mockApi = api as any;

describe("alertService", () => {
  it("fetches alerts with include_events query", () => {
    alertService.fetchAlerts(true);
    expect(mockApi.api_alerts_list).toHaveBeenCalledWith({
      queries: { include_events: "true" },
    });
  });

  it("retrieves one alert", () => {
    alertService.retrieveAlert(7);
    expect(mockApi.api_alerts_retrieve).toHaveBeenCalledWith({ params: { id: 7 } });
  });

  it("creates and updates alerts", () => {
    const payload = {
      name: "Rule",
      description: "Desc",
      conditions: {},
      actions: "email",
      is_active: true,
    };

    alertService.createAlert(payload);
    expect(mockApi.api_alerts_create).toHaveBeenCalledWith(payload);

    alertService.updateAlert({ id: 2, data: payload });
    expect(mockApi.api_alerts_update).toHaveBeenCalledWith(payload, {
      params: { id: 2 },
    });
  });

  it("deletes an alert and its events", () => {
    alertService.deleteAlert(3);
    expect(mockApi.api_alerts_destroy).toHaveBeenCalledWith(undefined, {
      params: { id: 3 },
    });

    alertService.deleteAlertEvents(3);
    expect(mockApi.api_alerts_events_destroy).toHaveBeenCalledWith(undefined, {
      params: { id: 3 },
    });
  });
});
