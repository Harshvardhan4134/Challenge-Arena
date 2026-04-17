import { Router } from "express";
import crypto from "crypto";
import {
  CreateChallengeBody,
  JoinChallengeBody,
  SubmitResultBody,
  ShareRoomDetailsBody,
} from "@workspace/api-zod";
import { requireAuth, AuthRequest } from "../middleware/auth";
import {
  collections,
  nowIso,
  type ChallengeDoc,
  type MatchResultDoc,
  type PlayerStatsDoc,
  type TeamDoc,
  type TeamMemberDoc,
  type UserDoc,
} from "../lib/firestore-db";
import { notifyUser } from "../lib/notify-user";

const router = Router();

const MODE_SIZE: Record<string, number> = { "1v1": 1, "2v2": 2, "4v4": 4 };
const RULE_ALLOWLIST = new Set([
  "headshot_only",
  "no_gloo_wall",
  "no_revive",
  "no_spray",
  "sniper_only",
]);
const CHALLENGE_TTL_MS = 2 * 60 * 60 * 1000;
const RESULT_TIMEOUT_MS = 20 * 60 * 1000;

async function getTeamMembers(teamId: string): Promise<TeamMemberDoc[]> {
  const snap = await collections.teamMembers.where("teamId", "==", teamId).get();
  return snap.docs.map((d) => d.data() as TeamMemberDoc);
}

async function getUser(userId: string): Promise<UserDoc | null> {
  const doc = await collections.users.doc(userId).get();
  return doc.exists ? (doc.data() as UserDoc) : null;
}

async function upsertStats(userId: string, patch: Partial<PlayerStatsDoc>) {
  const statsDoc = await collections.playerStats.doc(userId).get();
  const current: PlayerStatsDoc = statsDoc.exists
    ? (statsDoc.data() as PlayerStatsDoc)
    : { userId, matchesPlayed: 0, wins: 0, losses: 0, winStreak: 0, weeklyWins: 0, weeklyReset: nowIso() };
  await collections.playerStats.doc(userId).set({ ...current, ...patch }, { merge: true });
}

export async function buildChallengeResponse(challenge: ChallengeDoc) {
  const teamADoc = await collections.teams.doc(challenge.teamAId).get();
  const teamA = teamADoc.exists ? (teamADoc.data() as TeamDoc) : null;
  const teamAMembers = await getTeamMembers(challenge.teamAId);
  const teamAMembersWithUsernames = await Promise.all(teamAMembers.map(async (m) => {
    const u = await getUser(m.userId);
    return { userId: m.userId, username: u?.username || "", ign: u?.ign || null, isLeader: m.isLeader, joinedAt: m.joinedAt };
  }));

  const maxSize = MODE_SIZE[challenge.mode] || 1;

  let teamBData = null;
  let pendingTeamBData = null;
  const now = Date.now();
  const scheduledAtMs = new Date(challenge.scheduledAt).getTime();
  const isExpired = ["open", "full", "in_progress"].includes(challenge.status) &&
    now > scheduledAtMs + CHALLENGE_TTL_MS;
  if (challenge.teamBId) {
    const teamBDoc = await collections.teams.doc(challenge.teamBId).get();
    const teamB = teamBDoc.exists ? (teamBDoc.data() as TeamDoc) : null;
    const teamBMembers = await getTeamMembers(challenge.teamBId);
    const teamBMembersWithUsernames = await Promise.all(teamBMembers.map(async (m) => {
      const u = await getUser(m.userId);
      return { userId: m.userId, username: u?.username || "", ign: u?.ign || null, isLeader: m.isLeader, joinedAt: m.joinedAt };
    }));
    if (teamB) {
      teamBData = { id: teamB.id, name: teamB.name, leaderId: teamB.leaderId, players: teamBMembersWithUsernames, maxSize };
    }
  }
  if (challenge.pendingTeamBId) {
    const pendingTeamBDoc = await collections.teams.doc(challenge.pendingTeamBId).get();
    const pendingTeamB = pendingTeamBDoc.exists ? (pendingTeamBDoc.data() as TeamDoc) : null;
    const pendingTeamBMembers = await getTeamMembers(challenge.pendingTeamBId);
    const pendingTeamBMembersWithUsernames = await Promise.all(pendingTeamBMembers.map(async (m) => {
      const u = await getUser(m.userId);
      return { userId: m.userId, username: u?.username || "", ign: u?.ign || null, isLeader: m.isLeader, joinedAt: m.joinedAt };
    }));
    if (pendingTeamB) {
      pendingTeamBData = { id: pendingTeamB.id, name: pendingTeamB.name, leaderId: pendingTeamB.leaderId, players: pendingTeamBMembersWithUsernames, maxSize };
    }
  }

  return {
    id: challenge.id,
    title: challenge.title,
    mode: challenge.mode,
    scheduledAt: challenge.scheduledAt,
    rules: challenge.rules || [],
    customRule: challenge.customRule,
    status: challenge.status,
    teamA: teamA ? { id: teamA.id, name: teamA.name, leaderId: teamA.leaderId, players: teamAMembersWithUsernames, maxSize } : null,
    teamB: teamBData,
    pendingTeamB: pendingTeamBData,
    pendingRequestedBy: challenge.pendingRequestedBy ?? null,
    pendingRequestedAt: challenge.pendingRequestedAt ?? null,
    roomId: challenge.roomId,
    roomPassword: challenge.roomPassword,
    createdAt: challenge.createdAt,
    creatorId: challenge.creatorId,
    winnerId: challenge.winnerId,
    isExpired,
    discoveryState: isExpired
      ? "expired"
      : challenge.status === "full"
        ? "full"
        : (() => {
            const hasTeamB = Boolean(teamBData);
            const teamASlots = maxSize - teamAMembersWithUsernames.length;
            const teamBSlots = hasTeamB ? maxSize - (teamBData?.players.length ?? 0) : maxSize;
            const totalOpenSlots = teamASlots + teamBSlots;
            return totalOpenSlots <= 1 ? "almost_full" : "open";
          })(),
  };
}

router.get("/", async (req, res) => {
  const { mode, status, hasSlots, state } = req.query;
  let challenges = (await collections.challenges.get()).docs.map((d) => d.data() as ChallengeDoc);

  const now = Date.now();
  if (mode) challenges = challenges.filter(c => c.mode === mode);
  if (status) challenges = challenges.filter(c => c.status === status);
  else challenges = challenges.filter(c => ["open", "full", "in_progress"].includes(c.status));
  challenges = challenges.filter((c) => {
    const scheduledAtMs = new Date(c.scheduledAt).getTime();
    if (Number.isNaN(scheduledAtMs)) return false;
    return now < scheduledAtMs;
  });

  const results = await Promise.all(challenges.map(buildChallengeResponse));

  let filtered = results;
  if (hasSlots === "true") {
    filtered = results.filter(c => {
      const maxSize = MODE_SIZE[c.mode] || 1;
      return c.teamA && c.teamA.players.length < maxSize;
    });
  }
  if (state) {
    filtered = filtered.filter((c) => c.discoveryState === state);
  }

  return res.status(200).json(filtered);
});

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  const parsed = CreateChallengeBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "validation", message: parsed.error.message });

  const { title, mode, scheduledAt, rules, customRule, teamName } = parsed.data;
  const userId = req.userId!;
  const parsedScheduledAt = new Date(scheduledAt);
  if (Number.isNaN(parsedScheduledAt.getTime())) {
    return res.status(400).json({ error: "validation", message: "Invalid scheduledAt date" });
  }
  const minLeadMs = 2 * 60 * 1000;
  const maxFutureMs = 14 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const scheduleDelta = parsedScheduledAt.getTime() - now;
  if (scheduleDelta < minLeadMs || scheduleDelta > maxFutureMs) {
    return res.status(400).json({ error: "validation", message: "Challenge time must be 2 minutes to 14 days from now" });
  }
  const normalizedRules = (rules || []).filter((r) => RULE_ALLOWLIST.has(r));
  if ((rules || []).length !== normalizedRules.length) {
    return res.status(400).json({ error: "validation", message: "One or more rules are invalid" });
  }
  if ((customRule ?? "").trim().length > 280) {
    return res.status(400).json({ error: "validation", message: "Custom rule must be 280 characters or less" });
  }

  const teamId = crypto.randomUUID();
  const team: TeamDoc = { id: teamId, name: teamName, leaderId: userId, createdAt: nowIso() };
  await collections.teams.doc(teamId).set(team);
  const memberId = crypto.randomUUID();
  await collections.teamMembers.doc(memberId).set({
    id: memberId,
    teamId,
    userId,
    isLeader: true,
    joinedAt: nowIso(),
  } satisfies TeamMemberDoc);

  const challengeId = crypto.randomUUID();
  const challenge: ChallengeDoc = {
    id: challengeId,
    title,
    mode: mode as "1v1" | "2v2" | "4v4",
    scheduledAt: parsedScheduledAt.toISOString(),
    rules: normalizedRules,
    customRule: customRule?.trim() ? customRule.trim() : null,
    teamAId: teamId,
    creatorId: userId,
    status: "open",
    teamBId: null,
    roomId: null,
    roomPassword: null,
    winnerId: null,
    createdAt: nowIso(),
    matchReminder15mSent: false,
  };
  await collections.challenges.doc(challengeId).set(challenge);

  return res.status(201).json(await buildChallengeResponse(challenge));
});

router.get("/:challengeId", async (req, res) => {
  const { challengeId } = req.params;
  const challengeDoc = await collections.challenges.doc(challengeId).get();
  if (!challengeDoc.exists) return res.status(404).json({ error: "not_found", message: "Challenge not found" });
  const challenge = challengeDoc.data() as ChallengeDoc;
  return res.status(200).json(await buildChallengeResponse(challenge));
});

router.delete("/:challengeId", requireAuth, async (req: AuthRequest, res) => {
  const { challengeId } = req.params;
  const challengeDoc = await collections.challenges.doc(challengeId).get();
  if (!challengeDoc.exists) return res.status(404).json({ error: "not_found", message: "Challenge not found" });
  const challenge = challengeDoc.data() as ChallengeDoc;
  if (challenge.creatorId !== req.userId) return res.status(403).json({ error: "forbidden", message: "Not the creator" });

  await collections.challenges.doc(challengeId).set({ status: "cancelled" }, { merge: true });
  return res.status(200).json({ success: true, message: "Challenge cancelled" });
});

router.post("/:challengeId/join", requireAuth, async (req: AuthRequest, res) => {
  const { challengeId } = req.params;
  const parsed = JoinChallengeBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "validation", message: parsed.error.message });

  const { side, teamName } = parsed.data;
  const userId = req.userId!;

  const challengeDoc = await collections.challenges.doc(challengeId).get();
  if (!challengeDoc.exists) return res.status(404).json({ error: "not_found", message: "Challenge not found" });
  const challenge = challengeDoc.data() as ChallengeDoc;
  const startsAtMs = new Date(challenge.scheduledAt).getTime();
  if (Date.now() > startsAtMs + CHALLENGE_TTL_MS) {
    return res.status(400).json({ error: "expired", message: "Challenge has expired" });
  }
  if (Date.now() >= startsAtMs) {
    return res.status(400).json({ error: "started", message: "Match has already started" });
  }
  if (challenge.status !== "open") return res.status(400).json({ error: "closed", message: "Challenge is not open" });

  const maxSize = MODE_SIZE[challenge.mode] || 1;

  if (side === "teamA") {
    const members = await getTeamMembers(challenge.teamAId);
    if (members.length >= maxSize) return res.status(400).json({ error: "full", message: "Team A is full" });
    const alreadyIn = members.some(m => m.userId === userId);
    if (alreadyIn) return res.status(400).json({ error: "duplicate", message: "Already in team A" });
    const id = crypto.randomUUID();
    await collections.teamMembers.doc(id).set({ id, teamId: challenge.teamAId, userId, isLeader: false, joinedAt: nowIso() } satisfies TeamMemberDoc);
  } else {
    if (!challenge.teamBId && !challenge.pendingTeamBId) {
      const resolvedTeamName = teamName?.trim() || "Challengers";
      const newTeamBId = crypto.randomUUID();
      await collections.teams.doc(newTeamBId).set({ id: newTeamBId, name: resolvedTeamName, leaderId: userId, createdAt: nowIso() } satisfies TeamDoc);
      const memberIdB = crypto.randomUUID();
      await collections.teamMembers.doc(memberIdB).set({ id: memberIdB, teamId: newTeamBId, userId, isLeader: true, joinedAt: nowIso() } satisfies TeamMemberDoc);
      await collections.challenges.doc(challengeId).set({
        pendingTeamBId: newTeamBId,
        pendingRequestedBy: userId,
        pendingRequestedAt: nowIso(),
      }, { merge: true });
      const teamALeaderDoc = await collections.teams.doc(challenge.teamAId).get();
      const teamALeaderId = teamALeaderDoc.exists ? (teamALeaderDoc.data() as TeamDoc).leaderId : null;
      if (teamALeaderId) {
        await notifyUser(teamALeaderId, {
          type: "challenge_request",
          title: "Challenge request pending",
          message: `${resolvedTeamName} wants to challenge you. Accept to start.`,
          challengeId,
        });
      }
      const pendingDoc = await collections.challenges.doc(challengeId).get();
      return res.status(200).json(await buildChallengeResponse(pendingDoc.data() as ChallengeDoc));
    } else if (challenge.pendingTeamBId && !challenge.teamBId) {
      return res.status(400).json({ error: "pending", message: "Challenge request already pending approval" });
    } else {
      const members = await getTeamMembers(challenge.teamBId);
      if (members.length >= maxSize) return res.status(400).json({ error: "full", message: "Team B is full" });
      const alreadyIn = members.some(m => m.userId === userId);
      if (alreadyIn) return res.status(400).json({ error: "duplicate", message: "Already in team B" });
      const id = crypto.randomUUID();
      await collections.teamMembers.doc(id).set({ id, teamId: challenge.teamBId, userId, isLeader: false, joinedAt: nowIso() } satisfies TeamMemberDoc);
    }
  }

  const refreshedDoc = await collections.challenges.doc(challengeId).get();
  const refreshed = refreshedDoc.data() as ChallengeDoc;
  const teamAMembers = await getTeamMembers(challenge.teamAId);
  const teamBId = refreshed.teamBId;
  const teamBMembers = teamBId ? await getTeamMembers(teamBId) : [];

  const totalA = teamAMembers.length;
  const totalB = teamBMembers.length;
  let newStatus: "open" | "full" = "open";
  if (totalA >= maxSize && totalB >= maxSize) newStatus = "full";
  await collections.challenges.doc(challengeId).set({ status: newStatus }, { merge: true });

  const teamALeaderDoc = await collections.teams.doc(challenge.teamAId).get();
  const teamALeaderId = teamALeaderDoc.exists ? (teamALeaderDoc.data() as TeamDoc).leaderId : null;
  if (teamALeaderId) {
    await notifyUser(teamALeaderId, {
      type: "player_joined",
      title: "Player joined",
      message: "A new player joined your challenge.",
      challengeId,
    });
  }

  const finalDoc = await collections.challenges.doc(challengeId).get();
  return res.status(200).json(await buildChallengeResponse(finalDoc.data() as ChallengeDoc));
});

router.post("/:challengeId/leave", requireAuth, async (req: AuthRequest, res) => {
  const { challengeId } = req.params;
  const userId = req.userId!;

  const challengeDoc = await collections.challenges.doc(challengeId).get();
  if (!challengeDoc.exists) return res.status(404).json({ error: "not_found", message: "Challenge not found" });
  const challenge = challengeDoc.data() as ChallengeDoc;

  const teamIds = [challenge.teamAId, challenge.teamBId].filter(Boolean) as string[];
  for (const teamId of teamIds) {
    const memberSnap = await collections.teamMembers.where("teamId", "==", teamId).where("userId", "==", userId).limit(1).get();
    if (!memberSnap.empty) {
      await memberSnap.docs[0].ref.delete();
      break;
    }
  }

  return res.status(200).json({ success: true, message: "Left challenge" });
});

router.post("/:challengeId/result", requireAuth, async (req: AuthRequest, res) => {
  const { challengeId } = req.params;
  const parsed = SubmitResultBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "validation", message: parsed.error.message });

  const { winningSide, screenshotUrl } = parsed.data;
  const userId = req.userId!;

  const challengeDoc = await collections.challenges.doc(challengeId).get();
  if (!challengeDoc.exists) return res.status(404).json({ error: "not_found", message: "Challenge not found" });
  const challenge = challengeDoc.data() as ChallengeDoc;
  if (!challenge.teamBId) return res.status(400).json({ error: "invalid_state", message: "Challenge does not have two teams yet" });
  if (winningSide !== "not_played" && !screenshotUrl?.trim()) {
    return res.status(400).json({ error: "validation", message: "Result proof image is required" });
  }

  const teamIds = [challenge.teamAId, challenge.teamBId].filter(Boolean) as string[];
  const membersSnap = await collections.teamMembers.get();
  const members = membersSnap.docs.map((d) => d.data() as TeamMemberDoc).filter((m) => teamIds.includes(m.teamId));
  const submitter = members.find((m) => m.userId === userId);
  if (!submitter) return res.status(403).json({ error: "forbidden", message: "Only participants can submit results" });

  const existingSnap = await collections.matchResults.where("challengeId", "==", challengeId).limit(1).get();
  const existing = existingSnap.empty ? [] : [existingSnap.docs[0].data() as MatchResultDoc];

  if (existing.length > 0) {
    const prev = existing[0];
    const isTimedOut =
      prev.status === "pending" && Date.now() - new Date(prev.createdAt).getTime() > RESULT_TIMEOUT_MS;
    if (isTimedOut) {
      await collections.matchResults.doc(prev.id).set({ status: "disputed" }, { merge: true });
      await collections.challenges.doc(challengeId).set({ status: "disputed" }, { merge: true });
    }
    if (prev.winningSide === winningSide) {
      await collections.matchResults.doc(prev.id).set({ status: "confirmed" }, { merge: true });
      if (winningSide === "not_played") {
        await collections.challenges.doc(challengeId).set({ status: "cancelled", winnerId: null }, { merge: true });
        const resultDoc = await collections.matchResults.doc(prev.id).get();
        return res.status(200).json(resultDoc.data() as MatchResultDoc);
      }
      const winnerTeamId = winningSide === "teamA" ? challenge.teamAId : challenge.teamBId;
      const loserTeamId = winningSide === "teamA" ? challenge.teamBId : challenge.teamAId;
      if (winnerTeamId) {
        const winnerMembers = await getTeamMembers(winnerTeamId);
        for (const m of winnerMembers) {
          const statsDoc = await collections.playerStats.doc(m.userId).get();
          const existingStats = statsDoc.exists ? (statsDoc.data() as PlayerStatsDoc) : { userId: m.userId, matchesPlayed: 0, wins: 0, losses: 0, winStreak: 0, weeklyWins: 0, weeklyReset: nowIso() };
          await upsertStats(m.userId, {
            wins: (existingStats.wins ?? 0) + 1,
            matchesPlayed: (existingStats.matchesPlayed ?? 0) + 1,
            weeklyWins: (existingStats.weeklyWins ?? 0) + 1,
            winStreak: (existingStats.winStreak ?? 0) + 1,
          });
        }
      }
      if (loserTeamId) {
        const loserMembers = await getTeamMembers(loserTeamId);
        for (const m of loserMembers) {
          const statsDoc = await collections.playerStats.doc(m.userId).get();
          const existingStats = statsDoc.exists ? (statsDoc.data() as PlayerStatsDoc) : { userId: m.userId, matchesPlayed: 0, wins: 0, losses: 0, winStreak: 0, weeklyWins: 0, weeklyReset: nowIso() };
          await upsertStats(m.userId, {
            losses: (existingStats.losses ?? 0) + 1,
            matchesPlayed: (existingStats.matchesPlayed ?? 0) + 1,
            winStreak: 0,
          });
        }
      }
      await collections.challenges.doc(challengeId).set({ status: "completed", winnerId: challenge[winningSide === "teamA" ? "teamAId" : "teamBId"] as string }, { merge: true });
    } else {
      await collections.matchResults.doc(prev.id).set({ status: "disputed" }, { merge: true });
      await collections.challenges.doc(challengeId).set({ status: "disputed" }, { merge: true });
    }
    const resultDoc = await collections.matchResults.doc(prev.id).get();
    return res.status(200).json(resultDoc.data() as MatchResultDoc);
  }

  const result: MatchResultDoc = {
    id: crypto.randomUUID(),
    challengeId,
    submittedBy: userId,
    winningSide: winningSide as "teamA" | "teamB" | "not_played",
    screenshotUrl: screenshotUrl?.trim() ? screenshotUrl.trim() : null,
    status: winningSide === "not_played" ? "confirmed" : "pending",
    createdAt: nowIso(),
  };
  await collections.matchResults.doc(result.id).set(result);

  if (winningSide === "not_played") {
    await collections.challenges.doc(challengeId).set({ status: "cancelled", winnerId: null }, { merge: true });
    return res.status(200).json(result);
  }

  const opponentTeamId = submitter.teamId === challenge.teamAId ? challenge.teamBId : challenge.teamAId;
  if (opponentTeamId) {
    const opponentTeamDoc = await collections.teams.doc(opponentTeamId).get();
    const opponentTeam = opponentTeamDoc.exists ? (opponentTeamDoc.data() as TeamDoc) : null;
    if (opponentTeam?.leaderId) {
      await notifyUser(opponentTeam.leaderId, {
        type: "match_result",
        title: "Result submitted",
        message: "Opponent submitted result. Confirm or dispute within 20 minutes.",
        challengeId,
      });
    }
  }

  return res.status(200).json(result);
});

router.post("/:challengeId/accept-challenger", requireAuth, async (req: AuthRequest, res) => {
  const { challengeId } = req.params;
  const userId = req.userId!;
  const challengeDoc = await collections.challenges.doc(challengeId).get();
  if (!challengeDoc.exists) return res.status(404).json({ error: "not_found", message: "Challenge not found" });
  const challenge = challengeDoc.data() as ChallengeDoc;

  const teamADoc = await collections.teams.doc(challenge.teamAId).get();
  const teamA = teamADoc.exists ? (teamADoc.data() as TeamDoc) : null;
  if (!teamA || teamA.leaderId !== userId) {
    return res.status(403).json({ error: "forbidden", message: "Only the challenge host can accept this request" });
  }
  if (challenge.teamBId) {
    return res.status(400).json({ error: "invalid_state", message: "Challenge already accepted" });
  }
  if (!challenge.pendingTeamBId) {
    return res.status(400).json({ error: "invalid_state", message: "No pending challenge request" });
  }
  if (Date.now() >= new Date(challenge.scheduledAt).getTime()) {
    return res.status(400).json({ error: "started", message: "Match has already started" });
  }

  const maxSize = MODE_SIZE[challenge.mode] || 1;
  const teamAMembers = await getTeamMembers(challenge.teamAId);
  const teamBMembers = await getTeamMembers(challenge.pendingTeamBId);
  const nextStatus: "open" | "full" = teamAMembers.length >= maxSize && teamBMembers.length >= maxSize ? "full" : "open";

  await collections.challenges.doc(challengeId).set({
    teamBId: challenge.pendingTeamBId,
    pendingTeamBId: null,
    pendingRequestedBy: null,
    pendingRequestedAt: null,
    status: nextStatus,
  }, { merge: true });

  const pendingTeamDoc = await collections.teams.doc(challenge.pendingTeamBId).get();
  const pendingTeam = pendingTeamDoc.exists ? (pendingTeamDoc.data() as TeamDoc) : null;
  if (pendingTeam?.leaderId) {
    await notifyUser(pendingTeam.leaderId, {
      type: "challenge_accepted",
      title: "Challenge accepted",
      message: `${teamA.name} accepted your challenge request.`,
      challengeId,
    });
  }

  const finalDoc = await collections.challenges.doc(challengeId).get();
  return res.status(200).json(await buildChallengeResponse(finalDoc.data() as ChallengeDoc));
});

router.post("/:challengeId/room", requireAuth, async (req: AuthRequest, res) => {
  const { challengeId } = req.params;
  const parsed = ShareRoomDetailsBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "validation", message: parsed.error.message });

  const { roomId, roomPassword } = parsed.data;
  const userId = req.userId!;

  const challengeDoc = await collections.challenges.doc(challengeId).get();
  if (!challengeDoc.exists) return res.status(404).json({ error: "not_found", message: "Challenge not found" });
  const challenge = challengeDoc.data() as ChallengeDoc;
  if (Date.now() >= new Date(challenge.scheduledAt).getTime()) {
    return res.status(400).json({ error: "started", message: "Cannot share room after match start time" });
  }

  const teamADoc = await collections.teams.doc(challenge.teamAId).get();
  const teamA = teamADoc.exists ? (teamADoc.data() as TeamDoc) : null;
  if (!teamA || teamA.leaderId !== userId) return res.status(403).json({ error: "forbidden", message: "Only Team A leader can share room details" });

  await collections.challenges.doc(challengeId).set({ roomId, roomPassword, status: "in_progress" }, { merge: true });

  const teamIds = [challenge.teamAId, challenge.teamBId].filter(Boolean) as string[];
  for (const teamId of teamIds) {
    const members = await getTeamMembers(teamId);
    for (const m of members) {
      if (m.userId !== userId) {
        await notifyUser(m.userId, {
          type: "match_starting",
          title: "Match starting",
          message: `Room is ready! Room ID: ${roomId}`,
          challengeId,
        });
      }
    }
  }

  return res.status(200).json({ success: true, message: "Room details shared" });
});

export default router;
