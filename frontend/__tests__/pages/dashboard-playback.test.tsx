jest.mock("@/api/client", () => {
  const { z } = require("zod");
  return {
    api: {},
    schemas: { VideoSegment: z.object({}) },
  };
});

jest.mock("@/hooks/playback", () => ({
  usePlaybackSegments: jest.fn(),
}));

jest.mock("@/hooks/video-track-sync", () => ({
  useVideoTrackSync: jest.fn(),
}));

jest.mock("@/services/playback", () => ({
  playbackService: {
    fetchStreamUrl: jest.fn(),
  },
}));

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PlaybackPage from "@/app/dashboard/playback/page";
import { usePlaybackSegments } from "@/hooks/playback";
import { playbackService } from "@/services/playback";

const mockSegments = [
  { id: 1, filename: "seg1.ts", start_ts: 1000000, end_ts: 1060000, url: "u1" },
  { id: 2, filename: "seg2.ts", start_ts: 1060000, end_ts: 1120000, url: "u2" },
];

describe("PlaybackPage", () => {
  beforeEach(() => {
    (playbackService.fetchStreamUrl as jest.Mock).mockResolvedValue(
      "https://stream.example.com/video.ts"
    );
  });

  async function waitForVideoReady() {
    await waitFor(() => {
      expect(screen.getByText("Ready")).toBeInTheDocument();
    });
  }

  it("renders loading state", () => {
    (usePlaybackSegments as jest.Mock).mockReturnValue({
      data: [],
      isLoading: true,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    render(<PlaybackPage />);
    expect(screen.getByText("Playback")).toBeInTheDocument();
  });

  it("renders error state", () => {
    (usePlaybackSegments as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      isError: true,
      error: new Error("Network error"),
      refetch: jest.fn(),
    });
    render(<PlaybackPage />);
    expect(screen.getByText("Error")).toBeInTheDocument();
    expect(screen.getByText("Network error")).toBeInTheDocument();
  });

  it("renders empty state", () => {
    (usePlaybackSegments as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    render(<PlaybackPage />);
    expect(screen.getByText("No Playback Found")).toBeInTheDocument();
  });

  it("renders segments and auto-selects first", async () => {
    (usePlaybackSegments as jest.Mock).mockReturnValue({
      data: mockSegments,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    render(<PlaybackPage />);

    // Stat cards
    expect(screen.getByText("Segments")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();

    // Segment list
    expect(screen.getAllByText("seg1.ts").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("seg2.ts").length).toBeGreaterThanOrEqual(1);

    // Controls
    expect(screen.getByText("Controls")).toBeInTheDocument();
    expect(screen.getByText("Play")).toBeInTheDocument();
    expect(screen.getByText("Restart")).toBeInTheDocument();
    expect(screen.getByText("Fullscreen")).toBeInTheDocument();

    // Speed buttons
    expect(screen.getByText("1x")).toBeInTheDocument();
    expect(screen.getByText("2x")).toBeInTheDocument();
    expect(screen.getByText("4x")).toBeInTheDocument();
    expect(screen.getByText("8x")).toBeInTheDocument();

    await waitForVideoReady();
  });

  it("selects a different segment", async () => {
    (usePlaybackSegments as jest.Mock).mockReturnValue({
      data: mockSegments,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    render(<PlaybackPage />);

    // Click on seg2
    fireEvent.click(screen.getByText("seg2.ts"));

    await waitFor(() => {
      expect(screen.getByText("Segment Detail")).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(playbackService.fetchStreamUrl).toHaveBeenCalledTimes(2);
    });
    await waitForVideoReady();
  });

  it("changes date and refetches", async () => {
    const refetch = jest.fn();
    (usePlaybackSegments as jest.Mock).mockReturnValue({
      data: mockSegments,
      isLoading: false,
      isError: false,
      error: null,
      refetch,
    });
    render(<PlaybackPage />);
    await waitForVideoReady();

    // Click reload
    fireEvent.click(screen.getByText("Reload"));
    expect(refetch).toHaveBeenCalled();
    await waitFor(() => {
      expect(playbackService.fetchStreamUrl).toHaveBeenCalledTimes(2);
    });
    await waitForVideoReady();
  });

  it("changes playback speed", async () => {
    (usePlaybackSegments as jest.Mock).mockReturnValue({
      data: mockSegments,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    render(<PlaybackPage />);
    await waitForVideoReady();
    fireEvent.click(screen.getByText("4x"));
    // The 4x button should now be active (has primary colors)
    const btn = screen.getByText("4x");
    expect(btn.className).toContain("bg-primary");
  });

  it("handles video error from fetchStreamUrl", async () => {
    (playbackService.fetchStreamUrl as jest.Mock).mockRejectedValue(
      new Error("Stream unavailable")
    );
    (usePlaybackSegments as jest.Mock).mockReturnValue({
      data: mockSegments,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    render(<PlaybackPage />);

    await waitFor(() => {
      expect(screen.getByText("Stream unavailable")).toBeInTheDocument();
    });
  });

  it("shows non-Error fetch failure message", async () => {
    (playbackService.fetchStreamUrl as jest.Mock).mockRejectedValue(
      "unknown error"
    );
    (usePlaybackSegments as jest.Mock).mockReturnValue({
      data: mockSegments,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    render(<PlaybackPage />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load video.")).toBeInTheDocument();
    });
  });

  it("renders non-Error playback error message", () => {
    (usePlaybackSegments as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      isError: true,
      error: "string error",
      refetch: jest.fn(),
    });
    render(<PlaybackPage />);
    expect(
      screen.getByText("Failed to load playback segments.")
    ).toBeInTheDocument();
  });

  it("changes date input and resets selected segment", async () => {
    (usePlaybackSegments as jest.Mock).mockReturnValue({
      data: mockSegments,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    render(<PlaybackPage />);
    await waitForVideoReady();

    const dateInput = screen.getByDisplayValue(
      new Date().toLocaleDateString("en-CA")
    );
    fireEvent.change(dateInput, { target: { value: "2025-01-15" } });
    expect((dateInput as HTMLInputElement).value).toBe("2025-01-15");
    await waitFor(() => {
      expect(playbackService.fetchStreamUrl).toHaveBeenCalledTimes(2);
    });
    await waitForVideoReady();
  });

  describe("video control buttons", () => {
    let playMock: jest.Mock;
    let pauseMock: jest.Mock;

    beforeEach(() => {
      playMock = jest.fn().mockResolvedValue(undefined);
      pauseMock = jest.fn();

      // Mock HTMLMediaElement methods not available in jsdom
      Object.defineProperty(HTMLMediaElement.prototype, "play", {
        configurable: true,
        value: playMock,
      });
      Object.defineProperty(HTMLMediaElement.prototype, "pause", {
        configurable: true,
        value: pauseMock,
      });

      (usePlaybackSegments as jest.Mock).mockReturnValue({
        data: mockSegments,
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
    });

    async function renderWithVideo() {
      render(<PlaybackPage />);
      // Wait for fetchStreamUrl to resolve and video to appear
      await waitFor(() => {
        expect(screen.getByText("Ready")).toBeInTheDocument();
      });
    }

    it("clicks Play to start video", async () => {
      await renderWithVideo();
      fireEvent.click(screen.getByText("Play"));
      expect(playMock).toHaveBeenCalled();
    });

    it("clicks Restart to reset video", async () => {
      await renderWithVideo();
      const video = document.querySelector("video")!;
      Object.defineProperty(video, "currentTime", {
        writable: true,
        value: 30,
      });
      fireEvent.click(screen.getByText("Restart"));
      expect(video.currentTime).toBe(0);
      expect(pauseMock).toHaveBeenCalled();
    });

    it("clicks Fullscreen to enter fullscreen", async () => {
      await renderWithVideo();
      const rfsMock = jest.fn().mockResolvedValue(undefined);
      const wrapper = document.querySelector("video")!.parentElement!;
      wrapper.requestFullscreen = rfsMock;

      fireEvent.click(screen.getByText("Fullscreen"));
      expect(rfsMock).toHaveBeenCalled();
    });

    it("clicks -10s to skip backward", async () => {
      await renderWithVideo();
      const video = document.querySelector("video")!;
      Object.defineProperty(video, "currentTime", {
        writable: true,
        value: 30,
      });
      fireEvent.click(screen.getByText("-10s"));
      expect(video.currentTime).toBe(20);
    });

    it("clicks +10s to skip forward", async () => {
      await renderWithVideo();
      const video = document.querySelector("video")!;
      Object.defineProperty(video, "duration", {
        writable: true,
        value: 120,
      });
      Object.defineProperty(video, "currentTime", {
        writable: true,
        value: 30,
      });
      fireEvent.click(screen.getByText("+10s"));
      expect(video.currentTime).toBe(40);
    });
  });
});
