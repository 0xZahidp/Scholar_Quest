import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getAuthRedirectUrl } from "@/lib/app-url";
import { toast } from "sonner";
import {
  Save,
  LogOut,
  User,
  Link2,
  Unlink,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  ShieldAlert,
  Trash2,
  MonitorSmartphone,
} from "lucide-react";
import { getProfile, updateProfile } from "@/lib/profile.functions";
import { deleteAccount } from "@/lib/account.functions";
import { supabase } from "@/integrations/supabase/client";
import type { UserIdentity } from "@supabase/supabase-js";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — OGS" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const get = useServerFn(getProfile);
  const save = useServerFn(updateProfile);
  const q = useQuery({ queryKey: ["profile"], queryFn: () => get() });

  const [form, setForm] = useState({
    display_name: "",
    target_departure_date: "",
    budget_goal: 0,
    budget_saved: 0,
    has_passport: false,
  });
  useEffect(() => {
    if (q.data) {
      setForm({
        display_name: q.data.display_name ?? "",
        target_departure_date: q.data.target_departure_date ?? "",
        budget_goal: Number(q.data.budget_goal ?? 0),
        budget_saved: Number(q.data.budget_saved ?? 0),
        has_passport: !!q.data.has_passport,
      });
    }
  }, [q.data]);

  const mut = useMutation({
    mutationFn: () =>
      save({
        data: {
          display_name: form.display_name,
          target_departure_date: form.target_departure_date || null,
          budget_goal: form.budget_goal,
          budget_saved: form.budget_saved,
          has_passport: form.has_passport,
        },
      }),
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const signOutOthers = async () => {
    try {
      const { error } = await supabase.auth.signOut({ scope: "others" });
      if (error) throw error;
      toast.success("Signed out of all other devices.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not sign out other sessions");
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">
          Commander Profile
        </div>
        <h1 className="font-display text-3xl font-bold">Settings</h1>
      </div>

      <GlassCard>
        <div className="mb-4 flex items-center gap-2">
          <User className="h-4 w-4 text-primary-glow" />
          <h3 className="font-display text-lg font-semibold">Profile</h3>
        </div>
        <div className="grid gap-4">
          <Field label="Display name">
            <Input
              value={form.display_name}
              onChange={(e) => setForm({ ...form, display_name: e.target.value })}
            />
          </Field>
          <Field label="Target departure date">
            <Input
              type="date"
              value={form.target_departure_date}
              onChange={(e) => setForm({ ...form, target_departure_date: e.target.value })}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Budget goal (USD)">
              <Input
                type="number"
                min={0}
                value={form.budget_goal}
                onChange={(e) => setForm({ ...form, budget_goal: Number(e.target.value) || 0 })}
              />
            </Field>
            <Field label="Saved so far (USD)">
              <Input
                type="number"
                min={0}
                value={form.budget_saved}
                onChange={(e) => setForm({ ...form, budget_saved: Number(e.target.value) || 0 })}
              />
            </Field>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border bg-card/40 p-3">
            <div>
              <div className="text-sm font-medium">Passport in hand</div>
              <div className="text-xs text-muted-foreground">
                Required for all visa applications.
              </div>
            </div>
            <Switch
              checked={form.has_passport}
              onCheckedChange={(v) => setForm({ ...form, has_passport: v })}
            />
          </div>
          <Button
            onClick={() => mut.mutate()}
            disabled={mut.isPending}
            className="bg-gradient-to-r from-primary to-accent text-primary-foreground glow-primary"
          >
            <Save className="mr-1.5 h-4 w-4" /> Save changes
          </Button>
        </div>
      </GlassCard>

      <LinkedAccounts />

      <ChangePassword />

      <GlassCard delay={0.2}>
        <div className="mb-4 flex items-center gap-2">
          <MonitorSmartphone className="h-4 w-4 text-primary-glow" />
          <h3 className="font-display text-lg font-semibold">Sessions</h3>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          Sign out of this device, or kick every other device that's signed into your mission.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={signOut}>
            <LogOut className="mr-1.5 h-4 w-4" /> Sign out this device
          </Button>
          <Button variant="outline" onClick={signOutOthers}>
            <MonitorSmartphone className="mr-1.5 h-4 w-4" /> Sign out all other devices
          </Button>
        </div>
      </GlassCard>

      <DangerZone />
    </div>
  );
}

function DangerZone() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const del = useServerFn(deleteAccount);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (confirm !== "DELETE") return toast.error("Type DELETE to confirm.");
    setBusy(true);
    try {
      await del();
      await qc.cancelQueries();
      qc.clear();
      await supabase.auth.signOut();
      toast.success("Account deleted. Safe travels, Commander.");
      navigate({ to: "/", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete account");
      setBusy(false);
    }
  };

  return (
    <GlassCard delay={0.25} className="border-destructive/40">
      <div className="mb-4 flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 text-destructive" />
        <h3 className="font-display text-lg font-semibold text-destructive">Danger zone</h3>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Permanently delete your account, profile, XP history, scholarship list, documents, and
        uploaded files. This cannot be undone.
      </p>
      <div className="space-y-3">
        <Field label="Type DELETE to confirm">
          <Input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="DELETE"
            className="border-destructive/40"
          />
        </Field>
        <Button
          variant="destructive"
          onClick={submit}
          disabled={busy || confirm !== "DELETE"}
          className="w-full"
        >
          <Trash2 className="mr-1.5 h-4 w-4" />
          {busy ? "Deleting…" : "Permanently delete my account"}
        </Button>
      </div>
    </GlassCard>
  );
}

function LinkedAccounts() {
  const [identities, setIdentities] = useState<UserIdentity[]>([]);
  const [email, setEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);

  const refresh = async () => {
    const { data } = await supabase.auth.getUser();
    setEmail(data.user?.email ?? null);
    setIdentities(data.user?.identities ?? []);
  };
  useEffect(() => {
    refresh();
  }, []);

  const hasGoogle = identities.some((i) => i.provider === "google");
  const hasEmail = identities.some((i) => i.provider === "email");

  const linkGoogle = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.auth.linkIdentity({
        provider: "google",
        options: { redirectTo: getAuthRedirectUrl("/settings") },
      });
      if (error) throw error;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not link Google");
      setBusy(false);
    }
  };

  const unlink = async (identity: UserIdentity) => {
    if (identities.length <= 1) return toast.error("Keep at least one sign-in method.");
    setBusy(true);
    try {
      const { error } = await supabase.auth.unlinkIdentity(identity);
      if (error) throw error;
      toast.success(`Unlinked ${identity.provider}`);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unlink failed");
    } finally {
      setBusy(false);
    }
  };

  const sendReset = async () => {
    if (!email) return;
    setResetBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getAuthRedirectUrl("/reset-password"),
      });
      if (error) throw error;
      toast.success("Reset link sent to your inbox.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send reset");
    } finally {
      setResetBusy(false);
    }
  };

  return (
    <GlassCard delay={0.1}>
      <div className="mb-4 flex items-center gap-2">
        <Link2 className="h-4 w-4 text-primary-glow" />
        <h3 className="font-display text-lg font-semibold">Linked sign-in methods</h3>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Connect multiple providers to the same mission account. We auto-link providers that share
        your verified email.
      </p>
      <div className="space-y-2">
        {identities.map((identity) => (
          <div
            key={identity.id}
            className="flex items-center justify-between rounded-xl border border-border bg-card/40 p-3"
          >
            <div>
              <div className="text-sm font-medium capitalize">{identity.provider}</div>
              <div className="text-xs text-muted-foreground">
                {(identity.identity_data?.email as string) ?? "—"}
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              disabled={busy || identities.length <= 1}
              onClick={() => unlink(identity)}
            >
              <Unlink className="mr-1 h-3.5 w-3.5" /> Unlink
            </Button>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {!hasGoogle && (
          <Button variant="outline" size="sm" onClick={linkGoogle} disabled={busy}>
            <Link2 className="mr-1.5 h-4 w-4" /> Link Google
          </Button>
        )}
        {hasEmail && (
          <Button variant="outline" size="sm" onClick={sendReset} disabled={resetBusy}>
            <KeyRound className="mr-1.5 h-4 w-4" /> {resetBusy ? "Sending…" : "Reset password"}
          </Button>
        )}
      </div>
    </GlassCard>
  );
}

function ChangePassword() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hasEmail, setHasEmail] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setHasEmail(data.user?.identities?.some((i) => i.provider === "email") ?? false);
    });
  }, []);

  const submit = async () => {
    if (!next || next.length < 6) return toast.error("Password must be at least 6 characters.");
    if (next !== confirm) return toast.error("New passwords do not match.");
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) throw error;
      toast.success("Password updated successfully.");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  };

  if (!hasEmail) return null;

  return (
    <GlassCard delay={0.15}>
      <div className="mb-4 flex items-center gap-2">
        <Lock className="h-4 w-4 text-primary-glow" />
        <h3 className="font-display text-lg font-semibold">Change password</h3>
      </div>
      <div className="grid gap-4">
        <Field label="New password">
          <div className="relative">
            <Input
              type={show ? "text" : "password"}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              placeholder="At least 6 characters"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>
        <Field label="Confirm new password">
          <Input
            type={show ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Re-enter new password"
          />
        </Field>
        <Button
          onClick={submit}
          disabled={busy || !next || !confirm}
          className="bg-gradient-to-r from-primary to-accent text-primary-foreground glow-primary"
        >
          <KeyRound className="mr-1.5 h-4 w-4" />
          {busy ? "Updating…" : "Update password"}
        </Button>
      </div>
    </GlassCard>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
