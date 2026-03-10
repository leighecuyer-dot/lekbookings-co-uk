import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Code, Eye } from "lucide-react";
import { toast } from "sonner";
import { useBusiness } from "@/contexts/BusinessContext";

const BUTTON_POSITIONS = [
  { value: "bottom-right", label: "Bottom Right" },
  { value: "bottom-left", label: "Bottom Left" },
  { value: "top-right", label: "Top Right" },
  { value: "top-left", label: "Top Left" },
];

const BUTTON_COLORS = [
  { value: "#4F46E5", label: "Indigo" },
  { value: "#10B981", label: "Green" },
  { value: "#F59E0B", label: "Amber" },
  { value: "#EF4444", label: "Red" },
  { value: "#8B5CF6", label: "Purple" },
  { value: "#EC4899", label: "Pink" },
];

export function EmbedWidget() {
  const { currentBusiness } = useBusiness();
  const [position, setPosition] = useState("bottom-right");
  const [color, setColor] = useState("#4F46E5");
  const [buttonText, setButtonText] = useState("Book Now");

  const bookingUrl = currentBusiness?.slug
    ? `${window.location.origin}/book/${currentBusiness.slug}`
    : "";

  const generateEmbedCode = () => {
    if (!bookingUrl) return "";
    
    return `<!-- Booking Widget by Lovable -->
<script>
(function() {
  var btn = document.createElement('div');
  btn.innerHTML = '<button id="lovable-booking-btn" style="position:fixed;${position.includes('bottom') ? 'bottom:20px' : 'top:20px'};${position.includes('right') ? 'right:20px' : 'left:20px'};z-index:9999;background:${color};color:white;border:none;padding:12px 24px;border-radius:50px;font-size:16px;font-weight:600;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,0.25);transition:transform 0.2s,box-shadow 0.2s;" onmouseover="this.style.transform=\\'scale(1.05)\\';this.style.boxShadow=\\'0 6px 20px rgba(0,0,0,0.3)\\';" onmouseout="this.style.transform=\\'scale(1)\\';this.style.boxShadow=\\'0 4px 14px rgba(0,0,0,0.25)\\';">${buttonText}</button>';
  document.body.appendChild(btn);
  document.getElementById('lovable-booking-btn').onclick = function() {
    window.open('${bookingUrl}', '_blank', 'width=500,height=700');
  };
})();
</script>
<!-- End Booking Widget -->`;
  };

  const embedCode = generateEmbedCode();

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(embedCode);
    toast.success("Embed code copied to clipboard!");
  };

  const previewWidget = () => {
    const newWindow = window.open("", "_blank", "width=800,height=600");
    if (newWindow) {
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Widget Preview</title>
          <style>
            body { 
              font-family: system-ui, sans-serif; 
              margin: 0; 
              padding: 40px; 
              background: linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%);
              min-height: 100vh;
            }
            h1 { color: #333; }
            p { color: #666; }
          </style>
        </head>
        <body>
          <h1>Your Website</h1>
          <p>This is a preview of how the booking button will appear on your website.</p>
          <p>The floating button should appear in the ${position} corner.</p>
        </body>
        </html>
      `);
      newWindow.document.close();

      // Create the button via DOM API to avoid script/quote escaping issues
      const btn = newWindow.document.createElement("button");
      btn.textContent = buttonText;
      btn.style.cssText = \`position:fixed;\${position.includes('bottom') ? 'bottom:20px' : 'top:20px'};\${position.includes('right') ? 'right:20px' : 'left:20px'};z-index:9999;background:\${color};color:white;border:none;padding:12px 24px;border-radius:50px;font-size:16px;font-weight:600;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,0.25);transition:transform 0.2s,box-shadow 0.2s;\`;
      btn.onmouseover = function() { btn.style.transform = "scale(1.05)"; btn.style.boxShadow = "0 6px 20px rgba(0,0,0,0.3)"; };
      btn.onmouseout = function() { btn.style.transform = "scale(1)"; btn.style.boxShadow = "0 4px 14px rgba(0,0,0,0.25)"; };
      btn.onclick = function() { newWindow.open(bookingUrl, "_blank", "width=500,height=700"); };
      newWindow.document.body.appendChild(btn);
    }
  };

  if (!currentBusiness) return null;

  return (
    <Card className="border-0 shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code className="w-5 h-5" />
          Website Booking Widget
        </CardTitle>
        <CardDescription>
          Add a floating "Book Now" button to your existing website
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Customization Options */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Button Position</Label>
            <Select value={position} onValueChange={setPosition}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BUTTON_POSITIONS.map((pos) => (
                  <SelectItem key={pos.value} value={pos.value}>
                    {pos.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Button Color</Label>
            <Select value={color} onValueChange={setColor}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BUTTON_COLORS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: c.value }}
                      />
                      {c.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Button Text</Label>
          <Input
            value={buttonText}
            onChange={(e) => setButtonText(e.target.value)}
            placeholder="Book Now"
            maxLength={20}
          />
        </div>

        {/* Preview Button */}
        <div 
          className="flex justify-center p-6 bg-muted rounded-lg"
        >
          <button
            style={{
              background: color,
              color: "white",
              border: "none",
              padding: "12px 24px",
              borderRadius: "50px",
              fontSize: "16px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
            }}
          >
            {buttonText}
          </button>
        </div>

        {/* Embed Code */}
        <div className="space-y-2">
          <Label>Embed Code</Label>
          <Textarea
            value={embedCode}
            readOnly
            className="font-mono text-xs h-32"
          />
          <p className="text-sm text-muted-foreground">
            Copy this code and paste it just before the closing <code>&lt;/body&gt;</code> tag on your website.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={copyEmbedCode} className="flex-1">
            <Copy className="w-4 h-4 mr-2" />
            Copy Code
          </Button>
          <Button variant="outline" onClick={previewWidget}>
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
