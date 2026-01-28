import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import { useReseller } from "@/contexts/ResellerContext";
import { Skeleton } from "@/components/ui/skeleton";

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
    const destination = businesses.length === 0 ? "/onboarding" : "/dashboard";
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
      return <Navigate to={fallbackPath || "/onboarding"} replace />;
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
