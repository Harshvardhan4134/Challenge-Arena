import { Router } from "express";
import crypto from "crypto";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { byCreatedDesc, collections, nowIso, type NotificationDoc, type PushSubscriptionDoc } from "../lib/firestore-db";
import { getVapidPublicKey } from "../lib/notify-user";

const router = Router();

router.get("/push/vapid-public-key", (_req, res) => {
  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    return res.status(503).json({ error: "unavailable", message: "Web push is not configured on this server" });
  }
  return res.status(200).json({ publicKey });
});

router.post("/push/subscribe", requireAuth, async (req: AuthRequest, res) => {
  const sub = req.body?.subscription as { endpoint?: string; keys?: { p256dh?: string; auth?: string } } | undefined;
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return res.status(400).json({ error: "validation", message: "Invalid push subscription payload" });
  }
  const userId = req.userId!;
  const id = crypto.randomUUID();
  const doc: PushSubscriptionDoc = {
    id,
    userId,
    endpoint: sub.endpoint,
    keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    createdAt: nowIso(),
  };
  await collections.pushSubscriptions.doc(id).set(doc);
  return res.status(201).json({ success: true, id });
});

router.get("/", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const snap = await collections.notifications.where("userId", "==", userId).get();
  const notifications = snap.docs.map((d) => d.data() as NotificationDoc).sort(byCreatedDesc).slice(0, 50);
  return res.status(200).json(notifications);
});

router.post("/:notificationId/read", requireAuth, async (req: AuthRequest, res) => {
  const { notificationId } = req.params;
  await collections.notifications.doc(notificationId).set({ isRead: true }, { merge: true });
  return res.status(200).json({ success: true, message: "Marked as read" });
});

router.post("/read-all", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const snap = await collections.notifications.where("userId", "==", userId).where("isRead", "==", false).get();
  await Promise.all(snap.docs.map((doc) => doc.ref.set({ isRead: true }, { merge: true })));
  return res.status(200).json({ success: true, message: "All marked as read" });
});

export default router;
