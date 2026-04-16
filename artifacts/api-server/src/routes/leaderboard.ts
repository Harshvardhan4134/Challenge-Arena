import { Router } from "express";
import { db } from "@workspace/db";
import { playerStatsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/weekly", async (_req, res) => {
  const stats = await db.select().from(playerStatsTable)
    .orderBy(desc(playerStatsTable.weeklyWins), desc(playerStatsTable.wins))
    .limit(50);

  const result = await Promise.all(stats.map(async (s, idx) => {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, s.userId)).limit(1);
    const badge = idx === 0 ? "Top Player" : s.winStreak >= 3 ? "Hot Streak" : null;
    return {
      rank: idx + 1,
      userId: s.userId,
      username: user?.username || "Unknown",
      ign: user?.ign || null,
      wins: s.wins,
      winStreak: s.winStreak,
      matchesPlayed: s.matchesPlayed,
      badge,
    };
  }));

  return res.status(200).json(result);
});

export default router;
