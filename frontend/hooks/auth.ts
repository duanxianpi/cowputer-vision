import {
  AuthPayload,
  authService,
  EmailResetConfirmPayload,
  InitStatus,
  PasswordResetConfirmPayload,
  PasswordResetRequestPayload,
  SetupPayload,
  TokenResponse,
} from "@/services/auth";
import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

export const useInitStatus = (
    options?: Omit<UseQueryOptions<InitStatus>, "queryKey" | "queryFn">
  ) => {
    return useQuery({
      queryKey: ["auth", "initStatus"],
      queryFn: authService.checkInitStatus,
      ...options,
    });
  };
  
export const useSetup = (
  options?: Omit<UseMutationOptions<TokenResponse, Error, SetupPayload>, "mutationFn">
) => {
  return useMutation({
    mutationFn: authService.setup,
    ...options,
  });
};

export const useLogin = (
  options?: Omit<UseMutationOptions<TokenResponse, Error, AuthPayload>, "mutationFn">
) => {
  return useMutation({
    mutationFn: authService.login,
    ...options,
  });
};

export const usePasswordResetRequest = (
  options?: Omit<UseMutationOptions<{ detail: string }, Error, PasswordResetRequestPayload>, "mutationFn">
) => {
  return useMutation({
    mutationFn: authService.requestPasswordReset,
    ...options,
  });
};

export const usePasswordResetConfirm = (
  options?: Omit<UseMutationOptions<{ detail: string }, Error, PasswordResetConfirmPayload>, "mutationFn">
) => {
  return useMutation({
    mutationFn: authService.confirmPasswordReset,
    ...options,
  });
};

export const useEmailResetRequest = (
  options?: Omit<UseMutationOptions<{ detail: string }, Error, void>, "mutationFn">
) => {
  return useMutation({
    mutationFn: () => authService.requestEmailReset(),
    ...options,
  });
};

export const useEmailResetConfirm = (
  options?: Omit<UseMutationOptions<{ detail: string }, Error, EmailResetConfirmPayload>, "mutationFn">
) => {
  return useMutation({
    mutationFn: authService.confirmEmailReset,
    ...options,
  });
};

export const useLogout = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  return () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    queryClient.clear();
    router.push("/auth/login");
  };
};