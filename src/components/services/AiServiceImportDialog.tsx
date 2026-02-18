import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Camera, Link, Loader2, Upload, Check, X, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const CURRENCY_OPTIONS = [
  { code: "GBP", symbol: "£", label: "GBP (£)" },
  { code: "USD", symbol: "$", label: "USD ($)" },
  { code: "EUR", symbol: "€", label: "EUR (€)" },
  { code: "AUD", symbol: "A$", label: "AUD (A$)" },
  { code: "CAD", symbol: "C$", label: "CAD (C$)" },
  { code: "NZD", symbol: "NZ$", label: "NZD (NZ$)" },
  { code: "CHF", symbol: "CHF", label: "CHF" },
  { code: "JPY", symbol: "¥", label: "JPY (¥)" },
  { code: "CNY", symbol: "¥", label: "CNY (¥)" },
  { code: "INR", symbol: "₹", label: "INR (₹)" },
  { code: "ZAR", symbol: "R", label: "ZAR (R)" },
  { code: "AED", symbol: "د.إ", label: "AED (د.إ)" },
  { code: "SGD", symbol: "S$", label: "SGD (S$)" },
  { code: "HKD", symbol: "HK$", label: "HKD (HK$)" },
];

interface ExtractedService {
  name: string;
  description?: string | null;
  price?: number | null;
  duration_minutes: number;
  selected: boolean;
}

interface AiServiceImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  onImportComplete: () => void;
}

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

export function AiServiceImportDialog({
  open,
  onOpenChange,
  businessId,
  onImportComplete,
}: AiServiceImportDialogProps) {
  const [activeTab, setActiveTab] = useState<"photo" | "url">("photo");
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [extractedServices, setExtractedServices] = useState<ExtractedService[]>([]);
  const [detectedCurrency, setDetectedCurrency] = useState<string>("GBP");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getCurrencySymbol = (code: string): string => {
    const symbols: Record<string, string> = {
      GBP: "£",
      USD: "$",
      EUR: "€",
      AUD: "A$",
      CAD: "C$",
      NZD: "NZ$",
      CHF: "CHF",
      JPY: "¥",
      CNY: "¥",
      INR: "₹",
      ZAR: "R",
      AED: "د.إ",
      SGD: "S$",
      HKD: "HK$",
    };
    return symbols[code] || code;
  };

  const resetState = () => {
    setExtractedServices([]);
    setDetectedCurrency("GBP");
    setImagePreview(null);
    setWebsiteUrl("");
    setLoading(false);
    setImporting(false);
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image too large. Please use a smaller image (max 10MB).");
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setImagePreview(base64);
      await extractFromImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const extractFromImage = async (imageData: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("parse-price-list", {
        body: { imageData },
      });

      if (error) {
        throw new Error(error.message || "Failed to extract services");
      }

      if (data.error) {
        throw new Error(data.error);
      }

      const services = (data.services || []).map((s: any) => ({
        ...s,
        duration_minutes: 30, // Default duration
        selected: true,
      }));

      if (services.length === 0) {
        toast.error("No services found in the image. Please try a clearer photo.");
        return;
      }

      setDetectedCurrency(data.currency || "GBP");
      setExtractedServices(services);
      toast.success(`Found ${services.length} services!`);
    } catch (error) {
      console.error("Error extracting services:", error);
      toast.error(error instanceof Error ? error.message : "Failed to extract services");
    } finally {
      setLoading(false);
    }
  };

  const extractFromUrl = async () => {
    if (!websiteUrl.trim()) {
      toast.error("Please enter a website URL");
      return;
    }

    // Basic URL validation
    let url = websiteUrl.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("parse-price-list", {
        body: { websiteUrl: url },
      });

      if (error) {
        throw new Error(error.message || "Failed to extract services");
      }

      if (data.error) {
        throw new Error(data.error);
      }

      const services = (data.services || []).map((s: any) => ({
        ...s,
        duration_minutes: 30, // Default duration
        selected: true,
      }));

      if (services.length === 0) {
        toast.error("No services found on the website. Please check the URL contains pricing information.");
        return;
      }

      setDetectedCurrency(data.currency || "GBP");
      setExtractedServices(services);
      toast.success(`Found ${services.length} services!`);
    } catch (error) {
      console.error("Error extracting services:", error);
      toast.error(error instanceof Error ? error.message : "Failed to extract services");
    } finally {
      setLoading(false);
    }
  };

  const toggleServiceSelection = (index: number) => {
    setExtractedServices((prev) =>
      prev.map((s, i) => (i === index ? { ...s, selected: !s.selected } : s))
    );
  };

  const updateServiceDuration = (index: number, duration: number) => {
    setExtractedServices((prev) =>
      prev.map((s, i) => (i === index ? { ...s, duration_minutes: duration } : s))
    );
  };

  const updateServiceName = (index: number, name: string) => {
    setExtractedServices((prev) =>
      prev.map((s, i) => (i === index ? { ...s, name } : s))
    );
  };

  const updateServicePrice = (index: number, price: string) => {
    const numericPrice = price === "" ? null : parseFloat(price);
    setExtractedServices((prev) =>
      prev.map((s, i) => (i === index ? { ...s, price: numericPrice } : s))
    );
  };

  const handleImport = async () => {
    const selectedServices = extractedServices.filter((s) => s.selected);
    if (selectedServices.length === 0) {
      toast.error("Please select at least one service to import");
      return;
    }

    setImporting(true);
    try {
      const servicesToInsert = selectedServices.map((s) => ({
        business_id: businessId,
        name: s.name,
        description: s.description || null,
        duration_minutes: s.duration_minutes,
        price: s.price || null,
        color: null, // Will use default
      }));

      const { error } = await supabase.from("services").insert(servicesToInsert);

      if (error) {
        throw new Error(error.message);
      }

      toast.success(`Imported ${selectedServices.length} services!`);
      handleClose();
      onImportComplete();
    } catch (error) {
      console.error("Error importing services:", error);
      toast.error(error instanceof Error ? error.message : "Failed to import services");
    } finally {
      setImporting(false);
    }
  };

  const selectedCount = extractedServices.filter((s) => s.selected).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Services with AI</DialogTitle>
          <DialogDescription>
            Upload a photo of your price list or enter your website URL to automatically extract services
          </DialogDescription>
        </DialogHeader>

        {extractedServices.length === 0 ? (
          <div className="py-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "photo" | "url")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="photo" className="gap-2">
                  <Camera className="w-4 h-4" />
                  Photo
                </TabsTrigger>
                <TabsTrigger value="url" className="gap-2">
                  <Link className="w-4 h-4" />
                  Website URL
                </TabsTrigger>
              </TabsList>

              <TabsContent value="photo" className="mt-4">
                <div className="space-y-4">
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Price list preview"
                        className="w-full max-h-64 object-contain rounded-lg border"
                      />
                      {loading && (
                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
                          <div className="text-center">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                            <p className="mt-2 text-sm text-muted-foreground">Extracting services...</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                        "hover:border-primary hover:bg-primary/5"
                      )}
                    >
                      <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground mb-1">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Take a photo of your price list, menu, or service board
                      </p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {imagePreview && !loading && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setImagePreview(null);
                        fileInputRef.current?.click();
                      }}
                      className="w-full"
                    >
                      Choose Different Image
                    </Button>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="url" className="mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Website URL</Label>
                    <Input
                      type="url"
                      placeholder="https://example.com/prices"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      disabled={loading}
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter the URL of a page that contains your service prices
                    </p>
                  </div>
                  <Button
                    onClick={extractFromUrl}
                    disabled={loading || !websiteUrl.trim()}
                    className="w-full gradient-primary"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Extracting...
                      </>
                    ) : (
                      <>
                        <Link className="w-4 h-4 mr-2" />
                        Extract Services
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col py-4">
            <div className="flex items-center justify-between mb-4 gap-2">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const allSelected = extractedServices.every(s => s.selected);
                    setExtractedServices(prev => prev.map(s => ({ ...s, selected: !allSelected })));
                  }}
                  className={cn(
                    "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                    selectedCount === extractedServices.length
                      ? "bg-primary border-primary text-primary-foreground"
                      : selectedCount > 0
                        ? "bg-primary/50 border-primary text-primary-foreground"
                        : "border-muted-foreground/30"
                  )}
                >
                  {selectedCount === extractedServices.length && <Check className="w-3 h-3" />}
                  {selectedCount > 0 && selectedCount < extractedServices.length && (
                    <div className="w-2 h-0.5 bg-primary-foreground" />
                  )}
                </button>
                <p className="text-sm text-muted-foreground">
                  {selectedCount} of {extractedServices.length} selected
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Select value={detectedCurrency} onValueChange={setDetectedCurrency}>
                  <SelectTrigger className="w-[110px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_OPTIONS.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" onClick={resetState}>
                  Start Over
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {extractedServices.map((service, index) => (
                <div
                  key={index}
                  className={cn(
                    "border rounded-lg p-3 transition-all",
                    service.selected ? "border-primary bg-primary/5" : "border-muted opacity-60"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleServiceSelection(index)}
                      className={cn(
                        "mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                        service.selected
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-muted-foreground/30"
                      )}
                    >
                      {service.selected && <Check className="w-3 h-3" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Input
                          value={service.name}
                          onChange={(e) => updateServiceName(index, e.target.value)}
                          className="flex-1 h-8 font-medium"
                          placeholder="Service name"
                        />
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-sm text-muted-foreground">{getCurrencySymbol(detectedCurrency)}</span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={service.price ?? ""}
                            onChange={(e) => updateServicePrice(index, e.target.value)}
                            className="w-20 h-8 text-right"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      {service.description && (
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {service.description}
                        </p>
                      )}

                      {service.selected && (
                        <div className="mt-2">
                          <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-1.5">
                            <Clock className="w-3 h-3" />
                            Duration (minutes)
                          </Label>
                          <div className="flex gap-1.5 flex-wrap">
                            {DURATION_OPTIONS.map((duration) => (
                              <button
                                key={duration}
                                onClick={() => updateServiceDuration(index, duration)}
                                className={cn(
                                  "px-2 py-1 text-xs rounded border transition-colors",
                                  service.duration_minutes === duration
                                    ? "bg-foreground text-background border-foreground"
                                    : "border-muted-foreground/30 hover:border-foreground"
                                )}
                              >
                                {duration}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t mt-4">
              <Button
                onClick={handleImport}
                disabled={importing || selectedCount === 0}
                className="w-full gradient-primary"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    Import {selectedCount} Service{selectedCount !== 1 ? "s" : ""}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
