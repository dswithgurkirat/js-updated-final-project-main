# Migration Status

## Files completed

- Frontend scaffold: Next.js, TypeScript, Tailwind CSS, shadcn-style `Button` and `Badge`
- Legacy portal bridge: existing HTML/CSS/JS copied into `apps/web/public/legacy`
- Backend scaffold: Express, TypeScript, JWT auth, RBAC helpers
- PostgreSQL schema: Prisma models for users, projects, reports, workflow history, files
- File storage: S3-compatible storage with local fallback
- Background jobs: BullMQ queues and worker entry for PDF/Excel lazy jobs
- API routes: auth, projects, project state, reports, workflow, audit logs, PDFs, users, file uploads, jobs, dashboard stats
- Local infrastructure: Docker Compose for PostgreSQL, Redis, MinIO
- Deployment files: API Dockerfile, web Dockerfile, Vercel config, deployment notes
- Windows helpers: `START_HERE.bat`, `STOP_ALL.bat`, `install-fast.bat`, `start-fast.bat`

## What remains after file creation

- Run dependency install
- Run database migration and seed
- Build verification
- Browser testing of all old workflows
- Optional: convert each legacy HTML/JS view into native React components one-by-one

## One-click start

Run:

```powershell
.\START_HERE.bat
```

Demo users:

- `admin@demo.com` / `password123`
- `iit@demo.com` / `password123`
- `sdlc@demo.com` / `password123`
- `sdo@demo.com` / `password123`
- `gis@demo.com` / `password123`
