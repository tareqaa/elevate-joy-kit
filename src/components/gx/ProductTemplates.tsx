/* ============================================================
   GX STORE — DYNAMIC PRODUCT TEMPLATES
   One component per `products.page_template` value. All of them
   render from the database DTO returned by catalog.functions.ts.
   ============================================================ */

import { useMemo, useState, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import type { CatalogProduct, CatalogVariant } from "@/lib/gx/catalog.functions";
import { useCurrency } from "@/lib/gx/currency";
import { useCart } from "@/lib/gx/cart";
import { useLang } from "@/lib/gx/i18n";
import type { Lang } from "@/lib/gx/i18n";
import { BuyActions } from "@/components/gx/BuyActions";
import { DiscountBadge } from "@/components/gx/DiscountBadge";
import { FeatureAccordion, DeliveryBox, SectionHead } from "@/components/gx/Primitives";
import { CrewIcon, VbucksIcon } from "@/lib/gx/brand-icons";
import { useIsAdmin } from "@/lib/gx/admin-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, Settings } from "lucide-react";
import { ProductDialog, VariantsDialog } from "@/components/gx/admin/ProductsManager";



const pick = (lang: Lang, ar: string | null | undefined, en: string | null | undefined) =>
  (lang === "en" ? en || ar : ar || en) || "";

const discountOf = (v: CatalogVariant) =>
  v.oldPrice && v.oldPrice > v.price ? Math.round((1 - v.price / v.oldPrice) * 100) : 0;

function useLocalized(p: CatalogProduct) {
  const { lang } = useLang();
  return useMemo(
    () => ({
      lang,
      name: pick(lang, p.nameAr, p.nameEn),
      tagline: pick(lang, p.taglineAr, p.taglineEn) || pick(lang, p.nameAr, p.nameEn),
      description: pick(lang, p.descriptionAr, p.descriptionEn),
      category: pick(lang, p.categoryNameAr, p.categoryNameEn),
      identifierLabel: pick(lang, p.identifierLabelAr, p.identifierLabelEn),
      deliveryMethod: pick(lang, p.deliveryMethodAr, p.deliveryMethodEn),
      features: p.features.map((f) => ({
        icon: f.icon || "✨",
        title: pick(lang, f.titleAr, f.titleEn),
        desc: pick(lang, f.descAr, f.descEn),
      })),
      variants: p.variants.map((v) => ({
        ...v,
        label: pick(lang, v.labelAr, v.labelEn),
        tag: pick(lang, v.tagAr, v.tagEn) || null,
      })),
    }),
    [p, lang],
  );
}

function ProductHero({ p, l, onEdit }: { p: CatalogProduct; l: ReturnType<typeof useLocalized>; onEdit?: () => void }) {
  const { lang } = l;
  const { isAdmin } = useIsAdmin();
  const navigate = useNavigate();

  async function handleDelete() {
    if (!window.confirm(lang === "ar" ? "هل أنت متأكد من حذف هذا المنتج؟" : "Are you sure you want to delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("slug", p.slug);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(lang === "ar" ? "تم الحذف" : "Deleted successfully");
      navigate({ to: "/" });
    }
  }

  return (
    <section className="product-hero">
      <div className="wrap">
        <div className="product-hero-inner fade-in" style={{ position: "relative" }}>
          {isAdmin && (
            <div className="admin-product-actions" style={{ position: "absolute", top: 0, insetInlineEnd: 0, display: "flex", gap: 10, zIndex: 10 }}>
              <button onClick={onEdit} className="gx-btn outline" style={{ background: "rgba(10,15,22,0.8)", backdropFilter: "blur(8px)" }}>
                <Settings size={14} /> {lang === "ar" ? "تعديل المنتج" : "Edit Product"}
              </button>
              <button onClick={handleDelete} className="gx-btn danger" style={{ background: "rgba(10,15,22,0.8)", backdropFilter: "blur(8px)" }}>
                <Trash2 size={14} /> {lang === "ar" ? "حذف" : "Delete"}
              </button>
            </div>
          )}
          <div className="product-icon-badge">
            <div className="badge-stack">
              {p.isFeatured && (
                <div className="feat-badge">
                  {lang === "ar" ? "مميّز" : "Featured"}
                </div>
              )}
              {p.badgeAr && (
                <div className="custom-badge" style={{ backgroundColor: p.labelColor || 'var(--primary)' }}>
                  {pick(lang, p.badgeAr, p.badgeEn)}
                </div>
              )}
            </div>
            <div className="core">
              {p.iconImage ? (
                <img src={p.iconImage} alt={l.name} style={{ width: 56, height: 56, objectFit: "contain" }} />
              ) : (
                <span>{p.icon}</span>
              )}
            </div>
          </div>
          <div className="product-hero-text">
            {l.category && <span className="cat-tag">{l.category}</span>}
            <h1>{l.tagline}</h1>
            <p>{l.description}</p>
          </div>
        </div>
      </div>
    </section>
  );
}


function VariantCard({
  p,
  v,
  icon,
  onManageVariants,
}: {
  p: CatalogProduct;
  v: CatalogVariant & { label: string; tag: string | null };
  icon?: React.ReactNode;
  onManageVariants?: () => void;
}) {
  const { format } = useCurrency();
  const { lang } = useLang();
  const { isAdmin } = useIsAdmin();

  return (
    <div className="prod-card">
      <div className="prod-thumb" style={{ background: p.thumbBg || undefined, position: 'relative' }}>
        {isAdmin && (
          <button 
            onClick={(e) => { e.preventDefault(); onManageVariants?.(); }}
            className="admin-variant-edit"
            title={lang === "ar" ? "تعديل الخيارات" : "Edit Variants"}
          >
            <Settings size={14} />
          </button>
        )}

        <div className="badge-stack">
          {v.tag && <span className="tag-badge">{v.tag}</span>}
          <DiscountBadge discount={discountOf(v)} />
        </div>
        {icon ??
          (p.iconImage ? (
            <img src={p.iconImage} alt="" style={{ width: 64, height: 64, objectFit: "contain" }} />
          ) : (
            <span style={{ fontSize: 44 }}>{p.icon}</span>
          ))}
      </div>
      <div className="prod-body">
        <div className="prod-name" style={{ minHeight: "auto", fontSize: 16 }}>{v.label}</div>
        <div className="prod-prices">
          {v.oldPrice && <span className="prod-old">{format(v.oldPrice)}</span>}
          <span className="prod-new">{format(v.price)}</span>
        </div>
        <div style={{ marginTop: 15 }}>
          <BuyActions cartId={v.cartId} deliveryType={v.deliveryType || p.deliveryType} />
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- standard */
export function StandardTemplate({ product, onEdit, onManageVariants }: { product: CatalogProduct; onEdit?: () => void; onManageVariants?: () => void }) {

  const { t } = useLang();
  const l = useLocalized(product);
  const { format } = useCurrency();
  
  // If no variants exist (newly added simple product), show a single "Buy Now" box
  const hasVariants = l.variants.length > 0;

  return (
    <>
      <ProductHero p={product} l={l} onEdit={onEdit} />

      <section className="section">
        <div className="wrap">
          <SectionHead eyebrow={t("sec.plans")} title={t("product.pick_plan")} />
          <div className="plans-grid">
            {hasVariants ? (
              l.variants.map((v) => <VariantCard key={v.cartId} p={product} v={v} onManageVariants={onManageVariants} />)

            ) : (
              <div className="prod-card" style={{ maxWidth: 400, margin: "0 auto" }}>
                <div className="prod-thumb" style={{ background: product.thumbBg || undefined }}>
                  {product.iconImage ? (
                    <img src={product.iconImage} alt="" style={{ width: 64, height: 64, objectFit: "contain" }} />
                  ) : (
                    <span style={{ fontSize: 44 }}>{product.icon}</span>
                  )}
                </div>
                <div className="prod-body">
                  <div className="prod-name" style={{ minHeight: "auto", fontSize: 18, fontWeight: 900 }}>{l.name}</div>
                  {product.basePriceJOD !== null && (
                    <div className="prod-prices">
                      <span className="prod-new" style={{ fontSize: 24 }}>{format(product.basePriceJOD)}</span>
                    </div>
                  )}
                  <div style={{ marginTop: 15 }}>
                    <BuyActions cartId={product.slug} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {l.features.length > 0 && (
        <section className="section">
          <div className="wrap">
            <SectionHead eyebrow={t("product.features_eyebrow")} title={t("product.features_title")} />
            <FeatureAccordion features={l.features} />
          </div>
        </section>
      )}

      {(l.deliveryMethod || l.identifierLabel) && (
        <section className="section" style={{ background: "var(--bg2)" }}>
          <div className="wrap">
            <DeliveryBox method={l.deliveryMethod} identifierLabel={l.identifierLabel} />
          </div>
        </section>
      )}
    </>
  );
}

/* ---------------------------------------------------------- snapchat */
export function MultiAccountTemplate({ product, onEdit, onManageVariants }: { product: CatalogProduct; onEdit?: () => void; onManageVariants?: () => void }) {
  const { t } = useLang();
  const l = useLocalized(product);

  return (
    <>
      <ProductHero p={product} l={l} onEdit={onEdit} />

      <section className="section">
        <div className="wrap">
          <SectionHead eyebrow={t("sec.plans")} title={t("product.pick_plan")} />
          <div className="plans-grid">
            {l.variants.map((v) => <VariantCard key={v.cartId} p={product} v={v} onManageVariants={onManageVariants} />)}
          </div>
        </div>
      </section>

      {l.features.length > 0 && (
        <section className="section">
          <div className="wrap">
            <SectionHead eyebrow={t("product.features_eyebrow")} title={t("snap.features_title")} />
            <FeatureAccordion features={l.features} />
          </div>
        </section>
      )}

      {(l.deliveryMethod || l.identifierLabel) && (
        <section className="section" style={{ background: "var(--bg2)" }}>
          <div className="wrap">
            <DeliveryBox method={l.deliveryMethod} identifierLabel={l.identifierLabel} />
          </div>
        </section>
      )}
    </>
  );
}

/* ---------------------------------------------------------- fortnite */
export function DualPlansTemplate({ product, onEdit, onManageVariants }: { product: CatalogProduct; onEdit?: () => void; onManageVariants?: () => void }) {
  const { t } = useLang();
  const l = useLocalized(product);

  const vbucks = l.variants.filter((v) => v.planGroup === "vbucks");
  const rest = l.variants.filter((v) => v.planGroup !== "vbucks");
  const d = l.lang === "en" ? product.deliveryDetails?.en : product.deliveryDetails?.ar;

  return (
    <>
      <ProductHero p={product} l={l} onEdit={onEdit} />


      {vbucks.length > 0 && (
        <section className="section">
          <div className="wrap">
            <SectionHead eyebrow={t("fn.vb_eyebrow")} title={t("fn.vb_title")} />
            <div className="plans-grid">
              {vbucks.map((v) => {
                const tier = parseInt(v.cartId.replace(/\D+/g, ""), 10) || 0;
                return <VariantCard key={v.cartId} p={product} v={v} icon={<VbucksIcon tier={tier} />} onManageVariants={onManageVariants} />;
              })}
            </div>
          </div>
        </section>
      )}

      {rest.length > 0 && (
        <section className="section">
          <div className="wrap">
            <SectionHead eyebrow={t("sec.plans")} title={t("product.pick_plan")} />
            <div className="plans-grid">
              {rest.map((v) => <VariantCard key={v.cartId} p={product} v={v} onManageVariants={onManageVariants} />)}
            </div>
          </div>
        </section>
      )}

      {l.features.length > 0 && (
        <section className="section">
          <div className="wrap">
            <SectionHead eyebrow={t("product.features_eyebrow")} title={t("fn.features_title")} />
            <FeatureAccordion features={l.features} />
          </div>
        </section>
      )}

      {d && (
        <section className="section" style={{ background: "var(--bg2)" }}>
          <div className="wrap">
            <div className="delivery-box fade-in delivery-box-wide">
              <div className="dic">🔒</div>
              <div>
                <h3>{t("fn.delivery_title")}</h3>
                <p>{d.intro}</p>
                <div className="delivery-cols">
                  <div className="delivery-col">
                    <div className="delivery-col-title">{t("fn.req_title")}</div>
                    <ul className="delivery-list">{(d.requirements || []).map((r, i) => <li key={i}>{r}</li>)}</ul>
                  </div>
                  <div className="delivery-col">
                    <div className="delivery-col-title">{t("fn.safety_title")}</div>
                    <ul className="delivery-list">{(d.safety || []).map((s, i) => <li key={i}>{s}</li>)}</ul>
                  </div>
                </div>
                <div className="delivery-col-title" style={{ marginTop: 18 }}>{t("fn.platform_title")}</div>
                <ul className="delivery-list">{(d.platformNotes || []).map((n, i) => <li key={i}>{n}</li>)}</ul>
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

/* -------------------------------------------------------- gift_card */
export function GiftCardTemplate({ product, onEdit, onManageVariants }: { product: CatalogProduct; onEdit?: () => void; onManageVariants?: () => void }) {
  const { lang, t } = useLang();
  const l = useLocalized(product);
  const { format } = useCurrency();
  const { isAdmin } = useIsAdmin();
  const navigate = useNavigate();

  async function handleDelete() {
    if (!window.confirm(lang === "ar" ? "هل أنت متأكد من حذف هذا المنتج؟" : "Are you sure you want to delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("slug", product.slug);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(lang === "ar" ? "تم الحذف" : "Deleted successfully");
      navigate({ to: "/" });
    }
  }

  // Variants carry their region as "ar|en|flag" plus a plan_group country code.
  const regions = useMemo(() => {
    const map = new Map<string, { code: string; name: string; items: typeof l.variants }>();
    for (const v of l.variants) {
      const code = (v.planGroup || "xx").toLowerCase();
      const [ar, en] = (v.region || "").split("|");
      const name = (lang === "en" ? en || ar : ar || en) || code.toUpperCase();
      if (!map.has(code)) map.set(code, { code, name, items: [] });
      map.get(code)!.items.push(v);
    }
    return Array.from(map.values());
  }, [l.variants, lang]);

  const iconMarkup = product.iconImage ? (
    <img src={product.iconImage} alt={l.name} style={{ width: 56, height: 56, objectFit: "contain", filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.35))" }} />
  ) : (
    <span style={{ fontSize: 44, lineHeight: 1 }}>{product.icon}</span>
  );

  return (
    <>
      <section className="giftcard-hero">
        <div className="wrap">
          <div className="giftcard-hero-inner fade-in">
            {isAdmin && (
              <div className="admin-product-actions" style={{ position: "absolute", top: 0, insetInlineEnd: 0, display: "flex", gap: 10, zIndex: 10 }}>
                <button onClick={onEdit} className="gx-btn outline" style={{ background: "rgba(10,15,22,0.8)", backdropFilter: "blur(8px)" }}>
                  <Settings size={14} /> {lang === "ar" ? "تعديل المنتج" : "Edit Product"}
                </button>
                <button onClick={handleDelete} className="gx-btn danger" style={{ background: "rgba(10,15,22,0.8)", backdropFilter: "blur(8px)" }}>
                  <Trash2 size={14} /> {lang === "ar" ? "حذف" : "Delete"}
                </button>
              </div>
            )}
            <div className="giftcard-mockup" style={{ background: product.cardGradient || product.thumbBg || undefined }}>

              <div className="badge-stack">
                {product.isFeatured && (
                  <div className="feat-badge">
                    {lang === "ar" ? "مميّز" : "Featured"}
                  </div>
                )}
                {product.badgeAr && (
                  <div className="custom-badge" style={{ backgroundColor: product.labelColor || 'var(--primary)' }}>
                    {pick(lang, product.badgeAr, product.badgeEn)}
                  </div>
                )}
              </div>
              <div className="gc-top">
                <span className="gc-icon">{iconMarkup}</span>
                <div className="gc-chip" />
              </div>
              <div>
                <div className="gc-name">{l.name}</div>
                <div className="gc-sub">{t("gc.digital_card")}</div>
              </div>
            </div>
            <div className="giftcard-hero-text">
              <h1>{l.name}</h1>
              <p>{t("gc.pick_region")}</p>
            </div>
          </div>
        </div>
      </section>

      {regions.map((reg) => (
        <section key={reg.code} className="section">
          <div className="wrap">
            <div className="region-head">
              <img src={`https://flagcdn.com/w40/${reg.code}.png`} alt="" className="region-flag" />
              <h2>{reg.name}</h2>
            </div>
            <div className="plans-grid">
              {reg.items.map((v) => (
                <Link 
                  key={v.cartId} 
                  to="/cart" 
                  search={{ variant: v.cartId }} 
                  className="prod-card gc-item-card"
                  style={{ position: 'relative' }}
                >
                  {isAdmin && (
                    <button 
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onManageVariants?.(); }}
                      className="admin-variant-edit"
                      style={{ top: 10, insetInlineEnd: 10 }}
                      title={lang === "ar" ? "تعديل الخيارات" : "Edit Variants"}
                    >
                      <Settings size={14} />
                    </button>
                  )}

                  <div className="gc-item-body">
                    <div className="gc-item-val">{v.label}</div>
                    <div className="gc-item-prices">
                      {v.oldPrice && <span className="prod-old">{format(v.oldPrice)}</span>}
                      <span className="prod-new">{format(v.price)}</span>
                    </div>
                  </div>
                  <div className="gc-item-action">{t("product.buy")}</div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ))}

      {l.description && (
        <section className="section" style={{ background: "var(--bg2)" }}>
          <div className="wrap">
            <div className="category-rich-desc" dangerouslySetInnerHTML={{ __html: l.description }} />
          </div>
        </section>
      )}
    </>
  );
}


export function ProductTemplate({ product }: { product: CatalogProduct }) {
  const [editing, setEditing] = useState<any>(null);
  const [managingVariants, setManagingVariants] = useState<any>(null);
  const { lang } = useLang();

  // We need to fetch the full product row for the editor since CatalogProduct is a transformed DTO
  async function triggerEdit() {
    const { data } = await supabase.from("products").select("*").eq("slug", product.slug).single();
    if (data) setEditing(data);
  }

  async function triggerVariants() {
    const { data } = await supabase.from("products").select("*").eq("slug", product.slug).single();
    if (data) setManagingVariants(data);
  }


  // Effect to handle trigger variants after product is loaded
  useEffect(() => {
    if (editing && !managingVariants && window.location.hash === "#variants") {
      setManagingVariants(editing);
      setEditing(null);
    }
  }, [editing, managingVariants]);

  const commonProps = { 
    product, 
    onEdit: triggerEdit,
    onManageVariants: triggerVariants
  };


  return (
    <>
      {product.pageTemplate === "snapchat" ? (
        <MultiAccountTemplate {...commonProps} />
      ) : product.pageTemplate === "fortnite" ? (
        <DualPlansTemplate {...commonProps} />
      ) : product.pageTemplate === "gift_card" ? (
        <GiftCardTemplate {...commonProps} />
      ) : (
        <StandardTemplate {...commonProps} />
      )}

      {editing && (
        <ProductDialog
          product={editing}
          categories={[]} // Will be fetched inside if needed, or we can fetch here
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            window.location.reload(); // Refresh to see changes
          }}
        />
      )}

      {managingVariants && (
        <VariantsDialog
          product={managingVariants}
          onClose={() => setManagingVariants(null)}
        />
      )}


    </>
  );
}

