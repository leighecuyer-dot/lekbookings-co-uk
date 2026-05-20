import { ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import { useReseller } from "@/contexts/ResellerContext";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

interface RouteGuardProps {
  children: ReactNode;
  /** Require user to be authenticated */
  requireAuth?: boolean;
  /** Require user to have at least one business OR be in reseller mode managing a client */
  requireBusiness?: boolean;
  /** Require user to be a reseller */
  requireReseller?: boolean;
  /** Require reseller to have completed onboarding (has branding set up) */
  requireResellerOnboarded?: boolean;
  /** Redirect authenticated users away (for login/register pages) */
  redirectAuthenticated?: boolean;
  /** Redirect users who already have a business (for onboarding) */
  redirectIfHasBusiness?: boolean;
  /** Redirect users who are already resellers AND have completed onboarding (for reseller onboarding) */
  redirectIfIsReseller?: boolean;
  /** Custom redirect path when conditions fail */
  fallbackPath?: string;
}

function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}

/**
 * Defensive fallback for the requireBusiness check.
 * If the BusinessContext reports no businesses (which would normally
 * send the user to /onboarding), double-check directly against
 * user_roles. Only redirect to onboarding if the user truly has no
 * business role — otherwise wait and send them to the dashboard.
 */
function BusinessFallback({ userId, fallbackPath }: { userId: string; fallbackPath?: string }) {
  const { refreshBusinesses } = useBusiness() as ReturnType<typeof useBusiness> & {
    refreshBusinesses?: () => Promise<void> | void;
  };
  const [decision, setDecision] = useState<"loading" | "onboarding">("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("business_id")
        .eq("user_id", userId)
        .limit(1);
      if (cancelled) return;
      if (!error && data && data.length > 0) {
        // User has roles — businesses fetch must have failed transiently.
        // Trigger a refresh and stay in loading state until context updates.
        try {
          await refreshBusinesses?.();
        } catch {
          /* ignored */
        }
      } else {
        setDecision("onboarding");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, refreshBusinesses]);

  if (decision === "onboarding") {
    return <Navigate to={fallbackPath || "/onboarding"} replace />;
  }
  return <LoadingState />;
}



export function RouteGuard({
  children,
  requireAuth = false,
  requireBusiness = false,
  requireReseller = false,
  requireResellerOnboarded = false,
  redirectAuthenticated = false,
  redirectIfHasBusiness = false,
  redirectIfIsReseller = false,
  fallbackPath,
}: RouteGuardProps) {
  const { user, loading: authLoading } = useAuth();
  const { businesses, isResellerMode, currentBusiness, loading: businessLoading } = useBusiness();
  const { isReseller, needsOnboarding, loading: resellerLoading } = useReseller();

  // Determine which loading states we need to wait for
  const needsBusinessContext = requireBusiness || redirectIfHasBusiness || redirectAuthenticated;
  const needsResellerContext = requireReseller || requireResellerOnboarded || redirectIfIsReseller;

  const isLoading =
    authLoading ||
    (needsBusinessContext && businessLoading) ||
    (needsResellerContext && resellerLoading);

  if (isLoading) {
    return <LoadingState />;
  }

  // Redirect authenticated users away from public pages (like /auth)
  if (redirectAuthenticated && user) {
    const hasBusinessAccess = businesses.length > 0 || currentBusiness !== null;
    const destination = hasBusinessAccess ? "/dashboard" : "/onboarding";
    return <Navigate to={fallbackPath || destination} replace />;
  }

  // Redirect if user already has a business (for onboarding page)
  if (redirectIfHasBusiness && user && businesses.length > 0) {
    return <Navigate to={fallbackPath || "/dashboard"} replace />;
  }

  // Redirect if user is already a reseller AND has completed onboarding (for reseller onboarding page)
  if (redirectIfIsReseller && user && isReseller && !needsOnboarding) {
    return <Navigate to={fallbackPath || "/reseller"} replace />;
  }

  // Require authentication
  if (requireAuth && !user) {
    return <Navigate to={fallbackPath || "/auth"} replace />;
  }

  // Require at least one business OR be in reseller mode with a current business
  if (requireBusiness && user) {
    const hasOwnBusiness = businesses.length > 0;
    const hasResellerAccess = isResellerMode && currentBusiness !== null;

    if (!hasOwnBusiness && !hasResellerAccess) {
      return <BusinessFallback userId={user.id} fallbackPath={fallbackPath} />;
    }
  }


  // Require reseller status
  if (requireReseller && !isReseller) {
    return <Navigate to={fallbackPath || "/dashboard"} replace />;
  }

  // Require reseller to have completed onboarding (branding set up)
  if (requireResellerOnboarded && isReseller && needsOnboarding) {
    return <Navigate to="/reseller/onboarding" replace />;
  }

  return <>{children}</>;
}
