import { useState } from "react";
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
  Download
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
  const [activeTab, setActiveTab] = useState<DataType>("bookings");
  const [diaryText, setDiaryText] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [parsedData, setParsedData] = useState<any[] | null>(null);

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

  const handleAIParse = async () => {
    if (!diaryText.trim()) {
      toast({ title: "Please enter diary text to parse", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setParsedData(null);

    try {
      const { data, error } = await supabase.functions.invoke("parse-diary", {
        body: { diaryText, dataType: activeTab }
      });

      if (error) throw error;

      const items = data[activeTab] || [];
      if (items.length === 0) {
        toast({ title: "No data found in the text", variant: "destructive" });
        return;
      }

      setParsedData(items);
      toast({ title: `Found ${items.length} ${activeTab}`, description: "Review and confirm to import" });
    } catch (error) {
      console.error("AI parse error:", error);
      toast({ 
        title: "Failed to parse diary", 
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

        case "bookings":
          insertData = parsedData.map((b: ParsedBooking) => {
            const startDateTime = new Date(`${b.date}T${b.start_time}`);
            const duration = b.duration_minutes || 60;
            const endDateTime = new Date(startDateTime.getTime() + duration * 60000);
            
            return {
              business_id: currentBusiness.id,
              customer_name: b.customer_name,
              customer_phone: b.customer_phone || null,
              customer_email: b.customer_email || null,
              start_time: startDateTime.toISOString(),
              end_time: endDateTime.toISOString(),
              notes: b.notes || null,
              status: "confirmed",
            };
          });
          await supabase.from("bookings").insert(insertData);
          break;
      }

      toast({ title: "Import successful!", description: `${parsedData.length} ${activeTab} imported` });
      setParsedData(null);
      setDiaryText("");
      setCsvFile(null);
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

    return (
      <div className="mt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Preview ({parsedData.length} items)</h3>
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

        <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted sticky top-0">
              <tr>
                {Object.keys(parsedData[0] || {}).map(key => (
                  <th key={key} className="px-4 py-2 text-left font-medium">{key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parsedData.map((item, i) => (
                <tr key={i} className="border-t">
                  {Object.values(item).map((val, j) => (
                    <td key={j} className="px-4 py-2">{String(val ?? "-")}</td>
                  ))}
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
                onClick={() => { setActiveTab(key); setParsedData(null); }}
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
                  Paste your diary, schedule, or notes and our AI will extract {activeTab} automatically
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Paste your diary or schedule</Label>
                  <Textarea
                    placeholder={activeTab === "bookings" 
                      ? "Monday 10am - Sarah haircut\n2pm John beard trim\nTuesday Mrs Jones 9:30 colour and cut..."
                      : `Paste your ${activeTab} list here...`
                    }
                    value={diaryText}
                    onChange={(e) => setDiaryText(e.target.value)}
                    className="min-h-[200px] font-mono text-sm"
                  />
                </div>
                <Button onClick={handleAIParse} disabled={isLoading || !diaryText.trim()}>
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4 mr-2" />
                  )}
                  Parse with AI
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
