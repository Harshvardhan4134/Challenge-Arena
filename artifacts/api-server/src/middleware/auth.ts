import { Request, Response, NextFunction } from "express";
import { resolveUserIdFromToken } from "../routes/auth";
import { collections, type UserDoc } from "../lib/firestore-db";
import { isUserBanned } from "../lib/user-view";

export interface AuthRequest extends Request {
  userId?: string;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
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

  req.userId = userId;
  return next();
}

export async function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (auth) {
    const token = auth.replace("Bearer ", "");
    const userId = await resolveUserIdFromToken(token);
    if (userId) {
      const userDoc = await collections.users.doc(userId).get();
      if (userDoc.exists) {
        const user = userDoc.data() as UserDoc;
        if (!isUserBanned(user)) req.userId = userId;
      }
    }
  }
  return next();
}
