import { Response, NextFunction } from "express";
import { collections, type UserDoc } from "../lib/firestore-db";
import { isAdminUser } from "../lib/user-view";
import type { AuthRequest } from "./auth";

export async function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ error: "unauthorized", message: "No token" });
  }
  const userDoc = await collections.users.doc(userId).get();
  if (!userDoc.exists) {
    return res.status(403).json({ error: "forbidden", message: "Admin only" });
  }
  const user = userDoc.data() as UserDoc;
  if (!isAdminUser(user)) {
    return res.status(403).json({ error: "forbidden", message: "Admin only" });
  }
  return next();
}
