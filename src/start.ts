import { createStart, createMiddleware, createCsrfMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

function isStaleServerFunctionRequest(error: unknown) {
  if (error == null || typeof error !== "object") return false;
  const message = "message" in error ? String(error.message) : "";
  const stack = "stack" in error ? String(error.stack) : "";
  const staleMessage =
    message.includes("Cannot read properties of undefined (reading 'method')") ||
    message.includes("Invalid server function ID");
  return staleMessage && stack.includes("server-functions-handler");
}

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    if (isStaleServerFunctionRequest(error)) {
      return new Response("Stale server function request", { status: 410 });
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  requestMiddleware: [csrfMiddleware, errorMiddleware],
  functionMiddleware: [attachSupabaseAuth],
}));
