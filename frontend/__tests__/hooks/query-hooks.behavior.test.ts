const useQuery = jest.fn((opts) => opts);
const useMutation = jest.fn((opts) => opts);
const invalidateQueries = jest.fn();
const clear = jest.fn();

jest.mock("@tanstack/react-query", () => ({
  useQuery: (opts: unknown) => useQuery(opts),
  useMutation: (opts: unknown) => useMutation(opts),
  useQueryClient: () => ({ invalidateQueries, clear }),
}));

const alertService = {
  fetchAlerts: jest.fn(),
  retrieveAlert: jest.fn(),
  createAlert: jest.fn(),
  updateAlert: jest.fn(),
  deleteAlert: jest.fn(),
  deleteAlertEvents: jest.fn(),
};

const authService = {
  checkInitStatus: jest.fn(),
  setup: jest.fn(),
  login: jest.fn(),
  requestPasswordReset: jest.fn(),
  confirmPasswordReset: jest.fn(),
  requestEmailReset: jest.fn(),
  confirmEmailReset: jest.fn(),
};

const playbackService = { fetchSegments: jest.fn() };
const reportService = { fetchReports: jest.fn(), retrieveReport: jest.fn() };
const settingsService = { getSettings: jest.fn(), updateSettings: jest.fn() };
const trackService = { fetchTracks: jest.fn() };

jest.mock("@/services/alert", () => ({ alertService }));
jest.mock("@/services/auth", () => ({ authService }));
jest.mock("@/services/playback", () => ({ playbackService }));
jest.mock("@/services/report", () => ({ reportService }));
jest.mock("@/services/settings", () => ({ settingsService }));
jest.mock("@/services/track", () => ({ trackService }));

import {
  useAlertsList,
  useCreateAlert,
  useDeleteAlert,
  useDeleteAlertEvents,
  useRetrieveAlert,
  useUpdateAlert,
} from "@/hooks/alert";
import {
  useEmailResetConfirm,
  useEmailResetRequest,
  useInitStatus,
  useLogin,
  useLogout,
  usePasswordResetConfirm,
  usePasswordResetRequest,
  useSetup,
} from "@/hooks/auth";
import { usePlaybackSegments } from "@/hooks/playback";
import { useReportsList, useRetrieveReport } from "@/hooks/report";
import { SETTINGS_QUERY_KEY, useSettings, useUpdateSettings } from "@/hooks/settings";
import { useTracks } from "@/hooks/track";
import { mockRouter } from "@/test/mocks/nextNavigationMock";

describe("query hooks behavior", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("builds alert list and retrieve queries", async () => {
    const listQuery = useAlertsList(true) as any;
    expect(listQuery.queryKey).toEqual(["alerts", { includeEvents: true }]);
    await listQuery.queryFn();
    expect(alertService.fetchAlerts).toHaveBeenCalledWith(true);

    const retrieveQuery = useRetrieveAlert(3, { enabled: false }) as any;
    expect(retrieveQuery.enabled).toBe(false);
    await retrieveQuery.queryFn();
    expect(alertService.retrieveAlert).toHaveBeenCalledWith(3);
  });

  it("invalidates alert queries after alert mutations", async () => {
    const createMutation = useCreateAlert() as any;
    expect(createMutation.mutationFn).toBe(alertService.createAlert);
    await createMutation.onSuccess();
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["alerts"] });

    const updateMutation = useUpdateAlert() as any;
    await updateMutation.onSuccess();
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["alerts"] });

    const deleteMutation = useDeleteAlert() as any;
    await deleteMutation.onSuccess();
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["alerts"] });

    const deleteEventsMutation = useDeleteAlertEvents() as any;
    await deleteEventsMutation.onSuccess(undefined, 42);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["alert", 42] });
  });

  it("wires auth hook query/mutations and logout", async () => {
    const initQuery = useInitStatus() as any;
    expect(initQuery.queryKey).toEqual(["auth", "initStatus"]);
    await initQuery.queryFn();
    expect(authService.checkInitStatus).toHaveBeenCalled();

    expect((useSetup() as any).mutationFn).toBe(authService.setup);
    expect((useLogin() as any).mutationFn).toBe(authService.login);
    expect((usePasswordResetRequest() as any).mutationFn).toBe(authService.requestPasswordReset);
    expect((usePasswordResetConfirm() as any).mutationFn).toBe(authService.confirmPasswordReset);

    await (useEmailResetRequest() as any).mutationFn();
    expect(authService.requestEmailReset).toHaveBeenCalled();

    expect((useEmailResetConfirm() as any).mutationFn).toBe(authService.confirmEmailReset);

    localStorage.setItem("access_token", "a");
    localStorage.setItem("refresh_token", "b");
    const logout = useLogout();
    logout();
    expect(clear).toHaveBeenCalled();
    expect(mockRouter.push).toHaveBeenCalledWith("/auth/login");
    expect(localStorage.getItem("access_token")).toBeNull();
  });

  it("wires playback/report/settings/track hooks", async () => {
    const playbackQuery = usePlaybackSegments("2026-04-06") as any;
    expect(playbackQuery.enabled).toBe(true);
    await playbackQuery.queryFn();
    expect(playbackService.fetchSegments).toHaveBeenCalledWith("2026-04-06");

    const reportsQuery = useReportsList() as any;
    await reportsQuery.queryFn();
    expect(reportService.fetchReports).toHaveBeenCalled();

    const reportQuery = useRetrieveReport("id-1") as any;
    expect(reportQuery.enabled).toBe(true);
    await reportQuery.queryFn();
    expect(reportService.retrieveReport).toHaveBeenCalledWith("id-1");

    const settingsQuery = useSettings() as any;
    expect(settingsQuery.queryKey).toEqual(SETTINGS_QUERY_KEY);
    await settingsQuery.queryFn();
    expect(settingsService.getSettings).toHaveBeenCalled();

    const settingsMutation = useUpdateSettings() as any;
    await settingsMutation.onSuccess({}, {}, undefined, undefined);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: SETTINGS_QUERY_KEY });

    const trackQuery = useTracks({ behavior: ["walking"], cowId: "cow-1", timeWindowMinutes: 5 }) as any;
    await trackQuery.queryFn();
    expect(trackService.fetchTracks).toHaveBeenCalled();
    const callArg = trackService.fetchTracks.mock.calls[0][0];
    expect(callArg.behavior).toEqual(["walking"]);
    expect(callArg.cowId).toBe("cow-1");
    expect(typeof callArg.sinceTimestamp).toBe("number");
  });
});
