import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, MailX } from "lucide-react";

type State = "loading" | "valid" | "done" | "already" | "invalid";

export default function UnsubscribePage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`;
    fetch(url, { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string } })
      .then((r) => r.json())
      .then((data) => {
        if (data?.valid) setState("valid");
        else if (data?.reason === "already_unsubscribed") setState("already");
        else setState("invalid");
      })
      .catch(() => setState("invalid"));
  }, [token]);

  const confirm = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
      body: { token },
    });
    setBusy(false);
    if (error) return setState("invalid");
    const result = data as { success?: boolean; reason?: string };
    if (result?.success) setState("done");
    else if (result?.reason === "already_unsubscribed") setState("already");
    else setState("invalid");
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            {state === "done" || state === "already" ? (
              <CheckCircle2 className="h-6 w-6" />
            ) : (
              <MailX className="h-6 w-6" />
            )}
          </div>
          <CardTitle>
            {state === "done" || state === "already" ? "You're unsubscribed" : "Unsubscribe"}
          </CardTitle>
          <CardDescription>
            {state === "loading" && "Checking your link…"}
            {state === "valid" && "Stop receiving emails from this sender?"}
            {state === "done" && "You won't receive any more emails from us."}
            {state === "already" && "This address was already unsubscribed."}
            {state === "invalid" && "This unsubscribe link is invalid or has expired."}
          </CardDescription>
        </CardHeader>
        {state === "valid" && (
          <CardContent>
            <Button className="w-full" onClick={confirm} disabled={busy}>
              {busy ? "Unsubscribing…" : "Confirm unsubscribe"}
            </Button>
          </CardContent>
        )}
      </Card>
    </main>
  );
}
