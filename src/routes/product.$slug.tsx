import { useEffect } from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { StoreShell } from "@/components/gx/StoreShell";
import { getCatalogProduct } from "@/lib/gx/catalog.functions";
import { ProductTemplate } from "@/components/gx/ProductTemplates";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";
import { trackRecentlyViewed } from "@/lib/gx/recently-viewed";

export const Route = createFileRoute("/product/$slug")({
  staleTime: 0,
  gcTime: 5000,
  loader: async ({ params }) => {
    const product = await getCatalogProduct({ data: { slug: params.slug, bypassCache: true } });
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => {
    const p = loaderData?.product;
    const prodName = p?.nameAr || p?.nameEn || "منتج";
    const title = p ? `${prodName} | متجر GX Store` : "منتج | متجر GX Store";
    const desc =
      p?.taglineAr ||
      p?.descriptionAr ||
      `اشتري ${prodName} رسمي 100% بأفضل سعر وتفعيل فوري من متجر GX Store في الأردن والشرق الأوسط.`;
    const canonical = p ? `https://gxstore.me/product/${p.slug}` : "https://gxstore.me/products";
    const img = p?.imageUrl
      ? p.imageUrl.startsWith("http")
        ? p.imageUrl
        : `https://gxstore.me${p.imageUrl}`
      : "https://gxstore.me/app/assets/img/gx-logo-hires.jpg";

    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:site_name", content: "GX Store" },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "product" },
        { property: "og:url", content: canonical },
        { property: "og:image", content: img },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
        { name: "twitter:image", content: img },
        ...(p
          ? [
              {
                name: "robots",
                content: "index, follow, max-image-preview:large, max-snippet:-1",
              },
            ]
          : [{ name: "robots", content: "noindex" }]),
      ],
      links: [
        ...STORE_HEAD_LINKS,
        { rel: "canonical", href: canonical },
      ],
    };
  },
  errorComponent: ({ error }) => (
    <StoreShell>
      <section className="section"><div className="wrap"><h1>{error.message}</h1></div></section>
    </StoreShell>
  ),
  notFoundComponent: () => (
    <StoreShell>
      <section className="section"><div className="wrap"><h1>404</h1></div></section>
    </StoreShell>
  ),
  component: ProductPage,
});

function ProductPage() {
  const { product } = Route.useLoaderData();

  const variants = product?.variants || [];
  const firstVariant = variants.length > 0 ? variants[0] : null;
  const variantPrices = variants
    .map((v) => Number(v.price))
    .filter((p) => !isNaN(p) && p > 0);
  const effectivePrice = firstVariant && Number(firstVariant.price) > 0 ? Number(firstVariant.price) : (variantPrices.length > 0 ? Math.min(...variantPrices) : (product?.basePriceJod || 0));

  // If the product has specific packages/quantities (e.g. followers, V-Bucks, months),
  // specify the package in the title so user sees e.g. "متابعين إنستقرام (1000 متابع)" with its exact price:
  const isGenericTitle = (title: string, vLabel: string) => {
    return !title.toLowerCase().includes(vLabel.toLowerCase().trim());
  };

  const resolvedNameAr =
    firstVariant && firstVariant.labelAr && isGenericTitle(product.nameAr, firstVariant.labelAr)
      ? `${product.nameAr} (${firstVariant.labelAr})`
      : product.nameAr;

  const resolvedNameEn =
    firstVariant && (firstVariant.labelEn || firstVariant.labelAr) && isGenericTitle(product.nameEn || product.nameAr, firstVariant.labelEn || firstVariant.labelAr)
      ? `${product.nameEn || product.nameAr} (${firstVariant.labelEn || firstVariant.labelAr})`
      : (product.nameEn || product.nameAr);

  // Take description from product tagline, product description, or category description as requested:
  const resolvedDescAr = product.taglineAr || product.descriptionAr || product.categoryDescriptionAr || undefined;
  const resolvedDescEn = product.taglineEn || product.descriptionEn || product.categoryDescriptionEn || undefined;

  useEffect(() => {
    if (!product) return;
    if (typeof window === "undefined") return;

    const timer = window.setTimeout(() => {
      const hash = window.location.hash ? window.location.hash.replace("#", "") : "";
      const searchParams = new URLSearchParams(window.location.search);
      const planParam = searchParams.get("plan") || hash;

      // 1. Fortnite specific handling (Crew vs V-Bucks packs)
      if (product.slug === "fortnite") {
        const isVb = planParam && planParam.startsWith("fn-vb");
        const isCrew3 = planParam === "fn-crew-3";

        if (isVb) {
          const vbMap: Record<string, { nameAr: string; nameEn: string; price: number; oldPrice: number; img: string }> = {
            "fn-vb-800": {
              nameAr: "فورت نايت — 800 وحدة V-Bucks",
              nameEn: "Fortnite — 800 V-Bucks",
              price: 5,
              oldPrice: 7,
              img: "https://cdn1.epicgames.com/offer/fn/EN_FNECO_41-00_RMT_CoreV-BucksPacks_800_EGS_Portrait_1200x1600_1200x1600-79529d8c20514e82ae2ebce58991b912",
            },
            "fn-vb-2400": {
              nameAr: "فورت نايت — 2400 وحدة V-Bucks",
              nameEn: "Fortnite — 2400 V-Bucks",
              price: 12,
              oldPrice: 16,
              img: "https://cdn1.epicgames.com/offer/fn/EN_FNECO_41-00_RMT_CoreV-BucksPacks_2400_EGS_Landscape_2560x1440_2560x1440-e51d802c9d414431973ae3e2ba60528d",
            },
            "fn-vb-4500": {
              nameAr: "فورت نايت — 4500 وحدة V-Bucks",
              nameEn: "Fortnite — 4500 V-Bucks",
              price: 19,
              oldPrice: 25,
              img: "https://cdn1.epicgames.com/offer/fn/EN_FNECO_41-00_RMT_CoreV-BucksPacks_4500_EGS_Landscape_2560x1440_2560x1440-799cfafb76bf4ae795fece5e4c0de4a3",
            },
            "fn-vb-12500": {
              nameAr: "فورت نايت — 12500 وحدة V-Bucks",
              nameEn: "Fortnite — 12500 V-Bucks",
              price: 38,
              oldPrice: 49,
              img: "https://cdn1.epicgames.com/offer/fn/EN_FNECO_41-00_RMT_CoreV-BucksPacks_12500_EGS_Portrait_1200x1600_1200x1600-070f17d0f6a34e9180b2927c8c24c40e",
            },
          };
          const selectedVb = vbMap[planParam] || vbMap["fn-vb-800"];
          trackRecentlyViewed({
            slug: "fortnite",
            cartId: planParam,
            link: `/product/fortnite#${planParam}`,
            nameAr: selectedVb.nameAr,
            nameEn: selectedVb.nameEn,
            price: selectedVb.price,
            oldPrice: selectedVb.oldPrice,
            imageUrl: selectedVb.img,
            categorySlug: "games",
          });
          return;
        }

        // Default or Crew
        const is3m = isCrew3;
        trackRecentlyViewed({
          slug: "fortnite",
          cartId: is3m ? "fn-crew-3" : "fn-crew",
          link: `/product/fortnite#${is3m ? "fn-crew-3" : "fn-crew"}`,
          nameAr: is3m ? "فورت نايت كرو — 3 أشهر" : "فورت نايت كرو — شهر",
          nameEn: is3m ? "Fortnite Crew — 3 Months" : "Fortnite Crew — 1 Month",
          price: is3m ? 9 : 4,
          oldPrice: is3m ? 12 : 6,
          imageUrl: "https://cdn1.epicgames.com/offer/fn/FNECO_41-30_August_Crew_Lineup_EGS_Launcher_Blade_1200x1600_1200x1600-911e7061d0aa458aa67d4e5897fcb473",
          categorySlug: "games",
        });
        return;
      }

      // 2. Snapchat specific handling
      if (product.slug === "snapchat") {
        const snapDur = planParam || "snap-6";
        const snapMap: Record<string, { nameAr: string; nameEn: string; price: number; oldPrice: number }> = {
          "snap-3": { nameAr: "سناب بلس — 3 أشهر", nameEn: "Snapchat+ — 3 Months", price: 5, oldPrice: 7 },
          "snap-6": { nameAr: "سناب بلس — 6 أشهر", nameEn: "Snapchat+ — 6 Months", price: 9, oldPrice: 14 },
          "snap-12": { nameAr: "سناب بلس — 12 شهر", nameEn: "Snapchat+ — 12 Months", price: 17, oldPrice: 26 },
        };
        const selectedSnap = snapMap[snapDur] || snapMap["snap-6"];
        trackRecentlyViewed({
          slug: "snapchat",
          cartId: snapDur,
          link: `/product/snapchat?plan=${snapDur}`,
          nameAr: selectedSnap.nameAr,
          nameEn: selectedSnap.nameEn,
          price: selectedSnap.price,
          oldPrice: selectedSnap.oldPrice,
          imageUrl: "/app/assets/img/snapchat-logo.png",
          categorySlug: "social-media",
        });
        return;
      }

      // 3. Adobe specific handling
      if (product.slug === "adobe") {
        trackRecentlyViewed({
          slug: "adobe",
          cartId: "adobe-1",
          link: "/product/adobe",
          nameAr: "أدوبي كرييتف كلاود — اشتراك شهر",
          nameEn: "Adobe Creative Cloud — 1 Month",
          price: 10,
          oldPrice: 15,
          imageUrl: "/app/assets/img/adobe-cc.webp",
          categorySlug: "design",
        });
        return;
      }

      // 4. Default for other products
      trackRecentlyViewed({
        slug: product.slug,
        nameAr: resolvedNameAr,
        nameEn: resolvedNameEn,
        taglineAr: resolvedDescAr,
        taglineEn: resolvedDescEn,
        price: effectivePrice,
        oldPrice: firstVariant?.oldPrice ? Number(firstVariant.oldPrice) : (product.oldPriceJod || undefined),
        imageUrl: (firstVariant as any)?.imageUrl || product.imageUrl || undefined,
        icon: product.icon || undefined,
        categorySlug: product.categoryNameEn?.toLowerCase() || undefined,
      });
    }, 1000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [product, effectivePrice, resolvedNameAr, resolvedNameEn, resolvedDescAr, resolvedDescEn]);

  const productImageUrl = product.imageUrl
    ? product.imageUrl.startsWith("http")
      ? product.imageUrl
      : `https://gxstore.me${product.imageUrl}`
    : "https://gxstore.me/app/assets/img/gx-logo.png";

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.nameAr || product.nameEn,
    description:
      product.descriptionAr ||
      product.taglineAr ||
      `${product.nameAr} - تفعيل رسمي وتسليم فوري من متجر GX Store`,
    image: [productImageUrl],
    sku: product.slug,
    brand: {
      "@type": "Brand",
      name: "GX Store",
    },
    offers: {
      "@type": "Offer",
      url: `https://gxstore.me/product/${product.slug}`,
      priceCurrency: "JOD",
      price: Number(effectivePrice || 0).toFixed(2),
      priceValidUntil: "2027-12-31",
      itemCondition: "https://schema.org/NewCondition",
      availability: "https://schema.org/InStock",
      seller: {
        "@type": "Organization",
        name: "GX Store",
      },
    },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "الرئيسية",
        item: "https://gxstore.me/",
      },
      ...(product.categoryNameAr
        ? [
            {
              "@type": "ListItem",
              position: 2,
              name: product.categoryNameAr,
              item: "https://gxstore.me/products",
            },
            {
              "@type": "ListItem",
              position: 3,
              name: product.nameAr || product.nameEn,
              item: `https://gxstore.me/product/${product.slug}`,
            },
          ]
        : [
            {
              "@type": "ListItem",
              position: 2,
              name: product.nameAr || product.nameEn,
              item: `https://gxstore.me/product/${product.slug}`,
            },
          ]),
    ],
  };

  return (
    <StoreShell>
      {/* Structured Data: Product & BreadcrumbList Schemas */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <ProductTemplate product={product} />
    </StoreShell>
  );
}
