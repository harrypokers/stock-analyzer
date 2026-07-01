import { Request, Response, NextFunction } from "express";

export interface AuthRequest extends Request {
  user?: { id: number; username: string };
}

// In-memory user storage
const users: { [key: string]: string } = {
  demo: "demo123",
};

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

    if (!users[username] || users[username] !== password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    req.user = { id: Math.random(), username };
    next();
  } catch (error) {
    res.status(401).json({ error: "Unauthorized" });
  }
}

export async function login(username: string, password: string) {
  if (!users[username] || users[username] !== password) {
    return null;
  }

  return { id: Math.random(), username };
}

export function registerUser(username: string, password: string) {
  if (users[username]) {
    return null;
  }
  users[username] = password;
  return { id: Math.random(), username };
}