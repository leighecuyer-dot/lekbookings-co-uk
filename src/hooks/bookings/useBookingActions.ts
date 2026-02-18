import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "sonner";
import { format } from "date-fns";

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

    // Send confirmation email when booking is confirmed
    if (newStatus === "confirmed") {
      try {
        const { data: booking } = await supabase
          .from("bookings")
          .select("customer_email, customer_name, start_time, service_id, business_id")
          .eq("id", bookingId)
          .single();

        if (booking?.customer_email && booking.customer_name) {
          let serviceName = "Appointment";
          if (booking.service_id) {
            const { data: service } = await supabase
              .from("services")
              .select("name")
              .eq("id", booking.service_id)
              .single();
            if (service) serviceName = service.name;
          }

          let businessName: string | undefined;
          const { data: business } = await supabase
            .from("businesses")
            .select("name")
            .eq("id", booking.business_id)
            .single();
          if (business) businessName = business.name;

          await supabase.functions.invoke("send-booking-confirmation", {
            body: {
              email: booking.customer_email,
              customerName: booking.customer_name,
              serviceName,
              dateTime: format(new Date(booking.start_time), "EEEE, MMMM d 'at' h:mm a"),
              businessName,
            },
          });
        }
      } catch (e) {
        console.log("Confirmation email skipped:", e);
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
