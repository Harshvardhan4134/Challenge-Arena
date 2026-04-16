import { Router } from "express";
import { db } from "@workspace/db";
import { playerStatsTable, usersTable, challengesTable, matchResultsTable, teamMembersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { sql } from "drizzle-orm";

const router = Router();

router.get("/stats/overview", async (_req, res) => {
  const challenges = await db.select().from(challengesTable);
  const activeChallenges = challenges.filter(c => ["open", "full", "in_progress"].includes(c.status)).length;
  const completedMatches = challenges.filter(c => c.status === "completed").length;
  const matchesToday = challenges.filter(c => {
    const d = new Date(c.createdAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;
  const totalPlayers = (await db.select({ count: sql<number>`count(*)` }).from(usersTable))[0]?.count || 0;
  const openChallenges = challenges.filter(c => c.status === "open");
  const openSlots = openChallenges.length;

  return res.status(200).json({ activeChallenges, totalPlayers: Number(totalPlayers), matchesToday, completedMatches, openSlots });
});

router.get("/users/:userId/stats", async (req, res) => {
  const { userId } = req.params;
  const [stats] = await db.select().from(playerStatsTable).where(eq(playerStatsTable.userId, userId)).limit(1);
  if (!stats) return res.status(200).json({ userId, matchesPlayed: 0, wins: 0, losses: 0, winStreak: 0, weeklyWins: 0 });
  return res.status(200).json(stats);
});

router.get("/users/:userId/history", async (req, res) => {
  const { userId } = req.params;

  const memberships = await db.select().from(teamMembersTable).where(eq(teamMembersTable.userId, userId));
  const teamIds = memberships.map(m => m.teamId);

  if (teamIds.length === 0) return res.status(200).json([]);

  const allChallenges = await db.select().from(challengesTable);
  const userChallenges = allChallenges.filter(c =>
    (c.teamAId && teamIds.includes(c.teamAId)) || (c.teamBId !== null && teamIds.includes(c.teamBId!))
  ).filter(c => c.status === "completed" || c.status === "disputed");

  const results = await Promise.all(userChallenges.slice(0, 20).map(async (c) => {
    const userTeamId = (c.teamAId && teamIds.includes(c.teamAId)) ? c.teamAId : c.teamBId;
    const opponentTeamId = userTeamId === c.teamAId ? c.teamBId : c.teamAId;

    const [result] = await db.select().from(matchResultsTable).where(eq(matchResultsTable.challengeId, c.id)).limit(1);
    let outcome: "win" | "loss" | "disputed" = "disputed";
    if (result?.status === "confirmed") {
      const winningTeamId = result.winningSide === "teamA" ? c.teamAId : c.teamBId;
      outcome = winningTeamId === userTeamId ? "win" : "loss";
    }

    let opponentName: string | null = null;
    if (opponentTeamId) {
      const [leaderMember] = await db.select().from(teamMembersTable)
        .where(and(eq(teamMembersTable.teamId, opponentTeamId), eq(teamMembersTable.isLeader, true)))
        .limit(1);
      if (leaderMember) {
        const [u] = await db.select().from(usersTable).where(eq(usersTable.id, leaderMember.userId)).limit(1);
        opponentName = u?.username || null;
      }
    }

    return {
      challengeId: c.id,
      title: c.title,
      mode: c.mode,
      outcome,
      opponent: opponentName,
      playedAt: c.scheduledAt.toISOString(),
    };
  }));

  return res.status(200).json(results);
});

export default router;
