import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";
import { XpFloatHost } from "@/components/XpFloat";

function NotFoundComponent() {
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="glass max-w-md rounded-2xl p-8 text-center">
        <div className="font-display text-7xl font-bold text-gradient">404</div>
        <h2 className="mt-3 font-display text-xl">Mission target not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This sector of the galaxy is uncharted. Return to base.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground glow-primary"
        >
          Return to base
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    console.error("[RootErrorBoundary]", error);
  }, [error]);
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="glass max-w-md rounded-2xl p-8 text-center">
        <h1 className="font-display text-xl">Mission interrupted</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          An unexpected anomaly occurred. Our team has been notified.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Retry
          </button>
          <a href="/" className="rounded-xl border border-border px-4 py-2 text-sm">
            Home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      {
        title:
          "Operation Global Scholar | Scholarship Planner, IELTS Tracker, and Application Dashboard",
      },
      {
        name: "description",
        content:
          "Plan fully funded scholarship applications, track IELTS progress, organize documents, shortlist universities, manage finances, and stay ready for deadlines.",
      },
      {
        name: "keywords",
        content:
          "scholarship planner, fully funded scholarships, study abroad dashboard, IELTS tracker, university applications, scholarship documents, graduate scholarships",
      },
      { name: "robots", content: "index, follow" },
      { name: "author", content: "Operation Global Scholar" },
      { name: "theme-color", content: "#0a0a1a" },
      { property: "og:site_name", content: "Operation Global Scholar" },
      {
        property: "og:title",
        content: "Operation Global Scholar | Scholarship Application Command Center",
      },
      {
        property: "og:description",
        content:
          "A focused dashboard for scholarship deadlines, IELTS prep, university shortlists, documents, finances, visa tasks, and departure planning.",
      },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "en_US" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Operation Global Scholar" },
      {
        name: "twitter:description",
        content:
          "Track every step from IELTS prep to scholarship submission in one focused study abroad dashboard.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthInvalidator />
      <Outlet />
      <Toaster theme="dark" position="top-right" />
      <XpFloatHost />
    </QueryClientProvider>
  );
}

function AuthInvalidator() {
  const router = useRouter();
  const qc = useQueryClient();
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      router.invalidate();
      qc.invalidateQueries();
    });
    return () => subscription.unsubscribe();
  }, [router, qc]);
  return null;
}
