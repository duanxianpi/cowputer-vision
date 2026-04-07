jest.mock("@/api/client", () => {
  const { z } = require("zod");

  return {
    api: {
      get: jest.fn(),
      post: jest.fn(),
      api_password_reset_create: jest.fn(),
      api_password_reset_confirm_create: jest.fn(),
    },
    schemas: {
      AuthRequest: z.object({ username: z.string(), password: z.string() }),
      SetupRequest: z.object({
        email: z.string(),
        username: z.string(),
        password: z.string(),
        rtsp_url: z.string(),
      }),
      PasswordResetRequestRequest: z.object({ email: z.string() }),
      PasswordResetConfirmRequest: z.object({ token: z.string(), new_password: z.string() }),
      TokenResponse: z.object({ token: z.string(), refresh: z.string() }),
      InitStatus: z.object({ initialized: z.boolean() }),
    },
  };
});

import { authService, LoginSchema } from "@/services/auth";
import { api } from "@/api/client";

const mockApi = api as jest.Mocked<typeof api>;

describe("authService", () => {
  it("calls setup and login endpoints", () => {
    const setupPayload = {
      email: "a@b.com",
      username: "user123",
      password: "password123",
      rtsp_url: "rtsp://example",
    };
    authService.setup(setupPayload);
    expect(mockApi.post).toHaveBeenCalledWith("/api/setup", setupPayload);

    const loginPayload = { username: "user123", password: "password123" };
    authService.login(loginPayload);
    expect(mockApi.post).toHaveBeenCalledWith("/api/auth", loginPayload);
  });

  it("calls password reset endpoints", () => {
    authService.requestPasswordReset({ email: "a@b.com" });
    expect(mockApi.api_password_reset_create).toHaveBeenCalledWith({ email: "a@b.com" });

    authService.confirmPasswordReset({ token: "abc", new_password: "password123" });
    expect(mockApi.api_password_reset_confirm_create).toHaveBeenCalledWith({
      token: "abc",
      new_password: "password123",
    });
  });

  it("requests and confirms email reset", async () => {
    mockApi.post.mockResolvedValueOnce({ detail: "sent" }).mockResolvedValueOnce({ detail: "done" });

    await expect(authService.requestEmailReset()).resolves.toEqual({ detail: "sent" });
    await expect(authService.confirmEmailReset({ token: "abc", new_email: "new@b.com" })).resolves.toEqual({
      detail: "done",
    });
  });

  it("validates login schema", () => {
    const result = LoginSchema.safeParse({ username: "", password: "" });
    expect(result.success).toBe(false);
  });
});
