import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface PrivacyLockOverlayProps {
  label?: string;
  className?: string;
}

export function PrivacyLockOverlay({ 
  label = "Private", 
  className 
}: PrivacyLockOverlayProps) {
  return (
    <div 
      className={cn(
        "absolute inset-0 z-10 flex flex-col items-center justify-center",
        "bg-background/80 backdrop-blur-sm rounded-lg",
        className
      )}
    >
      <div className="p-3 rounded-full bg-muted/80 mb-2">
        <Lock className="w-5 h-5 text-muted-foreground" />
      </div>
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
    </div>
  );
}
