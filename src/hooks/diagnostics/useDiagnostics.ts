import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useIndustries } from "@/hooks/business/useIndustries";
import { CREATES_VIA_RPC } from "@/hooks/reseller/useResellerClients";
import { USES_DASHBOARD_RPC, getLastDashboardRpcTimestamp } from "@/hooks/dashboard/useDashboardDiagnostics";

export interface DiagnosticCheck {
  id: string;
  name: string;
  description: string;
  status: "pending" | "running" | "pass" | "fail" | "error";
  details?: string;
  data?: unknown;
}

export function useDiagnostics() {
  const [checks, setChecks] = useState<DiagnosticCheck[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const { isRealtimeActive } = useBusiness();
  const { source: industriesSource } = useIndustries();

  const updateCheck = (id: string, updates: Partial<DiagnosticCheck>) => {
    setChecks((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const runChecks = useCallback(async () => {
    setIsRunning(true);

    const initialChecks: DiagnosticCheck[] = [
      {
        id: "orphan-businesses",
        name: "Orphan Business Check",
        description: "Checks for businesses without an owner role",
        status: "pending",
      },
      {
        id: "reseller-rpc",
        name: "Reseller Create Path",
        description: "Verifies ResellerClients creation uses the secure RPC",
        status: "pending",
      },
      {
        id: "realtime",
        name: "Realtime Subscription",
        description: "Checks if BusinessContext realtime subscription is active",
        status: "pending",
      },
      {
        id: "dashboard-rpc",
        name: "Dashboard RPC",
        description: "Verifies dashboard uses the optimized RPC function",
        status: "pending",
      },
      {
        id: "rate-limit",
        name: "Edge Function Rate Limiting",
        description: "Checks if parse-diary has rate limiting enabled",
        status: "pending",
      },
      {
        id: "industries-source",
        name: "Industries Source",
        description: "Checks if industries are loaded from DB or fallback",
        status: "pending",
      },
    ];

    setChecks(initialChecks);

    // 1. Orphan Business Check
    updateCheck("orphan-businesses", { status: "running" });
    try {
      const { data, error } = await supabase.rpc("diag_orphan_businesses");
      if (error) throw error;
      const result = data as { count: number; orphans: Array<{ business_id: string; name: string; created_at: string }> };
      updateCheck("orphan-businesses", {
        status: result.count === 0 ? "pass" : "fail",
        details: result.count === 0 
          ? "No orphan businesses found" 
          : `Found ${result.count} orphan business(es)`,
        data: result.orphans,
      });
    } catch (err) {
      updateCheck("orphan-businesses", {
        status: "error",
        details: err instanceof Error ? err.message : "Failed to run check",
      });
    }

    // 2. Reseller RPC Check
    updateCheck("reseller-rpc", { status: "running" });
    updateCheck("reseller-rpc", {
      status: CREATES_VIA_RPC ? "pass" : "fail",
      details: CREATES_VIA_RPC
        ? "Reseller client creation uses create_reseller_client_business RPC"
        : "WARNING: Client-side inserts detected",
      data: { CREATES_VIA_RPC },
    });

    // 3. Realtime Check
    updateCheck("realtime", { status: "running" });
    updateCheck("realtime", {
      status: isRealtimeActive ? "pass" : "fail",
      details: isRealtimeActive
        ? "Realtime subscription is active"
        : "Realtime subscription is not active",
      data: { isRealtimeActive },
    });

    // 4. Dashboard RPC Check
    updateCheck("dashboard-rpc", { status: "running" });
    const lastRpcTimestamp = getLastDashboardRpcTimestamp();
    updateCheck("dashboard-rpc", {
      status: USES_DASHBOARD_RPC ? "pass" : "fail",
      details: USES_DASHBOARD_RPC
        ? `Dashboard uses get_dashboard_overview RPC. Last call: ${lastRpcTimestamp ? new Date(lastRpcTimestamp).toLocaleString() : "Never"}`
        : "Dashboard does not use the optimized RPC",
      data: { USES_DASHBOARD_RPC, lastRpcTimestamp },
    });

    // 5. Rate Limit Check (Edge Function)
    updateCheck("rate-limit", { status: "running" });
    try {
      const response = await supabase.functions.invoke("parse-diary", {
        body: { diaryText: "", dataType: "bookings", _diagnosticPing: true },
      });
      
      const rateLimitEnabled = response.data?.rateLimitEnabled === true;
      updateCheck("rate-limit", {
        status: rateLimitEnabled ? "pass" : "fail",
        details: rateLimitEnabled
          ? "Rate limiting is enabled on parse-diary"
          : "Rate limiting not detected",
        data: { rateLimitEnabled },
      });
    } catch (err) {
      // Even errors may indicate rate limiting is working
      updateCheck("rate-limit", {
        status: "error",
        details: err instanceof Error ? err.message : "Failed to check rate limiting",
      });
    }

    // 6. Industries Source Check
    updateCheck("industries-source", { status: "running" });
    updateCheck("industries-source", {
      status: industriesSource === "database" ? "pass" : "fail",
      details: industriesSource === "database"
        ? "Industries are loaded from the database"
        : "Industries are using fallback data",
      data: { source: industriesSource },
    });

    setIsRunning(false);
  }, [isRealtimeActive, industriesSource]);

  return { checks, isRunning, runChecks };
}
