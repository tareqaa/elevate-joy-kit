/* ============================================================
   TEMPORARY TEST ENDPOINT — server-side price verification.
   Dev-only (returns 404 in production). Delete after verifying:
     rm src/routes/api/public/temp-price-test.ts scripts/temp-order-price-test.mjs
   ============================================================ */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/temp-price-test")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (process.env.NODE_ENV === "production") {
          return new Response("Not found", { status: 404 });
        }
        const input = (await request.json()) as Record<string, unknown>;
        try {
          const { createStoreOrder } = await import("@/lib/gx/orders.server");
          const result = await createStoreOrder(input as never);
          return Response.json({ ok: true, ...result });
        } catch (e) {
          return Response.json({ ok: false, error: (e as Error).message });
        }
      },
    },
  },
});
