import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useBusiness } from "@/contexts/BusinessContext";
import { supabase } from "@/integrations/supabase/client";

const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])?$/;

function normalize(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function SlugEditor() {
  const { currentBusiness } = useBusiness();
  const [slug, setSlug] = useState(currentBusiness?.slug ?? "");
  const [saving, setSaving] = useState(false);

  if (!currentBusiness) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const previewSlug = normalize(slug) || currentBusiness.slug;
  const changed = normalize(slug) !== currentBusiness.slug;

  const handleSave = async () => {
    const cleaned = normalize(slug);
    if (!SLUG_REGEX.test(cleaned)) {
      toast.error("Use 3-50 lowercase letters, numbers, or hyphens");
      return;
    }
    if (cleaned === currentBusiness.slug) return;

    setSaving(true);
    // Check uniqueness
    const { data: existing, error: checkErr } = await supabase
      .from("businesses")
      .select("id")
      .eq("slug", cleaned)
      .maybeSingle();

    if (checkErr) {
      setSaving(false);
      toast.error("Could not verify slug availability");
      return;
    }
    if (existing && existing.id !== currentBusiness.id) {
      setSaving(false);
      toast.error("That link is already taken — try another");
      return;
    }

    const { error } = await supabase
      .from("businesses")
      .update({ slug: cleaned })
      .eq("id", currentBusiness.id);

    setSaving(false);
    if (error) {
      toast.error("Failed to update link");
      return;
    }
    setSlug(cleaned);
    toast.success("Booking link updated");
  };

  return (
    <Card className="border-0 shadow-soft">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Link2 className="w-4 h-4 text-primary" />
          Custom Link
        </CardTitle>
        <CardDescription>
          Pick a short, memorable slug for your booking page URL
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="slug-input">Your slug</Label>
          <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-1 focus-within:ring-2 focus-within:ring-ring">
            <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">
              {origin}/book/
            </span>
            <Input
              id="slug-input"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="border-0 px-0 shadow-none focus-visible:ring-0 font-mono text-sm"
              placeholder="your-business"
              autoComplete="off"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Lowercase letters, numbers, and hyphens only (3-50 characters).
          </p>
        </div>

        {changed && (
          <p className="text-xs text-muted-foreground">
            Preview: <span className="font-mono text-foreground">{origin}/book/{previewSlug}</span>
          </p>
        )}

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving || !changed}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Link
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
