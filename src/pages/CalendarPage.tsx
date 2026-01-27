import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useBusiness } from "@/contexts/BusinessContext";
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
import { Plus, Clock, User, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfDay, endOfDay, addDays, isSameDay, parseISO } from "date-fns";
import { BookingEditDialog } from "@/components/booking/BookingEditDialog";

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
}

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  color: string | null;
}

interface Staff {
  id: string;
  name: string;
}

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export default function CalendarPage() {
  const { currentBusiness } = useBusiness();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
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
  });

  useEffect(() => {
    if (currentBusiness) {
      fetchData();
    }
  }, [currentBusiness, selectedDate]);

  const fetchData = async () => {
    if (!currentBusiness) return;
    
    setLoading(true);
    const dayStart = startOfDay(selectedDate).toISOString();
    const dayEnd = endOfDay(selectedDate).toISOString();

    const [bookingsRes, servicesRes, staffRes, customersRes] = await Promise.all([
      supabase
        .from("bookings")
        .select("*")
        .eq("business_id", currentBusiness.id)
        .gte("start_time", dayStart)
        .lte("start_time", dayEnd)
        .order("start_time", { ascending: true }),
      supabase
        .from("services")
        .select("id, name, duration_minutes, color")
        .eq("business_id", currentBusiness.id)
        .eq("is_active", true),
      supabase
        .from("staff")
        .select("id, name")
        .eq("business_id", currentBusiness.id)
        .eq("is_active", true),
      supabase
        .from("customers")
        .select("id, name, email, phone")
        .eq("business_id", currentBusiness.id)
        .order("name", { ascending: true }),
    ]);

    if (bookingsRes.data) setBookings(bookingsRes.data);
    if (servicesRes.data) setServices(servicesRes.data);
    if (staffRes.data) setStaffList(staffRes.data);
    if (customersRes.data) setCustomers(customersRes.data);
    setLoading(false);
  };

  const handleCreateBooking = async () => {
    if (!currentBusiness || !newBooking.customerName) {
      toast.error("Please fill in customer name");
      return;
    }

    const service = services.find((s) => s.id === newBooking.serviceId);
    const durationMinutes = service?.duration_minutes || 30;

    const startTime = new Date(selectedDate);
    const [hours, minutes] = newBooking.time.split(":").map(Number);
    startTime.setHours(hours, minutes, 0, 0);

    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + durationMinutes);

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

    if (error) {
      toast.error("Failed to create booking");
      return;
    }

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
    });
    fetchData();
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
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Booking</DialogTitle>
              <DialogDescription>
                Add a new appointment for {format(selectedDate, "MMMM d, yyyy")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
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
              <Button onClick={handleCreateBooking} className="w-full gradient-primary">
                Create Booking
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Calendar Sidebar */}
        <Card className="border-0 shadow-soft h-fit">
          <CardContent className="p-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md"
            />
          </CardContent>
        </Card>

        {/* Day View */}
        <Card className="border-0 shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSelectedDate(addDays(selectedDate, -1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <h2 className="text-xl font-display font-semibold">
                  {format(selectedDate, "EEEE, MMMM d, yyyy")}
                </h2>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(new Date())}
              >
                Today
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading...
              </div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  No bookings for this day
                </p>
                <Button onClick={() => setDialogOpen(true)} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Booking
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {bookings.map((booking) => {
                  const service = services.find((s) => s.id === booking.service_id);
                  const staff = staffList.find((s) => s.id === booking.staff_id);
                  
                  return (
                    <div
                      key={booking.id}
                      onClick={() => {
                        setEditingBooking(booking);
                        setEditDialogOpen(true);
                      }}
                      className="flex items-start gap-4 p-4 rounded-2xl bg-foreground text-background cursor-pointer hover:scale-[1.01] transition-transform"
                    >
                      <div className="text-center min-w-[60px]">
                        <p className="text-lg font-semibold">
                          {format(parseISO(booking.start_time), "HH:mm")}
                        </p>
                        <p className="text-xs text-background/60">
                          {format(parseISO(booking.end_time), "HH:mm")}
                        </p>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">{booking.customer_name}</p>
                          <Badge className={getStatusColor(booking.status)}>
                            {booking.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-background/70">
                          {service?.name || "No service"}
                        </p>
                        {staff && (
                          <p className="text-xs text-background/60 flex items-center gap-1 mt-1">
                            <User className="w-3 h-3" />
                            {staff.name}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
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
