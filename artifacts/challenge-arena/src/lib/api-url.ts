/**
 * Absolute backend origin for production (Vercel has no /api — set VITE_API_BASE_URL).
 * Empty string keeps same-origin /api (local dev with Vite proxy).
 */
export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL;
  if (raw == null || String(raw).trim() === "") return "";
  return String(raw).trim().replace(/\/+$/, "");
}

export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  const base = getApiBaseUrl();
  return base ? `${base}${p}` : p;
}
