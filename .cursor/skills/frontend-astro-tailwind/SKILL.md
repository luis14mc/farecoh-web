---
name: frontend-astro-tailwind
description: >-
  Frontend patterns for farecoh-web with Astro 5 (SSR) and Tailwind CSS v4.
  Use when building or refactoring pages, layouts, and components in src/ —
  especially admin UI under src/pages/admin and src/components/admin.
---

# Frontend — Astro + Tailwind (farecoh-web)

## Stack

- **Astro 5** — `output: "server"`, Vercel adapter, no React unless strictly required
- **Tailwind CSS v4** — via `@tailwindcss/vite`, tokens in `src/styles/global.css` `@theme`
- **Fonts** — Montserrat (`--font-montserrat`), Material Symbols Outlined for icons

## Design tokens (prefer over hardcoded colors)

Use `@theme` utilities from `global.css`:

| Token | Usage |
|-------|--------|
| `bg-surface`, `bg-surface-container-lowest` | Page/card backgrounds |
| `text-on-surface`, `text-on-surface-variant` | Body text |
| `border-outline-variant` | Card/table borders |
| `bg-primary`, `text-on-primary` | Primary actions |
| `max-w-container-max`, `gap-gutter`, `px-margin` | Layout (public site) |

**Admin area:** neutral operational UI — `bg-zinc-50` page, **white cards**, soft shadows, `rounded-lg`. Do **not** use public concert dark styles (`concert-*`) in admin.

## Admin UI system

Reuse components in `src/components/admin/ui/`:

- `PageHeader` — breadcrumb, title, role badge, logout
- `AdminPage` — consistent page padding (`px-4 md:px-8`, mobile bottom space)
- `Card`, `Button`, `Input`, `Select`, `FormField`, `Table`, `Badge`, `Alert`, `StatCard`, `EmptyState`
- `MobileAdminNav` + `AdminSidebar` — layout shell in `AdminLayout.astro`

Navigation config: `src/lib/admin-nav.ts` + RBAC filter via `canAccessRoute`.

Ticket status badges: `src/lib/ticket-status.ts` (`TICKET_STATUS_CLASSES`).

## Astro conventions

1. **Server data in frontmatter** — `---` fetch from Supabase; pass to template
2. **Client interactivity in `<script>`** — keep business logic; import shared libs (`@/lib/*`, `@/services/*`)
3. **No secrets in client** — use `createSupabaseServerClient` server-side; browser uses anon client only
4. **Props typing** — `interface Props` on `.astro` components
5. **Slots** — prefer composition (`Card`, `FormField`) over duplicated markup
6. **`class:list`** — when toggling conditional classes in Astro templates

## Tailwind conventions

1. **Inputs/buttons:** `h-11` (44px touch target), `rounded-md`, `focus-visible:ring-2 focus-visible:ring-primary/30`
2. **Mobile-first:** `flex-col sm:flex-row`, `w-full sm:w-auto` for actions
3. **Tables:** wrap in `Table.astro` or `overflow-x-auto`; min-width on small screens
4. **Avoid** raw `border-[rgba(...)]` — use `border-outline-variant`
5. **Avoid** legacy typography classes (`text-body-md font-body-md`) in new admin code — use `text-sm`, `text-base`, `font-semibold`
6. **Spacing:** `space-y-4`, `gap-4`, `p-4 md:p-6` in admin cards

## Accessibility

- `aria-label` on icon-only buttons
- `role="alert"` on dynamic messages
- Associate labels with `htmlFor` / `id` via `FormField`
- Visible focus rings (`focus-visible:ring-*`)

## File placement

```
src/pages/admin/*.astro       # Routes (keep URLs stable)
src/layouts/AdminLayout.astro # Shell only
src/components/admin/ui/      # Presentational primitives
src/components/admin/         # Feature blocks (StatsCard, SalesTable)
src/lib/admin-nav.ts          # Shared nav items
```

## Checklist before finishing admin UI work

- [ ] Uses `PageHeader` + `AdminPage`
- [ ] Forms use `FormField` + `Input`/`Select` + `Button fullWidthMobile`
- [ ] Status chips use `Badge` or `TICKET_STATUS_CLASSES`
- [ ] No business logic / RPC changes unless explicitly requested
- [ ] `pnpm build` passes
