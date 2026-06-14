import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { auditMutations } from "./lib/audit.js";
import { config } from "./lib/config.js";
import { requireAuth } from "./lib/auth.js";
import { apiLimiter, authLimiter, uploadLimiter } from "./lib/security.js";
import { authRouter } from "./routes/auth.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { filesRouter } from "./routes/files.js";
import { jobsRouter } from "./routes/jobs.js";
import { pdfRouter } from "./routes/pdf.js";
import { projectsRouter } from "./routes/projects.js";
import { reportsRouter } from "./routes/reports.js";
import { usersRouter } from "./routes/users.js";

const app = express();
app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "base-uri": ["'self'"],
        "frame-ancestors": ["'self'"],
        "object-src": ["'none'"]
      }
    },
    crossOriginResourcePolicy: { policy: "same-site" }
  })
);
app.use(cors({
  origin: function (origin, callback) {
    const allowed = [
      config.webOrigin,
      "http://localhost:3000", "http://127.0.0.1:3000",
      "http://localhost:8081", "http://127.0.0.1:8081",
      "http://localhost:8080"
    ].filter(Boolean);
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true
}));
app.use(apiLimiter);
app.use(cookieParser());
app.use(express.json({ limit: "300mb" }));
app.use(morgan("dev"));

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth", authRouter);
app.use("/api/dashboard", requireAuth, auditMutations, dashboardRouter);
app.use("/api/files", requireAuth, uploadLimiter, auditMutations, filesRouter);
app.use("/api/jobs", requireAuth, auditMutations, jobsRouter);
app.use("/api/projects", requireAuth, auditMutations, projectsRouter);
app.use("/api/reports", requireAuth, auditMutations, reportsRouter);
app.use("/api/users", requireAuth, auditMutations, usersRouter);
app.use("/api", requireAuth, uploadLimiter, auditMutations, pdfRouter);

app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({ error: error.message || "Internal server error" });
});

app.listen(config.apiPort, () => {
  console.log(`DSR API running on http://localhost:${config.apiPort}`);
});
