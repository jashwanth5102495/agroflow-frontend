const rawUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";
const cleanUrl = rawUrl.replace(/\/+$/, "");

export const API_BASE_URL = cleanUrl.endsWith("/api/v1") 
  ? cleanUrl 
  : `${cleanUrl}/api/v1`;
