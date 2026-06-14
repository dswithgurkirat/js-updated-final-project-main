import { Router } from "express";
import { canUpload } from "../lib/auth.js";
import { excelQueue, pdfQueue } from "../jobs/queues.js";

export const jobsRouter = Router();

jobsRouter.post("/pdf", async (req, res) => {
  if (!canUpload(req.user!.role)) {
    res.status(403).json({ error: "Access denied" });
    return;
  }
  try {
    const job = await pdfQueue.add("generate-pdf", req.body || {});
    res.status(202).json({ jobId: job.id, status: "queued" });
  } catch (error) {
    res.status(503).json({ error: "PDF queue is unavailable. Start Redis or use the simple local portal.", details: (error as Error).message });
  }
});

jobsRouter.post("/excel", async (req, res) => {
  if (!canUpload(req.user!.role)) {
    res.status(403).json({ error: "Access denied" });
    return;
  }
  try {
    const job = await excelQueue.add("process-excel", req.body || {});
    res.status(202).json({ jobId: job.id, status: "queued" });
  } catch (error) {
    res.status(503).json({ error: "Excel queue is unavailable. Start Redis or use the simple local portal.", details: (error as Error).message });
  }
});
