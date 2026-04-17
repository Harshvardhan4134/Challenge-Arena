import type { UserDoc } from "./firestore-db";

const adminUsernameSet = (): Set<string> =>
  new Set(
    (process.env["ADMIN_USERNAMES"] ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );

/** Admin if `user.isAdmin` in Firestore or username listed in ADMIN_USERNAMES (comma-separated). */
export function isAdminUser(user: UserDoc): boolean {
  if (user.isAdmin === true) return true;
  const env = adminUsernameSet();
  if (env.size === 0) return false;
  return user.username ? env.has(user.username.toLowerCase()) : false;
}

export function toSafeUser(user: UserDoc) {
  const { passwordHash: _, ...rest } = user;
  return { ...rest, isAdmin: isAdminUser(user) };
}
