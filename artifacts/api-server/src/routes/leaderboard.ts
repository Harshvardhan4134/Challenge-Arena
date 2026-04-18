import { Router } from "express";
import { collections, type PlayerStatsDoc, type UserDoc } from "../lib/firestore-db";

const router = Router();

router.get("/weekly", async (_req, res) => {
  /** At least one finished match (or weekly activity) to appear; was 3 and hid almost everyone. */
  const minMatches = 1;
  const statsSnap = await collections.playerStats.get();
  const all = statsSnap.docs.map((d) => d.data() as PlayerStatsDoc);
  const eligible = all.filter(
    (s) => (s.matchesPlayed ?? 0) >= minMatches || (s.weeklyWins ?? 0) >= 1,
  );
  const sorted = eligible.sort((a, b) => (b.weeklyWins - a.weeklyWins) || (b.wins - a.wins));
  const top = sorted.slice(0, 50);

  const result = await Promise.all(top.map(async (s, idx) => {
    const userDoc = await collections.users.doc(s.userId).get();
    const user = userDoc.exists ? (userDoc.data() as UserDoc) : null;
    const badge = idx === 0
      ? "Top Player"
      : s.winStreak >= 5
        ? "Unstoppable"
        : s.winStreak >= 3
          ? "Hot Streak"
          : null;
    return {
      rank: idx + 1,
      userId: s.userId,
      username: user?.username ?? "Unknown",
      ign: user?.ign ?? null,
      wins: s.wins,
      winStreak: s.winStreak,
      matchesPlayed: s.matchesPlayed,
      badge,
    };
  }));

  return res.status(200).json(result);
});

export default router;
