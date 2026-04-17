import { Router } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { byCreatedDesc, collections, type NotificationDoc } from "../lib/firestore-db";

const router = Router();

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
