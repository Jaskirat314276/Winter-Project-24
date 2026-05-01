# Smart School ERP

A multi-role school management dashboard. Admins, teachers, students, and parents each see a tailored view of attendance, classes, lessons, exams, assignments, results, events, and announcements — all backed by a single shared database.

🔗 **Live**: https://smartschoolerp.dedyn.io
📁 **Source**: https://github.com/Jaskirat314276/Winter-Project-24
🚀 **Deploy guide**: [DEPLOY.md](./DEPLOY.md)
📝 **Session changelog**: [CHANGES.md](./CHANGES.md)

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 14** (App Router, RSC, Server Actions) | Single codebase for routing, rendering, and mutations |
| Language | **TypeScript** | Type-safe data flow from DB to UI |
| Styling | **Tailwind CSS** | Fast iteration, consistent design tokens |
| Database | **PostgreSQL 16** | Relational integrity for the school domain |
| ORM | **Prisma 5** | Type-safe queries + first-class migrations |
| Auth | **Clerk** (Production env) | Username/password + role-based access via `publicMetadata.role` |
| File uploads | **Cloudinary** (`next-cloudinary`) | CDN-backed image hosting for student/teacher photos |
| Forms | **react-hook-form** + **Zod** | One source of truth for validation, client + server |
| Charts | **Recharts** | Aggregated counts, attendance, finance |
| Calendar | **react-big-calendar** + **moment** | Per-class / per-teacher schedules |
| Toasts | **react-toastify** | Surfaced from a shared `useFormSubmit` hook |
| Hosting | **AWS EC2 t3.micro** + Docker Compose | Cheapest production-grade stack with full control |
| Reverse proxy / TLS | **Caddy 2** | Auto-issues + auto-renews Let's Encrypt certs |
| CI/CD | **GitHub Actions** → **GHCR** → **SSH deploy** | Push to `main` → live in ~2 min |
| DNS | **deSEC.io** (free) | Subdomain `smartschoolerp.dedyn.io` |

---

## Features

### Admin
- Dashboard with KPIs: total admins/teachers/students/parents
- Charts: attendance trends, gender split, finance (income vs expense)
- Live event calendar + announcements
- Full CRUD on **Students, Teachers, Parents, Classes, Subjects, Lessons, Exams, Assignments, Results, Attendance, Events, Announcements** via the **Lists** pages
- Per-class supervisor assignment + capacity enforcement (transactional, can't overflow)
- Single source of truth: each create/update/delete writes to **both Clerk and Postgres** atomically

### Teacher
- Personal schedule (drawn from `Lesson` rows where `teacherId = me`)
- Schoolwide announcements feed
- Can create/edit **exams** for their own lessons (server-side check; teachers cannot touch other teachers' exams)

### Student
- Personal schedule (their class's lessons)
- Per-day events
- Announcements feed
- Empty state if a brand-new student isn't yet linked to a class (no crashes — middleware + `error.tsx` handle it)

### Parent
- Schedules for **all** linked children
- School announcements
- Empty state when no children are linked yet

### Authentication & authorization
- Clerk handles identity (username + password), session cookies, sign-in/sign-up routing
- App enforces role-based authorization via:
  - **Middleware**: redirects each role to their allowed routes only (`src/middleware.ts` + `src/lib/settings.ts`)
  - **Server actions**: every create/update/delete calls `requireRole(...)` (`src/lib/auth.ts`) so a logged-in student can't `deleteTeacher`
  - **In-memory rate limiter** on auth routes (30 req/min per IP) to slow brute-force attempts
- Role onboarding: `setMyRole` is one-shot — once a role is set in Clerk metadata, it can't be self-changed (closes a privilege-escalation hole)

### Production hardening (deployed)
- HTTPS with Let's Encrypt auto-renewal
- Caddy hardening headers: HSTS, X-Content-Type-Options, Referrer-Policy
- Postgres in a private Docker network (no public 5432)
- Database password rotated to a 32-char random string in production
- All secrets in `/opt/smartschool/.env` (chmod 600), never in git
- Migrations run automatically on container start (`prisma migrate deploy`)
- Class-capacity race-condition fixed with a serializable transaction + Clerk user rollback on Prisma failure
- `error.tsx` boundaries per route segment so one bad query doesn't break the shell

---

## Project structure

```
src/
├── app/
│   ├── (dashboard)/                ← role-gated routes
│   │   ├── admin/                  ← admin dashboard + charts
│   │   ├── teacher/                ← teacher schedule + announcements
│   │   ├── student/                ← student schedule (defensive empty state)
│   │   ├── parent/                 ← parent view of children
│   │   ├── list/{students,teachers,parents,classes,...}/  ← CRUD list pages
│   │   ├── error.tsx               ← per-segment error boundary
│   │   └── layout.tsx
│   ├── [[...sign-in]]/             ← Clerk Elements sign-in (catch-all at /)
│   ├── onboarding/                 ← landing for users with no role yet
│   ├── global-error.tsx
│   └── layout.tsx
├── components/
│   ├── forms/                      ← StudentForm, TeacherForm, ClassForm, ExamForm, SubjectForm
│   │   └── useFormSubmit.ts        ← shared submit + toast + pending-state hook
│   ├── FormModal.tsx               ← lazy-loaded form launcher with delete confirmation
│   ├── BigCalendarContainer.tsx    ← schedule renderer
│   ├── Charts (Attendance, Count, Finance)
│   └── Announcements / EventCalendar / UserCard
├── lib/
│   ├── actions.ts                  ← all Server Actions (create/update/delete) — role-gated
│   ├── auth.ts                     ← requireRole helper + AuthorizationError
│   ├── prisma.ts                   ← global PrismaClient singleton
│   ├── rateLimit.ts                ← in-memory sliding-window IP throttle
│   ├── formValidationSchemas.ts    ← Zod schemas
│   ├── data.ts                     ← shared mock/static data
│   └── settings.ts                 ← route → allowed-roles map
├── middleware.ts                   ← Clerk + role routing + rate limit
└── types/global.d.ts

prisma/
├── schema.prisma                   ← 14 models
├── seed.ts                         ← demo data: 2 admins, 6 grades, 6 classes, 15 teachers, 25 parents, 50 students, 10 subjects, 30 lessons, 10 exams, 10 results
└── migrations/

# Deployment artifacts
Dockerfile                          ← multi-stage, ~240 MB image
docker-compose.yml                  ← app + postgres + caddy
Caddyfile                           ← auto-TLS + hardening headers
.github/workflows/deploy.yml        ← CI/CD: build → push GHCR → SSH deploy
.env.example                        ← all required env vars documented
DEPLOY.md                           ← full EC2 runbook with troubleshooting
```

---

## Local development

```bash
git clone https://github.com/Jaskirat314276/Winter-Project-24.git
cd Winter-Project-24

# 1. Postgres locally (Homebrew):
brew services start postgresql@15
createdb happydesk
createuser -s happydesk

# 2. Env
cp .env.example .env
# Fill in Clerk dev keys + Cloudinary cloud name, set DATABASE_URL to your local Postgres

# 3. Install + migrate + seed
npm install
npx prisma migrate dev
npx prisma db seed   # optional — populates demo data

# 4. Run
npm run dev          # http://localhost:3000
```

To log in: visit Clerk dashboard → **Users** → create a user → set `publicMetadata` to `{"role": "admin"}` → use those credentials at http://localhost:3000.

---

## Deploy

See **[DEPLOY.md](./DEPLOY.md)** for the full EC2 + Docker + GitHub Actions runbook (~30 min first time). Subsequent deploys are `git push` only.

---

## License

Educational/portfolio project. No formal license attached.
