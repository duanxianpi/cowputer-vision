import { z } from "zod";
import { api, schemas } from "@/api/client";

// Get types from Zod schemas
export type InitStatus = z.infer<typeof schemas.InitStatus>;
export type SetupPayload = z.infer<typeof schemas.Setup>;
export type AuthPayload = z.infer<typeof schemas.Auth>;
export type TokenResponse = z.infer<typeof schemas.TokenResponse>;

export const authService = {
  checkInitStatus: () => api.get("/api/setup"),
  setup: (data: SetupPayload) => api.post("/api/setup", data),
  login: (data: AuthPayload) => api.post("/api/auth", data),
};