import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight, Users, Share2, X, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { SetupServiceModal } from "./SetupServiceModal";
import { SetupStaffModal } from "./SetupStaffModal";
import { useBusiness } from "@/contexts/BusinessContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getIndustryIcon } from "@/lib/industryIcons";

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  action: "services" | "staff" | "share";
  href?: string;
}

function useChecklistItems(): ChecklistItem[] {
  const { currentBusiness } = useBusiness();
  
  return useMemo(() => {
    const ServiceIcon = getIndustryIcon(currentBusiness?.industry);
    
    return [
      {
        id: "services",
        label: "Add your services",
        description: "Set up the treatments you offer",
        icon: ServiceIcon,
        action: "services",
      },
      {
        id: "staff",
        label: "Add a team member",
        description: "Add yourself or your first stylist",
        icon: Users,
        action: "staff",
      },
      {
        id: "share",
        label: "Share your booking page",
        description: "Get your shareable booking link",
        icon: Share2,
        action: "share",
        href: "/settings",
      },
    ];
  }, [currentBusiness?.industry]);
}

interface SetupChecklistProps {
  hasServices: boolean;
  hasStaff: boolean;
  onRefresh: () => void;
}

export function SetupChecklist({ hasServices, hasStaff, onRefresh }: SetupChecklistProps) {
  const { currentBusiness } = useBusiness();
  const checklistItems = useChecklistItems();
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [linkShared, setLinkShared] = useState(false);

  // Check localStorage for dismissed state and link shared state
  useEffect(() => {
    if (currentBusiness) {
      const dismissedKey = `setup_checklist_dismissed_${currentBusiness.id}`;
      const sharedKey = `setup_checklist_shared_${currentBusiness.id}`;
      setDismissed(localStorage.getItem(dismissedKey) === "true");
      setLinkShared(localStorage.getItem(sharedKey) === "true");
    }
  }, [currentBusiness]);

  // Auto-show service modal for brand new businesses (no services and not dismissed)
  useEffect(() => {
    if (currentBusiness && !hasServices && !dismissed) {
      const hasSeenSetup = localStorage.getItem(`setup_shown_${currentBusiness.id}`);
      if (!hasSeenSetup) {
        // Small delay to let the page load first
        const timer = setTimeout(() => {
          setServiceModalOpen(true);
          localStorage.setItem(`setup_shown_${currentBusiness.id}`, "true");
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [currentBusiness, hasServices, dismissed]);

  const handleDismiss = () => {
    if (currentBusiness) {
      localStorage.setItem(`setup_checklist_dismissed_${currentBusiness.id}`, "true");
      setDismissed(true);
    }
  };

  const handleCopyLink = () => {
    if (!currentBusiness) return;
    
    const bookingUrl = `${window.location.origin}/book/${currentBusiness.slug}`;
    navigator.clipboard.writeText(bookingUrl);
    toast.success("Booking link copied to clipboard!");
    
    if (currentBusiness) {
      localStorage.setItem(`setup_checklist_shared_${currentBusiness.id}`, "true");
      setLinkShared(true);
    }
  };

  const handleItemClick = (item: ChecklistItem) => {
    switch (item.action) {
      case "services":
        setServiceModalOpen(true);
        break;
      case "staff":
        setStaffModalOpen(true);
        break;
      case "share":
        handleCopyLink();
        break;
    }
  };

  const getItemCompleted = (item: ChecklistItem) => {
    switch (item.id) {
      case "services":
        return hasServices;
      case "staff":
        return hasStaff;
      case "share":
        return linkShared;
      default:
        return false;
    }
  };

  const completedCount = [hasServices, hasStaff, linkShared].filter(Boolean).length;
  const allComplete = completedCount === checklistItems.length;

  // Don't show if dismissed or all complete
  if (dismissed || allComplete) {
    return null;
  }

  return (
    <>
      <Card className="border-0 shadow-soft gradient-primary text-white relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 text-white/60 hover:text-white hover:bg-white/10"
          onClick={handleDismiss}
        >
          <X className="w-4 h-4" />
        </Button>
        
        <CardHeader>
          <CardTitle className="text-lg font-display text-white">
            Getting Started
          </CardTitle>
          <CardDescription className="text-white/80">
            Complete these steps to set up your salon ({completedCount}/{checklistItems.length})
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {checklistItems.map((item) => {
            const completed = getItemCompleted(item);
            const Icon = item.icon;
            
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                disabled={completed}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                  completed
                    ? "bg-white/5 opacity-60 cursor-default"
                    : "bg-white/10 hover:bg-white/20 cursor-pointer"
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  completed ? "bg-green-500" : "bg-white/20"
                }`}>
                  {completed ? (
                    <Check className="w-4 h-4 text-white" />
                  ) : (
                    <Icon className="w-4 h-4 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium ${completed ? "line-through" : ""}`}>
                    {item.label}
                  </p>
                  <p className="text-xs text-white/60 truncate">
                    {item.description}
                  </p>
                </div>
                {!completed && <ArrowRight className="w-4 h-4" />}
              </button>
            );
          })}
        </CardContent>
      </Card>

      {currentBusiness && (
        <>
          <SetupServiceModal
            open={serviceModalOpen}
            onOpenChange={setServiceModalOpen}
            businessId={currentBusiness.id}
            onComplete={() => {
              onRefresh();
              // Auto-open staff modal after services are added
              setTimeout(() => setStaffModalOpen(true), 300);
            }}
          />
          <SetupStaffModal
            open={staffModalOpen}
            onOpenChange={setStaffModalOpen}
            businessId={currentBusiness.id}
            onComplete={onRefresh}
          />
        </>
      )}
    </>
  );
}
