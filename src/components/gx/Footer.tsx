import { Link } from "@tanstack/react-router";
import { CATEGORY_LINKS, getCategoryLink } from "@/data/products";
import { useLang } from "@/lib/gx/i18n";
import { localizedCategoryLink } from "@/lib/gx/product-locale";

export function Footer() {
  const { t, lang } = useLang();
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
            {CATEGORY_LINKS.map(c => {
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
          </div>
          <div className="footer-col">
            <h5>{t("footer.contact")}</h5>
            <a className="footer-wa" href="https://wa.me/962776252313" target="_blank" rel="noopener">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.36 5.07L2 22l5.06-1.33A9.94 9.94 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.6 0-3.1-.43-4.4-1.19l-.32-.19-3.02.79.8-2.94-.2-.32A7.94 7.94 0 014 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z"/></svg>
              <span dir="ltr">+962 77 625 2313</span>
            </a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>{t("footer.rights")}</span>
        </div>
      </div>
    </footer>
  );
}
