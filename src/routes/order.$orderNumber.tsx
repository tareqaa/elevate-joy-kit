import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { StoreShell } from "@/components/gx/StoreShell";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";
import { useLang } from "@/lib/gx/i18n";
import { getOrderByNumberFn, markCodeRevealedFn } from "@/lib/gx/order-email.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GxOrderDeliveryView } from "@/components/gx/GxOrderDeliveryView";

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

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = isAr
        ? `طلب #${orderNumber} | متجر GX Store`
        : `Order #${orderNumber} | GX Store`;
    }
  }, [orderNumber, isAr]);

  // Seamless security redirect: Always unify token views onto /order/completed?order_token=...
  // to remove order numbers from URL path and prevent any tampering.
  useEffect(() => {
    if (order_token && order_token.trim()) {
      window.location.replace(`/order/completed?order_token=${encodeURIComponent(order_token.trim())}`);
    }
  }, [order_token]);

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [revealedKeys, setRevealedKeys] = useState<Record<number, boolean>>({});
  const [ipMismatchInfo, setIpMismatchInfo] = useState<{
    mismatch: boolean;
    purchaseIp?: string | null;
    currentIp?: string | null;
    customerEmail?: string | null;
    orderNumber?: string | null;
    accountMismatch?: boolean;
    callerEmail?: string | null;
  } | null>(null);

  const fetchOrder = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token || undefined;

      const res = await getOrderByNumberFn({
        data: {
          orderNumber,
          orderToken: order_token || undefined,
          accessToken,
        },
      });

      if (res.ok && res.order) {
        if ((res as any).ipMismatch || (res as any).accountMismatch) {
          setIpMismatchInfo({
            mismatch: true,
            accountMismatch: Boolean((res as any).accountMismatch),
            callerEmail: (res as any).callerEmail,
            purchaseIp: (res as any).purchaseIp,
            currentIp: (res as any).currentIp,
            customerEmail: (res as any).customerEmail,
            orderNumber: (res as any).orderNumber || res.order.order_number,
          });
          setOrder(res.order);
          setIsLocked(true);
        } else {
          setIpMismatchInfo(null);
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
          setIsLocked(Boolean(res.isLocked));
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

    // Fast 2.5-second background heartbeat while viewing order to guarantee near-instant transition
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchOrder(true);
      }
    }, 2500);

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
      <GxOrderDeliveryView
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
