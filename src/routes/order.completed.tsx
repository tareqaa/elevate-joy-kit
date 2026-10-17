import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { StoreShell } from "@/components/gx/StoreShell";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";
import { useLang } from "@/lib/gx/i18n";
import { getOrderByTokenFn, markCodeRevealedFn } from "@/lib/gx/order-email.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DriffleOrderDeliveryView } from "@/components/gx/DriffleOrderDeliveryView";

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
  component: OrderCompletedPage,
});

export function OrderCompletedPage() {
  const { order_token } = Route.useSearch();
  const { lang } = useLang();
  const isAr = lang === "ar";

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [revealedKeys, setRevealedKeys] = useState<Record<number, boolean>>({});

  useEffect(() => {
    let mounted = true;
    if (!order_token || !order_token.trim()) {
      setLoading(false);
      setError(
        isAr
          ? "الرابط غير صحيح أو منتهي الصلاحية. يرجى فتح الرابط السري المرسل إلى بريدك الإلكتروني."
          : "Invalid or expired link. Please open the link sent to your email address."
      );
      return;
    }

    setLoading(true);
    setError(null);

    getOrderByTokenFn({ data: { orderToken: order_token.trim() } })
      .then((res) => {
        if (!mounted) return;
        if (res.ok && res.order) {
          setOrder(res.order);
          if (res.order.codes_revealed_at) {
            setRevealedKeys({ 0: true, 1: true, 2: true, 3: true, 4: true });
          }
        } else {
          setError(res.error || (isAr ? "الرابط غير صالح أو منتهي الصلاحية" : "Invalid or expired link"));
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
  }, [order_token, isAr]);

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
        orderToken={order_token}
        revealedKeys={revealedKeys}
        copiedKey={copiedKey}
        onRevealKey={handleRevealKey}
        onCopyKey={copyToClipboard}
      />
    </StoreShell>
  );
}
