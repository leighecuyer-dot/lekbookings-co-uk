import { format } from "date-fns";

export interface WorkingHoursDay {
  start: string;
  end: string;
  enabled?: boolean;
}

export interface WorkingHours {
  [key: string]: WorkingHoursDay;
}

export interface DayViewStaff {
  id: string;
  name: string;
  working_hours?: WorkingHours | null;
}

// Staff color palette for unique card backgrounds
export const STAFF_COLORS = [
  { bg: '#2563EB', text: '#ffffff' }, // blue
  { bg: '#7C3AED', text: '#ffffff' }, // violet
  { bg: '#059669', text: '#ffffff' }, // emerald
  { bg: '#D97706', text: '#ffffff' }, // amber
  { bg: '#DC2626', text: '#ffffff' }, // red
  { bg: '#0891B2', text: '#ffffff' }, // cyan
  { bg: '#4F46E5', text: '#ffffff' }, // indigo
  { bg: '#BE185D', text: '#ffffff' }, // pink
  { bg: '#65A30D', text: '#ffffff' }, // lime
  { bg: '#EA580C', text: '#ffffff' }, // orange
];

export function getStaffColor(
  staffId: string | null,
  staffList: { id: string }[]
): { bg: string; text: string } {
  if (!staffId) return { bg: 'hsl(var(--foreground))', text: 'hsl(var(--background))' };
  const index = staffList.findIndex((s) => s.id === staffId);
  if (index === -1) return { bg: 'hsl(var(--foreground))', text: 'hsl(var(--background))' };
  return STAFF_COLORS[index % STAFF_COLORS.length];
}

// Generate time slots from 8:00 to 18:00 (30-min intervals)
export const TIME_SLOTS = Array.from({ length: 21 }, (_, i) => {
  const hour = Math.floor(i / 2) + 8;
  const minute = i % 2 === 0 ? "00" : "30";
  return `${hour.toString().padStart(2, "0")}:${minute}`;
});

export const DAY_START_MINUTES = 8 * 60;
export const SLOT_MINUTES = 30;

export const getStatusColor = (status: string) => {
  switch (status) {
    case "confirmed":
      return "bg-background text-foreground";
    case "pending":
      return "bg-background/80 text-foreground";
    case "cancelled":
      return "bg-background/50 text-foreground";
    case "completed":
      return "bg-background/60 text-foreground";
    default:
      return "bg-background text-foreground";
  }
};

// Helper to check if a staff member is available at a specific time slot
export function isStaffAvailableAtSlot(
  staff: DayViewStaff,
  slotTime: string,
  date: Date,
  isOnLeave?: (staffId: string, date: Date) => boolean
): boolean {
  // Check if on leave
  if (isOnLeave && isOnLeave(staff.id, date)) {
    return false;
  }

  // Check working hours
  if (!staff.working_hours) return false;

  const dayName = format(date, "EEEE").toLowerCase();
  const dayHours = staff.working_hours[dayName];

  if (!dayHours) return false;
  if (dayHours.enabled === false) return false;

  return slotTime >= dayHours.start && slotTime < dayHours.end;
}

export function isStaffWorkingToday(staff: DayViewStaff, date: Date): boolean {
  if (!staff.working_hours) return false;
  const dayName = format(date, "EEEE").toLowerCase();
  const dayHours = staff.working_hours[dayName];
  if (!dayHours) return false;
  return dayHours.enabled !== false;
}
