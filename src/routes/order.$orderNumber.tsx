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

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    getOrderByNumberFn({
      data: {
        orderNumber,
        orderToken: order_token || undefined,
      },
    })
      .then((res) => {
        if (!mounted) return;
        if (res.ok && res.order) {
          setOrder(res.order);
          setIsLocked(Boolean(res.isLocked));
          if (res.order.codes_revealed_at) {
            const map: Record<number, boolean> = {}; for (let k = 0; k < 100; k++) map[k] = true; setRevealedKeys(map);
          }
        } else {
          setError(res.error || (isAr ? "لم يتم العثور على هذا الطلب" : "Order not found"));
        }
      })
      .catch((err) => {
        if (mounted) setError(err.message || (isAr ? "حدث خطأ أثناء تحميل الطلب" : "Failed to load order"));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [orderNumber, order_token, isAr]);

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

      if (order_token || order?.order_number) {
        markCodeRevealedFn({
          data: {
            orderToken: order_token ? order_token.trim() : undefined,
            orderNumber: order?.order_number ? String(order.order_number).trim() : undefined,
          },
        }).catch(() => {});
      }
    } catch {
      toast.error(isAr ? "فشل النسخ تلقائياً" : "Failed to copy");
    }
  };

  const handleRevealKey = async (idx: number) => {
    setRevealedKeys((prev) => ({ ...prev, [idx]: true }));
    const num = order?.order_number ? String(order.order_number).trim() : undefined;
    if (num) {
      try {
        await (supabase.rpc as any)("mark_order_code_revealed", {
          p_order_number: num,
          p_order_id: order?.id || null,
        });
      } catch {}
    }
    if (order_token || num) {
      try {
        await markCodeRevealedFn({
          data: {
            orderToken: order_token ? order_token.trim() : undefined,
            orderNumber: num,
          },
        });
      } catch {
        // silent
      }
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
