const rawUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";
const cleanUrl = rawUrl.replace(/\/+$/, "");

export const API_BASE_URL = cleanUrl.endsWith("/api/v1") 
  ? cleanUrl 
  : `${cleanUrl}/api/v1`;

// Safe JWT payload parser in browser
export function parseJwt(token: string | null): any {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

// Check if token is expired
export function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  const payload = parseJwt(token);
  if (!payload || !payload.exp) return true;
  const nowInSeconds = Math.floor(Date.now() / 1000);
  return payload.exp <= nowInSeconds;
}

// Check if token is expiring within specified minutes (default 7 days)
export function isTokenExpiringSoon(token: string | null, withinMinutes: number = 60 * 24 * 7): boolean {
  if (!token) return true;
  const payload = parseJwt(token);
  if (!payload || !payload.exp) return true;
  const nowInSeconds = Math.floor(Date.now() / 1000);
  return (payload.exp - nowInSeconds) < (withinMinutes * 60);
}

// Single-flight refresh token promise to prevent duplicate requests
let refreshPromise: Promise<string | null> | null = null;

export async function refreshToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  const existingToken = localStorage.getItem("token");
  if (!existingToken) {
    return null;
  }

  refreshPromise = (async () => {
    try {
      const res = await window.fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${existingToken}`,
        },
        body: JSON.stringify({ token: existingToken }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && data.data?.token) {
        const newToken = data.data.token;
        localStorage.setItem("token", newToken);
        if (data.data.user) {
          localStorage.setItem("user", JSON.stringify(data.data.user));
        }
        if (data.data.shop) {
          localStorage.setItem("shop", JSON.stringify(data.data.shop));
        }
        return newToken;
      }

      // If refresh explicitly failed with 401/403, session is unrecoverable
      if (res.status === 401 || res.status === 403) {
        handleSessionExpired();
      }
      return null;
    } catch (err) {
      console.warn("Background token refresh error:", err);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export function handleSessionExpired() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("shop");

  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/auth/")) {
    window.location.href = "/auth/login?expired=true";
  }
}

export function getAuthHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...customHeaders,
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

// Resilient authFetch wrapper
export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  let token = localStorage.getItem("token");

  // If token is expired or expiring within 24 hours, attempt refresh first
  if (token && (isTokenExpired(token) || isTokenExpiringSoon(token, 24 * 60))) {
    const refreshed = await refreshToken();
    if (refreshed) {
      token = refreshed;
    }
  }

  // Set Authorization header if available
  const headers = new Headers(init.headers || {});
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const newInit: RequestInit = {
    ...init,
    headers,
  };

  const response = await window.fetch(input, newInit);

  // Sliding session: check if backend returned a refreshed token in headers
  const renewedToken = response.headers.get("x-refreshed-token");
  if (renewedToken) {
    localStorage.setItem("token", renewedToken);
  }

  // Handle 401 Unauthorized
  if (response.status === 401) {
    // Clone response to inspect message
    const clone = response.clone();
    const data = await clone.json().catch(() => ({}));
    const message = (data?.message || "").toLowerCase();

    // If it's a token expiration or unauthorized issue, try one refresh & retry
    if (message.includes("token") || message.includes("expired") || message.includes("unauthorized") || message.includes("invalid")) {
      const refreshedToken = await refreshToken();
      if (refreshedToken) {
        // Retry the original request with the new token
        const retryHeaders = new Headers(init.headers || {});
        retryHeaders.set("Authorization", `Bearer ${refreshedToken}`);
        return window.fetch(input, {
          ...init,
          headers: retryHeaders,
        });
      } else {
        handleSessionExpired();
      }
    }
  }

  return response;
}

// Global window.fetch interceptor for transparent session resilience across the entire app
if (typeof window !== "undefined" && !(window as any).__AGROFLOW_FETCH_PATCHED__) {
  (window as any).__AGROFLOW_FETCH_PATCHED__ = true;
  const originalFetch = window.fetch;

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const urlString = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;
    
    // Only intercept requests directed to our backend API endpoints
    const isApiRequest = urlString.includes("/api/v1") || urlString.includes(API_BASE_URL);
    const isRefreshCall = urlString.includes("/auth/refresh");

    if (isApiRequest && !isRefreshCall) {
      return authFetch(input, init);
    }
    return originalFetch(input, init);
  };
}
