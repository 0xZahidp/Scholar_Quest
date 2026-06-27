import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { reportServerCrash } from "./lib/crash-report.server";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  const error = consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`);
  console.error(error);
  void reportServerCrash(error, { route: "ssr-response-normalizer" }).catch(() => {
    /* reporting must never break the error response */
  });
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isStaleServerFunctionRequest(error: unknown) {
  if (error == null || typeof error !== "object") return false;
  const message = "message" in error ? String(error.message) : "";
  const stack = "stack" in error ? String(error.stack) : "";
  const staleMessage =
    message.includes("Cannot read properties of undefined (reading 'method')") ||
    message.includes("Invalid server function ID");
  return staleMessage && stack.includes("server-functions-handler");
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      if (isStaleServerFunctionRequest(error)) {
        return new Response("Stale server function request", { status: 410 });
      }
      console.error(error);
      void reportServerCrash(error, { route: request.url }).catch(() => {
        /* reporting must never break the error response */
      });
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
