import { Router } from "express";
import { ProjectStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export const dashboardRouter = Router();

dashboardRouter.get("/stats", async (_req, res) => {
  const [totalProjects, completedReports, generatedPdfs] = await Promise.all([
    prisma.project.count(),
    prisma.project.count({ where: { OR: [{ status: ProjectStatus.COMPLETED }, { progress: 100 }] } }),
    prisma.dsrFile.count({ where: { annexureId: "final" } })
  ]);

  res.json({
    totalProjects,
    completedReports,
    pendingReports: Math.max(totalProjects - completedReports, 0),
    generatedPdfs
  });
});
