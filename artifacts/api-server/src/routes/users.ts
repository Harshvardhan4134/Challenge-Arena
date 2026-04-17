import { Router } from "express";
import { UpdateUserBody } from "@workspace/api-zod";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { collections, type PlayerStatsDoc, type UserDoc } from "../lib/firestore-db";
import { normalizeWhatsappInput } from "../lib/whatsapp-util";

const router = Router();

router.get("/:userId", async (req, res) => {
  const { userId } = req.params;
  const userDoc = await collections.users.doc(userId).get();
  if (!userDoc.exists) return res.status(404).json({ error: "not_found", message: "User not found" });
  const user = userDoc.data() as UserDoc;

  const statsDoc = await collections.playerStats.doc(userId).get();
  const stats = statsDoc.exists ? (statsDoc.data() as PlayerStatsDoc) : null;
  const { passwordHash: _, ...safeUser } = user;
  return res.status(200).json({ ...safeUser, stats: stats || null });
});

router.put("/:userId/update", requireAuth, async (req: AuthRequest, res) => {
  const { userId } = req.params;
  if (req.userId !== userId) return res.status(403).json({ error: "forbidden", message: "Cannot update another user" });

  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "validation", message: parsed.error.message });

  const { freefireUid, ign, gender, whatsappPhone, email } = parsed.data;
  const updates: Record<string, unknown> = {};
  if (freefireUid !== undefined) {
    const uidSnap = await collections.users.where("freefireUid", "==", freefireUid).limit(1).get();
    if (!uidSnap.empty) {
      const conflictUser = uidSnap.docs[0].data() as UserDoc;
      if (conflictUser.id !== userId) {
        return res.status(400).json({ error: "conflict", message: "Free Fire UID is already registered" });
      }
    }
    updates.freefireUid = freefireUid;
  }
  if (ign !== undefined) updates.ign = ign;
  if (gender !== undefined) updates.gender = gender;
  if (whatsappPhone !== undefined) {
    updates.whatsappPhone = normalizeWhatsappInput(whatsappPhone);
  }
  if (email !== undefined) {
    const e = email?.trim();
    updates.email = e ? e : null;
  }

  await collections.users.doc(userId).set(updates, { merge: true });
  const updatedDoc = await collections.users.doc(userId).get();
  if (!updatedDoc.exists) return res.status(404).json({ error: "not_found", message: "User not found" });
  const updated = updatedDoc.data() as UserDoc;
  const statsDoc = await collections.playerStats.doc(userId).get();
  const stats = statsDoc.exists ? (statsDoc.data() as PlayerStatsDoc) : null;
  const { passwordHash: _, ...safeUser } = updated;
  return res.status(200).json({ ...safeUser, stats: stats || null });
});

export default router;
