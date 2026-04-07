jest.mock("@/api/client", () => {
  const { z } = require("zod");
  return {
    api: {},
    schemas: {
      AuthRequest: z.object({ username: z.string(), password: z.string() }),
      SetupRequest: z.object({
        email: z.string(),
        username: z.string(),
        password: z.string(),
        rtsp_url: z.string(),
      }),
      PasswordResetRequestRequest: z.object({ email: z.string() }),
      PasswordResetConfirmRequest: z.object({
        token: z.string(),
        new_password: z.string(),
      }),
      TokenResponse: z.object({ token: z.string(), refresh: z.string() }),
      InitStatus: z.object({ initialized: z.boolean() }),
    },
  };
});

jest.mock("@/hooks/auth", () => ({
  usePasswordResetConfirm: jest.fn(),
  useEmailResetConfirm: jest.fn(),
  useLogout: jest.fn(() => jest.fn()),
}));

const mockSearchParams = new URLSearchParams();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => mockSearchParams,
  redirect: jest.fn(),
}));

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ResetPasswordPage from "@/app/reset-password/page";
import ResetEmailPage from "@/app/reset-email/page";
import {
  usePasswordResetConfirm,
  useEmailResetConfirm,
} from "@/hooks/auth";

const mutation = (overrides: any = {}) => ({
  mutate: jest.fn(),
  mutateAsync: jest.fn().mockResolvedValue({}),
  isPending: false,
  isError: false,
  isSuccess: false,
  data: undefined,
  ...overrides,
});

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    (usePasswordResetConfirm as jest.Mock).mockImplementation(() =>
      mutation()
    );
  });

  it("renders without token - shows invalid link message", () => {
    render(<ResetPasswordPage />);
    expect(screen.getByText("Reset Password")).toBeInTheDocument();
    expect(screen.getByText(/Invalid reset link/)).toBeInTheDocument();
    expect(screen.getByText("Back to Login")).toBeInTheDocument();
  });

  it("renders form when token is present", () => {
    mockSearchParams.set("token", "abc-123");
    render(<ResetPasswordPage />);
    expect(
      screen.getByPlaceholderText("Enter new password")
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Re-enter new password")
    ).toBeInTheDocument();
    mockSearchParams.delete("token");
  });

  it("shows error message on failure", () => {
    mockSearchParams.set("token", "abc-123");
    (usePasswordResetConfirm as jest.Mock).mockImplementation(() =>
      mutation({ isError: true })
    );
    render(<ResetPasswordPage />);
    expect(screen.getByText(/Invalid or expired token/)).toBeInTheDocument();
    mockSearchParams.delete("token");
  });

  it("shows success message", () => {
    mockSearchParams.set("token", "abc-123");
    (usePasswordResetConfirm as jest.Mock).mockImplementation(() =>
      mutation({
        isSuccess: true,
        data: { detail: "Password updated successfully." },
      })
    );
    render(<ResetPasswordPage />);
    expect(
      screen.getByText("Password updated successfully.")
    ).toBeInTheDocument();
    mockSearchParams.delete("token");
  });

  it("shows pending state", () => {
    mockSearchParams.set("token", "abc-123");
    (usePasswordResetConfirm as jest.Mock).mockImplementation(() =>
      mutation({ isPending: true })
    );
    render(<ResetPasswordPage />);
    expect(screen.getByText("Updating...")).toBeInTheDocument();
    mockSearchParams.delete("token");
  });

  it("submits password reset form", async () => {
    mockSearchParams.set("token", "abc-123");
    const mutate = jest.fn();
    (usePasswordResetConfirm as jest.Mock).mockImplementation(() =>
      mutation({ mutate })
    );
    render(<ResetPasswordPage />);

    fireEvent.change(screen.getByPlaceholderText("Enter new password"), {
      target: { value: "newpassword123" },
    });
    fireEvent.change(screen.getByPlaceholderText("Re-enter new password"), {
      target: { value: "newpassword123" },
    });
    fireEvent.click(screen.getByText("Update Password"));

    await waitFor(() => {
      expect(mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          token: "abc-123",
          new_password: "newpassword123",
        })
      );
    });
    mockSearchParams.delete("token");
  });
});

describe("ResetEmailPage", () => {
  beforeEach(() => {
    (useEmailResetConfirm as jest.Mock).mockImplementation(() => mutation());
  });

  it("renders without token - shows invalid link message", () => {
    render(<ResetEmailPage />);
    expect(screen.getByText("Confirm Email Change")).toBeInTheDocument();
    expect(screen.getByText(/Invalid verification link/)).toBeInTheDocument();
  });

  it("renders form when token is present", () => {
    mockSearchParams.set("token", "tok-456");
    render(<ResetEmailPage />);
    expect(
      screen.getByPlaceholderText("name@example.com")
    ).toBeInTheDocument();
    mockSearchParams.delete("token");
  });

  it("shows error on failure", () => {
    mockSearchParams.set("token", "tok-456");
    (useEmailResetConfirm as jest.Mock).mockImplementation(() =>
      mutation({ isError: true })
    );
    render(<ResetEmailPage />);
    expect(
      screen.getByText(/Invalid or expired token/)
    ).toBeInTheDocument();
    mockSearchParams.delete("token");
  });

  it("shows success message", () => {
    mockSearchParams.set("token", "tok-456");
    (useEmailResetConfirm as jest.Mock).mockImplementation(() =>
      mutation({ isSuccess: true, data: { detail: "Email updated." } })
    );
    render(<ResetEmailPage />);
    expect(screen.getByText("Email updated.")).toBeInTheDocument();
    mockSearchParams.delete("token");
  });

  it("shows pending state", () => {
    mockSearchParams.set("token", "tok-456");
    (useEmailResetConfirm as jest.Mock).mockImplementation(() =>
      mutation({ isPending: true })
    );
    render(<ResetEmailPage />);
    expect(screen.getByText("Updating...")).toBeInTheDocument();
    mockSearchParams.delete("token");
  });

  it("submits email reset form", async () => {
    mockSearchParams.set("token", "tok-456");
    const mutate = jest.fn();
    (useEmailResetConfirm as jest.Mock).mockImplementation(() =>
      mutation({ mutate })
    );
    render(<ResetEmailPage />);

    fireEvent.change(screen.getByPlaceholderText("name@example.com"), {
      target: { value: "new@example.com" },
    });
    fireEvent.click(screen.getByText("Update Email"));

    await waitFor(() => {
      expect(mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          token: "tok-456",
          new_email: "new@example.com",
        })
      );
    });
    mockSearchParams.delete("token");
  });
});
