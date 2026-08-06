import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "sonner";
import { parseISO, setHours, setMinutes, differenceInMinutes, addMinutes } from "date-fns";

interface DraggedBooking {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  customer_name: string | null;
  service_id: string | null;
  staff_id: string | null;
}

interface UseBookingDragDropProps {
  onUpdate?: () => void;
}

export function useBookingDragDrop({ onUpdate }: UseBookingDragDropProps = {}) {
  const { isResellerMode } = useBusiness();
  const [draggingBookingId, setDraggingBookingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleDragStart = useCallback((e: React.DragEvent, booking: DraggedBooking) => {
    setDraggingBookingId(booking.id);
    e.dataTransfer.setData("booking", JSON.stringify(booking));
    e.dataTransfer.effectAllowed = "move";
    
    // Add a drag image effect
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5";
    }
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    setDraggingBookingId(null);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const rescheduleBooking = useCallback(async (
    booking: DraggedBooking,
    newDate: Date,
    newTime: string,
    newStaffId?: string | null
  ) => {
    setLoading(true);

    // Calculate the duration of the original booking
    const originalStart = parseISO(booking.start_time);
    const originalEnd = parseISO(booking.end_time);
    const durationMinutes = differenceInMinutes(originalEnd, originalStart);

    // Create new start and end times
    const [hours, minutes] = newTime.split(":").map(Number);
    const newStartTime = setMinutes(setHours(newDate, hours), minutes);
    const newEndTime = addMinutes(newStartTime, durationMinutes);

    const staffChanged = newStaffId !== undefined && newStaffId !== booking.staff_id;
    const updatePayload: Record<string, unknown> = {
      start_time: newStartTime.toISOString(),
      end_time: newEndTime.toISOString(),
      ...(staffChanged ? { staff_id: newStaffId } : {}),
    };

    let error: Error | null = null;

    if (isResellerMode) {
      // For reseller mode, we'd need to create an RPC for this
      // For now, use direct update (RLS will still apply)
      const { error: updateError } = await supabase
        .from("bookings")
        .update(updatePayload)
        .eq("id", booking.id);
      if (updateError) {
        error = updateError;
      }
    } else {
      const { error: updateError } = await supabase
        .from("bookings")
        .update(updatePayload)
        .eq("id", booking.id);
      if (updateError) {
        error = updateError;
      }
    }

    setLoading(false);

    if (error) {
      toast.error("Failed to reschedule booking");
      return false;
    }

    toast.success(staffChanged ? "Booking moved!" : "Booking rescheduled!");
    onUpdate?.();
    return true;
  }, [onUpdate, isResellerMode]);

  const handleDrop = useCallback(async (
    e: React.DragEvent,
    targetDate: Date,
    targetTime: string,
    targetStaffId?: string | null
  ) => {
    e.preventDefault();
    
    const bookingData = e.dataTransfer.getData("booking");
    if (!bookingData) return;

    try {
      const booking: DraggedBooking = JSON.parse(bookingData);
      await rescheduleBooking(booking, targetDate, targetTime, targetStaffId);
    } catch (error) {
      console.error("Failed to parse booking data:", error);
    }
  }, [rescheduleBooking]);

  return {
    draggingBookingId,
    loading,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDrop,
    rescheduleBooking,
  };
}
