import type { UserDoc } from "./firestore-db";

const adminUsernameSet = (): Set<string> =>
  new Set(
    (process.env["ADMIN_USERNAMES"] ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );

const adminEmailSet = (): Set<string> =>
  new Set(
    (process.env["ADMIN_EMAILS"] ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );

/** Admin if `user.isAdmin` in Firestore or present in ADMIN_USERNAMES/ADMIN_EMAILS. */
export function isAdminUser(user: UserDoc): boolean {
  if (user.isAdmin === true) return true;
  const usernameEnv = adminUsernameSet();
  const emailEnv = adminEmailSet();
  const byUsername = user.username ? usernameEnv.has(user.username.toLowerCase()) : false;
  const byEmail = user.email ? emailEnv.has(user.email.toLowerCase()) : false;
  return byUsername || byEmail;
}

export function toSafeUser(user: UserDoc) {
  const { passwordHash: _, ...rest } = user;
  return { ...rest, isAdmin: isAdminUser(user) };
}
