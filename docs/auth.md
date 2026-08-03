# Authentication & Authorization

## Stack

- **NextAuth v5 beta** (`next-auth@5.0.0-beta.31`)
- Strategy: JWT (no database sessions)
- Provider: Credentials (email + password)
- Password hashing: bcryptjs cost factor 12

## Config Files

### `lib/auth.config.js` — Edge-safe config
Used by `proxy.js` (edge middleware). **No Prisma imports.**

```js
export const authConfig = {
  providers: [],
  pages: { signIn: "/login" },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAuthPage = nextUrl.pathname.startsWith("/login");
      if (isLoggedIn && isAuthPage) return Response.redirect(new URL("/", nextUrl));
      if (!isLoggedIn && !isAuthPage) return false;
      return true;
    },
    jwt({ token, user }) {
      if (user) { token.id = user.id; token.role = user.role; }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    },
  },
};
```

### `lib/auth.js` — Full config with Prisma
Used by server components (`auth()`) and API routes.

```js
export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  trustHost: true,
  providers: [
    Credentials({
      async authorize(credentials) {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || user.deletedAt) return null;        // blocks soft-deleted users
        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return null;
        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
});
```

## Middleware (`proxy.js`)

```js
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
export default NextAuth(authConfig).auth;
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

Note: `proxy.js` not `middleware.js` — Next.js 16 renamed the middleware file.

## Session Object

After login, `session.user` contains:
```ts
{
  id:    string  // User.id (cuid)
  name:  string
  email: string
  role:  "admin" | "employee" | "expatriate_admin"
}
```

Access in server component:
```js
import { auth } from "@/lib/auth";
const session = await auth();
const userId = session.user.id;
const role = session.user.role;
```

Access in client component:
```js
import { useSession } from "next-auth/react";
const { data: session } = useSession();
```

(`SessionProviderWrapper` in `app/(dashboard)/layout.js` makes client-side `useSession()` work)

## Role-Based Access

| Role | Access |
|------|--------|
| `employee` | Own notes, todos, profile |
| `admin` | Everything + `/admin/users` + expatriate module |
| `expatriate_admin` | Expatriate module only |

### Route Protection Pattern

**Server component (page or layout):**
```js
const session = await auth();
if (!session) redirect("/login");
if (session.user.role !== "admin") redirect("/");
```

**API route:**
```js
// User-only:
const session = await auth();
if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

// Admin-only:
if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

// Admin or expatriate_admin:
const session = await requireExpatAdmin(); // from app/api/expatriate/_helpers.js
if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
```

## Default Credentials (seed)

| Field | Value |
|-------|-------|
| Name | Wina |
| Email | admin.ga@dnp-g.com |
| Password | password123 |
| Role | admin |

Run seed: `npm run seed`

## Environment Variables

```env
DATABASE_URL="sqlserver://172.16.128.221:1433;database=lpe_hub;user=...;password=...;trustServerCertificate=true"
AUTH_SECRET="..."        # used by NextAuth (replaces NEXTAUTH_SECRET in v5)
NEXTAUTH_URL="http://localhost:3000"
```
