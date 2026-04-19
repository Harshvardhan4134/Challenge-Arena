import crypto from "crypto";
import webpush from "web-push";
import { collections, nowIso, type ChallengeDoc, type NotificationDoc, type TeamDoc, type UserDoc } from "./firestore-db";
import { logger } from "./logger";

let vapidReady = false;

function ensureVapid(): boolean {
  if (vapidReady) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:support@lendlly.in";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidReady = true;
  return true;
}

export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY?.trim() || null;
}

function appOrigin(): string {
  return (process.env.APP_ORIGIN || "https://challenge-arena-server.vercel.app").replace(/\/+$/, "");
}

function deepLink(challengeId: string | null): string {
  const base = appOrigin();
  return challengeId ? `${base}/challenges/${challengeId}` : base;
}

/** E.164 digits only (no +). Twilio WhatsApp expects whatsapp:+<digits>. */
function digitsForWhatsApp(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return null;
  return digits;
}

/** Recipient / From address for Twilio Messages API (whatsapp:+E164). */
function whatsappToAddress(input: string): string | null {
  const digits = digitsForWhatsApp(input);
  if (!digits) return null;
  return `whatsapp:+${digits}`;
}

/**
 * Normalize TWILIO_WHATSAPP_FROM: accept "whatsapp:+1...", "+1...", or "1...".
 */
function normalizeTwilioFrom(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  if (s.toLowerCase().startsWith("whatsapp:")) {
    const rest = s.slice("whatsapp:".length).trim();
    const d = digitsForWhatsApp(rest.startsWith("+") ? rest : `+${rest}`);
    return d ? `whatsapp:+${d}` : null;
  }
  const d = digitsForWhatsApp(s);
  return d ? `whatsapp:+${d}` : null;
}

export function twilioWhatsAppConfigured(): boolean {
  const sid = process.env["TWILIO_ACCOUNT_SID"]?.trim();
  const token = process.env["TWILIO_AUTH_TOKEN"]?.trim();
  const messagingServiceSid = process.env["TWILIO_MESSAGING_SERVICE_SID"]?.trim();
  const fromRaw = process.env["TWILIO_WHATSAPP_FROM"]?.trim();
  const fromNorm = fromRaw ? normalizeTwilioFrom(fromRaw) : null;
  return Boolean(sid && token && (messagingServiceSid || fromNorm));
}

function twilioSendErrorHint(err: unknown): string | undefined {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("63016") || msg.includes("63007") || msg.toLowerCase().includes("not opted in")) {
    return "Sandbox: recipient must join your Twilio sandbox from WhatsApp (send the join code to the sandbox number).";
  }
  if (msg.includes("21608") || msg.includes("21211") || msg.toLowerCase().includes("from")) {
    return "Check TWILIO_WHATSAPP_FROM (sandbox: whatsapp:+14155238886).";
  }
  if (msg.includes("63049") || msg.toLowerCase().includes("template")) {
    return "Meta may require an approved WhatsApp template outside the 24h customer-care window.";
  }
  return undefined;
}

/** Safe status for admin UI / debugging (no secrets). */
export function getTwilioWhatsAppDiagnostics(): {
  twilioWhatsAppConfigured: boolean;
  hasTwilioAccountSid: boolean;
  hasTwilioAuthToken: boolean;
  hasTwilioWhatsAppFrom: boolean;
  hasTwilioMessagingServiceSid: boolean;
  twilioFromNumberSuffix: string | null;
  appOriginUsedInLinks: string;
  checklist: string[];
} {
  const hasSid = Boolean(process.env["TWILIO_ACCOUNT_SID"]?.trim());
  const hasToken = Boolean(process.env["TWILIO_AUTH_TOKEN"]?.trim());
  const fromRaw = process.env["TWILIO_WHATSAPP_FROM"]?.trim();
  const fromNorm = fromRaw ? normalizeTwilioFrom(fromRaw) : null;
  const hasMs = Boolean(process.env["TWILIO_MESSAGING_SERVICE_SID"]?.trim());
  const configured = Boolean(hasSid && hasToken && (hasMs || fromNorm));
  const suffix = fromNorm ? fromNorm.replace(/\D/g, "").slice(-4) : null;

  const checklist: string[] = [
    "Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM on the API server (e.g. Render) — not on the Vercel frontend.",
    "Sandbox From is usually whatsapp:+14155238886. Each recipient must text the join code to that number first.",
    "Every player needs a WhatsApp number on Profile (country code + national number, e.g. 91…).",
  ];
  if (!configured) {
    checklist.unshift("Twilio WhatsApp is not fully configured; outbound WA will be skipped.");
  }

  return {
    twilioWhatsAppConfigured: configured,
    hasTwilioAccountSid: hasSid,
    hasTwilioAuthToken: hasToken,
    hasTwilioWhatsAppFrom: Boolean(fromRaw),
    hasTwilioMessagingServiceSid: hasMs,
    twilioFromNumberSuffix: suffix,
    appOriginUsedInLinks: appOrigin(),
    checklist,
  };
}

async function sendResendEmail(to: string, subject: string, html: string): Promise<void> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return;
  const from = process.env.EMAIL_FROM?.trim() || "Challenge Arena <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${text}`);
  }
}

/** Twilio WhatsApp “bot” style: short header + link on its own line (works in sandbox + business API). */
function formatWhatsAppBotMessage(title: string, message: string, link: string): string {
  const t = title.trim();
  const m = message.trim();
  return `*Challenge Arena*\n_${t}_\n\n${m}\n\n${link}`;
}

let loggedTwilioMissingConfig = false;

async function sendTwilioWhatsApp(to: string, body: string): Promise<void> {
  const sid = process.env["TWILIO_ACCOUNT_SID"]?.trim();
  const token = process.env["TWILIO_AUTH_TOKEN"]?.trim();
  const messagingServiceSid = process.env["TWILIO_MESSAGING_SERVICE_SID"]?.trim();
  const fromRaw = process.env["TWILIO_WHATSAPP_FROM"]?.trim();
  const fromNorm = fromRaw ? normalizeTwilioFrom(fromRaw) : null;

  if (!sid || !token || (!messagingServiceSid && !fromNorm)) {
    if (!loggedTwilioMissingConfig) {
      loggedTwilioMissingConfig = true;
      logger.warn(
        "Twilio WhatsApp skipped: set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and either TWILIO_WHATSAPP_FROM (whatsapp:+… or +…) or TWILIO_MESSAGING_SERVICE_SID",
      );
    }
    return;
  }

  const toAddr = whatsappToAddress(to);
  if (!toAddr) {
    logger.warn({ toLen: to?.length ?? 0 }, "Twilio WhatsApp skipped: recipient number has invalid length or format (use country code,10–15 digits)");
    return;
  }

  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const params = new URLSearchParams();
  params.set("To", toAddr);
  params.set("Body", body);
  if (messagingServiceSid) {
    params.set("MessagingServiceSid", messagingServiceSid);
  } else if (fromNorm) {
    params.set("From", fromNorm);
  }

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Twilio ${res.status}: ${text}`);
  }
}

async function sendWebPushToUser(userId: string, title: string, body: string, url: string): Promise<void> {
  if (!ensureVapid()) return;
  const snap = await collections.pushSubscriptions.where("userId", "==", userId).get();
  const payload = JSON.stringify({ title, body, url });
  await Promise.allSettled(
    snap.docs.map(async (doc) => {
      const sub = doc.data() as { endpoint: string; keys: { p256dh: string; auth: string } };
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          payload,
          { TTL: 3600 },
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 410 || status === 404) {
          await doc.ref.delete().catch(() => {});
        }
      }
    }),
  );
}

/** In-app + web push only (no email/WhatsApp) — for broadcasts that would spam external channels. */
export async function createInAppNotificationOnly(
  userId: string,
  payload: { type: string; title: string; message: string; challengeId: string | null },
): Promise<void> {
  const notif: NotificationDoc = {
    id: crypto.randomUUID(),
    userId,
    type: payload.type,
    title: payload.title,
    message: payload.message,
    challengeId: payload.challengeId,
    isRead: false,
    createdAt: nowIso(),
  };
  await collections.notifications.doc(notif.id).set(notif);
  const link = deepLink(payload.challengeId);
  await sendWebPushToUser(userId, payload.title, payload.message, link).catch((e) =>
    logger.warn({ err: e, userId }, "in-app notify web push failed"),
  );
}

/**
 * In-app ALERTS for other players when a host opens a lobby (Firestore notification + optional web push).
 * Skips the creator. Cap with IN_APP_LOBBY_BROADCAST_MAX (default 150). Disable with IN_APP_LOBBY_BROADCAST=false.
 */
export async function broadcastNewChallengeLobbyInApp(params: {
  challengeId: string;
  title: string;
  mode: string;
  scheduledAt: string;
  creatorUserId: string;
}): Promise<void> {
  if (process.env["IN_APP_LOBBY_BROADCAST"] === "false") return;
  const maxCap = 500;
  const max = Math.min(
    maxCap,
    Math.max(1, parseInt(process.env["IN_APP_LOBBY_BROADCAST_MAX"] ?? "150", 10) || 150),
  );

  const snap = await collections.users.get();
  const recipientIds: string[] = [];
  for (const d of snap.docs) {
    const u = d.data() as UserDoc;
    if (u.id === params.creatorUserId) continue;
    recipientIds.push(u.id);
    if (recipientIds.length >= max) break;
  }

  const when = new Date(params.scheduledAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  const title = "New match in lobby";
  const message = `${params.title} (${params.mode}) · ${when}. Tap to view or join.`;

  const chunk = 15;
  for (let i = 0; i < recipientIds.length; i += chunk) {
    const part = recipientIds.slice(i, i + chunk);
    await Promise.allSettled(
      part.map((uid) =>
        createInAppNotificationOnly(uid, {
          type: "new_lobby_match",
          title,
          message,
          challengeId: params.challengeId,
        }),
      ),
    );
  }
}

/**
 * WhatsApp-only blast when a host opens a new lobby challenge (optional; Twilio required).
 * Skips the creator. Cap with WHATSAPP_LOBBY_BROADCAST_MAX (default 150). Disable with WHATSAPP_LOBBY_BROADCAST=false.
 */
export async function broadcastNewChallengeLobbyWhatsApp(params: {
  challengeId: string;
  title: string;
  mode: string;
  scheduledAt: string;
  creatorUserId: string;
}): Promise<void> {
  if (process.env["WHATSAPP_LOBBY_BROADCAST"] === "false") return;
  if (!twilioWhatsAppConfigured()) return;

  const maxCap = 500;
  const max = Math.min(
    maxCap,
    Math.max(1, parseInt(process.env["WHATSAPP_LOBBY_BROADCAST_MAX"] ?? "150", 10) || 150),
  );

  const snap = await collections.users.get();
  const phones: string[] = [];
  for (const d of snap.docs) {
    const u = d.data() as UserDoc;
    if (u.id === params.creatorUserId) continue;
    const raw = (u.whatsappPhone ?? "").trim();
    if (!raw) continue;
    phones.push(raw);
    if (phones.length >= max * 2) break;
  }

  const uniquePhones = [...new Set(phones)].slice(0, max);
  const when = new Date(params.scheduledAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  const link = deepLink(params.challengeId);
  const bodyText =
    `${params.title} (${params.mode})\nWhen: ${when}\nOpen the app to view or join this lobby.`;
  const waBody = formatWhatsAppBotMessage("New match in lobby", bodyText, link);

  const chunk = 10;
  for (let i = 0; i < uniquePhones.length; i += chunk) {
    const part = uniquePhones.slice(i, i + chunk);
    const settled = await Promise.allSettled(part.map((phone) => sendTwilioWhatsApp(phone, waBody)));
    for (const r of settled) {
      if (r.status === "rejected") {
        logger.warn({ err: r.reason }, "lobby WhatsApp broadcast message failed");
      }
    }
  }
}

/** Leaders of Team A and Team B (if accepted), for match reminders. */
export async function getChallengeLeaderUserIds(challenge: ChallengeDoc): Promise<string[]> {
  const ids: string[] = [];
  const teamADoc = await collections.teams.doc(challenge.teamAId).get();
  const teamA = teamADoc.exists ? (teamADoc.data() as TeamDoc) : null;
  if (teamA?.leaderId) ids.push(teamA.leaderId);
  if (challenge.teamBId) {
    const teamBDoc = await collections.teams.doc(challenge.teamBId).get();
    const teamB = teamBDoc.exists ? (teamBDoc.data() as TeamDoc) : null;
    if (teamB?.leaderId) ids.push(teamB.leaderId);
  }
  return [...new Set(ids)];
}

export async function notifyUser(
  userId: string,
  payload: { type: string; title: string; message: string; challengeId: string | null },
): Promise<void> {
  const notif: NotificationDoc = {
    id: crypto.randomUUID(),
    userId,
    type: payload.type,
    title: payload.title,
    message: payload.message,
    challengeId: payload.challengeId,
    isRead: false,
    createdAt: nowIso(),
  };
  await collections.notifications.doc(notif.id).set(notif);

  const userDoc = await collections.users.doc(userId).get();
  if (!userDoc.exists) return;
  const user = userDoc.data() as UserDoc;
  const link = deepLink(payload.challengeId);
  const email = user.email?.trim();
  const waRaw = (user.whatsappPhone ?? "").trim();

  if (twilioWhatsAppConfigured() && !waRaw) {
    logger.warn(
      { userId, notificationType: payload.type },
      "WhatsApp skipped: user has no whatsappPhone on profile (in-app notification was still created)",
    );
  }

  await Promise.allSettled([
    email
      ? sendResendEmail(email, payload.title, `<p><strong>${payload.title}</strong></p><p>${payload.message}</p><p><a href="${link}">Open match</a></p>`).catch((e) =>
          logger.warn({ err: e, userId }, "notify email failed"),
        )
      : Promise.resolve(),
    waRaw
      ? sendTwilioWhatsApp(
          waRaw,
          formatWhatsAppBotMessage(payload.title, payload.message, link),
        ).catch((e) =>
          logger.warn(
            { err: e, userId, notificationType: payload.type, hint: twilioSendErrorHint(e) },
            "notify whatsapp failed",
          ),
        )
      : Promise.resolve(),
    sendWebPushToUser(userId, payload.title, payload.message, link).catch((e) =>
      logger.warn({ err: e, userId }, "notify web push failed"),
    ),
  ]);
}
