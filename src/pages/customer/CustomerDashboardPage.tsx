import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock, LogOut, User } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

interface Booking {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  customer_name: string | null;
  notes: string | null;
  services?: { name: string } | null;
  staff?: { name: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-green-100 text-green-800",
  completed: "bg-gray-100 text-gray-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function CustomerDashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ email: string; full_name?: string } | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/customer-portal");
        return;
      }
      setUser({
        email: session.user.email ?? "",
        full_name: session.user.user_metadata?.full_name,
      });

      // Fetch bookings for this customer by email
      const { data, error } = await supabase
        .from("bookings")
        .select("id, start_time, end_time, status, customer_name, notes, services(name), staff(name)")
        .eq("customer_email", session.user.email)
        .order("start_time", { ascending: false })
        .limit(50);

      if (!error && data) {
        setBookings(data as unknown as Booking[]);
      }
      setLoading(false);
    };
    init();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/customer-portal");
    toast.success("Signed out successfully");
  };

  const upcoming = bookings.filter(b => new Date(b.start_time) >= new Date() && b.status !== "cancelled");
  const past = bookings.filter(b => new Date(b.start_time) < new Date() || b.status === "cancelled");

  const BookingCard = ({ booking }: { booking: Booking }) => (
    <div className="flex items-start justify-between p-4 border border-border rounded-lg">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <CalendarDays className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium text-sm">
            {(booking.services as any)?.name ?? "Appointment"}
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <Clock className="w-3 h-3" />
            {format(parseISO(booking.start_time), "EEE d MMM yyyy, h:mm a")}
          </p>
          {(booking.staff as any)?.name && (
            <p className="text-xs text-muted-foreground mt-0.5">
              with {(booking.staff as any).name}
            </p>
          )}
        </div>
      </div>
      <Badge className={`text-xs capitalize ${STATUS_COLORS[booking.status] ?? "bg-muted text-muted-foreground"}`} variant="outline">
        {booking.status}
      </Badge>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
              <span className="text-background font-display font-bold text-sm">L</span>
            </div>
            <span className="font-display font-bold">LEK</span>
            <span className="text-muted-foreground text-sm hidden sm:block">/ Customer Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              {user?.full_name ?? user?.email}
            </div>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-6 py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-display font-semibold">
            Hello, {user?.full_name?.split(" ")[0] ?? "there"} 👋
          </h1>
          <p className="text-muted-foreground mt-1">Here are your bookings</p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Upcoming */}
            <Card className="border border-border shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" />
                  Upcoming Appointments
                  {upcoming.length > 0 && (
                    <Badge variant="secondary" className="ml-auto">{upcoming.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcoming.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No upcoming appointments
                  </p>
                ) : (
                  upcoming.map(b => <BookingCard key={b.id} booking={b} />)
                )}
              </CardContent>
            </Card>

            {/* Past */}
            {past.length > 0 && (
              <Card className="border border-border shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Past Appointments
                    <Badge variant="secondary" className="ml-auto">{past.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {past.map(b => <BookingCard key={b.id} booking={b} />)}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
