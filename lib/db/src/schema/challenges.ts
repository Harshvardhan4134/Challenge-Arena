import { pgTable, text, timestamp, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const challengeModeEnum = pgEnum("challenge_mode", ["1v1", "2v2", "4v4"]);
export const challengeStatusEnum = pgEnum("challenge_status", [
  "open",
  "full",
  "in_progress",
  "completed",
  "cancelled",
  "disputed",
]);

export const challengesTable = pgTable("challenges", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  mode: challengeModeEnum("mode").notNull(),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  rules: jsonb("rules").$type<string[]>().notNull().default([]),
  customRule: text("custom_rule"),
  status: challengeStatusEnum("status").notNull().default("open"),
  teamAId: text("team_a_id").notNull(),
  teamBId: text("team_b_id"),
  roomId: text("room_id"),
  roomPassword: text("room_password"),
  creatorId: text("creator_id").notNull().references(() => usersTable.id),
  winnerId: text("winner_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Challenge = typeof challengesTable.$inferSelect;
export type InsertChallenge = typeof challengesTable.$inferInsert;
