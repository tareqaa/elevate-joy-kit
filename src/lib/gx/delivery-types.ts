export type StrictDeliveryType = "code" | "account" | "topup" | "link";

export type DeliveryTypeInfo = {
  type: StrictDeliveryType;
  labelAr: string;
  labelEn: string;
  descAr: string;
  descEn: string;
  icon: string;
};

export const STRICT_DELIVERY_TYPES: Record<StrictDeliveryType, DeliveryTypeInfo> = {
  code: {
    type: "code",
    labelAr: "كود تفعيل",
    labelEn: "Activation Code",
    descAr: "كود رقمي أصلي يتم إرساله لك فوراً لاستخدامه وتفعيله مباشرة على جهازك أو حسابك الرسمي.",
    descEn: "Official digital activation code sent instantly to redeem directly on your device or official account.",
    icon: "🔑",
  },
  account: {
    type: "account",
    labelAr: "حساب جاهز",
    labelEn: "Ready Account",
    descAr: "حساب خاص وجاهز بالكامل نزودك بالإيميل وكلمة المرور الخاصة به، يمكنك تغيير بياناته والتمتع بالاشتراك فوراً.",
    descEn: "Fully prepared private account with email & password provided. You can customize credentials and use it immediately.",
    icon: "👤",
  },
  topup: {
    type: "topup",
    labelAr: "شحن مباشر",
    labelEn: "Direct Top-up",
    descAr: "شحن مباشر لحسابك؛ نحتاج تزويدنا بمعلومات أو معرّف الحساب لندخل ونشحن لك الرصيد أو الاشتراك المطلوب بأمان.",
    descEn: "Direct top-up to your account. Account credentials or tag are needed to safely apply the balance or subscription.",
    icon: "💎",
  },
  link: {
    type: "link",
    labelAr: "رابط تفعيل",
    labelEn: "Activation Link",
    descAr: "رابط دعوة أو تفعيل رسمي خاص بك يُرسل لك مباشرة للانضمام للخدمة وتفعيل اشتراكك بنقرة واحدة.",
    descEn: "Official invitation or activation link sent directly to join the service and activate your subscription in one click.",
    icon: "🔗",
  },
};

/**
 * Resolves any product in GX Store into strictly ONE of the 4 allowed delivery types:
 * 1. "code"    -> كود تفعيل (Activation Code)
 * 2. "account" -> حساب جاهز (Ready Account)
 * 3. "topup"   -> شحن مباشر (Direct Top-up)
 * 4. "link"    -> رابط تفعيل (Activation Link)
 */
export function resolveStrictDeliveryType(item: {
  slug?: string | null;
  cartId?: string | null;
  name?: string | null;
  nameAr?: string | null;
  productType?: string | null;
  isGiftCardMaster?: boolean;
}): StrictDeliveryType {
  const s = (item.slug || "").toLowerCase();
  const c = (item.cartId || "").toLowerCase();
  const n = ((item.name || "") + " " + (item.nameAr || "")).toLowerCase();
  const pt = (item.productType || "").toLowerCase();

  // 1. Activation Link (Canva, LinkedIn, Autodesk, or explicit link/invite)
  if (
    pt === "link" ||
    s === "canva" ||
    s === "linkedin" ||
    s === "autodesk" ||
    n.includes("رابط") ||
    n.includes("دعوة") ||
    c.includes("link")
  ) {
    return "link";
  }

  // 2. Ready Account (Gemini, ChatGPT, accounts with email/pass, ms-acct)
  if (
    pt === "account" ||
    s === "gemini" ||
    s.includes("chatgpt") ||
    c.includes("acct") ||
    c.includes("acc-") ||
    n.includes("حساب") ||
    n.includes("account")
  ) {
    return "account";
  }

  // 3. Direct Top-up (Fortnite, Snapchat+, Social media, topup items)
  if (
    pt === "topup" ||
    s === "fortnite" ||
    s === "snapchat" ||
    s.includes("tiktok") ||
    s.includes("instagram") ||
    c.includes("vb") ||
    c.includes("crew") ||
    c.includes("topup") ||
    n.includes("شحن") ||
    n.includes("v-bucks") ||
    n.includes("crew")
  ) {
    return "topup";
  }

  // 4. Default: Activation Code (Windows OEM/Retail, Gift Cards, Games, Adobe, Software)
  return "code";
}

export function getDeliveryTypeInfo(
  item: {
    slug?: string | null;
    cartId?: string | null;
    name?: string | null;
    nameAr?: string | null;
    productType?: string | null;
    isGiftCardMaster?: boolean;
  },
  lang: "ar" | "en" = "ar"
) {
  const typeKey = resolveStrictDeliveryType(item);
  const info = STRICT_DELIVERY_TYPES[typeKey];
  return {
    type: typeKey,
    label: lang === "en" ? info.labelEn : info.labelAr,
    desc: lang === "en" ? info.descEn : info.descAr,
    icon: info.icon,
  };
}
