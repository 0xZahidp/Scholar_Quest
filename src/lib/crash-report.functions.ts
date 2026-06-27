import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { sendCrashReport } from "./crash-report.server";

const CrashReportSchema = z.object({
  message: z.string().min(1).max(500),
  stack: z.string().max(8000).optional(),
  componentStack: z.string().max(8000).optional(),
  url: z.string().max(1000).optional(),
  userAgent: z.string().max(1000).optional(),
  route: z.string().max(500).optional(),
  extra: z.record(z.unknown()).optional(),
});

export const reportClientCrash = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => CrashReportSchema.parse(d))
  .handler(async ({ data }) => {
    await sendCrashReport({
      source: "client",
      ...data,
    });

    return { ok: true };
  });
