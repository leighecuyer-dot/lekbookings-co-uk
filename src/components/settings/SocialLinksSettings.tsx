import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useBusiness } from "@/contexts/BusinessContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Instagram, Facebook, Music2, MessageCircle } from "lucide-react";

interface SocialLinks {
  instagram: string;
  facebook: string;
  tiktok: string;
  whatsapp: string;
}

const DEFAULT_LINKS: SocialLinks = {
  instagram: "",
  facebook: "",
  tiktok: "",
  whatsapp: "",
};

export function SocialLinksSettings() {
  const { currentBusiness, refreshBusinesses } = useBusiness();
  const [loading, setLoading] = useState(false);
  const [links, setLinks] = useState<SocialLinks>(DEFAULT_LINKS);

  useEffect(() => {
    if (currentBusiness?.settings) {
      const settings = currentBusiness.settings as Record<string, unknown>;
      const socialLinks = settings.socialLinks as SocialLinks | undefined;
      if (socialLinks) {
        setLinks({ ...DEFAULT_LINKS, ...socialLinks });
      }
    }
  }, [currentBusiness]);

  const handleSave = async () => {
    if (!currentBusiness) return;
    
    setLoading(true);
    const existingSettings = (currentBusiness.settings as Record<string, unknown>) || {};
    
    const newSettings = {
      ...existingSettings,
      socialLinks: links,
    };
    
    const { error } = await supabase
      .from("businesses")
      .update({
        settings: newSettings as unknown as null,
      })
      .eq("id", currentBusiness.id);

    if (error) {
      toast.error("Failed to save social links");
    } else {
      toast.success("Social links saved!");
      refreshBusinesses();
    }
    setLoading(false);
  };

  const socialPlatforms = [
    {
      key: "instagram" as const,
      label: "Instagram",
      icon: Instagram,
      placeholder: "https://instagram.com/yourbusiness",
      color: "text-pink-500",
    },
    {
      key: "facebook" as const,
      label: "Facebook",
      icon: Facebook,
      placeholder: "https://facebook.com/yourbusiness",
      color: "text-blue-600",
    },
    {
      key: "tiktok" as const,
      label: "TikTok",
      icon: Music2,
      placeholder: "https://tiktok.com/@yourbusiness",
      color: "text-foreground",
    },
    {
      key: "whatsapp" as const,
      label: "WhatsApp",
      icon: MessageCircle,
      placeholder: "+1234567890 (your WhatsApp number)",
      color: "text-green-500",
    },
  ];

  return (
    <Card className="border-0 shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Instagram className="w-5 h-5" />
          Social Media & Messaging
        </CardTitle>
        <CardDescription>
          Add your social media profiles so customers can find and message you
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {socialPlatforms.map((platform) => (
          <div key={platform.key} className="space-y-2">
            <Label className="flex items-center gap-2">
              <platform.icon className={`w-4 h-4 ${platform.color}`} />
              {platform.label}
            </Label>
            <Input
              value={links[platform.key]}
              onChange={(e) => setLinks({ ...links, [platform.key]: e.target.value })}
              placeholder={platform.placeholder}
            />
          </div>
        ))}

        <div className="pt-2">
          <p className="text-sm text-muted-foreground mb-4">
            These links will be displayed on your public booking page so customers can connect with you.
          </p>
          <Button onClick={handleSave} disabled={loading} className="w-full gradient-primary">
            {loading ? "Saving..." : "Save Social Links"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
