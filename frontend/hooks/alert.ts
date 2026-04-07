import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alertService } from '@/services/alert';

export const useAlertsList = (includeEvents = false) => {
  return useQuery({
    queryKey: ['alerts', { includeEvents }],
    queryFn: () => alertService.fetchAlerts(includeEvents),
  });
};

export const useRetrieveAlert = (id: number, options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: ['alert', id],
        queryFn: () => alertService.retrieveAlert(id),
        enabled: options?.enabled ?? true,
    });
};

export const useCreateAlert = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: alertService.createAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
};

export const useUpdateAlert = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: alertService.updateAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
};

export const useDeleteAlert = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: alertService.deleteAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
};

export const useDeleteAlertEvents = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: alertService.deleteAlertEvents,
    onSuccess: (_, alertId) => {
      queryClient.invalidateQueries({ queryKey: ['alert', alertId] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
};