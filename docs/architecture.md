# Architecture Overview

## Project Identity

**LPE HUB** — internal employee activity tracking web app for PT DNP Indonesia.  
Production project. Stack: Next.js 16 + Prisma + SQL Server + NextAuth v5.

## Directory Layout

```
lpe-hub/
├── app/
│   ├── (auth)/login/          → Public login page (no Navbar)
│   ├── (dashboard)/           → Protected layout (auth required)
│   │   ├── layout.js          → Calls auth(), redirects to /login, wraps Navbar + SessionProviderWrapper
│   │   ├── page.js            → Home/dashboard
│   │   ├── notes/             → Activity Notes (user's own data)
│   │   ├── todolist/          → Todo List (user's own data)
│   │   ├── profile/           → User profile & password change
│   │   ├── admin/users/       → Admin-only: user management
│   │   └── expatriate/        → Expatriate module (admin + expatriate_admin)
│   │       ├── page.js        → Daftar Expat list
│   │       ├── [id]/page.js   → Expat detail (permits, family, history)
│   │       ├── permit-types/  → Manage PermitType master data
│   │       └── epo/           → EPO (Exit Permit Only) view
│   ├── api/                   → API routes (see api-routes.md)
│   ├── generated/prisma/      → Prisma client output (auto-generated, DO NOT edit)
│   ├── globals.css            → Global styles (Tailwind CSS v4 directives)
│   └── layout.js              → Root layout
├── components/
│   ├── Navbar.jsx             → Client component, role-aware nav
│   ├── SessionProviderWrapper.jsx → Wraps NextAuth SessionProvider
│   ├── notes/
│   │   ├── NotesItem.jsx      → Single note card with progress/feedback UI
│   │   └── NotesProgress.jsx  → Progress item component
│   └── admin/
│       └── UserManagement.jsx → Admin user CRUD UI
├── hooks/
│   └── useAutoResizeTextarea.js → Auto-resize textarea hook
├── lib/
│   ├── auth.config.js         → Edge-compatible auth (no Prisma, used by proxy.js)
│   ├── auth.js                → Full NextAuth config with Prisma (used by API + server components)
│   └── prisma.js              → Prisma singleton client
├── prisma/
│   ├── schema.prisma          → Database schema
│   └── seed.mjs               → Seeds default admin user
├── scripts/
│   ├── check-expat.mjs        → Debug: print expat data from DB
│   └── check-permits.mjs      → Debug: print permit data from DB
├── public/uploads/
│   ├── expat/                 → Expat photos + passport scans
│   └── expat-permit/          → Permit scan files
├── proxy.js                   → Next.js 16 middleware (replaces middleware.js)
├── prisma.config.ts           → Prisma v6 CLI config (DO NOT delete)
├── next.config.mjs            → Next.js config (serverActions 10mb, /uploads rewrite)
├── postcss.config.mjs         → Tailwind CSS v4 PostCSS config
└── tsconfig.json              → TS config with @/* path alias
```

## Key Architectural Decisions

### Route Protection
No `middleware.js`. Auth is enforced in two places:
1. `proxy.js` — edge middleware using `authConfig` (no Prisma), blocks unauthenticated requests
2. `app/(dashboard)/layout.js` — server component calls `auth()`, redirects to `/login`
3. Admin/expat pages additionally check `session.user.role` and redirect to `/`

### Auth Config Split
`lib/auth.config.js` is edge-compatible (no Prisma imports) — used by `proxy.js`.  
`lib/auth.js` is the full config with Prisma — used by server components and API routes.

### Prisma Client
- Generator output: `app/generated/prisma` (non-default)
- Always import: `import { PrismaClient } from "@/app/generated/prisma"`
- Singleton: `import prisma from "@/lib/prisma"`
- Apply schema: `npx prisma db push` (NOT `migrate dev` — no shadow DB permission on SQL Server)

### File Uploads
Static files served via API route: `GET /api/uploads/[...slug]`  
Stored in `public/uploads/` on disk.  
`next.config.mjs` rewrites `/uploads/:path*` → `/api/uploads/:path*`.

### Role System
Three roles: `"admin"`, `"employee"` (default), `"expatriate_admin"`.  
Stored in JWT token → available as `session.user.role` everywhere.

### Soft Delete
Users are never hard-deleted. `deletedAt` is set to `new Date()`.  
Soft-deleted users cannot log in (checked in `lib/auth.js`).
