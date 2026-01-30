import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useBusiness } from "@/contexts/BusinessContext";

export type DataType = "revenue" | "customer_contact" | "booking_notes";
export type RequestStatus = "pending" | "approved" | "denied";

export interface DataAccessRequest {
  id: string;
  reseller_id: string;
  business_id: string;
  data_type: DataType;
  status: RequestStatus;
  request_message: string | null;
  response_message: string | null;
  requested_at: string;
  responded_at: string | null;
  responded_by: string | null;
}

export function useDataAccessRequests() {
  const { currentBusiness, isResellerMode } = useBusiness();
  const [loading, setLoading] = useState(false);

  // In reseller mode, currentBusiness is already the client business being managed
  const businessId = currentBusiness?.id;

  const requestAccess = async (dataType: DataType, message?: string) => {
    if (!businessId) return { success: false, error: "No business selected" };

    setLoading(true);
    try {
      // Get the reseller ID for the current user
      const { data: resellerId, error: resellerError } = await supabase
        .rpc("get_reseller_id", { _user_id: (await supabase.auth.getUser()).data.user?.id });

      if (resellerError || !resellerId) {
        throw new Error("Could not identify reseller");
      }

      const { error } = await supabase
        .from("reseller_data_requests")
        .insert({
          reseller_id: resellerId,
          business_id: businessId,
          data_type: dataType,
          request_message: message || null,
        });

      if (error) {
        if (error.code === "23505") {
          toast.info("Access request already submitted for this data type");
          return { success: true, existing: true };
        }
        throw error;
      }

      toast.success("Access request sent to business owner");
      return { success: true };
    } catch (error: any) {
      console.error("Error requesting access:", error);
      toast.error("Failed to send access request");
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const getRequestStatus = async (dataType: DataType): Promise<DataAccessRequest | null> => {
    if (!businessId) return null;

    try {
      const { data, error } = await supabase
        .from("reseller_data_requests")
        .select("*")
        .eq("business_id", businessId)
        .eq("data_type", dataType)
        .maybeSingle();

      if (error) throw error;
      return data as DataAccessRequest | null;
    } catch (error) {
      console.error("Error fetching request status:", error);
      return null;
    }
  };

  const getPendingRequestsForBusiness = async () => {
    if (!currentBusiness?.id) return [];

    try {
      const { data, error } = await supabase
        .from("reseller_data_requests")
        .select(`
          *,
          resellers:reseller_id (
            company_name,
            contact_email
          )
        `)
        .eq("business_id", currentBusiness.id)
        .eq("status", "pending")
        .order("requested_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching pending requests:", error);
      return [];
    }
  };

  const getAllRequestsForBusiness = async () => {
    if (!currentBusiness?.id) return [];

    try {
      const { data, error } = await supabase
        .from("reseller_data_requests")
        .select(`
          *,
          resellers:reseller_id (
            company_name,
            contact_email
          )
        `)
        .eq("business_id", currentBusiness.id)
        .order("requested_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching requests:", error);
      return [];
    }
  };

  const respondToRequest = async (
    requestId: string,
    approved: boolean,
    responseMessage?: string
  ) => {
    setLoading(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;

      const { error } = await supabase
        .from("reseller_data_requests")
        .update({
          status: approved ? "approved" : "denied",
          response_message: responseMessage || null,
          responded_at: new Date().toISOString(),
          responded_by: user?.id,
        })
        .eq("id", requestId);

      if (error) throw error;

      toast.success(approved ? "Request approved" : "Request denied");
      return { success: true };
    } catch (error: any) {
      console.error("Error responding to request:", error);
      toast.error("Failed to respond to request");
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    requestAccess,
    getRequestStatus,
    getPendingRequestsForBusiness,
    getAllRequestsForBusiness,
    respondToRequest,
  };
}
