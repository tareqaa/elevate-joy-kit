import React, { useState } from "react";
import type { ResolvedItem } from "@/lib/gx/cart";

interface CartItemThumbProps {
  item: ResolvedItem;
  size?: number;
  className?: string;
}

export function CartItemThumb({ item, size = 64, className = "" }: CartItemThumbProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const imgSrc = item.imageUrl || item.iconImage;

  // Games and full cover art from catalog should fill the square (cover)
  // Transparent brand logos (Microsoft 365, Gemini, Canva, etc.) should be centered with padding (contain)
  const isCover = Boolean(
    imgSrc && (
      imgSrc.includes("/catalog/") ||
      imgSrc.startsWith("data:image") ||
      imgSrc.includes("livecards.net")
    )
  );

  const radius = size > 56 ? 14 : 10;
  const innerRadius = isCover ? (size > 56 ? 12 : 8) : 0;
  const padding = isCover ? 0 : (size > 56 ? 7 : 5);
  const fontSize = size > 56 ? 26 : 20;

  return (
    <div
      className={className || (size > 56 ? "cr-thumb" : "ci-thumb")}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: item.bg || "linear-gradient(145deg, #161a24, #0c0e15)",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        boxShadow: "0 4px 14px rgba(0, 0, 0, 0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        flexShrink: 0,
        position: "relative",
      }}
    >
      {imgSrc && !imgFailed ? (
        <img
          src={imgSrc}
          alt={item.name || ""}
          style={{
            width: "100%",
            height: "100%",
            objectFit: isCover ? "cover" : "contain",
            padding,
            borderRadius: innerRadius,
            display: "block",
            transition: "transform 0.2s ease",
          }}
          onError={() => {
            setImgFailed(true);
          }}
        />
      ) : (
        <span style={{ fontSize, lineHeight: 1, userSelect: "none" }}>
          {item.icon || "🎮"}
        </span>
      )}
    </div>
  );
}
