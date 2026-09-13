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

  const variantPrices = (product?.variants || [])
    .map((v) => Number(v.price))
    .filter((p) => !isNaN(p) && p > 0);
  const effectivePrice = variantPrices.length > 0 ? Math.min(...variantPrices) : (product?.basePriceJod || 0);

  useEffect(() => {
    if (product) {
      trackRecentlyViewed({
        slug: product.slug,
        nameAr: product.nameAr,
        nameEn: product.nameEn,
        taglineAr: product.taglineAr || undefined,
        taglineEn: product.taglineEn || undefined,
        price: effectivePrice,
        oldPrice: product.oldPriceJod || undefined,
        imageUrl: product.imageUrl || undefined,
        icon: product.icon || undefined,
        categorySlug: product.categoryNameEn?.toLowerCase() || undefined,
      });
    }
  }, [product, effectivePrice]);

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
