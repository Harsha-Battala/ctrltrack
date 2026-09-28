# CtrlTrack — Changelog

Chronological record of everything built so far. Newest first.

## Recurring tasks engine
- "Repeats daily" toggle on tasks in any category (off by default; Habits always recurring).
- Shared `habit_logs` check-in engine now powers streaks and tick grids for all
  recurring tasks, not just Habits.
- Daily Goals: one-time tasks shown only on their creation day (local date),
  hidden afterwards — not deleted. Fresh daily list with no cron needed.

## App reorganization
- Sidebar grouped into Overview / Life OS / Intelligence / Account with an
  animated active-marker line.
- Shared `PageHeader` across pages: glowing icon chip, section eyebrow, title,
  description and sliding action buttons.
- Custom themed scrollbars and page-enter route transitions.


## Habits experience overhaul
- Animated check-in cells: spring scale-pop + ember ripple burst on tick.
- Heatmap-style intensity — completed days shade deeper with longer runs.
- Pulsing halo around today's cell.
- Per-habit 7 / 14 / 30-day range switcher.
- Weekday letter captions and dashed month separators in the grid.
- Live streak flame badge plus best-streak trophy badge.
- Habits summary bar: Done today, Avg consistency, Longest streak, Total check-ins,
  and a "today's check-ins" progress bar in the header.
- Glassy gradient habit cards with priority-coloured left edge and hover lift.
- Quick "Log today" button that flips to "Done today".
- Micro-interactions across cells, badges and cards.
- Full project documentation committed (`DOCUMENTATION.md`, this changelog).

## Ctrl — roaming AI companion
- Chrome-glass orb with spinning orbital ring, ember core, scanning eyes,
  glass shine and light-pool shadow; roams the screen and freezes on hover.
- Conversational chat drawer with quick prompts and streaming replies.
- Streaming chat endpoint backed by the AI gateway with user-data context.

## Visual polish pass
- Ember hero glow and accent hairline on the main content area.
- Page-enter route transitions and themed slim scrollbars.
- Gradient stat cards with hover lift; dashboard greeting icon fix.
- Activity page event-count badge.

## Animated tagline
- Glassmorphic "ember pill" tagline in the app header with shimmer, breathing
  pulse, sparkle icons and a hover lift/glow.

## Habits data layer
- `habit_logs` table with RLS for daily check-ins.
- Fixed a React hook-order crash on the category detail page.

## Jobs pipeline
- `job_status` enum plus company, role, applied date and resume-sent fields.
- Dedicated jobs view with status counters and a job-specific dialog.

## AI Coach
- Rule-based productivity score (0–100) from completion rate, weekly activity
  and category coverage.
- Dynamic insight cards and suggested priorities for tomorrow.
- Smart dashboard widgets and AI Coach preview banner.
- `agent_recommendations` and `agent_runs` tables; `ai-coach` edge function.
- Security hardening: generic client errors, server-side detailed logging.

## Life OS model
- Eight starter categories seeded automatically for new users
  (Jobs Applied, Learning, Certifications, Goals, Habits, Daily Goals, Fitness,
  General Tasks) with descriptions, icons and colours.
- Manual "Setup starter categories" action for existing users.
- Unique index on `(user_id, lower(name))` to stop duplicate seeding.

## Branding and theme
- Charcoal & Ember dark theme (OKLCH tokens) with Outfit + Figtree typography.
- Custom "CT" logo across landing, sidebar, auth screens and favicon.

## Foundation
- Auth (email + Google), protected app layout with collapsible sidebar.
- Dashboard, categories, category detail, activity timeline and profile pages.
- Database: profiles, categories, items, activities with RLS and grants;
  private avatars storage bucket.
