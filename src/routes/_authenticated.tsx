import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { StarField } from "@/components/StarField";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);
  if (!session) return null;
  return (
    <SidebarProvider>
      <div className="relative flex min-h-screen w-full">
        <StarField density={70} />
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-12 items-center gap-2 border-b border-border/40 bg-background/40 px-3 backdrop-blur-xl">
            <SidebarTrigger />
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Mission Control</div>
          </header>
          <main className="flex-1 p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
