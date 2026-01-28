import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useDiagnostics, DiagnosticCheck } from "@/hooks/diagnostics";
import { useBusiness } from "@/contexts/BusinessContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle, XCircle, AlertCircle, Loader2, ChevronDown, User, Building2, Shield, FileText } from "lucide-react";
import { format } from "date-fns";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AuditLog {
  id: number;
  business_id: string;
  action: string;
  entity: string | null;
  entity_id: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}

function StatusBadge({ status }: { status: DiagnosticCheck["status"] }) {
  switch (status) {
    case "pass":
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1">
          <CheckCircle className="w-3 h-3" />
          PASS
        </Badge>
      );
    case "fail":
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="w-3 h-3" />
          FAIL
        </Badge>
      );
    case "error":
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1">
          <AlertCircle className="w-3 h-3" />
          ERROR
        </Badge>
      );
    case "running":
      return (
        <Badge variant="secondary" className="gap-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          RUNNING
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="gap-1">
          PENDING
        </Badge>
      );
  }
}

interface OrphanBusiness {
  business_id: string;
  name: string;
  created_at: string;
}

function DiagnosticCard({ check }: { check: DiagnosticCheck }) {
  const hasOrphanData = check.id === "orphan-businesses" && 
    check.status === "fail" && 
    Array.isArray(check.data) && 
    check.data.length > 0;

  return (
    <Card className="border-0 shadow-soft">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold">{check.name}</CardTitle>
          <CardDescription className="text-sm">{check.description}</CardDescription>
        </div>
        <StatusBadge status={check.status} />
      </CardHeader>
      <CardContent>
        {check.details && (
          <p className="text-sm text-muted-foreground">{check.details}</p>
        )}
        
        {hasOrphanData && (
          <Collapsible className="mt-3">
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <ChevronDown className="w-4 h-4" />
                View Orphan Businesses
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <div className="rounded-lg border bg-muted/50 divide-y">
                {(check.data as OrphanBusiness[]).map((orphan) => (
                  <div key={orphan.business_id} className="p-3 text-sm">
                    <div className="font-medium">{orphan.name}</div>
                    <div className="text-muted-foreground text-xs mt-1">
                      ID: {orphan.business_id}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      Created: {format(new Date(orphan.created_at), "PPpp")}
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}

function ResellerDiagnosticsSection() {
  const { user } = useAuth();
  const { currentBusiness, isResellerMode, mode } = useBusiness();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [canAccessBusiness, setCanAccessBusiness] = useState<boolean | null>(null);
  const [loadingAccess, setLoadingAccess] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const checkBusinessAccess = async () => {
    if (!currentBusiness) return;
    setLoadingAccess(true);
    try {
      const { data, error } = await supabase.rpc("can_access_business", {
        p_business_id: currentBusiness.id,
      });
      if (error) {
        console.error("can_access_business error:", error);
        setCanAccessBusiness(null);
      } else {
        setCanAccessBusiness(data as boolean);
      }
    } catch (err) {
      console.error("Error checking business access:", err);
      setCanAccessBusiness(null);
    } finally {
      setLoadingAccess(false);
    }
  };

  const fetchAuditLogs = async () => {
    if (!currentBusiness) return;
    setLoadingLogs(true);
    try {
      const { data, error } = await supabase.rpc("get_reseller_audit_logs", {
        p_business_id: currentBusiness.id,
        p_limit: 10,
      });
      if (error) {
        console.error("get_reseller_audit_logs error:", error);
        setAuditLogs([]);
      } else {
        setAuditLogs((data as AuditLog[]) || []);
      }
    } catch (err) {
      console.error("Error fetching audit logs:", err);
      setAuditLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (currentBusiness) {
      checkBusinessAccess();
      fetchAuditLogs();
    }
  }, [currentBusiness?.id]);

  return (
    <div className="space-y-6">
      {/* Context Info */}
      <Card className="border-0 shadow-soft">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Reseller Mode Diagnostics
          </CardTitle>
          <CardDescription>
            Current context and access information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <User className="w-4 h-4" />
                User ID
              </div>
              <p className="font-mono text-xs break-all">{user?.id || "Not logged in"}</p>
            </div>
            
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Building2 className="w-4 h-4" />
                Business ID
              </div>
              <p className="font-mono text-xs break-all">{currentBusiness?.id || "None selected"}</p>
            </div>
            
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="text-muted-foreground text-sm mb-1">Mode</div>
              <Badge variant={isResellerMode ? "default" : "secondary"}>
                {mode === "reseller" ? "Reseller Mode" : "Business Mode"}
              </Badge>
            </div>
            
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="text-muted-foreground text-sm mb-1">can_access_business()</div>
              {loadingAccess ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : canAccessBusiness === null ? (
                <Badge variant="outline">Unknown</Badge>
              ) : canAccessBusiness ? (
                <Badge className="bg-emerald-500">Allowed</Badge>
              ) : (
                <Badge variant="destructive">Denied</Badge>
              )}
            </div>
          </div>
          
          <Button variant="outline" size="sm" onClick={checkBusinessAccess} disabled={loadingAccess}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loadingAccess ? "animate-spin" : ""}`} />
            Refresh Access Check
          </Button>
        </CardContent>
      </Card>

      {/* Audit Logs */}
      <Card className="border-0 shadow-soft">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Reseller Audit Logs
            </CardTitle>
            <CardDescription>
              Last 10 actions for current business
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchAuditLogs} disabled={loadingLogs}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loadingLogs ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {loadingLogs ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : auditLogs.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No audit logs found for this business
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Entity ID</TableHead>
                  <TableHead>Payload</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs">
                      {format(new Date(log.created_at), "MMM d, HH:mm:ss")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.action}</Badge>
                    </TableCell>
                    <TableCell>{log.entity || "-"}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.entity_id ? log.entity_id.slice(0, 8) + "..." : "-"}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate font-mono text-xs">
                      {log.payload ? JSON.stringify(log.payload) : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function DiagnosticsPage() {
  const { checks, isRunning, runChecks } = useDiagnostics();

  useEffect(() => {
    runChecks();
  }, []);

  const passCount = checks.filter((c) => c.status === "pass").length;
  const failCount = checks.filter((c) => c.status === "fail").length;
  const errorCount = checks.filter((c) => c.status === "error").length;

  return (
    <DashboardLayout
      title="System Diagnostics"
      description="Internal admin checks for system health and configuration"
    >
      <div className="space-y-6 animate-fade-in">
        {/* Summary Header */}
        <Card className="border-0 shadow-soft bg-foreground text-background">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-display text-background">
                Diagnostic Summary
              </CardTitle>
              <CardDescription className="text-background/70">
                {checks.length > 0 ? (
                  <>
                    {passCount} passed, {failCount} failed, {errorCount} errors
                  </>
                ) : (
                  "Run diagnostics to check system health"
                )}
              </CardDescription>
            </div>
            <Button
              onClick={runChecks}
              disabled={isRunning}
              variant="secondary"
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRunning ? "animate-spin" : ""}`} />
              {isRunning ? "Running..." : "Re-run Checks"}
            </Button>
          </CardHeader>
        </Card>

        {/* Diagnostic Cards Grid */}
        {checks.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {checks.map((check) => (
              <DiagnosticCard key={check.id} check={check} />
            ))}
          </div>
        )}

        {/* Reseller Diagnostics Section */}
        <ResellerDiagnosticsSection />
      </div>
    </DashboardLayout>
  );
}
