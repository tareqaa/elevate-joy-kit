import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Star, Send, MessageSquareHeart, CheckCircle2, Sparkles } from "lucide-react";
import { useLang } from "@/lib/gx/i18n";

interface OrderReviewInlineProps {
  orderId: string;
  orderNumber: string;
  userId: string;
}

export function OrderReviewInline({ orderId, orderNumber, userId }: OrderReviewInlineProps) {
  const { lang } = useLang();
  const ar = lang === "ar";

  const [status, setStatus] = useState<"loading" | "already" | "ready" | "submitted">("loading");
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);

  // Check if this order already has a review
  useEffect(() => {
    let alive = true;
    (async () => {
      const [reviewRes, profRes] = await Promise.all([
        supabase.from("reviews").select("id").eq("order_id", orderId).eq("user_id", userId).maybeSingle(),
        supabase.from("profiles").select("full_name, username").eq("id", userId).maybeSingle(),
      ]);
      if (!alive) return;
      if (reviewRes.data) {
        setStatus("already");
      } else {
        setStatus("ready");
        setDisplayName(profRes.data?.full_name || profRes.data?.username || "");
      }
    })();
    return () => { alive = false; };
  }, [orderId, userId]);

  async function submit() {
    if (rating === 0) {
      toast.error(ar ? "اختر عدد النجوم أولاً" : "Please select a star rating first");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("reviews").insert({
      user_id: userId,
      order_id: orderId,
      order_number: orderNumber,
      display_name: displayName.trim() || (ar ? "عميل GX" : "GX Customer"),
      rating,
      comment: comment.trim(),
    });
    setSaving(false);
    if (error) {
      toast.error(error.message.includes("duplicate")
        ? (ar ? "قيّمت هذا الطلب مسبقاً" : "You already reviewed this order")
        : error.message);
      return;
    }
    toast.success(ar ? "شكراً على تقييمك! ❤️" : "Thank you for your review! ❤️");
    setStatus("submitted");
  }

  const starLabels = ar
    ? ["سيء جداً", "سيء", "مقبول", "جيد", "ممتاز!"]
    : ["Terrible", "Poor", "Fair", "Good", "Excellent!"];

  const activeRating = hover || rating;

  if (status === "loading") return null;

  if (status === "already") {
    return (
      <div className="gx-review-done">
        <CheckCircle2 size={16} />
        <span>{ar ? "تم تقييم هذا الطلب ✓" : "Review submitted ✓"}</span>
      </div>
    );
  }

  if (status === "submitted") {
    return (
      <div className="gx-review-submitted">
        <div className="gx-review-submitted-icon">
          <Sparkles size={28} />
        </div>
        <div className="gx-review-submitted-text">
          <strong>{ar ? "شكراً لك! 🎉" : "Thank you! 🎉"}</strong>
          <span>{ar ? "وصلت مراجعتك وسيتم نشرها بعد المراجعة" : "Your review has been received and will be published after moderation"}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="gx-review-inline">
      <style dangerouslySetInnerHTML={{ __html: reviewStyles }} />

      <div className="gx-review-header">
        <MessageSquareHeart size={18} />
        <span>{ar ? "كيف كانت تجربتك مع هذا الطلب؟" : "How was your experience with this order?"}</span>
      </div>

      {/* Stars */}
      <div className="gx-review-stars-wrapper">
        <div
          className="gx-review-stars"
          onMouseLeave={() => setHover(0)}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className={`gx-review-star ${activeRating >= n ? "active" : ""}`}
              onMouseEnter={() => setHover(n)}
              onClick={() => setRating(n)}
              aria-label={`${n} ${ar ? "نجوم" : "stars"}`}
            >
              <Star
                size={30}
                fill={activeRating >= n ? "#ffd54f" : "transparent"}
                color={activeRating >= n ? "#ffd54f" : "#3d4c5c"}
                strokeWidth={1.5}
              />
            </button>
          ))}
        </div>
        {activeRating > 0 && (
          <div className={`gx-review-star-label ${activeRating >= 4 ? "good" : activeRating >= 3 ? "ok" : "bad"}`}>
            {starLabels[activeRating - 1]}
          </div>
        )}
      </div>

      {/* Form (appears after selecting stars) */}
      {rating > 0 && (
        <div className="gx-review-form">
          <div className="gx-review-field">
            <label>{ar ? "الاسم الظاهر" : "Display Name"}</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={ar ? "اسمك كما سيظهر" : "Your name as shown"}
              maxLength={60}
            />
          </div>

          <div className="gx-review-field">
            <label>{ar ? "مراجعتك (اختياري)" : "Your review (optional)"}</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 250))}
              placeholder={ar ? "شاركنا تجربتك..." : "Share your experience..."}
              rows={3}
              maxLength={250}
            />
            <div className="gx-review-counter" dir="ltr">{comment.length}/250</div>
          </div>

          <div className="gx-review-actions">
            <span className="gx-review-note">
              {ar ? "سيتم مراجعة تقييمك قبل ظهوره على الموقع" : "Your review will be moderated before publication"}
            </span>
            <button
              type="button"
              className="gx-review-submit"
              disabled={saving}
              onClick={submit}
            >
              <Send size={14} />
              <span>{saving ? (ar ? "جاري الإرسال..." : "Sending...") : (ar ? "إرسال التقييم" : "Submit Review")}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const reviewStyles = `
.gx-review-inline {
  margin-top: 12px;
  border-radius: 16px;
  border: 1px solid rgba(0, 229, 255, 0.15);
  background: linear-gradient(145deg, rgba(0, 229, 255, 0.04), rgba(162, 89, 255, 0.03));
  overflow: hidden;
}

.gx-review-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
  font-size: 13px;
  font-weight: 700;
  color: #c8dbe8;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.gx-review-header svg { color: #00e5ff; flex-shrink: 0; }

.gx-review-stars-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 16px 10px;
}

.gx-review-stars {
  display: flex;
  gap: 6px;
  justify-content: center;
}

.gx-review-star {
  background: none;
  border: 0;
  cursor: pointer;
  padding: 4px;
  border-radius: 10px;
  transition: transform 0.15s ease, background 0.15s ease;
  line-height: 0;
}
.gx-review-star:hover {
  transform: scale(1.2);
  background: rgba(255, 213, 79, 0.1);
}
.gx-review-star.active {
  animation: gx-star-pop 0.3s ease;
}

@keyframes gx-star-pop {
  0% { transform: scale(1); }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); }
}

.gx-review-star-label {
  font-size: 12px;
  font-weight: 800;
  padding: 3px 12px;
  border-radius: 20px;
  animation: gx-label-fade 0.2s ease;
}
.gx-review-star-label.good { color: #4ade80; background: rgba(74, 222, 128, 0.1); }
.gx-review-star-label.ok { color: #fbbf24; background: rgba(251, 191, 36, 0.1); }
.gx-review-star-label.bad { color: #f87171; background: rgba(248, 113, 113, 0.1); }

@keyframes gx-label-fade {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.gx-review-form {
  padding: 0 16px 16px;
  display: grid;
  gap: 12px;
  animation: gx-form-slide 0.3s ease;
}

@keyframes gx-form-slide {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.gx-review-field label {
  display: block;
  font-size: 11px;
  font-weight: 800;
  color: #8ba3b8;
  margin-bottom: 5px;
  letter-spacing: 0.02em;
}

.gx-review-field input,
.gx-review-field textarea {
  width: 100%;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(0, 229, 255, 0.12);
  color: #e6f7ff;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.gx-review-field input:focus,
.gx-review-field textarea:focus {
  border-color: rgba(0, 229, 255, 0.45);
  box-shadow: 0 0 0 3px rgba(0, 229, 255, 0.08);
}
.gx-review-field textarea { resize: vertical; min-height: 70px; }

.gx-review-counter {
  text-align: right;
  font-size: 10px;
  color: #5a7080;
  margin-top: 2px;
}

.gx-review-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.gx-review-note {
  font-size: 10.5px;
  color: #5a7080;
  flex: 1;
  min-width: 120px;
}

.gx-review-submit {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border-radius: 12px;
  background: linear-gradient(135deg, #00e5ff, #0098d4);
  color: #04131b;
  font-size: 13px;
  font-weight: 800;
  border: none;
  cursor: pointer;
  transition: opacity 0.2s ease, transform 0.15s ease;
  white-space: nowrap;
}
.gx-review-submit:hover { opacity: 0.9; transform: translateY(-1px); }
.gx-review-submit:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

/* Done / Already reviewed states */
.gx-review-done {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  margin-top: 8px;
  border-radius: 12px;
  background: rgba(74, 222, 128, 0.06);
  border: 1px solid rgba(74, 222, 128, 0.15);
  color: #4ade80;
  font-size: 12px;
  font-weight: 700;
}

.gx-review-submitted {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  margin-top: 12px;
  border-radius: 16px;
  background: linear-gradient(145deg, rgba(0, 229, 255, 0.06), rgba(162, 89, 255, 0.04));
  border: 1px solid rgba(0, 229, 255, 0.15);
  animation: gx-submitted-appear 0.4s ease;
}
.gx-review-submitted-icon {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(0, 229, 255, 0.15), rgba(162, 89, 255, 0.12));
  color: #00e5ff;
  flex-shrink: 0;
}
.gx-review-submitted-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.gx-review-submitted-text strong {
  font-size: 14px;
  color: #e6f7ff;
}
.gx-review-submitted-text span {
  font-size: 11.5px;
  color: #7d92a8;
}

@keyframes gx-submitted-appear {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
`;
