import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface WaitlistEntry {
  id: string;
  business_id: string;
  service_id: string | null;
  staff_id: string | null;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  desired_date: string;
  desired_start_time: string;
  desired_end_time: string;
  status: string;
  notified_at: string | null;
  booking_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useWaitlist() {
  const { currentBusiness } = useBusiness();
  const queryClient = useQueryClient();

  const { data: waitlistEntries = [], isLoading, refetch } = useQuery({
    queryKey: ["waitlist", currentBusiness?.id],
    queryFn: async () => {
      if (!currentBusiness?.id) return [];
      
      const { data, error } = await supabase
        .from("waitlist")
        .select("*")
        .eq("business_id", currentBusiness.id)
        .order("created_at", { ascending: false });
      
      if (error) {
        console.error("Error fetching waitlist:", error);
        return [];
      }
      
      return data as WaitlistEntry[];
    },
    enabled: !!currentBusiness?.id,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ entryId, status }: { entryId: string; status: string }) => {
      const { error } = await supabase
        .from("waitlist")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", entryId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waitlist"] });
      toast.success("Waitlist entry updated");
    },
    onError: (error) => {
      console.error("Error updating waitlist:", error);
      toast.error("Failed to update waitlist entry");
    },
  });

  const deleteEntry = useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase
        .from("waitlist")
        .delete()
        .eq("id", entryId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waitlist"] });
      toast.success("Waitlist entry removed");
    },
    onError: (error) => {
      console.error("Error deleting waitlist entry:", error);
      toast.error("Failed to remove waitlist entry");
    },
  });

  const getWaitingCount = useCallback(() => {
    return waitlistEntries.filter(e => e.status === "waiting").length;
  }, [waitlistEntries]);

  return {
    waitlistEntries,
    isLoading,
    refetch,
    updateStatus: updateStatus.mutate,
    deleteEntry: deleteEntry.mutate,
    getWaitingCount,
    isUpdating: updateStatus.isPending,
    isDeleting: deleteEntry.isPending,
  };
}
