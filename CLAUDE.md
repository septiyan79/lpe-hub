# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**LPE HUB** — internal employee activity tracking web app for PT DNP Indonesia. Real production project. Active development.

Current features: Activity Notes (with Progress & Feedback sub-items), Todo List, Admin User Management.  
Planned: Passport reimbursement, business trip requests, expatriate permit tracking.

## Commands

```bash
npm run dev        # Start dev server (Next.js)
npm run build      # Production build
npm run lint       # ESLint
npm run seed       # Seed database (creates default users)
npx prisma db push            # Apply schema changes (use this — migrate dev fails due to no shadow DB permission)
npx prisma generate           # Regenerate Prisma client after schema changes
npx prisma studio             # Open Prisma Studio GUI
```

> **Important:** `prisma migrate dev` will fail because the SQL Server user lacks `CREATE DATABASE` permission (needed for shadow DB). Always use `prisma db push` for schema changes.

## Tech Stack

- **Framework:** Next.js 16 (App Router), React 19
- **Auth:** NextAuth v5 (beta) — Credentials provider, JWT strategy
- **Database:** SQL Server via Prisma ORM v6
- **Prisma client output:** `app/generated/prisma` (non-default path — always import from `@/app/generated/prisma`)
- **UI:** Tailwind CSS v4, Lucide React icons
- **Password hashing:** bcryptjs (cost factor 12)

## Architecture

### Route Groups

```
app/
  (auth)/login/         → Public login page, no Navbar
  (dashboard)/          → Protected layout (auth required), wraps Navbar
    page.js             → Home/dashboard
    notes/              → Activity Notes (user's own data)
    todolist/           → Todo List (user's own data)
    admin/users/        → Admin-only: User Management (redirects if not admin)
```

The `(dashboard)/layout.js` calls `auth()` server-side and redirects to `/login` if no session. Admin pages additionally check `session.user.role === "admin"` and redirect to `/` if not.

### Auth Flow

- `lib/auth.config.js` — edge-compatible config (no Prisma), handles `authorized` callback, JWT enrichment (`token.id`, `token.role`), and session enrichment (`session.user.id`, `session.user.role`)
- `lib/auth.js` — full NextAuth config with Credentials provider + Prisma lookup. Blocks login if `user.deletedAt` is set (soft-deleted users)
- `middleware.js` does NOT exist — route protection is done in layout server components

### Database Models

```
User      → id, name, email, password, role (default "employee"), createdAt, deletedAt (soft delete)
  └─ Todo[]   → id, text, done, createdAt, userId
  └─ Note[]   → id, title, desc, done, createdAt, userId
       └─ Progress[] → id, act, tglAct, status (default "Plan"), createdAt, noteId
            └─ Feedback[] → id, text, tglFeedback, createdAt, progressId
```

All child relationships use `onDelete: Cascade`. Prisma client imported via `import prisma from "@/lib/prisma"` (singleton in `lib/prisma.js`).

### Role System

Two roles: `"admin"` and `"employee"` (default).

- Admin email: `sep@dnp-g.com` (password: `password123` from seed)
- Role is stored in JWT token and available as `session.user.role` in both server and client components
- Admin-only API routes check `session.user.role !== "admin"` and return 403
- Navbar shows "Kelola User" menu item only when `user.role === "admin"`

### API Patterns

All API routes in `app/api/`:
- Start with `const session = await auth()` — return 401 if no session
- Admin routes use a `requireAdmin()` helper that returns null if not admin — return 403
- User-scoped queries always filter by `session.user.id` (never return other users' data)
- Return `NextResponse.json(data)` or `NextResponse.json({ error: "..." }, { status: N })`

### Component Patterns

- Pages in `(dashboard)/` can be either server components (for data fetching + auth checks) or client components (for interactive UI)
- Heavy client-side interaction components live in `components/` subdirectories (e.g., `components/admin/`, `components/notes/`)
- The `Navbar` receives `user` prop from the dashboard layout server component

### Soft Delete

User deletion sets `deletedAt: new Date()` instead of removing the row. This preserves all related Notes/Todos/Progress/Feedback history. Soft-deleted users cannot log in (checked in `lib/auth.js`). Admin UI has a toggle to show/hide inactive users.

## Environment

`.env` must contain:
```
DATABASE_URL="sqlserver://...;database=lpe_hub;..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"
```
