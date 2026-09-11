import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Star, X, Loader2 } from "lucide-react";
import { useLang } from "@/lib/gx/i18n";

type OrderLite = {
  id: string;
  order_number: string;
  created_at: string;
};


const css = `
.gx-rv-ov{position:fixed;inset:0;z-index:120;background:rgba(0,0,0,.72);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:16px}
.gx-rv{width:100%;max-width:520px;max-height:92vh;overflow:auto;border-radius:20px;border:1px solid rgba(0,229,255,.22);background:linear-gradient(180deg,#0b1119,#070b11);box-shadow:0 30px 80px -30px rgba(0,229,255,.35)}
.gx-rv-hd{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid rgba(255,255,255,.07)}
.gx-rv-bd{padding:18px;display:grid;gap:14px}
.gx-rv-lb{font-size:12px;font-weight:800;color:#8ba3b8;margin-bottom:6px;display:block}
.gx-rv-in{width:100%;padding:10px 12px;border-radius:12px;background:rgba(0,0,0,.4);border:1px solid rgba(0,229,255,.18);color:#e6f7ff;font-size:13.5px;font-family:inherit;outline:none}
.gx-rv-in:focus{border-color:rgba(0,229,255,.55);box-shadow:0 0 0 3px rgba(0,229,255,.12)}
.gx-rv-star{background:none;border:0;cursor:pointer;padding:2px;line-height:0}
.gx-rv-ft{display:flex;gap:8px;justify-content:flex-end;padding:14px 18px;border-top:1px solid rgba(255,255,255,.07)}
.gx-rv-btn{padding:10px 18px;border-radius:12px;font-weight:800;font-size:13px;cursor:pointer;border:1px solid transparent}
.gx-rv-btn.primary{background:linear-gradient(135deg,#00e5ff,#0098d4);color:#04131b}
.gx-rv-btn.primary:disabled{opacity:.5;cursor:not-allowed}
.gx-rv-btn.ghost{background:rgba(255,255,255,.05);color:#c8d8e6;border-color:rgba(255,255,255,.1)}
.gx-rv-hint{font-size:11.5px;color:#7d92a8;line-height:1.7}
`;

export function ReviewModal({ open, onClose, userId }: { open: boolean; onClose: () => void; userId: string | null }) {
  const { lang, dir } = useLang();
  const ar = lang === "ar";
  const [orders, setOrders] = useState<OrderLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !userId) return;
    let alive = true;
    setLoading(true);
    (async () => {
      const [ordersRes, reviewsRes, profRes] = await Promise.all([
        supabase.from("orders").select("id, order_number, created_at")
          .eq("user_id", userId).eq("status", "delivered").order("created_at", { ascending: false }).limit(50),
        supabase.from("reviews").select("order_id").eq("user_id", userId),
        supabase.from("profiles").select("full_name, username").eq("id", userId).maybeSingle(),
      ]);
      if (!alive) return;
      const reviewed = new Set((reviewsRes.data || []).map((r) => r.order_id));
      const list = ((ordersRes.data as OrderLite[]) || []).filter((o) => !reviewed.has(o.id));
      setOrders(list);
      setOrderId((cur) => cur || list[0]?.id || "");
      setDisplayName((cur) => cur || profRes.data?.full_name || profRes.data?.username || "");
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [open, userId]);

  const currentOrder = useMemo(() => orders.find((o) => o.id === orderId) || null, [orders, orderId]);

  if (!open) return null;

  async function submit() {
    if (!userId) return;
    if (!orderId) { toast.error(ar ? "اختر الطلب الذي تريد تقييمه" : "Please select the order to review"); return; }
    setSaving(true);
    const { error } = await supabase.from("reviews").insert({
      user_id: userId,
      order_id: orderId,
      order_number: currentOrder?.order_number ?? null,
      display_name: displayName.trim() || (ar ? "عميل GX" : "GX Customer"),
      rating,
      comment: comment.trim(),
    });
    setSaving(false);
    if (error) {
      toast.error(error.message.includes("duplicate") ? (ar ? "قيّمت هذا الطلب مسبقاً" : "You have already reviewed this order") : error.message);
      return;
    }
    toast.success(ar ? "شكراً على تقييمك! ❤️ وصلت مراجعتك وسيتم مراجعتها قبل النشر." : "Thank you for your review! ❤️ It will be published after moderation.");
    setComment(""); setRating(5);
    onClose();
  }

  return (
    <div className="gx-rv-ov" dir={dir} onClick={onClose}>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="gx-rv" onClick={(e) => e.stopPropagation()}>
        <div className="gx-rv-hd">
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#e6f7ff" }}>{ar ? "اكتب مراجعة" : "Write a Review"}</div>
            <div className="gx-rv-hint">{ar ? "قيّم تجربتك مع طلب مكتمل" : "Rate your experience with a completed order"}</div>
          </div>
          <button className="gx-rv-btn ghost" style={{ padding: 8 }} onClick={onClose} aria-label={ar ? "إغلاق" : "Close"}><X size={16} /></button>
        </div>

        <div className="gx-rv-bd">
          {loading ? (
            <div style={{ textAlign: "center", color: "#7d92a8", padding: 24 }}>
              <Loader2 className="animate-spin" style={{ margin: "0 auto" }} />
            </div>
          ) : orders.length === 0 ? (
            <div className="gx-rv-hint" style={{ textAlign: "center", padding: 20 }}>
              {ar ? "لا يوجد طلبات مكتملة بدون مراجعة حالياً. بعد استلام طلبك بتقدر تكتب مراجعتك من هنا." : "No completed orders awaiting review. Once your order is completed, you can review it here."}
            </div>
          ) : (
            <>
              <div>
                <label className="gx-rv-lb">{ar ? "الاسم الظاهر" : "Display Name"}</label>
                <input className="gx-rv-in" value={displayName} maxLength={60}
                  onChange={(e) => setDisplayName(e.target.value)} placeholder={ar ? "اسمك كما سيظهر" : "Your name as it will appear"} />
              </div>

              <div>
                <label className="gx-rv-lb">{ar ? "رقم الطلب" : "Order Number"}</label>
                {orders.length > 1 ? (
                  <select className="gx-rv-in" value={orderId} onChange={(e) => setOrderId(e.target.value)}>
                    {orders.map((o) => (
                      <option key={o.id} value={o.id}>{o.order_number}</option>
                    ))}
                  </select>
                ) : (
                  <input className="gx-rv-in" value={currentOrder?.order_number || ""} readOnly dir="ltr" />
                )}
              </div>

              <div>
                <label className="gx-rv-lb">{ar ? "التقييم" : "Rating"}</label>
                <div style={{ display: "flex", gap: 4 }} onMouseLeave={() => setHover(0)}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" className="gx-rv-star"
                      onMouseEnter={() => setHover(n)} onClick={() => setRating(n)} aria-label={`${n} ${ar ? "نجوم" : "stars"}`}>
                      <Star size={26} fill={(hover || rating) >= n ? "#ffd54f" : "transparent"}
                        color={(hover || rating) >= n ? "#ffd54f" : "#3d4c5c"} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="gx-rv-lb">{ar ? "مراجعتك (اختياري)" : "Your Review (Optional)"}</label>
                <textarea className="gx-rv-in" rows={4} maxLength={180} value={comment}
                  onChange={(e) => setComment(e.target.value.slice(0, 180))}
                  placeholder={ar ? "شاركنا تجربتك مع GX Store (اختياري)" : "Share your experience with GX Store (optional)"} />
                <div className="gx-rv-hint" style={{ textAlign: dir === "rtl" ? "left" : "right" }} dir="ltr">{comment.length}/180</div>
              </div>

              <div className="gx-rv-hint">{ar ? "سيتم مراجعة تقييمك قبل ظهوره على الموقع." : "Your review will be moderated before publication."}</div>

            </>

          )}
        </div>

        <div className="gx-rv-ft">
          <button className="gx-rv-btn ghost" onClick={onClose}>{ar ? "إلغاء" : "Cancel"}</button>
          <button className="gx-rv-btn primary" disabled={saving || loading || orders.length === 0} onClick={submit}>
            {saving ? (ar ? "جاري الإرسال..." : "Submitting...") : (ar ? "إرسال المراجعة" : "Submit Review")}
          </button>
        </div>
      </div>
    </div>
  );
}
