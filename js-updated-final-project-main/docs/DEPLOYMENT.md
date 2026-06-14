# Deployment

## Local one-click flow

Use `START_HERE.bat` from this folder. It installs dependencies if missing, starts Docker services, runs Prisma migration/seed, then opens API, worker, and web servers in separate windows.

## Vercel frontend + AWS backend

Frontend:

- Project root: `apps/web`
- Framework: Next.js
- Env: `NEXT_PUBLIC_API_BASE_URL=https://your-api-domain`
- Rewrite `/api/*` to backend through `apps/web/vercel.json`

Backend on AWS:

- Use `apps/api/Dockerfile`
- Required env: `DATABASE_URL`, `JWT_SECRET`, `WEB_ORIGIN`, `AWS_REGION`, `AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `QUEUE_REDIS_URL`
- Run once after deploy: `npm run prisma:migrate --workspace @dsr/api`
- Run worker separately: `npm run start:worker --workspace @dsr/api`

## S3

Set `LOCAL_FILE_STORAGE=false` in production. For MinIO/local S3-compatible storage, set `AWS_S3_ENDPOINT` and `AWS_S3_FORCE_PATH_STYLE=true`.
