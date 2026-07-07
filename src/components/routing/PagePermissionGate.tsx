import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useBusiness } from "@/contexts/BusinessContext";
import { useUserPermissions, PageKey } from "@/hooks/permissions/useUserPermissions";
import { toast } from "sonner";

interface Props {
  pageKey: PageKey;
  children: ReactNode;
}

/** Blocks the page if the current user's permissions disallow this page key. */
export function PagePermissionGate({ pageKey, children }: Props) {
  const { currentBusiness } = useBusiness();
  const { pages, loading } = useUserPermissions(currentBusiness?.id);

  if (loading) return null;
  if (!pages[pageKey]) {
    toast.error("You don't have access to that page");
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}
