import { z } from "zod";
import { api, schemas } from "@/api/client";

// Get types from Zod schemas
export type InitStatus = z.infer<typeof schemas.InitStatus>;
export type SetupPayload = z.infer<typeof schemas.SetupRequest>;
export type AuthPayload = z.infer<typeof schemas.AuthRequest>;
export type TokenResponse = z.infer<typeof schemas.TokenResponse>;

export const LoginSchema = schemas.AuthRequest.extend({
  username: z
    .string()
    .min(1, "Username is required.")
    .max(150, "Username must be at most 150 characters."),
  password: z
    .string()
    .min(1, "Password is required.")
    .max(128, "Password is too long."),
});

export type LoginFormValues = z.infer<typeof LoginSchema>;

export const SetupSchema = schemas.SetupRequest.extend({
  email: z.string().min(1, "Email is required.").email("Please enter a valid email."),
  username: z.string().min(3, "Username must be at least 3 characters.").max(150, "Username must be at most 150 characters."),
  password: z.string().min(8, "Password must be at least 8 characters.").max(128, "Password is too long."),
  rtsp_url: z.string().min(1, "RTSP URL is required.").max(255, "RTSP URL is too long."),
});

export type SetupFormValues = z.infer<typeof SetupSchema>;

export const authService = {
  checkInitStatus: () => api.get("/api/setup"),
  setup: (data: SetupPayload) => api.post("/api/setup", data),
  login: (data: LoginFormValues) => api.post("/api/auth", data),
};