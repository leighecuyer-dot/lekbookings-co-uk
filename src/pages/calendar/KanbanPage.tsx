import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useBusiness } from "@/contexts/BusinessContext";
import { useResellerOperations } from "@/hooks/reseller";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
import { Plus } from "lucide-react";
import { isValidEmail } from "@/lib/validation";

import { BookingEditDialog } from "@/components/booking/BookingEditDialog";
import { KanbanView } from "@/components/calendar/KanbanView";
import { StatusFilter } from "@/components/calendar/StatusFilter";

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

export default function KanbanPage() {
  const { currentBusiness, isResellerMode } = useBusiness();
  const { createBooking: resellerCreateBooking } = useResellerOperations();
  const [selectedDate] = useState<Date>(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  
  const [newBooking, setNewBooking] = useState({
    customerId: "",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    serviceId: "",
    staffId: "",
    date: new Date().toISOString().split("T")[0],
    time: "09:00",
    notes: "",
  });

  const timeSlots = Array.from({ length: 20 }, (_, i) => {
    const hour = Math.floor(i / 2) + 8;
    const minute = i % 2 === 0 ? "00" : "30";
    return `${hour.toString().padStart(2, "0")}:${minute}`;
  });

  useEffect(() => {
    if (currentBusiness) {
      fetchData();
    }
  }, [currentBusiness]);

  const fetchData = async () => {
    if (!currentBusiness) return;
    
    setLoading(true);

    const [bookingsRes, servicesRes, staffRes, customersRes] = await Promise.all([
      supabase
        .from("bookings")
        .select("*")
        .eq("business_id", currentBusiness.id)
        .order("start_time", { ascending: false }),
      supabase
        .from("services")
        .select("id, name, duration_minutes, color, price")
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

    if (newBooking.customerEmail && !isValidEmail(newBooking.customerEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    const service = services.find((s) => s.id === newBooking.serviceId);
    const durationMinutes = service?.duration_minutes || 30;

    const startTime = new Date(newBooking.date);
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
        status: "pending",
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
        date: new Date().toISOString().split("T")[0],
        time: "09:00",
        notes: "",
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

  const filteredBookings = statusFilter.length === 0
    ? bookings
    : bookings.filter((b) => statusFilter.includes(b.status));

  const handleStatusChange = async (bookingId: string, newStatus: string) => {
    const { error } = await supabase
      .from("bookings")
      .update({ status: newStatus })
      .eq("id", bookingId);
    
    if (error) {
      toast.error("Failed to update status");
      return;
    }

    toast.success("Status updated");
    fetchData();
  };

  const handleBookingClick = (booking: Booking) => {
    setEditingBooking(booking);
    setEditDialogOpen(true);
  };

  return (
    <DashboardLayout
      title="Booking Board"
      description="Manage your bookings by status"
      actions={
        <div className="flex items-center gap-4">
          <StatusFilter
            selectedStatuses={statusFilter}
            onStatusChange={setStatusFilter}
          />
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
                  Add a new appointment
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
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      min={new Date().toISOString().split("T")[0]}
                      value={newBooking.date}
                      onChange={(e) => setNewBooking({ ...newBooking, date: e.target.value })}
                    />
                  </div>
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
                        <SelectValue placeholder="Any" />
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
        </div>
      }
    >
      <div className="h-[calc(100vh-140px)] sm:h-[calc(100vh-160px)]">
        <KanbanView
          bookings={filteredBookings}
          services={services}
          staffList={staffList}
          onBookingClick={handleBookingClick}
          onStatusChange={handleStatusChange}
          loading={loading}
        />
      </div>

      {editingBooking && (
        <BookingEditDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          booking={editingBooking}
          services={services}
          staffList={staffList}
          onUpdate={fetchData}
        />
      )}
    </DashboardLayout>
  );
}
