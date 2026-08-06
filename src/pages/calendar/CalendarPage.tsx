import { useUserPermissions } from "@/hooks/permissions/useUserPermissions";
import { applyCalendarScope } from "@/lib/bookingVisibility";
import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useBusiness } from "@/contexts/BusinessContext";
import { useResellerOperations } from "@/hooks/reseller";
import { useBookingDragDrop } from "@/hooks/bookings";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Clock, User, ChevronLeft, ChevronRight, CalendarDays, Columns3, List } from "lucide-react";
import { format, startOfDay, endOfDay, addDays, startOfWeek, endOfWeek, isSameDay, parseISO } from "date-fns";
import { BookingEditDialog } from "@/components/booking/BookingEditDialog";
import { WeekView } from "@/components/calendar/WeekView";
import { KanbanView } from "@/components/calendar/KanbanView";
import { DayTimelineView } from "@/components/calendar/DayTimelineView";
import { StaffDayColumnsView } from "@/components/calendar/StaffDayColumnsView";
import { cn } from "@/lib/utils";
import { PinchZoomWrapper } from "@/components/calendar/PinchZoomWrapper";
import { StatusFilter } from "@/components/calendar/StatusFilter";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import { useStaffLeave } from "@/hooks/staff/useStaffLeave";
import { isValidEmail } from "@/lib/validation";

type ViewMode = "day" | "week" | "kanban";

interface Booking {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  notes: string | null;
  service_id: string | null;
  staff_id: string | null;
  image_urls: string[] | null;
  payment_status?: string;
  total_price?: number | null;
  deposit_amount?: number | null;
  amount_paid?: number | null;
}

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  color: string | null;
  price?: number | null;
}

interface WorkingHoursDay {
  start: string;
  end: string;
  enabled?: boolean;
}

interface WorkingHours {
  [key: string]: WorkingHoursDay;
}

interface Staff {
  id: string;
  name: string;
  working_hours?: WorkingHours | null;
}

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export default function CalendarPage() {
  const { currentBusiness, isResellerMode } = useBusiness();
  const { calendarScope, staffId: myStaffId } = useUserPermissions(currentBusiness?.id);

  const { createBooking: resellerCreateBooking, updateBookingStatus: resellerUpdateBookingStatus } = useResellerOperations();
  const { isOnLeave } = useStaffLeave(currentBusiness?.id || null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [dayLayout, setDayLayout] = useState<"timeline" | "columns">(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("lek-day-layout") : null;
    return saved === "columns" ? "columns" : "timeline";
  });
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [staffFilter, setStaffFilter] = useState<string>("all");
  
  // Swipe gestures for mobile day navigation
  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: () => setSelectedDate(addDays(selectedDate, 1)),
    onSwipeRight: () => setSelectedDate(addDays(selectedDate, -1)),
    threshold: 50,
  });
  
  // New booking form
  const [newBooking, setNewBooking] = useState({
    customerId: "",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    serviceId: "",
    staffId: "",
    time: "09:00",
    notes: "",
    durationOverride: null as number | null,
  });

  // Track if we need to refetch after drag-drop
  const [refetchTrigger, setRefetchTrigger] = useState(0);
  
  // Drag and drop for rescheduling appointments
  const {
    draggingBookingId,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDrop,
  } = useBookingDragDrop({ onUpdate: () => setRefetchTrigger((t) => t + 1) });

  useEffect(() => {
    if (currentBusiness) {
      fetchData();
    }
  }, [currentBusiness, selectedDate, viewMode, refetchTrigger]);

  const fetchData = async () => {
    if (!currentBusiness) return;
    
    setLoading(true);
    
    // For week view, fetch the whole week; for kanban, fetch more; otherwise just the day
    let queryStart: string;
    let queryEnd: string;
    
    if (viewMode === "week") {
      queryStart = startOfWeek(selectedDate, { weekStartsOn: 1 }).toISOString();
      queryEnd = endOfWeek(selectedDate, { weekStartsOn: 1 }).toISOString();
    } else if (viewMode === "kanban") {
      // Fetch a wider range for kanban view
      queryStart = startOfWeek(selectedDate, { weekStartsOn: 1 }).toISOString();
      queryEnd = endOfWeek(addDays(selectedDate, 14), { weekStartsOn: 1 }).toISOString();
    } else {
      queryStart = startOfDay(selectedDate).toISOString();
      queryEnd = endOfDay(selectedDate).toISOString();
    }

    const [bookingsRes, servicesRes, staffRes, customersRes] = await Promise.all([
      supabase
        .from("bookings")
        .select("*")
        .eq("business_id", currentBusiness.id)
        .gte("start_time", queryStart)
        .lte("start_time", queryEnd)
        .order("start_time", { ascending: true }),
      supabase
        .from("services")
        .select("id, name, duration_minutes, color, price")
        .eq("business_id", currentBusiness.id)
        .eq("is_active", true),
      supabase
        .from("staff")
        .select("id, name, working_hours")
        .eq("business_id", currentBusiness.id)
        .eq("is_active", true),
      supabase
        .from("customers")
        .select("id, name, email, phone")
        .eq("business_id", currentBusiness.id)
        .order("name", { ascending: true }),
    ]);

    if (bookingsRes.data) setBookings(applyCalendarScope(bookingsRes.data, calendarScope, myStaffId));
    if (servicesRes.data) setServices(servicesRes.data);
    if (staffRes.data) setStaffList(staffRes.data as unknown as Staff[]);
    if (customersRes.data) setCustomers(customersRes.data);
    setLoading(false);
    setInitialLoad(false);
  };

  const handleCreateBooking = async () => {
    if (!currentBusiness || !newBooking.customerName) {
      toast.error("Please fill in customer name");
      return;
    }

    if (newBooking.customerEmail && !isValidEmail(newBooking.customerEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    const service = services.find((s) => s.id === newBooking.serviceId);
    const durationMinutes =
      newBooking.durationOverride ?? service?.duration_minutes ?? 30;

    const startTime = new Date(selectedDate);
    const [hours, minutes] = newBooking.time.split(":").map(Number);
    startTime.setHours(hours, minutes, 0, 0);

    if (startTime < new Date()) {
      toast.error("Cannot create a booking in the past");
      return;
    }

    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + durationMinutes);

    let success = false;

    if (isResellerMode) {
      // Use SECURITY DEFINER RPC for reseller mode (with audit logging)
      const bookingId = await resellerCreateBooking({
        customerName: newBooking.customerName,
        startTime,
        endTime,
        customerId: newBooking.customerId || null,
        customerEmail: newBooking.customerEmail || null,
        customerPhone: newBooking.customerPhone || null,
        serviceId: newBooking.serviceId || null,
        staffId: newBooking.staffId || null,
        notes: newBooking.notes || null,
        status: "confirmed",
      });
      success = !!bookingId;
    } else {
      // Normal mode: direct insert
      const { error } = await supabase.from("bookings").insert({
        business_id: currentBusiness.id,
        customer_id: newBooking.customerId || null,
        customer_name: newBooking.customerName,
        customer_email: newBooking.customerEmail || null,
        customer_phone: newBooking.customerPhone || null,
        service_id: newBooking.serviceId || null,
        staff_id: newBooking.staffId || null,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        notes: newBooking.notes || null,
        status: "confirmed",
      });
      success = !error;
      if (error) {
        toast.error("Failed to create booking");
        return;
      }
    }

    if (success) {
      toast.success("Booking created!");
      setDialogOpen(false);
      setNewBooking({
        customerId: "",
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        serviceId: "",
        staffId: "",
        time: "09:00",
        notes: "",
        durationOverride: null,
      });
      fetchData();
    }
  };

  const handleCustomerSelect = (customerId: string) => {
    if (customerId === "new") {
      setNewBooking({
        ...newBooking,
        customerId: "",
        customerName: "",
        customerEmail: "",
        customerPhone: "",
      });
    } else {
      const customer = customers.find((c) => c.id === customerId);
      if (customer) {
        setNewBooking({
          ...newBooking,
          customerId: customer.id,
          customerName: customer.name,
          customerEmail: customer.email || "",
          customerPhone: customer.phone || "",
        });
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-background text-foreground";
      case "pending":
        return "bg-background/80 text-foreground";
      case "cancelled":
        return "bg-background/50 text-foreground";
      case "completed":
        return "bg-background/60 text-foreground";
      default:
        return "bg-background text-foreground";
    }
  };

  const timeSlots = Array.from({ length: 20 }, (_, i) => {
    const hour = Math.floor(i / 2) + 8;
    const minute = i % 2 === 0 ? "00" : "30";
    return `${hour.toString().padStart(2, "0")}:${minute}`;
  });

  // Filter bookings by status and staff
  const filteredBookings = bookings.filter((b) => {
    if (statusFilter.length > 0 && !statusFilter.includes(b.status)) return false;
    if (staffFilter === "unassigned") return !b.staff_id;
    if (staffFilter !== "all" && b.staff_id !== staffFilter) return false;
    return true;
  });

  // For day view, also filter by selected day
  const dayBookings = filteredBookings.filter((b) =>
    isSameDay(parseISO(b.start_time), selectedDate)
  );

  const handleStatusChange = async (bookingId: string, newStatus: string) => {
    let success = false;

    if (isResellerMode) {
      // Use SECURITY DEFINER RPC for reseller mode (with audit logging)
      success = await resellerUpdateBookingStatus(bookingId, newStatus);
    } else {
      // Normal mode: direct update
      const { error } = await supabase
        .from("bookings")
        .update({ status: newStatus })
        .eq("id", bookingId);
      success = !error;
      if (error) {
        toast.error("Failed to update status");
        return;
      }
    }

    if (success) {
      toast.success("Status updated");
      fetchData();
    }
  };

  const handleBookingClick = (booking: Booking) => {
    setEditingBooking(booking);
    setEditDialogOpen(true);
  };

  const handleSlotClick = (time: string, staffId?: string) => {
    setNewBooking((prev) => ({ 
      ...prev, 
      time,
      staffId: staffId || "",
      durationOverride: null,
    }));
    setDialogOpen(true);
  };

  const handleSlotRangeSelect = (
    time: string,
    durationMinutes: number,
    staffId?: string
  ) => {
    setNewBooking((prev) => ({
      ...prev,
      time,
      staffId: staffId || "",
      durationOverride: durationMinutes,
    }));
    setDialogOpen(true);
  };


  return (
    <DashboardLayout
      title="Calendar"
      description="Manage your appointments and bookings"
      actions={
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary">
              <Plus className="w-4 h-4 mr-2" />
              New Booking
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-0 gap-0">
            <DialogHeader className="p-6 pb-2">
              <DialogTitle>Create New Booking</DialogTitle>
              <DialogDescription>
                Add a new appointment for {format(selectedDate, "MMMM d, yyyy")}
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4">
              <div className="space-y-2">
                <Label>Select Customer</Label>
                <Select
                  value={newBooking.customerId || "new"}
                  onValueChange={handleCustomerSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select existing or add new" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">+ Add new customer</SelectItem>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name} {customer.email ? `(${customer.email})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Customer Name *</Label>
                <Input
                  value={newBooking.customerName}
                  onChange={(e) =>
                    setNewBooking({ ...newBooking, customerName: e.target.value })
                  }
                  placeholder="John Doe"
                  disabled={!!newBooking.customerId}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={newBooking.customerEmail}
                    onChange={(e) =>
                      setNewBooking({ ...newBooking, customerEmail: e.target.value })
                    }
                    placeholder="john@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={newBooking.customerPhone}
                    onChange={(e) =>
                      setNewBooking({ ...newBooking, customerPhone: e.target.value })
                    }
                    placeholder="+1 555 123 4567"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Service</Label>
                <Select
                  value={newBooking.serviceId}
                  onValueChange={(v) => setNewBooking({ ...newBooking, serviceId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a service" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} ({service.duration_minutes} min)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Select
                    value={newBooking.time}
                    onValueChange={(v) => setNewBooking({ ...newBooking, time: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((slot) => (
                        <SelectItem key={slot} value={slot}>
                          {slot}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Staff</Label>
                  <Select
                    value={newBooking.staffId}
                    onValueChange={(v) => setNewBooking({ ...newBooking, staffId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any available" />
                    </SelectTrigger>
                    <SelectContent>
                      {staffList.map((staff) => (
                        <SelectItem key={staff.id} value={staff.id}>
                          {staff.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={newBooking.notes}
                  onChange={(e) =>
                    setNewBooking({ ...newBooking, notes: e.target.value })
                  }
                  placeholder="Any special requests..."
                  rows={2}
                />
              </div>
            </div>
            <div className="p-6 pt-4 border-t">
              <Button onClick={handleCreateBooking} className="w-full gradient-primary">
                Create Booking
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="h-full flex flex-col">
        {/* View Mode Tabs & Status Filter - Compact on mobile */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 mb-3 sm:mb-4 shrink-0">
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant={viewMode === "day" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("day")}
              className={`h-8 px-2 sm:px-3 text-xs sm:text-sm ${viewMode === "day" ? "bg-foreground text-background" : ""}`}
            >
              <List className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline">Day</span>
            </Button>
            <Button
              variant={viewMode === "week" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("week")}
              className={`h-8 px-2 sm:px-3 text-xs sm:text-sm ${viewMode === "week" ? "bg-foreground text-background" : ""}`}
            >
              <CalendarDays className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline">Week</span>
            </Button>
            <Button
              variant={viewMode === "kanban" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("kanban")}
              className={`h-8 px-2 sm:px-3 text-xs sm:text-sm ${viewMode === "kanban" ? "bg-foreground text-background" : ""}`}
            >
              <Columns3 className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline">Kanban</span>
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Select value={staffFilter} onValueChange={setStaffFilter}>
              <SelectTrigger className="h-8 w-[140px] sm:w-[180px] text-xs sm:text-sm">
                <User className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All staff</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {staffList.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <StatusFilter
              selectedStatuses={statusFilter}
              onStatusChange={setStatusFilter}
            />
          </div>
        </div>

        <div className="flex-1 flex flex-col lg:grid lg:grid-cols-[280px_1fr] gap-3 sm:gap-6 min-h-0">
          {/* Calendar Sidebar - Hidden on mobile in day view */}
          <Card className="border-0 shadow-soft h-fit hidden lg:block shrink-0">
            <CardContent className="p-3 sm:p-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md"
              />
            </CardContent>
          </Card>

          {/* Main Content Area */}
          <Card className="border-0 shadow-soft flex-1 flex flex-col min-h-0">
            <CardContent className="p-3 sm:p-6 flex-1 flex flex-col min-h-0 overflow-hidden">
              {viewMode === "day" && (
                <div 
                  className="flex flex-col h-full"
                  onTouchStart={dayLayout === "timeline" ? swipeHandlers.onTouchStart : undefined}
                  onTouchMove={dayLayout === "timeline" ? swipeHandlers.onTouchMove : undefined}
                  onTouchEnd={dayLayout === "timeline" ? swipeHandlers.onTouchEnd : undefined}
                >
                  <div className="flex items-center justify-between mb-3 sm:mb-6 shrink-0">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 sm:h-9 sm:w-9"
                        onClick={() => setSelectedDate(addDays(selectedDate, -1))}
                      >
                        <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                      </Button>
                      <h2 className="text-sm sm:text-xl font-display font-semibold">
                        {format(selectedDate, "EEE, MMM d")}
                      </h2>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 sm:h-9 sm:w-9"
                        onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                      >
                        <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <div className="flex rounded-lg border overflow-hidden">
                        <button
                          type="button"
                          onClick={() => {
                            setDayLayout("timeline");
                            localStorage.setItem("lek-day-layout", "timeline");
                          }}
                          className={cn(
                            "px-2 py-1 text-[11px] sm:text-xs transition-colors",
                            dayLayout === "timeline"
                              ? "bg-foreground text-background"
                              : "text-muted-foreground hover:bg-muted"
                          )}
                        >
                          Timeline
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDayLayout("columns");
                            localStorage.setItem("lek-day-layout", "columns");
                          }}
                          className={cn(
                            "px-2 py-1 text-[11px] sm:text-xs transition-colors",
                            dayLayout === "columns"
                              ? "bg-foreground text-background"
                              : "text-muted-foreground hover:bg-muted"
                          )}
                        >
                          Columns
                        </button>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs sm:h-9 sm:text-sm"
                        onClick={() => setSelectedDate(new Date())}
                      >
                        Today
                      </Button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-auto">
                    <PinchZoomWrapper storageKey="lek-calendar-zoom-day">
                      {dayLayout === "columns" ? (
                        <StaffDayColumnsView
                          selectedDate={selectedDate}
                          bookings={dayBookings}
                          services={services}
                          staffList={
                            staffFilter !== "all" && staffFilter !== "unassigned"
                              ? staffList.filter((s) => s.id === staffFilter)
                              : staffList
                          }
                          onBookingClick={handleBookingClick}
                          onSlotClick={handleSlotClick}
                          loading={loading}
                          isOnLeave={isOnLeave}
                          onDragStart={handleDragStart}
                          onDragEnd={handleDragEnd}
                          onDragOver={handleDragOver}
                          onDrop={handleDrop}
                          draggingBookingId={draggingBookingId}
                        />
                      ) : (
                        <DayTimelineView
                          selectedDate={selectedDate}
                          bookings={dayBookings}
                          services={services}
                          staffList={staffList}
                          onBookingClick={handleBookingClick}
                          onSlotClick={handleSlotClick}
                          loading={loading}
                          isOnLeave={isOnLeave}
                          onDragStart={handleDragStart}
                          onDragEnd={handleDragEnd}
                          onDragOver={handleDragOver}
                          onDrop={handleDrop}
                          draggingBookingId={draggingBookingId}
                        />
                      )}
                    </PinchZoomWrapper>
                  </div>
                </div>
              )}

              {viewMode === "week" && (
                <div className="h-full overflow-auto">
                  <PinchZoomWrapper storageKey="lek-calendar-zoom-week">
                    <WeekView
                      bookings={filteredBookings}
                      services={services}
                      selectedDate={selectedDate}
                      onBookingClick={handleBookingClick}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      draggingBookingId={draggingBookingId}
                    />
                  </PinchZoomWrapper>
                </div>
              )}

              {viewMode === "kanban" && (
                <div className="h-full overflow-auto">
                  <PinchZoomWrapper storageKey="lek-calendar-zoom-kanban">
                    <KanbanView
                      bookings={filteredBookings}
                      services={services}
                      staffList={staffList}
                      onStatusChange={handleStatusChange}
                      onBookingClick={handleBookingClick}
                      loading={loading}
                    />
                  </PinchZoomWrapper>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <BookingEditDialog
        booking={editingBooking}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        services={services}
        staffList={staffList}
        onUpdate={fetchData}
      />
    </DashboardLayout>
  );
}
