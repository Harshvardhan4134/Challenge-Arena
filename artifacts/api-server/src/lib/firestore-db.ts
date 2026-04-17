import { getFirestore } from "firebase-admin/firestore";

export const firestore = getFirestore();

export type UserDoc = {
  id: string;
  username: string;
  passwordHash: string;
  email: string | null;
  /** E.164-style or local digits; used for WhatsApp match alerts when configured */
  whatsappPhone?: string | null;
  freefireUid: string | null;
  ign: string | null;
  gender: "male" | "female" | "other" | null;
  createdAt: string;
};

export type PlayerStatsDoc = {
  userId: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  winStreak: number;
  weeklyWins: number;
  weeklyReset: string;
};

export type TeamDoc = {
  id: string;
  name: string;
  leaderId: string;
  createdAt: string;
};

export type TeamMemberDoc = {
  id: string;
  teamId: string;
  userId: string;
  isLeader: boolean;
  joinedAt: string;
};

export type ChallengeStatus = "open" | "full" | "in_progress" | "completed" | "cancelled" | "disputed";

export type ChallengeDoc = {
  id: string;
  title: string;
  mode: "1v1" | "2v2" | "4v4";
  scheduledAt: string;
  rules: string[];
  customRule: string | null;
  status: ChallengeStatus;
  teamAId: string;
  teamBId: string | null;
  pendingTeamBId?: string | null;
  pendingRequestedBy?: string | null;
  pendingRequestedAt?: string | null;
  roomId: string | null;
  roomPassword: string | null;
  creatorId: string;
  winnerId: string | null;
  createdAt: string;
  /** When true, 15-minute pre-match reminder was already sent to leaders */
  matchReminder15mSent?: boolean;
};

export type PushSubscriptionDoc = {
  id: string;
  userId: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  createdAt: string;
};

export type MatchResultDoc = {
  id: string;
  challengeId: string;
  submittedBy: string;
  winningSide: "teamA" | "teamB";
  screenshotUrl: string | null;
  status: "pending" | "confirmed" | "disputed";
  createdAt: string;
};

export type MessageDoc = {
  id: string;
  challengeId: string;
  senderId: string;
  content: string;
  createdAt: string;
};

export type NotificationDoc = {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  challengeId: string | null;
  isRead: boolean;
  createdAt: string;
};

export const collections = {
  users: firestore.collection("users"),
  playerStats: firestore.collection("playerStats"),
  teams: firestore.collection("teams"),
  teamMembers: firestore.collection("teamMembers"),
  challenges: firestore.collection("challenges"),
  matchResults: firestore.collection("matchResults"),
  messages: firestore.collection("messages"),
  notifications: firestore.collection("notifications"),
  pushSubscriptions: firestore.collection("pushSubscriptions"),
};

export function nowIso(): string {
  return new Date().toISOString();
}

export function byCreatedDesc<T extends { createdAt: string }>(a: T, b: T) {
  return b.createdAt.localeCompare(a.createdAt);
}
