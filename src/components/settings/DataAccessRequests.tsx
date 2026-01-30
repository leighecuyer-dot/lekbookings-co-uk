import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Building2,
  Mail,
  ChevronDown,
  ChevronUp,
  Loader2,
  Inbox
} from "lucide-react";
import { useDataAccessRequests, DataType, RequestStatus } from "@/hooks/reseller/useDataAccessRequests";
import { format } from "date-fns";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface DataAccessRequestWithReseller {
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
  resellers: {
    company_name: string;
    contact_email: string | null;
  } | null;
}

const DATA_TYPE_LABELS: Record<DataType, string> = {
  revenue: "Revenue Data",
  customer_contact: "Customer Contact Info",
  booking_notes: "Booking Notes",
};

const DATA_TYPE_DESCRIPTIONS: Record<DataType, string> = {
  revenue: "Access to view booking revenue, pricing, and financial data",
  customer_contact: "Access to view customer email addresses and phone numbers",
  booking_notes: "Access to view notes attached to bookings",
};

export function DataAccessRequests() {
  const [requests, setRequests] = useState<DataAccessRequestWithReseller[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseMessage, setResponseMessage] = useState("");
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);
  const { getAllRequestsForBusiness, respondToRequest, loading: actionLoading } = useDataAccessRequests();

  const fetchRequests = async () => {
    setLoading(true);
    const data = await getAllRequestsForBusiness();
    setRequests(data as DataAccessRequestWithReseller[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const pendingRequests = requests.filter(r => r.status === "pending");
  const historyRequests = requests.filter(r => r.status !== "pending");

  const handleRespond = async (requestId: string, approved: boolean) => {
    const result = await respondToRequest(requestId, approved, responseMessage);
    if (result.success) {
      setRespondingTo(null);
      setResponseMessage("");
      fetchRequests();
    }
  };

  const getStatusBadge = (status: RequestStatus) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" />Pending</Badge>;
      case "approved":
        return <Badge className="gap-1 bg-success/10 text-success border-success/20"><CheckCircle className="w-3 h-3" />Approved</Badge>;
      case "denied":
        return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" />Denied</Badge>;
    }
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-soft">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-soft">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Data Access Requests
        </CardTitle>
        <CardDescription>
          Manage requests from resellers to access your private data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Pending Requests */}
        {pendingRequests.length > 0 ? (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">
              Pending Requests ({pendingRequests.length})
            </h3>
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                className="border rounded-lg p-4 space-y-3 bg-muted/30"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">
                        {request.resellers?.company_name || "Unknown Reseller"}
                      </span>
                    </div>
                    {request.resellers?.contact_email && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="w-3 h-3" />
                        {request.resellers.contact_email}
                      </div>
                    )}
                  </div>
                  {getStatusBadge(request.status)}
                </div>

                <div className="bg-background rounded p-3 space-y-2">
                  <div className="font-medium text-sm">
                    {DATA_TYPE_LABELS[request.data_type]}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {DATA_TYPE_DESCRIPTIONS[request.data_type]}
                  </p>
                </div>

                {request.request_message && (
                  <div className="text-sm">
                    <span className="font-medium">Message:</span>{" "}
                    <span className="text-muted-foreground">{request.request_message}</span>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Requested {format(new Date(request.requested_at), "MMM d, yyyy 'at' h:mm a")}
                </p>

                {respondingTo === request.id ? (
                  <div className="space-y-3 pt-2 border-t">
                    <Textarea
                      placeholder="Add an optional response message..."
                      value={responseMessage}
                      onChange={(e) => setResponseMessage(e.target.value)}
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleRespond(request.id, true)}
                        disabled={actionLoading}
                        className="gap-1"
                      >
                        {actionLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                        <CheckCircle className="w-3 h-3" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRespond(request.id, false)}
                        disabled={actionLoading}
                        className="gap-1"
                      >
                        {actionLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                        <XCircle className="w-3 h-3" />
                        Deny
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setRespondingTo(null);
                          setResponseMessage("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => setRespondingTo(request.id)}
                      className="gap-1"
                    >
                      <CheckCircle className="w-3 h-3" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setRespondingTo(request.id)}
                      className="gap-1"
                    >
                      <XCircle className="w-3 h-3" />
                      Deny
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Inbox className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No pending access requests</p>
          </div>
        )}

        {/* Request History */}
        {historyRequests.length > 0 && (
          <Collapsible
            open={expandedRequest === "history"}
            onOpenChange={(open) => setExpandedRequest(open ? "history" : null)}
          >
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between">
                <span className="text-sm font-semibold">
                  Request History ({historyRequests.length})
                </span>
                {expandedRequest === "history" ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-3">
              {historyRequests.map((request) => (
                <div
                  key={request.id}
                  className="border rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {request.resellers?.company_name}
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-sm text-muted-foreground">
                        {DATA_TYPE_LABELS[request.data_type]}
                      </span>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                  {request.response_message && (
                    <p className="text-xs text-muted-foreground">
                      Response: {request.response_message}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {request.responded_at
                      ? `Responded ${format(new Date(request.responded_at), "MMM d, yyyy")}`
                      : `Requested ${format(new Date(request.requested_at), "MMM d, yyyy")}`}
                  </p>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
