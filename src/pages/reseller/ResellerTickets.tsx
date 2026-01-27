import { useEffect, useState } from "react";
import { ResellerLayout } from "@/components/layout/ResellerLayout";
import { useReseller } from "@/contexts/ResellerContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { MessageSquare, Send } from "lucide-react";

interface Ticket {
  id: string;
  subject: string;
  description: string | null;
  status: string;
  priority: string;
  created_at: string;
  business_id: string | null;
  business?: { name: string } | null;
}

interface Message {
  id: string;
  message: string;
  sender_id: string;
  created_at: string;
}

export default function ResellerTickets() {
  const { reseller } = useReseller();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchTickets = async () => {
    if (!reseller) return;

    const { data, error } = await supabase
      .from("support_tickets")
      .select(`*, business:businesses(name)`)
      .eq("reseller_id", reseller.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching tickets:", error);
    } else {
      setTickets(
        (data || []).map((t) => ({
          ...t,
          business: t.business as { name: string } | null,
        }))
      );
    }
    setLoading(false);
  };

  const fetchMessages = async (ticketId: string) => {
    const { data, error } = await supabase
      .from("ticket_messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    if (!error) {
      setMessages(data || []);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [reseller]);

  useEffect(() => {
    if (selectedTicket) {
      fetchMessages(selectedTicket.id);
    }
  }, [selectedTicket]);

  const updateTicketStatus = async (ticketId: string, status: string) => {
    const { error } = await supabase
      .from("support_tickets")
      .update({ status })
      .eq("id", ticketId);

    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success("Status updated");
      fetchTickets();
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status });
      }
    }
  };

  const sendMessage = async () => {
    if (!selectedTicket || !newMessage.trim()) return;

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { error } = await supabase.from("ticket_messages").insert({
      ticket_id: selectedTicket.id,
      sender_id: userData.user.id,
      message: newMessage.trim(),
    });

    if (error) {
      toast.error("Failed to send message");
    } else {
      setNewMessage("");
      fetchMessages(selectedTicket.id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-blue-500";
      case "in_progress":
        return "bg-yellow-500";
      case "resolved":
        return "bg-green-500";
      case "closed":
        return "bg-gray-500";
      default:
        return "";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-500";
      case "high":
        return "bg-orange-500";
      case "normal":
        return "bg-blue-500";
      case "low":
        return "bg-gray-400";
      default:
        return "";
    }
  };

  return (
    <ResellerLayout
      title="Support Tickets"
      description="Manage client support requests"
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Ticket List */}
        <Card className="lg:col-span-2 border-0 shadow-soft">
          <CardHeader>
            <CardTitle>All Tickets</CardTitle>
            <CardDescription>{tickets.length} total tickets</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8 text-muted-foreground">
                Loading...
              </p>
            ) : tickets.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No support tickets yet
              </p>
            ) : (
              <div className="space-y-3">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
                      selectedTicket?.id === ticket.id ? "bg-muted" : ""
                    }`}
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{ticket.subject}</p>
                        <p className="text-sm text-muted-foreground">
                          {ticket.business?.name || "Unknown"} •{" "}
                          {format(new Date(ticket.created_at), "MMM d, yyyy")}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={getPriorityColor(ticket.priority)}>
                          {ticket.priority}
                        </Badge>
                        <Badge className={getStatusColor(ticket.status)}>
                          {ticket.status.replace("_", " ")}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ticket Details */}
        <Card className="border-0 shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Ticket Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedTicket ? (
              <div className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Subject</Label>
                  <p className="font-medium">{selectedTicket.subject}</p>
                </div>
                {selectedTicket.description && (
                  <div>
                    <Label className="text-muted-foreground">Description</Label>
                    <p className="text-sm">{selectedTicket.description}</p>
                  </div>
                )}
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <Select
                    value={selectedTicket.status}
                    onValueChange={(v) =>
                      updateTicketStatus(selectedTicket.id, v)
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Messages */}
                <div className="border-t pt-4">
                  <Label className="text-muted-foreground">Messages</Label>
                  <div className="mt-2 space-y-2 max-h-[200px] overflow-y-auto">
                    {messages.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No messages yet
                      </p>
                    ) : (
                      messages.map((msg) => (
                        <div
                          key={msg.id}
                          className="p-2 rounded bg-muted text-sm"
                        >
                          <p>{msg.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(msg.created_at), "MMM d, h:mm a")}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a reply..."
                      className="min-h-[60px]"
                    />
                    <Button
                      size="icon"
                      onClick={sendMessage}
                      disabled={!newMessage.trim()}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Select a ticket to view details
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </ResellerLayout>
  );
}
