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
  useLogin: jest.fn(),
  useSetup: jest.fn(),
  usePasswordResetRequest: jest.fn(),
}));

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "@/app/auth/login/page";
import RegisterPage from "@/app/auth/register/page";
import ForgotPasswordPage from "@/app/auth/forgot-password/page";
import { useLogin, useSetup, usePasswordResetRequest } from "@/hooks/auth";
import { mockRouter } from "@/test/mocks/nextNavigationMock";

const mutation = (overrides: any = {}) => ({
  mutate: jest.fn(),
  mutateAsync: jest.fn().mockResolvedValue({}),
  isPending: false,
  isError: false,
  isSuccess: false,
  data: undefined,
  ...overrides,
});

describe("LoginPage", () => {
  let loginOnSuccess: Function;

  beforeEach(() => {
    loginOnSuccess = () => {};
    (useLogin as jest.Mock).mockImplementation((opts?: any) => {
      if (opts?.onSuccess) loginOnSuccess = opts.onSuccess;
      return mutation();
    });
  });

  it("renders login form", () => {
    render(<LoginPage />);
    expect(screen.getAllByText("Login").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByPlaceholderText("Username")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
  });

  it("shows error message when login fails", () => {
    (useLogin as jest.Mock).mockImplementation(() => mutation({ isError: true }));
    render(<LoginPage />);
    expect(screen.getByText(/Login failed/)).toBeInTheDocument();
  });

  it("shows pending state", () => {
    (useLogin as jest.Mock).mockImplementation(() => mutation({ isPending: true }));
    render(<LoginPage />);
    expect(screen.getByText("Logging in...")).toBeInTheDocument();
  });

  it("submits form with valid data", async () => {
    const mutate = jest.fn();
    (useLogin as jest.Mock).mockImplementation((opts?: any) => {
      if (opts?.onSuccess) loginOnSuccess = opts.onSuccess;
      return mutation({ mutate });
    });
    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText("Username"), {
      target: { value: "testuser" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Login/i }));

    await waitFor(() => {
      expect(mutate).toHaveBeenCalled();
    });
  });

  it("stores tokens and redirects on success", () => {
    render(<LoginPage />);
    loginOnSuccess({ token: "access-tok", refresh: "refresh-tok" });
    expect(localStorage.getItem("access_token")).toBe("access-tok");
    expect(localStorage.getItem("refresh_token")).toBe("refresh-tok");
    expect(mockRouter.push).toHaveBeenCalledWith("/dashboard");
  });

  it("handles success without refresh token", () => {
    render(<LoginPage />);
    loginOnSuccess({ token: "access-tok" });
    expect(localStorage.getItem("access_token")).toBe("access-tok");
  });

  it("has forgot password link", () => {
    render(<LoginPage />);
    expect(screen.getByText("Forgot password?")).toBeInTheDocument();
  });
});

describe("RegisterPage", () => {
  let setupOnSuccess: Function;

  beforeEach(() => {
    setupOnSuccess = () => {};
    (useSetup as jest.Mock).mockImplementation((opts?: any) => {
      if (opts?.onSuccess) setupOnSuccess = opts.onSuccess;
      return mutation();
    });
  });

  it("renders register form", () => {
    render(<RegisterPage />);
    expect(screen.getByText("Setup For COWPUTER")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Username")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("rtsp://...")).toBeInTheDocument();
  });

  it("shows error when setup fails", () => {
    (useSetup as jest.Mock).mockImplementation(() => mutation({ isError: true }));
    render(<RegisterPage />);
    expect(screen.getByText(/Setup failed/)).toBeInTheDocument();
  });

  it("submits form with valid data", async () => {
    const mutate = jest.fn();
    (useSetup as jest.Mock).mockImplementation((opts?: any) => {
      if (opts?.onSuccess) setupOnSuccess = opts.onSuccess;
      return mutation({ mutate });
    });
    render(<RegisterPage />);

    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Username"), {
      target: { value: "testuser" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByPlaceholderText("rtsp://..."), {
      target: { value: "rtsp://192.168.1.1/stream" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Register/i }));

    await waitFor(() => {
      expect(mutate).toHaveBeenCalled();
    });
  });

  it("redirects to login on success", () => {
    render(<RegisterPage />);
    setupOnSuccess();
    expect(mockRouter.push).toHaveBeenCalledWith("/auth/login");
  });
});

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    (usePasswordResetRequest as jest.Mock).mockReturnValue(mutation());
  });

  it("renders forgot password form", () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByText("Forgot Password")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
    expect(screen.getByText("Back to Login")).toBeInTheDocument();
  });

  it("shows success message", () => {
    (usePasswordResetRequest as jest.Mock).mockReturnValue(
      mutation({ isSuccess: true, data: { detail: "Reset link sent." } })
    );
    render(<ForgotPasswordPage />);
    expect(screen.getByText("Reset link sent.")).toBeInTheDocument();
  });

  it("shows error message", () => {
    (usePasswordResetRequest as jest.Mock).mockReturnValue(
      mutation({ isError: true })
    );
    render(<ForgotPasswordPage />);
    expect(screen.getByText(/Failed to request reset link/)).toBeInTheDocument();
  });

  it("shows pending state", () => {
    (usePasswordResetRequest as jest.Mock).mockReturnValue(
      mutation({ isPending: true })
    );
    render(<ForgotPasswordPage />);
    expect(screen.getByText("Sending...")).toBeInTheDocument();
  });

  it("submits email for reset", async () => {
    const mutate = jest.fn();
    (usePasswordResetRequest as jest.Mock).mockReturnValue(mutation({ mutate }));
    render(<ForgotPasswordPage />);

    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Send Reset Link/i }));

    await waitFor(() => {
      expect(mutate).toHaveBeenCalled();
    });
  });
});
