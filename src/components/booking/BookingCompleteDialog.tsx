import { useState, useEffect } from "react";
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
import { CheckCircle, DollarSign, Edit2 } from "lucide-react";

interface BookingCompleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  customerName: string;
  serviceName: string;
  defaultPrice: number;
  onConfirm: (revenueAmount: number) => void;
}

export function BookingCompleteDialog({
  open,
  onOpenChange,
  customerName,
  serviceName,
  defaultPrice,
  onConfirm,
}: BookingCompleteDialogProps) {
  const [revenueAmount, setRevenueAmount] = useState(defaultPrice);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setRevenueAmount(defaultPrice);
    setIsEditing(false);
  }, [defaultPrice, open]);

  const handleConfirm = () => {
    onConfirm(revenueAmount);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-primary" />
            Complete Booking
          </DialogTitle>
          <DialogDescription>
            Mark this booking as completed and add revenue
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-3 rounded-lg bg-muted/50 space-y-1">
            <p className="font-medium">{customerName}</p>
            <p className="text-sm text-muted-foreground">{serviceName}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="revenue" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Revenue Amount
              </Label>
              {!isEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit2 className="w-3 h-3 mr-1" />
                  Edit
                </Button>
              )}
            </div>
            {isEditing ? (
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="revenue"
                  type="number"
                  min={0}
                  step={0.01}
                  value={revenueAmount}
                  onChange={(e) => setRevenueAmount(parseFloat(e.target.value) || 0)}
                  className="pl-7"
                  autoFocus
                />
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
                <span className="text-lg font-semibold">${revenueAmount.toFixed(2)}</span>
                <span className="text-xs text-muted-foreground">
                  {revenueAmount === defaultPrice ? "Service price" : "Custom amount"}
                </span>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              This amount will be added to your revenue tracker
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} className="gradient-primary">
            <CheckCircle className="w-4 h-4 mr-2" />
            Complete & Add Revenue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
