import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "@tanstack/react-router";
import { Search, Globe, Heart, ShoppingCart, User, ArrowLeft, ArrowRight, Gamepad2, X, History, TrendingUp } from "lucide-react";
import { useCart } from "@/lib/gx/cart";
import { useCurrency } from "@/lib/gx/currency";
import { useFavorites } from "@/lib/gx/favorites";
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

import { SpinWheelModal } from "./SpinWheel";
import { useLang } from "@/lib/gx/i18n";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { GxIcon } from "@/components/gx/GxIcon";
import { localizedCategoryLink, localizedProduct, localizedGiftCard } from "@/lib/gx/product-locale";
import { useHiddenCategorySlugs } from "@/lib/gx/category-visibility";
import {
  fetchLiveSearchIndex,
  matchSearchQuery,
  getRecentSearches,
  saveRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
  POPULAR_SEARCHES,
  getQuerySuggestions,
  type SearchableItem,
} from "@/lib/gx/search";

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
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.36 5.07L2 22l5.06-1.33A9.94 9.94 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.6 0-3.1-.43-4.4-1.19l-.32-.19-3.02.79.8-2.94-.2-.32A7.94 7.94 0 014 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8zm4.4-5.85c-.24-.12-1.43-.7-1.65-.79-.22-.08-.38-.12-.54.12-.16.24-.62.79-.76.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.35-1.67-.14-.24-.02-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.64.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.43-.58 1.63-1.15.2-.57.2-1.05.14-1.15-.06-.1-.22-.16-.46-.28z" /></svg>
);

type Profile = {
  id?: string | null;
  username?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  level?: number | null;
  email?: string | null;
  gx_coins?: number | null;
  store_credit_jod?: number | null;
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
  const { currency, format, formatCoins } = useCurrency();
  const { t, lang, setLang } = useLang();
  const { count: favCount } = useFavorites();
  const hiddenCats = useHiddenCategorySlugs();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    if (menuOpen && window.innerWidth <= 768) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [menuOpen, mounted]);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [session, setSession] = useState<{ userId: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(() => {
    const storedUser = readStoredAuthUser();
    return readCachedProfile(storedUser?.id) ?? profileFromUser(storedUser);
  });
  const [accountOpen, setAccountOpen] = useState(false);
  const [wheelOpen, setWheelOpen] = useState(false);
  // Admin state lives in memory only — never in localStorage, which any user
  // could forge to reveal the admin entry. It is always (re)verified against
  // has_role() in the database below.
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // Purge the legacy forgeable flag from existing browsers.
  useEffect(() => {
    try { localStorage.removeItem("gx_is_admin"); } catch { /* noop */ }
  }, []);


  useEffect(() => {
    let active = true;

    const handleSession = async (session: any) => {
      if (!active) return;
      const u = session?.user;
      if (!u) {
        setSession(null);
        setProfile(null);
        return;
      }

      // Check if user requires 2FA and has not completed it yet
      try {
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aal && aal.currentLevel === "aal1" && aal.nextLevel === "aal2") {
          // Incomplete 2FA: do NOT treat user as logged in in the Navbar
          setSession(null);
          setProfile(null);
          return;
        }
      } catch {
        // ignore
      }

      setProfile(readCachedProfile(u.id) ?? profileFromUser(u));
      setSession({ userId: u.id, email: u.email ?? undefined });
    };

    supabase.auth.getSession().then(({ data }) => {
      void handleSession(data.session);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "TOKEN_REFRESHED") {
        void handleSession(s);
      } else if (event === "SIGNED_OUT") {
        setSession(null);
        setProfile(null);
      }
    });

    return () => { active = false; sub.subscription.unsubscribe(); };
  }, [navigate]);

  useEffect(() => {
    if (!session) {
      setProfile(null); setIsAdmin(false);
      try { localStorage.removeItem("gx_profile_cache"); } catch { /* noop */ }
      return;
    }
    (async () => {
      try {
        const { data: prof } = await supabase.from("profiles").select("username, full_name, avatar_url, level, email, gx_coins, store_credit_jod").eq("id", session.userId).maybeSingle();
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
      } catch { setIsAdmin(false); }
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

  // ---- Search Engine ----
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement | null>(null);

  const queryClient = useQueryClient();
  const { data: liveCatalog } = useQuery({
    queryKey: ["store-search-catalog"],
    queryFn: fetchLiveSearchIndex,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    const onCatalogUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ["store-search-catalog"] });
    };
    window.addEventListener("gx:catalog-updated", onCatalogUpdated);
    return () => window.removeEventListener("gx:catalog-updated", onCatalogUpdated);
  }, [queryClient]);

  const searchIndexFallback = useMemo<SearchableItem[]>(() => {
    const out: SearchableItem[] = [];
    for (const [slug, raw] of Object.entries(PRODUCTS_CATALOG)) {
      const p = localizedProduct(raw, lang);
      out.push({
        id: slug,
        slug,
        type: "product",
        nameAr: raw.nameAr || raw.name,
        nameEn: raw.name,
        taglineAr: raw.taglineAr || raw.tagline,
        taglineEn: raw.tagline,
        categoryNameAr: raw.categoryAr || raw.category,
        categoryNameEn: raw.category,
        categorySlug: raw.category,
        icon: raw.icon,
        iconImage: raw.iconImg,
        thumbBg: raw.thumbBg,
        priceJod: raw.variants?.[0]?.price || 5,
        link: getProductLink(slug),
      });
    }
    for (const [slug, raw] of Object.entries(GIFT_CARDS_CATALOG)) {
      const g = localizedGiftCard(raw, lang);
      out.push({
        id: `g-${slug}`,
        slug,
        type: "gift_card",
        nameAr: g.name,
        nameEn: raw.name,
        categoryNameAr: "بطاقات الهدايا",
        categoryNameEn: "Gift Cards",
        categorySlug: "gift-cards",
        icon: g.icon,
        iconImage: g.iconImg,
        priceJod: raw.variants?.[0]?.price || 5,
        link: getGiftCardLink(slug),
      });
    }
    for (const raw of CATEGORY_LINKS) {
      if (hiddenCats.has(raw.slug)) continue;
      const c = localizedCategoryLink(raw, lang);
      out.push({
        id: `c-${c.slug}`,
        slug: c.slug,
        type: "category",
        nameAr: c.name,
        nameEn: raw.name,
        categoryNameAr: "قسم",
        categoryNameEn: "Category",
        categorySlug: c.slug,
        icon: c.icon,
        link: getCategoryLink(c.slug),
      });
    }
    return out;
  }, [lang, hiddenCats]);

  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  const trimmedQuery = query.trim();
  const isSearching = trimmedQuery.length >= 3;

  const allCatalogItems = useMemo(() => {
    return (liveCatalog && liveCatalog.length > 0) ? liveCatalog : searchIndexFallback;
  }, [liveCatalog, searchIndexFallback]);

  const matchResults = useMemo(() => {
    if (!isSearching) return [];
    return matchSearchQuery(allCatalogItems, trimmedQuery, lang);
  }, [isSearching, allCatalogItems, trimmedQuery, lang]);

  const results = useMemo(() => matchResults.slice(0, 6), [matchResults]);
  const totalMatches = matchResults.length;

  const querySuggestions = useMemo(() => {
    if (!isSearching) return [];
    return getQuerySuggestions(allCatalogItems, trimmedQuery, lang, 4);
  }, [isSearching, allCatalogItems, trimmedQuery, lang]);

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

  const handleSelectTerm = (term: string) => {
    saveRecentSearch(term);
    setRecentSearches(getRecentSearches());
    setSearchOpen(false);
    setQuery(term);
    navigate({ to: "/products", search: { search: term } });
  };

  const handleRemoveRecent = (e: React.MouseEvent, term: string) => {
    e.stopPropagation();
    removeRecentSearch(term);
    setRecentSearches(getRecentSearches());
  };

  const handleSelectProduct = (item: SearchableItem) => {
    const term = trimmedQuery || (lang === "en" ? item.nameEn : item.nameAr);
    if (term) {
      saveRecentSearch(term);
      setRecentSearches(getRecentSearches());
    }
    goToResult(item.link);
  };


  const displayName = profile?.username || (profile?.email?.split("@")[0]) || t("nav.account");
  const username = profile?.username;
  const initials = (displayName || profile?.email || "GX").trim().slice(0, 2).toUpperCase();
  const avatarUrl = profile?.avatar_url || "";
  const level = Math.max(1, Number(profile?.level) || 1);

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setIsAdmin(false);
    setAccountOpen(false);
    try {
      localStorage.removeItem("gx_profile_cache");
    } catch { /* noop */ }
    queryClient.clear();
    if (typeof window !== "undefined" && (window.location.pathname.startsWith("/account") || window.location.pathname.startsWith("/admin"))) {
      navigate({ to: "/" });
    }
  }

  return (
    <>
      <nav className="nav">
        <div className="wrap">
          {/* Mobile Menu - Positioned before brand on mobile */}
          <div className="menu-wrap gx-nav-mobile-menu">
            <button
              type="button"
              className="menu-btn gx-mobile-menu-trigger"
              onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v); }}
              aria-label={t("nav.menu")}
            >
              <div className="bars"><span /><span /><span /></div>
            </button>
          </div>

          <Link to="/" className="brand">
            <div className="mark"><img src="/app/assets/img/gx-logo.png" alt="GX" /></div>
            <div className="brand-word">GX <span>STORE</span></div>
          </Link>

          {/* Center Search Box */}
          <div className="search-box" ref={searchRef}>
            <Search size={17} strokeWidth={2} className="search-ico-svg" />
            <input
              type="text"
              value={query}
              placeholder={lang === "ar" ? "دور على منتج، لعبة، أو اشتراك..." : t("nav.search_placeholder")}
              onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (!trimmedQuery) return;
                  saveRecentSearch(trimmedQuery);
                  setRecentSearches(getRecentSearches());
                  if (isSearching && results.length === 1) {
                    goToResult(results[0].item.link);
                  } else {
                    setSearchOpen(false);
                    navigate({ to: "/products", search: { search: trimmedQuery } });
                  }
                }
              }}
            />
            {query.length > 0 && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setQuery("");
                  setSearchOpen(true);
                }}
                aria-label="مسح البحث"
              >
                <X size={14} />
              </button>
            )}
            {searchOpen && (
              <div className="gx-search-results">
                {!isSearching ? (
                  <div className="gx-search-pre-section">
                    {recentSearches.length > 0 && (
                      <div className="gx-search-section">
                        <div className="gx-search-section-header">
                          <span className="gx-search-section-title">
                            {lang === "ar" ? "عمليات البحث الأخيرة" : "Recent Searches"}
                          </span>
                          <button
                            type="button"
                            className="gx-search-clear-all-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              clearRecentSearches();
                              setRecentSearches([]);
                            }}
                          >
                            {lang === "ar" ? "مسح الكل" : "Clear all"}
                          </button>
                        </div>
                        <div className="gx-search-list">
                          {recentSearches.map((term) => (
                            <div
                              key={term}
                              className="gx-search-row gx-search-history-row"
                              onClick={() => handleSelectTerm(term)}
                            >
                              <div className="gx-search-row-main">
                                <History size={15} className="gx-search-row-ico" />
                                <span className="gx-search-row-text">{term}</span>
                              </div>
                              <button
                                type="button"
                                className="gx-search-row-delete"
                                onClick={(e) => handleRemoveRecent(e, term)}
                                title={lang === "ar" ? "حذف" : "Remove"}
                                aria-label="حذف"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="gx-search-section">
                      <div className="gx-search-section-header">
                        <span className="gx-search-section-title">
                          {lang === "ar" ? "عمليات البحث الشائعة" : "Popular Searches"}
                        </span>
                      </div>
                      <div className="gx-search-list">
                        {POPULAR_SEARCHES.map((item) => (
                          <div
                            key={item.query}
                            className="gx-search-row gx-search-popular-row"
                            onClick={() => handleSelectTerm(item.query)}
                          >
                            <div className="gx-search-row-main">
                              <TrendingUp size={15} className="gx-search-row-ico" />
                              <span className="gx-search-row-text">
                                {lang === "ar" ? item.labelAr : item.labelEn}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {querySuggestions.length > 0 && (
                      <div className="gx-search-suggestions-list">
                        {querySuggestions.map((sug) => (
                          <div
                            key={sug}
                            className="gx-search-row gx-search-suggestion-row"
                            onClick={() => handleSelectTerm(sug)}
                          >
                            <div className="gx-search-row-main">
                              <Search size={15} className="gx-search-row-ico" />
                              <span className="gx-search-row-text">{sug}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {results.length === 0 ? (
                      <div className="gx-search-empty">
                        <p style={{ margin: "0 0 6px", color: "#94a3b8", fontSize: "0.85rem" }}>
                          {lang === "ar" ? `لا توجد نتائج لـ "${query}"` : `No results for "${query}"`}
                        </p>
                        <button
                          type="button"
                          className="gx-search-browse-all-btn"
                          onClick={() => {
                            setSearchOpen(false);
                            navigate({ to: "/products" });
                          }}
                        >
                          {lang === "ar" ? "تصفح كافة منتجات المتجر" : "Browse all store products"}
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="gx-search-products-list">
                          {results.map(({ item }) => {
                            const title = lang === "en" ? item.nameEn : item.nameAr;
                            const badgeText = item.badge || (lang === "ar" ? "منتج رقمي" : "Digital Product");
                            const thumb = item.imageUrl || item.iconImage;

                            return (
                              <div
                                key={item.id || item.slug}
                                className="gx-search-product-card"
                                onClick={() => handleSelectProduct(item)}
                              >
                                <div className="gx-search-card-thumb-wrap">
                                  {thumb ? (
                                    <img src={thumb} alt="" className="gx-search-card-thumb" />
                                  ) : (
                                    <div className="gx-search-card-thumb-placeholder">
                                      {item.icon || "🎮"}
                                    </div>
                                  )}
                                </div>

                                <div className="gx-search-card-info">
                                  <span className="gx-search-card-badge">{badgeText}</span>
                                  <div className="gx-search-card-title">{title}</div>
                                </div>

                                <div className="gx-search-card-pricing">
                                  {typeof item.priceJod === "number" && item.priceJod > 0 && (
                                    <>
                                      <div className="gx-search-card-price-main">
                                        <span className="gx-search-card-from">{lang === "ar" ? "من" : "From"}</span>
                                        <span className="gx-search-card-price">{format(item.priceJod)}</span>
                                      </div>
                                      {item.oldPriceJod && item.oldPriceJod > item.priceJod ? (
                                        <div className="gx-search-card-price-old">
                                          <span className="gx-search-card-from-old">{lang === "ar" ? "من" : "From"}</span>
                                          <span className="gx-search-card-old-val">{format(item.oldPriceJod)}</span>
                                        </div>
                                      ) : null}
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {totalMatches > results.length && (
                          <button
                            type="button"
                            className="gx-search-view-all"
                            onClick={() => {
                              setSearchOpen(false);
                              saveRecentSearch(trimmedQuery);
                              setRecentSearches(getRecentSearches());
                              navigate({ to: "/products", search: { search: trimmedQuery } });
                            }}
                          >
                            <span>
                              {lang === "ar"
                                ? `عرض جميع النتائج لـ "${query}" (${totalMatches} نتيجة)`
                                : `View all ${totalMatches} results for "${query}"`}
                            </span>
                            <ArrowLeft size={14} className={lang === "ar" ? "" : "rotate-180"} />
                          </button>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <div className="nav-right">
            {/* Language & Currency Selector */}
            <button
              type="button"
              className="gx-nav-lang-compact-btn"
              onClick={() => setCurrencyOpen(true)}
              title={lang === "ar" ? "تغيير العملة واللغة" : "Change currency & language"}
            >
              <Globe size={13} strokeWidth={2.2} />
              <span className="gx-lang-txt">{lang === "ar" ? "العربية" : "EN"}</span>
              <span className="gx-lang-divider">·</span>
              <span className="gx-curr-txt">{currency}</span>
            </button>

            {/* 1. Wishlist Button (Clean borderless floating icon) */}
            <Link
              to="/favorites"
              className="gx-nav-ghost-btn gx-nav-wishlist-ghost"
              title={lang === "ar" ? "المفضلة" : "Wishlist"}
              aria-label={lang === "ar" ? "المفضلة" : "Wishlist"}
            >
              <Heart size={21} strokeWidth={1.8} />
              {favCount > 0 && <span className="gx-floating-badge gx-wishlist-badge">{favCount}</span>}
            </Link>

            {/* 2. Shopping Cart Button (Clean borderless floating icon + Badge) */}
            <button
              type="button"
              className="gx-nav-ghost-btn gx-nav-cart-ghost"
              onClick={(e) => {
                e.preventDefault();
                if (typeof window !== "undefined" && window.innerWidth <= 768) {
                  navigate({ to: "/cart" });
                } else {
                  cart.openDrawer();
                }
              }}
              title={t("nav.cart_title") || (lang === "ar" ? "السلة" : "Cart")}
              aria-label={t("nav.cart_title") || (lang === "ar" ? "السلة" : "Cart")}
            >
              <ShoppingCart size={21} strokeWidth={1.8} />
              {cart.count > 0 && <span className="gx-floating-badge">{cart.count}</span>}
            </button>

            {/* 3. Play Arena Controller Icon (Clean borderless floating icon directly next to Cart) */}
            <Link
              to="/games"
              className="gx-nav-ghost-btn gx-nav-arena-ghost"
              title={lang === "ar" ? "ساحة اللعب" : "Play Arena"}
              aria-label={lang === "ar" ? "ساحة اللعب" : "Play Arena"}
            >
              <Gamepad2 size={21} strokeWidth={1.8} />
            </Link>

            {/* 4. User Account / Login Pill Button */}
            {session ? (
              <div className="account-wrap" onMouseEnter={cancelClose} onMouseLeave={scheduleClose}>
                <button
                  type="button"
                  className="gx-nav-avatar-btn"
                  onClick={(e) => { e.stopPropagation(); cancelClose(); setAccountOpen(v => !v); }}
                  onMouseEnter={() => { cancelClose(); setAccountOpen(true); }}
                  aria-label={t("nav.account")}
                >
                  {avatarUrl ? <img src={avatarUrl} alt="" /> : <span className="account-avatar-fallback">{initials}</span>}
                  <span className="account-lvl-dot">{level}</span>
                </button>
                <div className={"account-panel" + (accountOpen ? " open" : "")} onMouseEnter={cancelClose} onMouseLeave={scheduleClose}>
                  {username ? (
                    <Link to="/u/$username" params={{ username }} className="acc-hero" onClick={() => setAccountOpen(false)}>
                      <span className="acc-hero__av">
                        {avatarUrl ? <img src={avatarUrl} alt="" /> : <span className="account-avatar-fallback">{initials}</span>}
                      </span>
                      <span className="acc-hero__txt">
                        <span className="acc-hero__name" dir="ltr">@{username}</span>
                      </span>
                      <span className="acc-hero__lvl">Lv {level}</span>
                    </Link>
                  ) : (
                    <Link to="/account" search={{ tab: "profile" } as never} className="acc-hero" onClick={() => setAccountOpen(false)}>
                      <span className="acc-hero__av">
                        {avatarUrl ? <img src={avatarUrl} alt="" /> : <span className="account-avatar-fallback">{initials}</span>}
                      </span>
                      <span className="acc-hero__txt">
                        <span className="acc-hero__name">{displayName}</span>
                        <span className="acc-hero__handle" dir="ltr">{profile?.email}</span>
                      </span>
                      <span className="acc-hero__lvl">Lv {level}</span>
                    </Link>
                  )}

                  <div className="acc-balances">
                    <div className="acc-bal">
                      <span className="acc-bal__l">💳 {lang === "en" ? "Balance" : "الرصيد"}</span>
                      <b className="acc-bal__v credit">{format(Number(profile?.store_credit_jod ?? 0))}</b>
                      <small>{currency}</small>
                    </div>
                    {username ? (
                      <Link to="/u/$username" params={{ username }} className="acc-bal acc-bal--link" onClick={() => setAccountOpen(false)}>
                        <span className="acc-bal__l"><GxIcon name="coin" size={14} /> GX Coins ›</span>
                        <b className="acc-bal__v coins">{Number(profile?.gx_coins ?? 0).toLocaleString("en-US")}</b>
                        <small>≈ {formatCoins(Number(profile?.gx_coins ?? 0))}</small>
                      </Link>
                    ) : (
                      <Link to="/rewards" className="acc-bal acc-bal--link" onClick={() => setAccountOpen(false)}>
                        <span className="acc-bal__l"><GxIcon name="coin" size={14} /> GX Coins ›</span>
                        <b className="acc-bal__v coins">{Number(profile?.gx_coins ?? 0).toLocaleString("en-US")}</b>
                        <small>≈ {formatCoins(Number(profile?.gx_coins ?? 0))}</small>
                      </Link>
                    )}
                  </div>

                  <div className="acc-divider" />

                  <div className="acc-group">
                    <Link to="/account" search={{ tab: "profile" } as never} className="acc-link" onClick={() => setAccountOpen(false)}>
                      <span className="ai">👤</span><span>{t("nav.account")}</span>
                    </Link>
                    <Link to="/account" search={{ tab: "orders" } as never} className="acc-link" onClick={() => setAccountOpen(false)}>
                      <span className="ai">📦</span><span>{t("nav.orders")}</span>
                    </Link>
                    <button
                      type="button"
                      className="acc-link"
                      onClick={() => { setAccountOpen(false); setWheelOpen(true); }}
                    >
                      <span className="ai">🎡</span><span>{lang === "en" ? "Daily Wheel" : "عجلة الحظ"}</span>
                    </button>
                    <Link to="/account" search={{ tab: "security" } as never} className="acc-link" onClick={() => setAccountOpen(false)}>
                      <span className="ai">⚙️</span><span>{t("nav.settings")}</span>
                    </Link>
                    {isAdmin && (
                      <Link to="/admin" className="acc-link acc-admin" onClick={() => setAccountOpen(false)}>
                        <span className="ai">🛡️</span><span>{t("nav.admin_panel")}</span>
                      </Link>
                    )}
                  </div>

                  <div className="acc-divider" />
                  <button type="button" className="acc-link acc-logout" onClick={signOut}>
                    <span className="ai">🚪</span><span>{t("nav.logout")}</span>
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="gx-nav-login-pill"
                onClick={() => setAuthOpen(true)}
                aria-label={t("nav.login")}
              >
                <User size={18} strokeWidth={2} />
                <span>{lang === "ar" ? "تسجيل الدخول" : "Log in"}</span>
              </button>
            )}
          </div>
        </div>
      </nav>
      {mounted && typeof document !== "undefined" && createPortal(
        <>
          <div
            className={"gx-mobile-menu-overlay" + (menuOpen ? " open" : "")}
            onClick={() => setMenuOpen(false)}
          />
          <div className={"menu-panel" + (menuOpen ? " open" : "")}>
            {/* Drawer Top Header with Logo and Close Button */}
            <div className="gx-mobile-menu-header">
              <div className="brand" style={{ margin: 0, gap: 6 }}>
                <div className="mark"><img src="/app/assets/img/gx-logo.png" alt="GX" /></div>
                <div className="brand-word">GX <span>STORE</span></div>
              </div>
              <button
                type="button"
                className="gx-mobile-menu-close-btn"
                onClick={() => setMenuOpen(false)}
                aria-label={lang === "ar" ? "إغلاق القائمة" : "Close menu"}
              >
                <X size={20} />
              </button>
            </div>

            {/* Currency & Language Change inside menu */}
            <div className="menu-section gx-menu-lang-section">
              <button
                type="button"
                className="menu-link gx-menu-lang-btn"
                onClick={() => { setMenuOpen(false); setCurrencyOpen(true); }}
              >
                <span className="mi">🌐</span>
                <div className="gx-menu-lang-info">
                  <span className="gx-menu-lang-title">{lang === "ar" ? "تغيير العملة واللغة" : "Currency & Language"}</span>
                  <span className="gx-menu-lang-sub">{currency} · {lang === "ar" ? "العربية" : "English"}</span>
                </div>
                <span className="gx-menu-lang-arrow">›</span>
              </button>
            </div>

            <div className="menu-divider" />

            <div className="menu-section">
              <div className="ms-title">{t("nav.pages")}</div>
              <MenuLink to="/" icon="🏠" label={t("nav.home")} onClick={() => setMenuOpen(false)} />
              <MenuLink to="/cart" icon="🛒" label={t("nav.cart")} onClick={() => setMenuOpen(false)} />
              <MenuLink to="/favorites" icon="🤍" label={lang === "ar" ? "المفضلة" : "Wishlist"} onClick={() => setMenuOpen(false)} />
              <MenuLink to="/faq" icon="❓" label={t("nav.faq")} onClick={() => setMenuOpen(false)} />
              <MenuLink to="/policy" icon="🛡️" label={t("nav.policy")} onClick={() => setMenuOpen(false)} />
              <MenuLink to="/games" icon="🎮" label={lang === "en" ? "Play Arena" : "ساحة اللعب"} onClick={() => setMenuOpen(false)} />
            </div>

            <div className="menu-divider" />

            <div className="menu-section">
              <div className="ms-title">{t("nav.categories")}</div>
              {CATEGORY_LINKS.filter(c0 => !hiddenCats.has(c0.slug)).map(c0 => {
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
                <span className="mi">💬</span>
                <span>{t("nav.whatsapp")}</span>
                <span className="wa-number" dir="ltr">+962 77 625 2313</span>
              </a>
            </div>
          </div>
        </>,
        document.body
      )}
      <CurrencyModal open={currencyOpen} onClose={() => setCurrencyOpen(false)} />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      <SpinWheelModal open={wheelOpen} onOpenChange={setWheelOpen} />
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
