# MasteryLMS

An adaptive, blind-spot-driven Learning Management System built with NestJS (API Gateway + gRPC microservices), Supabase (Postgres, Auth, Storage, Realtime), Redis/BullMQ, Odoo Community, and Next.js.

## Architecture & Docs
- [Architecture Specification](./docs/ARCHITECTURE.md)
- [Entity Relationship Diagram (ERD)](./docs/ERD.md)
- [Task Checklist](./tasks/TASKS.md)

## Quick Start

1. **Copy environment template:**
   ```powershell
   Copy-Item .env.example .env
   ```
   Fill in your Supabase URL, keys, JWT secret, and Postgres pooler `DATABASE_URL`.

2. **Database (choose hosted or local):**
   - **Hosted Supabase:**
     ```powershell
     npx supabase login
     npx supabase link --project-ref <your-project-ref>
     npm run db:push
     ```
     Then run `supabase/seed.sql` in the Supabase SQL Editor.
   - **Local Supabase (requires Docker Desktop running):**
     ```powershell
     npm run db:start
     ```

3. **Run backend services (Gateway + 3 gRPC services):**
   ```powershell
   npm run dev
   ```
   - Gateway HTTP: `http://localhost:3000`
   - Swagger UI: `http://localhost:3000/docs`
   - Combined gRPC Health Check: `GET http://localhost:3000/health`

4. **Build & Test:**
   ```powershell
   npm run typecheck
   npm run build
   npm test
   ```
