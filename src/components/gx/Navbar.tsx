import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useCart } from "@/lib/gx/cart";
import { useCurrency } from "@/lib/gx/currency";
import { CATEGORY_LINKS, getCategoryLink } from "@/data/products";
import { supabase } from "@/integrations/supabase/client";
import { AuthModal } from "./AuthModal";
import { CurrencyModal } from "./CurrencyModal";
import { useLang } from "@/lib/gx/i18n";
import { localizedCategoryLink } from "@/lib/gx/product-locale";

const waLogo = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.36 5.07L2 22l5.06-1.33A9.94 9.94 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.6 0-3.1-.43-4.4-1.19l-.32-.19-3.02.79.8-2.94-.2-.32A7.94 7.94 0 014 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8zm4.4-5.85c-.24-.12-1.43-.7-1.65-.79-.22-.08-.38-.12-.54.12-.16.24-.62.79-.76.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.35-1.67-.14-.24-.02-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.64.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.43-.58 1.63-1.15.2-.57.2-1.05.14-1.15-.06-.1-.22-.16-.46-.28z"/></svg>
);

type Profile = {
  username?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  level?: number | null;
  email?: string | null;
};

export function Navbar() {
  const cart = useCart();
  const { currency } = useCurrency();
  const { t, lang, setLang } = useLang();
  const [menuOpen, setMenuOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [session, setSession] = useState<{ userId: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const u = data.session?.user;
      if (u) setSession({ userId: u.id, email: u.email ?? undefined });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        const u = s?.user;
        setSession(u ? { userId: u.id, email: u.email ?? undefined } : null);
      }
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!session) { setProfile(null); setIsAdmin(false); return; }
    (async () => {
      try {
        const { data: prof } = await supabase.from("profiles").select("username, full_name, avatar_url, level, email").eq("id", session.userId).maybeSingle();
        setProfile(prof ?? { email: session.email });
      } catch { setProfile({ email: session.email }); }
      try {
        const { data: adminData } = await supabase.rpc("has_role", { _user_id: session.userId, _role: "admin" });
        setIsAdmin(!!adminData);
      } catch { setIsAdmin(false); }
    })();
  }, [session]);

  useEffect(() => {
    if (!menuOpen && !accountOpen) return;
    const onClick = (e: MouseEvent) => {
      const tgt = e.target as HTMLElement;
      if (!tgt.closest(".menu-wrap")) setMenuOpen(false);
      if (!tgt.closest(".account-wrap")) setAccountOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setMenuOpen(false); setAccountOpen(false); }
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen, accountOpen]);


  const displayName = profile?.full_name || profile?.username || (profile?.email?.split("@")[0]) || t("nav.account");
  const username = profile?.username;
  const avatarUrl = profile?.avatar_url ||
    `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(username || profile?.email || "gx")}&backgroundType=gradientLinear&backgroundColor=0ea5e9,6366f1,8b5cf6`;
  const level = Math.max(1, Number(profile?.level) || 1);

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setAccountOpen(false);
  }

  return (
    <>
      <nav className="nav">
        <div className="wrap">
          <Link to="/" className="brand">
            <div className="mark"><img src="/app/assets/img/gx-logo.png" alt="GX" /></div>
            <div className="brand-word">GX <span>STORE</span></div>
          </Link>
          <div className="search-box">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
            <input type="text" placeholder={t("nav.search_placeholder")} />
          </div>
          <div className="nav-right">
            {session ? (
              <div className="account-wrap">
                <button
                  type="button" className="icon-btn account-avatar-btn"
                  onClick={(e) => { e.stopPropagation(); setAccountOpen(v => !v); }}
                  onMouseEnter={() => setAccountOpen(true)}
                  aria-label={t("nav.account")}
                >
                  <img src={avatarUrl} alt="" />
                  <span className="account-lvl-dot">{level}</span>
                </button>
                <div className={"account-panel" + (accountOpen ? " open" : "")}>
                  <div className="acc-mini">
                    <div className="acc-mini__name">{displayName}</div>
                    <div className="acc-mini__handle" dir="ltr">{username ? "@" + username : profile?.email}</div>
                  </div>
                  <div className="acc-divider" />
                  <Link to="/account" search={{ tab: "orders" } as never} className="acc-link" onClick={() => setAccountOpen(false)}>
                    <span className="ai">📦</span><span>{t("nav.orders")}</span>
                  </Link>
                  <Link to="/account" search={{ tab: "profile" } as never} className="acc-link" onClick={() => setAccountOpen(false)}>
                    <span className="ai">👤</span><span>{t("nav.account")}</span>
                  </Link>
                  <Link to="/account" search={{ tab: "security" } as never} className="acc-link" onClick={() => setAccountOpen(false)}>
                    <span className="ai">⚙️</span><span>{t("nav.settings")}</span>
                  </Link>
                  {isAdmin && (
                    <>
                      <div className="acc-divider" />
                      <Link to="/admin" className="acc-link acc-admin" onClick={() => setAccountOpen(false)}>
                        <span className="ai">🛡️</span><span>{t("nav.admin_panel")}</span>
                      </Link>
                    </>
                  )}
                  <div className="acc-divider" />
                  <button type="button" className="acc-link acc-logout" onClick={signOut}>
                    <span className="ai">↩︎</span><span>{t("nav.logout")}</span>
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="icon-btn account-link" onClick={() => setAuthOpen(true)} aria-label={t("nav.login")}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
              </button>
            )}
            <div className="currency-pick currency-lang-combo">
              <button type="button" className="cl-part cl-cur" onClick={() => setCurrencyOpen(true)} title={t("common.currency") || currency}>
                <span>{currency}</span>
              </button>
              <span className="cl-sep">|</span>
              <button type="button" className="cl-part cl-lang" onClick={() => setCurrencyOpen(true)} title={t("common.language")} aria-label={t("common.language")}>
                <span>{lang === "ar" ? "AR" : "EN"}</span>
              </button>
            </div>
            <button type="button" className="icon-btn" onClick={cart.openDrawer} title={t("nav.cart_title")}>
              🛒
              <span className="badge-count">{cart.count}</span>
            </button>
            <div className="menu-wrap">
              <button type="button" className="menu-btn" onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v); }}>
                <div className="bars"><span /><span /><span /></div>
                <span className="btn-label">{t("nav.menu")}</span>
              </button>
              <div className={"menu-panel" + (menuOpen ? " open" : "")}>
                <div className="menu-section">
                  <div className="ms-title">{t("nav.pages")}</div>
                  <MenuLink to="/" icon="🏠" label={t("nav.home")} onClick={() => setMenuOpen(false)} />
                  <MenuLink to="/cart" icon="🛒" label={t("nav.cart")} onClick={() => setMenuOpen(false)} />
                  <MenuLink to="/faq" icon="❓" label={t("nav.faq")} onClick={() => setMenuOpen(false)} />
                  <MenuLink to="/policy" icon="🛡️" label={t("nav.policy")} onClick={() => setMenuOpen(false)} />
                </div>
                <div className="menu-divider" />
                <div className="menu-section">
                  <div className="ms-title">{t("nav.categories")}</div>
                  {CATEGORY_LINKS.map(c0 => {
                    const c = localizedCategoryLink(c0, lang);
                    return (
                      <Link key={c.slug} to={getCategoryLink(c.slug) as never} className="menu-link" onClick={() => setMenuOpen(false)}>
                        <span className="mi">{c.icon}</span> {c.name}
                      </Link>
                    );
                  })}
                </div>
                <div className="menu-divider" />
                <div className="menu-section">
                  <div className="ms-title">{t("nav.contact")}</div>
                  <a href="https://wa.me/962776252313" target="_blank" rel="noopener" className="menu-link wa-menu-link">
                    <span className="mi">{waLogo}</span>
                    <span>{t("nav.whatsapp")}</span>
                    <span className="wa-number" dir="ltr">+962 77 625 2313</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>
      <CurrencyModal open={currencyOpen} onClose={() => setCurrencyOpen(false)} />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}

function MenuLink({ to, icon, label, onClick }: { to: string; icon: string | ReactNode; label: string; onClick?: () => void }) {
  return (
    <Link to={to as never} className="menu-link" onClick={onClick} activeProps={{ className: "menu-link active" }} activeOptions={{ exact: to === "/" }}>
      <span className="mi">{icon}</span> {label}
    </Link>
  );
}
