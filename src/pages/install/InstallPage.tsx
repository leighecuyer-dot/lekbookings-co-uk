import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Download, Share, Plus, Check, Smartphone, Monitor } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Check if iOS
    const ua = window.navigator.userAgent;
    const iOS = /iPad|iPhone|iPod/.test(ua);
    setIsIOS(iOS);

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary mb-4">
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-display font-bold mb-2">Install LEK</h1>
          <p className="text-muted-foreground">
            Get quick access to your bookings from your home screen
          </p>
        </div>

        {isInstalled ? (
          <Card className="border-0 shadow-elevated">
            <CardContent className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10 mb-4">
                <Check className="w-8 h-8 text-success" />
              </div>
              <h2 className="text-xl font-display font-semibold mb-2">
                Already Installed!
              </h2>
              <p className="text-muted-foreground">
                LEK is installed on your device. Open it from your home screen.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Direct Install (Android/Desktop Chrome) */}
            {deferredPrompt && (
              <Card className="border-0 shadow-elevated border-l-4 border-l-primary">
                <CardContent className="py-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary/10">
                      <Download className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">Install Now</h3>
                      <p className="text-sm text-muted-foreground">
                        Add LEK to your home screen
                      </p>
                    </div>
                    <Button onClick={handleInstall} className="gradient-primary">
                      Install
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* iOS Instructions */}
            {isIOS && (
              <Card className="border-0 shadow-soft">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-5 h-5 text-primary" />
                    <CardTitle className="text-lg">iPhone / iPad</CardTitle>
                  </div>
                  <CardDescription>
                    Follow these steps to install on iOS
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { icon: Share, text: 'Tap the Share button in Safari' },
                    { icon: Plus, text: 'Scroll down and tap "Add to Home Screen"' },
                    { icon: Check, text: 'Tap "Add" to confirm' },
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                        {i + 1}
                      </div>
                      <div className="flex items-center gap-2">
                        <step.icon className="w-4 h-4 text-muted-foreground" />
                        <span>{step.text}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Android Instructions */}
            {!isIOS && !deferredPrompt && (
              <Card className="border-0 shadow-soft">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-5 h-5 text-primary" />
                    <CardTitle className="text-lg">Android</CardTitle>
                  </div>
                  <CardDescription>
                    Follow these steps to install on Android
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { text: 'Tap the menu (⋮) in Chrome' },
                    { text: 'Select "Add to Home screen"' },
                    { text: 'Tap "Add" to confirm' },
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                        {i + 1}
                      </div>
                      <span>{step.text}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Desktop Instructions */}
            <Card className="border-0 shadow-soft">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Monitor className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">Desktop</CardTitle>
                </div>
                <CardDescription>
                  Install on Windows, Mac, or Linux
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  In Chrome, Edge, or other supported browsers, look for the install icon 
                  in the address bar, or use the browser menu to install.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Benefits */}
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            { title: "Works Offline", desc: "Access your bookings anytime" },
            { title: "Fast Launch", desc: "Open instantly from home screen" },
            { title: "Push Notifications", desc: "Get reminded of appointments" },
          ].map((benefit) => (
            <div key={benefit.title} className="text-center p-4">
              <h4 className="font-medium mb-1">{benefit.title}</h4>
              <p className="text-sm text-muted-foreground">{benefit.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
