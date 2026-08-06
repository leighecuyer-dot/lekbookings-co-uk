# Drag-to-create slots + smoother scrolling in Columns view

Two changes to the new staff Columns day view.

## 1. Drag on empty space to create an appointment

- Press (or click) on an empty part of a staff column and drag down: a shaded "new appointment" block follows your finger/mouse, snapping to 30-minute steps.
- Release and the New Booking dialog opens pre-filled with that staff member, the start time, and the length you dragged (e.g. 10:00 for 90 minutes).
- A plain tap/click with no drag keeps today's behaviour: opens the dialog at that time with the default service length.
- If you pick a service in the dialog, the dragged length stays as-is unless you clear it — the dragged length wins, so the booking is exactly the slot you drew.
- Dragging over a time where that staff member isn't working is blocked (same rule as clicking today).

## 2. Sideways scrolling no longer reloads the day

Right now, scrolling the columns sideways is read as a "swipe to next day" gesture, so the calendar jumps date and shows "Loading…". Fixes:

- Turn off the swipe-to-change-day gesture while Columns layout is active (arrows and the date picker still change day). Timeline view keeps swiping.
- When data refreshes, keep the current grid on screen with a subtle dimmed state instead of replacing everything with "Loading…" — only the very first load shows the loading text.
- Keep the time gutter pinned and give the column area smooth horizontal scrolling with scroll snapping to column edges, so a sideways drag feels deliberate.

## Technical

- `src/components/calendar/StaffDayColumnsView.tsx`:
  - Add local `dragSelect` state (`{ columnId, startIndex, endIndex }`) driven by `onPointerDown` / `onPointerMove` / `onPointerUp` on the column grid, with `setPointerCapture` and a 1-slot movement threshold to distinguish tap from drag.
  - Render a preview block for the active selection; on pointer up call a new `onSlotRangeSelect(startTime, durationMinutes, staffId)` prop, falling back to `onSlotClick` when no drag occurred.
  - Guard against slots where `isStaffAvailableAtSlot` is false; clamp the selection to available slots.
  - Replace the early `loading` return with an `isInitialLoad` prop check; otherwise wrap the grid in `opacity-60 pointer-events-none` while refreshing.
  - Set `touch-action: pan-x pan-y` off the drag surface (`touch-action: none` on the grid) so vertical drag-select works on mobile without page scroll.
- `src/pages/calendar/CalendarPage.tsx`:
  - Only attach `swipeHandlers` when `dayLayout === "timeline"`.
  - Add `durationOverride: number | null` to the `newBooking` state; set it from `onSlotRangeSelect`, clear it on dialog close and on plain slot clicks; use it in `handleCreateBooking` instead of `service.duration_minutes` when set.
  - Track `initialLoad` (true only until the first fetch resolves) and pass it to the day views.
- No database, RLS, or business-logic changes.
