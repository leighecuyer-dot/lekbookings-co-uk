# Fix "Invalid Invitation" on your phone (stale cached app)

## What I verified just now (not guesswork)

- The invitation you sent is alive in the database: Guild Hair, staff role, unaccepted, expires 12 Aug.
- Looking that token up anonymously — exactly what a signed-out visitor does — returns the invite correctly.
- The live lekbookings.co.uk build already contains the fixed lookup code.

So the invite, the database and the deployed code are all fine. The failure is on the device.

## What is actually going wrong

The app is installed as a PWA and registers a service worker that caches the whole app shell. Your phone had already visited an older build, so when you open the invite link Safari is served the **old cached page**, which still reads the invitations table directly — and that read is blocked for signed-out visitors, producing "Invalid Invitation". A fresh device (like my test) gets the new build and works.

## The fix

1. Stop the service worker from serving the cached app shell for authentication-style routes (`/invite/*`, `/auth`, `/reset-password`) so those always load fresh from the network.
2. Add a self-heal on the invite page: if the token lookup fails, clear the app caches, unregister the service worker and retry once before showing any error. This rescues phones that already hold a stale copy.
3. Replace the single catch-all "Invalid Invitation" message with the real reason (network/cache problem vs unknown token vs revoked), so future reports are diagnosable in one step instead of several.

## Immediate workaround while this ships

On the phone, open Settings > Safari > Clear History and Website Data (or open the link in a Private tab) and tap the invite link again — it will work with the current live build.

## Technical details

- `vite.config.ts`: add a workbox `navigateFallbackDenylist` for `/invite`, `/auth`, `/reset-password`.
- `src/pages/invite/AcceptInvitePage.tsx`: on a failed/empty `get_invite_details` response, run `caches.keys()` deletion + `navigator.serviceWorker.getRegistrations().unregister()`, retry the RPC once, then branch to distinct error states.
- No database, RLS or invite-generation changes — those are already correct.
- Requires a Publish to reach lekbookings.co.uk.
