# FocusFlow — Product Requirements

## Original problem
Build "FocusFlow" — an ADHD-friendly productivity web app. Warm, encouraging, never shaming. Core: focus timer, brain dump with AI breakdown, gamification with grace days, mood check-ins, body doubling rooms, reward shop, weekly planner, onboarding.

## Tech (adapted)
- Frontend: React 19 + Tailwind + shadcn/ui (Nunito font)
- Backend: FastAPI + Motor (MongoDB)
- Auth: JWT email/password
- AI: Emergent Universal LLM Key → GPT-5.2
- Confetti: canvas-confetti
- Stripe & real-time WS: deferred to phase 2 (UI only)

## Personas
- ADHD adult students/professionals overwhelmed by big tasks
- Neurodivergent users burned by aggressive productivity tools
- ADHD coaches (future Teams tier)

## Core static requirements
- Never shame; grace days for streaks (2/week)
- Max 3 today tasks visible
- Reduce-motion + high-contrast accessibility
- Soft palette: deep warm charcoal + warm yellow + soft purple + calming teal

## Implemented (2026-02)
- Landing page with hero, focus buddy, feature cards
- Auth: register/login, JWT in localStorage, /auth/me hydration
- 5-step onboarding (struggles, focus length, buddy, notifications, first task)
- Dashboard: level/XP bar, daily affirmation (AI), 3 tasks, mood check-in, streak badge, body-double pulse, START FOCUS CTA
- Focus timer: breathing circle SVG, 10/15/25/45 mins, sound picker, confetti + XP on completion
- Tasks: brain dump CRUD, emoji tags (😰😴⚡🌱), AI micro-step breakdown, AI empathy ("why is this hard?"), Just-One-Thing mode
- Body doubling: 4 mock rooms with hourly seeded live counts, 15-min co-working timer (+10 XP bonus)
- Progress: stat cards, mood/energy bar chart (14 entries), badges grid, weekly wrapped summary
- Shop: 8 items (themes/buddies/cards/sounds), XP currency, owned states
- Settings: reduce_motion, high_contrast, focus_length, default sound
- Pricing page: Free / Pro / Teams (UI only)
- Gamification: XP awards (15/task, 5/mood, =duration_min/focus, +10/co-work), 10 levels with titles, auto badges (first_focus, streak_5, streak_14), grace day logic

## Backlog (P0 → P2)
- P0: Stripe checkout for Pro ($7.99/mo, $59.99/yr) + Teams ($12/user/mo)
- P0: Drag-to-reorder tasks (UI not yet wired to /tasks/reorder)
- P1: Weekly planner (drag tasks to days, max 3/day, auto rollover)
- P1: Real-time body doubling via WebSockets
- P1: Web Push notifications + custom windows
- P1: Hyperfocus alert (3 timers no break)
- P2: Coach dashboard, Slack integration, ADHD coach marketplace
- P2: XP booster pack microtransactions
- P2: Custom themes purchased in shop actually re-skin app
- P2: Spotify-style Sunday weekly wrapped recap

## Test creds
See /app/memory/test_credentials.md

## Update (2026-02 — Sprint 2)
- **Audio playback** on /focus: real CDN MP3s for lofi/rain/white-noise (silence = no audio), looping, 40% default volume, slider + mute, stops on timer end / Exit / Reset
- **XP Booster Packs** in Shop: 3 colored packs (Small Spark +100/$1.99 yellow, Focus Surge +250/$2.99 teal with "⚡ Popular" badge, Flow State +600/$4.99 purple), confirm modal, instant XP grant (mock, no real charge), confetti + "You're unstoppable today! 🚀"
- **Stripe Pro Checkout** (real test mode `sk_test_emergent`): `/api/checkout/pro/session` → Stripe-hosted checkout, success → polls `/api/checkout/status/{sid}` → sets `is_pro=true`, webhook `/api/webhook/stripe` mirrors; Dashboard shows "Welcome to Pro 🌟" banner; sidebar PRO badge for pro users
- **Free-tier gating**: 3 focus sessions/day enforced server-side (402 error), AI breakdown 402 for non-pro with "(Pro)" UI label, dashboard shows "0/3 free sessions used today" counter
- **Pre-launch polish**: index.html — title, meta description, og:title/description/image (Blob mascot), twitter card; Landing page email waitlist (`/api/waitlist` MongoDB collection, duplicate-safe)
- Tests: 28/29 backend pass; minor Stripe status 404 mapping fixed; XP grant now atomic via `$inc`

