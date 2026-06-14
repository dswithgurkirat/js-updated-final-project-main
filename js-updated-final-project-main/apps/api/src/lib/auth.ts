import type { NextFunction, Request, Response } from "express";
import { Role, type User } from "@prisma/client";
import jwt, { type SignOptions } from "jsonwebtoken";
import { config } from "./config.js";
import { prisma } from "./prisma.js";

export type AuthUser = Pick<User, "id" | "username" | "email" | "fullName" | "role" | "district" | "blockName" | "sectionName" | "accessScope">;

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function roleToFrontend(role: Role) {
  const reviewerRoles: Role[] = [Role.REVIEWER, Role.REVIEWER_1, Role.REVIEWER_2, Role.IIT_ROPAR, Role.GIS];
  if (role === Role.ADMIN || role === Role.STATE_ADMIN) return "admin";
  if (role === Role.SDLC) return "sdlc";
  if (role === Role.DISTRICT_OWNER) return "authority";
  if (reviewerRoles.includes(role)) return "reviewer";
  return "user";
}

export function permissionsFor(role: Role) {
  const reviewerRoles: Role[] = [Role.REVIEWER, Role.REVIEWER_1, Role.REVIEWER_2, Role.IIT_ROPAR, Role.GIS, Role.DISTRICT_OWNER];
  const uploaderRoles: Role[] = [Role.OFFICER, Role.SDLC, Role.SDO, Role.JE, Role.AXEN];
  if (role === Role.ADMIN || role === Role.STATE_ADMIN) return ["UPLOAD", "REVIEW", "ADMIN"];
  if (reviewerRoles.includes(role)) return ["REVIEW"];
  if (uploaderRoles.includes(role)) return ["UPLOAD"];
  return [];
}

export function signToken(user: AuthUser) {
  return jwt.sign({ sub: String(user.id), role: user.role, username: user.username }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as SignOptions["expiresIn"]
  });
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization") || "";
  const cookieToken = typeof req.cookies?.[config.sessionCookieName] === "string" ? req.cookies[config.sessionCookieName] : "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : cookieToken;
  if (!token) {
    res.status(401).json({ error: "Not logged in" });
    return;
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as { sub?: string };
    const id = payload.sub ? BigInt(payload.sub) : 0n;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || !user.active) {
      res.status(401).json({ error: "Invalid session" });
      return;
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Invalid session" });
  }
}

export function requireAnyRole(roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: "Access denied" });
      return;
    }
    next();
  };
}

export function canUpload(role: Role) {
  return permissionsFor(role).includes("UPLOAD") || permissionsFor(role).includes("ADMIN");
}

export function canReview(role: Role) {
  return permissionsFor(role).includes("REVIEW") || permissionsFor(role).includes("ADMIN");
}

export function canAdmin(role: Role) {
  return role === Role.ADMIN || role === Role.STATE_ADMIN;
}
