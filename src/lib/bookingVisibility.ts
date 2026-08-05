import type { CalendarScope } from "@/hooks/permissions/useUserPermissions";

/**
 * Applies the owner-configured calendar scope to a list of bookings.
 * - "all": untouched (shared salon view)
 * - "all_masked": other people's appointments show as "Busy" with no customer details
 * - "own": only the viewer's own appointments (also enforced by database rules)
 */
export function applyCalendarScope<
  T extends {
    staff_id: string | null;
    customer_name?: string | null;
    customer_email?: string | null;
    customer_phone?: string | null;
    notes?: string | null;
  }
>(bookings: T[], scope: CalendarScope, myStaffId: string | null): T[] {
  if (scope === "all") return bookings;

  if (scope === "own") {
    if (!myStaffId) return [];
    return bookings.filter((b) => b.staff_id === myStaffId);
  }

  return bookings.map((b) =>
    myStaffId && b.staff_id === myStaffId
      ? b
      : {
          ...b,
          customer_name: "Busy",
          customer_email: null,
          customer_phone: null,
          notes: null,
        }
  );
}
