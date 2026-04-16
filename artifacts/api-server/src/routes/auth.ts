import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, playerStatsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import crypto from "crypto";

const router = Router();

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "challenge_arena_salt").digest("hex");
}

function generateToken(userId: string): string {
  return Buffer.from(`${userId}:${Date.now()}:${crypto.randomBytes(16).toString("hex")}`).toString("base64");
}

const tokenStore = new Map<string, string>();

export function getUserIdFromToken(token: string): string | null {
  return tokenStore.get(token) || null;
}

router.post("/register", async (req, res) => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation error", message: parsed.error.message });
  }
  const { username, password, freefireUid, ign, gender } = parsed.data;

  const existing = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
  if (existing.length > 0) {
    return res.status(400).json({ error: "conflict", message: "Username already taken" });
  }

  const passwordHash = hashPassword(password);
  const [user] = await db.insert(usersTable).values({
    username,
    passwordHash,
    freefireUid: freefireUid ?? null,
    ign: ign ?? null,
    gender: (gender as "male" | "female" | "other" | undefined) ?? null,
  }).returning();

  await db.insert(playerStatsTable).values({ userId: user.id });

  const token = generateToken(user.id);
  tokenStore.set(token, user.id);

  const { passwordHash: _, ...safeUser } = user;
  return res.status(201).json({ user: { ...safeUser, stats: null }, token });
});

router.post("/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation error", message: parsed.error.message });
  }
  const { username, password } = parsed.data;
  const passwordHash = hashPassword(password);

  const [user] = await db.select().from(usersTable)
    .where(eq(usersTable.username, username)).limit(1);

  if (!user || user.passwordHash !== passwordHash) {
    return res.status(401).json({ error: "unauthorized", message: "Invalid credentials" });
  }

  const token = generateToken(user.id);
  tokenStore.set(token, user.id);

  const [stats] = await db.select().from(playerStatsTable).where(eq(playerStatsTable.userId, user.id)).limit(1);
  const { passwordHash: _, ...safeUser } = user;
  return res.status(200).json({ user: { ...safeUser, stats: stats || null }, token });
});

router.post("/logout", async (req, res) => {
  const auth = req.headers.authorization;
  if (auth) {
    const token = auth.replace("Bearer ", "");
    tokenStore.delete(token);
  }
  return res.status(200).json({ success: true, message: "Logged out" });
});

router.get("/me", async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "unauthorized", message: "No token" });
  const token = auth.replace("Bearer ", "");
  const userId = getUserIdFromToken(token);
  if (!userId) return res.status(401).json({ error: "unauthorized", message: "Invalid token" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) return res.status(401).json({ error: "unauthorized", message: "User not found" });

  const [stats] = await db.select().from(playerStatsTable).where(eq(playerStatsTable.userId, userId)).limit(1);
  const { passwordHash: _, ...safeUser } = user;
  return res.status(200).json({ ...safeUser, stats: stats || null });
});

export default router;
