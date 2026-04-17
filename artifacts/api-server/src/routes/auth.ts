import { Router } from "express";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import crypto from "crypto";
import { firebaseAdminAuth } from "../lib/firebase-admin";
import { collections, nowIso, type PlayerStatsDoc, type UserDoc } from "../lib/firestore-db";
import { normalizeWhatsappInput } from "../lib/whatsapp-util";
import { toSafeUser } from "../lib/user-view";

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

async function getUserStats(userId: string): Promise<PlayerStatsDoc | null> {
  const statsDoc = await collections.playerStats.doc(userId).get();
  return statsDoc.exists ? (statsDoc.data() as PlayerStatsDoc) : null;
}

async function findUserByFreefireUid(freefireUid: string): Promise<UserDoc | null> {
  const snap = await collections.users.where("freefireUid", "==", freefireUid).limit(1).get();
  return snap.empty ? null : (snap.docs[0].data() as UserDoc);
}

function getSuggestedUsername(email: string | undefined): string {
  if (!email) {
    return `player_${crypto.randomBytes(3).toString("hex")}`;
  }

  const local = email.split("@")[0] ?? "player";
  const sanitized = local.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 24);
  return sanitized.length >= 3
    ? sanitized
    : `player_${crypto.randomBytes(3).toString("hex")}`;
}

router.post("/register", async (req, res) => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation error", message: parsed.error.message });
  }
  const { username, password, email, freefireUid, ign, gender, whatsappPhone } = parsed.data;

  const existing = await collections.users.where("username", "==", username).limit(1).get();
  if (!existing.empty) {
    return res.status(400).json({ error: "conflict", message: "Username already taken" });
  }
  if (freefireUid) {
    const uidConflict = await findUserByFreefireUid(freefireUid);
    if (uidConflict) {
      return res.status(400).json({ error: "conflict", message: "Free Fire UID is already registered" });
    }
  }

  const userId = crypto.randomUUID();
  const passwordHash = hashPassword(password);
  const user: UserDoc = {
    id: userId,
    username,
    passwordHash,
    email: email ?? null,
    whatsappPhone: normalizeWhatsappInput(whatsappPhone),
    freefireUid: freefireUid ?? null,
    ign: ign ?? null,
    gender: (gender as "male" | "female" | "other" | undefined) ?? null,
    createdAt: nowIso(),
  };
  await collections.users.doc(userId).set(user);

  const stats: PlayerStatsDoc = {
    userId,
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    winStreak: 0,
    weeklyWins: 0,
    weeklyReset: nowIso(),
  };
  await collections.playerStats.doc(userId).set(stats);

  const token = generateToken(userId);
  tokenStore.set(token, userId);

  return res.status(201).json({ user: { ...toSafeUser(user), stats: null }, token });
});

router.post("/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation error", message: parsed.error.message });
  }
  const { username, password } = parsed.data;
  const passwordHash = hashPassword(password);

  const userSnap = await collections.users.where("username", "==", username).limit(1).get();
  const user = userSnap.empty ? null : (userSnap.docs[0].data() as UserDoc);

  if (!user || user.passwordHash !== passwordHash) {
    return res.status(401).json({ error: "unauthorized", message: "Invalid credentials" });
  }

  const token = generateToken(user.id);
  tokenStore.set(token, user.id);

  const stats = await getUserStats(user.id);
  return res.status(200).json({ user: { ...toSafeUser(user), stats: stats || null }, token });
});

router.post("/google", async (req, res) => {
  const body = req.body as {
    idToken?: unknown;
    username?: unknown;
    freefireUid?: unknown;
    ign?: unknown;
    gender?: unknown;
    whatsappPhone?: unknown;
  };
  const idToken = typeof body.idToken === "string" ? body.idToken : "";
  const username = typeof body.username === "string" ? body.username : undefined;
  const freefireUid = typeof body.freefireUid === "string" ? body.freefireUid : undefined;
  const ign = typeof body.ign === "string" ? body.ign : undefined;
  const whatsappPhone = typeof body.whatsappPhone === "string" ? body.whatsappPhone : undefined;
  const gender = body.gender === "male" || body.gender === "female" || body.gender === "other"
    ? body.gender
    : undefined;

  if (!idToken) {
    return res.status(400).json({ error: "validation", message: "idToken is required" });
  }

  if (username && (username.length < 3 || username.length > 30)) {
    return res.status(400).json({ error: "validation", message: "username must be 3-30 characters" });
  }

  let decodedToken: Awaited<ReturnType<typeof firebaseAdminAuth.verifyIdToken>>;
  try {
    decodedToken = await firebaseAdminAuth.verifyIdToken(idToken);
  } catch {
    return res.status(401).json({ error: "unauthorized", message: "Invalid Google token" });
  }

  const email = decodedToken.email ?? null;
  const firebaseUid = decodedToken.uid;

  const existingUser = email
    ? (() => {
        const snapPromise = collections.users.where("email", "==", email).limit(1).get();
        return snapPromise;
      })()
    : null;
  const existingUserSnap = await existingUser;
  const existingUserDoc = existingUserSnap && !existingUserSnap.empty
    ? (existingUserSnap.docs[0].data() as UserDoc)
    : undefined;

  if (!existingUserDoc && (!username || !freefireUid)) {
    return res.status(428).json({
      error: "profile_incomplete",
      message: "Complete required profile fields to finish Google sign up",
      needsProfileCompletion: true,
      suggested: {
        username: getSuggestedUsername(decodedToken.email),
        email: decodedToken.email ?? "",
      },
    });
  }

  if (existingUserDoc) {
    let merged = existingUserDoc;
    if (email && !existingUserDoc.email) {
      await collections.users.doc(existingUserDoc.id).set({ email }, { merge: true });
      merged = { ...existingUserDoc, email };
    }
    const token = generateToken(merged.id);
    tokenStore.set(token, merged.id);
    const stats = await getUserStats(merged.id);
    return res.status(200).json({ user: { ...toSafeUser(merged), stats: stats || null }, token });
  }

  const usernameConflictSnap = await collections.users.where("username", "==", username!).limit(1).get();
  if (!usernameConflictSnap.empty) {
    return res.status(400).json({ error: "conflict", message: "Username already taken" });
  }
  if (freefireUid) {
    const uidConflict = await findUserByFreefireUid(freefireUid);
    if (uidConflict) {
      return res.status(400).json({ error: "conflict", message: "Free Fire UID is already registered" });
    }
  }

  const generatedPasswordHash = hashPassword(`${firebaseUid}:${crypto.randomBytes(16).toString("hex")}`);
  const userId = crypto.randomUUID();
  const user: UserDoc = {
    id: userId,
    username: username!,
    passwordHash: generatedPasswordHash,
    email,
    whatsappPhone: normalizeWhatsappInput(whatsappPhone),
    freefireUid: freefireUid!,
    ign: ign ?? decodedToken.name ?? null,
    gender: (gender as "male" | "female" | "other" | undefined) ?? null,
    createdAt: nowIso(),
  };
  await collections.users.doc(userId).set(user);

  const stats: PlayerStatsDoc = {
    userId,
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    winStreak: 0,
    weeklyWins: 0,
    weeklyReset: nowIso(),
  };
  await collections.playerStats.doc(userId).set(stats);

  const token = generateToken(userId);
  tokenStore.set(token, userId);
  const safeUser = toSafeUser(user);
  return res.status(201).json({ user: { ...safeUser, stats: null }, token });
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

  const userDoc = await collections.users.doc(userId).get();
  if (!userDoc.exists) return res.status(401).json({ error: "unauthorized", message: "User not found" });
  const user = userDoc.data() as UserDoc;
  const stats = await getUserStats(userId);
  const safeUser = toSafeUser(user);
  return res.status(200).json({ ...safeUser, stats: stats || null });
});

export default router;
