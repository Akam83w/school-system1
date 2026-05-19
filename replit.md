# نظام إدارة المدرسة

Iraqi school management system — offline-first PWA with Arabic RTL, JWT auth, PostgreSQL backend, and IndexedDB offline persistence.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/school run dev` — run the school frontend (port varies)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5, JWT auth
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Frontend: React + Vite, Tailwind CSS, Wouter (NOT React Router)
- UI: Radix UI components, shadcn/ui
- Data fetching: TanStack React Query (`networkMode: offlineFirst`)
- PWA: vite-plugin-pwa + Workbox (NetworkFirst for API, CacheFirst for assets)
- Offline: Dexie (IndexedDB) for data persistence + action queue

## Where things live

- `artifacts/api-server/` — Express 5 API server
- `artifacts/school/` — React + Vite school frontend
- `artifacts/school/src/lib/offlineDb.ts` — Dexie schema (students, classes, teachers, subjects, offlineActions)
- `artifacts/school/src/lib/offlineSync.ts` — Sync service: queue, cache refresh, sync processing
- `artifacts/school/src/hooks/useNetworkStatus.ts` — Online/offline detection + auto-sync hook
- `artifacts/school/src/components/offline-banner.tsx` — Offline/syncing status bar (top of page)
- `artifacts/school/src/components/layout.tsx` — Network status pill in topbar
- `lib/` — Shared TypeScript libraries
- `lib/db/` — Drizzle schema (source of truth)
- `lib/api-spec/` — OpenAPI spec (source of truth for API contracts)

## Architecture decisions

- **Contract-first API**: OpenAPI spec in `lib/api-spec/` generates React Query hooks + Zod schemas via Orval. Never write API client code by hand.
- **Offline-first PWA**: Service worker (Workbox) caches all UI assets + API GET responses. IndexedDB (Dexie) stores entity data locally for reads. Offline writes are queued in `offlineActions` table and auto-synced on reconnect.
- **Offline write flow**: On form submit → check `navigator.onLine` → if offline, call `enqueueAction()` in IDB + show "pending" badge in UI → on reconnect, `syncPendingActions()` processes queue in timestamp order → `queryClient.invalidateQueries()` refreshes UI.
- **Offline read flow**: `useListStudents` serves from Workbox Cache Storage (NetworkFirst, 5s timeout, 24h TTL). Additionally, `refreshOfflineCache()` populates Dexie on login for an explicit IDB fallback. Students page falls back to IDB when `isError` or `!isOnline`.
- **Auth**: JWT stored as `school_token` in localStorage. `getToken()`/`setToken()` in `src/lib/auth.ts`.
- **Routing**: Wouter (not React Router). Base path from `import.meta.env.BASE_URL`.

## Product

- **Dashboard**: Live stats (students, teachers, classes, subjects, attendance rate, top grades)
- **Students**: Full CRUD, class filtering, profile detail page. Offline: read from IndexedDB cache.
- **Teachers / Classes / Subjects**: Full CRUD with search and filters
- **Attendance**: Record per student per day. Offline: queued locally, synced on reconnect. Shows "pending" badge on queued records.
- **Grades**: Record with exam type, scoring, history grouped by academic year. Offline: same queue approach as attendance.
- **Audit Logs**: Read-only event log (admin only)
- **PWA**: Installable on Android and desktop. Works fully offline for reads; writes queued.

## User preferences

- Arabic RTL throughout (`dir="rtl"` on all pages)
- Premium SaaS/ERP look: blue primary `hsl(221 83% 53%)`, deep navy sidebar `hsl(224 47% 13%)`, blue-grey page bg
- No emoji in production UI (only used in demo credential boxes)

## Gotchas

- **Never call service ports directly** in curl/test — always go through the shared proxy at `localhost:80`.
- **BASE_URL** from `import.meta.env.BASE_URL` already has a trailing slash — strip it with `.replace(/\/$/, '')` before building API URLs.
- **Dexie** uses `school-offline-db-v2` as the database name. If schema changes are needed, bump the version number.
- **Workbox navigateFallbackDenylist** uses a regex matching against absolute URLs, not pathname — the pattern `/\/api\//` works correctly in the service worker context.
- Run `pnpm --filter @workspace/api-spec run codegen` after any OpenAPI spec change before using new hooks.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
