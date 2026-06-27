type CrashReportInput = {
  source: "client" | "server";
  message: string;
  stack?: string;
  componentStack?: string;
  url?: string;
  userAgent?: string;
  route?: string;
  extra?: Record<string, unknown>;
};

type CrashReportResult =
  | { sent: true }
  | { sent: false; reason: "missing-api-key" | "deduped" | "resend-error" };

const DEFAULT_REPORT_TO = "mdzahidhasanpatwary@gmail.com";
const DEFAULT_FROM = "Scholar Quest <onboarding@resend.dev>";
const MAX_FIELD_LENGTH = 8000;
const DEDUPE_WINDOW_MS = 60_000;

const recentReports = new Map<string, number>();

function trim(value: unknown, max = MAX_FIELD_LENGTH) {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized ? normalized.slice(0, max) : undefined;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toErrorInput(
  error: unknown,
  fallbackMessage: string,
): Pick<CrashReportInput, "message" | "stack"> {
  if (error instanceof Error) {
    return {
      message: error.message || fallbackMessage,
      stack: error.stack,
    };
  }

  if (typeof error === "string") {
    return { message: error || fallbackMessage };
  }

  return {
    message: fallbackMessage,
    stack: trim(JSON.stringify(error, null, 2)),
  };
}

function getFingerprint(input: CrashReportInput) {
  const stackHead = input.stack?.split("\n").slice(0, 3).join("\n") ?? "";
  return [input.source, input.url, input.message, stackHead].join("|");
}

function isDuplicate(input: CrashReportInput) {
  const now = Date.now();
  const fingerprint = getFingerprint(input);
  const lastSentAt = recentReports.get(fingerprint);

  for (const [key, sentAt] of recentReports) {
    if (now - sentAt > DEDUPE_WINDOW_MS) recentReports.delete(key);
  }

  if (lastSentAt && now - lastSentAt < DEDUPE_WINDOW_MS) return true;
  recentReports.set(fingerprint, now);
  return false;
}

function formatReport(input: CrashReportInput) {
  const message = trim(input.message, 500) ?? "Unknown crash";
  const report = {
    source: input.source,
    message,
    url: trim(input.url, 1000),
    route: trim(input.route, 500),
    userAgent: trim(input.userAgent, 1000),
    stack: trim(input.stack),
    componentStack: trim(input.componentStack),
    extra: input.extra,
    reportedAt: new Date().toISOString(),
  };

  const text = [
    `Source: ${report.source}`,
    `Message: ${report.message}`,
    `URL: ${report.url ?? "n/a"}`,
    `Route: ${report.route ?? "n/a"}`,
    `User agent: ${report.userAgent ?? "n/a"}`,
    "",
    "Stack:",
    report.stack ?? "n/a",
    "",
    "Component stack:",
    report.componentStack ?? "n/a",
    "",
    "Extra:",
    JSON.stringify(report.extra ?? {}, null, 2),
    "",
    `Reported at: ${report.reportedAt}`,
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
      <h2>Scholar Quest crash report</h2>
      <p><strong>Source:</strong> ${escapeHtml(report.source)}</p>
      <p><strong>Message:</strong> ${escapeHtml(report.message)}</p>
      <p><strong>URL:</strong> ${escapeHtml(report.url ?? "n/a")}</p>
      <p><strong>Route:</strong> ${escapeHtml(report.route ?? "n/a")}</p>
      <p><strong>User agent:</strong> ${escapeHtml(report.userAgent ?? "n/a")}</p>
      <h3>Stack</h3>
      <pre style="white-space:pre-wrap;background:#f6f8fa;padding:12px;border-radius:6px">${escapeHtml(report.stack ?? "n/a")}</pre>
      <h3>Component stack</h3>
      <pre style="white-space:pre-wrap;background:#f6f8fa;padding:12px;border-radius:6px">${escapeHtml(report.componentStack ?? "n/a")}</pre>
      <h3>Extra</h3>
      <pre style="white-space:pre-wrap;background:#f6f8fa;padding:12px;border-radius:6px">${escapeHtml(JSON.stringify(report.extra ?? {}, null, 2))}</pre>
      <p><strong>Reported at:</strong> ${escapeHtml(report.reportedAt)}</p>
    </div>
  `;

  return {
    subject: `Scholar Quest crash: ${message}`.slice(0, 120),
    text,
    html,
  };
}

export async function sendCrashReport(input: CrashReportInput): Promise<CrashReportResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { sent: false, reason: "missing-api-key" };

  const normalized: CrashReportInput = {
    source: input.source,
    message: trim(input.message, 500) ?? "Unknown crash",
    stack: trim(input.stack),
    componentStack: trim(input.componentStack),
    url: trim(input.url, 1000),
    userAgent: trim(input.userAgent, 1000),
    route: trim(input.route, 500),
    extra: input.extra,
  };

  if (isDuplicate(normalized)) return { sent: false, reason: "deduped" };

  const to = process.env.CRASH_REPORT_TO || DEFAULT_REPORT_TO;
  const from = process.env.RESEND_FROM_EMAIL || DEFAULT_FROM;
  const formatted = formatReport(normalized);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: formatted.subject,
      text: formatted.text,
      html: formatted.html,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error(`[CrashReport] Resend failed (${response.status}): ${detail}`);
    return { sent: false, reason: "resend-error" };
  }

  return { sent: true };
}

export function reportServerCrash(
  error: unknown,
  extra?: Omit<CrashReportInput, "source" | "message" | "stack">,
) {
  const parsed = toErrorInput(error, "Server crash");
  return sendCrashReport({
    source: "server",
    ...parsed,
    ...extra,
  });
}
