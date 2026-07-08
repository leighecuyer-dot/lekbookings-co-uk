import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Returns the set of customer IDs the current user is allowed to see
 * for a given business.
 *
 * - Owners, admins, and resellers get `scopeAll: true` (unrestricted).
 * - Staff get `scopeAll: false` plus the set of customer IDs assigned
 *   to them via `staff_customers`.
 */
export function useMyCustomerIds(businessId: string | null | undefined) {
  const { user } = useAuth();
  const [scopeAll, setScopeAll] = useState(true);
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user || !businessId) {
      setScopeAll(true);
      setIds(new Set());
      setLoading(false);
      return;
    }
    setLoading(true);

    // Is the user a reseller linked to this business? Treat as unrestricted.
    const { data: resellerRow } = await supabase
      .from("resellers")
      .select("id, reseller_clients!inner(business_id)")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .eq("reseller_clients.business_id", businessId)
      .maybeSingle();
    if (resellerRow) {
      setScopeAll(true);
      setIds(new Set());
      setLoading(false);
      return;
    }

    // Role in this business
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("business_id", businessId)
      .maybeSingle();

    const role = roleRow?.role;
    if (role === "owner" || role === "admin") {
      setScopeAll(true);
      setIds(new Set());
      setLoading(false);
      return;
    }

    // Staff (or anything else) -> scoped to assigned customers
    const { data: staffRow } = await supabase
      .from("staff")
      .select("id")
      .eq("business_id", businessId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!staffRow) {
      setScopeAll(false);
      setIds(new Set());
      setLoading(false);
      return;
    }

    const { data: assigned } = await supabase
      .from("staff_customers")
      .select("customer_id")
      .eq("business_id", businessId)
      .eq("staff_id", staffRow.id);

    setScopeAll(false);
    setIds(new Set((assigned || []).map((r) => r.customer_id)));
    setLoading(false);
  }, [user, businessId]);

  useEffect(() => {
    load();
  }, [load]);

  return { scopeAll, ids, loading, reload: load };
}
