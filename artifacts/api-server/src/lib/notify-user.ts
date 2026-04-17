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

function whatsappToAddress(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return null;
  return `whatsapp:+${digits}`;
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

async function sendTwilioWhatsApp(to: string, body: string): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_WHATSAPP_FROM?.trim();
  if (!sid || !token || !from) return;
  const toAddr = whatsappToAddress(to);
  if (!toAddr) return;
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const params = new URLSearchParams({ From: from, To: toAddr, Body: body });
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

/** Leaders of Team A and Team B (if accepted), for match reminders */
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

  await Promise.allSettled([
    email
      ? sendResendEmail(email, payload.title, `<p><strong>${payload.title}</strong></p><p>${payload.message}</p><p><a href="${link}">Open match</a></p>`).catch((e) =>
          logger.warn({ err: e, userId }, "notify email failed"),
        )
      : Promise.resolve(),
    waRaw
      ? sendTwilioWhatsApp(waRaw, `${payload.title}\n\n${payload.message}\n\n${link}`).catch((e) =>
          logger.warn({ err: e, userId }, "notify whatsapp failed"),
        )
      : Promise.resolve(),
    sendWebPushToUser(userId, payload.title, payload.message, link).catch((e) =>
      logger.warn({ err: e, userId }, "notify web push failed"),
    ),
  ]);
}
