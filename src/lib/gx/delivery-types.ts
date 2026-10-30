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
    labelEn: "Key",
    descAr: "كود رقمي أصلي يتم إرساله لك فوراً لاستخدامه وتفعيله مباشرة على جهازك أو حسابك الرسمي.",
    descEn: "Official digital activation code sent instantly to redeem directly on your device or official account.",
    icon: "🔑",
  },
  account: {
    type: "account",
    labelAr: "حساب جاهز",
    labelEn: "Account",
    descAr: "حساب خاص وجاهز بالكامل نزودك بالإيميل وكلمة المرور الخاصة به، يمكنك تغيير بياناته والتمتع بالاشتراك فوراً.",
    descEn: "Fully prepared private account with email & password provided. You can customize credentials and use it immediately.",
    icon: "👤",
  },
  topup: {
    type: "topup",
    labelAr: "شحن مباشر",
    labelEn: "Top Up",
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
  const pt = (item.productType || "").toLowerCase().trim();
  const s = (item.slug || "").toLowerCase();
  const c = (item.cartId || "").toLowerCase();
  const n = ((item.name || "") + " " + (item.nameAr || "")).toLowerCase();

  // Hard slug & cartId overrides for exact store products
  if (s === "roblox" || s.includes("roblox")) return "topup";
  if (s === "snapchat" || s.includes("snapchat")) return "topup";
  if (s === "youtube-premium" || s.includes("youtube")) return "link";
  if (s === "adobe" || c === "adobe-1") return "code";
  if (s === "nordvpn" || c.startsWith("nordvpn")) return "link";
  if (s === "canva" || c.startsWith("canva")) return "link";
  if (s === "linkedin-career-3m" || c === "linkedin-career-3m") return "link";
  if (s === "linkedin-career-12m" || s === "linkedin-business-12m" || c === "linkedin-career-12m" || c === "linkedin-business-12m") return "topup";
  if (s.includes("discord")) return "code";
  if (s.includes("minecraft-realms")) return "code";
  if (s.includes("lovable")) return "link";
  if (s.includes("duolingo") || c.includes("duolingo")) return "link";

  // Priority 1: Explicit database delivery_type configured by admin
  if (pt === "account" || pt === "حساب" || pt === "حساب جاهز") return "account";
  if (pt === "code" || pt === "key" || pt === "مفتاح" || pt === "كود" || pt === "كود تفعيل" || pt === "digital_code") return "code";
  if (pt === "link" || pt === "رابط" || pt === "رابط تفعيل") return "link";
  if (pt === "topup" || pt === "شحن" || pt === "شحن مباشر" || pt === "direct_topup") return "topup";
  if (pt === "manual") return "code";

  // 1. Direct Top-up (Fortnite, Snapchat+, Social media followers/likes, direct topup items)
  if (
    pt === "topup" ||
    s === "fortnite" ||
    s.includes("fortnite") ||
    c.includes("fn-") ||
    c.includes("vb") ||
    c.includes("crew") ||
    c.includes("topup") ||
    n.includes("فورت") ||
    n.includes("fortnite") ||
    n.includes("v-bucks") ||
    n.includes("فيبوكس") ||
    s === "snapchat" ||
    s.includes("snapchat") ||
    c.includes("snap") ||
    n.includes("سناب") ||
    s === "roblox" ||
    s.includes("roblox") ||
    n.includes("روبلوكس") ||
    n.includes("roblox") ||
    s.includes("pubg") ||
    n.includes("ببجي") ||
    n.includes("pubg") ||
    s.includes("tiktok") ||
    s.includes("instagram") ||
    s.includes("facebook") ||
    n.includes("شحن") ||
    n.includes("متابعين") ||
    n.includes("لايكات")
  ) {
    return "topup";
  }

  // 2. Windows & Office products are strictly official Keys / Activation Codes
  if (
    s === "windows" ||
    s.includes("windows") ||
    c.includes("win-") ||
    n.includes("ويندوز")
  ) {
    return "code";
  }

  // 3. Activation Link (Canva, NordVPN, Lovable, LinkedIn, Autodesk, YouTube Premium, or explicit link/invite)
  if (
    pt === "link" ||
    s === "canva" ||
    s === "nordvpn" ||
    s.includes("lovable") ||
    s === "linkedin" ||
    s === "autodesk" ||
    s === "youtube-premium" ||
    s.includes("youtube") ||
    n.includes("رابط") ||
    n.includes("دعوة") ||
    n.includes("يوتيوب") ||
    c.includes("link") ||
    c.includes("youtube")
  ) {
    return "link";
  }

  // 4. Ready Account (Gemini, ChatGPT, accounts with email/pass)
  if (
    pt === "account" ||
    s === "gemini" ||
    s.includes("chatgpt") ||
    c.includes("acct") ||
    c.includes("acc-") ||
    n.includes("حساب جاهز") ||
    (n.includes("حساب") && !n.includes("حسابك")) ||
    n.includes("account")
  ) {
    return "account";
  }

  // 5. Default: Activation Code (Windows OEM/Retail, Gift Cards, Games, Adobe, Software)
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
