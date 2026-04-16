import { Request, Response, NextFunction } from "express";
import { getUserIdFromToken } from "../routes/auth";

export interface AuthRequest extends Request {
  userId?: string;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "unauthorized", message: "No token" });
  const token = auth.replace("Bearer ", "");
  const userId = getUserIdFromToken(token);
  if (!userId) return res.status(401).json({ error: "unauthorized", message: "Invalid token" });
  req.userId = userId;
  next();
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (auth) {
    const token = auth.replace("Bearer ", "");
    const userId = getUserIdFromToken(token);
    if (userId) req.userId = userId;
  }
  next();
}
