# Day view: one column per staff member

Add a side-by-side day layout where each staff member gets their own column, colour-coded, so the whole team's day is visible at a glance.

## What you'll see

- In Day view, a small toggle: **Timeline** (current list) / **Columns** (new).
- Columns view: time down the left, one column per active staff member across the top, each headed by the staff name in that person's colour.
- Appointments sit in their staff member's column at the correct time, sized by duration, tinted with the staff colour and keeping the thin service-colour stripe on the left edge (same colour rules already used today).
- An extra "Unassigned" column appears only when there are bookings without a staff member.
- Empty slots stay clickable to create a booking, and clicking pre-fills that staff member. Existing drag-to-reschedule keeps working, and dropping into another column also reassigns the appointment to that staff member.
- Staff who are off or on leave that day show a greyed column marked "Off" / "On leave".
- On mobile the columns scroll sideways with the time gutter pinned; the choice of Timeline vs Columns is remembered per device.

## Notes

- Staff colours come from the existing fixed palette used in the day timeline today, assigned in staff order — no database change, and colours match what's already shown on cards.
- The staff filter dropdown still applies: pick one person and only that column shows.
- Privacy rules are unchanged — masked bookings ("Busy") stay masked in columns.

## Technical

- New `src/components/calendar/StaffDayColumnsView.tsx`:
  - Absolute-positioned booking blocks over a 30-min grid (top/height from start/end times), so overlapping appointments in one column render side by side rather than stacking the whole row.
  - Reuses `getStaffColor`, `getStatusColor`, `isStaffAvailableAtSlot` — extract these from `DayTimelineView.tsx` into `src/components/calendar/dayViewUtils.ts` so both views share one source of truth.
  - Props mirror `DayTimelineView` (bookings, services, staffList, isOnLeave, drag handlers) plus `onDrop(e, date, time, staffId)`.
- `src/pages/calendar/CalendarPage.tsx`: add `dayLayout` state (`"timeline" | "columns"`, persisted in `localStorage`), a toggle in the day header, and render the new component when `columns` is selected inside the existing `PinchZoomWrapper`.
- Extend the existing drop handler in `src/hooks/bookings/useBookingDragDrop.ts` to accept an optional target `staff_id` and include it in the booking update.
- No schema or RLS changes.
