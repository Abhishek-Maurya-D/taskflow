# TaskFlow — Team Task Manager

A production-ready, full-stack team task management web application. Organize work into projects, track tasks through their lifecycle, collaborate via comments, and monitor team progress through an analytics dashboard.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [API Reference](#api-reference)
- [Authentication](#authentication)
- [Architecture Decisions](#architecture-decisions)
- [Scripts](#scripts)

---

## Features

### Dashboard
- Overview stats: total tasks, completed, in-progress, overdue, projects, and team members
- Task status breakdown — interactive pie chart
- Task priority breakdown — bar chart
- Live recent activity feed

### Projects
- Create, view, and delete projects with title, description, status, and deadline
- Per-project progress bar based on task completion
- Project status labels: Active, On Hold, Completed, Archived

### Project Detail
- Tabbed view: **Tasks** and **Members**
- Per-project stats (total, completed, in-progress, overdue tasks)
- Filter tasks by status (All / To Do / In Progress / Completed)
- Create tasks directly within a project
- Add and remove project members

### Tasks
- Global task list across all projects
- Search by title
- Filter by status, priority, and project
- Inline task completion toggle via checkbox
- Click any task to open the detail panel

### Task Detail
- Edit status, priority, and assignee inline
- View and post threaded comments (Ctrl/Cmd+Enter to submit)
- Due date display with overdue highlighting
- Delete task with confirmation dialog

### Team Members
- List all users with avatars, names, and email
- Change roles (Admin / Member) via dropdown
- Current user is shown with a "(you)" badge

### Auth
- Login gate on every page
- User avatar and name shown in the sidebar
- Sign-out button in the top header

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 24 |
| Language | TypeScript 5.9 (strict) |
| Package Manager | pnpm workspaces |
| Frontend | React 19 + Vite |
| Routing | Wouter v3 |
| Server State | TanStack Query v5 |
| UI Components | shadcn/ui (Radix UI primitives) |
| Styling | Tailwind CSS v4 |
| Charts | Recharts |
| Backend | Express 5 |
| ORM | Drizzle ORM |
| Database | PostgreSQL |
| Validation | Zod v4 |
| API Contract | OpenAPI 3.1 → Orval codegen |
| Auth | OpenID Connect (OIDC) with PKCE |
| Session Store | PostgreSQL-backed sessions |
| Logging | Pino |
| Build | esbuild (server), Vite (client) |

---

## Project Structure

```
taskflow/
├── artifacts/
│   ├── api-server/              # Express 5 backend
│   │   ├── src/
│   │   │   ├── index.ts         # Entry point, middleware setup
│   │   │   ├── lib/
│   │   │   │   └── auth.ts      # OIDC config, session helpers
│   │   │   └── routes/
│   │   │       ├── auth.ts      # Login / callback / logout / user
│   │   │       ├── dashboard.ts # Summary stats, activity, task breakdown
│   │   │       ├── projects.ts  # Project CRUD, members, stats
│   │   │       ├── tasks.ts     # Task CRUD, comments
│   │   │       └── users.ts     # User list, role management
│   │   └── build.mjs            # esbuild bundle script
│   └── team-task-manager/       # React + Vite frontend
│       └── src/
│           ├── App.tsx           # Router, auth guard, QueryClient
│           ├── pages/
│           │   ├── DashboardPage.tsx
│           │   ├── ProjectsPage.tsx
│           │   ├── ProjectDetailPage.tsx
│           │   ├── TasksPage.tsx
│           │   ├── UsersPage.tsx
│           │   └── LoginPage.tsx
│           └── components/
│               ├── layout/
│               │   ├── AppLayout.tsx
│               │   ├── Sidebar.tsx
│               │   └── Header.tsx
│               ├── tasks/
│               │   ├── TaskCard.tsx
│               │   └── TaskDetailSheet.tsx
│               └── ui/           # shadcn/ui components
├── lib/
│   ├── db/                      # Drizzle ORM schema + client
│   │   └── src/schema/
│   │       ├── auth.ts           # users, sessions tables
│   │       ├── projects.ts       # projects, project_members tables
│   │       └── tasks.ts          # tasks, comments, activity tables
│   ├── api-spec/
│   │   └── openapi.yaml          # Single source of truth for API contracts
│   ├── api-client-react/         # Generated TanStack Query hooks (Orval)
│   ├── api-zod/                  # Generated Zod schemas for server validation
│   └── replit-auth-web/          # useAuth() hook for frontend auth state
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── tsconfig.json
```

---

## Getting Started

### Prerequisites

- Node.js 24+
- pnpm 9+
- PostgreSQL database

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/taskflow.git
cd taskflow

# Install dependencies
pnpm install

# Set up environment variables (see below)
cp .env.example .env

# Push the database schema
pnpm --filter @workspace/db run push

# Start the API server (port 8080)
pnpm --filter @workspace/api-server run dev

# In a separate terminal, start the frontend
pnpm --filter @workspace/team-task-manager run dev
```

The app will be available at `http://localhost:<PORT>` (the frontend reads `$PORT` from the environment).

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string, e.g. `postgresql://user:pass@host:5432/dbname` |
| `SESSION_SECRET` | Yes | Secret key used to sign session cookies (min 32 chars recommended) |
| `ISSUER_URL` | Yes | OIDC issuer URL for authentication |
| `CLIENT_ID` | Yes | OIDC client ID |
| `CLIENT_SECRET` | Yes | OIDC client secret |

---

## Database

This project uses **Drizzle ORM** with PostgreSQL. All schema definitions live in `lib/db/src/schema/`.

### Tables

| Table | Description |
|-------|-------------|
| `users` | Authenticated user profiles (id, email, first/last name, role, avatar) |
| `sessions` | Server-side session store |
| `projects` | Projects with title, description, status, deadline |
| `project_members` | Many-to-many: users ↔ projects |
| `tasks` | Tasks with status, priority, due date, assignee, project reference |
| `task_comments` | Threaded comments on tasks |
| `activity` | Activity log entries for the dashboard feed |

### Schema changes

```bash
# After editing any schema file, push changes to the database
pnpm --filter @workspace/db run push
```

---

## API Reference

All API routes are prefixed with `/api`. The full contract is defined in `lib/api-spec/openapi.yaml`.

### Auth
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/auth/login` | Begin OIDC login flow |
| `GET` | `/api/auth/callback` | Handle OIDC callback |
| `GET` | `/api/auth/logout` | Clear session and redirect |
| `GET` | `/api/auth/user` | Get current authenticated user |

### Dashboard
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/dashboard/summary` | Stats: task counts, project counts, member count |
| `GET` | `/api/dashboard/activity` | Recent activity feed (last 20 events) |
| `GET` | `/api/dashboard/task-breakdown` | Task counts grouped by status and priority |

### Projects
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/projects` | List all projects (with task counts and members) |
| `POST` | `/api/projects` | Create a new project |
| `GET` | `/api/projects/:id` | Get a project with members |
| `PATCH` | `/api/projects/:id` | Update project fields |
| `DELETE` | `/api/projects/:id` | Delete project and all its tasks |
| `GET` | `/api/projects/:id/stats` | Per-project task stats |
| `POST` | `/api/projects/:id/members` | Add a user to the project |
| `DELETE` | `/api/projects/:id/members/:userId` | Remove a user from the project |

### Tasks
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/tasks` | List tasks (filterable: `projectId`, `status`, `priority`) |
| `POST` | `/api/tasks` | Create a new task |
| `GET` | `/api/tasks/:id` | Get a task with comments and assignee |
| `PATCH` | `/api/tasks/:id` | Update task fields |
| `DELETE` | `/api/tasks/:id` | Delete a task and its comments |
| `POST` | `/api/tasks/:id/comments` | Add a comment to a task |

### Users
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/users` | List all users |
| `PATCH` | `/api/users/:id/role` | Update a user's role (admin/member) |

---

## Authentication

Authentication uses **OpenID Connect (OIDC) with PKCE**. The flow:

1. User clicks "Sign in" → redirected to the OIDC provider
2. On callback, the server exchanges the auth code for tokens
3. User profile is upserted into the `users` table
4. A server-side session is created and stored in PostgreSQL
5. All subsequent API requests are authenticated via the session cookie

The frontend `useAuth()` hook polls `/api/auth/user` to determine authentication state. Unauthenticated users see the login page; all routes are protected.

---

## Architecture Decisions

### Contract-First API
The OpenAPI spec (`lib/api-spec/openapi.yaml`) is the single source of truth. Running codegen produces:
- **TanStack Query hooks** for the frontend (`lib/api-client-react/`)
- **Zod schemas** for server-side request validation (`lib/api-zod/`)

Never write API types by hand — always update the spec and re-run codegen.

```bash
pnpm --filter @workspace/api-spec run codegen
```

### Monorepo with pnpm Workspaces
- `lib/*` — composite TypeScript libraries (emit declarations)
- `artifacts/*` — leaf packages (no declaration emit); these are the deployable apps
- Root `tsconfig.json` is a solution file for libs only

### User IDs
User IDs are `varchar` (UUID strings from the OIDC provider), not integers. All foreign key references in the schema use `varchar` to match.

### Express 5 Patterns
Express 5 changed async error handling. All route handlers follow this pattern:

```ts
router.get("/example", async (req, res) => {
  const data = await someQuery();
  res.json(data);          // ✅ correct
  return;                  // ✅ required to satisfy TS7030
  // return res.json(data); // ❌ avoid — causes TypeScript error in Express 5
});
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm --filter @workspace/api-server run dev` | Build and start the API server (development) |
| `pnpm --filter @workspace/team-task-manager run dev` | Start the Vite dev server for the frontend |
| `pnpm run typecheck` | Full TypeScript check across all packages |
| `pnpm run build` | Typecheck + build all packages |
| `pnpm --filter @workspace/api-spec run codegen` | Regenerate API hooks and Zod schemas from the OpenAPI spec |
| `pnpm --filter @workspace/db run push` | Push schema changes to the database (development only) |

---

## License

MIT
