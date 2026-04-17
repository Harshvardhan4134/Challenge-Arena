import type { UserDoc } from "./firestore-db";

function splitEnvList(raw: string | undefined): string[] {
  return String(raw ?? "")
    .split(/[,;\n]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * ADMIN_USERNAMES may list usernames or emails (contains @).
 * ADMIN_EMAILS is only emails. Duplicates are ignored.
 */
function adminSets(): { usernames: Set<string>; emails: Set<string> } {
  const usernames = new Set<string>();
  const emails = new Set<string>();
  for (const entry of splitEnvList(process.env["ADMIN_USERNAMES"])) {
    (entry.includes("@") ? emails : usernames).add(entry);
  }
  for (const entry of splitEnvList(process.env["ADMIN_EMAILS"])) {
    emails.add(entry);
  }
  return { usernames, emails };
}

function emailLocalPart(email: string): string {
  const e = email.toLowerCase().trim();
  const i = e.indexOf("@");
  return i > 0 ? e.slice(0, i) : "";
}

/**
 * Admin if `user.isAdmin` in Firestore or present in ADMIN_USERNAMES/ADMIN_EMAILS.
 * Also: username matching the part before @ on any listed admin email (Google signup often
 * suggests that as username even when `user.email` was not stored in Firestore yet).
 */
export function isAdminUser(user: UserDoc): boolean {
  if (user.isAdmin === true) return true;
  const { usernames, emails } = adminSets();
  const uname = user.username?.toLowerCase() ?? "";
  if (uname && usernames.has(uname)) return true;
  if (user.email && emails.has(user.email.toLowerCase())) return true;
  if (uname) {
    for (const em of emails) {
      const local = emailLocalPart(em);
      if (local && local === uname) return true;
    }
  }
  return false;
}

export function toSafeUser(user: UserDoc) {
  const { passwordHash: _, ...rest } = user;
  return { ...rest, isAdmin: isAdminUser(user) };
}
