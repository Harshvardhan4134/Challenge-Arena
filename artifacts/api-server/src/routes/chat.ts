import { Router } from "express";
import { db } from "@workspace/db";
import { messagesTable, challengesTable, teamsTable, teamMembersTable, usersTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { SendMessageBody } from "@workspace/api-zod";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router({ mergeParams: true });

router.get("/:challengeId/messages", async (req, res) => {
  const { challengeId } = req.params;
  const messages = await db.select().from(messagesTable)
    .where(eq(messagesTable.challengeId, challengeId))
    .orderBy(asc(messagesTable.createdAt));

  const result = await Promise.all(messages.map(async (m) => {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, m.senderId)).limit(1);
    return { ...m, senderUsername: user?.username || "Unknown", createdAt: m.createdAt.toISOString() };
  }));

  return res.status(200).json(result);
});

router.post("/:challengeId/messages", requireAuth, async (req: AuthRequest, res) => {
  const { challengeId } = req.params;
  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "validation", message: parsed.error.message });

  const userId = req.userId!;
  const [challenge] = await db.select().from(challengesTable).where(eq(challengesTable.id, challengeId)).limit(1);
  if (!challenge) return res.status(404).json({ error: "not_found", message: "Challenge not found" });

  const [teamA] = await db.select().from(teamsTable).where(eq(teamsTable.id, challenge.teamAId)).limit(1);
  const teamBLeaderId = challenge.teamBId
    ? (await db.select().from(teamsTable).where(eq(teamsTable.id, challenge.teamBId)).limit(1))[0]?.leaderId
    : null;

  const isLeader = teamA?.leaderId === userId || teamBLeaderId === userId;
  if (!isLeader) return res.status(403).json({ error: "forbidden", message: "Only team leaders can send messages" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  const [message] = await db.insert(messagesTable).values({
    challengeId,
    senderId: userId,
    content: parsed.data.content,
  }).returning();

  return res.status(201).json({ ...message, senderUsername: user?.username || "Unknown", createdAt: message.createdAt.toISOString() });
});

export default router;
