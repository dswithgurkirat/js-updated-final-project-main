import type { Project } from "@prisma/client";

export function statusForFrontend(status?: string | null) {
  if (!status) return "In Progress";
  if (status === "ACTIVE" || status === "IN_PROGRESS") return "In Progress";
  if (status === "COMPLETED") return "Completed";
  return status;
}

export function toProjectDto(project: Project & { files?: { annexureId: string; fileName: string }[] }) {
  const pdfNames = Object.fromEntries(
    (project.files || []).map((file) => [
      file.annexureId === "anx3" ? "annexure3PdfName" : `${file.annexureId}PdfName`,
      file.fileName
    ])
  );

  return {
    ...project,
    id: Number(project.id),
    createdBy: project.createdBy ? Number(project.createdBy) : null,
    parentPhaseId: project.parentPhaseId ? Number(project.parentPhaseId) : null,
    phaseNo: project.phaseNo || 1,
    phaseLocked: Boolean(project.phaseLocked),
    phaseOrigin: project.phaseOrigin || null,
    title: project.title || project.projectName,
    status: statusForFrontend(project.status),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    ...pdfNames
  };
}

export function projectName(project?: Pick<Project, "projectName" | "title" | "district"> | null) {
  if (!project) return "Unknown Project";
  return project.projectName || project.title || `District Survey Report - ${project.district || "Punjab"}`;
}
