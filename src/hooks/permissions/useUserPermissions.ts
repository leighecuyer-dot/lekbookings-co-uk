import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type PageKey =
  | "customers"
  | "reports"
  | "messaging"
  | "waitlist"
  | "settings"
  | "staff"
  | "services";

export interface UserPermissions {
  isOwner: boolean;
  canViewFinancials: boolean;
  pages: Record<PageKey, boolean>;
}

const DEFAULT_PAGES: Record<PageKey, boolean> = {
  customers: true,
  reports: true,
  messaging: true,
  waitlist: true,
  settings: true,
  staff: true,
  services: true,
};

const FULL_ACCESS: UserPermissions = {
  isOwner: true,
  canViewFinancials: true,
  pages: DEFAULT_PAGES,
};

export function useUserPermissions(businessId: string | null | undefined) {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<UserPermissions>(FULL_ACCESS);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user || !businessId) {
      setPermissions(FULL_ACCESS);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc("get_user_permissions", {
      _user_id: user.id,
      _business_id: businessId,
    });
    if (error || !data) {
      setPermissions(FULL_ACCESS);
    } else {
      const d = data as {
        is_owner: boolean;
        can_view_financials: boolean;
        page_access: Record<string, boolean>;
      };
      setPermissions({
        isOwner: !!d.is_owner,
        canViewFinancials: d.can_view_financials !== false,
        pages: { ...DEFAULT_PAGES, ...(d.page_access || {}) } as Record<PageKey, boolean>,
      });
    }
    setLoading(false);
  }, [user, businessId]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...permissions, loading, reload: load };
}
