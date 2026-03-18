import { AuthPayload, authService, InitStatus, SetupPayload, TokenResponse } from "@/services/auth";
import { useQuery, useMutation, UseQueryOptions, UseMutationOptions } from "@tanstack/react-query";

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