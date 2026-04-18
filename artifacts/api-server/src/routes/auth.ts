import { Router } from "express";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import crypto from "crypto";
import { firebaseAdminAuth } from "../lib/firebase-admin";
import { collections, nowIso, type AuthTokenDoc, type PlayerStatsDoc, type UserDoc } from "../lib/firestore-db";
import { normalizeWhatsappInput } from "../lib/whatsapp-util";
import { isUserBanned, toSafeUser } from "../lib/user-view";

const router = Router();

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "challenge_arena_salt").digest("hex");
}

function generateToken(userId: string): string {
  return Buffer.from(`${userId}:${Date.now()}:${crypto.randomBytes(16).toString("hex")}`).toString("base64");
}

/** In-process cache; authoritative mapping is Firestore `authTokens`. */
const tokenStore = new Map<string, string>();

function authTokenDocId(token: string): string {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

async function persistAuthToken(token: string, userId: string): Promise<void> {
  tokenStore.set(token, userId);
  await collections.authTokens.doc(authTokenDocId(token)).set({
    userId,
    createdAt: nowIso(),
  } satisfies AuthTokenDoc);
}

async function revokeAuthToken(token: string): Promise<void> {
  tokenStore.delete(token);
  try {
    await collections.authTokens.doc(authTokenDocId(token)).delete();
  } catch {
    /* ignore */
  }
}

/** Resolve bearer token to user id (Firestore-backed, with memory cache). */
export async function resolveUserIdFromToken(token: string): Promise<string | null> {
  const trimmed = token.trim();
  if (!trimmed) return null;
  const cached = tokenStore.get(trimmed);
  if (cached) return cached;
  const doc = await collections.authTokens.doc(authTokenDocId(trimmed)).get();
  if (!doc.exists) return null;
  const userId = (doc.data() as { userId: string }).userId;
  tokenStore.set(trimmed, userId);
  return userId;
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
  const normalizedWa = normalizeWhatsappInput(whatsappPhone);
  if (!normalizedWa) {
    return res.status(400).json({
      error: "validation",
      message: "Invalid WhatsApp number. Include country code with at least 10 digits.",
    });
  }

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
    whatsappPhone: normalizedWa,
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
  await persistAuthToken(token, userId);

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
  if (isUserBanned(user)) {
    return res.status(403).json({
      error: "forbidden",
      message: `Account suspended until ${user.bannedUntil}`,
    });
  }

  const token = generateToken(user.id);
  await persistAuthToken(token, user.id);

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

  if (!existingUserDoc && (!username || !freefireUid || !normalizeWhatsappInput(whatsappPhone))) {
    return res.status(428).json({
      error: "profile_incomplete",
      message: "Complete required profile fields (including WhatsApp with country code) to finish Google sign up",
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

    const incomingWa = normalizeWhatsappInput(whatsappPhone);
    const storedWa = normalizeWhatsappInput(merged.whatsappPhone);
    if (!storedWa && !incomingWa) {
      return res.status(428).json({
        error: "profile_incomplete",
        message: "WhatsApp number is required. Enter it below to continue.",
        needsProfileCompletion: true,
        needsWhatsappOnly: true,
        suggested: {
          username: merged.username,
          email: merged.email ?? decodedToken.email ?? "",
        },
      });
    }
    if (incomingWa && incomingWa !== storedWa) {
      await collections.users.doc(merged.id).set({ whatsappPhone: incomingWa }, { merge: true });
      merged = { ...merged, whatsappPhone: incomingWa };
    }

    if (isUserBanned(merged)) {
      return res.status(403).json({
        error: "forbidden",
        message: `Account suspended until ${merged.bannedUntil}`,
      });
    }
    const token = generateToken(merged.id);
    await persistAuthToken(token, merged.id);
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

  const newUserWa = normalizeWhatsappInput(whatsappPhone);
  if (!newUserWa) {
    return res.status(400).json({
      error: "validation",
      message: "WhatsApp number is required (include country code, at least 10 digits).",
    });
  }

  const generatedPasswordHash = hashPassword(`${firebaseUid}:${crypto.randomBytes(16).toString("hex")}`);
  const userId = crypto.randomUUID();
  const user: UserDoc = {
    id: userId,
    username: username!,
    passwordHash: generatedPasswordHash,
    email,
    whatsappPhone: newUserWa,
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
  await persistAuthToken(token, userId);
  const safeUser = toSafeUser(user);
  return res.status(201).json({ user: { ...safeUser, stats: null }, token });
});

router.post("/logout", async (req, res) => {
  const auth = req.headers.authorization;
  if (auth) {
    const token = auth.replace("Bearer ", "");
    await revokeAuthToken(token);
  }
  return res.status(200).json({ success: true, message: "Logged out" });
});

router.get("/me", async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "unauthorized", message: "No token" });
  const token = auth.replace("Bearer ", "");
  const userId = await resolveUserIdFromToken(token);
  if (!userId) return res.status(401).json({ error: "unauthorized", message: "Invalid token" });

  const userDoc = await collections.users.doc(userId).get();
  if (!userDoc.exists) return res.status(401).json({ error: "unauthorized", message: "User not found" });
  const user = userDoc.data() as UserDoc;
  if (isUserBanned(user)) {
    return res.status(403).json({
      error: "forbidden",
      message: `Account suspended until ${user.bannedUntil}`,
    });
  }
  const stats = await getUserStats(userId);
  const safeUser = toSafeUser(user);
  return res.status(200).json({ ...safeUser, stats: stats || null });
});

export default router;
