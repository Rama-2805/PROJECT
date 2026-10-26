const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
const API_BASE = rawApiUrl.endsWith("/api") ? rawApiUrl : `${rawApiUrl.replace(/\/+$/, "")}/api`;

type RequestOptions = RequestInit & {
  skipAuth?: boolean;
};

let accessToken: string | null = null;

export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^|;\\s*)" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[2]) : null;
}

let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null, refreshToken?: string | null) {
  accessToken = token;
  if (typeof window !== "undefined") {
    const isHttps = window.location.protocol === "https:";
    const secureFlag = isHttps ? "; Secure" : "";
    if (token && !token.includes("mock-token")) {
      document.cookie = `smartcampus_access_token=${token}; path=/; max-age=${15 * 60}; SameSite=Lax${secureFlag}`;
      if (refreshToken && !refreshToken.includes("mock-token")) {
        document.cookie = `refreshToken=${refreshToken}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax${secureFlag}`;
        localStorage.setItem("smartcampus_refresh_token", refreshToken);
      }
    } else {
      accessToken = null;
      document.cookie = `smartcampus_access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax${secureFlag}`;
      document.cookie = `refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax${secureFlag}`;
      localStorage.removeItem("smartcampus_refresh_token");
    }
  }
}

export function getAccessToken(): string | null {
  if (!accessToken && typeof window !== "undefined") {
    const fromCookie = getCookie("smartcampus_access_token");
    if (fromCookie && !fromCookie.includes("mock-token")) {
      accessToken = fromCookie;
    }
  }
  if (accessToken && accessToken.includes("mock-token")) {
    setAccessToken(null);
    return null;
  }
  return accessToken;
}

/**
 * Refreshes the short-lived access token using the backend's HttpOnly refresh cookie.
 * Coalesces concurrent calls into a single in-flight request to prevent refresh storms.
 */
export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const storedRefreshToken =
        (typeof window !== "undefined"
          ? localStorage.getItem("smartcampus_refresh_token")
          : null) || getCookie("refreshToken");

      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken: storedRefreshToken }),
        credentials: "include",
      });

      if (!res.ok) {
        setAccessToken(null);
        return null;
      }

      const json = await res.json();
      if (json.success && json.data?.tokens?.accessToken) {
        const newAccess = json.data.tokens.accessToken;
        const newRefresh = json.data.tokens.refreshToken || storedRefreshToken;
        setAccessToken(newAccess, newRefresh);
        return newAccess;
      }
      setAccessToken(null);
      return null;
    } catch {
      setAccessToken(null);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestOptions = {},
  isRetry = false,
): Promise<{ success: boolean; data?: T; error?: string; status?: number }> {
  const { skipAuth = false, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string>),
  };

  const token = getAccessToken();
  if (!skipAuth && token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, {
      ...fetchOptions,
      headers,
      credentials: "include",
    });
  } catch (netErr: any) {
    return {
      success: false,
      error: netErr?.message || "Network connection error",
      status: 0,
    };
  }

  const isAuthEndpoint =
    endpoint.includes("/auth/login") ||
    endpoint.includes("/auth/register") ||
    endpoint.includes("/auth/forgot-password") ||
    endpoint.includes("/auth/refresh");

  // If 401 and not an auth endpoint and not yet retried, refresh token once
  if (res.status === 401 && !isAuthEndpoint && !skipAuth && !isRetry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return apiRequest<T>(endpoint, options, true);
    } else {
      setAccessToken(null);
      return { success: false, error: "Session expired", status: 401 };
    }
  } else if (res.status === 401 && !isAuthEndpoint && isRetry) {
    setAccessToken(null);
    return { success: false, error: "Authentication failed", status: 401 };
  }

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (json && typeof json === "object" && "success" in json) {
    return { ...json, status: res.status };
  }

  if (res.ok) {
    return { success: true, data: json as T, status: res.status };
  }

  return {
    success: false,
    error: json?.message || json?.error || "Request failed",
    status: res.status,
  };
}

/* ─── Typed API helpers ─────────────────────────────────────────── */
export const api = {
  get: <T>(endpoint: string) => apiRequest<T>(endpoint),
  post: <T>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(endpoint: string) =>
    apiRequest<T>(endpoint, { method: "DELETE" }),
};
