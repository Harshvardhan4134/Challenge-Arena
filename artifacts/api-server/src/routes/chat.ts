import { Router } from "express";
import { SendMessageBody } from "@workspace/api-zod";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { collections, nowIso, type ChallengeDoc, type MessageDoc, type TeamMemberDoc, type UserDoc } from "../lib/firestore-db";
import crypto from "crypto";

const router = Router({ mergeParams: true });

router.get("/:challengeId/messages", requireAuth, async (req: AuthRequest, res) => {
  const { challengeId } = req.params;
  const userId = req.userId!;
  const challengeDoc = await collections.challenges.doc(challengeId).get();
  if (!challengeDoc.exists) return res.status(404).json({ error: "not_found", message: "Challenge not found" });
  const challenge = challengeDoc.data() as ChallengeDoc;

  const teamIds = [challenge.teamAId, challenge.teamBId].filter(Boolean) as string[];
  const memberSnap = await collections.teamMembers.where("userId", "==", userId).get();
  const member = memberSnap.docs.map((d) => d.data() as TeamMemberDoc).find((m) => teamIds.includes(m.teamId));
  if (!member) {
    return res.status(403).json({ error: "forbidden", message: "Only challenge participants can view chat" });
  }

  const messages = (await collections.messages.where("challengeId", "==", challengeId).get()).docs
    .map((d) => d.data() as MessageDoc)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const result = await Promise.all(messages.map(async (m) => {
    const userDoc = await collections.users.doc(m.senderId).get();
    const user = userDoc.exists ? (userDoc.data() as UserDoc) : null;
    return { ...m, senderUsername: user?.username || "Unknown" };
  }));

  return res.status(200).json(result);
});

router.post("/:challengeId/messages", requireAuth, async (req: AuthRequest, res) => {
  const { challengeId } = req.params;
  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "validation", message: parsed.error.message });

  const userId = req.userId!;
  const challengeDoc = await collections.challenges.doc(challengeId).get();
  if (!challengeDoc.exists) return res.status(404).json({ error: "not_found", message: "Challenge not found" });
  const challenge = challengeDoc.data() as ChallengeDoc;

  const teamIds = [challenge.teamAId, challenge.teamBId].filter(Boolean) as string[];
  const memberSnap = await collections.teamMembers.where("userId", "==", userId).get();
  const member = memberSnap.docs.map((d) => d.data() as TeamMemberDoc).find((m) => teamIds.includes(m.teamId));
  if (!member) {
    return res.status(403).json({ error: "forbidden", message: "Only challenge participants can send messages" });
  }

  const userDoc = await collections.users.doc(userId).get();
  const user = userDoc.exists ? (userDoc.data() as UserDoc) : null;
  const message: MessageDoc = {
    id: crypto.randomUUID(),
    challengeId,
    senderId: userId,
    content: parsed.data.content,
    createdAt: nowIso(),
  };
  await collections.messages.doc(message.id).set(message);

  return res.status(201).json({ ...message, senderUsername: user?.username || "Unknown" });
});

export default router;
