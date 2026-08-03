# API Routes

All routes start with `const session = await auth()` or `requireExpatAdmin()`.  
Auth guard: return 401 if no session, 403 if insufficient role.

## Auth

| Method | Route | Description |
|--------|-------|-------------|
| GET/POST | `/api/auth/[...nextauth]` | NextAuth handler — handles sign-in, sign-out, session |

## Notes (user-scoped)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/notes` | List user's notes (includes progress + feedbacks) |
| POST | `/api/notes` | Create note `{ title, desc }` |
| PATCH | `/api/notes/[id]` | Update note `{ title?, desc?, done? }` |
| DELETE | `/api/notes/[id]` | Delete note (cascades progress/feedbacks) |
| POST | `/api/notes/[id]/progress` | Add progress `{ act, tglAct?, status? }` |
| PATCH | `/api/notes/[id]/progress/[progressId]` | Update progress |
| DELETE | `/api/notes/[id]/progress/[progressId]` | Delete progress (cascades feedbacks) |

> Progress has nested Feedback sub-routes at `/api/notes/[id]/progress/[progressId]/feedback/[feedbackId]`

## Todos (user-scoped)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/todos` | List user's todos |
| POST | `/api/todos` | Create todo `{ text }` |
| PATCH | `/api/todos/[id]` | Update todo `{ text?, done? }` |
| DELETE | `/api/todos/[id]` | Delete todo |

## Profile

| Method | Route | Description |
|--------|-------|-------------|
| PATCH | `/api/profile` | Update own name and/or password |

## Admin — User Management (role: admin only)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/admin/users` | List all users (supports `?includeDeleted=true`) |
| POST | `/api/admin/users` | Create user `{ name, email, password, role }` |
| PATCH | `/api/admin/users/[id]` | Update user `{ name?, email?, password?, role? }` |
| DELETE | `/api/admin/users/[id]` | Soft-delete user (sets deletedAt) |
| POST | `/api/admin/users/[id]` | Restore soft-deleted user (clears deletedAt) |

## Expatriate Module (role: admin or expatriate_admin)

Access guard: `requireExpatAdmin()` from `app/api/expatriate/_helpers.js`

### Expatriate CRUD

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/expatriate` | List all expatriates (includes permits, family count) |
| POST | `/api/expatriate` | Create expatriate (full personal + passport data) |
| GET | `/api/expatriate/[id]` | Get single expat (full detail with permits, families) |
| PATCH | `/api/expatriate/[id]` | Update expat data (logs to ExpatHistory) |
| DELETE | `/api/expatriate/[id]` | Delete expat (cascades all related data) |

### Expat Photo & Passport Scan

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/expatriate/[id]/photo` | Upload expat photo (multipart, saved to `public/uploads/expat/`) |
| POST | `/api/expatriate/[id]/passport-scan` | Upload passport scan |

### Expat Permits

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/expatriate/[id]/permits` | Add permit `{ permitTypeId, number, issuedDate, expiryDate? }` |
| PATCH | `/api/expatriate/[id]/permits/[permitId]` | Update permit |
| DELETE | `/api/expatriate/[id]/permits/[permitId]` | Delete permit |

### EPO (Exit Permit Only)

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/expatriate/[id]/epo` | Issue EPO for expat (one-time, marks departure) |

### Expat Family

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/expatriate/[id]/family` | Add family member (full personal + passport data) |
| PATCH | `/api/expatriate/[id]/family/[familyId]` | Update family member |
| DELETE | `/api/expatriate/[id]/family/[familyId]` | Delete family member |

### Expat Passport Renewal

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/expatriate/[id]/passport/renew` | Replace passport (archives old to ExpatPassportHistory) |
| GET | `/api/expatriate/[id]/passport/history` | List passport renewal history |

### Permit Types (master data)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/expatriate/permit-types` | List all permit types |
| POST | `/api/expatriate/permit-types` | Create permit type |
| PATCH | `/api/expatriate/permit-types/[typeId]` | Update permit type |
| DELETE | `/api/expatriate/permit-types/[typeId]` | Delete permit type |

## File Uploads (static serving)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/uploads/[...slug]` | Serve file from `public/uploads/` |

Also available via rewrite: `/uploads/:path*` → `/api/uploads/:path*`

## API Conventions

```js
// Every route starts with:
const session = await auth();                    // or requireExpatAdmin()
if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

// User-scoped queries always filter:
where: { userId: session.user.id }

// Success responses:
return NextResponse.json(data);                  // 200
return NextResponse.json(data, { status: 201 }); // created

// Error responses:
return NextResponse.json({ error: "..." }, { status: 400 | 403 | 404 | 409 });
```

### History Logging (Expatriate module)
All CREATE/UPDATE/DELETE on Expatriate, ExpatPermit, ExpatFamily, FamilyPermit write a history record.  
`diffChanges(before, after)` from `_helpers.js` produces a JSON string `{ field: { before, after } }`.
