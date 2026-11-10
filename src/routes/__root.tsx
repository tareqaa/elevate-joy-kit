import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  ScrollRestoration,
} from "@tanstack/react-router";
import { useEffect, useState, useRef, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { checkDeviceSessionStatusServer } from "@/lib/gx/security.functions";
import { CurrencyProvider } from "@/lib/gx/currency";
import { CartProvider } from "@/lib/gx/cart";
import { LanguageProvider, getHeadLang } from "@/lib/gx/i18n";
import { SiteSettingsProvider, useSiteSettings } from "@/lib/gx/site-settings";
import { ensureStoreStyles } from "@/lib/gx/store-head";

// Ensure legacy store stylesheets are present regardless of entry route.
// Without this, refreshing on /account or /admin loads the app without the
// store CSS, and navigating back to the storefront renders unstyled until
// the browser fetches the sheets.
ensureStoreStyles();

// Error/404 boundaries must not depend on LanguageProvider's context — if
// something upstream is broken badly enough to land here, the provider tree
// may not be reliable either. Read the saved preference directly instead.
function boundaryLang(): "ar" | "en" {
  if (typeof window === "undefined") return "ar";
  try {
    const s = localStorage.getItem("gx_lang");
    return s === "en" ? "en" : "ar";
  } catch {
    return "ar";
  }
}

function NotFoundComponent() {
  const en = boundaryLang() === "en";
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          {en ? "Page not found" : "الصفحة غير موجودة"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {en ? "That link doesn't exist or has moved." : "الرابط اللي دخلته مش موجود أو اتنقل."}
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {en ? "Back to home" : "العودة للرئيسية"}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error: rawError, reset }: { error: unknown; reset: () => void }) {
  const error = rawError as Error;
  console.error("[TanStack Root Error]", rawError);
  const router = useRouter();
  const en = boundaryLang() === "en";

  useEffect(() => {
    if ((rawError as any)?.to) {
      void router.navigate({ to: (rawError as any).to });
      return;
    }
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [rawError]);

  const msg =
    error instanceof Response
      ? `HTTP ${error.status}: ${error.statusText || ""}`
      : error instanceof Error
        ? error.message || error.name
        : typeof rawError === "string"
          ? rawError
          : "";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {en ? "Something went wrong loading this page" : "صار خطأ بتحميل الصفحة"}
        </h1>
        {msg && (
          <p className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 p-2.5 text-xs text-red-300 font-mono text-center break-words max-w-sm mx-auto" dir="ltr">
            {msg}
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {en ? "Try again" : "حاول مرة ثانية"}
          </button>
          <Link to="/" className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium">
            {en ? "Home" : "الرئيسية"}
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => {
    const isEn = getHeadLang() === "en";
    const siteTitle = isEn
      ? "GX Store | Buy Games, Giftcard & Top ups cheaper"
      : "GX Store | اشتري ألعاب، بطاقات هدايا وشحن بأوفر الأسعار";
    const siteDesc = isEn
      ? "Discover your favorite digital store for gaming and subscriptions. Shop gift cards, keys, game top-ups, and subscriptions at competitive prices with instant delivery and reliable support."
      : "اكتشف وجهتك المفضلة للألعاب والمنتجات الرقمية. تسوّق بطاقات الهدايا والشحن والاشتراكات بأسعار تنافسية، واستمتع بتجربة شراء سهلة وآمنة مع دعم موثوق.";

    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { title: siteTitle },
        { name: "description", content: siteDesc },
        { property: "og:site_name", content: "GX Store" },
        { property: "og:title", content: siteTitle },
        { property: "og:description", content: siteDesc },
        { property: "og:type", content: "website" },
        { property: "og:url", content: "https://gxstore.me/" },
        { property: "og:image", content: "https://gxstore.me/app/assets/img/gx-logo-hires.jpg" },
        { property: "og:image:secure_url", content: "https://gxstore.me/app/assets/img/gx-logo-hires.jpg" },
        { property: "og:image:type", content: "image/jpeg" },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { property: "og:image:alt", content: "GX Store" },
        { property: "og:logo", content: "https://gxstore.me/app/assets/img/gx-logo.png" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: siteTitle },
        { name: "twitter:description", content: siteDesc },
        { name: "twitter:image", content: "https://gxstore.me/app/assets/img/gx-logo-hires.jpg" },
        { name: "theme-color", content: "#090b10" },
      ],
      links: [
        { rel: "stylesheet", href: appCss },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
        { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Tajawal:wght@500;700;800;900&family=Almarai:wght@400;700;800&display=swap" },
        { rel: "icon", href: "/favicon.ico", sizes: "any" },
        { rel: "icon", href: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
        { rel: "icon", href: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
        { rel: "android-chrome-512x512.png", type: "image/png", sizes: "512x512", href: "/android-chrome-512x512.png" },
        { rel: "icon", href: "/android-chrome-192x192.png", type: "image/png", sizes: "192x192" },
        { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
        { rel: "manifest", href: "/site.webmanifest" },
      ],
    };
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

const PRE_HYDRATE_LANG = `
(function(){
  try {
    var s = localStorage.getItem('gx_lang');
    var isAr = true;

    if (s === 'en') {
      isAr = false;
    } else if (s === 'ar') {
      isAr = true;
    } else {
      // First visit / no saved preference: detect from cached country or timezone (0ms)
      var cachedCc = (localStorage.getItem('gx_country_code') || localStorage.getItem('gx_lang_geo_cc') || '').toUpperCase();
      var ARAB_COUNTRIES = {JO:1,PS:1,SA:1,AE:1,KW:1,QA:1,OM:1,BH:1,IQ:1,EG:1,MA:1,DZ:1,TN:1,LB:1,SY:1,YE:1,LY:1,SD:1,MR:1,SO:1,DJ:1,KM:1};
      
      if (cachedCc) {
        isAr = !!ARAB_COUNTRIES[cachedCc];
      } else {
        var tz = '';
        try { tz = (typeof Intl !== 'undefined' && Intl.DateTimeFormat().resolvedOptions().timeZone) || ''; } catch(e){}
        var isArabTz = /amman|riyadh|cairo|dubai|abu_dhabi|baghdad|kuwait|qatar|bahrain|muscat|beirut|damascus|jerusalem|gaza|hebron|khartoum|tripoli|algiers|tunis|casablanca|sanaa|aden|nouakchott|mogadishu|djibouti/i.test(tz);
        var navLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
        var isArNav = navLang.indexOf('ar') === 0;

        // If visiting from a non-Arab timezone (e.g. Istanbul, Europe, US, etc.), prioritize English
        if (tz && !isArabTz) {
          isAr = false;
        } else if (isArabTz) {
          isAr = true;
        } else {
          isAr = isArNav;
        }
      }
    }

    var h = document.documentElement;
    if (!isAr) {
      h.setAttribute('lang', 'en');
      h.setAttribute('dir', 'ltr');
      var enTitle = "GX Store | Buy Games, Giftcard & Top ups cheaper";
      document.title = enTitle;
      var tTag = document.querySelector('title');
      if (tTag) tTag.textContent = enTitle;

      try {
        if (!localStorage.getItem('gx_lang')) localStorage.setItem('gx_lang', 'en');
        if (!localStorage.getItem('gx_currency')) localStorage.setItem('gx_currency', 'USD');
      } catch(e){}

      h.setAttribute('data-lang-pending', '1');
      var st = document.createElement('style');
      st.id = 'gx-lang-gate';
      st.textContent = 'html[data-lang-pending] body{visibility:hidden!important}';
      document.head.appendChild(st);

      // Pre-hydration immediate title guard: instantly prevent any Arabic title flash
      if (typeof MutationObserver !== 'undefined') {
        var titleObs = new MutationObserver(function() {
          if (document.title && /[\\u0600-\\u06FF]/.test(document.title)) {
            var cur = document.title;
            if (cur.indexOf('استلام') !== -1 || cur.indexOf('طلب') !== -1) {
              document.title = 'Order Delivery & Activation | GX Store';
            } else if (cur.indexOf('السلة') !== -1) {
              document.title = 'Shopping Cart | GX Store';
            } else if (cur.indexOf('حساب') !== -1) {
              document.title = 'My Account | GX Store';
            } else {
              document.title = 'GX Store | Buy Games, Giftcard & Top ups cheaper';
            }
          }
        });
        if (tTag) titleObs.observe(tTag, { childList: true, characterData: true, subtree: true });
      }
    } else {
      h.setAttribute('lang', 'ar');
      h.setAttribute('dir', 'rtl');
      var arTitle = "GX Store | اشتري ألعاب، بطاقات هدايا وشحن بأوفر الأسعار";
      document.title = arTitle;
      var tTagAr = document.querySelector('title');
      if (tTagAr) tTagAr.textContent = arTitle;
    }
  } catch(e){}
})();
`;

const META_PIXEL_CODE = `
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '1273924824814592');
fbq('track', 'PageView');
`;

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className="dark" style={{ backgroundColor: "#090b10" }} suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: PRE_HYDRATE_LANG }} />
        {/* Meta Pixel Code */}
        <script dangerouslySetInnerHTML={{ __html: META_PIXEL_CODE }} />
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=1273924824814592&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
        {/* End Meta Pixel Code */}
      </head>
      <body style={{ backgroundColor: "#090b10", color: "#f5f6f8" }}>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function AppGate({ authReady }: { authReady: boolean }) {
  const settings = useSiteSettings();
  const [gateReady, setGateReady] = useState(false);

  useEffect(() => {
    if (!authReady) return;

    // Keep the splash screen for ~1.3s to 1.5s on page load/refresh
    // to ensure Supabase database settings have 100% loaded and applied
    const startTime = Date.now();
    const MIN_SPLASH_MS = 1300;
    const MAX_TIMEOUT_MS = 2200;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (settings.dbFetched && elapsed >= MIN_SPLASH_MS) {
        setGateReady(true);
        clearInterval(interval);
      } else if (elapsed >= MAX_TIMEOUT_MS) {
        setGateReady(true);
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [authReady, settings.dbFetched]);

  const isRevealed = authReady && gateReady;

  return (
    <>
      <div
        style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "#090b10",
          zIndex: 99999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          transition: "opacity 0.4s ease, visibility 0.4s",
          pointerEvents: isRevealed ? "none" : "auto",
          opacity: isRevealed ? 0 : 1,
          visibility: isRevealed ? "hidden" : "visible",
        }}
      >
        <div className="relative flex items-center justify-center">
          <img
            src="/app/assets/img/gx-logo.png"
            alt="GX Store"
            style={{ width: 84, height: 84, objectFit: "contain", zIndex: 2, position: "relative" }}
          />
          <div
            style={{
              position: "absolute",
              width: 120, height: 120,
              border: "3px solid transparent",
              borderTopColor: "var(--cyan)",
              borderRightColor: "var(--cyan)",
              borderRadius: "50%",
              animation: "gx-spin 1s linear infinite",
              opacity: 0.7,
              boxShadow: "0 0 16px rgba(0, 229, 255, 0.25)",
            }}
          />
          <div
            style={{
              position: "absolute",
              width: 146, height: 146,
              border: "2.5px solid transparent",
              borderBottomColor: "#3b82f6",
              borderLeftColor: "#3b82f6",
              borderRadius: "50%",
              animation: "gx-spin 1.5s linear infinite reverse",
              opacity: 0.45,
            }}
          />
        </div>
        <style>{`
          @keyframes gx-spin { 100% { transform: rotate(360deg); } }
        `}</style>
      </div>

      <div style={{ opacity: isRevealed ? 1 : 0, transition: "opacity 0.4s ease", minHeight: "100vh" }}>
        <ScrollRestoration />
        <Outlet />
      </div>
      <Toaster richColors position="top-center" />
    </>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthReady(true);
      if (session?.user?.id) {
        // Auto-cancel scheduled account deletion if user visits with active session
        void (supabase.rpc as any)("cancel_scheduled_deletion");
        void supabase
          .from("profiles")
          .update({ scheduled_deletion_at: null, deletion_reason: null } as any)
          .eq("id", session.user.id);

        supabase.rpc("claim_unregistered_credits_for_user", { _user_id: session.user.id })
          .then(
            (res) => {
              if ((res.data as any)?.claimed_count > 0) {
                queryClient.invalidateQueries();
              }
            },
            () => {}
          );
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") {
        queryClient.invalidateQueries();
        if ((event === "SIGNED_IN" || event === "USER_UPDATED") && session?.user?.id) {
          // Auto-cancel scheduled account deletion whenever user signs in
          void (supabase.rpc as any)("cancel_scheduled_deletion").then(({ data }: any) => {
            if ((data as any)?.reactivated) {
              queryClient.invalidateQueries();
            }
          });
          void supabase
            .from("profiles")
            .update({ scheduled_deletion_at: null, deletion_reason: null } as any)
            .eq("id", session.user.id)
            .then(() => queryClient.invalidateQueries());

          supabase.rpc("claim_unregistered_credits_for_user", { _user_id: session.user.id })
            .then(
              (res) => {
                if ((res.data as any)?.claimed_count > 0) {
                  queryClient.invalidateQueries();
                }
              },
              () => {}
            );
        }
      }
    });

    const onAuthChanged = () => {
      router.invalidate();
      queryClient.invalidateQueries();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("gx-auth-changed", onAuthChanged);
    }

    return () => {
      sub.subscription.unsubscribe();
      if (typeof window !== "undefined") {
        window.removeEventListener("gx-auth-changed", onAuthChanged);
      }
    };
  }, [router, queryClient]);

  // Active check to enforce device session revocation across other browsers
  useEffect(() => {
    if (typeof window === "undefined") return;

    let timer: any = null;
    let cancelled = false;

    async function checkMyDevice() {
      try {
        const { data: sess } = await supabase.auth.getSession();
        if (!sess.session?.user) return;

        const devId = localStorage.getItem("gx_device_id");
        if (!devId) return;

        const res = await checkDeviceSessionStatusServer({ data: { deviceId: devId } });
        if (!cancelled && res.revoked) {
          localStorage.removeItem("gx_device_id");
          await supabase.auth.signOut({ scope: "local" });
          toast.error(
            document.documentElement.lang === "ar"
              ? "تم إنهاء جلستك من هذا الجهاز من جلسة أخرى."
              : "Your session on this device has been revoked."
          );
          router.invalidate();
          queryClient.invalidateQueries();
          window.location.href = "/auth";
        }
      } catch {}
    }

    timer = setInterval(checkMyDevice, 10_000);
    window.addEventListener("focus", checkMyDevice);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      window.removeEventListener("focus", checkMyDevice);
    };
  }, [router, queryClient]);

  // Track Meta Pixel PageView on client-side route changes
  const locationHref = router.state.location.href;
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (typeof window !== "undefined" && (window as any).fbq) {
      (window as any).fbq("track", "PageView");
    }
  }, [locationHref]);

  return (
    <QueryClientProvider client={queryClient}>
      <SiteSettingsProvider>
        <LanguageProvider>
          <CurrencyProvider>
            <CartProvider>
              <AppGate authReady={authReady} />
            </CartProvider>
          </CurrencyProvider>
        </LanguageProvider>
      </SiteSettingsProvider>
    </QueryClientProvider>
  );
}
