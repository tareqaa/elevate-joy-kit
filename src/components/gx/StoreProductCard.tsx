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
  GiftCardPoster,
  FortniteIcon,
  VbucksIcon,
  CrewIcon,
} from "@/lib/gx/brand-icons";
import { VBUCKS_TIER_THEMES, CREW_TIER_THEMES } from "@/components/gx/ProductTemplates";

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
  priceLabel?: string;
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

function CardProductImage({
  src,
  alt,
  className = "prod-thumb-img prod-card-img",
  style,
}: {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div
      className="prod-img-wrap"
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {!loaded && !error && (
        <div
          className="prod-img-skeleton"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255, 255, 255, 0.03)",
            zIndex: 1,
          }}
        >
          <div className="prod-spinner-ring" />
        </div>
      )}
      {error ? (
        <span style={{ fontSize: 38 }}>🎮</span>
      ) : (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={className}
          draggable={false}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          onContextMenu={(e) => e.preventDefault()}
          style={{
            ...style,
            opacity: loaded ? 1 : 0,
            transition: "opacity 0.28s ease-in-out",
          }}
        />
      )}
    </div>
  );
}

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
  priceLabel,
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
  const isGiftCardMasterCard = Boolean(isGiftCardMaster);

  const getGiftCardMinPrice = (s: string) => {
    const l = s.toLowerCase();
    if (l.includes("xbox")) return 1.15;
    if (l.includes("itunes") || l.includes("apple")) return 2.22;
    if (l.includes("google")) return 4.5;
    if (l.includes("playstation") || l.includes("psn") || l.includes("sony")) return 7.0;
    return 5.0;
  };

  const finalDisplayPrice = numPrice > 0 ? numPrice : (isGiftCardMasterCard ? getGiftCardMinPrice(slug) : 0);
  const numOldPrice = typeof oldPrice === "number" && oldPrice > finalDisplayPrice ? oldPrice : null;
  const discount = numOldPrice ? Math.round((1 - finalDisplayPrice / numOldPrice) * 100) : 0;

  // Fortnite icons (without glowing card themes as requested)
  const isVbucks = slug === "fortnite" && finalCartId.startsWith("fn-vb");
  const isCrew = slug === "fortnite" && finalCartId.startsWith("fn-crew");
  const tier = parseInt(finalCartId.replace(/\D+/g, ""), 10) || 0;

  // Render thumbnail inner
  const renderThumbnail = () => {
    if (isCrew) return <CrewIcon />;
    if (isVbucks) {
      if (imageUrl && !imageUrl.includes("fortnite-logo.png") && !imageUrl.endsWith("vbucks.png")) {
        return (
          <CardProductImage
            src={imageUrl}
            alt={name}
            className="prod-thumb-img prod-card-img"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        );
      }
      return <VbucksIcon tier={tier} />;
    }
    if (slug === "snapchat") {
      let resolvedSnapDuration = snapDuration;
      if (lang === "en" && resolvedSnapDuration) {
        resolvedSnapDuration = resolvedSnapDuration
          .replace(/3\s*أشهر/, "3 Months")
          .replace(/6\s*أشهر/, "6 Months")
          .replace(/12\s*شهر/, "12 Months")
          .replace(/شهر/, "Month");
      }
      if (!resolvedSnapDuration) {
        resolvedSnapDuration = name.includes("3")
          ? lang === "en" ? "3 Months" : "3 أشهر"
          : name.includes("6")
          ? lang === "en" ? "6 Months" : "6 أشهر"
          : name.includes("12")
          ? lang === "en" ? "12 Months" : "12 شهر"
          : name.includes("شهر") || name.toLowerCase().includes("1 month")
          ? lang === "en" ? "1 Month" : "شهر واحد"
          : undefined;
      }
      return <SnapchatPoster duration={resolvedSnapDuration} />;
    }
    if (slug === "adobe") return <AdobePoster />;
    if (slug === "canva") return <CanvaPoster />;
    if (slug === "windows") return <WindowsPoster cartId={finalCartId} planLabel={name} />;
    if (slug === "fortnite") {
      if (imageUrl && !imageUrl.includes("fortnite-logo.png") && !imageUrl.includes("fortnite-f-icon.jpg")) {
        return (
          <CardProductImage
            src={imageUrl}
            alt={name}
            className="prod-thumb-img prod-card-img"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        );
      }
      if (finalCartId.includes("crew") || name.toLowerCase().includes("crew") || name.includes("كرو")) {
        return <CrewIcon />;
      }
      return <FortniteIcon />;
    }

    if (
      slug === "playstation" ||
      slug === "xbox" ||
      slug === "itunes" ||
      slug === "google-play" ||
      categorySlug === "gift-cards" ||
      categorySlug?.startsWith("gc-")
    ) {
      return (
        <GiftCardPoster
          slug={slug}
          cartId={finalCartId}
          name={name}
          region={region || undefined}
        />
      );
    }

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
        <CardProductImage
          src={imgSrc}
          alt={name}
          className="prod-thumb-img prod-card-img"
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
    const c = (finalCartId || "").toLowerCase();
    const str = `${r} ${t} ${n} ${c}`;

    if (str.includes("أمريك") || str.includes("usa") || str.includes("united states") || str.includes("us-") || str.includes("-us")) {
      return lang === "en" ? "USA 🇺🇸" : "أمريكي 🇺🇸";
    }
    if (str.includes("ترك") || str.includes("turkey") || str.includes("try") || str.includes("tr-") || str.includes("-tr")) {
      return lang === "en" ? "Turkey 🇹🇷" : "تركي 🇹🇷";
    }
    if (str.includes("سعود") || str.includes("ksa") || str.includes("saudi") || str.includes("sa-") || str.includes("-sa")) {
      return lang === "en" ? "Saudi 🇸🇦" : "سعودي 🇸🇦";
    }
    if (str.includes("إمارات") || str.includes("uae") || str.includes("emirates") || str.includes("ae-") || str.includes("-ae")) {
      return lang === "en" ? "UAE 🇦🇪" : "إماراتي 🇦🇪";
    }
    if (str.includes("بريطان") || str.includes("uk") || str.includes("gb") || str.includes("باوند")) {
      return lang === "en" ? "UK 🇬🇧" : "بريطاني 🇬🇧";
    }
    if (str.includes("أردن") || str.includes("اردن") || str.includes("jordan") || str.includes("jo-") || str.includes("-jo") || r === "jo") {
      return lang === "en" ? "Jordan 🇯🇴" : "الأردن 🇯🇴";
    }
    return lang === "en" ? "Global" : "عالمي";
  };

  const [tooltipOpen, setTooltipOpen] = useState(false);
  const cleanRegion = getCleanRegion();
  const deliveryInfo = getDeliveryTypeInfo(
    { slug, cartId: finalCartId, name, productType, isGiftCardMaster },
    lang
  );

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

      <Link to={finalLink as never} style={{ display: "contents" }}>
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
              {(showFromLabel || isGiftCardMasterCard) && (
                <span className="prod-from-label">{priceLabel || (lang === "en" ? "From" : "من")}</span>
              )}
              <div className="prod-price-row">
                <span className="prod-new">
                  {format(finalDisplayPrice)}
                </span>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  {numOldPrice && numOldPrice > finalDisplayPrice && (
                    <span className="prod-old">{format(numOldPrice)}</span>
                  )}
                  {discount > 0 && <span className="prod-discount-pill">-{discount}%</span>}
                </div>
              </div>
            </>
          ) : (
            <div className="prod-price-row">
              <span className="prod-new">{lang === "en" ? "Check Price" : "حسب الباقة"}</span>
            </div>
          )}
        </div>

        {isGiftCardMasterCard ? (
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
