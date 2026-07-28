import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useCart } from "@/lib/gx/cart";
import { useCurrency } from "@/lib/gx/currency";
import {
  CATEGORY_LINKS,
  getCategoryLink,
  PRODUCTS_CATALOG,
  GIFT_CARDS_CATALOG,
  getProductLink,
  getGiftCardLink,
} from "@/data/products";
import { supabase } from "@/integrations/supabase/client";
import { AuthModal } from "./AuthModal";
import { CurrencyModal } from "./CurrencyModal";
import { useLang } from "@/lib/gx/i18n";
import { localizedCategoryLink, localizedProduct, localizedGiftCard } from "@/lib/gx/product-locale";

type SearchEntry = { key: string; title: string; sub: string; icon: string; iconImg?: string; link: string; hay: string };

function normalizeQuery(v: string): string {
  return v
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

const waLogo = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.36 5.07L2 22l5.06-1.33A9.94 9.94 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.6 0-3.1-.43-4.4-1.19l-.32-.19-3.02.79.8-2.94-.2-.32A7.94 7.94 0 014 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8zm4.4-5.85c-.24-.12-1.43-.7-1.65-.79-.22-.08-.38-.12-.54.12-.16.24-.62.79-.76.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.35-1.67-.14-.24-.02-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.64.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.43-.58 1.63-1.15.2-.57.2-1.05.14-1.15-.06-.1-.22-.16-.46-.28z"/></svg>
);

type Profile = {
  id?: string | null;
  username?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  level?: number | null;
  email?: string | null;
};

type StoredAuthUser = {
  id?: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

function parseProfile(raw: string | null): Profile | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Profile;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function profileFromUser(user?: StoredAuthUser | null): Profile | null {
  if (!user) return null;
  const meta = user.user_metadata ?? {};
  return {
    id: user.id ?? null,
    username: typeof meta.username === "string" ? meta.username : null,
    full_name: typeof meta.full_name === "string" ? meta.full_name : null,
    email: user.email ?? null,
  };
}

function readStoredAuthUser(): StoredAuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !key.includes("auth-token")) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as { user?: StoredAuthUser; currentSession?: { user?: StoredAuthUser } };
      const user = parsed.user ?? parsed.currentSession?.user;
      if (user?.id) return user;
    }
  } catch { /* noop */ }
  return null;
}

function readCachedProfile(userId?: string): Profile | null {
  if (typeof window === "undefined") return null;
  const userCache = userId ? parseProfile(localStorage.getItem(`gx:profile:${userId}`)) : null;
  if (userCache) return userCache;
  const genericCache = parseProfile(localStorage.getItem("gx_profile_cache"));
  if (!genericCache) return null;
  if (!userId || !genericCache.id || genericCache.id === userId) return genericCache;
  return null;
}

export function Navbar() {
  const cart = useCart();
  const { currency } = useCurrency();
  const { t, lang, setLang } = useLang();
  const [menuOpen, setMenuOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [session, setSession] = useState<{ userId: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(() => {
    const storedUser = readStoredAuthUser();
    return readCachedProfile(storedUser?.id) ?? profileFromUser(storedUser);
  });
  const [accountOpen, setAccountOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("gx_is_admin") === "1";
  });

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const u = data.session?.user;
      if (u) {
        setProfile(readCachedProfile(u.id) ?? profileFromUser(u));
        setSession({ userId: u.id, email: u.email ?? undefined });
      } else {
        setSession(null);
        setProfile(null);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        const u = s?.user;
        setProfile(u ? (readCachedProfile(u.id) ?? profileFromUser(u)) : null);
        setSession(u ? { userId: u.id, email: u.email ?? undefined } : null);
      }
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!session) {
      setProfile(null); setIsAdmin(false);
      try { localStorage.removeItem("gx_profile_cache"); localStorage.removeItem("gx_is_admin"); } catch { /* noop */ }
      return;
    }
    (async () => {
      try {
        const { data: prof } = await supabase.from("profiles").select("username, full_name, avatar_url, level, email").eq("id", session.userId).maybeSingle();
        const next = prof ? { ...prof, id: session.userId } : { id: session.userId, email: session.email };
        setProfile(next);
        try {
          localStorage.setItem(`gx:profile:${session.userId}`, JSON.stringify(next));
          localStorage.setItem("gx_profile_cache", JSON.stringify(next));
        } catch { /* noop */ }
      } catch { setProfile((p) => p ?? { email: session.email }); }
      try {
        const { data: adminData } = await supabase.rpc("has_role", { _user_id: session.userId, _role: "admin" });
        setIsAdmin(!!adminData);
        try { localStorage.setItem("gx_is_admin", adminData ? "1" : "0"); } catch { /* noop */ }
      } catch { /* keep cached */ }
    })();
  }, [session]);

  useEffect(() => {
    const applyProfile = (candidate: Profile | null) => {
      if (!candidate) return;
      setProfile((current) => ({ ...(current ?? {}), ...candidate }));
    };
    const onProfileUpdated = (event: Event) => {
      const detail = (event as CustomEvent<Profile>).detail;
      applyProfile(detail ?? readCachedProfile(session?.userId));
    };
    const onStorage = (event: StorageEvent) => {
      if (!event.key || (!event.key.startsWith("gx:profile:") && event.key !== "gx_profile_cache" && event.key !== "gx:profile-updated")) return;
      applyProfile(readCachedProfile(session?.userId));
    };
    window.addEventListener("gx:profile-updated", onProfileUpdated);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("gx:profile-updated", onProfileUpdated);
      window.removeEventListener("storage", onStorage);
    };
  }, [session?.userId]);

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

  const closeTimerRef = useRef<number | null>(null);
  const scheduleClose = () => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => setAccountOpen(false), 260);
  };
  const cancelClose = () => {
    if (closeTimerRef.current) { window.clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
  };

  // ---- Search ----
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement | null>(null);

  const searchIndex = useMemo<SearchEntry[]>(() => {
    const out: SearchEntry[] = [];
    for (const [slug, raw] of Object.entries(PRODUCTS_CATALOG)) {
      const p = localizedProduct(raw, lang);
      out.push({
        key: `p:${slug}`,
        title: p.name,
        sub: p.category,
        icon: p.icon,
        iconImg: p.iconImg,
        link: getProductLink(slug),
        hay: normalizeQuery([p.name, raw.name, slug, p.category, p.tagline].join(" ")),
      });
    }
    for (const [slug, raw] of Object.entries(GIFT_CARDS_CATALOG)) {
      const g = localizedGiftCard(raw, lang);
      out.push({
        key: `g:${slug}`,
        title: g.name,
        sub: lang === "ar" ? "بطاقات الهدايا" : "Gift Cards",
        icon: g.icon,
        iconImg: g.iconImg,
        link: getGiftCardLink(slug),
        hay: normalizeQuery([g.name, raw.name, slug, "gift card بطاقة"].join(" ")),
      });
    }
    for (const raw of CATEGORY_LINKS) {
      const c = localizedCategoryLink(raw, lang);
      out.push({
        key: `c:${c.slug}`,
        title: c.name,
        sub: lang === "ar" ? "قسم" : "Category",
        icon: c.icon,
        link: getCategoryLink(c.slug),
        hay: normalizeQuery([c.name, raw.name, c.slug, c.desc].join(" ")),
      });
    }
    return out;
  }, [lang]);

  const results = useMemo(() => {
    const q = normalizeQuery(query);
    if (q.length < 1) return [];
    const terms = q.split(" ").filter(Boolean);
    return searchIndex.filter((e) => terms.every((tm) => e.hay.includes(tm))).slice(0, 8);
  }, [query, searchIndex]);

  useEffect(() => {
    if (!searchOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!searchRef.current?.contains(e.target as Node)) setSearchOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSearchOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [searchOpen]);

  const goToResult = (link: string) => {
    setSearchOpen(false);
    setQuery("");
    navigate({ to: link });
  };


  const displayName = profile?.full_name || profile?.username || (profile?.email?.split("@")[0]) || t("nav.account");
  const username = profile?.username;
  const initials = (displayName || profile?.email || "GX").trim().slice(0, 2).toUpperCase();
  const avatarUrl = profile?.avatar_url || "";
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
              <div className="account-wrap" onMouseEnter={cancelClose} onMouseLeave={scheduleClose}>
                <button
                  type="button" className="icon-btn account-avatar-btn"
                  onClick={(e) => { e.stopPropagation(); cancelClose(); setAccountOpen(v => !v); }}
                  onMouseEnter={() => { cancelClose(); setAccountOpen(true); }}
                  aria-label={t("nav.account")}
                >
                  {avatarUrl ? <img src={avatarUrl} alt="" /> : <span className="account-avatar-fallback">{initials}</span>}
                  <span className="account-lvl-dot">{level}</span>
                </button>
                <div className={"account-panel" + (accountOpen ? " open" : "")} onMouseEnter={cancelClose} onMouseLeave={scheduleClose}>
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
