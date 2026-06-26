import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { StarField } from "@/components/StarField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAuthRedirectUrl } from "@/lib/app-url";
import { toast } from "sonner";
import { Rocket, Mail, Lock } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({ meta: [{ title: "Sign in — Operation Global Scholar" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    mode: s.mode === "signin" || s.mode === "signup" || s.mode === "forgot" ? s.mode : undefined,
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const appRedirectUrl = getAuthRedirectUrl("/auth");
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">(search.mode ?? "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) navigate({ to: "/dashboard", replace: true });
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: appRedirectUrl,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Mission activated. Welcome, Scholar.");
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back, Commander.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: getAuthRedirectUrl("/reset-password"),
        });
        if (error) throw error;
        toast.success("Recovery transmission sent. Check your inbox.");
        setMode("signin");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: appRedirectUrl },
      });
      if (error) throw error;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative grid min-h-screen place-items-center px-4">
      <StarField density={100} />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass relative z-10 w-full max-w-md rounded-2xl p-8"
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent glow-primary">
            <Rocket className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="font-display text-lg font-bold">
              {mode === "signup"
                ? "Begin your mission"
                : mode === "signin"
                  ? "Welcome back"
                  : "Recover access"}
            </div>
            <div className="text-xs text-muted-foreground">
              {mode === "forgot" ? "We'll send a secure recovery link" : "Operation Global Scholar"}
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <Label htmlFor="name">Scholar name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>
          )}
          <div>
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@galaxy.dev"
                className="pl-9"
              />
            </div>
          </div>
          {mode !== "forgot" && (
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {mode === "signin" && (
                  <button
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="text-xs text-primary-glow hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9"
                />
              </div>
            </div>
          )}
          <Button
            type="submit"
            disabled={busy}
            className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground glow-primary"
          >
            {busy
              ? "..."
              : mode === "signup"
                ? "Activate mission"
                : mode === "signin"
                  ? "Re-enter command"
                  : "Send recovery link"}
          </Button>
        </form>

        {mode !== "forgot" && (
          <>
            <div className="my-4 flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
              <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
            </div>
            <Button variant="outline" onClick={google} disabled={busy} className="w-full">
              Continue with Google
            </Button>
          </>
        )}

        <button
          type="button"
          onClick={() =>
            setMode(mode === "signup" ? "signin" : mode === "signin" ? "signup" : "signin")
          }
          className="mt-6 block w-full text-center text-sm text-muted-foreground hover:text-foreground"
        >
          {mode === "signup"
            ? "Already enlisted? Sign in."
            : mode === "signin"
              ? "New scholar? Begin your mission."
              : "Back to sign in"}
        </button>
      </motion.div>
    </div>
  );
}
