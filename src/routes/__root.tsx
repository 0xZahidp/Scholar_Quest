import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useRef, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";
import { XpFloatHost } from "@/components/XpFloat";
import { reportClientCrash } from "@/lib/crash-report.functions";

const SITE_NAME = "Scholar Quest";
const SITE_URL = (import.meta.env.VITE_APP_URL ?? "https://sq.zahidp.com").replace(/\/$/, "");
const SITE_TITLE =
  "Scholar Quest | Scholarship Planner, IELTS Tracker, and Application Dashboard";
const SITE_DESCRIPTION =
  "Plan fully funded scholarship applications, track IELTS progress, organize documents, shortlist universities, manage finances, and stay ready for deadlines.";
const SOCIAL_DESCRIPTION =
  "A focused dashboard for scholarship deadlines, IELTS prep, university shortlists, documents, finances, visa tasks, and departure planning.";
const SOCIAL_IMAGE = `${SITE_URL}/logo.svg`;

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
  const reportCrash = useServerFn(reportClientCrash);

  useEffect(() => {
    console.error("[RootErrorBoundary]", error);
    void reportCrash({
      data: {
        message: error.message || "Route render crash",
        stack: error.stack,
        url: typeof window === "undefined" ? undefined : window.location.href,
        userAgent: typeof navigator === "undefined" ? undefined : navigator.userAgent,
        route:
          typeof window === "undefined"
            ? undefined
            : `${window.location.pathname}${window.location.search}`,
        extra: { boundary: "root-route" },
      },
    }).catch(() => {
      /* reporting must never block recovery */
    });
  }, [error, reportCrash]);

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
        title: SITE_TITLE,
      },
      {
        name: "description",
        content: SITE_DESCRIPTION,
      },
      {
        name: "keywords",
        content:
          "scholarship planner, fully funded scholarships, study abroad dashboard, IELTS tracker, university applications, scholarship documents, graduate scholarships",
      },
      { name: "robots", content: "index, follow" },
      { name: "author", content: SITE_NAME },
      { name: "application-name", content: SITE_NAME },
      { name: "apple-mobile-web-app-title", content: SITE_NAME },
      { name: "theme-color", content: "#0a0a1a" },
      { property: "og:site_name", content: SITE_NAME },
      {
        property: "og:title",
        content: "Scholar Quest | Scholarship Application Command Center",
      },
      {
        property: "og:description",
        content: SOCIAL_DESCRIPTION,
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_URL },
      { property: "og:image", content: SOCIAL_IMAGE },
      { property: "og:image:type", content: "image/svg+xml" },
      { property: "og:image:width", content: "512" },
      { property: "og:image:height", content: "512" },
      { property: "og:image:alt", content: "Scholar Quest graduation cap logo" },
      { property: "og:locale", content: "en_US" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: SITE_TITLE },
      {
        name: "twitter:description",
        content:
          "Track every step from IELTS prep to scholarship submission in one focused study abroad dashboard.",
      },
      { name: "twitter:image", content: SOCIAL_IMAGE },
      { name: "twitter:image:alt", content: "Scholar Quest graduation cap logo" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "canonical", href: SITE_URL },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "apple-touch-icon", href: "/logo.svg" },
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body suppressHydrationWarning>
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
      <ClientCrashReporter />
      <AuthInvalidator />
      <Outlet />
      <Toaster theme="dark" position="top-right" />
      <XpFloatHost />
    </QueryClientProvider>
  );
}

function getUnknownErrorDetails(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message || "Unhandled browser error",
      stack: error.stack,
    };
  }

  if (typeof error === "string") {
    return { message: error };
  }

  return {
    message: "Unhandled browser error",
    stack: JSON.stringify(error, null, 2),
  };
}

function ClientCrashReporter() {
  const reportCrash = useServerFn(reportClientCrash);
  const lastReportAt = useRef(0);

  useEffect(() => {
    const send = (error: unknown, extra: Record<string, unknown>) => {
      const now = Date.now();
      if (now - lastReportAt.current < 5000) return;
      lastReportAt.current = now;

      const details = getUnknownErrorDetails(error);
      void reportCrash({
        data: {
          message: details.message,
          stack: details.stack,
          url: window.location.href,
          userAgent: navigator.userAgent,
          route: `${window.location.pathname}${window.location.search}`,
          extra,
        },
      }).catch(() => {
        /* reporting must never create another crash */
      });
    };

    const onError = (event: ErrorEvent) => {
      send(event.error ?? event.message, {
        kind: "window-error",
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      send(event.reason, { kind: "unhandled-rejection" });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, [reportCrash]);

  return null;
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
