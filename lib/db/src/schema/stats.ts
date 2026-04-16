import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const playerStatsTable = pgTable("player_stats", {
  userId: text("user_id").primaryKey().references(() => usersTable.id),
  matchesPlayed: integer("matches_played").notNull().default(0),
  wins: integer("wins").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  winStreak: integer("win_streak").notNull().default(0),
  weeklyWins: integer("weekly_wins").notNull().default(0),
  weeklyReset: timestamp("weekly_reset", { withTimezone: true }).defaultNow(),
});

export type PlayerStats = typeof playerStatsTable.$inferSelect;
