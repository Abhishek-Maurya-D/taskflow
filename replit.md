# TaskFlow — Team Task Manager

A production-ready team task management web app with projects, tasks, role-based access, analytics dashboard, comments, and activity feeds.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/team-task-manager run dev` — run the frontend (dynamic port from $PORT)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — session signing key

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (port 8080, path prefix `/api`)
- DB: PostgreSQL + Drizzle ORM
- Auth: Replit Auth (OIDC + PKCE, session via pg-based store)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec in `lib/api-spec/openapi.yaml`)
- Frontend: React 19 + Vite + shadcn/ui + Recharts + Wouter + TanStack Query
- Build: esbuild (CJS bundle for server)

## Where things live

- `lib/db/src/schema/` — DB schema (auth.ts = users, projects.ts, tasks.ts with activity+comments)
- `lib/api-spec/openapi.yaml` — single source of truth for all API contracts
- `lib/api-client-react/src/generated/` — generated TanStack Query hooks (from Orval)
- `lib/api-zod/src/generated/` — generated Zod schemas for server-side validation (from Orval)
- `lib/replit-auth-web/src/use-auth.ts` — `useAuth()` hook for frontend auth state
- `artifacts/api-server/src/routes/` — all Express route handlers
- `artifacts/api-server/src/lib/auth.ts` — OIDC config, session helpers
- `artifacts/team-task-manager/src/pages/` — React pages (Dashboard, Projects, ProjectDetail, Tasks, Users)
- `artifacts/team-task-manager/src/components/` — layout (Sidebar, Header) and task components (TaskCard, TaskDetailSheet)

## Architecture decisions

- Contract-first API: OpenAPI spec → Orval → typed hooks + Zod schemas. Never write API types by hand.
- User IDs are `varchar` (Replit auth returns UUID strings, not integers). All FK references use `varchar`.
- Session stored in PostgreSQL via custom session table in `lib/db/src/schema/auth.ts`.
- `lib/replit-auth-web` is a composite lib (has `composite: true`) so it can be referenced by the frontend tsconfig.
- All `return res.json(...)` patterns avoided in Express 5 routes — use `res.json(...); return;` instead to satisfy TS7030.

## Product

- **Dashboard**: overview stats (total/completed/in-progress/overdue tasks, projects, members) with pie and bar charts, recent activity feed
- **Projects**: list all projects with progress bars, create new projects, view/delete individual projects
- **Project Detail**: tabbed view with tasks (filterable by status) and members; add/remove members, create tasks, track stats
- **Tasks**: global task list with search and filters (status, priority, project); click any task to open detail panel
- **Task Detail Sheet**: edit status/priority/assignee inline, add/view threaded comments, delete task
- **Team Members**: list all users, change roles (admin/member) with dropdown; admin-only role management UI
- **Auth**: Replit OIDC login gate on every page; sidebar shows current user avatar/name; sign-out button in header

## Gotchas

- After changing the OpenAPI spec, always run `pnpm --filter @workspace/api-spec run codegen` before working on frontend or routes.
- DB push (`pnpm --filter @workspace/db run push`) must be run after schema changes.
- The `assignedToId` field is a `string` in the DB but the generated `TaskInput` type has it as `number` (OpenAPI limitation with integer path params). Cast with `as unknown as number` in the frontend mutation only.
- The API server bundles to a single ESM file via esbuild. Zod must be added as a direct `dependency` of `@workspace/api-server` (not just through transitive deps) to resolve correctly.
