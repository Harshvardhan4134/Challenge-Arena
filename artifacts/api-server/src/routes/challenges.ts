import { Router } from "express";
import { db } from "@workspace/db";
import {
  challengesTable,
  teamsTable,
  teamMembersTable,
  usersTable,
  notificationsTable,
  playerStatsTable,
} from "@workspace/db";
import { eq, and, ne, inArray } from "drizzle-orm";
import {
  CreateChallengeBody,
  JoinChallengeBody,
  SubmitResultBody,
  ShareRoomDetailsBody,
} from "@workspace/api-zod";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

const MODE_SIZE: Record<string, number> = { "1v1": 1, "2v2": 2, "4v4": 4 };

async function buildChallengeResponse(challenge: typeof challengesTable.$inferSelect) {
  const teamA = await db.select().from(teamsTable).where(eq(teamsTable.id, challenge.teamAId)).limit(1);
  const teamAMembers = await db.select().from(teamMembersTable)
    .where(eq(teamMembersTable.teamId, challenge.teamAId));

  const teamAMembersWithUsernames = await Promise.all(teamAMembers.map(async (m) => {
    const [u] = await db.select().from(usersTable).where(eq(usersTable.id, m.userId)).limit(1);
    return { userId: m.userId, username: u?.username || "", ign: u?.ign || null, isLeader: m.isLeader, joinedAt: m.joinedAt.toISOString() };
  }));

  const maxSize = MODE_SIZE[challenge.mode] || 1;

  let teamBData = null;
  if (challenge.teamBId) {
    const teamB = await db.select().from(teamsTable).where(eq(teamsTable.id, challenge.teamBId)).limit(1);
    const teamBMembers = await db.select().from(teamMembersTable).where(eq(teamMembersTable.teamId, challenge.teamBId));
    const teamBMembersWithUsernames = await Promise.all(teamBMembers.map(async (m) => {
      const [u] = await db.select().from(usersTable).where(eq(usersTable.id, m.userId)).limit(1);
      return { userId: m.userId, username: u?.username || "", ign: u?.ign || null, isLeader: m.isLeader, joinedAt: m.joinedAt.toISOString() };
    }));
    if (teamB[0]) {
      teamBData = { id: teamB[0].id, name: teamB[0].name, leaderId: teamB[0].leaderId, players: teamBMembersWithUsernames, maxSize };
    }
  }

  return {
    id: challenge.id,
    title: challenge.title,
    mode: challenge.mode,
    scheduledAt: challenge.scheduledAt.toISOString(),
    rules: challenge.rules || [],
    customRule: challenge.customRule,
    status: challenge.status,
    teamA: teamA[0] ? { id: teamA[0].id, name: teamA[0].name, leaderId: teamA[0].leaderId, players: teamAMembersWithUsernames, maxSize } : null,
    teamB: teamBData,
    roomId: challenge.roomId,
    roomPassword: challenge.roomPassword,
    createdAt: challenge.createdAt.toISOString(),
    creatorId: challenge.creatorId,
    winnerId: challenge.winnerId,
  };
}

router.get("/", async (req, res) => {
  const { mode, status, hasSlots } = req.query;
  let challenges = await db.select().from(challengesTable);

  if (mode) challenges = challenges.filter(c => c.mode === mode);
  if (status) challenges = challenges.filter(c => c.status === status);
  else challenges = challenges.filter(c => ["open", "full", "in_progress"].includes(c.status));

  const results = await Promise.all(challenges.map(buildChallengeResponse));

  let filtered = results;
  if (hasSlots === "true") {
    filtered = results.filter(c => {
      const maxSize = MODE_SIZE[c.mode] || 1;
      return c.teamA && c.teamA.players.length < maxSize;
    });
  }

  return res.status(200).json(filtered);
});

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  const parsed = CreateChallengeBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "validation", message: parsed.error.message });

  const { title, mode, scheduledAt, rules, customRule, teamName } = parsed.data;
  const userId = req.userId!;

  const [team] = await db.insert(teamsTable).values({ name: teamName, leaderId: userId }).returning();
  await db.insert(teamMembersTable).values({ teamId: team.id, userId, isLeader: true });

  const [challenge] = await db.insert(challengesTable).values({
    title,
    mode: mode as "1v1" | "2v2" | "4v4",
    scheduledAt: new Date(scheduledAt),
    rules: rules || [],
    customRule: customRule ?? null,
    teamAId: team.id,
    creatorId: userId,
    status: "open",
  }).returning();

  return res.status(201).json(await buildChallengeResponse(challenge));
});

router.get("/:challengeId", async (req, res) => {
  const { challengeId } = req.params;
  const [challenge] = await db.select().from(challengesTable).where(eq(challengesTable.id, challengeId)).limit(1);
  if (!challenge) return res.status(404).json({ error: "not_found", message: "Challenge not found" });
  return res.status(200).json(await buildChallengeResponse(challenge));
});

router.delete("/:challengeId", requireAuth, async (req: AuthRequest, res) => {
  const { challengeId } = req.params;
  const [challenge] = await db.select().from(challengesTable).where(eq(challengesTable.id, challengeId)).limit(1);
  if (!challenge) return res.status(404).json({ error: "not_found", message: "Challenge not found" });
  if (challenge.creatorId !== req.userId) return res.status(403).json({ error: "forbidden", message: "Not the creator" });

  await db.update(challengesTable).set({ status: "cancelled" }).where(eq(challengesTable.id, challengeId));
  return res.status(200).json({ success: true, message: "Challenge cancelled" });
});

router.post("/:challengeId/join", requireAuth, async (req: AuthRequest, res) => {
  const { challengeId } = req.params;
  const parsed = JoinChallengeBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "validation", message: parsed.error.message });

  const { side } = parsed.data;
  const userId = req.userId!;

  const [challenge] = await db.select().from(challengesTable).where(eq(challengesTable.id, challengeId)).limit(1);
  if (!challenge) return res.status(404).json({ error: "not_found", message: "Challenge not found" });
  if (challenge.status !== "open") return res.status(400).json({ error: "closed", message: "Challenge is not open" });

  const maxSize = MODE_SIZE[challenge.mode] || 1;

  if (side === "teamA") {
    const members = await db.select().from(teamMembersTable).where(eq(teamMembersTable.teamId, challenge.teamAId));
    if (members.length >= maxSize) return res.status(400).json({ error: "full", message: "Team A is full" });
    const alreadyIn = members.some(m => m.userId === userId);
    if (alreadyIn) return res.status(400).json({ error: "duplicate", message: "Already in team A" });
    await db.insert(teamMembersTable).values({ teamId: challenge.teamAId, userId, isLeader: false });
  } else {
    if (!challenge.teamBId) {
      const [newTeamB] = await db.insert(teamsTable).values({ name: "Challengers", leaderId: userId }).returning();
      await db.insert(teamMembersTable).values({ teamId: newTeamB.id, userId, isLeader: true });
      await db.update(challengesTable).set({ teamBId: newTeamB.id }).where(eq(challengesTable.id, challengeId));
    } else {
      const members = await db.select().from(teamMembersTable).where(eq(teamMembersTable.teamId, challenge.teamBId));
      if (members.length >= maxSize) return res.status(400).json({ error: "full", message: "Team B is full" });
      const alreadyIn = members.some(m => m.userId === userId);
      if (alreadyIn) return res.status(400).json({ error: "duplicate", message: "Already in team B" });
      await db.insert(teamMembersTable).values({ teamId: challenge.teamBId, userId, isLeader: false });
    }
  }

  const refreshed = await db.select().from(challengesTable).where(eq(challengesTable.id, challengeId)).limit(1);
  const teamAMembers = await db.select().from(teamMembersTable).where(eq(teamMembersTable.teamId, challenge.teamAId));
  const teamBId = refreshed[0].teamBId;
  const teamBMembers = teamBId ? await db.select().from(teamMembersTable).where(eq(teamMembersTable.teamId, teamBId)) : [];

  const totalA = teamAMembers.length;
  const totalB = teamBMembers.length;
  let newStatus: "open" | "full" = "open";
  if (totalA >= maxSize && totalB >= maxSize) newStatus = "full";
  await db.update(challengesTable).set({ status: newStatus }).where(eq(challengesTable.id, challengeId));

  const teamALeaderId = (await db.select().from(teamsTable).where(eq(teamsTable.id, challenge.teamAId)).limit(1))[0]?.leaderId;
  if (teamALeaderId) {
    await db.insert(notificationsTable).values({
      userId: teamALeaderId,
      type: "player_joined",
      title: "Player Joined",
      message: "A new player joined your challenge",
      challengeId,
    });
  }

  const final = await db.select().from(challengesTable).where(eq(challengesTable.id, challengeId)).limit(1);
  return res.status(200).json(await buildChallengeResponse(final[0]));
});

router.post("/:challengeId/leave", requireAuth, async (req: AuthRequest, res) => {
  const { challengeId } = req.params;
  const userId = req.userId!;

  const [challenge] = await db.select().from(challengesTable).where(eq(challengesTable.id, challengeId)).limit(1);
  if (!challenge) return res.status(404).json({ error: "not_found", message: "Challenge not found" });

  const teamIds = [challenge.teamAId, challenge.teamBId].filter(Boolean) as string[];
  for (const teamId of teamIds) {
    const member = await db.select().from(teamMembersTable)
      .where(and(eq(teamMembersTable.teamId, teamId), eq(teamMembersTable.userId, userId))).limit(1);
    if (member.length > 0) {
      await db.delete(teamMembersTable)
        .where(and(eq(teamMembersTable.teamId, teamId), eq(teamMembersTable.userId, userId)));
      break;
    }
  }

  return res.status(200).json({ success: true, message: "Left challenge" });
});

router.post("/:challengeId/result", requireAuth, async (req: AuthRequest, res) => {
  const { challengeId } = req.params;
  const parsed = SubmitResultBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "validation", message: parsed.error.message });

  const { winningSide, screenshotUrl } = parsed.data;
  const userId = req.userId!;

  const [challenge] = await db.select().from(challengesTable).where(eq(challengesTable.id, challengeId)).limit(1);
  if (!challenge) return res.status(404).json({ error: "not_found", message: "Challenge not found" });

  const { matchResultsTable } = await import("@workspace/db");
  const existing = await db.select().from(matchResultsTable).where(eq(matchResultsTable.challengeId, challengeId));

  if (existing.length > 0) {
    const prev = existing[0];
    if (prev.winningSide === winningSide) {
      await db.update(matchResultsTable).set({ status: "confirmed" }).where(eq(matchResultsTable.challengeId, challengeId));
      const winnerTeamId = winningSide === "teamA" ? challenge.teamAId : challenge.teamBId;
      const loserTeamId = winningSide === "teamA" ? challenge.teamBId : challenge.teamAId;
      if (winnerTeamId) {
        const winnerMembers = await db.select().from(teamMembersTable).where(eq(teamMembersTable.teamId, winnerTeamId));
        for (const m of winnerMembers) {
          await db.update(playerStatsTable)
            .set({ wins: (await db.select().from(playerStatsTable).where(eq(playerStatsTable.userId, m.userId)).limit(1))[0]?.wins + 1 || 1, matchesPlayed: (await db.select().from(playerStatsTable).where(eq(playerStatsTable.userId, m.userId)).limit(1))[0]?.matchesPlayed + 1 || 1, weeklyWins: (await db.select().from(playerStatsTable).where(eq(playerStatsTable.userId, m.userId)).limit(1))[0]?.weeklyWins + 1 || 1 })
            .where(eq(playerStatsTable.userId, m.userId));
        }
      }
      if (loserTeamId) {
        const loserMembers = await db.select().from(teamMembersTable).where(eq(teamMembersTable.teamId, loserTeamId));
        for (const m of loserMembers) {
          await db.update(playerStatsTable)
            .set({ losses: (await db.select().from(playerStatsTable).where(eq(playerStatsTable.userId, m.userId)).limit(1))[0]?.losses + 1 || 1, matchesPlayed: (await db.select().from(playerStatsTable).where(eq(playerStatsTable.userId, m.userId)).limit(1))[0]?.matchesPlayed + 1 || 1 })
            .where(eq(playerStatsTable.userId, m.userId));
        }
      }
      await db.update(challengesTable).set({ status: "completed", winnerId: challenge[winningSide === "teamA" ? "teamAId" : "teamBId"] as unknown as string }).where(eq(challengesTable.id, challengeId));
    } else {
      await db.update(matchResultsTable).set({ status: "disputed" }).where(eq(matchResultsTable.challengeId, challengeId));
      await db.update(challengesTable).set({ status: "disputed" }).where(eq(challengesTable.id, challengeId));
    }
    const [result] = await db.select().from(matchResultsTable).where(eq(matchResultsTable.challengeId, challengeId)).limit(1);
    return res.status(200).json({ ...result, createdAt: result.createdAt.toISOString() });
  }

  const [result] = await db.insert(matchResultsTable).values({
    challengeId,
    submittedBy: userId,
    winningSide: winningSide as "teamA" | "teamB",
    screenshotUrl: screenshotUrl ?? null,
    status: "pending",
  }).returning();

  return res.status(200).json({ ...result, createdAt: result.createdAt.toISOString() });
});

router.post("/:challengeId/room", requireAuth, async (req: AuthRequest, res) => {
  const { challengeId } = req.params;
  const parsed = ShareRoomDetailsBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "validation", message: parsed.error.message });

  const { roomId, roomPassword } = parsed.data;
  const userId = req.userId!;

  const [challenge] = await db.select().from(challengesTable).where(eq(challengesTable.id, challengeId)).limit(1);
  if (!challenge) return res.status(404).json({ error: "not_found", message: "Challenge not found" });

  const [teamA] = await db.select().from(teamsTable).where(eq(teamsTable.id, challenge.teamAId)).limit(1);
  if (!teamA || teamA.leaderId !== userId) return res.status(403).json({ error: "forbidden", message: "Only Team A leader can share room details" });

  await db.update(challengesTable).set({ roomId, roomPassword, status: "in_progress" }).where(eq(challengesTable.id, challengeId));

  const teamIds = [challenge.teamAId, challenge.teamBId].filter(Boolean) as string[];
  for (const teamId of teamIds) {
    const members = await db.select().from(teamMembersTable).where(eq(teamMembersTable.teamId, teamId));
    for (const m of members) {
      if (m.userId !== userId) {
        await db.insert(notificationsTable).values({
          userId: m.userId,
          type: "match_starting",
          title: "Match Starting!",
          message: `Room is ready! Room ID: ${roomId}`,
          challengeId,
        });
      }
    }
  }

  return res.status(200).json({ success: true, message: "Room details shared" });
});

export default router;
