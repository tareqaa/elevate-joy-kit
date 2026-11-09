import { createFileRoute } from "@tanstack/react-router";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";
import { OrderCompletedView } from "@/components/gx/OrderCompletedView";

export const Route = createFileRoute("/guest/order/completed")({
  validateSearch: (search: Record<string, unknown>) => ({
    order_token: typeof search.order_token === "string" ? search.order_token : "",
  }),
  head: () => ({
    meta: [
      { title: "استلام وتفعيل الطلب | متجر GX Store" },
      { name: "description", content: "استلام وتفعيل طلب الزائر الرقمي بأمان عبر متجر GX Store" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: STORE_HEAD_LINKS,
  }),
  component: GuestOrderCompletedRouteComponent,
});

function GuestOrderCompletedRouteComponent() {
  const { order_token } = Route.useSearch();
  return <OrderCompletedView orderToken={order_token} />;
}
