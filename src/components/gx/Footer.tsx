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
      name: "WhatsApp",
      url: "https://wa.me/962776252313",
      hoverColor: "#25D366",
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.634.074-1.921-.453-1.636-.669-2.684-2.339-2.766-2.449-.081-.109-.652-.867-.652-1.652 0-.785.412-1.17.558-1.328.146-.159.32-.198.427-.198.106 0 .213.002.306.007.098.005.23-.037.36.275.133.32.455 1.11.494 1.192.04.082.067.177.013.284-.053.107-.08.175-.16.269-.079.094-.167.21-.238.282-.079.082-.162.17-.07.327.091.157.406.669.871 1.083.599.534 1.104.7 1.261.778.158.079.251.069.345-.04.095-.109.406-.473.515-.636.109-.163.218-.136.368-.082.15.054.953.449 1.117.531.164.082.273.123.313.191.041.069.041.398-.103.803z" />
          <path d="M12 2C6.477 2 2 6.477 2 12c0 1.891.526 3.662 1.442 5.178L2 22l4.973-1.405C8.435 21.498 10.165 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.167c-1.683 0-3.25-.494-4.572-1.344l-.328-.209-3.033.856.862-2.956-.226-.341C3.806 14.774 3.333 13.435 3.333 12c0-4.779 3.888-8.667 8.667-8.667 4.778 0 8.667 3.888 8.667 8.667 0 4.779-3.889 8.667-8.667 8.667z" />
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
                ? "تواصل معنا مباشرة عبر واتساب وتابع جديد العروض والخصومات."
                : "Connect with us directly on WhatsApp and stay updated with latest drops."}
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
