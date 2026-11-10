import { createFileRoute } from "@tanstack/react-router";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";
import { OrderCompletedView } from "@/components/gx/OrderCompletedView";
import { getHeadLang } from "@/lib/gx/i18n";

export const Route = createFileRoute("/guest/order/completed")({
  validateSearch: (search: Record<string, unknown>) => ({
    order_token: typeof search.order_token === "string" ? search.order_token : "",
  }),
  head: () => {
    const isEn = getHeadLang() === "en";
    return {
      meta: [
        { title: isEn ? "Order Delivery & Activation | GX Store" : "استلام وتفعيل الطلب | متجر GX Store" },
        {
          name: "description",
          content: isEn
            ? "Receive and activate your digital guest order securely via GX Store"
            : "استلام وتفعيل طلب الزائر الرقمي بأمان عبر متجر GX Store",
        },
        { name: "robots", content: "noindex, nofollow" },
      ],
      links: STORE_HEAD_LINKS,
    };
  },
  component: GuestOrderCompletedRouteComponent,
});

function GuestOrderCompletedRouteComponent() {
  const { order_token } = Route.useSearch();
  return <OrderCompletedView orderToken={order_token} />;
}
