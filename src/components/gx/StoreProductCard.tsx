import { resolveRegionLabel } from "@/lib/gx/region";
import React, { useState, useEffect, useRef, useCallback } from "react";
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
  TodPoster,
  FortniteIcon,
  VbucksIcon,
  CrewIcon,
} from "@/lib/gx/brand-icons";
import { getGiftCardLiveStartingPrice } from "@/components/gx/BestSellingGiftCardsSection";
import { useSiteSettings, getEffectiveStockLimit } from "@/lib/gx/site-settings";

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
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Sync ref and check if already complete in cache immediately on DOM attach
  const setImgRef = useCallback((node: HTMLImageElement | null) => {
    imgRef.current = node;
    if (node && node.complete) {
      if (node.naturalWidth > 0) {
        setLoaded(true);
      } else if (node.naturalWidth === 0 && node.src) {
        setError(true);
      }
    }
  }, []);

  useEffect(() => {
    if (!src || src.trim() === "") {
      setError(true);
      return;
    }

    setError(false);

    // If image is already complete in DOM / cache, mark loaded instantly
    if (imgRef.current && imgRef.current.complete) {
      if (imgRef.current.naturalWidth > 0) {
        setLoaded(true);
        return;
      }
    }

    // Safety timeout: Never spin infinitely under any circumstance.
    // If the image hasn't reported loaded within 1200ms, fade out spinner and display image.
    const timer = setTimeout(() => {
      setLoaded(true);
    }, 1200);

    return () => clearTimeout(timer);
  }, [src]);

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
            background: "radial-gradient(circle at center, rgba(168, 85, 247, 0.12) 0%, rgba(15, 23, 42, 0.4) 100%)",
            zIndex: 1,
            pointerEvents: "none",
          }}
        >
          <div className="prod-spinner-ring" />
        </div>
      )}
      {error ? (
        <span style={{ fontSize: 38 }}>🎮</span>
      ) : (
        <img
          ref={setImgRef}
          src={src}
          alt={alt}
          className={className}
          draggable={false}
          onLoad={() => setLoaded(true)}
          onError={() => {
            setError(true);
            setLoaded(true);
          }}
          onContextMenu={(e) => e.preventDefault()}
          style={{
            ...style,
            opacity: loaded ? 1 : 0,
            transition: "opacity 0.22s ease-in-out",
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
  const siteSettings = useSiteSettings();

  const finalCartId = cartId || slug;

  const computeFinalLink = () => {
    if (link) {
      if (finalCartId && finalCartId !== slug && !link.includes("?") && !link.includes("#")) {
        return `${link}?variant=${encodeURIComponent(finalCartId)}`;
      }
      return link;
    }
    return finalCartId && finalCartId !== slug
      ? `/product/${slug}?variant=${encodeURIComponent(finalCartId)}`
      : `/product/${slug}`;
  };

  const finalLink = computeFinalLink();

  // Calculate discount percentage
  const numPrice = typeof price === "number" ? price : 0;
  const isGiftCardMasterCard = Boolean(isGiftCardMaster);

  const getGiftCardMinPrice = (s: string) => {
    return getGiftCardLiveStartingPrice(s, 5.0, siteSettings?.catalog_prices);
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
    if (slug === "tod" || slug.startsWith("tod-") || finalCartId.startsWith("tod-")) {
      return <TodPoster cartId={finalCartId} name={name} />;
    }
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

  // 1. Clean Region Label — DB region wins, strict fallback only
  const getCleanRegion = () =>
    resolveRegionLabel(
      { region, tagline, name, cartId: finalCartId, slug },
      lang,
      { flag: false },
    );

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

  const stockLimit = getEffectiveStockLimit(
    siteSettings?.product_stock_limits,
    finalCartId,
    slug
  );

  const isOutOfStock = stockLimit !== null && stockLimit <= 0;

  return (
    <div
      className={`prod-card ${isOutOfStock ? "is-sold-out" : ""}`}
      style={isOutOfStock ? { opacity: 0.72, filter: "grayscale(0.38)" } : undefined}
    >
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
          <div
            className="prod-name"
            style={{
              minHeight: 38,
              maxHeight: 38,
              lineHeight: 1.35,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {formattedTitle}
          </div>
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

        {isOutOfStock ? (
          <div
            className="prod-sold-out-box"
            style={{
              marginTop: "auto",
              height: 44,
              minHeight: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 8,
              userSelect: "none",
            }}
          >
            <span
              style={{
                color: "#f1f5f9",
                fontSize: 15,
                fontWeight: 900,
                fontFamily: "'Tajawal', sans-serif",
                letterSpacing: 0.3,
              }}
            >
              {lang === "en" ? "Sold Out" : "نفدت"}
            </span>
            <div
              style={{
                width: 27,
                height: 27,
                borderRadius: 7,
                border: "2px solid #cbd5e1",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#cbd5e1",
                background: "rgba(255, 255, 255, 0.04)",
                boxSizing: "border-box",
                flexShrink: 0,
              }}
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="8" y1="10" x2="8.01" y2="10" strokeWidth="3" />
                <line x1="16" y1="10" x2="16.01" y2="10" strokeWidth="3" />
                <path d="M16 16.5c-1-1.6-2.5-2.2-4-2.2s-3 .6-4 2.2" />
              </svg>
            </div>
          </div>
        ) : (
          <>
            <div
              className="prod-prices"
              style={{
                minHeight: 44,
                height: 44,
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                marginTop: "auto",
                width: "100%",
              }}
            >
              {finalDisplayPrice > 0 ? (
                <>
                  <div
                    className="prod-price-top-row"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                      minHeight: 14,
                      lineHeight: 1,
                    }}
                  >
                    {(showFromLabel || isGiftCardMasterCard) ? (
                      <span className="prod-from-label">{priceLabel || (lang === "en" ? "From" : "من")}</span>
                    ) : (
                      <span />
                    )}
                    {numOldPrice && numOldPrice > finalDisplayPrice ? (
                      <span className="prod-old">{format(numOldPrice)}</span>
                    ) : null}
                  </div>
                  <div className="prod-price-row">
                    <span className="prod-new">
                      {format(finalDisplayPrice)}
                    </span>
                    {discount > 0 && (
                      <span
                        className="prod-discount-pill"
                        style={{
                          flexShrink: 0,
                          whiteSpace: "nowrap",
                        }}
                      >
                        -{discount}%
                      </span>
                    )}
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
              <BuyActions
                cartId={finalCartId}
                meta={
                  finalDisplayPrice > 0
                    ? {
                        price: finalDisplayPrice,
                        name: formattedTitle || name,
                        imageUrl: imageUrl || iconImage || null,
                        icon: icon || null,
                        product: slug,
                      }
                    : undefined
                }
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
