# CLAUDE.md

Guidance for Claude Code when working in this repository.  
For deeper detail, see [`docs/`](docs/).

## Project Overview

**LPE HUB** — internal employee activity tracking web app for PT DNP Indonesia. Real production project. Active development.

Features: Activity Notes (Progress & Feedback), Todo List, Admin User Management, Expatriate Permit Tracking.

## Commands

```bash
npm run dev                   # Start dev server (Next.js)
npm run build                 # Production build (runs prisma generate first)
npm run seed                  # Seed default admin user
npx prisma db push            # Apply schema changes (ALWAYS use this — see note below)
npx prisma generate           # Regenerate Prisma client after schema changes
npx prisma studio             # Open Prisma Studio GUI
```

> **Critical:** `prisma migrate dev` WILL FAIL — SQL Server user lacks `CREATE DATABASE` permission for shadow DB. Always use `prisma db push`.

## Tech Stack

- **Framework:** Next.js 16.2.4 (App Router), React 19
- **Auth:** NextAuth v5 beta (`next-auth@5.0.0-beta.31`) — Credentials provider, JWT strategy
- **Database:** SQL Server (`172.16.128.221:1433`) via Prisma ORM v6
- **Prisma client output:** `app/generated/prisma` — always import from `@/app/generated/prisma`
- **Prisma singleton:** `import prisma from "@/lib/prisma"`
- **UI:** Tailwind CSS v4, Lucide React icons, react-icons
- **Password hashing:** bcryptjs cost factor 12

## Critical Files — Do NOT Delete

| File | Why |
|------|-----|
| `proxy.js` | Next.js 16 middleware (replaces `middleware.js`) |
| `prisma.config.ts` | Loaded by Prisma v6 CLI (`npx prisma generate/push`) |
| `postcss.config.mjs` | Required for Tailwind CSS v4 |
| `tsconfig.json` | Contains `@/*` path alias |

## Architecture

See [`docs/architecture.md`](docs/architecture.md) for the full directory layout and key decisions.

### Route Groups

```
app/
  (auth)/login/              → Public (no Navbar)
  (dashboard)/               → Protected — layout.js calls auth(), redirects to /login
    page.js                  → Home
    notes/                   → Activity Notes
    todolist/                → Todo List
    profile/                 → User profile
    admin/users/             → Admin only
    expatriate/              → Admin + expatriate_admin
      [id]/                  → Expat detail
      permit-types/          → PermitType master data
      epo/                   → Departed expatriates
```

### Auth

- `proxy.js` uses `lib/auth.config.js` (edge-safe, no Prisma)
- Server components and API routes use `lib/auth.js` (full, with Prisma)
- Session shape: `{ id, name, email, role }` — role in JWT token
- See [`docs/auth.md`](docs/auth.md) for full details

### Roles

Three roles: `"admin"`, `"employee"` (default), `"expatriate_admin"`.

- Expatriate module: requires `admin` or `expatriate_admin`
- Expatriate guard helper: `requireExpatAdmin()` in `app/api/expatriate/_helpers.js`

### API Patterns

```js
const session = await auth();
if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
// user-scoped: always filter by session.user.id
```

See [`docs/api-routes.md`](docs/api-routes.md) for the complete route map.

### Database

See [`docs/database.md`](docs/database.md) for full schema.

Core models: `User → Note[] → Progress[] → Feedback[]`, `User → Todo[]`  
Expatriate models: `Expatriate → ExpatPermit[]`, `Expatriate → ExpatFamily[] → FamilyPermit[]`  
History tables: ExpatHistory, ExpatPermitHistory, ExpatFamilyHistory, FamilyPermitHistory, ExpatPassportHistory, FamilyPassportHistory  
All child relations use `onDelete: Cascade`. Soft delete on User via `deletedAt`.

### File Uploads

Stored in `public/uploads/expat/` and `public/uploads/expat-permit/`.  
Served via `GET /api/uploads/[...slug]` (rewrite: `/uploads/:path*`).  
Upload helpers in `app/api/expatriate/_upload-helpers.js`.

## Environment

```env
DATABASE_URL="sqlserver://172.16.128.221:1433;database=lpe_hub;user=...;password=...;trustServerCertificate=true"
AUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"
```

Default admin after seed: `admin.ga@dnp-g.com` / `password123`
