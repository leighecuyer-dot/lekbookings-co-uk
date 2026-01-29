import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CalendarDays, Sparkles, MessageSquare, Send, History, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  format, 
  parseISO, 
  addMinutes,
  isSameDay,
  isToday,
  isBefore
} from "date-fns";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { AiSuggestionsHistory } from "./AiSuggestionsHistory";

export interface AvailabilityContext {
  daysWithOpenings: Array<{
    dayName: string;
    date: string;
    availableSlots: number;
  }>;
  totalAvailable: number;
}

interface AvailableSlotsTileProps {
  businessId: string;
  businessName?: string;
  onSendCampaign?: (type: "sms" | "whatsapp" | "email", context: AvailabilityContext) => void;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

interface DaySlots {
  date: Date;
  dayName: string;
  totalSlots: number;
  bookedSlots: number;
  availableSlots: number;
  timeSlots: TimeSlot[];
}

interface WorkingHours {
  [key: string]: { start: string; end: string } | undefined;
}

const SLOT_DURATION_MINUTES = 30;

export function AvailableSlotsTile({ businessId, businessName, onSendCampaign }: AvailableSlotsTileProps) {
  const navigate = useNavigate();
  const [daySlots, setDaySlots] = useState<DaySlots[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [currentSuggestionId, setCurrentSuggestionId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const handleDayClick = (date: Date) => {
    const dateParam = format(date, "yyyy-MM-dd");
    navigate(`/calendar?date=${dateParam}`);
  };

  const handleAiSuggestions = async () => {
    setAiDialogOpen(true);
    setAiLoading(true);
    setAiSuggestion(null);
    setCurrentSuggestionId(null);

    try {
      const availabilityData = daySlots.map(day => ({
        dayName: format(day.date, "EEEE"),
        date: format(day.date, "MMM d"),
        totalSlots: day.totalSlots,
        bookedSlots: day.bookedSlots,
        availableSlots: day.availableSlots,
      }));

      const { data, error } = await supabase.functions.invoke("suggest-slot-filling", {
        body: { availabilityData, businessName },
      });

      if (error) throw error;

      if (data?.error) {
        if (data.error.includes("Rate limit")) {
          toast.error("Too many requests. Please try again in a moment.");
        } else if (data.error.includes("credits")) {
          toast.error("AI credits exhausted. Please add credits to continue.");
        } else {
          toast.error(data.error);
        }
        setAiDialogOpen(false);
        return;
      }

      const suggestionText = data?.suggestion || "No suggestions available.";
      setAiSuggestion(suggestionText);

      // Save suggestion to database
      const { data: savedSuggestion, error: saveError } = await supabase
        .from("ai_suggestions")
        .insert({
          business_id: businessId,
          suggestion_text: suggestionText,
          availability_snapshot: { availabilityData },
        })
        .select("id")
        .single();

      if (saveError) {
        console.error("Error saving suggestion:", saveError);
      } else {
        setCurrentSuggestionId(savedSuggestion.id);
      }
    } catch (error) {
      console.error("Error getting AI suggestions:", error);
      toast.error("Failed to get AI suggestions. Please try again.");
      setAiDialogOpen(false);
    } finally {
      setAiLoading(false);
    }
  };

  const handleCampaignSent = async (type: "sms" | "whatsapp" | "email") => {
    if (currentSuggestionId) {
      await supabase
        .from("ai_suggestions")
        .update({ 
          campaign_sent: true,
          campaign_type: type 
        })
        .eq("id", currentSuggestionId);
    }
    setAiDialogOpen(false);
    
    // Build availability context from current daySlots
    const context: AvailabilityContext = {
      daysWithOpenings: daySlots
        .filter(d => d.availableSlots > 0)
        .map(d => ({
          dayName: d.dayName,
          date: format(d.date, "yyyy-MM-dd"),
          availableSlots: d.availableSlots,
        })),
      totalAvailable: daySlots.reduce((sum, d) => sum + d.availableSlots, 0),
    };
    
    onSendCampaign?.(type, context);
  };

  useEffect(() => {
    const calculateSlots = async () => {
      if (!businessId) return;
      
      setLoading(true);
      
      try {
        const now = new Date();
        const weekStart = startOfWeek(now, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
        
        const [staffResult, bookingsResult] = await Promise.all([
          supabase
            .from("staff")
            .select("id, working_hours")
            .eq("business_id", businessId)
            .eq("is_active", true),
          supabase
            .from("bookings")
            .select("start_time, end_time, staff_id")
            .eq("business_id", businessId)
            .gte("start_time", weekStart.toISOString())
            .lte("start_time", weekEnd.toISOString())
            .neq("status", "cancelled"),
        ]);

        if (staffResult.error) throw staffResult.error;
        if (bookingsResult.error) throw bookingsResult.error;

        const staff = staffResult.data || [];
        const bookings = bookingsResult.data || [];
        
        const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
        
        const slotsPerDay: DaySlots[] = days.map(date => {
          const dayName = format(date, "EEEE").toLowerCase();
          const shortDayName = format(date, "EEE");
          
          let totalSlots = 0;
          let bookedSlots = 0;
          const allTimeSlots: Map<string, { time: Date; available: boolean }> = new Map();
          
          staff.forEach(member => {
            const workingHours = member.working_hours as WorkingHours | null;
            const dayHours = workingHours?.[dayName];
            
            if (dayHours?.start && dayHours?.end) {
              const [startHour, startMin] = dayHours.start.split(":").map(Number);
              const [endHour, endMin] = dayHours.end.split(":").map(Number);
              
              const dayStart = new Date(date);
              dayStart.setHours(startHour, startMin, 0, 0);
              
              const dayEnd = new Date(date);
              dayEnd.setHours(endHour, endMin, 0, 0);
              
              let currentSlot = dayStart;
              while (isBefore(currentSlot, dayEnd)) {
                const slotKey = format(currentSlot, "HH:mm");
                const isPast = isToday(date) && isBefore(currentSlot, now);
                
                if (!isPast) {
                  if (!allTimeSlots.has(slotKey)) {
                    allTimeSlots.set(slotKey, { time: new Date(currentSlot), available: true });
                  }
                  totalSlots++;
                }
                currentSlot = addMinutes(currentSlot, SLOT_DURATION_MINUTES);
              }
            }
          });
          
          bookings.forEach(booking => {
            const bookingStart = parseISO(booking.start_time);
            if (isSameDay(bookingStart, date)) {
              const bookingEnd = parseISO(booking.end_time);
              let slotTime = new Date(bookingStart);
              
              while (isBefore(slotTime, bookingEnd)) {
                const slotKey = format(slotTime, "HH:mm");
                if (allTimeSlots.has(slotKey)) {
                  allTimeSlots.set(slotKey, { time: slotTime, available: false });
                }
                slotTime = addMinutes(slotTime, SLOT_DURATION_MINUTES);
                bookedSlots++;
              }
            }
          });
          
          const timeSlots: TimeSlot[] = Array.from(allTimeSlots.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([time, data]) => ({
              time,
              available: data.available,
            }));
          
          return {
            date,
            dayName: shortDayName,
            totalSlots,
            bookedSlots: Math.min(bookedSlots, totalSlots),
            availableSlots: Math.max(0, totalSlots - bookedSlots),
            timeSlots,
          };
        });
        
        setDaySlots(slotsPerDay);
      } catch (error) {
        console.error("Error calculating available slots:", error);
      } finally {
        setLoading(false);
      }
    };
    
    calculateSlots();
  }, [businessId]);

  const getSlotStatus = (day: DaySlots) => {
    if (day.totalSlots === 0) return "closed";
    const fillRate = day.bookedSlots / day.totalSlots;
    if (fillRate >= 0.8) return "full";
    if (fillRate >= 0.5) return "moderate";
    return "available";
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "full":
        return "bg-emerald-500/20 text-emerald-600 border-emerald-500/30";
      case "moderate":
        return "bg-amber-500/20 text-amber-600 border-amber-500/30";
      case "available":
        return "bg-rose-500/20 text-rose-600 border-rose-500/30";
      case "closed":
        return "bg-muted text-muted-foreground border-muted";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-soft">
        <CardContent className="p-6 flex items-center justify-center min-h-[140px]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const totalAvailable = daySlots.reduce((sum, day) => sum + day.availableSlots, 0);
  const totalBooked = daySlots.reduce((sum, day) => sum + day.bookedSlots, 0);
  const totalSlots = totalAvailable + totalBooked;
  const fillRate = totalSlots > 0 ? (totalBooked / totalSlots) * 100 : 0;
  const showAiButton = fillRate < 70; // Show AI button when less than 70% filled

  return (
    <>
      <Card className="border-0 shadow-soft">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              Week Availability
            </span>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setHistoryOpen(true)}
                  >
                    <History className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  View past AI suggestions
                </TooltipContent>
              </Tooltip>
              {showAiButton && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs gap-1 text-primary hover:text-primary"
                      onClick={handleAiSuggestions}
                    >
                      <Sparkles className="h-3 w-3" />
                      Ideas
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Get AI suggestions to fill empty slots
                  </TooltipContent>
                </Tooltip>
              )}
              <Badge variant="outline" className="font-normal">
                {totalAvailable} open
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-7 gap-1">
            {daySlots.map((day) => {
              const status = getSlotStatus(day);
              const isPast = isBefore(day.date, new Date()) && !isToday(day.date);
              const availableTimeSlots = day.timeSlots.filter(s => s.available);
              
              return (
                <Tooltip key={day.dayName}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleDayClick(day.date)}
                      className={cn(
                        "flex flex-col items-center p-1.5 rounded-lg border text-center transition-all hover:scale-105 hover:shadow-md cursor-pointer",
                        isPast ? "opacity-40" : "",
                        isToday(day.date) ? "ring-1 ring-primary" : "",
                        getStatusStyles(status)
                      )}
                    >
                      <span className="text-[10px] font-medium uppercase">
                        {day.dayName}
                      </span>
                      <span className="text-lg font-bold leading-tight">
                        {day.availableSlots}
                      </span>
                      <span className="text-[9px] opacity-70">
                        {status === "closed" ? "off" : "slots"}
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[200px]">
                    <div className="space-y-1">
                      <p className="font-medium text-xs">
                        {format(day.date, "EEEE, MMM d")}
                      </p>
                      {status === "closed" ? (
                        <p className="text-xs text-muted-foreground">Closed</p>
                      ) : availableTimeSlots.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Fully booked</p>
                      ) : (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {availableTimeSlots.slice(0, 8).map((slot) => (
                            <span
                              key={slot.time}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary"
                            >
                              {slot.time}
                            </span>
                          ))}
                          {availableTimeSlots.length > 8 && (
                            <span className="text-[10px] text-muted-foreground">
                              +{availableTimeSlots.length - 8} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Needs filling
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Moderate
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Busy
              </span>
            </div>
            <span>{totalBooked} booked</span>
          </div>
        </CardContent>
      </Card>

      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Suggestions
            </DialogTitle>
          </DialogHeader>
          {aiLoading ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Analyzing your availability...</p>
            </div>
          ) : (
            <>
              <ScrollArea className="max-h-[350px]">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{aiSuggestion || ""}</ReactMarkdown>
                </div>
              </ScrollArea>
              
              {onSendCampaign && (
                <div className="pt-4 border-t mt-4">
                  <p className="text-xs text-muted-foreground mb-3">
                    Ready to act on these suggestions?
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => handleCampaignSent("email")}
                    >
                      <Mail className="h-4 w-4" />
                      Email
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => handleCampaignSent("sms")}
                    >
                      <MessageSquare className="h-4 w-4" />
                      SMS
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1.5"
                      onClick={() => handleCampaignSent("whatsapp")}
                    >
                      <Send className="h-4 w-4" />
                      WhatsApp
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <AiSuggestionsHistory 
        businessId={businessId}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
      />
    </>
  );
}
