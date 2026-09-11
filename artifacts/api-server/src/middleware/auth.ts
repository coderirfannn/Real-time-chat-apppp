import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { requireJwtSecret } from "../config/env";

export type AuthenticatedRequest = Request & { userId?: string };

export function readToken(req: Request) {
  const cookieToken = req.cookies?.chat_token as string | undefined;
  const authorization = req.headers.authorization;
  const bearerToken = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : undefined;
  return cookieToken ?? bearerToken;
}

export function signUserToken(userId: string) {
  return jwt.sign({ userId }, requireJwtSecret(), { expiresIn: "7d" });
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const token = readToken(req);
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const payload = jwt.verify(token, requireJwtSecret()) as { userId?: string };
    if (!payload.userId) throw new Error("Invalid token");
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: "Your session has expired. Please log in again." });
  }
}