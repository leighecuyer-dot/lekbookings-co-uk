import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PrivacyLockOverlayProps {
  label?: string;
  className?: string;
  tooltipText?: string;
  settingsLink?: string;
}

export function PrivacyLockOverlay({ 
  label = "Private", 
  className,
  tooltipText = "This data is hidden by the business owner's privacy settings.",
  settingsLink,
}: PrivacyLockOverlayProps) {
  return (
    <div 
      className={cn(
        "absolute inset-0 z-10 flex flex-col items-center justify-center",
        "bg-background/80 backdrop-blur-sm rounded-lg",
        className
      )}
    >
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="p-3 rounded-full bg-muted/80 mb-2 cursor-help">
              <Lock className="w-5 h-5 text-muted-foreground" />
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-[220px] text-center">
            <p className="text-xs">{tooltipText}</p>
            {settingsLink && (
              <Link 
                to={settingsLink} 
                className="text-xs text-primary hover:underline mt-1 inline-block"
              >
                View privacy settings →
              </Link>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
    </div>
  );
}
