# Fix new-user staff invitation links

## What is happening
- The staff invite generator’s preview-domain check covers `lovable.app`, `lovable.dev`, and localhost, but not the current `lovableproject.com` editor host. That can create a workspace-restricted link instead of the public `lekbookings.co.uk` link.
- New-account registration uses a fixed `/auth` return URL, so the invitation token is not carried through any authentication redirect.
- The latest Guild Hair staff invitations are present, unaccepted, and not expired, so the fix should preserve and redeem the correct token rather than replace the invitation system.

## Changes
1. Generate every staff invite with the canonical public base URL `https://lekbookings.co.uk`, independent of which preview/editor domain the owner is using.
2. Allow sign-up to receive a safe return path and pass the full `/invite/accept?token=…` route as its authentication return URL.
3. Keep the invited email locked to the email stored on the invitation and, after authentication is established, accept the invitation automatically so the user is not stranded between sign-up and acceptance.
4. Show specific states for an email mismatch, expired/already-used invitation, and a genuinely unknown token instead of treating every failure as “Invalid Invitation.”
5. Verify with a fresh unaccepted invite: open it signed out on the public domain, create/sign into the matching account, confirm the invite is marked accepted, the staff login is linked, and the user reaches the shared dashboard.

## Technical details
- Update the auth context sign-up API to accept an optional same-origin redirect path; reject external redirect values.
- Keep invitation acceptance server-authorised through `accept_business_invite`; do not weaken invitation table access or email matching.
- Update the staff invite UI and invitation page only; no unrelated authentication or permission changes.
