import { Router } from "express";
import { FieldValue, type DocumentReference } from "firebase-admin/firestore";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { requireAdmin } from "../middleware/requireAdmin";
import {
  firestore,
  collections,
  byCreatedDesc,
  type ChallengeDoc,
  type MatchResultDoc,
  type NotificationDoc,
  type PlayerReportDoc,
  type PlayerStatsDoc,
  type PushSubscriptionDoc,
  type UserDoc,
} from "../lib/firestore-db";
import { isAdminUser, toSafeUser } from "../lib/user-view";
import { buildChallengeResponse } from "./challenges";

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

async function deleteUserDocs(userId: string): Promise<void> {
  const refs: DocumentReference[] = [
    collections.users.doc(userId),
    collections.playerStats.doc(userId),
  ];
  const [pushSnap, teamSnap, notifSnap] = await Promise.all([
    collections.pushSubscriptions.where("userId", "==", userId).get(),
    collections.teamMembers.where("userId", "==", userId).get(),
    collections.notifications.where("userId", "==", userId).get(),
  ]);
  for (const d of pushSnap.docs) refs.push(d.ref);
  for (const d of teamSnap.docs) refs.push(d.ref);
  for (const d of notifSnap.docs) refs.push(d.ref);

  const chunk = 450;
  for (let i = 0; i < refs.length; i += chunk) {
    const batch = firestore.batch();
    for (const ref of refs.slice(i, i + chunk)) batch.delete(ref);
    await batch.commit();
  }
}

function pathUserId(req: AuthRequest): string | undefined {
  const raw = req.params["userId"];
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw) && typeof raw[0] === "string") return raw[0];
  return undefined;
}

function parseBanBody(req: AuthRequest): { until: string } | { error: string } {
  const body = req.body as { hoursFromNow?: unknown; bannedUntil?: unknown };
  if (typeof body.bannedUntil === "string" && body.bannedUntil.trim()) {
    const t = new Date(body.bannedUntil).getTime();
    if (Number.isNaN(t)) return { error: "Invalid bannedUntil" };
    if (t <= Date.now()) return { error: "bannedUntil must be in the future" };
    return { until: new Date(t).toISOString() };
  }
  const h = body.hoursFromNow;
  if (typeof h === "number" && Number.isFinite(h)) {
    const hours = Math.floor(h);
    if (hours < 1 || hours > 8760) return { error: "hoursFromNow must be 1-8760" };
    return { until: new Date(Date.now() + hours * 3600 * 1000).toISOString() };
  }
  return { error: "Provide bannedUntil (ISO) or hoursFromNow (number)" };
}

router.get("/overview", async (_req, res) => {
  const usersSnap = await collections.users.get();
  const usersTotal = usersSnap.size;

  const challenges = (await collections.challenges.get()).docs.map((d) => d.data() as ChallengeDoc);
  const challengesByStatus: Record<string, number> = {};
  for (const c of challenges) {
    challengesByStatus[c.status] = (challengesByStatus[c.status] ?? 0) + 1;
  }

  const teamsSnap = await collections.teams.get();
  const notificationsSnap = await collections.notifications.get();
  const matchResultsSnap = await collections.matchResults.get();
  const pushSnap = await collections.pushSubscriptions.get();

  let unreadNotifications = 0;
  for (const d of notificationsSnap.docs) {
    const n = d.data() as NotificationDoc;
    if (!n.isRead) unreadNotifications++;
  }

  const recentUsers = usersSnap.docs
    .map((d) => d.data() as UserDoc)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 15)
    .map((u) => ({ id: u.id, username: u.username, ign: u.ign, createdAt: u.createdAt }));

  return res.status(200).json({
    usersTotal,
    challengesTotal: challenges.length,
    challengesByStatus,
    teamsTotal: teamsSnap.size,
    notificationsTotal: notificationsSnap.size,
    unreadNotifications,
    matchResultsTotal: matchResultsSnap.size,
    pushSubscriptionsTotal: pushSnap.size,
    teamMembersTotal: (await collections.teamMembers.get()).size,
    messagesTotal: (await collections.messages.get()).size,
    recentUsers,
  });
});

router.get("/users", async (_req, res) => {
  const snap = await collections.users.get();
  const rows = await Promise.all(
    snap.docs.map(async (d) => {
      const u = d.data() as UserDoc;
      const statsDoc = await collections.playerStats.doc(u.id).get();
      const stats = statsDoc.exists ? (statsDoc.data() as PlayerStatsDoc) : null;
      return { ...toSafeUser(u), stats: stats || null };
    }),
  );
  rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return res.status(200).json(rows);
});

router.post("/users/:userId/ban", async (req: AuthRequest, res) => {
  const targetId = pathUserId(req);
  if (!targetId) return res.status(400).json({ error: "bad_request", message: "Missing userId" });
  const adminId = req.userId!;
  if (targetId === adminId) {
    return res.status(400).json({ error: "bad_request", message: "Cannot ban yourself" });
  }
  const targetDoc = await collections.users.doc(targetId).get();
  if (!targetDoc.exists) return res.status(404).json({ error: "not_found", message: "User not found" });
  const target = targetDoc.data() as UserDoc;
  if (isAdminUser(target)) {
    return res.status(400).json({
      error: "bad_request",
      message: "Remove admin access from this account before banning.",
    });
  }
  const parsed = parseBanBody(req);
  if ("error" in parsed) {
    return res.status(400).json({ error: "validation", message: parsed.error });
  }
  const { until } = parsed;
  await collections.users.doc(targetId).set({ bannedUntil: until }, { merge: true });
  const updated = (await collections.users.doc(targetId).get()).data() as UserDoc;
  const statsDoc = await collections.playerStats.doc(targetId).get();
  const stats = statsDoc.exists ? (statsDoc.data() as PlayerStatsDoc) : null;
  return res.status(200).json({ ...toSafeUser(updated), stats: stats || null });
});

router.post("/users/:userId/unban", async (req: AuthRequest, res) => {
  const targetId = pathUserId(req);
  if (!targetId) return res.status(400).json({ error: "bad_request", message: "Missing userId" });
  const targetDoc = await collections.users.doc(targetId).get();
  if (!targetDoc.exists) return res.status(404).json({ error: "not_found", message: "User not found" });
  await collections.users.doc(targetId).update({ bannedUntil: FieldValue.delete() });
  const updated = (await collections.users.doc(targetId).get()).data() as UserDoc;
  const statsDoc = await collections.playerStats.doc(targetId).get();
  const stats = statsDoc.exists ? (statsDoc.data() as PlayerStatsDoc) : null;
  return res.status(200).json({ ...toSafeUser(updated), stats: stats || null });
});

router.delete("/users/:userId", async (req: AuthRequest, res) => {
  const targetId = pathUserId(req);
  if (!targetId) return res.status(400).json({ error: "bad_request", message: "Missing userId" });
  const adminId = req.userId!;
  if (targetId === adminId) {
    return res.status(400).json({ error: "bad_request", message: "Cannot delete your own account" });
  }
  const targetDoc = await collections.users.doc(targetId).get();
  if (!targetDoc.exists) return res.status(404).json({ error: "not_found", message: "User not found" });
  const target = targetDoc.data() as UserDoc;
  if (isAdminUser(target)) {
    return res.status(400).json({
      error: "bad_request",
      message: "Remove admin access from this account before deleting.",
    });
  }
  await deleteUserDocs(targetId);
  return res.status(200).json({ success: true, message: "User deleted" });
});

const ADMIN_CHALLENGE_LIMIT = 400;

router.get("/challenges", async (_req, res) => {
  const snap = await collections.challenges.get();
  const docs = snap.docs.map((d) => d.data() as ChallengeDoc).sort(byCreatedDesc).slice(0, ADMIN_CHALLENGE_LIMIT);
  const payload = await Promise.all(docs.map(buildChallengeResponse));
  return res.status(200).json(payload);
});

router.get("/notifications", async (_req, res) => {
  const snap = await collections.notifications.get();
  const rows = snap.docs.map((d) => {
    const raw = d.data() as NotificationDoc;
    return { ...raw, id: d.id };
  });
  rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return res.status(200).json(rows.slice(0, 500));
});

router.get("/match-results", async (_req, res) => {
  const snap = await collections.matchResults.get();
  const rows = snap.docs.map((d) => {
    const raw = d.data() as MatchResultDoc;
    return { ...raw, id: d.id };
  });
  rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return res.status(200).json(rows.slice(0, 300));
});

router.get("/player-reports", async (_req, res) => {
  const snap = await collections.playerReports.get();
  const rows = snap.docs.map((d) => d.data() as PlayerReportDoc);
  rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return res.status(200).json(rows.slice(0, 500));
});

router.get("/push-subscriptions", async (_req, res) => {
  const snap = await collections.pushSubscriptions.get();
  const rows = snap.docs.map((d) => {
    const raw = d.data() as PushSubscriptionDoc;
    return { ...raw, id: d.id };
  });
  rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return res.status(200).json(rows.slice(0, 200));
});

export default router;
