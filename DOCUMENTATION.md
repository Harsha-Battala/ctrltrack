# CtrlTrack — Full Project Documentation

**Control Your Goals. Track Your Progress.**

This document is the single source of truth for what CtrlTrack is, how it is
built, what every file/table does, and everything that has been shipped so far.
It is committed to the repository so the whole build history is visible in
GitHub.

---

## 1. What the project is

CtrlTrack is a **personal Life & Career Operating System**. Instead of one flat
to-do list, everything is organised into life domains (categories) and an AI
layer reasons *across* those domains.

Core pillars:

1. **Track** — job applications, habits, learning, certifications, goals,
   fitness, daily tasks.
2. **Understand** — a rule-based productivity engine scores momentum and
   surfaces insights.
3. **Converse** — an AI companion ("Ctrl") that roams the screen and answers
   questions about your own data.

---

## 2. Tech stack

| Layer | Technology |
| --- | --- |
| Framework | TanStack Start v1 (React 19, SSR, Vite 7) |
| Routing | TanStack Router (file-based, `src/routes`) |
| Data fetching | TanStack Query |
| Styling | Tailwind CSS v4 (`src/styles.css`, `@theme` tokens, `@utility`) |
| Components | shadcn/ui + Radix primitives + lucide-react icons |
| Backend | Lovable Cloud (managed Postgres, Auth, Storage, Edge Functions) |
| AI | Lovable AI Gateway (Gemini models) via AI SDK streaming |
| Fonts | Outfit Variable (display) + Figtree Variable (body) |
| Dates | date-fns |
| Toasts | sonner |

> The project originally specified Firebase; it was implemented on Lovable Cloud
> instead for native integration, managed RLS and zero key handling.

---

## 3. Design system

Theme: **Charcoal & Ember** — warm, luxurious dark UI.

| Token | Value (intent) |
| --- | --- |
| Background | deep charcoal `#1a1a1a` family |
| Surface / cards | `#2d2d2d` family with gradient surface |
| Border | `#4a4a4a` family |
| Primary / accent | ember orange `#e85d3a` |
| Success | green, Warning | amber, Destructive | red |

All colours live as OKLCH CSS variables in `src/styles.css`. Components never
hardcode colours — they use semantic tokens (`bg-card`, `text-primary`,
`bg-gradient-primary`, `shadow-elegant`, …).

Custom utilities defined in `src/styles.css`:

- `bg-gradient-primary`, `bg-gradient-surface`, `bg-hero`, `shadow-elegant`,
  `shadow-card`
- Tagline: `tagline-shell`, `tagline-text`, `tagline-dot`, `tagline-spark`
  (glassmorphic ember pill with shimmer, breathe and hover-lift)
- AI pet: `ai-pet`, `ai-pet-body`, `ai-pet-ring`, `ai-pet-core`, `ai-pet-face`,
  `ai-pet-eye`, `ai-pet-shine`, `ai-pet-shadow`, `ai-pet-tip`, `ai-pet-paused`
- Habits: `habit-card`, `habit-streak`, `habit-range`, `habit-range-btn`,
  `habit-cell`, `habit-cell-label`, `habit-cell-check`, `habit-month-break`
- `page-enter` route transition, themed slim scrollbars

---

## 4. Database schema (Lovable Cloud / Postgres)

All tables live in `public`, have RLS enabled, explicit `GRANT`s, and are scoped
by `user_id = auth.uid()`.

| Table | Purpose | Key columns |
| --- | --- | --- |
| `profiles` | user metadata, synced from auth by trigger | `id`, `full_name`, `email`, `avatar_url`, `career_goal` |
| `categories` | life domains | `id`, `user_id`, `name`, `description`, `icon`, `color` |
| `items` | tasks / goals / habits / job applications | `id`, `category_id`, `title`, `description`, `priority`, `completed`, `completed_at`, job fields |
| `habit_logs` | one row per habit per completed day | `item_id`, `user_id`, `log_date` |
| `activities` | append-only audit feed | `action`, `entity_type`, `entity_title`, `category_name` |
| `agent_recommendations` | stored AI insights | `title`, `body`, `kind`, `created_at` |
| `agent_runs` | append-only AI run log | `model`, `status`, `created_at` |

Job pipeline extras on `items`: `job_status` enum
(`applied | recruiter_action | interview | reviewed | offer | rejected`),
`job_company`, `job_role`, `job_applied_date`, `job_resume_sent`.

Storage: private `avatars` bucket with per-user RLS policies.

Uniqueness guard: unique index on `categories (user_id, lower(name))` prevents
duplicate starter categories from a double-fired seeder.

### Migrations (chronological)

```
20260619161507_… initial schema (profiles, categories, items, activities) + RLS
20260619161551_… auth trigger + storage policies
20260621142455_… category description column
20260621143028_… unique index on (user_id, lower(name))
20260704000000_agent_memory.sql        agent_recommendations + agent_runs
20260705000000_job_pipeline_fields.sql job_status enum + job columns + index
20260705010000_habit_logs.sql          habit_logs table + RLS + grants
20260705091126_… / 20260705093639_… / 20260706033544_… policy + index refinements
```

---

## 5. Routing map

```
src/routes/
  __root.tsx              html shell, favicon, meta, providers, Toaster
  index.tsx               public landing page (hero, features, CTA)
  auth.tsx                login / sign-up (email + Google)
  reset-password.tsx      password recovery
  _app.tsx                protected layout: sidebar, header tagline, AI pet
  _app.dashboard.tsx      smart dashboard
  _app.categories.tsx     category grid + CRUD
  _app.categories.$id.tsx category detail (generic / jobs / habits views)
  _app.activity.tsx       activity timeline
  _app.coach.tsx          AI Coach insights page
  _app.profile.tsx        profile + avatar upload
  api/pet-chat.ts         streaming AI chat endpoint for the pet
  sitemap[.]xml.ts        sitemap
```

`_app.tsx` is a pathless layout: it guards auth, renders the sidebar, the
animated ember tagline pill, the roaming AI pet, and `<Outlet />`.

---

## 6. Feature-by-feature detail

### 6.1 Auth
`src/lib/auth-context.tsx` wraps Supabase auth: session listener, sign in/up/out,
Google OAuth, and **starter-category seeding** on first login (coalesced promise
+ localStorage flag so it never double-runs).

### 6.2 Starter categories
`src/lib/starter-categories.ts` defines 8 seeded domains with icon, colour and
description: Jobs Applied, Learning, Certifications, Goals, Habits, Daily Goals,
Fitness, General Tasks. Existing users get a "Setup starter categories" button on
the dashboard and categories page.

### 6.3 Jobs pipeline
The `Jobs Applied` category renders a specialised view: status counters
(applied → offer/rejected), company/role fields, resume-sent flag and a
dedicated `JobItemDialog`.

### 6.4 Habits (see §7 for the latest UI upgrade)
The `Habits` category renders `HabitRow` cards backed by `habit_logs`, with
streaks, 30-day consistency and per-day check-ins.

### 6.5 AI Coach
`src/lib/coach.ts` is a deterministic rule engine that computes a
**Productivity Score (0–100)** from completion rate, weekly activity and
category coverage, then emits insight cards and "priorities for tomorrow".
`supabase/functions/ai-coach` provides the model-backed variant and returns only
generic error messages to clients (detailed logs stay server-side).

### 6.6 Ctrl — the roaming AI pet
`src/components/ai-pet.tsx` renders a futuristic chrome orb: spinning orbital
ring, glowing ember core, scanning eyes, glass shine and light-pool shadow. It
roams with random-position CSS transitions, freezes on hover, shows floating
tips, and opens a chat drawer. `src/routes/api/pet-chat.ts` streams responses
through the Lovable AI Gateway with a snapshot of the user's categories/items as
context.

---

## 7. Habits UI upgrade (latest release)

Everything from the 10-point plan is implemented:

1. **Animated check-in** — spring scale-pop plus an ember ripple burst
   (`habit-pop`, `habit-ripple`); un-ticking reverses smoothly.
2. **Heatmap intensity** — completed cells are shaded by consecutive-run depth
   (`data-level` 1–5, faint ember → full gradient).
3. **Today halo** — today's cell has a continuously pulsing ember ring
   (`habit-today`).
4. **Range switcher** — 7 / 14 / 30-day pill toggle per habit.
5. **Weekday labels + month separators** — single-letter weekday captions and a
   dashed divider where the month changes.
6. **Streak badges** — animated flame for the live streak plus a trophy badge
   with the best streak (180-day window).
7. **Habits summary bar** — Done today, Avg consistency, Longest streak, Total
   check-ins, plus a "today's check-ins" progress bar in the header card.
8. **Glassy gradient habit cards** with a priority-coloured left edge and hover
   lift.
9. **Quick "Log today"** button on every card — becomes "Done today" when ticked.
10. **Micro-interactions** — check icon springs in, day number fades out, cells
    lift on hover, badges breathe.

Key helpers exported from `src/components/habit-tracker.tsx`:
`computeStreak`, `computeBestStreak`, `computeCompletionRate`, `HabitRow`.

---

## 8. Key code references

```
src/lib/auth-context.tsx        session + starter seeding
src/lib/activity.ts             logActivity() audit helper
src/lib/coach.ts                productivity score + insight rules
src/lib/starter-categories.ts   8 seeded life domains
src/lib/ai-gateway.server.ts    server-side AI gateway client
src/components/habit-tracker.tsx  habit card + check-in grid
src/components/ai-pet.tsx       roaming companion + chat drawer
src/components/category-dialog.tsx / item-dialog.tsx / job-item-dialog.tsx
src/styles.css                  theme tokens, animations, utilities
```

---

## 9. Security posture

- RLS on every table; policies scoped to `auth.uid()`.
- Explicit `GRANT`s for `authenticated` / `service_role`; no blanket `anon`.
- `agent_runs` is intentionally append-only (no UPDATE/DELETE policies) — it is
  an audit log; this was reviewed and accepted.
- The `ai-coach` edge function never forwards raw provider errors to clients.
- Secrets (AI gateway key, service role) stay in the server runtime only.

---

## 10. Running the project

```bash
bun install
bun run dev     # http://localhost:8080
```

Deployment is handled by Lovable (published at `ctrltrack.lovable.app`). Code
syncs two-way with GitHub, so this documentation travels with the repository.

---

## 11. Changelog

See `CHANGELOG.md` for the chronological build history.
