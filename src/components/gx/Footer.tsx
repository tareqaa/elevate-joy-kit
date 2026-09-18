import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CATEGORY_LINKS, getCategoryLink } from "@/data/products";
import { useLang } from "@/lib/gx/i18n";
import { localizedCategoryLink } from "@/lib/gx/product-locale";
import { useHiddenCategorySlugs } from "@/lib/gx/category-visibility";

export function Footer() {
  const { t, lang } = useLang();
  const hiddenCats = useHiddenCategorySlugs();
  const isAr = lang === "ar";

  const SOCIAL_LINKS = [
    {
      name: "Discord",
      url: "https://discord.gg/DvkUd5PgqV",
      hoverColor: "#5865F2",
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
        </svg>
      ),
    },
    {
      name: "Facebook",
      url: "https://www.facebook.com/GXSTORE.JO",
      hoverColor: "#1877F2",
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
    {
      name: "Instagram",
      url: "https://www.instagram.com/gxstore_jo/",
      hoverColor: "#E1306C",
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      ),
    },
  ];

  return (
    <footer>
      <div className="wrap">
        <a
          href="#top"
          className="back-to-top"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
          {t("common.back_to_top")}
        </a>

        <div className="footer-grid">
          {/* Brand Column */}
          <div className="footer-brand">
            <div className="brand">
              <div className="mark"><img src="/app/assets/img/gx-logo.png" alt="GX" /></div>
              <div className="brand-word">GX <span>STORE</span></div>
            </div>
            <p>{t("footer.tagline")}</p>
          </div>

          {/* Categories Column */}
          <div className="footer-col">
            <h5>{t("footer.sections")}</h5>
            {CATEGORY_LINKS.filter(c => !hiddenCats.has(c.slug)).map(c => {
              const lc = localizedCategoryLink(c, lang);
              return <Link key={c.slug} to={getCategoryLink(c.slug) as never}>{lc.name}</Link>;
            })}
          </div>

          {/* Quick Links Column */}
          <div className="footer-col">
            <h5>{t("footer.links")}</h5>
            <Link to="/">{t("nav.home")}</Link>
            <Link to="/cart">{t("nav.cart")}</Link>
            <Link to="/faq">{t("nav.faq")}</Link>
            <Link to="/support">{isAr ? "الدعم الفني" : "Technical Support"}</Link>
            <Link to="/policy">{t("nav.policy")}</Link>
            <Link to="/privacy-policy">{isAr ? "سياسة الخصوصية" : "Privacy Policy"}</Link>
          </div>

          {/* Social Channels Column (تابعنا) */}
          <div className="footer-col">
            <h5>{isAr ? "تابعنا" : "Follow Us"}</h5>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginTop: 6,
                marginBottom: 14,
              }}
            >
              {SOCIAL_LINKS.map((soc) => (
                <a
                  key={soc.name}
                  href={soc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={soc.name}
                  title={soc.name}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "#cbd5e1",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.2s ease",
                    cursor: "pointer",
                    textDecoration: "none",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#ffffff";
                    e.currentTarget.style.borderColor = soc.hoverColor;
                    e.currentTarget.style.background = `${soc.hoverColor}22`;
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = `0 4px 14px ${soc.hoverColor}33`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "#cbd5e1";
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                    e.currentTarget.style.transform = "none";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  {soc.icon}
                </a>
              ))}
            </div>

            <p style={{ color: "var(--gray)", fontSize: 13, lineHeight: 1.6, margin: 0, maxWidth: 240 }}>
              {isAr
                ? "انضم لمجتمعنا على ديسكورد وتابع جديد العروض والبطولات."
                : "Join our community and stay updated with latest drops."}
            </p>
          </div>
        </div>

        {/* Footer Bottom Rights Bar */}
        <div className="footer-bottom">
          <span>{t("footer.rights")}</span>
        </div>
      </div>
    </footer>
  );
}
