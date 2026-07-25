import { Link } from "@tanstack/react-router";
import { CATEGORY_LINKS } from "@/data/products";

export function Footer() {
  return (
    <footer>
      <div className="wrap">
        <a
          href="#top" className="back-to-top"
          onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M12 19V5M5 12l7-7 7 7" /></svg>
          العودة إلى الأعلى
        </a>
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="brand">
              <div className="mark"><img src="/app/assets/img/gx-logo.png" alt="GX" /></div>
              <div className="brand-word">GX <span>STORE</span></div>
            </div>
            <p>متجرك الرقمي لكل الاشتراكات وبطاقات الألعاب — تفعيل رسمي وسريع لكل الدول العربية.</p>
          </div>
          <div className="footer-col">
            <h5>الأقسام</h5>
            {CATEGORY_LINKS.map(c => (
              <Link key={c.slug} to={("/" + c.slug) as never}>{c.name}</Link>
            ))}
          </div>
          <div className="footer-col">
            <h5>روابط</h5>
            <Link to="/">الرئيسية</Link>
            <Link to="/cart">السلة</Link>
            <Link to="/faq">الأسئلة الشائعة</Link>
            <Link to="/policy">الضمان والاسترجاع</Link>
          </div>
          <div className="footer-col">
            <h5>تواصل معنا</h5>
            <a className="footer-wa" href="https://wa.me/962776252313" target="_blank" rel="noopener">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.36 5.07L2 22l5.06-1.33A9.94 9.94 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.6 0-3.1-.43-4.4-1.19l-.32-.19-3.02.79.8-2.94-.2-.32A7.94 7.94 0 014 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z"/></svg>
              <span dir="ltr">+962 77 625 2313</span>
            </a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© GX STORE — جميع الحقوق محفوظة</span>
        </div>
      </div>
    </footer>
  );
}
