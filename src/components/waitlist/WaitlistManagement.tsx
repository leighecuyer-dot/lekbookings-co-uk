import { useState } from "react";
import { useWaitlist, WaitlistEntry } from "@/hooks/waitlist/useWaitlist";
import { useBusiness } from "@/contexts/BusinessContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Clock, 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Trash2,
  AlertCircle 
} from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function WaitlistManagement() {
  const { currentBusiness } = useBusiness();
  const { waitlistEntries, isLoading, updateStatus, deleteEntry, isUpdating, isDeleting } = useWaitlist();
  const [selectedTab, setSelectedTab] = useState("waiting");

  // Fetch services and staff for display
  const { data: services = [] } = useQuery({
    queryKey: ["services", currentBusiness?.id],
    queryFn: async () => {
      if (!currentBusiness?.id) return [];
      const { data } = await supabase
        .from("services")
        .select("id, name")
        .eq("business_id", currentBusiness.id);
      return data || [];
    },
    enabled: !!currentBusiness?.id,
  });

  const { data: staffList = [] } = useQuery({
    queryKey: ["staff", currentBusiness?.id],
    queryFn: async () => {
      if (!currentBusiness?.id) return [];
      const { data } = await supabase
        .from("staff")
        .select("id, name")
        .eq("business_id", currentBusiness.id);
      return data || [];
    },
    enabled: !!currentBusiness?.id,
  });

  const getServiceName = (serviceId: string | null) => {
    if (!serviceId) return "Any service";
    const service = services.find((s) => s.id === serviceId);
    return service?.name || "Unknown";
  };

  const getStaffName = (staffId: string | null) => {
    if (!staffId) return "Any staff";
    const staff = staffList.find((s) => s.id === staffId);
    return staff?.name || "Unknown";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "waiting":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Waiting</Badge>;
      case "notified":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Notified</Badge>;
      case "booked":
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Booked</Badge>;
      case "expired":
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Expired</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredEntries = waitlistEntries.filter((entry) => {
    if (selectedTab === "all") return true;
    return entry.status === selectedTab;
  });

  const waitingCount = waitlistEntries.filter((e) => e.status === "waiting").length;
  const bookedCount = waitlistEntries.filter((e) => e.status === "booked").length;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Waitlist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Waitlist
              {waitingCount > 0 && (
                <Badge variant="secondary">{waitingCount} waiting</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Customers waiting for popular appointment slots
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="waiting">Waiting ({waitingCount})</TabsTrigger>
            <TabsTrigger value="booked">Booked ({bookedCount})</TabsTrigger>
            <TabsTrigger value="all">All ({waitlistEntries.length})</TabsTrigger>
          </TabsList>

          <TabsContent value={selectedTab} className="space-y-3">
            {filteredEntries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No waitlist entries found</p>
              </div>
            ) : (
              filteredEntries.map((entry) => (
                <WaitlistCard
                  key={entry.id}
                  entry={entry}
                  serviceName={getServiceName(entry.service_id)}
                  staffName={getStaffName(entry.staff_id)}
                  statusBadge={getStatusBadge(entry.status)}
                  onMarkExpired={() => updateStatus({ entryId: entry.id, status: "expired" })}
                  onDelete={() => deleteEntry(entry.id)}
                  isUpdating={isUpdating}
                  isDeleting={isDeleting}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

interface WaitlistCardProps {
  entry: WaitlistEntry;
  serviceName: string;
  staffName: string;
  statusBadge: React.ReactNode;
  onMarkExpired: () => void;
  onDelete: () => void;
  isUpdating: boolean;
  isDeleting: boolean;
}

function WaitlistCard({
  entry,
  serviceName,
  staffName,
  statusBadge,
  onMarkExpired,
  onDelete,
  isUpdating,
  isDeleting,
}: WaitlistCardProps) {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">{entry.customer_name}</span>
          {statusBadge}
        </div>
        <span className="text-xs text-muted-foreground">
          Added {format(parseISO(entry.created_at), "MMM d, h:mm a")}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span>{format(parseISO(entry.desired_date), "EEEE, MMMM d")}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>{entry.desired_start_time} - {entry.desired_end_time}</span>
        </div>
        {entry.customer_email && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="w-4 h-4" />
            <span>{entry.customer_email}</span>
          </div>
        )}
        {entry.customer_phone && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="w-4 h-4" />
            <span>{entry.customer_phone}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 text-sm">
        <Badge variant="outline">{serviceName}</Badge>
        <Badge variant="outline">{staffName}</Badge>
      </div>

      {entry.notes && (
        <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
          {entry.notes}
        </p>
      )}

      {entry.status === "booked" && entry.booking_id && (
        <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 p-2 rounded">
          <CheckCircle className="w-4 h-4" />
          <span>Automatically booked when slot became available</span>
        </div>
      )}

      {entry.status === "waiting" && (
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onMarkExpired}
            disabled={isUpdating}
          >
            <XCircle className="w-4 h-4 mr-1" />
            Mark Expired
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={isDeleting}>
                <Trash2 className="w-4 h-4 mr-1" />
                Remove
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove from waitlist?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove {entry.customer_name} from the waitlist.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>Remove</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}
