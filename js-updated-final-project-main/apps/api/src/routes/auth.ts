import { Router } from "express";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { z } from "zod";
import { permissionsFor, roleToFrontend, signToken } from "../lib/auth.js";
import { recordAudit } from "../lib/audit.js";
import { config } from "../lib/config.js";
import { prisma } from "../lib/prisma.js";
import { jsonSafe } from "../lib/json.js";

const loginSchema = z.object({
  username: z.string().trim().min(3).max(254),
  password: z.string().min(1).max(256)
});

const registerSchema = z.object({
  username: z.string().trim().min(3).max(64).optional(),
  email: z.string().email(),
  fullName: z.string().min(1),
  password: z.string().min(10).max(128).regex(/[A-Za-z]/).regex(/[0-9]/)
});

const cookieOptions = {
  httpOnly: true,
  secure: config.isProduction,
  sameSite: "strict" as const,
  path: "/",
  maxAge: 15 * 60 * 1000
};

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Username and password are required" });
    return;
  }

  const usernameOrEmail = parsed.data.username.toLowerCase();
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ username: usernameOrEmail }, { email: usernameOrEmail }]
    }
  });

  if (!user || !(await bcrypt.compare(parsed.data.password, user.password))) {
    recordAudit(req, "AUTH_LOGIN_FAILED", { username: usernameOrEmail }, 401);
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  const token = signToken(user);
  res.cookie(config.sessionCookieName, token, cookieOptions);
  recordAudit(req, "AUTH_LOGIN_SUCCESS", { username: user.username, role: user.role }, 200);
  res.json(
    jsonSafe({
      token,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: `ROLE_${user.role}`,
      uiRole: roleToFrontend(user.role),
      permissions: permissionsFor(user.role),
      scope: {
        district: user.district,
        blockName: user.blockName,
        sectionName: user.sectionName
      },
      accessLabel: user.accessScope || user.role.replaceAll("_", " ")
    })
  );
});

authRouter.post("/logout", async (req, res) => {
  res.clearCookie(config.sessionCookieName, { path: "/" });
  recordAudit(req, "AUTH_LOGOUT", undefined, 200);
  res.json({ success: true });
});

authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid registration details" });
    return;
  }

  const username = parsed.data.username || parsed.data.email;
  const exists = await prisma.user.findFirst({
    where: { OR: [{ username }, { email: parsed.data.email }] }
  });
  if (exists) {
    res.status(409).json({ error: "User already exists" });
    return;
  }

  const user = await prisma.user.create({
    data: {
      username,
      email: parsed.data.email,
      fullName: parsed.data.fullName,
      password: await bcrypt.hash(parsed.data.password, 10),
      role: Role.OFFICER,
      active: true
    }
  });

  res.json(jsonSafe({ success: true, username: user.username, fullName: user.fullName }));
});
