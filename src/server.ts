import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
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

// A client that navigates away / reloads mid-response aborts the socket. That
// surfaces as ECONNRESET / AbortError and must NOT be reported as an app error.
function isClientDisconnect(error: unknown): boolean {
  const seen = new Set<unknown>();
  let cur: any = error;
  while (cur && typeof cur === "object" && !seen.has(cur)) {
    seen.add(cur);
    if (cur.name === "AbortError" || cur.code === "ECONNRESET" || cur.code === "ABORT_ERR") return true;
    if (typeof cur.message === "string" && /aborted|ECONNRESET|socket hang up/i.test(cur.message)) return true;
    cur = cur.cause;
  }
  return false;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(
  response: Response,
  request: Request,
): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  const captured = consumeLastCapturedError();
  // Either the abort reached our capture hook, or the socket is simply gone
  // (h3 hides the cause, so an aborted signal with no captured error is one).
  if (isClientDisconnect(captured) || (!captured && request.signal?.aborted)) {
    // Nothing to show — the client is already gone.
    return new Response(null, { status: 499 });
  }

  console.error(captured ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}


function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

function applySecurityHeaders(res: Response, req: Request): Response {
  if (res.status === 101) return res;

  const isHttps =
    req.url.startsWith("https://") ||
    req.headers.get("x-forwarded-proto") === "https" ||
    req.headers.get("cf-visitor")?.includes('"scheme":"https"');

  try {
    res.headers.set("X-Frame-Options", "SAMEORIGIN");
    res.headers.set("X-Content-Type-Options", "nosniff");
    res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    if (isHttps) {
      res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
    }
    return res;
  } catch {
    const headers = new Headers(res.headers);
    headers.set("X-Frame-Options", "SAMEORIGIN");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    if (isHttps) {
      headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
    }
    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers,
    });
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      const normalized = await normalizeCatastrophicSsrResponse(response, request);
      return applySecurityHeaders(normalized, request);
    } catch (error) {
      if (isClientDisconnect(error) || request.signal?.aborted) {
        return new Response(null, { status: 499 });
      }
      console.error(error);

      const errorResponse = new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
      return applySecurityHeaders(errorResponse, request);
    }
  },
};
