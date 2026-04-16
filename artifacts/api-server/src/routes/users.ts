import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, playerStatsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpdateUserBody } from "@workspace/api-zod";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

router.get("/:userId", async (req, res) => {
  const { userId } = req.params;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) return res.status(404).json({ error: "not_found", message: "User not found" });

  const [stats] = await db.select().from(playerStatsTable).where(eq(playerStatsTable.userId, userId)).limit(1);
  const { passwordHash: _, ...safeUser } = user;
  return res.status(200).json({ ...safeUser, stats: stats || null });
});

router.put("/:userId/update", requireAuth, async (req: AuthRequest, res) => {
  const { userId } = req.params;
  if (req.userId !== userId) return res.status(403).json({ error: "forbidden", message: "Cannot update another user" });

  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "validation", message: parsed.error.message });

  const { freefireUid, ign, gender } = parsed.data;
  const updates: Record<string, unknown> = {};
  if (freefireUid !== undefined) updates.freefireUid = freefireUid;
  if (ign !== undefined) updates.ign = ign;
  if (gender !== undefined) updates.gender = gender;

  const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, userId)).returning();
  const [stats] = await db.select().from(playerStatsTable).where(eq(playerStatsTable.userId, userId)).limit(1);
  const { passwordHash: _, ...safeUser } = updated;
  return res.status(200).json({ ...safeUser, stats: stats || null });
});

export default router;
