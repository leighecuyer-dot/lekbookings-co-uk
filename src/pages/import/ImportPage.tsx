import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useBusiness } from "@/contexts/BusinessContext";
import { supabase } from "@/integrations/supabase/client";
import { compressImageFile } from "@/lib/imageCompression";
import { 
  Upload, 
  Wand2, 
  FileSpreadsheet, 
  Users, 
  Scissors, 
  UserCheck, 
  Calendar,
  Check,
  X,
  Loader2,
  Download,
  Camera,
  Image as ImageIcon
} from "lucide-react";

type DataType = "customers" | "services" | "staff" | "bookings";

interface ParsedCustomer {
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
}

interface ParsedService {
  name: string;
  description?: string;
  duration_minutes?: number;
  price?: number;
}

interface ParsedStaff {
  name: string;
  email?: string;
  phone?: string;
}

interface ParsedBooking {
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  service_name?: string;
  staff_name?: string;
  date: string;
  start_time: string;
  duration_minutes?: number;
  notes?: string;
}

export default function ImportPage() {
  const { currentBusiness } = useBusiness();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<DataType>(() => {
    const tab = searchParams.get("tab");
    return (tab && ["customers","services","staff","bookings"].includes(tab) ? tab : "bookings") as DataType;
  });
  const [diaryText, setDiaryText] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [parsedData, setParsedData] = useState<any[] | null>(null);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [preparingPhotos, setPreparingPhotos] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const dataTypeConfig = {
    customers: { 
      icon: Users, 
      label: "Customers",
      csvTemplate: "name,phone,email,notes\nJohn Smith,07700900123,john@email.com,Regular customer"
    },
    services: { 
      icon: Scissors, 
      label: "Services",
      csvTemplate: "name,description,duration_minutes,price\nHaircut,Standard haircut,30,2500"
    },
    staff: { 
      icon: UserCheck, 
      label: "Staff",
      csvTemplate: "name,email,phone\nJane Doe,jane@salon.com,07700900456"
    },
    bookings: { 
      icon: Calendar, 
      label: "Bookings",
      csvTemplate: "customer_name,customer_phone,service_name,date,start_time,duration_minutes,notes\nJohn Smith,07700900123,Haircut,2025-02-01,10:00,30,First visit"
    },
  };

  const MAX_PHOTOS = 6;

  const handleImageCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    const room = MAX_PHOTOS - capturedImages.length;
    if (room <= 0) {
      toast({ title: `You can add up to ${MAX_PHOTOS} photos`, variant: "destructive" });
      return;
    }

    setPreparingPhotos(true);
    try {
      const accepted: string[] = [];
      for (const file of files.slice(0, room)) {
        if (!file.type.startsWith("image/")) continue;
        accepted.push(await compressImageFile(file));
      }
      if (accepted.length === 0) {
        toast({ title: "Please select image files", variant: "destructive" });
        return;
      }
      setCapturedImages((prev) => [...prev, ...accepted]);
    } catch (err) {
      console.error("Image prep error:", err);
      toast({ title: "Could not read that photo", variant: "destructive" });
    } finally {
      setPreparingPhotos(false);
    }
  };

  const handleAIParse = async () => {
    if (!diaryText.trim() && capturedImages.length === 0) {
      toast({ title: "Please add a photo or enter text", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setParsedData(null);

    try {
      // Give the AI the business's own services/staff so it can match names.
      let serviceNames: string[] = [];
      let staffNames: string[] = [];
      if (currentBusiness) {
        const [{ data: svc }, { data: stf }] = await Promise.all([
          supabase.from("services").select("name").eq("business_id", currentBusiness.id).eq("is_active", true),
          supabase.from("staff").select("name").eq("business_id", currentBusiness.id).eq("is_active", true),
        ]);
        serviceNames = (svc ?? []).map((r) => r.name);
        staffNames = (stf ?? []).map((r) => r.name);
      }

      const { data, error } = await supabase.functions.invoke("parse-diary", {
        body: {
          diaryText: diaryText.trim() || undefined,
          dataType: activeTab,
          imagesData: capturedImages.length > 0 ? capturedImages : undefined,
          context: {
            today: new Date().toISOString().slice(0, 10),
            serviceNames,
            staffNames,
          },
        }
      });

      if (error) throw error;

      const items = data[activeTab] || [];
      if (items.length === 0) {
        toast({ title: "No data found in the photos or text", variant: "destructive" });
        return;
      }

      setParsedData(items);
      toast({ title: `Found ${items.length} ${activeTab}`, description: "Check the details, then confirm to import" });
    } catch (error) {
      console.error("AI parse error:", error);
      toast({ 
        title: "Failed to read your diary", 
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCSVUpload = async () => {
    if (!csvFile) {
      toast({ title: "Please select a CSV file", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setParsedData(null);

    try {
      const text = await csvFile.text();
      const lines = text.split("\n").filter(line => line.trim());
      const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
      
      const items = lines.slice(1).map(line => {
        const values = line.split(",").map(v => v.trim());
        const item: Record<string, any> = {};
        headers.forEach((header, i) => {
          if (values[i]) {
            if (header === "duration_minutes" || header === "price") {
              item[header] = parseInt(values[i]) || null;
            } else {
              item[header] = values[i];
            }
          }
        });
        return item;
      }).filter(item => Object.keys(item).length > 0);

      if (items.length === 0) {
        toast({ title: "No valid data found in CSV", variant: "destructive" });
        return;
      }

      setParsedData(items);
      toast({ title: `Found ${items.length} ${activeTab}`, description: "Review and confirm to import" });
    } catch (error) {
      console.error("CSV parse error:", error);
      toast({ title: "Failed to parse CSV", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!parsedData || !currentBusiness) return;

    setIsLoading(true);

    try {
      let insertData: any[] = [];

      switch (activeTab) {
        case "customers":
          insertData = parsedData.map((c: ParsedCustomer) => ({
            business_id: currentBusiness.id,
            name: c.name,
            phone: c.phone || null,
            email: c.email || null,
            notes: c.notes || null,
          }));
          await supabase.from("customers").insert(insertData);
          break;

        case "services":
          insertData = parsedData.map((s: ParsedService) => ({
            business_id: currentBusiness.id,
            name: s.name,
            description: s.description || null,
            duration_minutes: s.duration_minutes || 60,
            price: s.price || null,
          }));
          await supabase.from("services").insert(insertData);
          break;

        case "staff":
          insertData = parsedData.map((s: ParsedStaff) => ({
            business_id: currentBusiness.id,
            name: s.name,
            email: s.email || null,
            phone: s.phone || null,
          }));
          await supabase.from("staff").insert(insertData);
          break;

        case "bookings": {
          const [{ data: services }, { data: staffRows }, { data: existingCustomers }] = await Promise.all([
            supabase.from("services").select("id,name,duration_minutes,price").eq("business_id", currentBusiness.id),
            supabase.from("staff").select("id,name").eq("business_id", currentBusiness.id),
            supabase.from("customers").select("id,name,phone").eq("business_id", currentBusiness.id),
          ]);

          const norm = (v?: string | null) => (v ?? "").trim().toLowerCase();
          const findService = (name?: string) =>
            (services ?? []).find((s) => norm(s.name) === norm(name)) ??
            (name ? (services ?? []).find((s) => norm(s.name).includes(norm(name)) || norm(name).includes(norm(s.name))) : undefined);
          const findStaff = (name?: string) =>
            (staffRows ?? []).find((s) => norm(s.name) === norm(name)) ??
            (name ? (staffRows ?? []).find((s) => norm(s.name).split(" ")[0] === norm(name).split(" ")[0]) : undefined);

          // Create any customers we don't already have, so the bookings link up.
          const customerMap = new Map<string, string>();
          (existingCustomers ?? []).forEach((c) => customerMap.set(norm(c.name), c.id));

          const newCustomers = parsedData
            .filter((b: ParsedBooking) => b.customer_name && !customerMap.has(norm(b.customer_name)))
            .reduce((acc: ParsedBooking[], b: ParsedBooking) => {
              if (!acc.some((x) => norm(x.customer_name) === norm(b.customer_name))) acc.push(b);
              return acc;
            }, []);

          if (newCustomers.length > 0) {
            const { data: created } = await supabase
              .from("customers")
              .insert(newCustomers.map((b) => ({
                business_id: currentBusiness.id,
                name: b.customer_name,
                phone: b.customer_phone || null,
                email: b.customer_email || null,
              })))
              .select("id,name");
            (created ?? []).forEach((c) => customerMap.set(norm(c.name), c.id));
          }

          insertData = parsedData.map((b: ParsedBooking) => {
            const service = findService(b.service_name);
            const staffMember = findStaff(b.staff_name);
            const startDateTime = new Date(`${b.date}T${b.start_time}`);
            const duration = b.duration_minutes || service?.duration_minutes || 60;
            const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

            return {
              business_id: currentBusiness.id,
              customer_id: customerMap.get(norm(b.customer_name)) ?? null,
              service_id: service?.id ?? null,
              staff_id: staffMember?.id ?? null,
              customer_name: b.customer_name,
              customer_phone: b.customer_phone || null,
              customer_email: b.customer_email || null,
              start_time: startDateTime.toISOString(),
              end_time: endDateTime.toISOString(),
              total_price: service?.price ?? null,
              notes: b.notes || null,
              status: "confirmed",
            };
          }).filter((b) => !isNaN(new Date(b.start_time).getTime()));

          const { error: bookingError } = await supabase.from("bookings").insert(insertData);
          if (bookingError) throw bookingError;
          break;
        }
      }

      toast({ title: "Import successful!", description: `${parsedData.length} ${activeTab} imported` });
      setParsedData(null);
      setDiaryText("");
      setCsvFile(null);
      setCapturedImages([]);
    } catch (error) {
      console.error("Import error:", error);
      toast({ title: "Import failed", description: "Some records may not have been imported", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadTemplate = () => {
    const template = dataTypeConfig[activeTab].csvTemplate;
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeTab}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderParsedData = () => {
    if (!parsedData) return null;

    const columns = Object.keys(parsedData[0] || {});

    const updateCell = (rowIndex: number, key: string, value: string) => {
      setParsedData((prev) =>
        (prev ?? []).map((row, i) =>
          i === rowIndex
            ? { ...row, [key]: key === "duration_minutes" || key === "price" ? (value === "" ? null : Number(value)) : value }
            : row
        )
      );
    };

    const removeRow = (rowIndex: number) => {
      setParsedData((prev) => {
        const next = (prev ?? []).filter((_, i) => i !== rowIndex);
        return next.length > 0 ? next : null;
      });
    };

    return (
      <div className="mt-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold">Check before importing ({parsedData.length})</h3>
            <p className="text-xs text-muted-foreground">Tap any box to correct what the AI read.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setParsedData(null)}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button size="sm" onClick={handleConfirmImport} disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
              Confirm Import
            </Button>
          </div>
        </div>

        <div className="border rounded-lg overflow-auto max-h-[420px]">
          <table className="w-full text-sm">
            <thead className="bg-muted sticky top-0 z-10">
              <tr>
                {columns.map(key => (
                  <th key={key} className="px-3 py-2 text-left font-medium whitespace-nowrap capitalize">
                    {key.replace(/_/g, " ")}
                  </th>
                ))}
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {parsedData.map((item, i) => (
                <tr key={i} className="border-t">
                  {columns.map((key) => (
                    <td key={key} className="px-1 py-1">
                      <Input
                        value={item[key] ?? ""}
                        onChange={(e) => updateCell(i, key, e.target.value)}
                        className="h-9 min-w-[120px] text-sm"
                      />
                    </td>
                  ))}
                  <td className="px-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeRow(i)}
                      aria-label="Remove row"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };


  return (
    <DashboardLayout title="Import Data" description="Bulk upload or use AI to parse your existing diary">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Data Type Selector */}
        <div className="flex flex-wrap gap-3">
          {(Object.entries(dataTypeConfig) as [DataType, typeof dataTypeConfig.customers][]).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <Button
                key={key}
                variant={activeTab === key ? "default" : "outline"}
                onClick={() => { setActiveTab(key); setParsedData(null); setCapturedImages([]); }}
                className="gap-2"
              >
                <Icon className="w-4 h-4" />
                {config.label}
              </Button>
            );
          })}
        </div>

        <Tabs defaultValue="ai" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ai" className="gap-2">
              <Wand2 className="w-4 h-4" />
              AI Smart Import
            </TabsTrigger>
            <TabsTrigger value="csv" className="gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              CSV Upload
            </TabsTrigger>
          </TabsList>

          {/* AI Import Tab */}
          <TabsContent value="ai">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="w-5 h-5" />
                  AI Diary Parser
                </CardTitle>
                <CardDescription>
                  Take a photo of your paper diary or paste text - our AI will extract {activeTab} automatically
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Photo Capture Section */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    Capture or upload a photo of your diary
                  </Label>
                  
                  <div className="flex flex-wrap gap-3">
                    {/* Camera capture (mobile) */}
                    <Button
                      variant="outline"
                      onClick={() => cameraInputRef.current?.click()}
                      className="gap-2"
                    >
                      <Camera className="w-4 h-4" />
                      Take Photo
                    </Button>
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleImageCapture}
                      className="hidden"
                    />

                    {/* File upload */}
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="gap-2"
                    >
                      <ImageIcon className="w-4 h-4" />
                      Upload Image
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageCapture}
                      className="hidden"
                    />

                    {capturedImage && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCapturedImage(null)}
                        className="text-destructive"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Remove
                      </Button>
                    )}
                  </div>

                  {/* Image preview */}
                  {capturedImage && (
                    <div className="relative border rounded-lg overflow-hidden max-w-md">
                      <img
                        src={capturedImage}
                        alt="Captured diary"
                        className="w-full h-auto max-h-[300px] object-contain bg-muted"
                      />
                      <Badge className="absolute top-2 right-2">
                        Photo ready
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                      Or type/paste text
                    </span>
                  </div>
                </div>

                {/* Text input */}
                <div className="space-y-2">
                  <Label>Paste your diary or schedule (optional if using photo)</Label>
                  <Textarea
                    placeholder={activeTab === "bookings" 
                      ? "Monday 10am - Sarah haircut\n2pm John beard trim\nTuesday Mrs Jones 9:30 colour and cut..."
                      : `Paste your ${activeTab} list here...`
                    }
                    value={diaryText}
                    onChange={(e) => setDiaryText(e.target.value)}
                    className="min-h-[150px] font-mono text-sm"
                  />
                </div>

                <Button 
                  onClick={handleAIParse} 
                  disabled={isLoading || (!diaryText.trim() && !capturedImage)}
                  className="w-full sm:w-auto"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4 mr-2" />
                  )}
                  {capturedImage ? "Extract from Photo" : "Parse with AI"}
                </Button>
                {renderParsedData()}
              </CardContent>
            </Card>
          </TabsContent>

          {/* CSV Import Tab */}
          <TabsContent value="csv">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5" />
                  CSV Upload
                </CardTitle>
                <CardDescription>
                  Upload a CSV file with your {activeTab} data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Button variant="outline" size="sm" onClick={downloadTemplate}>
                    <Download className="w-4 h-4 mr-2" />
                    Download Template
                  </Button>
                  <Badge variant="secondary">CSV format</Badge>
                </div>

                <div className="space-y-2">
                  <Label>Select CSV file</Label>
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  />
                </div>

                <Button onClick={handleCSVUpload} disabled={isLoading || !csvFile}>
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  Upload & Parse
                </Button>
                {renderParsedData()}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
