import { useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "sonner";
import { getWorkflowConfig } from "@/components/settings/WorkflowAutomationSettings";

interface PaymentConfig {
  requireDeposit: boolean;
  depositType: "percentage" | "fixed";
  depositAmount: number;
  autoConfirmOnDeposit: boolean;
  autoConfirmOnFullPayment: boolean;
  requireConfirmation: boolean;
}

interface BookingPaymentInfo {
  id: string;
  status: string;
  payment_status: string;
  total_price: number | null;
  deposit_amount: number | null;
  amount_paid: number | null;
}

export function usePaymentStatus() {
  const { currentBusiness } = useBusiness();
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getPaymentConfig = useCallback((): PaymentConfig => {
    if (!currentBusiness?.settings) {
      return {
        requireDeposit: false,
        depositType: "percentage",
        depositAmount: 20,
        autoConfirmOnDeposit: true,
        autoConfirmOnFullPayment: true,
        requireConfirmation: true,
      };
    }
    const settings = currentBusiness.settings as Record<string, unknown>;
    return (settings.paymentConfig as PaymentConfig) || {
      requireDeposit: false,
      depositType: "percentage",
      depositAmount: 20,
      autoConfirmOnDeposit: true,
      autoConfirmOnFullPayment: true,
      requireConfirmation: true,
    };
  }, [currentBusiness]);

  const getWorkflowSettings = useCallback(() => {
    return getWorkflowConfig(currentBusiness?.settings as Record<string, unknown> | null);
  }, [currentBusiness]);

  const calculateDepositAmount = useCallback((totalPrice: number): number => {
    const config = getPaymentConfig();
    if (!config.requireDeposit) return 0;
    
    if (config.depositType === "percentage") {
      return (totalPrice * config.depositAmount) / 100;
    }
    return config.depositAmount;
  }, [getPaymentConfig]);

  const getNewStatusAfterPayment = useCallback((
    currentPaymentStatus: string,
    newPaymentStatus: string,
    currentBookingStatus: string
  ): string | null => {
    const workflow = getWorkflowSettings();
    
    // If already completed or cancelled, don't change status
    if (currentBookingStatus === "completed" || currentBookingStatus === "cancelled") {
      return null;
    }

    // Deposit paid → confirm if configured
    if (newPaymentStatus === "deposit_paid" && workflow.confirmOnDepositPaid) {
      if (currentBookingStatus === "pending") {
        return "confirmed";
      }
    }

    // Full payment → confirm if configured
    if (newPaymentStatus === "paid" && workflow.confirmOnFullPayment) {
      if (currentBookingStatus === "pending") {
        return "confirmed";
      }
    }

    return null;
  }, [getWorkflowSettings]);

  const applyStatusChange = useCallback(async (
    bookingId: string,
    updateData: Record<string, unknown>,
    previousData: Record<string, unknown>,
    newStatus: string | null
  ): Promise<boolean> => {
    const workflow = getWorkflowSettings();

    // Clear any pending undo timeout
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = null;
    }

    const performUpdate = async () => {
      const { error } = await supabase
        .from("bookings")
        .update(updateData)
        .eq("id", bookingId);

      if (error) {
        console.error("Failed to update booking:", error);
        toast.error("Failed to update booking");
        return false;
      }
      return true;
    };

    const undoUpdate = async () => {
      await supabase
        .from("bookings")
        .update(previousData)
        .eq("id", bookingId);
      toast.success("Change undone");
    };

    // If showing undo notification and there's a status change
    if (workflow.showUndoNotification && newStatus) {
      toast(`Status will change to "${newStatus}"`, {
        duration: 5000,
        action: {
          label: "Undo",
          onClick: () => {
            if (undoTimeoutRef.current) {
              clearTimeout(undoTimeoutRef.current);
              undoTimeoutRef.current = null;
            }
            undoUpdate();
          },
        },
      });

      // Apply immediately but allow undo
      const success = await performUpdate();
      if (!success) return false;

      // The undo action handler above will revert if clicked
      return true;
    }

    // No undo notification, just apply directly
    const success = await performUpdate();
    if (success && newStatus) {
      toast.success(`Booking ${newStatus}!`);
    } else if (success) {
      toast.success("Payment recorded!");
    }
    return success;
  }, [getWorkflowSettings]);

  const recordPayment = useCallback(async (
    bookingId: string,
    amount: number,
    bookingInfo: BookingPaymentInfo
  ): Promise<boolean> => {
    const currentAmountPaid = bookingInfo.amount_paid || 0;
    const newAmountPaid = currentAmountPaid + amount;
    const totalPrice = bookingInfo.total_price || 0;
    const depositRequired = bookingInfo.deposit_amount || 0;

    // Determine new payment status
    let newPaymentStatus = bookingInfo.payment_status;
    if (newAmountPaid >= totalPrice && totalPrice > 0) {
      newPaymentStatus = "paid";
    } else if (newAmountPaid >= depositRequired && depositRequired > 0) {
      newPaymentStatus = "deposit_paid";
    }

    // Determine if booking status should change
    const newBookingStatus = getNewStatusAfterPayment(
      bookingInfo.payment_status,
      newPaymentStatus,
      bookingInfo.status
    );

    const updateData: Record<string, unknown> = {
      amount_paid: newAmountPaid,
      payment_status: newPaymentStatus,
    };

    const previousData: Record<string, unknown> = {
      amount_paid: currentAmountPaid,
      payment_status: bookingInfo.payment_status,
    };

    if (newBookingStatus) {
      updateData.status = newBookingStatus;
      previousData.status = bookingInfo.status;
    }

    return applyStatusChange(bookingId, updateData, previousData, newBookingStatus);
  }, [getNewStatusAfterPayment, applyStatusChange]);

  const markDepositPaid = useCallback(async (
    bookingId: string,
    bookingInfo: BookingPaymentInfo
  ): Promise<boolean> => {
    const depositAmount = bookingInfo.deposit_amount || 0;
    if (depositAmount <= 0) {
      toast.error("No deposit amount set for this booking");
      return false;
    }
    
    const currentPaid = bookingInfo.amount_paid || 0;
    const amountToAdd = Math.max(0, depositAmount - currentPaid);
    
    return recordPayment(bookingId, amountToAdd, bookingInfo);
  }, [recordPayment]);

  const markPaidInFull = useCallback(async (
    bookingId: string,
    bookingInfo: BookingPaymentInfo
  ): Promise<boolean> => {
    const totalPrice = bookingInfo.total_price || 0;
    const currentPaid = bookingInfo.amount_paid || 0;
    const amountToAdd = Math.max(0, totalPrice - currentPaid);
    
    return recordPayment(bookingId, amountToAdd, bookingInfo);
  }, [recordPayment]);

  return {
    getPaymentConfig,
    getWorkflowSettings,
    calculateDepositAmount,
    getNewStatusAfterPayment,
    recordPayment,
    markDepositPaid,
    markPaidInFull,
    applyStatusChange,
  };
}
