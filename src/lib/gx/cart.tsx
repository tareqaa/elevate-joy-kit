import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { findPlanByCartId, type ResolvedPlan } from "@/data/products";
import { useCurrency } from "./currency";
import { submitStoreOrder } from "./orders.functions";

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

const STORAGE_KEY = "gx_cart";
const NOTES_KEY = "gx_cart_notes";

type Ctx = {
  items: ResolvedItem[];
  count: number;
  totalJOD: number;
  notes: string;
  setNotes: (n: string) => void;
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

function loadRaw(): CartItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch { return []; }
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
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const { currency, format } = useCurrency();
  const submitStoreOrderFn = useServerFn(submitStoreOrder);

  useEffect(() => {
    setRawItems(loadRaw());
    setNotesState(localStorage.getItem(NOTES_KEY) || "");
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setRawItems(loadRaw());
      if (e.key === NOTES_KEY) setNotesState(localStorage.getItem(NOTES_KEY) || "");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const persist = useCallback((next: CartItem[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setRawItems(next);
  }, []);

  const items = useMemo(() => resolve(rawItems), [rawItems]);
  const count = items.reduce((s, i) => s + i.qty, 0);
  const totalJOD = items.reduce((s, i) => s + i.price * i.qty, 0);

  const setNotes = useCallback((n: string) => {
    localStorage.setItem(NOTES_KEY, n);
    setNotesState(n);
  }, []);

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
      }
      persist(next);
    },
    [rawItems, persist]
  );

  const remove = useCallback(
    (cartId: string) => {
      const next = rawItems.filter((i) => i.cartId !== cartId);
      if (next.length === 0) {
        localStorage.setItem(NOTES_KEY, "");
        setNotesState("");
      }
      persist(next);
    },
    [rawItems, persist]
  );

  const clear = useCallback(() => {
    localStorage.setItem(NOTES_KEY, "");
    setNotesState("");
    persist([]);
  }, [persist]);

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
📦 عدد القطع: ${itemCount}
💰 *الإجمالي المستحق: ${format(totalJOD)}*
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
    [items, notes, currency, format, totalJOD]
  );

  const submitOrder = useCallback(async () => {
    if (items.length === 0) return null;
    try {
      const payloadItems = items.map((it) => ({
        cartId: it.cartId,
        name: it.name,
        qty: it.qty,
        price: it.price,
        usernames: it.usernames || null,
      }));
      return await submitStoreOrderFn({
        data: {
          items: payloadItems,
          totalJOD,
          currency,
          notes,
        },
      });
    } catch (e) {
      console.warn("[GX] submitOrder failed", e);
      return null;
    }
  }, [items, totalJOD, currency, notes, submitStoreOrderFn]);

  const value = useMemo<Ctx>(
    () => ({
      items, count, totalJOD, notes, setNotes,
      add, addSnap, buyNow, buyNowSnap, addCustom, changeQty, remove, clear,
      isDrawerOpen, openDrawer, closeDrawer,
      submitOrder, buildWhatsAppUrl,
    }),
    [items, count, totalJOD, notes, setNotes, add, addSnap, buyNow, buyNowSnap, addCustom, changeQty, remove, clear, isDrawerOpen, openDrawer, closeDrawer, submitOrder, buildWhatsAppUrl]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): Ctx {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
