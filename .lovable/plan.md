# Fix "Invalid Invitation" on staff invite links

## What's happening

The invite link is fine — the invite page just can't read it.

When someone opens `/invite/accept?token=...` they are usually signed out. The page tries to look up the invite directly in the invites table, but the database access rules only let owners/admins of that business read invites. A signed-out (or not-yet-a-member) visitor gets nothing back, so the page shows "Invalid Invitation".

Confirmed: the invites table has read rules only for `authenticated` owners/admins and resellers — nothing for a visitor holding a valid token.

## The fix

1. Add a secure database function that takes only the invite token and returns the minimal details needed to render the page: invited email, role, business name, expiry, and whether it was already accepted. It bypasses the normal read restriction but only ever returns the single invite matching that exact token, so nobody can browse or list invites.
2. Make it callable by signed-out visitors and signed-in users.
3. Change the invite page to call this function instead of querying the invites table directly, keeping the existing invalid / expired / already-accepted states.

Accepting the invite still goes through the existing `accept_business_invite` flow with strict email matching, so the person must sign in or sign up with the exact invited email address.

## Technical detail

- New `public.get_invite_details(_token uuid)` — `SECURITY DEFINER`, `STABLE`, `SET search_path = public`, returns one row (email, role, business_name, expires_at, accepted_at). `GRANT EXECUTE` to `anon` and `authenticated`.
- `src/pages/invite/AcceptInvitePage.tsx`: replace the `from("business_invites").select(...)` lookup in `verifyToken()` with `supabase.rpc("get_invite_details", { _token: token })`; map the returned fields onto the existing `InviteDetails` state.
- No change to RLS policies on `business_invites`.
