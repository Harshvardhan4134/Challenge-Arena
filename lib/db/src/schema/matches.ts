import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { challengesTable } from "./challenges";

export const resultStatusEnum = pgEnum("result_status", ["pending", "confirmed", "disputed"]);
export const winningSideEnum = pgEnum("winning_side", ["teamA", "teamB"]);

export const matchResultsTable = pgTable("match_results", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  challengeId: text("challenge_id").notNull().references(() => challengesTable.id),
  submittedBy: text("submitted_by").notNull().references(() => usersTable.id),
  winningSide: winningSideEnum("winning_side").notNull(),
  screenshotUrl: text("screenshot_url"),
  status: resultStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type MatchResult = typeof matchResultsTable.$inferSelect;
