import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useBusiness } from "@/contexts/BusinessContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, isSameDay, parseISO, addDays } from "date-fns";
import { BookingEditDialog } from "@/components/booking/BookingEditDialog";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

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

export default function WeekPage() {
  const { currentBusiness } = useBusiness();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7 AM to 8 PM

  useEffect(() => {
    if (currentBusiness) {
      fetchData();
    }
  }, [currentBusiness, selectedDate]);

  const fetchData = async () => {
    if (!currentBusiness) return;
    
    setLoading(true);

    const [bookingsRes, servicesRes, staffRes] = await Promise.all([
      supabase
        .from("bookings")
        .select("*")
        .eq("business_id", currentBusiness.id)
        .gte("start_time", weekStart.toISOString())
        .lte("start_time", weekEnd.toISOString())
        .order("start_time", { ascending: true }),
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
    ]);

    if (bookingsRes.data) setBookings(bookingsRes.data);
    if (servicesRes.data) setServices(servicesRes.data);
    if (staffRes.data) setStaffList(staffRes.data);
    setLoading(false);
  };

  const getBookingsForDay = (day: Date) => {
    return bookings.filter((b) => isSameDay(parseISO(b.start_time), day));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-foreground text-background";
      case "pending":
        return "bg-amber-100 text-amber-800 border border-amber-300";
      case "cancelled":
        return "bg-red-100 text-red-800 border border-red-300";
      case "completed":
        return "bg-emerald-100 text-emerald-800 border border-emerald-300";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const handleBookingClick = (booking: Booking) => {
    setEditingBooking(booking);
    setEditDialogOpen(true);
  };

  const goToPreviousWeek = () => setSelectedDate(subWeeks(selectedDate, 1));
  const goToNextWeek = () => setSelectedDate(addWeeks(selectedDate, 1));
  const goToToday = () => setSelectedDate(new Date());

  return (
    <DashboardLayout
      title="Week Schedule"
      description={`${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={goToNextWeek}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      }
    >
      <div className="h-[calc(100vh-100px)] sm:h-[calc(100vh-120px)] overflow-auto bg-card rounded-xl border">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground" />
          </div>
        ) : (
          <div className="min-w-[900px]">
            {/* Header */}
            <div className="grid grid-cols-8 border-b sticky top-0 bg-card z-10">
              <div className="p-3 text-center text-sm font-medium text-muted-foreground border-r">
                Time
              </div>
              {weekDays.map((day) => {
                const isToday = isSameDay(day, new Date());
                const dayBookings = getBookingsForDay(day);
                return (
                  <div
                    key={day.toISOString()}
                    className={`p-3 text-center border-r last:border-r-0 ${
                      isToday ? "bg-foreground text-background" : ""
                    }`}
                  >
                    <p className="text-xs font-medium uppercase">
                      {format(day, "EEE")}
                    </p>
                    <p className="text-xl font-bold">{format(day, "d")}</p>
                    {dayBookings.length > 0 && (
                      <Badge 
                        variant={isToday ? "secondary" : "outline"} 
                        className="mt-1 text-xs"
                      >
                        {dayBookings.length} booking{dayBookings.length !== 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Time Grid */}
            <div className="relative">
              {hours.map((hour) => (
                <div key={hour} className="grid grid-cols-8 border-b min-h-[70px]">
                  <div className="p-2 text-xs text-muted-foreground border-r flex items-start justify-end pr-3 font-medium">
                    {`${hour.toString().padStart(2, "0")}:00`}
                  </div>
                  {weekDays.map((day) => {
                    const dayBookings = getBookingsForDay(day).filter((b) => {
                      const bookingHour = parseISO(b.start_time).getHours();
                      return bookingHour === hour;
                    });

                    return (
                      <div
                        key={day.toISOString()}
                        className="border-r last:border-r-0 p-1 min-h-[70px] hover:bg-muted/30 transition-colors"
                      >
                        {dayBookings.map((booking) => {
                          const service = services.find(
                            (s) => s.id === booking.service_id
                          );
                          const staff = staffList.find(
                            (s) => s.id === booking.staff_id
                          );
                          return (
                            <div
                              key={booking.id}
                              onClick={() => handleBookingClick(booking)}
                              className={`p-2 rounded-lg cursor-pointer text-xs mb-1 ${getStatusColor(
                                booking.status
                              )} hover:scale-[1.02] hover:shadow-md transition-all`}
                            >
                              <div className="flex items-center gap-1 mb-1">
                                <Clock className="w-3 h-3" />
                                <span className="font-bold">
                                  {format(parseISO(booking.start_time), "HH:mm")}
                                </span>
                              </div>
                              <p className="font-semibold truncate">
                                {booking.customer_name || "Walk-in"}
                              </p>
                              {service && (
                                <p className="text-[10px] opacity-80 truncate">
                                  {service.name}
                                </p>
                              )}
                              {staff && (
                                <p className="text-[10px] opacity-70 truncate">
                                  w/ {staff.name}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
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
