import { ReactNode } from "react";
import { useBusiness } from "@/contexts/BusinessContext";
import { useUserPermissions, PageKey } from "@/hooks/permissions/useUserPermissions";

interface PermissionGateProps {
  need: "financials" | PageKey;
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGate({ need, children, fallback = null }: PermissionGateProps) {
  const { currentBusiness } = useBusiness();
  const { canViewFinancials, pages, loading } = useUserPermissions(currentBusiness?.id);

  if (loading) return null;

  const allowed = need === "financials" ? canViewFinancials : pages[need];
  return <>{allowed ? children : fallback}</>;
}
