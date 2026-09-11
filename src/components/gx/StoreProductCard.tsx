import React, { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { useCurrency } from "@/lib/gx/currency";
import { useLang } from "@/lib/gx/i18n";
import { useFavorites } from "@/lib/gx/favorites";
import { formatTitle } from "@/lib/gx/text";
import { localizeResolvedName } from "@/lib/gx/product-locale";
import { ProductPlatformBar } from "@/components/gx/ProductPlatformBar";
import { BuyActions } from "@/components/gx/BuyActions";
import { getDeliveryTypeInfo } from "@/lib/gx/delivery-types";
import {
  SnapchatPoster,
  AdobePoster,
  CanvaPoster,
  WindowsPoster,
  FortniteIcon,
  VbucksIcon,
  CrewIcon,
} from "@/lib/gx/brand-icons";
import { VBUCKS_TIER_THEMES, CREW_TIER_THEMES } from "@/components/gx/ProductTemplates";
import { trackRecentlyViewed } from "@/lib/gx/recently-viewed";

export type StoreProductCardProps = {
  slug: string;
  cartId?: string | null;
  name: string;
  link?: string;
  price?: number | null;
  oldPrice?: number | null;
  tagline?: string | null;
  region?: string | null;
  badge?: string | null;
  imageUrl?: string | null;
  iconImage?: string | null;
  icon?: string | null;
  thumbBg?: string | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  customPlatform?: string | null;
  customIconUrl?: string | null;
  snapDuration?: string;
  productType?: string | null;
  showPlatformBar?: boolean;
  showBadge?: boolean;
  showFromLabel?: boolean;
  disableTierTheme?: boolean;
  isGiftCardMaster?: boolean;
  tierTheme?: {
    bg?: string;
    border?: string;
    accent?: string;
    badgeAr?: string;
    badgeEn?: string;
  } | null;
};

export function StoreProductCard({
  slug,
  cartId,
  name,
  link,
  price,
  oldPrice,
  tagline,
  region,
  badge,
  imageUrl,
  iconImage,
  icon,
  thumbBg,
  categoryName,
  categorySlug,
  customPlatform,
  customIconUrl,
  snapDuration,
  productType,
  showPlatformBar = true,
  showBadge = false,
  showFromLabel = true,
  disableTierTheme = true,
  isGiftCardMaster = false,
  tierTheme,
}: StoreProductCardProps) {
  const { format } = useCurrency();
  const { lang, t } = useLang();
  const navigate = useNavigate();
  const { isFav, toggle } = useFavorites();
  const isFavorited = isFav(slug);

  const finalCartId = cartId || slug;
  const finalLink = link || `/product/${slug}`;

  // Calculate discount percentage
  const numPrice = typeof price === "number" ? price : 0;
  const isGiftCard =
    isGiftCardMaster ||
    categorySlug === "gift-cards" ||
    ["playstation", "xbox", "itunes", "google-play"].includes(slug) ||
    slug.startsWith("gc-");

  const getGiftCardMinPrice = (s: string) => {
    const l = s.toLowerCase();
    if (l.includes("xbox")) return 1.15;
    if (l.includes("itunes") || l.includes("apple")) return 2.22;
    if (l.includes("google")) return 4.5;
    if (l.includes("playstation") || l.includes("psn") || l.includes("sony")) return 7.0;
    return 5.0;
  };

  const finalDisplayPrice = numPrice > 0 ? numPrice : (isGiftCard ? getGiftCardMinPrice(slug) : 0);
  const numOldPrice = typeof oldPrice === "number" && oldPrice > finalDisplayPrice ? oldPrice : null;
  const discount = numOldPrice ? Math.round((1 - finalDisplayPrice / numOldPrice) * 100) : 0;

  // Fortnite icons (without glowing card themes as requested)
  const isVbucks = slug === "fortnite" && finalCartId.startsWith("fn-vb");
  const isCrew = slug === "fortnite" && finalCartId.startsWith("fn-crew");
  const tier = parseInt(finalCartId.replace(/\D+/g, ""), 10) || 0;

  // Render thumbnail inner
  const renderThumbnail = () => {
    if (isCrew) return <CrewIcon />;
    if (isVbucks) return <VbucksIcon tier={tier} />;
    if (slug === "snapchat") return <SnapchatPoster duration={snapDuration} />;
    if (slug === "adobe") return <AdobePoster />;
    if (slug === "canva") return <CanvaPoster />;
    if (slug === "windows") return <WindowsPoster cartId={finalCartId} planLabel={name} />;
    if (slug === "fortnite") return <FortniteIcon />;

    // For brand logos, Gift Cards, and SVG vector icons
    const imgSrc = imageUrl || iconImage || (slug === "gemini" ? "/app/assets/img/gemini-logo.svg" : null);
    const isBrandVector =
      imgSrc &&
      (imgSrc.endsWith(".svg") ||
        imgSrc.includes("googleplay-logo") ||
        ["playstation", "xbox", "itunes", "google-play", "microsoft365", "autodesk", "linkedin", "gemini"].includes(slug));

    if (isBrandVector) {
      return (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          <img
            src={imgSrc!}
            alt={name}
            loading="lazy"
            decoding="async"
            style={{
              width: 76,
              height: 76,
              maxWidth: "70%",
              maxHeight: "70%",
              objectFit: "contain",
              filter: slug === "autodesk" ? "invert(1) drop-shadow(0 6px 14px rgba(0,0,0,0.5))" : "drop-shadow(0 6px 14px rgba(0,0,0,0.5))",
              transition: "transform 0.3s ease",
            }}
          />
        </div>
      );
    }

    if (imgSrc) {
      return (
        <img
          src={imgSrc}
          alt={name}
          loading="lazy"
          decoding="async"
          className="prod-thumb-img prod-card-img"
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
        />
      );
    }

    if (icon) {
      return <span style={{ fontSize: 44 }}>{icon}</span>;
    }

    return <span style={{ fontSize: 44 }}>🎮</span>;
  };

  const bgStyle =
    thumbBg ||
    (slug === "gemini" ? "linear-gradient(145deg,#2a1a4a,#0e0820)" : "rgba(0, 229, 255, 0.05)");

  const formattedTitle = formatTitle(localizeResolvedName(name, lang));

  // 1. Clean Region Label
  const getCleanRegion = () => {
    const r = (region || "").toLowerCase();
    const t = (tagline || "").toLowerCase();
    const n = (name || "").toLowerCase();
    const str = `${r} ${t} ${n}`;

    if (str.includes("أمريك") || str.includes("usa") || str.includes("united states") || str.includes("us")) {
      return lang === "en" ? "USA" : "أمريكي";
    }
    if (str.includes("ترك") || str.includes("turkey") || str.includes("try")) {
      return lang === "en" ? "Turkey" : "تركي";
    }
    if (str.includes("سعود") || str.includes("ksa") || str.includes("saudi")) {
      return lang === "en" ? "KSA" : "سعودي";
    }
    if (str.includes("إمارات") || str.includes("uae") || str.includes("emirates")) {
      return lang === "en" ? "UAE" : "إماراتي";
    }
    if (str.includes("بريطان") || str.includes("uk") || str.includes("gb")) {
      return lang === "en" ? "UK" : "بريطاني";
    }
    return lang === "en" ? "Global" : "عالمي";
  };

  const [tooltipOpen, setTooltipOpen] = useState(false);
  const cleanRegion = getCleanRegion();
  const deliveryInfo = getDeliveryTypeInfo(
    { slug, cartId: finalCartId, name, productType, isGiftCardMaster },
    lang
  );

  const handleTrack = () => {
    trackRecentlyViewed({
      slug,
      nameAr: name,
      nameEn: name,
      taglineAr: tagline || undefined,
      taglineEn: tagline || undefined,
      price: finalDisplayPrice,
      oldPrice: numOldPrice || undefined,
      imageUrl: imageUrl || undefined,
      icon: icon || undefined,
      categorySlug: categorySlug || (isGiftCard ? "gift-cards" : undefined),
    });
  };

  const handleFavClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggle({
      slug,
      cartId: finalCartId,
      name,
      link: finalLink,
      price: finalDisplayPrice,
      oldPrice: numOldPrice,
      imageUrl,
      iconImage,
      icon,
      categoryName,
      categorySlug,
      customPlatform,
      productType,
    });
  };

  return (
    <div className="prod-card">
      {/* Top-Left Driffle-Style Bookmark Wishlist Ribbon */}
      <button
        type="button"
        className={`prod-fav-bookmark ${isFavorited ? "is-active" : ""}`}
        title={
          isFavorited
            ? lang === "ar"
              ? "إزالة من المفضلة"
              : "Remove from favorites"
            : lang === "ar"
              ? "إضافة إلى المفضلة"
              : "Add to favorites"
        }
        aria-label={isFavorited ? "Remove from wishlist" : "Add to wishlist"}
        onClick={handleFavClick}
      >
        <Heart
          size={14}
          fill={isFavorited ? "#ffffff" : "none"}
          stroke={isFavorited ? "none" : "#ffffff"}
          strokeWidth={2.4}
        />
      </button>

      <Link to={finalLink as never} style={{ display: "contents" }} onClick={handleTrack}>
        <div className="prod-thumb" style={{ background: bgStyle }}>
          {renderThumbnail()}
        </div>
      </Link>

      <div className="prod-body">
        {showPlatformBar && (
          <ProductPlatformBar
            productKey={slug}
            cartId={finalCartId}
            name={name}
            categoryName={categoryName || undefined}
            categorySlug={categorySlug || undefined}
            customPlatform={customPlatform || undefined}
            customIconUrl={customIconUrl || undefined}
          />
        )}

        <Link
          to={finalLink as never}
          style={{ textDecoration: "none", color: "inherit", display: "block" }}
          onClick={handleTrack}
        >
          <div className="prod-name">{formattedTitle}</div>
        </Link>

        {/* Region (Right in Blue) & Product Delivery Type (Left) with Exclamation Info Tooltip */}
        <div className="prod-meta-row">
          <span className="prod-meta-region">{cleanRegion}</span>

          <div
            className={`prod-meta-type-wrap ${tooltipOpen ? "is-active" : ""}`}
            onMouseEnter={() => setTooltipOpen(true)}
            onMouseLeave={() => setTooltipOpen(false)}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setTooltipOpen((prev) => !prev);
            }}
          >
            <span className="prod-meta-type-label">{deliveryInfo.label}</span>
            <span
              className="prod-meta-info-icon"
              role="button"
              tabIndex={0}
              aria-label={deliveryInfo.label}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  setTooltipOpen((prev) => !prev);
                }
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="8" cy="8" r="7" />
                <line x1="8" y1="4.5" x2="8" y2="8.5" />
                <circle cx="8" cy="11.5" r="0.8" fill="currentColor" stroke="none" />
              </svg>
            </span>
          </div>

          <div
            className={`prod-type-tooltip ${tooltipOpen ? "is-visible" : ""}`}
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={() => setTooltipOpen(true)}
            onMouseLeave={() => setTooltipOpen(false)}
          >
            <div className="prod-type-tooltip-title">
              <span>{deliveryInfo.icon}</span>
              <span>{deliveryInfo.label}</span>
            </div>
            <div className="prod-type-tooltip-desc">{deliveryInfo.desc}</div>
          </div>
        </div>

        <div className="prod-prices">
          {finalDisplayPrice > 0 ? (
            <>
              {(showFromLabel || isGiftCard) && (
                <span className="prod-from-label">{lang === "en" ? "From" : "من"}</span>
              )}
              <div className="prod-price-row">
                <span className="prod-new">
                  {format(finalDisplayPrice)}
                </span>
                {discount > 0 && <span className="prod-discount-pill">-{discount}%</span>}
              </div>
            </>
          ) : (
            <div className="prod-price-row">
              <span className="prod-new">{lang === "en" ? "Check Price" : "حسب الباقة"}</span>
            </div>
          )}
        </div>

        {isGiftCard ? (
          <div className="buy-actions">
            <Link
              to={finalLink as never}
              className="buy-now-btn gx-browse-offers-btn"
              style={{
                textDecoration: "none",
                width: "100%",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <span>{lang === "en" ? "Browse Offers" : "تصفح العروض"}</span>
              <span style={{ fontSize: 13 }}>{lang === "en" ? "→" : "←"}</span>
            </Link>
          </div>
        ) : (
          <BuyActions cartId={finalCartId} />
        )}
      </div>
    </div>
  );
}
