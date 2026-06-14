import { Worker } from "bullmq";
import { redisConnection } from "./jobs/queues.js";

const connection = redisConnection();

const pdfWorker = new Worker(
  "pdf-jobs",
  async (job) => {
    console.log("PDF job received", job.id, job.name);
    return { ok: true, receivedAt: new Date().toISOString(), payload: job.data };
  },
  { connection }
);

const excelWorker = new Worker(
  "excel-jobs",
  async (job) => {
    console.log("Excel job received", job.id, job.name);
    return { ok: true, receivedAt: new Date().toISOString(), payload: job.data };
  },
  { connection }
);

pdfWorker.on("error", (error) => {
  console.warn("PDF worker connection error:", error.message);
});

excelWorker.on("error", (error) => {
  console.warn("Excel worker connection error:", error.message);
});

console.log("DSR background workers running.");
