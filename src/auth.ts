import { Request, Response, NextFunction } from "express";
import { getUserByUsername } from "./db.js";

export interface AuthRequest extends Request {
  user?: { id: number; username: string };
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const credentials = Buffer.from(authHeader.slice(6), "base64").toString();
    const [username, password] = credentials.split(":");

    const user = await getUserByUsername(username);

    if (!user || user.password !== password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    req.user = { id: user.id, username: user.username };
    next();
  } catch (error) {
    res.status(401).json({ error: "Unauthorized" });
  }
}

export async function login(username: string, password: string) {
  const user = await getUserByUsername(username);

  if (!user || user.password !== password) {
    return null;
  }

  return { id: user.id, username: user.username };
}