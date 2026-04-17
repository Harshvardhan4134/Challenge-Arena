import { Router } from "express";
import { collections, type ChallengeDoc, type MatchResultDoc, type PlayerStatsDoc, type TeamMemberDoc, type UserDoc } from "../lib/firestore-db";

const router = Router();

router.get("/stats/overview", async (_req, res) => {
  const challenges = (await collections.challenges.get()).docs.map((d) => d.data() as ChallengeDoc);
  const activeChallenges = challenges.filter(c => ["open", "full", "in_progress"].includes(c.status)).length;
  const completedMatches = challenges.filter(c => c.status === "completed").length;
  const matchesToday = challenges.filter(c => {
    const d = new Date(c.createdAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;
  const totalPlayers = (await collections.users.get()).size;
  const openChallenges = challenges.filter(c => c.status === "open");
  const openSlots = openChallenges.length;

  return res.status(200).json({ activeChallenges, totalPlayers: Number(totalPlayers), matchesToday, completedMatches, openSlots });
});

router.get("/users/:userId/stats", async (req, res) => {
  const { userId } = req.params;
  const statsDoc = await collections.playerStats.doc(userId).get();
  const stats = statsDoc.exists ? (statsDoc.data() as PlayerStatsDoc) : null;
  if (!stats) return res.status(200).json({ userId, matchesPlayed: 0, wins: 0, losses: 0, winStreak: 0, weeklyWins: 0 });
  return res.status(200).json(stats);
});

router.get("/users/:userId/history", async (req, res) => {
  const { userId } = req.params;

  const memberships = (await collections.teamMembers.where("userId", "==", userId).get()).docs
    .map((d) => d.data() as TeamMemberDoc);
  const teamIds = memberships.map(m => m.teamId);

  if (teamIds.length === 0) return res.status(200).json([]);

  const allChallenges = (await collections.challenges.get()).docs.map((d) => d.data() as ChallengeDoc);
  const userChallenges = allChallenges.filter(c =>
    (c.teamAId && teamIds.includes(c.teamAId)) || (c.teamBId !== null && teamIds.includes(c.teamBId!))
  ).filter(c => c.status === "completed" || c.status === "disputed");

  const results = await Promise.all(userChallenges.slice(0, 20).map(async (c) => {
    const userTeamId = (c.teamAId && teamIds.includes(c.teamAId)) ? c.teamAId : c.teamBId;
    const opponentTeamId = userTeamId === c.teamAId ? c.teamBId : c.teamAId;

    const resultSnap = await collections.matchResults.where("challengeId", "==", c.id).limit(1).get();
    const result = resultSnap.empty ? null : (resultSnap.docs[0].data() as MatchResultDoc);
    let outcome: "win" | "loss" | "disputed" = "disputed";
    if (result?.status === "confirmed") {
      const winningTeamId = result.winningSide === "teamA" ? c.teamAId : c.teamBId;
      outcome = winningTeamId === userTeamId ? "win" : "loss";
    }

    let opponentName: string | null = null;
    if (opponentTeamId) {
      const leaderSnap = await collections.teamMembers
        .where("teamId", "==", opponentTeamId)
        .where("isLeader", "==", true)
        .limit(1)
        .get();
      const leaderMember = leaderSnap.empty ? null : (leaderSnap.docs[0].data() as TeamMemberDoc);
      if (leaderMember) {
        const uDoc = await collections.users.doc(leaderMember.userId).get();
        const u = uDoc.exists ? (uDoc.data() as UserDoc) : null;
        opponentName = u?.username ?? null;
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
