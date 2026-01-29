import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface StaffLeave {
  id: string;
  staff_id: string;
  business_id: string;
  leave_type: "holiday" | "sick" | "personal" | "other";
  start_date: string;
  end_date: string;
  notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateLeaveParams {
  staff_id: string;
  business_id: string;
  leave_type: "holiday" | "sick" | "personal" | "other";
  start_date: string;
  end_date: string;
  notes?: string;
}

export function useStaffLeave(businessId: string | null) {
  const queryClient = useQueryClient();

  // Fetch all leave records for the business
  const { data: leaves = [], isLoading } = useQuery({
    queryKey: ["staff_leave", businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const { data, error } = await supabase
        .from("staff_leave")
        .select("*")
        .eq("business_id", businessId)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data as StaffLeave[];
    },
    enabled: !!businessId,
  });

  // Create new leave
  const createLeave = useMutation({
    mutationFn: async (params: CreateLeaveParams) => {
      const { data, error } = await supabase
        .from("staff_leave")
        .insert({
          staff_id: params.staff_id,
          business_id: params.business_id,
          leave_type: params.leave_type,
          start_date: params.start_date,
          end_date: params.end_date,
          notes: params.notes || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff_leave", businessId] });
      toast.success("Leave added successfully");
    },
    onError: (error: Error) => {
      console.error("Failed to create leave:", error);
      toast.error("Failed to add leave");
    },
  });

  // Update leave
  const updateLeave = useMutation({
    mutationFn: async (params: { id: string } & Partial<CreateLeaveParams>) => {
      const { id, ...updates } = params;
      const { data, error } = await supabase
        .from("staff_leave")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff_leave", businessId] });
      toast.success("Leave updated successfully");
    },
    onError: (error: Error) => {
      console.error("Failed to update leave:", error);
      toast.error("Failed to update leave");
    },
  });

  // Delete leave
  const deleteLeave = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("staff_leave")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff_leave", businessId] });
      toast.success("Leave deleted successfully");
    },
    onError: (error: Error) => {
      console.error("Failed to delete leave:", error);
      toast.error("Failed to delete leave");
    },
  });

  // Helper to check if a staff member is on leave on a specific date
  const isOnLeave = (staffId: string, date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return leaves.some(
      (leave) =>
        leave.staff_id === staffId &&
        leave.start_date <= dateStr &&
        leave.end_date >= dateStr
    );
  };

  // Get leave records for a specific staff member
  const getStaffLeaves = (staffId: string) => {
    return leaves.filter((leave) => leave.staff_id === staffId);
  };

  // Get upcoming and current leave
  const getActiveLeave = () => {
    const today = new Date().toISOString().split("T")[0];
    return leaves.filter((leave) => leave.end_date >= today);
  };

  // Get past leave
  const getPastLeave = () => {
    const today = new Date().toISOString().split("T")[0];
    return leaves.filter((leave) => leave.end_date < today);
  };

  return {
    leaves,
    isLoading,
    createLeave,
    updateLeave,
    deleteLeave,
    isOnLeave,
    getStaffLeaves,
    getActiveLeave,
    getPastLeave,
  };
}

export { useStaffLeave as default };
