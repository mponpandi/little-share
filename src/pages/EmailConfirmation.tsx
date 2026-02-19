import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift, Mail, CheckCircle2, Loader2 } from "lucide-react";

export default function EmailConfirmation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"waiting" | "success" | "error">("waiting");
  const email = searchParams.get("email") || "";

  useEffect(() => {
    // Listen for auth state change (user clicks confirmation link and gets logged in)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        // User confirmed email and got signed in — sign them out and show success
        supabase.auth.signOut().then(() => {
          setStatus("success");
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (status === "success") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="gradient-primary p-6 pb-16 rounded-b-[2rem]">
          <div className="flex items-center justify-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Gift className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-heading font-bold text-white">LittleShare</h1>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-4 -mt-8">
          <Card className="border-0 shadow-card w-full max-w-md">
            <CardContent className="p-8 text-center space-y-6">
              <div className="mx-auto w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-heading font-bold text-foreground">Email Verified!</h2>
                <p className="text-muted-foreground">
                  Your email has been successfully verified. You can now log in to your account.
                </p>
              </div>
              <Button
                className="w-full gradient-primary text-white"
                onClick={() => navigate("/auth")}
              >
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="gradient-primary p-6 pb-16 rounded-b-[2rem]">
        <div className="flex items-center justify-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
            <Gift className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-heading font-bold text-white">LittleShare</h1>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 -mt-8">
        <Card className="border-0 shadow-card w-full max-w-md">
          <CardContent className="p-8 text-center space-y-6">
            <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="w-10 h-10 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-heading font-bold text-foreground">Check Your Email</h2>
              <p className="text-muted-foreground">
                We've sent a confirmation link to{" "}
                <span className="font-semibold text-foreground">{email}</span>.
                Click the link in your email to verify your account.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Waiting for confirmation...</span>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-left">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground">Check your email inbox for the confirmation link</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground">Also check your spam/junk folder</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground">The link expires in 24 hours</p>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("/auth")}
            >
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
