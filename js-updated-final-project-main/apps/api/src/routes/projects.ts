import { Router } from "express";
import { ProjectStatus, Role } from "@prisma/client";
import { canAdmin } from "../lib/auth.js";
import { jsonSafe } from "../lib/json.js";
import { prisma } from "../lib/prisma.js";
import { toProjectDto } from "../lib/projects.js";
import { deletePdf } from "../lib/storage.js";
import { parseBigIntParam } from "../lib/validation.js";

export const projectsRouter = Router();

function parseStatus(status: unknown) {
  const value = String(status || "").toUpperCase().replaceAll(" ", "_");
  if (value === "COMPLETED") return ProjectStatus.COMPLETED;
  if (value === "ACTIVE") return ProjectStatus.ACTIVE;
  if (value === "ARCHIVED") return ProjectStatus.ARCHIVED;
  return ProjectStatus.IN_PROGRESS;
}

function visibleWhere(userRole: Role, district?: string | null) {
  if (canAdmin(userRole) || userRole === Role.REVIEWER || userRole === Role.IIT_ROPAR || userRole === Role.GIS) return {};
  if (district) return { district };
  return {};
}

function readProjectState(projectState?: string | null) {
  if (!projectState) return {};
  try {
    const parsed = JSON.parse(projectState);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function phaseProjectName(source: { projectName: string; district?: string | null; phaseNo: number }, nextPhaseNo: number, title?: string) {
  if (title && title.trim()) return title.trim();
  const district = source.district || "Punjab";
  const base = source.projectName.replace(/\s+-\s+Phase\s+\d+$/i, "");
  return `${base || `District Survey Report - ${district}`} - Phase ${nextPhaseNo}`;
}

projectsRouter.get("/", async (req, res) => {
  const projects = await prisma.project.findMany({
    where: visibleWhere(req.user!.role, req.user!.district),
    include: { files: true },
    orderBy: { createdAt: "desc" }
  });
  res.json(jsonSafe(projects.map(toProjectDto)));
});

projectsRouter.post("/", async (req, res) => {
  const body = req.body || {};

  if (Array.isArray(body)) {
    await prisma.project.deleteMany({});
    const created = await Promise.all(
      body.map((project) =>
        prisma.project.create({
          data: {
            projectName: project.projectName || project.title || `District Survey Report - ${project.district || "Punjab"}`,
            title: project.title || project.projectName,
            district: project.district || "Punjab",
            year: project.year || "2025-26",
            mineral: project.mineral || "Sand",
            rivers: project.rivers || "Not specified",
            progress: Number(project.progress || 0),
            status: parseStatus(project.status),
            signatures: Number(project.signatures || 0),
            createdBy: req.user!.id,
            projectState: typeof project.projectState === "string" ? project.projectState : project.projectState ? JSON.stringify(project.projectState) : null
          }
        })
      )
    );
    res.json(jsonSafe({ success: true, projects: created.map(toProjectDto) }));
    return;
  }

  const created = await prisma.project.create({
    data: {
      projectName: body.projectName || body.title || `District Survey Report - ${body.district || "Punjab"}`,
      title: body.title || body.projectName,
      district: body.district || "Punjab",
      year: body.year || "2025-26",
      mineral: body.mineral || "Sand",
      rivers: body.rivers || "Not specified",
      progress: 0,
      status: parseStatus(body.status),
      signatures: 0,
      createdBy: req.user!.id,
      projectState: typeof body.projectState === "string" ? body.projectState : body.projectState ? JSON.stringify(body.projectState) : null
    },
    include: { files: true }
  });

  await prisma.workflowHistory.create({
    data: {
      reportId: created.id,
      action: "PROJECT_CREATED",
      remarks: `${created.district || "Punjab"} DSR project created for ${created.year || "2025-26"}`,
      performedBy: req.user!.id
    }
  });

  res.status(201).json(jsonSafe(toProjectDto(created)));
});

projectsRouter.post("/:id/phases", async (req, res) => {
  if (!canAdmin(req.user!.role)) {
    res.status(403).json({ error: "Only Administrators can initiate the next phase." });
    return;
  }

  const id = parseBigIntParam(req.params.id, res, "source phase id");
  if (!id) return;

  const source = await prisma.project.findUnique({
    where: { id },
    include: { files: true }
  });
  if (!source) {
    res.status(404).json({ error: "Source DSR phase not found" });
    return;
  }

  const nextPhaseNo = Math.max(2, Number(req.body?.phaseNo || source.phaseNo + 1));
  const uploadColor = String(req.body?.uploadColor || "#34C759");
  const importedAt = new Date().toISOString();
  const sourceState = readProjectState(source.projectState);
  const sourcePhaseMeta =
    sourceState.phaseMetadata && typeof sourceState.phaseMetadata === "object" && !Array.isArray(sourceState.phaseMetadata)
      ? sourceState.phaseMetadata
      : {};

  const lockedSourceState = {
    ...sourceState,
    phaseMetadata: {
      ...sourcePhaseMeta,
      phaseNo: source.phaseNo || 1,
      locked: true,
      lockedAt: importedAt,
      lockedReason: `Phase ${nextPhaseNo} initiated`
    }
  };

  const nextState = {
    ...sourceState,
    phaseMetadata: {
      phaseNo: nextPhaseNo,
      parentPhaseId: Number(source.id),
      parentPhaseTitle: source.title || source.projectName,
      parentPhaseNo: source.phaseNo || 1,
      importedAt,
      locked: false,
      defaultUploadColor: uploadColor,
      origin: "PHASE_IMPORTED"
    },
    phaseChangeLog: [
      {
        type: "PHASE_CREATED",
        section: "Project",
        label: `Imported data from Phase ${source.phaseNo || 1}`,
        color: "#94A3B8",
        at: importedAt,
        by: Number(req.user!.id)
      }
    ]
  };

  const created = await prisma.$transaction(async (tx) => {
    await tx.project.update({
      where: { id: source.id },
      data: {
        phaseLocked: true,
        projectState: JSON.stringify(lockedSourceState)
      }
    });

    const nextProject = await tx.project.create({
      data: {
        projectName: phaseProjectName(source, nextPhaseNo, req.body?.title),
        title: phaseProjectName(source, nextPhaseNo, req.body?.title),
        district: source.district,
        year: source.year,
        mineral: source.mineral,
        rivers: source.rivers,
        description: source.description,
        progress: 0,
        status: ProjectStatus.IN_PROGRESS,
        signatures: 0,
        phaseNo: nextPhaseNo,
        parentPhaseId: source.id,
        phaseLocked: false,
        phaseOrigin: `Imported from project ${source.id} / Phase ${source.phaseNo || 1}`,
        createdBy: req.user!.id,
        projectState: JSON.stringify(nextState)
      }
    });

    if (source.files.length) {
      await tx.dsrFile.createMany({
        data: source.files.map((file) => ({
          projectId: nextProject.id,
          annexureId: file.annexureId,
          fileName: file.fileName,
          objectKey: file.objectKey,
          contentType: file.contentType,
          sizeBytes: file.sizeBytes
        })),
        skipDuplicates: true
      });
    }

    await tx.workflowHistory.create({
      data: {
        reportId: nextProject.id,
        action: "PROJECT_PHASE_INITIATED",
        remarks: `Phase ${nextPhaseNo} created from Phase ${source.phaseNo || 1} (${source.district || "Punjab"})`,
        performedBy: req.user!.id
      }
    });

    return tx.project.findUnique({
      where: { id: nextProject.id },
      include: { files: true }
    });
  });

  res.status(201).json(jsonSafe(toProjectDto(created!)));
});

projectsRouter.get("/:id", async (req, res) => {
  const id = parseBigIntParam(req.params.id, res, "project id");
  if (!id) return;
  const project = await prisma.project.findUnique({
    where: { id },
    include: { files: true }
  });
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json(jsonSafe(toProjectDto(project)));
});

projectsRouter.put("/:id/state", async (req, res) => {
  const id = parseBigIntParam(req.params.id, res, "project id");
  if (!id) return;
  const project = await prisma.project.update({
    where: { id },
    data: {
      projectState: req.body?.state == null ? null : typeof req.body.state === "string" ? req.body.state : JSON.stringify(req.body.state)
    },
    include: { files: true }
  });
  res.json(jsonSafe({ success: true, project: toProjectDto(project) }));
});

projectsRouter.delete("/:id", async (req, res) => {
  if (!canAdmin(req.user!.role)) {
    res.status(403).json({ error: "Access denied" });
    return;
  }
  const id = parseBigIntParam(req.params.id, res, "project id");
  if (!id) return;
  const files = await prisma.dsrFile.findMany({ where: { projectId: id } });
  await Promise.all(files.map((file) => deletePdf(file.objectKey).catch(() => undefined)));
  await prisma.project.delete({ where: { id } });
  res.json({ success: true, message: "Project deleted successfully" });
});
