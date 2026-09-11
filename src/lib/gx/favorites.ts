import { useState, useEffect, useCallback } from "react";

export interface FavoriteItem {
  slug: string;
  cartId?: string | null;
  name: string;
  link?: string;
  price?: number | null;
  oldPrice?: number | null;
  imageUrl?: string | null;
  iconImage?: string | null;
  icon?: string | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  customPlatform?: string | null;
  productType?: string | null;
  addedAt: number;
}

const STORAGE_KEY = "gx_favorites_v1";

export function getStoredFavorites(): FavoriteItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function isItemFavorited(slug: string): boolean {
  const list = getStoredFavorites();
  return list.some((item) => item.slug === slug);
}

export function toggleFavorite(item: Omit<FavoriteItem, "addedAt">): boolean {
  if (typeof window === "undefined") return false;
  try {
    const current = getStoredFavorites();
    const exists = current.some((f) => f.slug === item.slug);
    let updated: FavoriteItem[];
    if (exists) {
      updated = current.filter((f) => f.slug !== item.slug);
    } else {
      updated = [{ ...item, addedAt: Date.now() }, ...current];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("gx_favorites_updated", { detail: updated }));
    return !exists;
  } catch {
    return false;
  }
}

export function removeFavorite(slug: string): void {
  if (typeof window === "undefined") return;
  try {
    const current = getStoredFavorites();
    const updated = current.filter((f) => f.slug !== slug);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("gx_favorites_updated", { detail: updated }));
  } catch {
    // ignore
  }
}

export function clearFavorites(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("gx_favorites_updated", { detail: [] }));
  } catch {
    // ignore
  }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  useEffect(() => {
    setFavorites(getStoredFavorites());

    const handler = (e: Event) => {
      const custom = e as CustomEvent<FavoriteItem[]>;
      if (custom.detail && Array.isArray(custom.detail)) {
        setFavorites(custom.detail);
      } else {
        setFavorites(getStoredFavorites());
      }
    };

    window.addEventListener("gx_favorites_updated", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("gx_favorites_updated", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const isFav = useCallback(
    (slug: string) => favorites.some((f) => f.slug === slug),
    [favorites]
  );

  const toggle = useCallback((item: Omit<FavoriteItem, "addedAt">) => {
    return toggleFavorite(item);
  }, []);

  const remove = useCallback((slug: string) => {
    removeFavorite(slug);
  }, []);

  const clear = useCallback(() => {
    clearFavorites();
  }, []);

  return {
    favorites,
    count: favorites.length,
    isFav,
    toggle,
    remove,
    clear,
  };
}
