import { Queue } from "bullmq";
import { config } from "../lib/config.js";

export function redisConnection() {
  const url = new URL(config.queueRedisUrl);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password || undefined
  };
}

export const pdfQueue = new Queue("pdf-jobs", { connection: redisConnection() });
export const excelQueue = new Queue("excel-jobs", { connection: redisConnection() });

pdfQueue.on("error", (error) => {
  console.warn("PDF queue connection error:", error.message);
});

excelQueue.on("error", (error) => {
  console.warn("Excel queue connection error:", error.message);
});
