# Fix: business email reverts after save

## Root cause

`SettingsPage.handleSave` writes directly to the `businesses` table and then calls `refreshBusinesses()`. If row-level security blocks the update (e.g. the signed-in user isn't an owner/admin on that business), PostgREST returns **success with 0 rows updated and no error**. The UI shows "Settings saved!", `refreshBusinesses()` reloads the old row, and the `useEffect` on `[currentBusiness]` writes the old email back into the form — so the field appears to revert to the original spelling.

There is no DB trigger rewriting the email, and realtime is not the culprit.

## Changes

Single file: `src/pages/settings/SettingsPage.tsx`

1. In `handleSave`, chain `.select("id").maybeSingle()` on the update so we can detect the silent-drop case.
   - `error` → `toast.error("Failed to update settings")` (as today), do not refresh.
   - No error but returned row is `null` → `toast.error("You don't have permission to update this business.")`, do not refresh (so the field keeps what the user typed instead of reverting).
   - Success → optimistically merge the saved values into the current business via the existing `BusinessContext` setter, then call `refreshBusinesses()`. This guarantees the `useEffect` that syncs `formData` always sees the new email even if the follow-up fetch is momentarily stale.

2. No other fields, no UI changes, no changes to the email-notification toggles, `BusinessContext`, RLS, or any migration.

## Technical notes

- Use `setCurrentBusiness({ ...currentBusiness, name, phone: phone || null, email: email || null, address: address || null, timezone })` from `useBusiness()` for the optimistic merge (already exported).
- Keep the existing `type="email"` input and validation.

## Verification

- Sign in as the business owner, change the email to a new spelling, click Save:
  - Toast shows success.
  - Field displays the new email and stays that way after the refresh completes.
  - `select email from businesses where id = ...` returns the new value.
- Simulate the failure path by temporarily signing in as a non-owner (or by testing against a business you don't own): toast shows the permission error and the typed value is preserved instead of silently reverting.
