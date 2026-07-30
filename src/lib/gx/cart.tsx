import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { findPlanByCartId, type ResolvedPlan } from "@/data/products";
import { useCurrency } from "./currency";
import { submitStoreOrder } from "./orders.functions";
import { validateCouponFn } from "./coupons.functions";
import { supabase } from "@/integrations/supabase/client";


type CartItem = {
  cartId: string;
  qty: number;
  meta?: { usernames?: string[] };
  custom?: { name: string; icon: string; bg: string; price: number };
};

export type ResolvedItem = ResolvedPlan & {
  qty: number;
  usernames: string[] | null;
};

export type AppliedCoupon = {
  id: string | null;
  /** set when the code is a personal level coupon from the loyalty system */
  user_coupon_id?: string | null;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  discount_jod: number;
};

export type AppliedCoins = {
  coins: number;
  discount_jod: number;
};

export type ContactInfo = {
  name: string;
  countryCode: string;
  phone: string;
  type: "whatsapp" | "telegram";
};

const STORAGE_KEY = "gx_cart";
const NOTES_KEY = "gx_cart_notes";
const CONTACT_KEY = "gx_cart_contact";
const COUPON_KEY = "gx_cart_coupon";

type Ctx = {
  items: ResolvedItem[];
  count: number;
  subtotalJOD: number;
  totalJOD: number;
  notes: string;
  setNotes: (n: string) => void;
  contact: ContactInfo;
  setContact: (c: Partial<ContactInfo>) => void;
  coupon: AppliedCoupon | null;
  applyCoupon: (code: string) => Promise<{ ok: boolean; message: string }>;
  removeCoupon: () => void;
  coins: AppliedCoins | null;
  applyCoins: (coins: number) => Promise<{ ok: boolean; message: string }>;
  removeCoins: () => void;
  /** Store credit (refund balance) applied to this order, in JOD. */
  creditJOD: number;
  applyCredit: (jod: number) => Promise<{ ok: boolean; message: string }>;
  removeCredit: () => void;

  add: (cartId: string, qty?: number) => void;
  addSnap: (cartId: string, usernames: string[]) => void;
  buyNow: (cartId: string, qty?: number) => void;
  buyNowSnap: (cartId: string, usernames: string[]) => void;
  addCustom: (data: { name: string; icon?: string; bg?: string; price: number }, qty?: number) => void;
  changeQty: (cartId: string, delta: number) => void;
  remove: (cartId: string) => void;
  clear: () => void;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  submitOrder: () => Promise<{ order_number: string } | null>;
  buildWhatsAppUrl: (orderNumber?: string, currencyLabel?: string) => string | null;
};

const CartContext = createContext<Ctx | null>(null);

const DEFAULT_CONTACT: ContactInfo = { name: "", countryCode: "+962", phone: "", type: "whatsapp" };

function loadRaw(): CartItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch { return []; }
}

function loadContact(): ContactInfo {
  try {
    const raw = JSON.parse(localStorage.getItem(CONTACT_KEY) || "null");
    if (raw && typeof raw === "object") return { ...DEFAULT_CONTACT, ...raw };
  } catch { /* noop */ }
  return { ...DEFAULT_CONTACT };
}

function loadCoupon(): AppliedCoupon | null {
  try {
    const raw = JSON.parse(localStorage.getItem(COUPON_KEY) || "null");
    if (raw && typeof raw === "object" && raw.code) return raw as AppliedCoupon;
  } catch { /* noop */ }
  return null;
}

function resolve(items: CartItem[]): ResolvedItem[] {
  return items
    .map((i) => {
      const usernames = i.meta?.usernames?.slice() ?? null;
      if (i.custom) {
        return {
          cartId: i.cartId,
          product: "custom",
          name: i.custom.name,
          icon: i.custom.icon,
          bg: i.custom.bg,
          price: i.custom.price,
          qty: i.qty,
          usernames,
        };
      }
      const plan = findPlanByCartId(i.cartId);
      return plan ? { ...plan, qty: i.qty, usernames } : null;
    })
    .filter((x): x is ResolvedItem => x !== null);
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [rawItems, setRawItems] = useState<CartItem[]>([]);
  const [notes, setNotesState] = useState("");
  const [contact, setContactState] = useState<ContactInfo>(DEFAULT_CONTACT);
  const [coupon, setCouponState] = useState<AppliedCoupon | null>(null);
  const [coins, setCoinsState] = useState<AppliedCoins | null>(null);
  const [creditJOD, setCreditState] = useState(0);

  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const { currency, format } = useCurrency();
  const submitStoreOrderFn = useServerFn(submitStoreOrder);
  const validateCouponRpc = useServerFn(validateCouponFn);

  useEffect(() => {
    setRawItems(loadRaw());
    setNotesState(localStorage.getItem(NOTES_KEY) || "");
    const initialContact = loadContact();
    setContactState(initialContact);
    setCouponState(loadCoupon());
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setRawItems(loadRaw());
      if (e.key === NOTES_KEY) setNotesState(localStorage.getItem(NOTES_KEY) || "");
      if (e.key === CONTACT_KEY) setContactState(loadContact());
      if (e.key === COUPON_KEY) setCouponState(loadCoupon());
    };
    window.addEventListener("storage", onStorage);

    // Prefill from the signed-in user's profile when local contact is empty.
    (async () => {
      try {
        const { data: sess } = await supabase.auth.getSession();
        const uid = sess.session?.user?.id;
        if (!uid) return;
        const { data: prof } = await supabase
          .from("profiles")
          .select("full_name, whatsapp")
          .eq("id", uid)
          .maybeSingle();
        if (!prof) return;
        setContactState((prev) => {
          const needsName = !prev.name.trim();
          const needsPhone = !prev.phone.trim();
          if (!needsName && !needsPhone) return prev;
          const next = { ...prev };
          if (needsName && prof.full_name) next.name = prof.full_name;
          if (needsPhone && prof.whatsapp) {
            // stored as "+962XXXXXXX" — split code from digits
            const raw = String(prof.whatsapp).trim();
            const m = raw.match(/^(\+\d{1,4})(\d+)$/);
            if (m) { next.countryCode = m[1]; next.phone = m[2]; next.type = "whatsapp"; }
            else { next.phone = raw.replace(/^@+/, ""); }
          }
          try { localStorage.setItem(CONTACT_KEY, JSON.stringify(next)); } catch { /* noop */ }
          return next;
        });
      } catch { /* noop */ }
    })();

    return () => window.removeEventListener("storage", onStorage);
  }, []);


  const persist = useCallback((next: CartItem[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setRawItems(next);
  }, []);

  // Catalog prices are edited live from the admin panel; re-resolve when they change.
  const [priceVersion, setPriceVersion] = useState(0);
  useEffect(() => {
    const on = () => setPriceVersion((v) => v + 1);
    window.addEventListener("gx:prices-updated", on);
    return () => window.removeEventListener("gx:prices-updated", on);
  }, []);
  const items = useMemo(() => resolve(rawItems), [rawItems, priceVersion]);
  const count = items.reduce((s, i) => s + i.qty, 0);
  const subtotalJOD = items.reduce((s, i) => s + i.price * i.qty, 0);
  const afterCoupon = Math.max(0, subtotalJOD - (coupon?.discount_jod ?? 0));
  const afterCoins = Math.max(0, afterCoupon - (coins?.discount_jod ?? 0));
  const appliedCredit = Math.min(creditJOD, afterCoins);
  const totalJOD = Math.round(Math.max(0, afterCoins - appliedCredit) * 100) / 100;

  const setNotes = useCallback((n: string) => {
    localStorage.setItem(NOTES_KEY, n);
    setNotesState(n);
  }, []);

  const setContact = useCallback((patch: Partial<ContactInfo>) => {
    setContactState((prev) => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(CONTACT_KEY, JSON.stringify(next)); } catch { /* noop */ }
      return next;
    });
  }, []);

  const persistCoupon = useCallback((c: AppliedCoupon | null) => {
    try {
      if (c) localStorage.setItem(COUPON_KEY, JSON.stringify(c));
      else localStorage.removeItem(COUPON_KEY);
    } catch { /* noop */ }
    setCouponState(c);
  }, []);

  const removeCoupon = useCallback(() => persistCoupon(null), [persistCoupon]);

  const applyCoupon = useCallback(async (code: string) => {
    const trimmed = (code || "").trim();
    if (!trimmed) return { ok: false, message: "أدخل كود الكوبون" };
    if (items.length === 0) return { ok: false, message: "السلة فاضية" };
    try {
      const productSlugs = Array.from(new Set(items.map((i) => i.product).filter(Boolean)));
      const res = await validateCouponRpc({
        data: {
          code: trimmed,
          subtotal_jod: subtotalJOD,
          product_slugs: productSlugs,
          category_slugs: [],
        },
      });
      if (!res.valid || !res.coupon_id) {
        // Fall back to personal level coupons issued by the GX Loyalty system.
        const { data: lv } = await supabase.rpc("validate_my_level_coupon", {
          _code: trimmed,
          _subtotal_jod: subtotalJOD,
        });
        const lvRes = lv as unknown as {
          valid?: boolean; user_coupon_id?: string; code?: string;
          percent?: number; discount_jod?: number; message?: string;
        } | null;
        if (lvRes?.valid && lvRes.user_coupon_id) {
          persistCoupon({
            id: null,
            user_coupon_id: lvRes.user_coupon_id,
            code: lvRes.code || trimmed.toUpperCase(),
            discount_type: "percent",
            discount_value: Number(lvRes.percent || 0),
            discount_jod: Number(lvRes.discount_jod || 0),
          });
          return { ok: true, message: lvRes.message || "تم تطبيق كوبون المستوى" };
        }
        return { ok: false, message: res.message || lvRes?.message || "الكوبون غير صالح" };
      }
      persistCoupon({
        id: res.coupon_id,
        user_coupon_id: null,
        code: res.code || trimmed.toUpperCase(),
        discount_type: (res.discount_type || "percent"),
        discount_value: Number(res.discount_value || 0),
        discount_jod: Number(res.discount_jod || 0),
      });
      return { ok: true, message: res.message || "تم تطبيق الكوبون" };
    } catch (e) {
      console.warn("[GX] applyCoupon failed", e);
      return { ok: false, message: "تعذّر التحقق من الكوبون" };
    }
  }, [items, subtotalJOD, persistCoupon, validateCouponRpc]);

  const removeCoins = useCallback(() => setCoinsState(null), []);

  const applyCoins = useCallback(async (wanted: number) => {
    const amount = Math.max(0, Math.floor(wanted || 0));
    if (amount <= 0) { setCoinsState(null); return { ok: false, message: "أدخل عدد العملات" }; }
    if (items.length === 0) return { ok: false, message: "السلة فاضية" };
    try {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session?.user) return { ok: false, message: "سجّل الدخول لاستخدام GX Coins" };
      const base = Math.max(0, subtotalJOD - (coupon?.discount_jod ?? 0));
      const { data, error } = await supabase.rpc("redeem_gx_coins", { _coins: amount, _subtotal_jod: base });
      if (error) return { ok: false, message: error.message };
      const res = data as unknown as { valid?: boolean; coins?: number; discount_jod?: number; message?: string } | null;
      if (!res?.valid) return { ok: false, message: res?.message || "تعذّر استخدام العملات" };
      setCoinsState({ coins: Number(res.coins || amount), discount_jod: Number(res.discount_jod || 0) });
      return { ok: true, message: res.message || "تم تطبيق خصم GX Coins" };
    } catch (e) {
      console.warn("[GX] applyCoins failed", e);
      return { ok: false, message: "تعذّر استخدام العملات" };
    }
  }, [items, subtotalJOD, coupon]);

  // Coins discount can never exceed the payable amount.
  useEffect(() => {
    if (!coins) return;
    const base = Math.max(0, subtotalJOD - (coupon?.discount_jod ?? 0));
    if (coins.discount_jod > base) setCoinsState(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotalJOD, coupon?.discount_jod]);

  const removeCredit = useCallback(() => setCreditState(0), []);

  const applyCredit = useCallback(async (wanted: number) => {
    const amount = Math.round(Math.max(0, Number(wanted) || 0) * 100) / 100;
    if (amount <= 0) { setCreditState(0); return { ok: false, message: "أدخل مبلغ الرصيد" }; }
    if (items.length === 0) return { ok: false, message: "السلة فاضية" };
    try {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (!uid) return { ok: false, message: "سجّل الدخول لاستخدام رصيد المتجر" };
      const { data: prof } = await supabase
        .from("profiles").select("store_credit_jod").eq("id", uid).maybeSingle();
      const balance = Number(prof?.store_credit_jod ?? 0);
      if (balance <= 0) return { ok: false, message: "لا يوجد رصيد متجر متاح" };
      const payable = Math.max(0, subtotalJOD - (coupon?.discount_jod ?? 0) - (coins?.discount_jod ?? 0));
      const used = Math.round(Math.min(amount, balance, payable) * 100) / 100;
      if (used <= 0) return { ok: false, message: "لا يوجد مبلغ متبقٍ للدفع" };
      setCreditState(used);
      return { ok: true, message: `تم استخدام ${used.toFixed(2)} د.أ من رصيد المتجر` };
    } catch (e) {
      console.warn("[GX] applyCredit failed", e);
      return { ok: false, message: "تعذّر استخدام رصيد المتجر" };
    }
  }, [items, subtotalJOD, coupon, coins]);

  // Store credit can never exceed the payable amount.
  useEffect(() => {
    if (creditJOD <= 0) return;
    const payable = Math.max(0, subtotalJOD - (coupon?.discount_jod ?? 0) - (coins?.discount_jod ?? 0));
    if (creditJOD > payable) setCreditState(payable);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotalJOD, coupon?.discount_jod, coins?.discount_jod]);




  // Re-validate discount when subtotal changes
  useEffect(() => {
    if (!coupon) return;
    if (subtotalJOD <= 0) { persistCoupon(null); return; }
    // recompute discount amount based on type
    let d = coupon.discount_type === "percent"
      ? Math.round((subtotalJOD * coupon.discount_value) / 100 * 100) / 100
      : coupon.discount_value;
    if (d > subtotalJOD) d = subtotalJOD;
    if (Math.abs(d - coupon.discount_jod) > 0.001) {
      persistCoupon({ ...coupon, discount_jod: d });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotalJOD]);

  const add = useCallback(
    (cartId: string, qty = 1) => {
      const next = [...rawItems];
      const ex = next.find((i) => i.cartId === cartId && !i.custom);
      if (ex) ex.qty += qty;
      else next.push({ cartId, qty });
      persist(next);
    },
    [rawItems, persist]
  );

  const addSnap = useCallback(
    (cartId: string, usernames: string[]) => {
      const clean = usernames.map((u) => (u || "").trim()).filter(Boolean);
      if (!clean.length) return;
      const next = [...rawItems];
      const ex = next.find((i) => i.cartId === cartId && !i.custom);
      if (ex) {
        ex.meta = ex.meta || {};
        ex.meta.usernames = (ex.meta.usernames || []).concat(clean);
        ex.qty = ex.meta.usernames.length;
      } else {
        next.push({ cartId, qty: clean.length, meta: { usernames: clean } });
      }
      persist(next);
    },
    [rawItems, persist]
  );

  const buyNow = useCallback(
    (cartId: string, qty = 1) => {
      const next = [...rawItems];
      const ex = next.find((i) => i.cartId === cartId && !i.custom);
      if (ex) ex.qty = Math.max(qty, ex.qty);
      else next.push({ cartId, qty });
      persist(next);
    },
    [rawItems, persist]
  );

  const buyNowSnap = useCallback(
    (cartId: string, usernames: string[]) => {
      const clean = usernames.map((u) => (u || "").trim()).filter(Boolean);
      if (!clean.length) return;
      const next = rawItems.filter((i) => i.cartId !== cartId);
      next.push({ cartId, qty: clean.length, meta: { usernames: clean } });
      persist(next);
    },
    [rawItems, persist]
  );

  const addCustom = useCallback(
    (data: { name: string; icon?: string; bg?: string; price: number }, qty = 1) => {
      const cartId = "custom-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
      const next = [
        ...rawItems,
        { cartId, qty, custom: { name: data.name, icon: data.icon || "🎮", bg: data.bg || "linear-gradient(145deg,#1a1e2a,#0a0c12)", price: data.price } },
      ];
      persist(next);
    },
    [rawItems, persist]
  );

  const changeQty = useCallback(
    (cartId: string, delta: number) => {
      let next = rawItems.map((i) => {
        if (i.cartId !== cartId) return i;
        const nx = { ...i, qty: i.qty + delta };
        if (nx.meta?.usernames && nx.qty < nx.meta.usernames.length) {
          nx.meta = { ...nx.meta, usernames: nx.meta.usernames.slice(0, Math.max(nx.qty, 0)) };
        }
        return nx;
      });
      next = next.filter((i) => i.qty > 0);
      if (next.length === 0) {
        localStorage.setItem(NOTES_KEY, "");
        setNotesState("");
        persistCoupon(null);
      }
      persist(next);
    },
    [rawItems, persist, persistCoupon]
  );

  const remove = useCallback(
    (cartId: string) => {
      const next = rawItems.filter((i) => i.cartId !== cartId);
      if (next.length === 0) {
        localStorage.setItem(NOTES_KEY, "");
        setNotesState("");
        persistCoupon(null);
      }
      persist(next);
    },
    [rawItems, persist, persistCoupon]
  );

  const clear = useCallback(() => {
    localStorage.setItem(NOTES_KEY, "");
    setNotesState("");
    persistCoupon(null);
    // Discounts belong to the cart contents — never carry them to the next order.
    setCoinsState(null);
    setCreditState(0);
    persist([]);
  }, [persist, persistCoupon]);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const buildWhatsAppUrl = useCallback(
    (orderNumber?: string) => {
      if (items.length === 0) return null;
      const itemCount = items.reduce((n, it) => n + it.qty, 0);
      const orderId = orderNumber || "GX-" + Date.now().toString().slice(-6);
      const now = new Date();
      const dateStr = now.toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });
      const timeStr = now.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });

      const lines = items
        .map((it, i) => {
          const lineTotal = it.price * it.qty;
          let block = `${i + 1}) ${it.name}
     • الكمية: ${it.qty}
     • سعر الوحدة: ${format(it.price)}
     • المجموع: ${format(lineTotal)}`;
          if (it.usernames?.length) {
            const users = it.usernames.map((u, k) => `        ${k + 1}. ${u}`).join("\n");
            block += `\n     • اليوزرات:\n${users}`;
          }
          return block;
        })
        .join("\n\n");

      let msg = `🧾 *فاتورة طلب جديد — GX Store*
━━━━━━━━━━━━━━━━━━━━
🆔 رقم الطلب: ${orderId}
📅 التاريخ: ${dateStr}
🕐 الوقت: ${timeStr}
━━━━━━━━━━━━━━━━━━━━

🛍️ *تفاصيل المنتجات:*

${lines}

━━━━━━━━━━━━━━━━━━━━
📦 عدد القطع: ${itemCount}`;
      if (coupon) msg += `\n🏷️ كوبون (${coupon.code}): -${format(coupon.discount_jod)}`;
      msg += `\n💰 *الإجمالي المستحق: ${format(totalJOD)}*
💱 العملة: ${currency}
━━━━━━━━━━━━━━━━━━━━`;

      if (notes.trim()) {
        msg += `\n\n📝 *ملاحظات إضافية:*\n${notes.trim()}\n━━━━━━━━━━━━━━━━━━━━`;
      }
      msg += `\n\n✅ الرجاء تأكيد الطلب ليتم البدء بالتجهيز.\nشكراً لاختيارك GX Store 💙`;

      const encoded = encodeURIComponent(msg);
      const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");
      return isMobile
        ? "https://wa.me/962776252313?text=" + encoded
        : "https://web.whatsapp.com/send?phone=962776252313&text=" + encoded;
    },
    [items, notes, currency, format, totalJOD, coupon]
  );

  const submitOrder = useCallback(async () => {
    if (items.length === 0) return null;
    const isWa = contact.type === "whatsapp";
    const contactValue = isWa
      ? (contact.countryCode + contact.phone).replace(/\s+/g, "")
      : "@" + contact.phone.trim().replace(/^@+/, "");
    if (!contact.name.trim() || contact.phone.trim().length < 3) {
      const { toast } = await import("sonner");
      toast.error(isWa ? "عبّي الاسم ورقم الواتساب قبل إتمام الطلب" : "عبّي الاسم ويوزر التيليجرام قبل إتمام الطلب");
      return null;
    }
    try {
      const payloadItems = items.map((it) => ({
        cartId: it.cartId,
        product_slug: it.product || null,
        name: it.name,
        qty: it.qty,
        price: it.price,
        usernames: it.usernames || null,
      }));
      const result = await submitStoreOrderFn({
        data: {
          items: payloadItems,
          totalJOD,
          currency,
          notes,
          customerName: contact.name.trim(),
          customerWhatsapp: contactValue,
          contactType: contact.type,
          coupon: coupon
            ? {
                id: coupon.id,
                userCouponId: coupon.user_coupon_id ?? null,
                code: coupon.code,
                discount_jod: coupon.discount_jod,
              }
            : null,
          coins: coins ? { coins: coins.coins, discount_jod: coins.discount_jod } : null,
          creditJod: appliedCredit > 0 ? appliedCredit : 0,
        },
      });
      // Persist contact to the signed-in user's profile so it auto-fills next time.
      try {
        const { data: sess } = await supabase.auth.getSession();
        const uid = sess.session?.user?.id;
        if (uid) {
          await supabase.from("profiles").update({
            full_name: contact.name.trim(),
            whatsapp: contactValue,
          }).eq("id", uid);
        }
      } catch { /* noop */ }
      setCoinsState(null);
      setCreditState(0);
      // Coins / store-credit balances changed server-side — tell the UI to refetch.
      try { window.dispatchEvent(new Event("gx:balances-updated")); } catch { /* noop */ }
      return result;
    } catch (e) {
      console.warn("[GX] submitOrder failed", e);
      return null;
    }

  }, [items, totalJOD, currency, notes, contact, coupon, coins, appliedCredit, submitStoreOrderFn]);

  const value = useMemo<Ctx>(
    () => ({
      items, count, subtotalJOD, totalJOD, notes, setNotes,
      contact, setContact, coupon, applyCoupon, removeCoupon,
      coins, applyCoins, removeCoins,
      creditJOD: appliedCredit, applyCredit, removeCredit,
      add, addSnap, buyNow, buyNowSnap, addCustom, changeQty, remove, clear,
      isDrawerOpen, openDrawer, closeDrawer,
      submitOrder, buildWhatsAppUrl,
    }),
    [items, count, subtotalJOD, totalJOD, notes, setNotes, contact, setContact, coupon, applyCoupon, removeCoupon, coins, applyCoins, removeCoins, appliedCredit, applyCredit, removeCredit, add, addSnap, buyNow, buyNowSnap, addCustom, changeQty, remove, clear, isDrawerOpen, openDrawer, closeDrawer, submitOrder, buildWhatsAppUrl]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): Ctx {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
