import type { Request } from "express";

/**
 * Absolute base URL for this API (for URLs returned to clients, e.g. proof images).
 */
export function publicApiBaseUrl(req: Request): string {
  const fromEnv =
    process.env["API_PUBLIC_URL"]?.replace(/\/$/, "") ||
    process.env["RENDER_EXTERNAL_URL"]?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  const host = req.get("x-forwarded-host") || req.get("host") || "localhost";
  const proto = req.get("x-forwarded-proto") || req.protocol || "http";
  return `${proto}://${host}`;
}
