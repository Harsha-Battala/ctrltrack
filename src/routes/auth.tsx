import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import logoSrc from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — CtrlTrack" },
      { name: "description", content: "Sign in or create your CtrlTrack account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        toast.success("Account created! You're in.");
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Reset link sent — check your inbox.");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error(result.error.message ?? "Google sign-in failed");
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background bg-hero">
      <div className="mx-auto flex max-w-md flex-col px-6 py-10">
        <Link to="/" className="mb-10 flex items-center gap-2 font-bold tracking-tight">
          <img src={logoSrc} alt="CtrlTrack" className="h-9 w-9 rounded-lg object-contain" />
          <span className="font-display">CtrlTrack</span>
        </Link>

        <div className="rounded-2xl border border-border bg-gradient-surface p-6 shadow-card backdrop-blur">
          <h1 className="text-2xl font-semibold">
            {mode === "signup" ? "Create your account" : mode === "forgot" ? "Reset password" : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signup" ? "Start tracking your goals in seconds." : mode === "forgot" ? "We'll email you a reset link." : "Sign in to your command center."}
          </p>

          {mode !== "forgot" && (
            <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="mt-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
              </TabsList>
              <TabsContent value={mode} />
            </Tabs>
          )}

          <form onSubmit={handleEmailAuth} className="mt-4 space-y-3">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            {mode !== "forgot" && (
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
              </div>
            )}
            <Button type="submit" disabled={busy} className="w-full bg-gradient-primary shadow-elegant">
              {busy ? "Please wait…" : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}
            </Button>
          </form>

          {mode !== "forgot" && (
            <>
              <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
                <div className="h-px flex-1 bg-border" /> OR <div className="h-px flex-1 bg-border" />
              </div>
              <Button type="button" variant="outline" className="w-full" onClick={handleGoogle} disabled={busy}>
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path fill="#EA4335" d="M12 11v3.2h4.6c-.2 1.2-1.4 3.5-4.6 3.5-2.8 0-5-2.3-5-5.1s2.2-5.1 5-5.1c1.6 0 2.6.7 3.2 1.2l2.2-2.1C15.9 5.3 14.1 4.5 12 4.5 7.9 4.5 4.6 7.8 4.6 12s3.3 7.5 7.4 7.5c4.3 0 7.1-3 7.1-7.2 0-.5 0-.9-.1-1.3H12z"/></svg>
                Continue with Google
              </Button>
            </>
          )}

          <div className="mt-4 text-center text-sm text-muted-foreground">
            {mode === "forgot" ? (
              <button onClick={() => setMode("signin")} className="text-primary hover:underline">
                Back to sign in
              </button>
            ) : (
              <button onClick={() => setMode("forgot")} className="text-primary hover:underline">
                Forgot password?
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}