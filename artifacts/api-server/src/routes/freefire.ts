import { Router } from "express";

const router = Router();
const LOOKUP_TIMEOUT_MS = Number(process.env["FREEFIRE_LOOKUP_TIMEOUT_MS"] ?? 8000);
const LOOKUP_CACHE_TTL_MS = Number(process.env["FREEFIRE_LOOKUP_CACHE_TTL_MS"] ?? 5 * 60 * 1000);

const lookupCache = new Map<string, { expiresAt: number; value: LookupResult }>();

type LookupResult = {
  ign: string | null;
  level: number | null;
  raw: unknown;
  provider: string;
};

function extractIgn(raw: any): string | null {
  return (
    raw?.basicInfo?.nickname ??
    raw?.basicinfo?.nickname ??
    raw?.data?.basicInfo?.nickname ??
    raw?.nickname ??
    raw?.player?.nickname ??
    raw?.AccountInfo?.AccountName ??
    raw?.name ??
    null
  );
}

function extractLevel(raw: any): number | null {
  const value =
    raw?.basicInfo?.level ??
    raw?.basicinfo?.level ??
    raw?.data?.basicInfo?.level ??
    raw?.player?.level ??
    raw?.AccountInfo?.AccountLevel ??
    null;

  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getCachedResult(uid: string, region: string): LookupResult | null {
  const key = `${region}:${uid}`;
  const entry = lookupCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    lookupCache.delete(key);
    return null;
  }
  return entry.value;
}

function setCachedResult(uid: string, region: string, value: LookupResult) {
  lookupCache.set(`${region}:${uid}`, { value, expiresAt: Date.now() + LOOKUP_CACHE_TTL_MS });
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = LOOKUP_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 2): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 250 * (i + 1)));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Lookup failed after retries");
}

async function fetchFromFreeFireCommunity(uid: string, region: string): Promise<LookupResult> {
  const apiKey = process.env["FREEFIRE_LOOKUP_API_KEY"];
  if (!apiKey) {
    throw new Error("FREEFIRE_LOOKUP_API_KEY is not set");
  }

  const base = process.env["FREEFIRE_LOOKUP_BASE_URL"] ?? "https://developers.freefirecommunity.com";
  const url = `${base.replace(/\/+$/, "")}/api/v1/info?uid=${encodeURIComponent(uid)}&region=${encodeURIComponent(region)}`;

  const res = await fetchWithTimeout(url, {
    headers: { "x-api-key": apiKey, accept: "application/json" },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Lookup API failed (${res.status}): ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  return { ign: extractIgn(data), level: extractLevel(data), raw: data, provider: "freefirecommunity" };
}

async function fetchFromPublicRepoProvider(uid: string, region: string): Promise<LookupResult> {
  // Public mirrors can be swapped without code changes.
  const configuredMirrors = String(process.env["FREEFIRE_LOOKUP_PUBLIC_MIRRORS"] ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  const defaultMirror = process.env["FREEFIRE_LOOKUP_PUBLIC_BASE_URL"] ?? "https://freefireinfo-zy9l.onrender.com";
  const mirrors = [...configuredMirrors, defaultMirror];

  let lastError: Error | null = null;
  for (const mirror of mirrors) {
    const base = mirror.replace(/\/+$/, "");
    const candidates = [
      `${base}/api/v1/account?uid=${encodeURIComponent(uid)}&region=${encodeURIComponent(region)}`,
      `${base}/api/v1/player-profile?uid=${encodeURIComponent(uid)}&server=${encodeURIComponent(region)}`,
      `${base}/info?uid=${encodeURIComponent(uid)}`,
    ];

    for (const url of candidates) {
      try {
        const res = await fetchWithTimeout(url, { headers: { accept: "application/json" } });
        if (!res.ok) {
          const text = await res.text();
          lastError = new Error(`Public provider failed (${res.status}) from ${url}: ${text.slice(0, 200)}`);
          continue;
        }
        const data = await res.json();
        return { ign: extractIgn(data), level: extractLevel(data), raw: data, provider: `public-mirror:${url}` };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }
  }
  throw lastError ?? new Error("No public provider configured");
}

router.get("/profile", async (req, res) => {
  const uid = String(req.query["uid"] ?? "").trim();
  const region = String(req.query["region"] ?? process.env["FREEFIRE_LOOKUP_REGION"] ?? "IND").trim();

  if (!uid) {
    return res.status(400).json({ error: "validation", message: "uid is required" });
  }

  const cached = getCachedResult(uid, region);
  if (cached?.ign) {
    return res.status(200).json({ uid, region, ign: cached.ign, level: cached.level, provider: `${cached.provider} (cache)` });
  }

  // Best default for MVP: free repo endpoint first, paid provider second, legacy fallback third.
  try {
    const result = await withRetry(() => fetchFromPublicRepoProvider(uid, region));
    if (!result.ign) {
      return res.status(404).json({ error: "not_found", message: "No player name found for this UID", providerResponse: result.raw });
    }
    setCachedResult(uid, region, result);
    return res.status(200).json({ uid, region, ign: result.ign, level: result.level, provider: result.provider });
  } catch (error) {
    // Fallback chain: paid/community API key provider.
    try {
      if (process.env["FREEFIRE_LOOKUP_API_KEY"]) {
        const paidFallback = await withRetry(() => fetchFromFreeFireCommunity(uid, region));
        if (paidFallback.ign) {
          setCachedResult(uid, region, paidFallback);
          return res.status(200).json({ uid, region, ign: paidFallback.ign, level: paidFallback.level, provider: paidFallback.provider });
        }
      }
    } catch {
      // continue to second fallback
    }

    // Legacy public fallback used by some older repos.
    try {
      const legacyUrl = `https://info-ob49.vercel.app/api/account/?uid=${encodeURIComponent(uid)}&region=${encodeURIComponent(region)}`;
      const legacyRes = await fetchWithTimeout(legacyUrl, { headers: { accept: "application/json" } });
      if (legacyRes.ok) {
        const legacyData = await legacyRes.json();
        const ign = extractIgn(legacyData);
        if (ign) {
          const level = extractLevel(legacyData);
          setCachedResult(uid, region, { ign, level, raw: legacyData, provider: "legacy-public-provider" });
          return res.status(200).json({ uid, region, ign, level, provider: "legacy-public-provider" });
        }
      }
    } catch {
      // continue to final error response
    }

    return res.status(502).json({
      error: "lookup_failed",
      message: error instanceof Error ? error.message : "Failed to fetch profile",
    });
  }
});

export default router;
