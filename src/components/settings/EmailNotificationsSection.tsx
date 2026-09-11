import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Mail } from "lucide-react";

export function EmailNotificationsSection() {
  const { currentBusiness } = useBusiness();
  const [accountEmail, setAccountEmail] = useState<string>("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAccountEmail(data.user?.email ?? ""));
  }, []);

  const sendTest = async () => {
    setSending(true);
    const { data, error } = await supabase.functions.invoke("send-test-email", {
      body: { businessId: currentBusiness?.id },
    });
    setSending(false);
    if (error) {
      toast({ title: "Test email failed", description: error.message, variant: "destructive" });
    } else if (data?.success === false) {
      toast({
        title: "Not sent",
        description: "This address previously unsubscribed or bounced.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Test email sent",
        description: `Sent to ${data?.recipient ?? accountEmail}. Check inbox and spam.`,
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" /> Email notifications
        </CardTitle>
        <CardDescription>
          Booking confirmation emails are sent from your verified domain. Send yourself a test to
          check delivery.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="test-email">Send test email to</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="test-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <Button onClick={sendTest} disabled={sending} className="sm:w-auto">
              {sending ? "Sending…" : "Send test"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
