import { useState, useEffect } from "react";
import { useBusiness } from "@/contexts/BusinessContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Sparkles, Globe, X, Plus, Loader2 } from "lucide-react";

export function AiContextSettings() {
  const { currentBusiness, refreshBusinesses } = useBusiness();
  const [loading, setLoading] = useState(false);
  const [aiContext, setAiContext] = useState("");
  const [websiteUrls, setWebsiteUrls] = useState<string[]>([]);
  const [newUrl, setNewUrl] = useState("");

  useEffect(() => {
    if (currentBusiness) {
      // Access the new columns - they may not be in the type yet
      const business = currentBusiness as typeof currentBusiness & {
        ai_context?: string | null;
        website_urls?: string[] | null;
      };
      setAiContext(business.ai_context || "");
      setWebsiteUrls(business.website_urls || []);
    }
  }, [currentBusiness]);

  const handleSave = async () => {
    if (!currentBusiness) return;

    setLoading(true);
    const { error } = await supabase
      .from("businesses")
      .update({
        ai_context: aiContext || null,
        website_urls: websiteUrls.length > 0 ? websiteUrls : [],
      })
      .eq("id", currentBusiness.id);

    if (error) {
      console.error("Failed to update AI context:", error);
      toast.error("Failed to save AI settings");
    } else {
      toast.success("AI settings saved!");
      refreshBusinesses();
    }
    setLoading(false);
  };

  const addUrl = () => {
    const trimmedUrl = newUrl.trim();
    if (!trimmedUrl) return;

    // Basic URL validation
    try {
      new URL(trimmedUrl.startsWith("http") ? trimmedUrl : `https://${trimmedUrl}`);
    } catch {
      toast.error("Please enter a valid URL");
      return;
    }

    const formattedUrl = trimmedUrl.startsWith("http") ? trimmedUrl : `https://${trimmedUrl}`;
    
    if (websiteUrls.includes(formattedUrl)) {
      toast.error("This URL is already added");
      return;
    }

    if (websiteUrls.length >= 5) {
      toast.error("Maximum 5 URLs allowed");
      return;
    }

    setWebsiteUrls([...websiteUrls, formattedUrl]);
    setNewUrl("");
  };

  const removeUrl = (urlToRemove: string) => {
    setWebsiteUrls(websiteUrls.filter((url) => url !== urlToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addUrl();
    }
  };

  return (
    <Card className="border-0 shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          AI Personalization
        </CardTitle>
        <CardDescription>
          Help our AI give you better, industry-specific suggestions for filling your booking slots
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Industry Display */}
        {currentBusiness?.industry && (
          <div className="space-y-2">
            <Label className="text-muted-foreground">Industry</Label>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm">
                {currentBusiness.industry.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
              </Badge>
              <span className="text-xs text-muted-foreground">
                (Change in business settings)
              </span>
            </div>
          </div>
        )}

        {/* Business Description */}
        <div className="space-y-2">
          <Label htmlFor="ai-context">
            Describe Your Business
          </Label>
          <Textarea
            id="ai-context"
            placeholder="Tell us about your unique services, specialties, target customers, or anything that makes your business special. For example: 'We're a luxury hair salon specializing in color corrections and extensions. Our clients are mostly professionals aged 25-45 who value premium service.'"
            value={aiContext}
            onChange={(e) => setAiContext(e.target.value)}
            rows={4}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            This helps the AI tailor marketing suggestions specifically for your business
          </p>
        </div>

        {/* Website URLs */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Website & Social Links
          </Label>
          <p className="text-xs text-muted-foreground -mt-1">
            Add your website or social media pages so the AI can better understand your brand and services
          </p>
          
          {/* URL List */}
          {websiteUrls.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {websiteUrls.map((url) => (
                <Badge
                  key={url}
                  variant="outline"
                  className="flex items-center gap-1 py-1 px-2 max-w-full"
                >
                  <span className="truncate max-w-[200px] text-xs">{url}</span>
                  <button
                    type="button"
                    onClick={() => removeUrl(url)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* Add URL Input */}
          {websiteUrls.length < 5 && (
            <div className="flex gap-2">
              <Input
                placeholder="www.yourbusiness.com"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1"
              />
              <Button type="button" variant="outline" size="icon" onClick={addUrl}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        <Button onClick={handleSave} disabled={loading} className="gradient-primary">
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Save AI Settings"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
