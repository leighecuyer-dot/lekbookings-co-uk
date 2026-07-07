
# Per-Staff Permission Controls

Let the owner decide, per user, whether each admin/staff member can see revenue data and specific sidebar pages. Owners always see everything; admins and staff obey their assigned permissions.

## What the owner gets

A new **Team Permissions** section in Settings (owner-only), showing a row for every admin/staff user in the business with toggles:

- **Financial data** — hides Revenue tiles on Dashboard, revenue/commission columns in Staff, price fields on booking cards and reports.
- **Page access** (individual toggles): Customers, Reports/Campaigns, Messaging, Waitlist, Settings, Staff, Services.

Dashboard and Calendar are always visible (core workspace). Owners cannot restrict themselves or other owners.

## Data model

New table `public.user_permissions`:

- `user_id`, `business_id` (composite unique)
- `can_view_financials boolean default true`
- `page_access jsonb` — e.g. `{ "customers": true, "reports": true, "messaging": true, "waitlist": true, "settings": false, "staff": true, "services": true }`

RLS: owner of the business can read/write all rows in their business; each user can read their own row. GRANTs for authenticated + service_role. Trigger updates `updated_at`.

Security-definer helper `get_user_permissions(_user_id, _business_id)` returns the merged row (defaults everything to true if no row exists) so the client can call it safely.

## Frontend

1. **`useUserPermissions(businessId)` hook** — fetches current user's permissions row via the RPC, returns `{ canViewFinancials, pages, isOwner, loading }`. Owners always return all-true.
2. **Sidebar (`AppSidebar.tsx`)** — filter nav items using `pages[key]` when user role is admin/staff.
3. **`RouteGuard`** — block direct URL access to restricted pages; redirect to `/dashboard` with a toast.
4. **Revenue gating** — wrap financial widgets/columns in a `<PermissionGate need="financials">` component:
   - `DashboardPage`: RevenueBreakdownTile, RevenueGrowthTile, WeeklyPerformanceTile (revenue portions).
   - `StaffPage`: hide commission badges and Revenue Settings menu item.
   - `BookingCard` / `TrelloCard`: hide price display.
   - Campaigns/Reports pages already blocked at sidebar/route level, so no extra work.
5. **New `TeamPermissionsSection` in `SettingsPage`** — owner-only. Lists users from `user_roles` (excluding owners) with toggles bound to `user_permissions` rows; upsert on change; optimistic UI with toast.

## Technical details

```text
user_roles (existing)
   └── join → auth.users (email via profiles)
             └── user_permissions (new, 1:1 per business)
```

Owner detection: `has_business_role(auth.uid(), businessId, ARRAY['owner'])`.

Files touched:
- migration: create `user_permissions` + RLS + `get_user_permissions` RPC
- `src/hooks/permissions/useUserPermissions.ts` (new)
- `src/components/common/PermissionGate.tsx` (new)
- `src/components/settings/TeamPermissionsSection.tsx` (new)
- `src/pages/settings/SettingsPage.tsx` (mount new section, owner-only)
- `src/components/layout/AppSidebar.tsx` (filter nav)
- `src/components/routing/RouteGuard.tsx` (enforce page access)
- `src/pages/dashboard/DashboardPage.tsx`, `src/pages/staff/StaffPage.tsx`, `src/components/calendar/BookingCard.tsx`, `src/components/calendar/TrelloCard.tsx` (gate revenue UI)

## Verification

- Owner sees new Team Permissions section; toggles persist across reload.
- Staff user with `settings:false` cannot open `/settings` (redirected).
- Staff user with `can_view_financials:false` sees Dashboard without revenue tiles and Staff page without commission badges.
- Owner view is unchanged.
