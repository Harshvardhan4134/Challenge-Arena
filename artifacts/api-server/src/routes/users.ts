import { Router } from "express";
import { UpdateUserBody } from "@workspace/api-zod";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { collections, type PlayerStatsDoc, type UserDoc } from "../lib/firestore-db";
import { normalizeWhatsappInput } from "../lib/whatsapp-util";
import { toSafeUser } from "../lib/user-view";

const router = Router();

function userIdFromReq(req: { params: Record<string, string | string[] | undefined> }): string | undefined {
  const raw = req.params["userId"];
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw) && typeof raw[0] === "string") return raw[0];
  return undefined;
}

router.get("/:userId", async (req, res) => {
  const userId = userIdFromReq(req);
  if (!userId) return res.status(400).json({ error: "bad_request", message: "Missing user id" });
  const userDoc = await collections.users.doc(userId).get();
  if (!userDoc.exists) return res.status(404).json({ error: "not_found", message: "User not found" });
  const user = userDoc.data() as UserDoc;

  const statsDoc = await collections.playerStats.doc(userId).get();
  const stats = statsDoc.exists ? (statsDoc.data() as PlayerStatsDoc) : null;
  return res.status(200).json({ ...toSafeUser(user), stats: stats || null });
});

router.put("/:userId/update", requireAuth, async (req: AuthRequest, res) => {
  const userId = userIdFromReq(req);
  if (!userId) return res.status(400).json({ error: "bad_request", message: "Missing user id" });
  if (req.userId !== userId) return res.status(403).json({ error: "forbidden", message: "Cannot update another user" });

  const existingSnap = await collections.users.doc(userId).get();
  if (!existingSnap.exists) return res.status(404).json({ error: "not_found", message: "User not found" });
  const existingUser = existingSnap.data() as UserDoc;

  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "validation", message: parsed.error.message });

  const { freefireUid, ign, gender, whatsappPhone, email } = parsed.data;
  const updates: Record<string, unknown> = {};

  const legacyWhatsapp = (existingUser as unknown as { whatsapp?: string | null }).whatsapp;
  let effectiveWhatsapp = normalizeWhatsappInput(
    existingUser.whatsappPhone ?? legacyWhatsapp ?? undefined,
  );
  if (whatsappPhone !== undefined) {
    const n = normalizeWhatsappInput(whatsappPhone);
    if (!n) {
      return res.status(400).json({
        error: "validation",
        message: "Invalid WhatsApp number. Include country code with at least 10 digits.",
      });
    }
    effectiveWhatsapp = n;
  }
  if (!effectiveWhatsapp) {
    return res.status(400).json({
      error: "validation",
      message: "WhatsApp number is required on your profile.",
    });
  }

  // Always write canonical WhatsApp on profile update so Firestore reliably stores `whatsappPhone`
  // (merge + partial payloads alone have been flaky for some clients).
  updates.whatsappPhone = effectiveWhatsapp;

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
  return res.status(200).json({ ...toSafeUser(updated), stats: stats || null });
});

export default router;
