import { Router } from "express";
import { ReportStatus } from "@prisma/client";
import { canReview, canUpload } from "../lib/auth.js";
import { jsonSafe } from "../lib/json.js";
import { prisma } from "../lib/prisma.js";
import { projectName } from "../lib/projects.js";
import { boundedString, parseBigIntParam } from "../lib/validation.js";

export const reportsRouter = Router();

reportsRouter.get("/", async (_req, res) => {
  const reports = await prisma.report.findMany({ orderBy: { createdAt: "desc" } });
  res.json(jsonSafe(reports));
});

reportsRouter.post("/", async (req, res) => {
  if (!canUpload(req.user!.role)) {
    res.status(403).json({ error: "Access denied" });
    return;
  }
  const report = await prisma.report.create({
    data: {
      reportNumber: req.body?.reportNumber,
      projectId: req.body?.projectId ? BigInt(req.body.projectId) : null,
      title: req.body?.title || "District Survey Report",
      description: req.body?.description,
      reportType: req.body?.reportType,
      submittedBy: req.user!.id
    }
  });
  res.json(jsonSafe(report));
});

reportsRouter.patch("/:id/status", async (req, res) => {
  if (!canReview(req.user!.role)) {
    res.status(403).json({ error: "Access denied" });
    return;
  }
  const id = parseBigIntParam(req.params.id, res, "report id");
  if (!id) return;
  const status = String(req.query.status || req.body?.status || "UNDER_REVIEW").toUpperCase() as ReportStatus;
  if (!Object.values(ReportStatus).includes(status)) {
    res.status(400).json({ error: "Invalid report status" });
    return;
  }
  const report = await prisma.report.update({ where: { id }, data: { status } });
  res.json(jsonSafe(report));
});

reportsRouter.post("/:id/workflow", async (req, res) => {
  const action = String(req.body?.action || "SUBMIT").trim().toUpperCase();
  const reviewActions = ["RETURN", "REJECT", "APPROVE", "FORWARD"];
  if (reviewActions.includes(action) && !canReview(req.user!.role)) {
    res.status(403).json({ error: "Access denied" });
    return;
  }
  if (!reviewActions.includes(action) && !canUpload(req.user!.role) && !canReview(req.user!.role)) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const reportId = parseBigIntParam(req.params.id, res, "report id");
  if (!reportId) return;
  const project = await prisma.project.findUnique({ where: { id: reportId } }).catch(() => null);
  const entry = await prisma.workflowHistory.create({
    data: {
      reportId,
      action,
      remarks: boundedString(req.body?.remarks, 2000),
      performedBy: req.user!.id
    }
  });

  res.json(
    jsonSafe({
      ...entry,
      projectId: Number(reportId),
      projectName: projectName(project),
      performedBy: req.user!.fullName,
      performedAt: entry.performedAt.toISOString()
    })
  );
});

reportsRouter.get("/:id/history", async (req, res) => {
  const id = parseBigIntParam(req.params.id, res, "report id");
  if (!id) return;
  const history = await prisma.workflowHistory.findMany({
    where: { reportId: id },
    orderBy: { performedAt: "desc" }
  });
  res.json(jsonSafe(history));
});

reportsRouter.get("/audit-logs", async (req, res) => {
  const logs = await prisma.workflowHistory.findMany({ orderBy: { performedAt: "desc" } });
  const projectIds = [...new Set(logs.map((log) => log.reportId))];
  const projects = await prisma.project.findMany({ where: { id: { in: projectIds } } });
  const projectsById = new Map(projects.map((project) => [project.id.toString(), project]));
  res.json(
    jsonSafe(
      logs.map((log) => ({
        projectId: Number(log.reportId),
        projectName: projectName(projectsById.get(log.reportId.toString())),
        performedBy: log.performedBy ? Number(log.performedBy) : "system",
        action: log.action,
        remarks: log.remarks || "",
        performedAt: log.performedAt.toISOString()
      }))
    )
  );
});
