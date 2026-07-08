## Goal
Staff-role users can only see and select customers assigned to them (via `staff_customers`). Owners and admins keep full visibility.

## Where this applies
1. **Customers page** (`/customers`) — list is limited to their assigned customers. The existing "All / Mine" tab is removed for staff (they only ever see "Mine").
2. **Bulk Messaging recipients** (`BulkMessageDialog`) — the recipient list they can pick from is scoped to their assigned customers.
3. **Campaigns Report** (`/reports/campaigns`) — recipient counts, conversions, and per-customer breakdowns are filtered so a staff member only sees campaigns/conversions tied to their assigned customers.

Owners and admins bypass all filters and continue to see every customer.

## Implementation

### A. Backend — enforce at the RLS layer (defence in depth)
Add a helper + tighten the `customers` SELECT policy so staff can only read rows in `staff_customers` linked to them; owners/admins/resellers keep current access.

```
CREATE FUNCTION public.customer_visible_to_staff(_user uuid, _customer uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_customers sc
    JOIN public.staff s ON s.id = sc.staff_id
    WHERE sc.customer_id = _customer AND s.user_id = _user
  )
$$;
```

Rewrite the customers SELECT policy:
- Owner/Admin OR reseller → all customers in business
- Staff role → only customers where `customer_visible_to_staff(auth.uid(), id)` is true

Same principle applied to `customer_contact_preferences` SELECT so the messaging opt-in join stays consistent.

`campaigns` / `campaign_conversions` remain readable business-wide (they aggregate across customers). Staff filtering there happens client-side, since a campaign row itself isn't per-customer.

### B. Frontend — a single reusable hook
`src/hooks/customers/useMyCustomerIds.ts`
- Reads current role via `useUserPermissions` (already exists).
- If owner/admin: returns `{ scopeAll: true, ids: null }`.
- Else looks up the user's `staff.id` for the business, fetches their `staff_customers.customer_id` list, returns `{ scopeAll: false, ids: Set<string> }`.

### C. Apply the hook

1. **CustomersPage**
   - Remove the "All/Mine" tab for staff (always "Mine").
   - `fetchCustomers` still queries all business customers — RLS will now trim them for staff automatically. The client filter becomes a no-op safety net.

2. **BulkMessageDialog**
   - After `fetchCustomersWithPreferences`, filter `customersData` through `myCustomerIds` when `!scopeAll`.
   - The "select all" pre-selection then operates only on the scoped list.

3. **CampaignsReportPage**
   - When `!scopeAll`: filter each campaign's `recipient_customer_ids` and each `campaign_conversions.customer_id` through the staff's assigned set before rendering counts/tables. Campaigns with zero assigned recipients are hidden.

### D. Empty states
- Customers page (staff, zero assignments): "You don't have any assigned customers yet. Ask an owner or admin to assign customers to you."
- BulkMessageDialog (staff, zero assignments): "No assigned customers to message."
- Campaigns report: hide the table with an equivalent empty state.

## Files touched
- `supabase/migrations/<new>.sql` — new function + updated RLS policies on `customers` and `customer_contact_preferences`.
- `src/hooks/customers/useMyCustomerIds.ts` — new.
- `src/hooks/customers/index.ts` — export.
- `src/pages/customers/CustomersPage.tsx` — hide All tab for staff, use hook.
- `src/components/messaging/BulkMessageDialog.tsx` — filter recipients.
- `src/pages/reports/CampaignsReportPage.tsx` — filter campaigns/conversions.

## Out of scope
- No changes to the booking flow (owners/admins/staff creating bookings can still pick any customer inside the create-booking dialog — that's a separate scope you opted out of).
- No changes to how assignments are created (already handled by `AssignStaffDialog`).
- No reseller flow changes; resellers continue to see everything for linked businesses.
