import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "sonner";

interface UseBookingActionsProps {
  onUpdate?: () => void;
}

export function useBookingActions({ onUpdate }: UseBookingActionsProps = {}) {
  const { isResellerMode } = useBusiness();
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

    let error: Error | null = null;

    if (isResellerMode) {
      // Use SECURITY DEFINER RPC for reseller mode (with audit logging)
      const { error: rpcError } = await supabase.rpc("reseller_update_booking_status", {
        p_booking_id: bookingId,
        p_new_status: newStatus,
      });
      if (rpcError) {
        error = rpcError;
      }
    } else {
      // Normal mode: direct update
      const { error: updateError } = await supabase
        .from("bookings")
        .update({ status: newStatus })
        .eq("id", bookingId);
      if (updateError) {
        error = updateError;
      }
    }

    setLoading(prev => ({ ...prev, [bookingId]: false }));

    if (error) {
      // Rollback optimistic update on error
      setOptimisticUpdates(prev => {
        const next = { ...prev };
        delete next[bookingId];
        return next;
      });
      
      if (error.message?.includes("reseller_not_linked_to_business")) {
        toast.error("You are not authorized to manage this booking");
      } else {
        toast.error("Failed to update status");
      }
      return false;
    }

    // Clear optimistic update after success (real data will come from refetch)
    setOptimisticUpdates(prev => {
      const next = { ...prev };
      delete next[bookingId];
      return next;
    });

    // Send confirmation email/SMS when booking is confirmed. Edge function
    // fetches the verified customer data server-side using bookingId.
    if (newStatus === "confirmed") {
      try {
        await supabase.functions.invoke("send-booking-confirmation", {
          body: { bookingId },
        });
      } catch (e) {
        console.log("Confirmation email skipped:", e);
      }
    }

    // Fire status-change SMS (respects per-business opt-in + tier caps server-side).
    if (newStatus === "cancelled" || (newStatus === "confirmed" && originalStatus !== "pending")) {
      try {
        const eventType = newStatus === "cancelled" ? "cancellation" : "reschedule";
        const { data: b } = await supabase
          .from("bookings")
          .select("id, business_id, customer_name, customer_phone, start_time, service_id, businesses(name), services(name)")
          .eq("id", bookingId)
          .maybeSingle();
        if (b?.customer_phone) {
          const start = new Date(b.start_time);
          const formatted = start.toLocaleString("en-GB", {
            weekday: "short", day: "numeric", month: "short",
            hour: "2-digit", minute: "2-digit", hour12: false,
          });
          await supabase.functions.invoke("send-sms", {
            body: {
              businessId: b.business_id,
              bookingId: b.id,
              eventType,
              to: b.customer_phone,
              tokens: {
                customer_name: b.customer_name ?? "",
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                service_name: (b as any).services?.name ?? "your appointment",
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                business_name: (b as any).businesses?.name ?? "",
                start_time: formatted,
              },
            },
          });
        }
      } catch (e) {
        console.log("Status-change SMS skipped:", e);
      }
    }

    toast.success(`Status updated to ${newStatus}`);
    onUpdate?.();
    return true;
  }, [onUpdate, isResellerMode]);

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
