/**
 * Central storage and helpers for customer contact information (WhatsApp phone & Email)
 * Supports auto-remembering customer info across cart, product pages, and quick-buy actions.
 */

const WHATSAPP_STORAGE_KEY = "gx_customer_whatsapp";
const EMAIL_STORAGE_KEY = "gx_customer_email";
const REMEMBER_ENABLED_KEY = "gx_remember_contact";
const CART_CONTACT_KEY = "gx_cart_contact";

export type ProductRequirementType = "whatsapp" | "email" | "link" | "id" | "none";

/**
 * Gets the remembered customer WhatsApp phone number.
 */
export function getRememberedWhatsApp(): string {
  if (typeof window === "undefined") return "";
  try {
    const saved = localStorage.getItem(WHATSAPP_STORAGE_KEY);
    if (saved && saved.trim()) return saved.trim();

    // Fallback: check gx_cart_contact
    const cartContact = localStorage.getItem(CART_CONTACT_KEY);
    if (cartContact) {
      const parsed = JSON.parse(cartContact);
      if (parsed?.phone && String(parsed.phone).trim()) {
        return String(parsed.phone).trim();
      }
    }
  } catch {
    /* noop */
  }
  return "";
}

/**
 * Saves or clears the remembered WhatsApp phone number based on user preference.
 */
export function setRememberedWhatsApp(phone: string, remember = true): void {
  if (typeof window === "undefined") return;
  try {
    const clean = phone.trim();
    if (clean && remember) {
      localStorage.setItem(WHATSAPP_STORAGE_KEY, clean);
      // Also update gx_cart_contact so checkout is in sync
      const raw = localStorage.getItem(CART_CONTACT_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      parsed.phone = clean;
      localStorage.setItem(CART_CONTACT_KEY, JSON.stringify(parsed));
      window.dispatchEvent(new CustomEvent("gx:contact-updated", { detail: { phone: clean } }));
    } else if (!remember) {
      localStorage.removeItem(WHATSAPP_STORAGE_KEY);
    }
  } catch {
    /* noop */
  }
}

/**
 * Gets the remembered customer Email.
 */
export function getRememberedEmail(): string {
  if (typeof window === "undefined") return "";
  try {
    const saved = localStorage.getItem(EMAIL_STORAGE_KEY);
    if (saved && saved.trim()) return saved.trim();

    const cartContact = localStorage.getItem(CART_CONTACT_KEY);
    if (cartContact) {
      const parsed = JSON.parse(cartContact);
      if (parsed?.email && String(parsed.email).trim()) {
        return String(parsed.email).trim();
      }
    }
  } catch {
    /* noop */
  }
  return "";
}

/**
 * Saves or clears the remembered email.
 */
export function setRememberedEmail(email: string, remember = true): void {
  if (typeof window === "undefined") return;
  try {
    const clean = email.trim();
    if (clean && remember) {
      localStorage.setItem(EMAIL_STORAGE_KEY, clean);
      const raw = localStorage.getItem(CART_CONTACT_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      parsed.email = clean;
      localStorage.setItem(CART_CONTACT_KEY, JSON.stringify(parsed));
      window.dispatchEvent(new CustomEvent("gx:contact-updated", { detail: { email: clean } }));
    } else if (!remember) {
      localStorage.removeItem(EMAIL_STORAGE_KEY);
    }
  } catch {
    /* noop */
  }
}

/**
 * Checks whether "remember me" is enabled (defaults to true for smooth repeat orders).
 */
export function isRememberContactEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const val = localStorage.getItem(REMEMBER_ENABLED_KEY);
    if (val === null) return true;
    return val === "true";
  } catch {
    return true;
  }
}

/**
 * Sets the "remember me" preference.
 */
export function setRememberContactEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(REMEMBER_ENABLED_KEY, enabled ? "true" : "false");
  } catch {
    /* noop */
  }
}

/**
 * Determines whether a product strictly requires a customer input, and what kind.
 * 
 * Rules:
 * 1. "whatsapp": Top-up & direct communication products (Roblox, Fortnite, LinkedIn direct top-up, Game Pass, etc.)
 *    Customer must only provide their WhatsApp phone number (never password).
 * 2. "email": Invitation products (Canva, YouTube Premium, etc.)
 *    Customer only provides their personal account email (never password).
 * 3. "link": Social media followers/likes (Post or profile link).
 * 4. "id": Snapchat username, PUBG player ID.
 * 5. "none": Direct codes or links delivered in order invoice (Steam codes, Windows keys, etc.).
 */
export function resolveProductRequirementType(item: {
  slug?: string | null;
  name?: string | null;
  nameAr?: string | null;
  deliveryType?: string | null;
  identifierLabelAr?: string | null;
  requiresPlayerId?: boolean | null;
}): ProductRequirementType {
  const s = (item.slug || "").toLowerCase();
  const n = ((item.name || "") + " " + (item.nameAr || "")).toLowerCase();
  const idLabel = (item.identifierLabelAr || "").toLowerCase();
  const dt = (item.deliveryType || "").toLowerCase();

  // Social media products
  if (
    s.includes("instagram") ||
    s.includes("facebook") ||
    s.includes("tiktok") ||
    s.includes("twitter") ||
    s.includes("like") ||
    s.includes("follow") ||
    n.includes("لايك") ||
    n.includes("متابع")
  ) {
    return "link";
  }

  // Snapchat username
  if (s === "snapchat" || s.includes("snapchat")) {
    return "id";
  }

  // PUBG Player ID
  if (s.includes("pubg") || n.includes("ببجي") || idLabel.includes("آيدي") || idLabel.includes("player id")) {
    return "id";
  }

  // Email-only products (YouTube, Canva, Autodesk)
  if (
    s.includes("youtube") ||
    s.includes("canva") ||
    s.includes("autodesk") ||
    idLabel.includes("إيميل") ||
    idLabel.includes("email") ||
    idLabel.includes("بريد")
  ) {
    return "email";
  }

  // Top-Up & Communication Products (Roblox, Fortnite, LinkedIn direct topup, Game Pass)
  if (
    s === "fortnite" ||
    s.includes("fortnite") ||
    s === "roblox" ||
    s.includes("roblox") ||
    s === "linkedin-business-12m" ||
    s === "linkedin-career-12m" ||
    s.includes("game-pass") ||
    dt === "topup" ||
    idLabel.includes("واتس") ||
    idLabel.includes("تواصل") ||
    idLabel.includes("هاتف") ||
    idLabel.includes("رقم")
  ) {
    return "whatsapp";
  }

  if (item.requiresPlayerId) {
    return "whatsapp";
  }

  return "none";
}
