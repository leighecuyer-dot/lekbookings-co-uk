import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle, Mail, Building2 } from "lucide-react";

type InviteStatus = "loading" | "valid" | "invalid" | "expired" | "accepted" | "accepting" | "success";

interface InviteDetails {
  email: string;
  role: string;
  businessName: string;
  expiresAt: string;
}

export default function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const { user, loading: authLoading, signIn, signUp } = useAuth();
  const { toast } = useToast();

  const [status, setStatus] = useState<InviteStatus>("loading");
  const [inviteDetails, setInviteDetails] = useState<InviteDetails | null>(null);
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Verify invite token on mount
  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }

    async function verifyToken() {
      const { data, error } = await supabase.rpc("get_invite_details", {
        _token: token,
      });

      const invite = Array.isArray(data) ? data[0] : data;

      if (error || !invite) {
        setStatus("invalid");
        return;
      }

      if (invite.accepted_at) {
        setStatus("accepted");
        return;
      }

      if (new Date(invite.expires_at) < new Date()) {
        setStatus("expired");
        return;
      }

      setInviteDetails({
        email: invite.email,
        role: invite.role,
        businessName: invite.business_name || "Unknown Business",
        expiresAt: invite.expires_at,
      });
      setEmail(invite.email);
      setStatus("valid");
    }


    verifyToken();
  }, [token]);

  // Accept invite when user is authenticated
  const acceptInvite = async () => {
    if (!token || !user) return;

    setStatus("accepting");

    const { data, error } = await supabase.rpc("accept_business_invite", {
      _token: token,
    });

    if (error) {
      console.error("Accept invite error:", error);
      toast({
        title: "Failed to accept invite",
        description: error.message,
        variant: "destructive",
      });
      setStatus("valid");
      return;
    }

    setStatus("success");
    toast({
      title: "Invitation accepted!",
      description: `You now have access to ${inviteDetails?.businessName}`,
    });

    // Redirect to dashboard after a short delay
    setTimeout(() => {
      navigate("/dashboard");
    }, 2000);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthSubmitting(true);

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          toast({
            title: "Sign up failed",
            description: error.message,
            variant: "destructive",
          });
          return;
        }
        toast({
          title: "Account created!",
          description: "You can now accept your invitation.",
        });
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            title: "Sign in failed",
            description: error.message,
            variant: "destructive",
          });
          return;
        }
      }
    } finally {
      setAuthSubmitting(false);
    }
  };

  if (authLoading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verifying invitation...</p>
        </div>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>
              This invitation link is invalid or has been revoked.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild>
              <Link to="/">Go to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "expired") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
            <CardTitle>Invitation Expired</CardTitle>
            <CardDescription>
              This invitation has expired. Please contact the business owner for a new invitation.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild>
              <Link to="/">Go to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "accepted") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-primary mx-auto mb-2" />
            <CardTitle>Already Accepted</CardTitle>
            <CardDescription>
              This invitation has already been accepted.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild>
              <Link to="/dashboard">Go to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-primary mx-auto mb-2" />
            <CardTitle>Welcome!</CardTitle>
            <CardDescription>
              You now have access to {inviteDetails?.businessName}. Redirecting to dashboard...
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Valid invite - show accept UI
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <p className="text-2xl font-bold tracking-tight mb-2">LEK</p>
          <Building2 className="h-10 w-10 text-primary mx-auto mb-2" />
          <CardTitle>You're Invited!</CardTitle>
          <CardDescription>
            You've been invited to join <strong>{inviteDetails?.businessName}</strong> as a{" "}
            <strong className="capitalize">{inviteDetails?.role}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {user ? (
            // User is logged in - show accept button
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{user.email}</span>
              </div>
              <Button
                onClick={acceptInvite}
                disabled={status === "accepting"}
                className="w-full"
              >
                {status === "accepting" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Accepting...
                  </>
                ) : (
                  "Accept Invitation"
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Not the right account?{" "}
                <button
                  onClick={() => supabase.auth.signOut()}
                  className="text-primary hover:underline"
                >
                  Sign out
                </button>
              </p>
            </div>
          ) : (
            // User not logged in - show auth form
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg mb-4">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{inviteDetails?.email}</span>
              </div>

              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your name"
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isSignUp ? "Create a password" : "Enter your password"}
                  required
                  minLength={6}
                />
              </div>

              <Button type="submit" className="w-full" disabled={authSubmitting}>
                {authSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isSignUp ? "Creating account..." : "Signing in..."}
                  </>
                ) : isSignUp ? (
                  "Create Account & Accept"
                ) : (
                  "Sign In & Accept"
                )}
              </Button>

              <p className="text-sm text-center text-muted-foreground">
                {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-primary hover:underline"
                >
                  {isSignUp ? "Sign in" : "Sign up"}
                </button>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
