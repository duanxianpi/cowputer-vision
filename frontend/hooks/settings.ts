import { settingsService, type SettingsPayload, type SettingsResponse } from "@/services/settings";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from "@tanstack/react-query";

export const SETTINGS_QUERY_KEY = ["settings"] as const;

type SettingsQueryOptions = Omit<
  UseQueryOptions<SettingsResponse, Error, SettingsResponse, typeof SETTINGS_QUERY_KEY>,
  "queryKey" | "queryFn"
>;

type SettingsMutationOptions = Omit<
  UseMutationOptions<{ detail: string }, Error, SettingsPayload>,
  "mutationFn"
>;

export function useSettings(options?: SettingsQueryOptions) {
  return useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: settingsService.getSettings,
    ...options,
  });
}

export function useUpdateSettings(options?: SettingsMutationOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: settingsService.updateSettings,
    onSuccess: async (data, variables, onMutateResult, context) => {
      await queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY });
      await options?.onSuccess?.(data, variables, onMutateResult, context);
    },
    onError: (error, variables, onMutateResult, context) => {
      options?.onError?.(error, variables, onMutateResult, context);
    },
    onSettled: (data, error, variables, onMutateResult, context) => {
      options?.onSettled?.(data, error, variables, onMutateResult, context);
    },
  });
}
