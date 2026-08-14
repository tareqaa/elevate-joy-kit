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
import { SiteSettingsProvider } from "@/lib/gx/site-settings";
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
      { title: "GX Store — متجر الألعاب والاشتراكات الرقمية" },
      { name: "description", content: "وجهتك الرقمية للاشتراكات وبطاقات الألعاب — تفعيل رسمي وتسليم فوري، أينما كنت حول العالم." },
      { property: "og:title", content: "GX Store" },
      { property: "og:description", content: "اشتراكات، بطاقات ألعاب، وتفعيل فوري." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#090b10" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Tajawal:wght@500;700;800;900&family=Almarai:wght@400;700;800&display=swap" },
      { rel: "icon", href: "/app/assets/img/gx-logo.png", type: "image/png" },
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

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    // Wait for the auth session to be known before revealing the app.
    supabase.auth.getSession().then(() => {
      setAppReady(true);
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
              {!appReady && (
                <div style={{
                  position: "fixed",
                  top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: "#090b10",
                  zIndex: 99999,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "column",
                  transition: "opacity 0.4s ease, visibility 0.4s",
                }}>
                  <div className="relative flex items-center justify-center">
                    <img src="/app/assets/img/gx-logo.png" alt="Elevate Joy" style={{ width: 80, height: 80, objectFit: "contain", zIndex: 2, position: "relative" }} />
                    <div style={{
                      position: "absolute",
                      width: 120, height: 120,
                      border: "3px solid transparent",
                      borderTopColor: "var(--cyan)",
                      borderRightColor: "var(--cyan)",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite",
                      opacity: 0.5
                    }} />
                    <div style={{
                      position: "absolute",
                      width: 140, height: 140,
                      border: "2px solid transparent",
                      borderBottomColor: "#3b82f6",
                      borderLeftColor: "#3b82f6",
                      borderRadius: "50%",
                      animation: "spin 1.5s linear infinite reverse",
                      opacity: 0.3
                    }} />
                  </div>
                  <style>{`
                    @keyframes spin { 100% { transform: rotate(360deg); } }
                  `}</style>
                </div>
              )}
              <div style={{ opacity: appReady ? 1 : 0, transition: "opacity 0.5s ease", minHeight: "100vh" }}>
                <Outlet />
              </div>
              <Toaster richColors position="top-center" />
            </CartProvider>
          </CurrencyProvider>
        </LanguageProvider>
      </SiteSettingsProvider>
    </QueryClientProvider>
  );
}
