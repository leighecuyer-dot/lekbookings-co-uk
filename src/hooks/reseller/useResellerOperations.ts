import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "sonner";

interface CreateCustomerParams {
  name: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
}

interface CreateBookingParams {
  customerName: string;
  startTime: Date;
  endTime: Date;
  customerId?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  serviceId?: string | null;
  staffId?: string | null;
  notes?: string | null;
  status?: string;
}

interface UpdateCustomerParams {
  customerId: string;
  name?: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
}

/**
 * Hook for reseller-specific write operations that go through SECURITY DEFINER RPCs.
 * These RPCs verify reseller linkage and log all actions to reseller_audit_logs.
 * 
 * Use this hook when BusinessContext.isResellerMode === true
 */
export function useResellerOperations() {
  const { currentBusiness, isResellerMode } = useBusiness();

  const createCustomer = useCallback(async (params: CreateCustomerParams): Promise<string | null> => {
    if (!currentBusiness) {
      toast.error("No business selected");
      return null;
    }

    if (!isResellerMode) {
      console.warn("useResellerOperations.createCustomer called outside reseller mode");
      return null;
    }

    const { data, error } = await supabase.rpc("reseller_create_customer", {
      p_business_id: currentBusiness.id,
      p_name: params.name,
      p_phone: params.phone || null,
      p_email: params.email || null,
      p_notes: params.notes || null,
    });

    if (error) {
      console.error("reseller_create_customer error:", error);
      if (error.message.includes("reseller_not_linked_to_business")) {
        toast.error("You are not authorized to manage this business");
      } else {
        toast.error("Failed to create customer");
      }
      return null;
    }

    return data as string;
  }, [currentBusiness, isResellerMode]);

  const createBooking = useCallback(async (params: CreateBookingParams): Promise<string | null> => {
    if (!currentBusiness) {
      toast.error("No business selected");
      return null;
    }

    if (!isResellerMode) {
      console.warn("useResellerOperations.createBooking called outside reseller mode");
      return null;
    }

    const { data, error } = await supabase.rpc("reseller_create_booking", {
      p_business_id: currentBusiness.id,
      p_customer_name: params.customerName,
      p_start_time: params.startTime.toISOString(),
      p_end_time: params.endTime.toISOString(),
      p_customer_id: params.customerId || null,
      p_customer_email: params.customerEmail || null,
      p_customer_phone: params.customerPhone || null,
      p_service_id: params.serviceId || null,
      p_staff_id: params.staffId || null,
      p_notes: params.notes || null,
      p_status: params.status || "confirmed",
    });

    if (error) {
      console.error("reseller_create_booking error:", error);
      if (error.message.includes("reseller_not_linked_to_business")) {
        toast.error("You are not authorized to manage this business");
      } else {
        toast.error("Failed to create booking");
      }
      return null;
    }

    return data as string;
  }, [currentBusiness, isResellerMode]);

  const updateBookingStatus = useCallback(async (bookingId: string, newStatus: string): Promise<boolean> => {
    if (!isResellerMode) {
      console.warn("useResellerOperations.updateBookingStatus called outside reseller mode");
      return false;
    }

    const { error } = await supabase.rpc("reseller_update_booking_status", {
      p_booking_id: bookingId,
      p_new_status: newStatus,
    });

    if (error) {
      console.error("reseller_update_booking_status error:", error);
      if (error.message.includes("reseller_not_linked_to_business")) {
        toast.error("You are not authorized to manage this booking");
      } else {
        toast.error("Failed to update booking status");
      }
      return false;
    }

    return true;
  }, [isResellerMode]);

  const updateCustomer = useCallback(async (params: UpdateCustomerParams): Promise<boolean> => {
    if (!isResellerMode) {
      console.warn("useResellerOperations.updateCustomer called outside reseller mode");
      return false;
    }

    const { error } = await supabase.rpc("reseller_update_customer", {
      p_customer_id: params.customerId,
      p_name: params.name || null,
      p_phone: params.phone,
      p_email: params.email,
      p_notes: params.notes,
    });

    if (error) {
      console.error("reseller_update_customer error:", error);
      if (error.message.includes("reseller_not_linked_to_business")) {
        toast.error("You are not authorized to manage this customer");
      } else {
        toast.error("Failed to update customer");
      }
      return false;
    }

    return true;
  }, [isResellerMode]);

  return {
    createCustomer,
    createBooking,
    updateBookingStatus,
    updateCustomer,
    isResellerMode,
  };
}
