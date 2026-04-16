import { Router } from "express";
import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const notifications = await db.select().from(notificationsTable)
    .where(eq(notificationsTable.userId, userId))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(50);

  return res.status(200).json(notifications.map(n => ({ ...n, createdAt: n.createdAt.toISOString() })));
});

router.post("/:notificationId/read", requireAuth, async (req: AuthRequest, res) => {
  const { notificationId } = req.params;
  await db.update(notificationsTable)
    .set({ isRead: true })
    .where(eq(notificationsTable.id, notificationId));
  return res.status(200).json({ success: true, message: "Marked as read" });
});

router.post("/read-all", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  await db.update(notificationsTable)
    .set({ isRead: true })
    .where(eq(notificationsTable.userId, userId));
  return res.status(200).json({ success: true, message: "All marked as read" });
});

export default router;
