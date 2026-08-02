import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CATEGORY_LINKS, getCategoryLink } from "@/data/products";
import { useLang } from "@/lib/gx/i18n";
import { localizedCategoryLink } from "@/lib/gx/product-locale";
import { useHiddenCategorySlugs } from "@/lib/gx/category-visibility";
import { useSiteSettings } from "@/lib/gx/site-settings";

export function Footer() {
  const { t, lang } = useLang();
  const s = useSiteSettings();
  // Site settings resolve on the client; render them only after hydration
  // so the SSR markup and first client render match exactly.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const waDigits = hydrated ? (s.support_whatsapp || "").replace(/\D/g, "") : "";
  const waPretty = (() => {
    if (!waDigits) return "";
    // Jordan numbers: +962 7 XXXX XXXX
    if (waDigits.startsWith("962")) {
      const rest = waDigits.slice(3).replace(/^0+/, "");
      if (rest.length === 9) return `+962 ${rest[0]} ${rest.slice(1, 5)} ${rest.slice(5)}`;
      return `+962 ${rest.replace(/(\d{3})(?=\d)/g, "$1 ")}`.trim();
    }
    return "+" + waDigits.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
  })();
  return (
    <footer>
      <div className="wrap">
        <a
          href="#top" className="back-to-top"
          onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M12 19V5M5 12l7-7 7 7" /></svg>
          {t("common.back_to_top")}
        </a>
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="brand">
              <div className="mark"><img src="/app/assets/img/gx-logo.png" alt="GX" /></div>
              <div className="brand-word">GX <span>STORE</span></div>
            </div>
            <p>{t("footer.tagline")}</p>
          </div>
          <div className="footer-col">
            <h5>{t("footer.sections")}</h5>
            {CATEGORY_LINKS.filter(c => !hiddenCats.has(c.slug)).map(c => {
              const lc = localizedCategoryLink(c, lang);
              return <Link key={c.slug} to={getCategoryLink(c.slug) as never}>{lc.name}</Link>;
            })}
          </div>
          <div className="footer-col">
            <h5>{t("footer.links")}</h5>
            <Link to="/">{t("nav.home")}</Link>
            <Link to="/cart">{t("nav.cart")}</Link>
            <Link to="/faq">{t("nav.faq")}</Link>
            <Link to="/policy">{t("nav.policy")}</Link>
            <Link to="/privacy-policy">{lang === "en" ? "Privacy Policy" : "سياسة الخصوصية"}</Link>
          </div>
          <div className="footer-col">
            <h5>{t("footer.contact")}</h5>
            {waDigits && (
              <a className="footer-wa" href={`https://wa.me/${waDigits}`} target="_blank" rel="noopener">
                <svg width="18" height="18" viewBox="0 0 32 32" fill="currentColor" aria-hidden><path d="M27.2 4.8A15.86 15.86 0 0 0 16 .1C7.2.1.1 7.2.1 16c0 2.82.74 5.57 2.15 8L0 32l8.19-2.14A15.9 15.9 0 0 0 16 31.9h.01c8.79 0 15.94-7.15 15.94-15.94 0-4.26-1.66-8.26-4.75-11.16zM16 29.22h-.01a13.2 13.2 0 0 1-6.73-1.85l-.48-.29-4.86 1.27 1.3-4.74-.31-.49a13.2 13.2 0 0 1-2.03-7.12C2.88 8.68 8.77 2.8 16 2.8c3.55 0 6.88 1.38 9.39 3.9A13.16 13.16 0 0 1 29.29 16c0 7.27-5.9 13.22-13.29 13.22zm7.24-9.9c-.4-.2-2.35-1.16-2.72-1.29-.36-.13-.63-.2-.9.2-.26.4-1.02 1.29-1.25 1.55-.23.27-.46.3-.86.1-.4-.2-1.68-.62-3.19-1.97-1.18-1.05-1.98-2.35-2.21-2.75-.23-.4-.02-.61.18-.81.18-.18.4-.46.6-.7.2-.23.26-.4.4-.66.13-.27.07-.5-.03-.7-.1-.2-.9-2.17-1.24-2.97-.32-.77-.66-.67-.9-.68-.23-.01-.5-.01-.76-.01-.27 0-.7.1-1.07.5-.36.4-1.4 1.36-1.4 3.33 0 1.96 1.43 3.86 1.63 4.13.2.27 2.83 4.32 6.85 6.05.96.41 1.7.66 2.28.85.96.3 1.83.26 2.52.16.77-.12 2.36-.96 2.7-1.9.33-.93.33-1.73.23-1.9-.1-.16-.36-.26-.76-.46z"/></svg>
                <span dir="ltr">{waPretty}</span>
              </a>
            )}
            {hydrated && s.support_email && (
              <a href={`mailto:${s.support_email}`} style={{ display: "block", marginTop: 8, color: "#a3b6c9", fontSize: 13 }}>
                {s.support_email}
              </a>
            )}
            {hydrated && (s.social_instagram || s.social_facebook || s.social_tiktok) && (
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                {s.social_instagram && <a href={s.social_instagram} target="_blank" rel="noopener" aria-label="Instagram" style={{ color: "#e6f7ff" }}>IG</a>}
                {s.social_facebook && <a href={s.social_facebook} target="_blank" rel="noopener" aria-label="Facebook" style={{ color: "#e6f7ff" }}>FB</a>}
                {s.social_tiktok && <a href={s.social_tiktok} target="_blank" rel="noopener" aria-label="TikTok" style={{ color: "#e6f7ff" }}>TT</a>}
              </div>
            )}
          </div>
        </div>
        <div className="footer-bottom">
          <span>{t("footer.rights")}</span>
        </div>
      </div>
    </footer>
  );
}
