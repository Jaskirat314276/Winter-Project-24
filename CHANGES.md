# Changelog — Smart School ERP

A chronological record of every meaningful change made on **2026-04-30 / 2026-05-01 / 2026-05-02**, grouped by theme. Each section names the file(s) touched so you can audit the diff.

---

## 1. Sign-in page fixes

### 1.1 Removed hard-coded Google OAuth Connection
**File**: `src/app/[[...sign-in]]/page.tsx`

The sign-in page rendered `<Clerk.Connection name="google">` even though Google wasn't enabled in Clerk → runtime error `ClerkElementsRuntimeError: <Connection name="google"> isn't enabled` on every visit. Removed the Connection block, the "or with username" divider, and the unused `GoogleIcon` SVG component.

### 1.2 Removed orphan-creating public Sign Up tab
**Files**: `src/app/[[...sign-in]]/page.tsx`, `src/components/SignUpForm.tsx` (deleted), `src/lib/actions.ts`

Public sign-up created a Clerk user but **no matching Postgres row**, so every non-admin dashboard crashed on first login (Student/Teacher/Parent pages query their own row by `userId`). Replaced the Sign In / Sign Up tabs with a single sign-in form + a footnote: *"Don't have an account? Ask your school admin."* Deleted `SignUpForm.tsx`. Removed the orphaning `signUp` server action.

### 1.3 Always show "Sign Out" on the signed-in panel
**File**: `src/app/[[...sign-in]]/page.tsx`

Previously, if Clerk reported you signed-in but the dashboard for your role crashed (e.g. orphan student), the sign-in page kept redirecting back to `/student` → crash → loop with no escape. The "You're signed in" panel now **always** shows a Sign Out button regardless of whether a role is set.

### 1.4 Sign-up password strength meter (now redundant since 1.2 removed sign-up, but the helper code is here for reference)
A 4-segment strength bar with score 0-4 (length / mixed case / digit / symbol). Kept as a working reference even though the form is removed.

---

## 2. Defensive rendering + error boundaries

### 2.1 Fix `/student` crash on missing class
**File**: `src/app/(dashboard)/student/page.tsx`

The page did `classItem[0].id` with no guard, crashing with `Cannot read properties of undefined (reading 'id')` whenever a student had no class. Now uses `findFirst` and renders an `EmptyState` ("No class assigned yet — ask an admin to add you to a class") when the result is null. Removed the dangling `console.log(classItem)` and unused `BigCalender` import.

### 2.2 Empty state for parents with no children
**File**: `src/app/(dashboard)/parent/page.tsx`

Previously the page mapped over `students` and rendered nothing if empty — visually broken. Now shows a clear empty state explaining the link is missing.

### 2.3 Error boundaries
**Files**: `src/app/(dashboard)/error.tsx` (new), `src/app/global-error.tsx` (new)

Per-segment error boundary so one bad route doesn't blow up the dashboard shell. Shows the message + a `Try again` button. `global-error.tsx` is the last-resort fallback if the root layout itself throws.

---

## 3. Authorization & security

### 3.1 `requireRole(...allowed)` helper
**File**: `src/lib/auth.ts`

New helper that throws `AuthorizationError` if the caller is not signed in or doesn't hold one of the allowed roles. Reads `sessionClaims.metadata.role` from Clerk so it's a single Postgres-free check.

### 3.2 Role-gate every server-action mutation
**File**: `src/lib/actions.ts`

Wrapped 15 actions with `requireRole("admin")` (or `("admin", "teacher")` for exams):
- `createSubject` / `updateSubject` / `deleteSubject`
- `createClass` / `updateClass` / `deleteClass`
- `createTeacher` / `updateTeacher` / `deleteTeacher`
- `createStudent` / `updateStudent` / `deleteStudent`
- `createExam` / `updateExam` / `deleteExam`

Exams enforce a per-teacher constraint: a teacher can only create/edit exams for lessons they own. The `failure(err)` helper threads the AuthorizationError message back to the form so the user sees `"You don't have permission to do that."` instead of a silent red box.

### 3.3 Hardened `setMyRole` against self-promotion
**File**: `src/lib/actions.ts`

Previously any signed-in user could call `setMyRole("teacher")` even after their role was already set, allowing role change. Now checks `existing.publicMetadata.role` first; if it's already set, returns `"Role is already set on this account."` Roles can only be assigned by an admin via the create-user flow.

### 3.4 Removed `console.log(data)` from server actions
**File**: `src/lib/actions.ts`

`createStudent` previously logged the entire payload (including the password) to stdout. Replaced all `console.log(err)` patterns with a `failure(err)` helper that only logs in non-production.

### 3.5 Fixed class-capacity race in `createStudent`
**File**: `src/lib/actions.ts`

Previously: read `_count.students`, compare to capacity, then `create`. Two parallel signups could both pass the check before either one wrote. Now wrapped in a `prisma.$transaction(..., { isolationLevel: "Serializable" })`. Bonus: if Prisma rejects, the Clerk user we just created is **rolled back** with a best-effort `clerkClient.users.deleteUser` so we don't leave dangling Clerk accounts.

### 3.6 In-memory rate limiter on auth routes
**Files**: `src/lib/rateLimit.ts` (new), `src/middleware.ts`

Anonymous traffic to `/`, `/sign-in*`, `/onboarding` is capped at **30 hits / 60s / IP**, returns 429 with a `Retry-After` header beyond that. Single-process scope (good for one EC2 box; swap for Upstash/Redis when scaling). Also dropped the stray `console.log(matchers)` in middleware.

---

## 4. Forms — UX consistency

### 4.1 Shared `useFormSubmit` hook
**File**: `src/components/forms/useFormSubmit.ts` (new)

Consolidates `useFormState` + `useTransition` + `react-toastify` + `router.refresh()` into one tiny hook. Each form went from ~15 lines of repeated boilerplate to two lines:
```ts
const { submit, pending, state } = useFormSubmit(action, { entity: "Student", type, setOpen });
const onSubmit = handleSubmit((d) => submit(d));
```

### 4.2 Real error messages
**Files**: all 5 forms in `src/components/forms/`, `FormModal.tsx`

Submit failures used to show a fixed `"Something went wrong!"` red box. Now shows the actual `state.message` returned by the action ("Class is full.", "You don't have permission to do that.", etc.). Falls back to a generic toast when no message is provided.

### 4.3 Pending state on every submit + delete button
**Files**: all 5 forms + `FormModal.tsx`

Submit buttons now disable + show `Saving…` / `Deleting…` while the action is in-flight (`useTransition`). Prevents double-submits and gives users feedback.

### 4.4 Fixed copy-paste typo
**File**: `src/components/forms/ClassForm.tsx`

Successful Class create/update toasted **"Subject has been created!"** — fixed to "Class".

---

## 5. Deployment infrastructure

### 5.1 Multi-stage Dockerfile
**File**: `Dockerfile` (new)

Three stages: `deps` (npm ci) → `builder` (prisma generate + next build) → `runner` (Next standalone + prisma client + prisma engines + prisma CLI + tini). Final image ~240 MB. Runs as a non-root `nextjs` user.

**Iteration note**: First runtime image didn't include the prisma CLI binary, so the compose `command` fell back to `npx prisma migrate deploy` — which fetched the **latest** prisma from npm (7.8.0), whose schema syntax is incompatible with our 5.x schema. Fixed by also copying `node_modules/prisma` to the runtime stage and pointing the compose command at the bundled binary directly: `node node_modules/prisma/build/index.js migrate deploy`.

### 5.2 Switched Next.js to standalone output
**File**: `next.config.mjs`

Added `output: "standalone"` so the runtime stage can ship just the trimmed-down server.js + needed deps instead of the entire `node_modules`.

### 5.3 Bundled `sharp` for image optimization
**File**: `package.json`

Without `sharp`, Next standalone mode logs a runtime warning on every image request. Added `sharp ^0.34.5` as a runtime dependency so Next bundles it into the standalone output.

### 5.4 docker-compose.yml + Caddyfile
**Files**: `docker-compose.yml` (new), `Caddyfile` (new)

Three services: **postgres** (with healthcheck), **app** (depends on postgres healthy, runs migrations on start), **caddy** (binds 80/443, auto-TLS). Caddy adds HSTS, X-Content-Type-Options, Referrer-Policy. Volumes for `pgdata`, `caddy_data` (cert storage), `caddy_config`.

### 5.5 .dockerignore + .env.example
**Files**: `.dockerignore` (new), `.env.example` (new)

Tight build context (excludes `.next`, `node_modules`, `.git`, `.claude`, etc.). `.env.example` documents every required variable.

### 5.6 GitHub Actions deploy workflow
**File**: `.github/workflows/deploy.yml` (new)

`push: main` triggers two jobs:
1. **build-and-push**: docker build with GHA cache → push to `ghcr.io/jaskirat314276/winter-project-24:latest` and `:sha-XXXXXXX`
2. **deploy**: SSH into EC2 with three secrets (`EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY`) → `docker compose pull && docker compose up -d && docker image prune -f`

Total deploy: ~2 min from `git push`.

### 5.7 DEPLOY.md runbook
**File**: `DEPLOY.md` (new)

Step-by-step, copy-pasteable runbook from "fresh AWS account" to "live HTTPS deploy with CI/CD" — includes:
- Security group + key pair creation via AWS CLI
- EC2 t3.micro launch (Amazon Linux 2023, 12 GB gp3)
- Docker + Compose plugin install
- DuckDNS / deSEC domain setup
- Production `.env` template
- GitHub Actions secrets list
- Backup + restore commands (pg_dump cron line)
- Common operations (logs, restart, manual migrate)
- Troubleshooting matrix

---

## 6. Hygiene

### 6.1 Updated .gitignore
**File**: `.gitignore`

Added `.vscode`, `.idea`, `.claude` so editor + agent state never leak.

### 6.2 Vercel build fix (Prisma generate)
**File**: `package.json`

When the user briefly attempted a Vercel deploy, the build failed at "Collecting page data" because Vercel caches `node_modules` and the prisma client wasn't regenerated. Fix:
```json
"build": "prisma generate && next build",
"postinstall": "prisma generate"
```
The `postinstall` is the canonical Vercel-friendly fix.

---

## 7. Production deployment story (the actual deploy)

### 7.1 AWS CLI install
Installed `awscli@2.34.40` via Homebrew.

### 7.2 EC2 launch (region `ap-south-1`, Mumbai)
- Created security group `smartschool-sg` with 22/80/443 ingress from `0.0.0.0/0`
- Created RSA key pair `smartschool-key`, saved to `~/.ssh/smartschool-key.pem` (0600)
- Found latest AL2023 AMI: `ami-0af745cab951f3029`
- Launched t3.micro `i-0a41d278ea59a4311` with 12 GB gp3 EBS, public IP `13.201.26.59`

### 7.3 Domain setup (deSEC.io)
- Created free domain `smartschoolerp.dedyn.io`
- Pointed A record to `13.201.26.59`
- Added 5 CNAMEs for Clerk Production verification:
  - `clerk` → `frontend-api.clerk.services.`
  - `accounts` → `accounts.clerk.services.`
  - `clkmail` → `mail.xz09lv154oat.clerk.services.`
  - `clk._domainkey` → `dkim1.xz09lv154oat.clerk.services.`
  - `clk2._domainkey` → `dkim2.xz09lv154oat.clerk.services.`

### 7.4 Box bootstrap
- Added 2 GB swap (essential — Next.js build OOMs on 914 MB RAM otherwise)
- Installed docker, git, docker-compose plugin, buildx 0.33 (compose v5 requires buildx ≥ 0.17, AL2023's bundled docker doesn't include it)
- Cloned repo to `/opt/smartschool`
- Wrote production `.env` (chmod 600) with a 32-char random Postgres password, dev Clerk keys initially

### 7.5 First boot iterations
- **Round 1**: failed — compose v5 requires buildx 0.17+ → installed buildx 0.33
- **Round 2**: built but boot failed — `npx prisma migrate deploy` downloaded prisma 7.8.0 (breaking change in schema syntax)
- **Round 3** (fix in `Dockerfile` + `docker-compose.yml`): bundled prisma CLI in runtime image, pointed compose `command` at `node node_modules/prisma/build/index.js migrate deploy` — booted cleanly, migrations applied, `Ready in 129ms`

### 7.6 TLS
Caddy auto-issued Let's Encrypt cert for `smartschoolerp.dedyn.io` on first request (~10 s).

### 7.7 GitHub Actions wiring
Added three secrets in repo settings:
- `EC2_HOST = 13.201.26.59`
- `EC2_USER = ec2-user`
- `EC2_SSH_KEY = <full contents of smartschool-key.pem>`

Tested by pushing the `sharp` dep — workflow built image, pushed to GHCR, SSHed into EC2, restarted container. Total time: ~5 min.

### 7.8 Production Clerk
- Created production instance in Clerk dashboard
- Added 5 CNAMEs (above) → all verified
- SSL certs issued for `clerk.smartschoolerp.dedyn.io` (frontend API)
- Generated `pk_live_…` / `sk_live_…`
- Updated `/opt/smartschool/.env` on EC2 (kept `.env.bak.<ts>` backup)
- Restarted app — production keys live

### 7.9 First admin user
Created in Clerk dashboard → Users → set `publicMetadata.role = "admin"` → signed in successfully on `https://smartschoolerp.dedyn.io`.

### 7.10 Demo data seed
Ran `prisma db seed` via a one-off `node:20-alpine` container with full deps (since the runtime image strips ts-node). Seeded:
- 2 admins, 6 grades, 6 classes, 15 teachers, 25 parents, 50 students, 10 subjects, 30 lessons, 10 exams, 10 results

---

## File summary

| Action | Path |
|---|---|
| **New** | `src/app/(dashboard)/error.tsx` |
| **New** | `src/app/global-error.tsx` |
| **New** | `src/components/forms/useFormSubmit.ts` |
| **New** | `src/lib/auth.ts` (added `requireRole` + `AuthorizationError`) |
| **New** | `src/lib/rateLimit.ts` |
| **New** | `Dockerfile` |
| **New** | `.dockerignore` |
| **New** | `docker-compose.yml` |
| **New** | `Caddyfile` |
| **New** | `.env.example` |
| **New** | `DEPLOY.md` |
| **New** | `CHANGES.md` (this file) |
| **New** | `.github/workflows/deploy.yml` |
| **Modified** | `src/app/[[...sign-in]]/page.tsx` |
| **Modified** | `src/app/(dashboard)/student/page.tsx` |
| **Modified** | `src/app/(dashboard)/parent/page.tsx` |
| **Modified** | `src/lib/actions.ts` |
| **Modified** | `src/middleware.ts` |
| **Modified** | `src/components/FormModal.tsx` |
| **Modified** | all 5 files in `src/components/forms/` |
| **Modified** | `next.config.mjs` (added `output: "standalone"`) |
| **Modified** | `package.json` (sharp dep + prisma generate scripts) |
| **Modified** | `.gitignore` (added `.vscode`, `.idea`, `.claude`) |
| **Modified** | `README.md` (full rewrite) |
| **Deleted** | `src/components/SignUpForm.tsx` |

---

## What's still on the table (not done in this session)

Recommended next investments, roughly highest-leverage first:
1. **Audit log** — schools need "who changed Jane's grade and when". A `AuditLog(model, recordId, action, actorId, before, after, at)` table written from a Prisma extension.
2. **Soft delete** — add `deletedAt` to user-facing models so you don't lose history when a student leaves.
3. **Pagination + search server-side** — list pages currently fetch everything.
4. **Tests** — Vitest on Zod schemas + one Playwright happy-path per role.
5. **Sentry** for error tracking.
6. **Email notifications** — assignment due, attendance threshold, exam published. Resend or Postmark.
7. **PDF exports** — report cards, attendance sheets.
8. **Multi-tenancy** — `schoolId` on every model if you ever sell to two schools.
9. **i18n** with `next-intl`.

See the deeper exploration in chat history for the full 33-item breakdown.
