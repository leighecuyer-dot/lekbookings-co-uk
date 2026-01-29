import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Phone,
  MessageSquare,
  Users,
  Search,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Info,
  Mail,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { subDays, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  lastBooking?: string | null;
}

export interface AvailabilityContext {
  daysWithOpenings: Array<{
    dayName: string;
    date: string;
    availableSlots: number;
  }>;
  totalAvailable: number;
}

interface BulkMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  businessName: string;
  messageType: "sms" | "whatsapp" | "email";
  availabilityContext?: AvailabilityContext;
}

const MESSAGE_TEMPLATES = {
  sms: [
    {
      id: "slots-available",
      name: "Available Slots",
      message: "Hi {name}! We have availability this week at {business}. Book your appointment now and secure your preferred time! Reply to book.",
    },
    {
      id: "special-offer",
      name: "Special Offer",
      message: "Hi {name}! As a valued customer of {business}, we're offering you priority booking this week. Limited slots available - book now!",
    },
    {
      id: "reminder",
      name: "We Miss You",
      message: "Hi {name}! It's been a while since your last visit to {business}. We'd love to see you again! Book your next appointment today.",
    },
  ],
  whatsapp: [
    {
      id: "slots-available",
      name: "Available Slots",
      message: "Hi {name}! 👋\n\nWe have availability this week at {business}. Book your appointment now and secure your preferred time!\n\nReply to book or tap to call us.",
    },
    {
      id: "special-offer",
      name: "Special Offer",
      message: "Hi {name}! 🌟\n\nAs a valued customer of {business}, we're offering you priority booking this week.\n\nLimited slots available - book now!",
    },
    {
      id: "reminder",
      name: "We Miss You",
      message: "Hi {name}! 💫\n\nIt's been a while since your last visit to {business}. We'd love to see you again!\n\nBook your next appointment today.",
    },
  ],
  email: [
    {
      id: "slots-available",
      name: "Available Slots",
      message: "Dear {name},\n\nWe have availability this week at {business} and wanted to reach out to offer you priority booking.\n\nBook your appointment now and secure your preferred time slot before they fill up.\n\nWe look forward to seeing you soon!\n\nBest regards,\n{business}",
    },
    {
      id: "special-offer",
      name: "Special Offer",
      message: "Dear {name},\n\nAs a valued customer of {business}, we're excited to offer you an exclusive priority booking opportunity this week.\n\nLimited slots are available, so book now to secure your preferred time.\n\nThank you for choosing us!\n\nBest regards,\n{business}",
    },
    {
      id: "reminder",
      name: "We Miss You",
      message: "Dear {name},\n\nIt's been a while since your last visit to {business}, and we wanted to let you know we'd love to see you again!\n\nWe have appointments available this week and would be happy to book you in at a time that works for you.\n\nWe hope to see you soon!\n\nBest regards,\n{business}",
    },
  ],
};

// Generate dynamic templates based on availability context
const generateDynamicTemplates = (
  context: AvailabilityContext | undefined,
  messageType: "sms" | "whatsapp" | "email"
) => {
  if (!context || context.daysWithOpenings.length === 0) {
    return [];
  }

  const topDays = context.daysWithOpenings.slice(0, 3);
  const firstDay = topDays[0];
  const daysList = topDays.map(d => d.dayName).join(", ");
  
  const emoji = messageType === "whatsapp" ? " 📅" : "";
  const greeting = messageType === "email" ? "Dear {name}," : "Hi {name}!";
  const signoff = messageType === "email" ? "\n\nBest regards,\n{business}" : "";
  const lineBreak = messageType === "email" ? "\n\n" : messageType === "whatsapp" ? "\n\n" : " ";

  const templates = [];

  // Single day highlight
  if (firstDay) {
    templates.push({
      id: "day-specific",
      name: `${firstDay.dayName} Openings`,
      message: messageType === "email"
        ? `${greeting}\n\nWe have ${firstDay.availableSlots} openings this ${firstDay.dayName} at {business}!${lineBreak}Book now to secure your preferred time slot.${signoff}`
        : `${greeting}${emoji}${lineBreak}We have ${firstDay.availableSlots} openings this ${firstDay.dayName} at {business}!${lineBreak}Book now before they fill up!`,
    });
  }

  // Multiple days
  if (topDays.length > 1) {
    templates.push({
      id: "multiple-days",
      name: "This Week's Slots",
      message: messageType === "email"
        ? `${greeting}\n\nWe have availability on ${daysList} this week at {business}.${lineBreak}With ${context.totalAvailable} slots available, now is the perfect time to book your appointment.${signoff}`
        : `${greeting}${emoji}${lineBreak}We have openings on ${daysList} this week at {business}!${lineBreak}${context.totalAvailable} slots available - book now!`,
    });
  }

  // Urgency template
  if (context.totalAvailable <= 10) {
    templates.push({
      id: "limited-slots",
      name: "Limited Availability",
      message: messageType === "email"
        ? `${greeting}\n\nJust ${context.totalAvailable} slots left this week at {business}!${lineBreak}These tend to fill up fast, so book now to secure your spot.${signoff}`
        : `${greeting}${emoji}${lineBreak}Only ${context.totalAvailable} slots left this week at {business}!${lineBreak}Book now before they're gone!`,
    });
  }

  return templates;
};

export function BulkMessageDialog({
  open,
  onOpenChange,
  businessId,
  businessName,
  messageType,
  availabilityContext,
}: BulkMessageDialogProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [message, setMessage] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "inactive">("inactive");

  const staticTemplates = MESSAGE_TEMPLATES[messageType];
  const dynamicTemplates = useMemo(
    () => generateDynamicTemplates(availabilityContext, messageType),
    [availabilityContext, messageType]
  );
  const allTemplates = [...dynamicTemplates, ...staticTemplates];

  useEffect(() => {
    if (open && businessId) {
      fetchCustomers();
      // Use dynamic template if available, otherwise use first static template
      const defaultTemplate = dynamicTemplates.length > 0 ? dynamicTemplates[0] : staticTemplates[0];
      setMessage(defaultTemplate.message);
      
      // Set dynamic email subject based on context
      if (messageType === "email") {
        if (availabilityContext?.daysWithOpenings[0]) {
          const firstDay = availabilityContext.daysWithOpenings[0];
          setEmailSubject(`We have ${firstDay.availableSlots} openings this ${firstDay.dayName}!`);
        } else {
          setEmailSubject("We have availability this week!");
        }
      } else {
        setEmailSubject("");
      }
    }
  }, [open, businessId, messageType, availabilityContext]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      // Fetch customers with their last booking
      // For email, we need customers with email; for SMS/WhatsApp, we need phone
      const query = supabase
        .from("customers")
        .select("id, name, phone, email")
        .eq("business_id", businessId);
      
      if (messageType === "email") {
        query.not("email", "is", null);
      } else {
        query.not("phone", "is", null);
      }

      const { data: customersData, error: customersError } = await query;

      if (customersError) throw customersError;

      // Fetch last booking for each customer
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select("customer_id, start_time")
        .eq("business_id", businessId)
        .order("start_time", { ascending: false });

      if (bookingsError) throw bookingsError;

      // Map last booking to customers
      const lastBookingMap = new Map<string, string>();
      bookingsData?.forEach((booking) => {
        if (booking.customer_id && !lastBookingMap.has(booking.customer_id)) {
          lastBookingMap.set(booking.customer_id, booking.start_time);
        }
      });

      const customersWithBookings: Customer[] = (customersData || []).map((c) => ({
        ...c,
        lastBooking: lastBookingMap.get(c.id) || null,
      }));

      setCustomers(customersWithBookings);
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    let filtered = customers;

    // Filter by inactive (no booking in last 30 days)
    if (filterType === "inactive") {
      const thirtyDaysAgo = subDays(new Date(), 30);
      filtered = filtered.filter((c) => {
        if (!c.lastBooking) return true;
        return parseISO(c.lastBooking) < thirtyDaysAgo;
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.phone?.includes(query) ||
          c.email?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [customers, filterType, searchQuery]);

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredCustomers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCustomers.map((c) => c.id)));
    }
  };

  const applyTemplate = (template: (typeof allTemplates)[0]) => {
    setMessage(template.message);
    if (messageType === "email") {
      // Set a default subject based on template
      const subjectMap: Record<string, string> = {
        "slots-available": "We have availability this week!",
        "special-offer": "Exclusive offer just for you!",
        "reminder": "We miss you! Book your next appointment",
        "day-specific": availabilityContext?.daysWithOpenings[0]
          ? `We have ${availabilityContext.daysWithOpenings[0].availableSlots} openings this ${availabilityContext.daysWithOpenings[0].dayName}!`
          : "We have availability this week!",
        "multiple-days": "Your week's openings at " + businessName,
        "limited-slots": "Only a few slots left this week!",
      };
      setEmailSubject(subjectMap[template.id] || "Message from " + businessName);
    }
  };

  const getPreviewMessage = (customerName: string) => {
    return message
      .replace(/{name}/g, customerName)
      .replace(/{business}/g, businessName);
  };

  const handleSend = async () => {
    if (selectedIds.size === 0) {
      toast.error("Please select at least one customer");
      return;
    }

    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    if (messageType === "email" && !emailSubject.trim()) {
      toast.error("Please enter an email subject");
      return;
    }

    setSending(true);

    try {
      const selectedCustomers = customers.filter((c) => selectedIds.has(c.id));

      const { data, error } = await supabase.functions.invoke("send-bulk-messages", {
        body: {
          customers: selectedCustomers.map((c) => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
            email: c.email,
          })),
          messageTemplate: message,
          emailSubject: messageType === "email" ? emailSubject : undefined,
          businessName,
          messageType,
        },
      });

      if (error) throw error;

      const result = data as { sent: number; failed: number };
      
      if (result.sent > 0) {
        toast.success(`Successfully sent ${result.sent} messages`);
        if (result.failed > 0) {
          toast.warning(`${result.failed} messages failed to send`);
        }
        onOpenChange(false);
        setSelectedIds(new Set());
      } else {
        toast.error("Failed to send messages. Please check your messaging configuration.");
      }
    } catch (error: any) {
      console.error("Error sending messages:", error);
      toast.error(error.message || "Failed to send messages");
    } finally {
      setSending(false);
    }
  };

  const selectedCount = selectedIds.size;
  const isWhatsApp = messageType === "whatsapp";
  const isEmail = messageType === "email";

  const getIcon = () => {
    if (isEmail) return <Mail className="h-5 w-5 text-blue-500" />;
    if (isWhatsApp) return <MessageSquare className="h-5 w-5 text-emerald-500" />;
    return <Phone className="h-5 w-5 text-primary" />;
  };

  const getTitle = () => {
    if (isEmail) return "Email";
    if (isWhatsApp) return "WhatsApp";
    return "SMS";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getIcon()}
            Send {getTitle()} Campaign
          </DialogTitle>
          <DialogDescription>
            Select customers and compose your message to fill available slots
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="select" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="select" className="gap-2">
              <Users className="h-4 w-4" />
              Select ({selectedCount})
            </TabsTrigger>
            <TabsTrigger value="compose" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Compose
            </TabsTrigger>
          </TabsList>

          <TabsContent value="select" className="flex-1 flex flex-col min-h-0 mt-4">
            {/* Filters */}
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button
                variant={filterType === "inactive" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType(filterType === "inactive" ? "all" : "inactive")}
              >
                Inactive 30d+
              </Button>
            </div>

            {/* Customer List */}
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                <Users className="h-8 w-8 mb-2 opacity-50" />
                <p>No customers with {isEmail ? "email addresses" : "phone numbers"} found</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <Button variant="ghost" size="sm" onClick={toggleSelectAll}>
                    {selectedIds.size === filteredCustomers.length ? "Deselect All" : "Select All"}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {filteredCustomers.length} customers
                  </span>
                </div>
                <ScrollArea className="flex-1 border rounded-lg">
                  <div className="p-2 space-y-1">
                    {filteredCustomers.map((customer) => (
                      <div
                        key={customer.id}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                          selectedIds.has(customer.id)
                            ? "bg-primary/10 border border-primary/20"
                            : "hover:bg-muted"
                        )}
                        onClick={() => toggleSelect(customer.id)}
                      >
                        <Checkbox
                          checked={selectedIds.has(customer.id)}
                          onCheckedChange={() => toggleSelect(customer.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{customer.name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {isEmail ? customer.email : customer.phone}
                        </p>
                        </div>
                        {customer.lastBooking && (
                          <Badge variant="outline" className="text-xs shrink-0">
                            {new Date(customer.lastBooking).toLocaleDateString()}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}
          </TabsContent>

          <TabsContent value="compose" className="flex-1 flex flex-col min-h-0 mt-4 space-y-4">
            {/* Dynamic Templates from AI Context */}
            {dynamicTemplates.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  Based on Your Availability
                </p>
                <div className="flex gap-2 flex-wrap">
                  {dynamicTemplates.map((template) => (
                    <Button
                      key={template.id}
                      variant="default"
                      size="sm"
                      className="gap-1"
                      onClick={() => applyTemplate(template)}
                    >
                      {template.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Static Templates */}
            <div>
              <p className="text-sm font-medium mb-2">Quick Templates</p>
              <div className="flex gap-2 flex-wrap">
                {staticTemplates.map((template) => (
                  <Button
                    key={template.id}
                    variant="outline"
                    size="sm"
                    onClick={() => applyTemplate(template)}
                  >
                    {template.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Email Subject (only for email) */}
            {isEmail && (
              <div>
                <p className="text-sm font-medium mb-2">Subject Line</p>
                <Input
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Enter email subject..."
                />
              </div>
            )}

            {/* Message Input */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Message</p>
                <span className="text-xs text-muted-foreground">
                  {message.length} characters
                </span>
              </div>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 min-h-[120px] resize-none"
              />
              <div className="flex items-start gap-2 mt-2 p-2 bg-muted rounded-lg">
                <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Use <code className="bg-background px-1 rounded">{"{name}"}</code> for customer name and{" "}
                  <code className="bg-background px-1 rounded">{"{business}"}</code> for your business name.
                </p>
              </div>
            </div>

            {/* Preview */}
            {selectedCount > 0 && (
              <div className="border rounded-lg p-3 bg-muted/50">
                <p className="text-xs font-medium text-muted-foreground mb-1">Preview</p>
                <p className="text-sm">
                  {getPreviewMessage(
                    customers.find((c) => selectedIds.has(c.id))?.name || "Customer"
                  )}
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t mt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {selectedCount > 0 ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                {selectedCount} customer{selectedCount !== 1 ? "s" : ""} selected
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4" />
                Select customers to send
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={selectedCount === 0 || !message.trim() || sending}
              className="gap-2"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send {selectedCount > 0 ? `to ${selectedCount}` : ""}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
