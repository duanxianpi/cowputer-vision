const requestUse = jest.fn();
const responseUse = jest.fn();
const apiPost = jest.fn();
const axiosCall = jest.fn();

jest.mock("@/api/client", () => ({
  api: {
    axios: Object.assign(axiosCall, {
      interceptors: {
        request: { use: requestUse },
        response: { use: responseUse },
      },
    }),
    post: apiPost,
  },
}));

import { setupApiInterceptors } from "@/api/apiSetup";

describe("setupApiInterceptors", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it("adds auth header in request interceptor when token exists", async () => {
    localStorage.setItem("access_token", "abc");
    setupApiInterceptors();

    const requestFulfilled = requestUse.mock.calls[0][0];
    const cfg = { headers: {} as Record<string, string> };
    const result = await requestFulfilled(cfg);

    expect(result.headers.Authorization).toBe("Bearer abc");
  });

  it("refreshes token and retries request on 401", async () => {
    localStorage.setItem("access_token", "old-access");
    localStorage.setItem("refresh_token", "refresh-1");

    apiPost.mockResolvedValueOnce({ access: "new-access", refresh: "refresh-2" });
    axiosCall.mockResolvedValueOnce({ ok: true });

    setupApiInterceptors();
    const responseRejected = responseUse.mock.calls[0][1];

    const err = {
      response: { status: 401 },
      config: { _retry: false, url: "/api/anything", headers: {} as Record<string, string> },
    };

    const out = await responseRejected(err);

    expect(apiPost).toHaveBeenCalledWith("/api/auth/refresh", {
      access: "old-access",
      refresh: "refresh-1",
    });
    expect(localStorage.getItem("access_token")).toBe("new-access");
    expect(localStorage.getItem("refresh_token")).toBe("refresh-2");
    expect(out).toEqual({ ok: true });
  });

  it("clears tokens and redirects on refresh failure", async () => {
    localStorage.setItem("access_token", "old-access");
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    setupApiInterceptors();
    const responseRejected = responseUse.mock.calls[0][1];

    const err = {
      response: { status: 401 },
      config: { _retry: false, url: "/api/anything", headers: {} as Record<string, string> },
    };

    await expect(responseRejected(err)).rejects.toThrow("No refresh token available");
    expect(localStorage.getItem("access_token")).toBeNull();
    expect(localStorage.getItem("refresh_token")).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("rejects non-401 responses without retry", async () => {
    setupApiInterceptors();
    const responseRejected = responseUse.mock.calls[0][1];

    const err = { response: { status: 403 }, config: { _retry: false, url: "/api/anything", headers: {} } };
    await expect(responseRejected(err)).rejects.toBe(err);
  });
});
