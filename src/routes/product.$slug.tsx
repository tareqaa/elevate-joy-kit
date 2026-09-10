import { useEffect } from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { StoreShell } from "@/components/gx/StoreShell";
import { getCatalogProduct } from "@/lib/gx/catalog.functions";
import { ProductTemplate } from "@/components/gx/ProductTemplates";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";
import { trackRecentlyViewed } from "@/lib/gx/recently-viewed";

export const Route = createFileRoute("/product/$slug")({
  loader: async ({ params }) => {
    const product = await getCatalogProduct({ data: { slug: params.slug } });
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => {
    const p = loaderData?.product;
    const title = p ? `${p.nameEn || p.nameAr} — GX Store` : "Product — GX Store";
    const desc = p?.descriptionEn || p?.descriptionAr || "GX Store digital product";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(p ? [] : [{ name: "robots", content: "noindex" }]),
      ],
      links: STORE_HEAD_LINKS,
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

  useEffect(() => {
    if (product) {
      // Find lowest variant price for gift cards and products with variants
      const variantPrices = (product.variants || [])
        .map((v) => Number(v.priceJod))
        .filter((p) => !isNaN(p) && p > 0);
      const effectivePrice = variantPrices.length > 0 ? Math.min(...variantPrices) : (product.basePriceJod || 0);

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
  }, [product]);

  return (
    <StoreShell>
      <ProductTemplate product={product} />
    </StoreShell>
  );
}
