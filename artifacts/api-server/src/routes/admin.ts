import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireAdmin } from "../middleware/requireAdmin";
import {
  collections,
  byCreatedDesc,
  type ChallengeDoc,
  type MatchResultDoc,
  type NotificationDoc,
  type PlayerStatsDoc,
  type PushSubscriptionDoc,
  type UserDoc,
} from "../lib/firestore-db";
import { toSafeUser } from "../lib/user-view";
import { buildChallengeResponse } from "./challenges";

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

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
