import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { CurrencyProvider } from "@/lib/gx/currency";
import { CartProvider } from "@/lib/gx/cart";
import { LanguageProvider } from "@/lib/gx/i18n";
import { SiteSettingsProvider } from "@/lib/gx/site-settings";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";

// Ensure legacy store stylesheets are present regardless of entry route.
// Without this, refreshing on /account or /admin loads the app without the
// store CSS, and navigating back to the storefront renders unstyled until
// the browser fetches the sheets.
if (typeof document !== "undefined") {
  for (const l of STORE_HEAD_LINKS) {
    if (document.head.querySelector(`link[data-gx-store="${l.href}"]`)) continue;
    const el = document.createElement("link");
    el.rel = l.rel;
    el.href = l.href;
    el.setAttribute("data-gx-store", l.href);
    document.head.appendChild(el);
  }
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">الصفحة غير موجودة</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          الرابط اللي دخلته مش موجود أو اتنقل.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            العودة للرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          صار خطأ بتحميل الصفحة
        </h1>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            حاول مرة ثانية
          </button>
          <Link to="/" className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium">
            الرئيسية
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

  useEffect(() => {
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
              <Outlet />
              <Toaster richColors position="top-center" />
            </CartProvider>
          </CurrencyProvider>
        </LanguageProvider>
      </SiteSettingsProvider>
    </QueryClientProvider>
  );
}
