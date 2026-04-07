import { z } from "zod";
import { api, schemas } from "@/api/client";

// Get types from Zod schemas
export type InitStatus = z.infer<typeof schemas.InitStatus>;
export type SetupPayload = z.infer<typeof schemas.SetupRequest>;
export type AuthPayload = z.infer<typeof schemas.AuthRequest>;
export type TokenResponse = z.infer<typeof schemas.TokenResponse>;
export type PasswordResetRequestPayload = z.infer<typeof schemas.PasswordResetRequestRequest>;
export type PasswordResetConfirmPayload = z.infer<typeof schemas.PasswordResetConfirmRequest>;
export type DetailResponse = { detail: string };

export const EmailResetConfirmSchema = z.object({
  token: z.string().min(1, "Token is required."),
  new_email: z.string().min(1, "Email is required.").email("Please enter a valid email."),
});
export type EmailResetConfirmPayload = z.infer<typeof EmailResetConfirmSchema>;

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

export const PasswordResetRequestSchema = schemas.PasswordResetRequestRequest.extend({
  email: z.string().min(1, "Email is required.").email("Please enter a valid email."),
});
export type PasswordResetRequestFormValues = z.infer<typeof PasswordResetRequestSchema>;

export const PasswordResetConfirmSchema = schemas.PasswordResetConfirmRequest.extend({
  token: z.string().min(1, "Reset token is required."),
  new_password: z.string().min(8, "Password must be at least 8 characters.").max(128, "Password is too long."),
});
export type PasswordResetConfirmFormValues = z.infer<typeof PasswordResetConfirmSchema>;

export const authService = {
  checkInitStatus: () => api.get("/api/setup"),
  setup: (data: SetupPayload) => api.post("/api/setup", data),
  login: (data: LoginFormValues) => api.post("/api/auth", data),
  requestPasswordReset: (data: PasswordResetRequestPayload) =>
    api.api_password_reset_create(data),
  confirmPasswordReset: (data: PasswordResetConfirmPayload) =>
    api.api_password_reset_confirm_create(data),
  requestEmailReset: async (): Promise<DetailResponse> => {
    const response = await api.post("/api/email-reset", undefined);
    return response as DetailResponse;
  },
  confirmEmailReset: async (data: EmailResetConfirmPayload): Promise<DetailResponse> => {
    const response = await api.post("/api/email-reset/confirm", data);
    return response as DetailResponse;
  },
};