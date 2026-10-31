import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { StoreShell } from "@/components/gx/StoreShell";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";
import { useLang } from "@/lib/gx/i18n";
import { getOrderByNumberFn, markCodeRevealedFn } from "@/lib/gx/order-email.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DriffleOrderDeliveryView } from "@/components/gx/DriffleOrderDeliveryView";

export const Route = createFileRoute("/order/$orderNumber")({
  validateSearch: (search: Record<string, unknown>) => ({
    order_token: typeof search.order_token === "string" ? search.order_token : "",
  }),
  head: ({ params }) => ({
    meta: [
      { title: `طلب #${params.orderNumber} | متجر GX Store` },
      { name: "description", content: `استلام وتفعيل الطلب #${params.orderNumber} من متجر GX Store` },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: STORE_HEAD_LINKS,
  }),
  component: OrderDetailsPage,
});

function OrderDetailsPage() {
  const { orderNumber } = Route.useParams();
  const { order_token } = Route.useSearch();
  const { lang } = useLang();
  const isAr = lang === "ar";

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [revealedKeys, setRevealedKeys] = useState<Record<number, boolean>>({});

  const fetchOrder = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const res = await getOrderByNumberFn({
        data: {
          orderNumber,
          orderToken: order_token || undefined,
        },
      });
      if (res.ok && res.order) {
        setOrder(res.order);
        setIsLocked(Boolean(res.isLocked));
        const delCodes = (res.order.delivery_data && (res.order.delivery_data as any).codes) || [];
        const map: Record<number, boolean> = {};
        if (Array.isArray(delCodes)) {
          delCodes.forEach((c: any, i: number) => {
            if (c.revealed_at) map[i] = true;
          });
        }
        setRevealedKeys(map);
      } else if (!isBackground) {
        setError(res.error || (isAr ? "لم يتم العثور على هذا الطلب" : "Order not found"));
      }
    } catch (err: any) {
      if (!isBackground) setError(err.message || (isAr ? "حدث خطأ أثناء تحميل الطلب" : "Failed to load order"));
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder(false);
  }, [orderNumber, order_token, isAr]);

  // Realtime subscription: When admin modifies delivery_data or cancels a code, sync instantly!
  useEffect(() => {
    if (!order?.id) return;
    const channel = supabase
      .channel(`order-live-${order.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${order.id}`,
        },
        () => {
          fetchOrder(true);
        }
      )
      .subscribe();

    // 4-second background heartbeat while viewing order
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchOrder(true);
      }
    }, 4000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [order?.id, orderNumber, order_token]);

  const copyToClipboard = async (text: string, id: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopiedKey(id);
      toast.success(isAr ? "تم نسخ الكود بنجاح!" : "Copied to clipboard!");
      setTimeout(() => setCopiedKey(null), 2500);
    } catch {
      toast.error(isAr ? "فشل النسخ تلقائياً" : "Failed to copy");
    }
  };

  const handleRevealKey = async (idx: number) => {
    setRevealedKeys((prev) => ({ ...prev, [idx]: true }));
    const num = order?.order_number ? String(order.order_number).trim() : undefined;
    const tok = typeof order_token === "string" ? order_token.trim() : undefined;
    if (tok || num) {
      try {
        const res: any = await markCodeRevealedFn({
          data: {
            orderToken: tok,
            orderNumber: num,
            codeIndex: idx,
          },
        });
        if (res && res.codes) {
          setOrder((prev: any) => {
            if (!prev) return prev;
            return {
              ...prev,
              delivery_data: {
                ...(prev.delivery_data || {}),
                codes: res.codes,
              },
            };
          });
        }
      } catch {}
    }
  };

  return (
    <StoreShell>
      <DriffleOrderDeliveryView
        order={order}
        loading={loading}
        error={error}
        isLocked={isLocked}
        orderToken={order_token}
        revealedKeys={revealedKeys}
        copiedKey={copiedKey}
        onRevealKey={handleRevealKey}
        onCopyKey={copyToClipboard}
      />
    </StoreShell>
  );
}
