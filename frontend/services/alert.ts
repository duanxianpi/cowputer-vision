import { z } from "zod";
import { api, schemas } from "@/api/client";

// Get types from Zod schemas
export type AlertRule = z.infer<typeof schemas.AlertRule>;
export type AlertEvent = z.infer<typeof schemas.AlertEvent>;

export const alertRuleWriteRequestSchema = schemas.AlertRuleWriteRequest.extend({
  name: z.string().min(1, "Alert name is required").max(150, "Alert name is too long"),
  description: z.string().max(300, "Description is too long").optional(),
  conditions: z.any().optional(),
  actions: z.string(),
  is_active: z.boolean(),
});

export type AlertRuleWriteRequestFormValues = z.infer<typeof alertRuleWriteRequestSchema>;

export const alertService = {
  fetchAlerts: (includeEvents: boolean) => api.api_alerts_list({
    queries: { include_events: includeEvents ? "true" : "false" },
  }),

  retrieveAlert: (id: number) => api.api_alerts_retrieve({
    params: { id },
  }),

  createAlert: (data: AlertRuleWriteRequestFormValues) => api.api_alerts_create(data),

  updateAlert: ({ id, data }: { id: number; data: AlertRuleWriteRequestFormValues }) => api.api_alerts_update(data, {
    params: { id },
  }),

  deleteAlert: (id: number) => api.api_alerts_destroy(undefined,{
    params: { id },
  }),
};