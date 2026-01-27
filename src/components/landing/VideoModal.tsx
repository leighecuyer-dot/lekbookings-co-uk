import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Play } from "lucide-react";

interface VideoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VideoModal({ open, onOpenChange }: VideoModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl p-0 overflow-hidden bg-background border-2 border-foreground">
        <div className="aspect-video bg-muted flex items-center justify-center">
          {/* Placeholder - replace with actual video embed */}
          <div className="text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-foreground/10 flex items-center justify-center mx-auto">
              <Play className="w-10 h-10 text-foreground" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Video Demo Coming Soon</h3>
              <p className="text-muted-foreground text-sm max-w-md mx-auto px-4">
                See how LEK helps salons manage bookings, staff schedules, and customer relationships—all in one place.
              </p>
            </div>
          </div>
          
          {/* Uncomment and add your video URL when ready:
          <iframe
            className="w-full h-full"
            src="https://www.youtube.com/embed/YOUR_VIDEO_ID"
            title="LEK Demo Video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
          */}
        </div>
      </DialogContent>
    </Dialog>
  );
}
