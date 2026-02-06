import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Mail,
  Phone,
  MessageSquare,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  DollarSign,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface MessageLog {
  id: string;
  business_id: string;
  customer_id: string | null;
  channel: "email" | "sms" | "whatsapp";
  message_type: "transactional" | "marketing";
  provider: string;
  provider_message_id: string | null;
  status: string;
  recipient: string;
  subject: string | null;
  template_name: string | null;
  message_preview: string | null;
  cost_estimate: number | null;
  error_message: string | null;
  campaign_id: string | null;
  created_at: string;
}

interface MessageLogsPanelProps {
  businessId: string;
}

const channelIcons = {
  email: Mail,
  sms: Phone,
  whatsapp: MessageSquare,
};

const channelColors = {
  email: "text-blue-500",
  sms: "text-primary",
  whatsapp: "text-emerald-500",
};

const statusConfig: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  sent: { icon: Send, color: "text-blue-500", label: "Sent" },
  delivered: { icon: CheckCircle2, color: "text-emerald-500", label: "Delivered" },
  failed: { icon: XCircle, color: "text-destructive", label: "Failed" },
  bounced: { icon: AlertTriangle, color: "text-amber-500", label: "Bounced" },
  queued: { icon: Clock, color: "text-muted-foreground", label: "Queued" },
  blocked: { icon: XCircle, color: "text-amber-500", label: "Blocked" },
};

export function MessageLogsPanel({ businessId }: MessageLogsPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<"all" | "email" | "sms" | "whatsapp">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "transactional" | "marketing">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "sent" | "delivered" | "failed">("all");

  const { data: logs = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["message-logs", businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("message_logs")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      return data as MessageLog[];
    },
    enabled: !!businessId,
  });

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Channel filter
      if (channelFilter !== "all" && log.channel !== channelFilter) return false;
      
      // Type filter
      if (typeFilter !== "all" && log.message_type !== typeFilter) return false;
      
      // Status filter
      if (statusFilter !== "all" && log.status !== statusFilter) return false;
      
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          log.recipient.toLowerCase().includes(query) ||
          log.subject?.toLowerCase().includes(query) ||
          log.message_preview?.toLowerCase().includes(query) ||
          log.template_name?.toLowerCase().includes(query)
        );
      }
      
      return true;
    });
  }, [logs, channelFilter, typeFilter, statusFilter, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const total = logs.length;
    const delivered = logs.filter((l) => l.status === "delivered").length;
    const failed = logs.filter((l) => l.status === "failed" || l.status === "bounced").length;
    const totalCost = logs.reduce((sum, l) => sum + (l.cost_estimate || 0), 0);
    
    return {
      total,
      delivered,
      failed,
      deliveryRate: total > 0 ? ((delivered / total) * 100).toFixed(1) : "0",
      totalCost: totalCost.toFixed(2),
    };
  }, [logs]);

  const getChannelIcon = (channel: "email" | "sms" | "whatsapp") => {
    const Icon = channelIcons[channel];
    return <Icon className={cn("h-4 w-4", channelColors[channel])} />;
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || statusConfig.sent;
    const Icon = config.icon;
    
    return (
      <Badge variant="outline" className={cn("gap-1", config.color)}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Send className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Messages</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.delivered}</p>
                <p className="text-xs text-muted-foreground">Delivered</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.deliveryRate}%</p>
                <p className="text-xs text-muted-foreground">Delivery Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <DollarSign className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">£{stats.totalCost}</p>
                <p className="text-xs text-muted-foreground">Est. Cost</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Message History</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={channelFilter} onValueChange={(v) => setChannelFilter(v as typeof channelFilter)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="transactional">Transactional</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Send className="h-8 w-8 mb-2 opacity-50" />
              <p>No messages found</p>
              <p className="text-sm">Messages will appear here once sent</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">Channel</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Subject/Preview</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              {getChannelIcon(log.channel)}
                            </TooltipTrigger>
                            <TooltipContent>
                              {log.channel.charAt(0).toUpperCase() + log.channel.slice(1)} via {log.provider}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="font-medium max-w-[150px] truncate">
                        {log.recipient}
                      </TableCell>
                      <TableCell>
                        <Badge variant={log.message_type === "marketing" ? "default" : "secondary"} className="text-xs">
                          {log.message_type === "marketing" ? "Marketing" : "Service"}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger className="text-left truncate block max-w-[200px]">
                              {log.subject || log.message_preview || log.template_name || "—"}
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[300px]">
                              {log.message_preview || log.subject || "No preview available"}
                              {log.error_message && (
                                <p className="text-destructive mt-1">Error: {log.error_message}</p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(log.created_at), "MMM d, h:mm a")}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {log.cost_estimate ? `£${log.cost_estimate.toFixed(3)}` : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
          
          <p className="text-xs text-muted-foreground text-center">
            Showing {filteredLogs.length} of {logs.length} messages
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
