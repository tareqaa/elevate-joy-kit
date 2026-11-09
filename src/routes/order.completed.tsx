import { createFileRoute } from "@tanstack/react-router";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";
import { OrderCompletedView } from "@/components/gx/OrderCompletedView";

export const Route = createFileRoute("/order/completed")({
  validateSearch: (search: Record<string, unknown>) => ({
    order_token: typeof search.order_token === "string" ? search.order_token : "",
  }),
  head: () => ({
    meta: [
      { title: "استلام وتفعيل الطلب | متجر GX Store" },
      { name: "description", content: "استلام وتفعيل طلبك الرقمي بسهولة وأمان عبر متجر GX Store" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: STORE_HEAD_LINKS,
  }),
  component: OrderCompletedRouteComponent,
});

function OrderCompletedRouteComponent() {
  const { order_token } = Route.useSearch();
  return <OrderCompletedView orderToken={order_token} />;
}
