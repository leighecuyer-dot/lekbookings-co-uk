import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DNS_RECORDS = [
  {
    label: "SPF Record",
    fields: [
      { name: "Type", value: "TXT" },
      { name: "Host", value: "@" },
      { name: "Value", value: "v=spf1 include:_spf-eu.ionos.com include:amazonses.com ~all" },
      { name: "TTL", value: "Auto" },
    ],
  },
  {
    label: "DKIM Record",
    fields: [
      { name: "Type", value: "TXT" },
      { name: "Host", value: "resend._domainkey" },
      { name: "Value", value: "p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC1mZnX2aebCvMooUgJ4Yg8i8iC7MoqPlNUCJh17aRroC75lmj2HSwXlGPv/hSJPpoYVxnJRGC1zzFUW/5xVzX2qrQ+ZM15jUzspTtPI+278iVDHdl2MqExt/5kYtKLnVTF+LKG/rwyXPXagfqMZ2wD5fJsnghuTX+irIVieJDryQIDAQAB" },
      { name: "TTL", value: "Auto" },
    ],
  },
];

function CopyField({ name, value }: { name: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{name}</p>
      <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
        <p className="flex-1 text-sm font-mono break-all">{value}</p>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 shrink-0"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="h-4 w-4 text-success" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

export default function DnsSetupPage() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-lg mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-display font-bold">DNS Setup</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Tap the copy icon next to each value to copy it.
          </p>
        </div>

        <div className="space-y-6">
          {DNS_RECORDS.map((record) => (
            <Card key={record.label} className="border border-border shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">{record.label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {record.fields.map((field) => (
                  <CopyField key={field.name} name={field.name} value={field.value} />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          You can delete this page once your DNS is verified.
        </p>
      </div>
    </div>
  );
}
