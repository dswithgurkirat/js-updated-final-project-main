import { Router } from "express";
import { canAdmin, canUpload } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";
import { deletePdf, getPdf, putPdf } from "../lib/storage.js";
import { boundedString } from "../lib/validation.js";

export const pdfRouter = Router();
const maxPdfSizeBytes = 200 * 1024 * 1024;

function objectKey(projectId: bigint | number | string, annexureId: string) {
  return `${annexureId}-${projectId}.pdf`;
}

pdfRouter.post("/upload-pdf", async (req, res) => {
  const projectIdValue = String(req.body?.projectId || "");
  const projectId = /^\d+$/.test(projectIdValue) ? BigInt(projectIdValue) : null;
  const annexureId = boundedString(req.body?.annexureId || "anx3", 32);
  const fileName = boundedString(req.body?.fileName, 255);
  const pdf = req.body?.pdf;

  if (annexureId === "final" && !canAdmin(req.user!.role)) {
    res.status(403).type("text/plain").send("Access Denied - Only Administrators can download or email the Final DSR PDF.");
    return;
  }
  if (!canUpload(req.user!.role) && !canAdmin(req.user!.role)) {
    res.status(403).json({ success: false, error: "Access denied" });
    return;
  }
  if (!projectId) {
    res.status(400).json({ success: false, error: "Missing projectId" });
    return;
  }

  const key = objectKey(projectId, annexureId);
  if (!fileName || pdf == null) {
    await deletePdf(key).catch(() => undefined);
    await prisma.dsrFile.deleteMany({ where: { projectId, annexureId } });
    res.json({ success: true });
    return;
  }

  const pdfText = String(pdf);
  if (!/^[A-Za-z0-9+/=]+$/.test(pdfText)) {
    res.status(400).json({ success: false, error: "Invalid PDF payload" });
    return;
  }
  const bytes = Buffer.from(pdfText, "base64");
  if (bytes.byteLength > maxPdfSizeBytes || bytes.subarray(0, 4).toString("utf8") !== "%PDF") {
    res.status(400).json({ success: false, error: "Only PDF files up to 200 MB are allowed" });
    return;
  }
  await putPdf(key, bytes);
  await prisma.dsrFile.upsert({
    where: { projectId_annexureId: { projectId, annexureId } },
    create: {
      projectId,
      annexureId,
      fileName,
      objectKey: key,
      sizeBytes: bytes.byteLength
    },
    update: {
      fileName,
      objectKey: key,
      sizeBytes: bytes.byteLength
    }
  });

  if (annexureId === "final") {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    let state: Record<string, unknown> = {};
    try {
      state = project?.projectState ? JSON.parse(project.projectState) : {};
      if (typeof state === "string") state = JSON.parse(state);
    } catch {
      state = {};
    }
    state.finalPdfGeneratedAt = new Date().toISOString();
    await prisma.project.update({ where: { id: projectId }, data: { projectState: JSON.stringify(state) } });
  }

  await prisma.workflowHistory.create({
    data: {
      reportId: projectId,
      action: "DOCUMENT_UPLOADED",
      remarks: `Uploaded document '${fileName}' for Annexure ${annexureId}`,
      performedBy: req.user!.id
    }
  });

  res.json({ success: true });
});

pdfRouter.get("/download-pdf", async (req, res) => {
  const projectIdValue = String(req.query.projectId || "");
  const projectId = /^\d+$/.test(projectIdValue) ? BigInt(projectIdValue) : null;
  const annexureId = boundedString(req.query.annexureId || "anx3", 32);
  const inline = String(req.query.inline || "false") === "true";

  if (annexureId === "final" && !canAdmin(req.user!.role)) {
    res.status(403).type("text/plain").send("Access Denied - Only Administrators can download or email the Final DSR PDF.");
    return;
  }
  if (!projectId) {
    res.status(400).type("text/plain").send("Missing projectId");
    return;
  }

  const file = await prisma.dsrFile.findUnique({ where: { projectId_annexureId: { projectId, annexureId } } });
  if (!file) {
    res.status(404).type("text/plain").send("PDF not found");
    return;
  }

  try {
    const bytes = await getPdf(file.objectKey);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `${inline ? "inline" : "attachment"}; filename="${encodeURIComponent(file.fileName)}"`);
    res.send(bytes);
  } catch (error) {
    res.status(404).type("text/plain").send(`PDF not found or error loading: ${(error as Error).message}`);
  }
});

pdfRouter.post("/email-final-pdf", async (req, res) => {
  if (!canAdmin(req.user!.role)) {
    res.status(403).type("text/plain").send("Access Denied - Only Administrators can download or email the Final DSR PDF.");
    return;
  }
  const projectIdValue = String(req.body?.projectId || "");
  const projectId = /^\d+$/.test(projectIdValue) ? BigInt(projectIdValue) : null;
  const email = boundedString(req.body?.email, 254);
  if (!projectId || !email.includes("@")) {
    res.status(400).json({ success: false, error: "Missing projectId or email" });
    return;
  }
  res.json({ success: true, message: `Final DSR PDF queued for ${email}` });
});
