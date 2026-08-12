# Full-screen staff columns day view

The side-by-side staff columns view already exists (Day view → Columns toggle). This adds two things: a way to make the columns fill the whole width, and a full-screen mode.

## What you'll see

- In Day view → Columns, two new small controls next to the Timeline/Columns toggle:
  - **Fit to screen**: columns share the available width equally instead of a fixed 160/200px each, so the whole team fits without sideways scrolling. If there are too many people to stay readable (below ~90px per column), it keeps a minimum width and lets you scroll.
  - **Full screen**: the calendar expands to fill the entire browser window — sidebar, header and page padding hidden — with an X (or Esc) to exit.
- Both choices are remembered per device, same as the Timeline/Columns choice.
- Everything else stays the same: staff colours, drag-to-create, drag-to-reschedule, masked "Busy" bookings, staff filter.
- On mobile, full screen plus fit-to-screen gives a compact whole-team view; with more than 3 staff it still scrolls sideways so cards stay legible.

## Technical

- `src/components/calendar/StaffDayColumnsView.tsx`: add a `fitToScreen` prop. When true, wrapper switches from `min-w-max` to `w-full`, and each column uses `flex-1 min-w-[90px]` instead of the fixed `w-[160px] sm:w-[200px]`. Time gutter stays sticky and fixed-width.
- `src/pages/calendar/CalendarPage.tsx`:
  - Add `fitToScreen` and `isFullscreen` state, both persisted in `localStorage` (`lek-day-fit`, `lek-day-fullscreen` — fullscreen not persisted, session only).
  - Render toggle buttons (Maximize2 / Minimize2 icons) beside the existing layout toggle, shown only when `dayLayout === "columns"`.
  - Full screen renders the day view inside a fixed overlay (`fixed inset-0 z-50 bg-background overflow-auto`) containing the date header, staff filter and the columns grid; Esc key listener to exit.
- No database, RLS or business-logic changes.
