import { useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useDiagnostics, DiagnosticCheck } from "@/hooks/diagnostics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle, XCircle, AlertCircle, Loader2, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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
      </div>
    </DashboardLayout>
  );
}
