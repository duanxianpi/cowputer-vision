describe("all hooks modules", () => {
  it("exports alert hooks", () => {
    const mod = require("@/hooks/alert");
    expect(typeof mod.useAlertsList).toBe("function");
    expect(typeof mod.useRetrieveAlert).toBe("function");
    expect(typeof mod.useCreateAlert).toBe("function");
    expect(typeof mod.useUpdateAlert).toBe("function");
    expect(typeof mod.useDeleteAlert).toBe("function");
    expect(typeof mod.useDeleteAlertEvents).toBe("function");
  });

  it("exports auth hooks", () => {
    const mod = require("@/hooks/auth");
    expect(typeof mod.useInitStatus).toBe("function");
    expect(typeof mod.useSetup).toBe("function");
    expect(typeof mod.useLogin).toBe("function");
    expect(typeof mod.usePasswordResetRequest).toBe("function");
    expect(typeof mod.usePasswordResetConfirm).toBe("function");
    expect(typeof mod.useEmailResetRequest).toBe("function");
    expect(typeof mod.useEmailResetConfirm).toBe("function");
    expect(typeof mod.useLogout).toBe("function");
  });

  it("exports playback hooks", () => {
    const mod = require("@/hooks/playback");
    expect(typeof mod.usePlaybackSegments).toBe("function");
  });

  it("exports report hooks", () => {
    const mod = require("@/hooks/report");
    expect(typeof mod.useReportsList).toBe("function");
    expect(typeof mod.useRetrieveReport).toBe("function");
  });

  it("exports settings hooks", () => {
    const mod = require("@/hooks/settings");
    expect(Array.isArray(mod.SETTINGS_QUERY_KEY)).toBe(true);
    expect(typeof mod.useSettings).toBe("function");
    expect(typeof mod.useUpdateSettings).toBe("function");
  });

  it("exports track hooks", () => {
    const mod = require("@/hooks/track");
    expect(typeof mod.useTracks).toBe("function");
  });

  it("exports hls sync hook", () => {
    const mod = require("@/hooks/hls-sync");
    expect(typeof mod.useHLSTrackSync).toBe("function");
  });

  it("exports video track sync hook", () => {
    const mod = require("@/hooks/video-track-sync");
    expect(typeof mod.useVideoTrackSync).toBe("function");
  });
});
