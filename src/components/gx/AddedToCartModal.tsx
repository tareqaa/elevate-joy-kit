import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useCart } from "@/lib/gx/cart";
import { useLang } from "@/lib/gx/i18n";

export const CART_ADDED_EVENT = "gx:cart-added";

export function AddedToCartModal() {
  const { t } = useLang();
  const cart = useCart();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onAdd = () => setOpen(true);
    window.addEventListener(CART_ADDED_EVENT, onAdd);
    return () => window.removeEventListener(CART_ADDED_EVENT, onAdd);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    const timer = window.setTimeout(() => setOpen(false), 6000);
    return () => { document.removeEventListener("keydown", onKey); window.clearTimeout(timer); };
  }, [open]);

  if (!open) return null;

  return (
    <div
      onClick={() => setOpen(false)}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(4,6,12,.72)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 18,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(440px,100%)",
          background: "var(--card, #12141d)",
          border: "1.5px solid var(--border, rgba(255,255,255,.08))",
          borderRadius: 20,
          padding: "30px 26px 24px",
          textAlign: "center",
          boxShadow: "0 24px 60px rgba(0,0,0,.55)",
        }}
      >
        <div style={{ position: "relative", display: "inline-flex", marginBottom: 14 }}>
          <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--white,#fff)" }}>
            <circle cx="9" cy="20" r="1.6" />
            <circle cx="17" cy="20" r="1.6" />
            <path d="M1.5 2.5h3l2.6 12.2h11L21 6.5H6" />
          </svg>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--cyan,#00e0ff)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", top: 16, insetInlineEnd: 8 }}>
            <path d="M4 13l5 5L20 6" />
          </svg>
        </div>

        <h3 style={{ fontSize: 19, fontWeight: 900, marginBottom: 8 }}>{t("added.title")}</h3>
        <p style={{ fontSize: 13.5, color: "var(--gray,#9aa4b2)", marginBottom: 22 }}>
          {t("added.sub_a")} <strong style={{ color: "var(--cyan,#00e0ff)" }}>{cart.count}</strong> {t("added.sub_b")}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <button
            type="button"
            onClick={() => { setOpen(false); navigate({ to: "/cart" }); }}
            style={{
              padding: "13px 10px", borderRadius: 12, cursor: "pointer", fontWeight: 800, fontSize: 14,
              background: "transparent", color: "var(--white,#fff)",
              border: "1.5px solid var(--border, rgba(255,255,255,.18))",
              fontFamily: "inherit",
            }}
          >
            {t("added.view_cart")}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            style={{
              padding: "13px 10px", borderRadius: 12, cursor: "pointer", fontWeight: 900, fontSize: 14,
              background: "var(--cyan,#00e0ff)", color: "#04121a", border: "none",
              fontFamily: "inherit",
            }}
          >
            {t("added.continue")}
          </button>
        </div>
      </div>
    </div>
  );
}
