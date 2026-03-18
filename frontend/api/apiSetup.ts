import { api } from "@/api/client";

const TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

export const setupApiInterceptors = () => {
    api.axios.interceptors.request.use(
        (config) => {
      const token = localStorage.getItem(TOKEN_KEY);

      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // 401 Handling
  api.axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      if (
        error.response?.status === 401 &&
        !originalRequest._retry &&
        originalRequest.url !== "/api/auth/refresh"
      ) {
        originalRequest._retry = true;

        try {
          const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
          if (!refreshToken) throw new Error("No refresh token available");

          const accessToken = localStorage.getItem(TOKEN_KEY) || "";
          
          const refreshRes = await api.post("/api/auth/refresh", {
            access: accessToken,
            refresh: refreshToken,
          });

          localStorage.setItem(TOKEN_KEY, String(refreshRes.access || refreshRes.token));
          localStorage.setItem(REFRESH_TOKEN_KEY, refreshRes.refresh);

          originalRequest.headers.Authorization = `Bearer ${refreshRes.access || refreshRes.token}`;
          return api.axios(originalRequest);
        } catch (refreshError) {
          console.error("Token refresh failed, forcing logout...");
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(REFRESH_TOKEN_KEY);
          
          window.location.href = "/auth/login";
          
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );
};