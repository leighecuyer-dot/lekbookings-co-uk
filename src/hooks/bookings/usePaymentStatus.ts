import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "sonner";

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
    const config = getPaymentConfig();
    
    // If already completed or cancelled, don't change status
    if (currentBookingStatus === "completed" || currentBookingStatus === "cancelled") {
      return null;
    }

    // Deposit paid → confirm if configured
    if (newPaymentStatus === "deposit_paid" && config.autoConfirmOnDeposit) {
      if (currentBookingStatus === "pending") {
        return "confirmed";
      }
    }

    // Full payment → confirm if configured
    if (newPaymentStatus === "paid" && config.autoConfirmOnFullPayment) {
      if (currentBookingStatus === "pending") {
        return "confirmed";
      }
    }

    return null;
  }, [getPaymentConfig]);

  const recordPayment = useCallback(async (
    bookingId: string,
    amount: number,
    bookingInfo: BookingPaymentInfo
  ): Promise<boolean> => {
    const config = getPaymentConfig();
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

    if (newBookingStatus) {
      updateData.status = newBookingStatus;
    }

    const { error } = await supabase
      .from("bookings")
      .update(updateData)
      .eq("id", bookingId);

    if (error) {
      console.error("Failed to record payment:", error);
      toast.error("Failed to record payment");
      return false;
    }

    if (newBookingStatus) {
      toast.success(`Payment recorded! Booking ${newBookingStatus}`);
    } else {
      toast.success("Payment recorded!");
    }
    
    return true;
  }, [getPaymentConfig, getNewStatusAfterPayment]);

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
    calculateDepositAmount,
    getNewStatusAfterPayment,
    recordPayment,
    markDepositPaid,
    markPaidInFull,
  };
}
