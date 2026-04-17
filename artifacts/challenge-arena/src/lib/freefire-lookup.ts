import { apiUrl } from "@/lib/api-url";

type ProfileBody = { ign?: string; message?: string; hint?: string };

export function formatFreeFireLookupFailureMessage(body: ProfileBody | null, fallback: string): string {
  const parts = [body?.message, body?.hint].filter((x): x is string => Boolean(x && String(x).trim()));
  return parts.length ? parts.join(" ") : fallback;
}

export async function fetchIgnForUid(uid: string, region: string): Promise<string> {
  const res = await fetch(
    apiUrl(`/api/freefire/profile?uid=${encodeURIComponent(uid)}&region=${encodeURIComponent(region)}`),
  );
  const rawText = await res.text();
  let body: ProfileBody | null = null;
  try {
    body = rawText ? JSON.parse(rawText) : null;
  } catch {
    body = null;
  }
  if (!res.ok || !body?.ign) {
    throw new Error(formatFreeFireLookupFailureMessage(body, "Could not fetch player name. Enter manually for now."));
  }
  return String(body.ign);
}
