import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { CurrencyProvider } from "@/lib/gx/currency";
import { CartProvider } from "@/lib/gx/cart";
import { LanguageProvider } from "@/lib/gx/i18n";
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

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const en = boundaryLang() === "en";
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {en ? "Something went wrong loading this page" : "صار خطأ بتحميل الصفحة"}
        </h1>
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
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "GX Store | متجر ألعاب واشتراكات رقمية" },
      {
        name: "description",
        content:
          "GX Store متجر رقمي للألعاب والاشتراكات. اشتراكات، بطاقات هدايا، عملات ألعاب وخدمات رقمية بتفعيل سريع وأسعار منافسة.",
      },
      { property: "og:site_name", content: "GX Store" },
      { property: "og:title", content: "GX Store | متجر ألعاب واشتراكات رقمية" },
      {
        property: "og:description",
        content:
          "GX Store متجر رقمي للألعاب والاشتراكات. اشتراكات، بطاقات هدايا، عملات ألعاب وخدمات رقمية بتفعيل سريع وأسعار منافسة.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://gxstore.me/" },
      { property: "og:image", content: "https://gxstore.me/app/assets/img/gx-logo-hires.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "GX Store | متجر ألعاب واشتراكات رقمية" },
      {
        name: "twitter:description",
        content:
          "GX Store متجر رقمي للألعاب والاشتراكات. اشتراكات، بطاقات هدايا، عملات ألعاب وخدمات رقمية بتفعيل سريع وأسعار منافسة.",
      },
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
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
      { rel: "manifest", href: "/site.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

const PRE_HYDRATE_LANG = `
(function(){try{
  var s=localStorage.getItem('gx_lang');
  if(s!=='ar'&&s!=='en')return;
  var h=document.documentElement;
  h.setAttribute('lang',s);
  h.setAttribute('dir',s==='ar'?'rtl':'ltr');
  if(s!=='ar'){
    h.setAttribute('data-lang-pending','1');
    var st=document.createElement('style');
    st.id='gx-lang-gate';
    st.textContent='html[data-lang-pending] body{visibility:hidden!important}';
    document.head.appendChild(st);
  }
}catch(e){}})();
`;

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className="dark" style={{ backgroundColor: "#090b10" }} suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: PRE_HYDRATE_LANG }} />
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
    supabase.auth.getSession().then(() => {
      setAuthReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

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
