import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UseBookingActionsProps {
  onUpdate?: () => void;
}

export function useBookingActions({ onUpdate }: UseBookingActionsProps = {}) {
  const [optimisticUpdates, setOptimisticUpdates] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const getNextStatus = useCallback((currentStatus: string) => {
    const order = ["pending", "confirmed", "completed"];
    const currentIndex = order.indexOf(currentStatus);
    if (currentIndex < order.length - 1) {
      return order[currentIndex + 1];
    }
    return null;
  }, []);

  const getPrevStatus = useCallback((currentStatus: string) => {
    const order = ["pending", "confirmed", "completed"];
    const currentIndex = order.indexOf(currentStatus);
    if (currentIndex > 0) {
      return order[currentIndex - 1];
    }
    return null;
  }, []);

  const updateStatus = useCallback(async (bookingId: string, newStatus: string, originalStatus: string) => {
    // Set optimistic update immediately
    setOptimisticUpdates(prev => ({ ...prev, [bookingId]: newStatus }));
    setLoading(prev => ({ ...prev, [bookingId]: true }));

    const { error } = await supabase
      .from("bookings")
      .update({ status: newStatus })
      .eq("id", bookingId);

    setLoading(prev => ({ ...prev, [bookingId]: false }));

    if (error) {
      // Rollback optimistic update on error
      setOptimisticUpdates(prev => {
        const next = { ...prev };
        delete next[bookingId];
        return next;
      });
      toast.error("Failed to update status");
      return false;
    }

    // Clear optimistic update after success (real data will come from refetch)
    setOptimisticUpdates(prev => {
      const next = { ...prev };
      delete next[bookingId];
      return next;
    });

    toast.success(`Status updated to ${newStatus}`);
    onUpdate?.();
    return true;
  }, [onUpdate]);

  const getEffectiveStatus = useCallback((booking: { id: string; status: string }) => {
    return optimisticUpdates[booking.id] || booking.status;
  }, [optimisticUpdates]);

  const isUpdating = useCallback((bookingId: string) => {
    return loading[bookingId] || false;
  }, [loading]);

  return {
    updateStatus,
    getNextStatus,
    getPrevStatus,
    getEffectiveStatus,
    isUpdating,
    optimisticUpdates,
  };
}
