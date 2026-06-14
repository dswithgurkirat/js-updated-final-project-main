import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

function clientIp(req: Request) {
  const forwardedFor = req.header("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim();
  return req.ip || req.socket.remoteAddress || undefined;
}

export function recordAudit(req: Request, action: string, metadata?: Record<string, unknown>, status?: number) {
  const safeMetadata = metadata ? (JSON.parse(JSON.stringify(metadata)) as Prisma.InputJsonValue) : undefined;
  prisma.auditLog
    .create({
      data: {
        userId: req.user?.id,
        action,
        method: req.method,
        path: req.originalUrl,
        ip: clientIp(req),
        userAgent: req.header("user-agent") || undefined,
        status,
        metadata: safeMetadata
      }
    })
    .catch((error) => {
      console.error("Audit log write failed", error);
    });
}

export function auditMutations(req: Request, res: Response, next: NextFunction) {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    next();
    return;
  }

  res.on("finish", () => {
    recordAudit(req, `${req.method}_${req.path.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "").toUpperCase() || "API"}`, undefined, res.statusCode);
  });

  next();
}
