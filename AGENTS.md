<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Stack

- **Next.js 16.2.4** (App Router, see above) + **React 19.2.4** + **TypeScript 5**
- **Supabase** (`@supabase/ssr`, `@supabase/supabase-js`) — auth, DB, RLS
- **Tailwind CSS v4** (`@tailwindcss/postcss` alone, no `tailwind.config` plugins)
- **Recharts** for charts, **Framer Motion** for animations, **Lucide React** for icons
- **clsx** + **tailwind-merge** (`cn()` helper in `src/lib/utils.ts`)
- **ESLint 9** with `eslint-config-next` (no Prettier, no Husky, no CI workflows)

## Commands

| Action | Command |
|--------|---------|
| Dev server | `npm run dev` (port 3000) |
| Build | `npm run build` |
| Lint | `npm run lint` |
| No typecheck script | Add `tsc --noEmit` if needed |

## Key paths & architecture

- `src/app/` — Next.js App Router pages (route groups: `(auth)/`, `auth/`, `dashboard/`)
- `src/components/` — React components: `providers/AuthProvider`, `layout/AppShell`, `layout/ThemeProvider`, `layout/NotificationsBell`
- `src/lib/supabase/server.ts` — server Supabase client (cookie-based)
- `src/lib/supabase/client.ts` — browser Supabase client (persists session)
- `src/lib/verification.ts` — payment verification workflow (request, verify, reject)
- `src/types/index.ts` — app types (User, Household, Housemate, Bill, BillShare)
- `src/types/supabase_types.ts` — exists but empty (no generated types)

## App flow

1. `/` redirects to `/login`
2. `/login` — email/password auth (login/signup tabs)
3. `/auth/callback` — OAuth exchange, redirects to `/dashboard` or `/onboarding`
4. `/onboarding` — create (via `rpc("create_household")`) or join (via `rpc("join_household")`) a household
5. `/dashboard` — recent bills, stats, housemate avatars
6. `/dashboard/bills` — bill CRUD, split tracking, payment verification, embedded analytics
7. `/dashboard/housemates` — manage roster, copy invite code
8. `/dashboard/settings` — profile, appearance (3 themes), notifications, FAQs
9. `/dashboard/analytics` — spending breakdowns, charts, settlement rates

## Notable quirks

- **AuthProvider** in `src/components/providers/AuthProvider.tsx` suppresses "Invalid Refresh Token" console errors; has 3s fallback + 6s hard timeout to avoid permanent loading
- **AppShell** has sidebar/header/bottom-nav built-in with inline CSS; standalone `Sidebar.tsx`, `TopBar.tsx`, `BottomNav.tsx` exist but are **unused stubs**
- **Theme**: 3 modes (dark/darker/light) stored in `localStorage` key `divvy-theme`, applied via `data-theme` attribute on `<html>`, defined in `src/app/globals.css`
- **Supabase RPC**: Household creation/join uses `rpc("create_household")` and `rpc("join_household")` (security definer functions) — **not** direct inserts
- **Currencies**: Naira (`₦`), `en-NG` locale formatting throughout
- **`.env.local`** is committed with real Supabase keys (treat as sensitive; do not share)
- **`CLAUDE.md`** just `@AGENTS.md` — update AGENTS.md to affect both
