import { useState, useEffect } from "react";
import { Lock, Send, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useDataAccessRequests, DataType, DataAccessRequest } from "@/hooks/reseller/useDataAccessRequests";

interface PrivacyLockOverlayProps {
  label?: string;
  className?: string;
  tooltipText?: string;
  settingsLink?: string;
  /** If provided, shows a "Request Access" button for resellers */
  dataType?: DataType;
  /** Whether to show the request access button */
  showRequestAccess?: boolean;
}

export function PrivacyLockOverlay({ 
  label = "Private", 
  className,
  tooltipText = "This data is hidden by the business owner's privacy settings.",
  settingsLink,
  dataType,
  showRequestAccess = false,
}: PrivacyLockOverlayProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [existingRequest, setExistingRequest] = useState<DataAccessRequest | null>(null);
  const { requestAccess, getRequestStatus, loading } = useDataAccessRequests();

  useEffect(() => {
    if (showRequestAccess && dataType) {
      getRequestStatus(dataType).then(setExistingRequest);
    }
  }, [showRequestAccess, dataType]);

  const handleRequestAccess = async () => {
    if (!dataType) return;
    
    const result = await requestAccess(dataType, message);
    if (result.success) {
      setDialogOpen(false);
      setMessage("");
      // Refresh status
      const newStatus = await getRequestStatus(dataType);
      setExistingRequest(newStatus);
    }
  };

  const getDataTypeLabel = (type: DataType) => {
    switch (type) {
      case "revenue": return "revenue data";
      case "customer_contact": return "customer contact information";
      case "booking_notes": return "booking notes";
      default: return "this data";
    }
  };

  const renderRequestStatus = () => {
    if (!existingRequest) return null;

    switch (existingRequest.status) {
      case "pending":
        return (
          <div className="flex items-center gap-1.5 text-xs text-warning">
            <Clock className="w-3 h-3" />
            <span>Request pending</span>
          </div>
        );
      case "approved":
        return (
          <div className="flex items-center gap-1.5 text-xs text-success">
            <CheckCircle className="w-3 h-3" />
            <span>Request approved</span>
          </div>
        );
      case "denied":
        return (
          <div className="flex items-center gap-1.5 text-xs text-destructive">
            <XCircle className="w-3 h-3" />
            <span>Request denied</span>
          </div>
        );
    }
  };

  return (
    <>
      <div 
        className={cn(
          "absolute inset-0 z-10 flex flex-col items-center justify-center",
          "bg-background/80 backdrop-blur-sm rounded-lg",
          className
        )}
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="p-3 rounded-full bg-muted/80 mb-2 cursor-help">
                <Lock className="w-5 h-5 text-muted-foreground" />
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-[220px] text-center">
              <p className="text-xs">{tooltipText}</p>
              {settingsLink && (
                <Link 
                  to={settingsLink} 
                  className="text-xs text-primary hover:underline mt-1 inline-block"
                >
                  View privacy settings →
                </Link>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        
        {showRequestAccess && dataType && (
          <div className="mt-3">
            {existingRequest ? (
              renderRequestStatus()
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => setDialogOpen(true)}
              >
                <Send className="w-3 h-3" />
                Request Access
              </Button>
            )}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Access to Data</DialogTitle>
            <DialogDescription>
              Send a request to the business owner to access {dataType ? getDataTypeLabel(dataType) : "this data"}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Message (optional)
              </label>
              <Textarea
                placeholder="Explain why you need access to this data..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRequestAccess} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
