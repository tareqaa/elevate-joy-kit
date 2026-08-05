import { createFileRoute, notFound } from "@tanstack/react-router";
import { StoreShell } from "@/components/gx/StoreShell";
import { getCatalogProduct } from "@/lib/gx/catalog.functions";
import { ProductTemplate } from "@/components/gx/ProductTemplates";
import { getStoreHeadLinks, PAGE_CSS } from "@/lib/gx/store-head";

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
    
    // Choose specific CSS based on template
    const cssKeys: (keyof typeof PAGE_CSS)[] = ["product"];
    if (p?.pageTemplate === "multi_account") cssKeys.push("snapchat");
    else if (p?.pageTemplate === "gift_card") cssKeys.push("giftcard");
    else if (p?.pageTemplate === "dual_plans") cssKeys.push("fortnite");

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
      links: getStoreHeadLinks(cssKeys),
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
  return (
    <StoreShell>
      <ProductTemplate product={product} />
    </StoreShell>
  );
}
