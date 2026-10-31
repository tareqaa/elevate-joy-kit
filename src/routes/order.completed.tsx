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
  const [isLocked, setIsLocked] = useState(false);
  const [ipMismatchInfo, setIpMismatchInfo] = useState<{
    mismatch: boolean;
    purchaseIp?: string | null;
    currentIp?: string | null;
    customerEmail?: string | null;
    orderNumber?: string | null;
  } | null>(null);

  const fetchOrder = async (isBackground = false) => {
    if (!order_token || !order_token.trim()) {
      if (!isBackground) {
        setLoading(false);
        setError(
          isAr
            ? "الرابط غير صحيح أو منتهي الصلاحية. يرجى فتح الرابط السري المرسل إلى بريدك الإلكتروني."
            : "Invalid or expired link. Please open the link sent to your email address."
        );
      }
      return;
    }

    if (!isBackground) setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token || undefined;

      const res = await getOrderByTokenFn({
        data: {
          orderToken: order_token.trim(),
          accessToken,
        },
      });

      if (res.ok) {
        if ((res as any).ipMismatch) {
          setIpMismatchInfo({
            mismatch: true,
            purchaseIp: (res as any).purchaseIp,
            currentIp: (res as any).currentIp,
            customerEmail: (res as any).customerEmail,
            orderNumber: (res as any).orderNumber || (res as any).order?.order_number,
          });
          setOrder((res as any).order);
          setIsLocked(true);
        } else {
          setIpMismatchInfo(null);
          setIsLocked(Boolean((res as any).isLocked));
          setOrder((prev: any) => {
            if (!prev?.delivery_data?.codes || !res.order?.delivery_data?.codes) {
              return res.order;
            }
            const mergedCodes = res.order.delivery_data.codes.map((c: any, i: number) => {
              const prevCode = prev.delivery_data.codes[i];
              if (prevCode?.revealed_at && !c.revealed_at) {
                return { ...c, revealed_at: prevCode.revealed_at };
              }
              return c;
            });
            return {
              ...res.order,
              delivery_data: {
                ...res.order.delivery_data,
                codes: mergedCodes,
              },
            };
          });
          const delCodes = (res.order.delivery_data && (res.order.delivery_data as any).codes) || [];
          const map: Record<number, boolean> = {};
          if (Array.isArray(delCodes)) {
            delCodes.forEach((c: any, i: number) => {
              if (c.revealed_at) map[i] = true;
            });
          }
          setRevealedKeys((prev) => ({ ...prev, ...map }));
        }
      } else if (!isBackground) {
        setError(res.error || (isAr ? "الرابط غير صالح أو منتهي الصلاحية" : "Invalid or expired link"));
      }
    } catch (err: any) {
      if (!isBackground) setError(err.message || (isAr ? "حدث خطأ أثناء تحميل الطلب" : "Failed to load order"));
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder(false);
  }, [order_token, isAr]);

  // Realtime subscription: When admin modifies delivery_data or cancels a code, sync instantly!
  useEffect(() => {
    if (!order?.id) return;
    const channel = supabase
      .channel(`order-live-token-${order.id}`)
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
  }, [order?.id, order_token]);

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
        ipMismatchInfo={ipMismatchInfo}
        onRefresh={() => fetchOrder(false)}
      />
    </StoreShell>
  );
}
