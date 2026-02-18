import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { CalendarDays, CheckCircle, Clock, Star } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function CustomerPortalPage() {
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Welcome back!");
      navigate("/customer-portal/dashboard");
    }
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/customer-portal`,
        data: { full_name: fullName },
      },
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Account created! Please check your email to confirm.");
      setTab("signin");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-primary items-center justify-center p-12">
        <div className="max-w-md text-white">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <CalendarDays className="w-7 h-7" />
            </div>
            <span className="text-3xl font-display font-bold">LEK</span>
          </div>
          <h1 className="text-4xl font-display font-bold mb-4">
            Your bookings, all in one place
          </h1>
          <p className="text-white/70 mb-8 text-lg">
            Sign in to view your appointments, check history, and manage your bookings.
          </p>
          <div className="space-y-4">
            {[
              { icon: CalendarDays, text: "View upcoming appointments" },
              { icon: Clock, text: "See your booking history" },
              { icon: Star, text: "Rate your experience" },
              { icon: CheckCircle, text: "Manage your profile" },
            ].map(({ icon: Icon, text }, i) => (
              <div key={i} className="flex items-center gap-3">
                <Icon className="w-5 h-5 text-white/80" />
                <span className="text-white/90">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <CalendarDays className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-display font-bold">LEK</span>
          </div>

          <div className="text-center mb-2">
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground bg-muted px-3 py-1 rounded-full">
              Customer Portal
            </span>
          </div>

          <Card className="border-0 shadow-elevated mt-4">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl font-display">Welcome</CardTitle>
              <CardDescription>
                Sign in to view and manage your bookings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Register</TabsTrigger>
                </TabsList>

                <TabsContent value="signin">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="customer-signin-email">Email</Label>
                      <Input
                        id="customer-signin-email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customer-signin-password">Password</Label>
                      <Input
                        id="customer-signin-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full gradient-primary hover:opacity-90"
                      disabled={loading}
                    >
                      {loading ? "Signing in..." : "Sign In"}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="customer-signup-name">Full Name</Label>
                      <Input
                        id="customer-signup-name"
                        type="text"
                        placeholder="Jane Smith"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customer-signup-email">Email</Label>
                      <Input
                        id="customer-signup-email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customer-signup-password">Password</Label>
                      <Input
                        id="customer-signup-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full gradient-primary hover:opacity-90"
                      disabled={loading}
                    >
                      {loading ? "Creating account..." : "Create Account"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              <Separator className="my-6" />

              <p className="text-center text-xs text-muted-foreground">
                Are you a business?{" "}
                <Link to="/auth" className="underline hover:text-foreground">
                  Sign in here
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
