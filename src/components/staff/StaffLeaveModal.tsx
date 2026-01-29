import { useState } from "react";
import { format, differenceInDays, parseISO, isAfter, isBefore, isToday } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CalendarDays,
  Plus,
  Trash2,
  Palmtree,
  Thermometer,
  User,
  HelpCircle,
  Calendar as CalendarIcon,
  Loader2,
  Clock,
  History,
} from "lucide-react";
import { useStaffLeave, StaffLeave, CreateLeaveParams } from "@/hooks/staff/useStaffLeave";
import { cn } from "@/lib/utils";

interface StaffLeaveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffId: string;
  staffName: string;
  businessId: string;
}

const LEAVE_TYPES = [
  { value: "holiday", label: "Holiday", icon: Palmtree, color: "text-emerald-600 bg-emerald-100" },
  { value: "sick", label: "Sick Leave", icon: Thermometer, color: "text-rose-600 bg-rose-100" },
  { value: "personal", label: "Personal", icon: User, color: "text-blue-600 bg-blue-100" },
  { value: "other", label: "Other", icon: HelpCircle, color: "text-gray-600 bg-gray-100" },
] as const;

export function StaffLeaveModal({
  open,
  onOpenChange,
  staffId,
  staffName,
  businessId,
}: StaffLeaveModalProps) {
  const { leaves, isLoading, createLeave, deleteLeave, getStaffLeaves, getActiveLeave, getPastLeave } = useStaffLeave(businessId);
  const [showAddForm, setShowAddForm] = useState(false);
  const [leaveType, setLeaveType] = useState<CreateLeaveParams["leave_type"]>("holiday");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [notes, setNotes] = useState("");

  const staffLeaves = getStaffLeaves(staffId);
  const activeLeaves = staffLeaves.filter(l => l.end_date >= new Date().toISOString().split("T")[0]);
  const pastLeaves = staffLeaves.filter(l => l.end_date < new Date().toISOString().split("T")[0]);

  const handleAddLeave = async () => {
    if (!startDate || !endDate) return;

    await createLeave.mutateAsync({
      staff_id: staffId,
      business_id: businessId,
      leave_type: leaveType,
      start_date: format(startDate, "yyyy-MM-dd"),
      end_date: format(endDate, "yyyy-MM-dd"),
      notes: notes || undefined,
    });

    // Reset form
    setShowAddForm(false);
    setLeaveType("holiday");
    setStartDate(undefined);
    setEndDate(undefined);
    setNotes("");
  };

  const handleDeleteLeave = async (id: string) => {
    await deleteLeave.mutateAsync(id);
  };

  const getLeaveTypeInfo = (type: string) => {
    return LEAVE_TYPES.find(t => t.value === type) || LEAVE_TYPES[3];
  };

  const getLeaveStatus = (leave: StaffLeave) => {
    const today = new Date().toISOString().split("T")[0];
    if (leave.start_date > today) return "upcoming";
    if (leave.end_date < today) return "past";
    return "active";
  };

  const formatDateRange = (start: string, end: string) => {
    const startDate = parseISO(start);
    const endDate = parseISO(end);
    const days = differenceInDays(endDate, startDate) + 1;
    
    if (start === end) {
      return `${format(startDate, "d MMM yyyy")} (1 day)`;
    }
    return `${format(startDate, "d MMM")} - ${format(endDate, "d MMM yyyy")} (${days} days)`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Manage Leave - {staffName}
          </DialogTitle>
          <DialogDescription>
            Schedule holidays, sick leave, and time off
          </DialogDescription>
        </DialogHeader>

        {showAddForm ? (
          <div className="space-y-4 py-2">
            {/* Leave Type */}
            <div className="space-y-2">
              <Label>Leave Type</Label>
              <Select value={leaveType} onValueChange={(v) => setLeaveType(v as CreateLeaveParams["leave_type"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAVE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "d MMM yyyy") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => {
                        setStartDate(date);
                        if (date && (!endDate || isBefore(endDate, date))) {
                          setEndDate(date);
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "d MMM yyyy") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      disabled={(date) => startDate ? isBefore(date, startDate) : false}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Duration preview */}
            {startDate && endDate && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  {differenceInDays(endDate, startDate) + 1} day(s) of leave
                </AlertDescription>
              </Alert>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this leave..."
                rows={2}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddLeave}
                disabled={!startDate || !endDate || createLeave.isPending}
              >
                {createLeave.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Leave"
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <Tabs defaultValue="upcoming" className="flex-1 flex flex-col min-h-0">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upcoming" className="gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Upcoming ({activeLeaves.length})
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2">
                  <History className="h-4 w-4" />
                  History ({pastLeaves.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upcoming" className="flex-1 mt-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : activeLeaves.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                    <Palmtree className="h-10 w-10 mb-2 opacity-50" />
                    <p className="font-medium">No upcoming leave</p>
                    <p className="text-sm">Add holidays or time off below</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[250px]">
                    <div className="space-y-3 pr-4">
                      {activeLeaves.map((leave) => {
                        const typeInfo = getLeaveTypeInfo(leave.leave_type);
                        const status = getLeaveStatus(leave);
                        const TypeIcon = typeInfo.icon;

                        return (
                          <div
                            key={leave.id}
                            className="flex items-start justify-between p-3 border rounded-lg"
                          >
                            <div className="flex items-start gap-3">
                              <div className={cn("p-2 rounded-lg", typeInfo.color)}>
                                <TypeIcon className="h-4 w-4" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{typeInfo.label}</span>
                                  {status === "active" && (
                                    <Badge variant="default" className="text-xs">Currently Away</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {formatDateRange(leave.start_date, leave.end_date)}
                                </p>
                                {leave.notes && (
                                  <p className="text-xs text-muted-foreground mt-1">{leave.notes}</p>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteLeave(leave.id)}
                              disabled={deleteLeave.isPending}
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>

              <TabsContent value="history" className="flex-1 mt-4">
                {pastLeaves.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                    <History className="h-10 w-10 mb-2 opacity-50" />
                    <p className="font-medium">No leave history</p>
                    <p className="text-sm">Past leave will appear here</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[250px]">
                    <div className="space-y-3 pr-4">
                      {pastLeaves.map((leave) => {
                        const typeInfo = getLeaveTypeInfo(leave.leave_type);
                        const TypeIcon = typeInfo.icon;

                        return (
                          <div
                            key={leave.id}
                            className="flex items-start justify-between p-3 border rounded-lg opacity-60"
                          >
                            <div className="flex items-start gap-3">
                              <div className={cn("p-2 rounded-lg", typeInfo.color)}>
                                <TypeIcon className="h-4 w-4" />
                              </div>
                              <div>
                                <span className="font-medium">{typeInfo.label}</span>
                                <p className="text-sm text-muted-foreground">
                                  {formatDateRange(leave.start_date, leave.end_date)}
                                </p>
                                {leave.notes && (
                                  <p className="text-xs text-muted-foreground mt-1">{leave.notes}</p>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteLeave(leave.id)}
                              disabled={deleteLeave.isPending}
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button onClick={() => setShowAddForm(true)} className="w-full gap-2">
                <Plus className="h-4 w-4" />
                Add Leave
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
