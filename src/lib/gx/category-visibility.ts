/**
 * Live visibility for the static storefront category links.
 *
 * The navbar / footer / home grid still render the hand-tuned CATEGORY_LINKS
 * (icons, gradients, copy), but a category that an admin switched off in
 * `categories.is_active` must disappear from those menus instead of leading
 * to a 404 page.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORY_LINKS } from "@/data/products";

export type StorefrontCategory = {
  slug: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  icon: string;
  iconImage: string | null;
  accent: string;
  background: string;
  sortOrder: number;
};

const INITIAL_STOREFRONT_CATEGORIES: StorefrontCategory[] = CATEGORY_LINKS.map((c, i) => ({
  slug: c.slug,
  nameAr: c.name,
  nameEn: c.name,
  descriptionAr: c.desc,
  descriptionEn: c.desc,
  icon: c.icon,
  iconImage: null,
  accent: c.accent,
  background: c.bg,
  sortOrder: i + 1,
}));

const CATS_CACHE_KEY = "gx_storefront_root_cats_v4";

const DEFAULT_BY_SLUG = new Map(CATEGORY_LINKS.map((c) => [c.slug, { accent: c.accent, bg: c.bg }]));

function readCachedCategories(): StorefrontCategory[] {
  if (typeof window === "undefined") return INITIAL_STOREFRONT_CATEGORIES;
  try {
    const raw = localStorage.getItem(CATS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return INITIAL_STOREFRONT_CATEGORIES;
}

/** Active root categories used by the homepage. New admin categories appear here automatically. */
export function useStorefrontCategories(): StorefrontCategory[] {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["storefront-root-categories"],
    initialData: readCachedCategories(),
    staleTime: 30_000,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("categories")
        .select("slug,name_ar,name_en,description_ar,description_en,icon,icon_url,accent_color,theme_gradient,sort_order")
        .is("parent_id", null)
        .eq("is_main", true)
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      const mapped = (rows ?? []).map((row) => {
        const def = DEFAULT_BY_SLUG.get(row.slug);
        const accent = (row.accent_color && row.accent_color.trim() !== "" && row.accent_color !== "var(--cyan)")
          ? row.accent_color
          : (def?.accent || "#00E5FF");

        const background = (row.theme_gradient && row.theme_gradient.trim() !== "" && row.theme_gradient !== "var(--surface-2)")
          ? row.theme_gradient
          : (def?.bg || `linear-gradient(145deg, ${accent}28, ${accent}0a)`);

        return {
          slug: row.slug,
          nameAr: row.name_ar,
          nameEn: row.name_en,
          descriptionAr: row.description_ar ?? "",
          descriptionEn: row.description_en ?? "",
          icon: row.icon || "◈",
          iconImage: row.icon_url,
          accent,
          background,
          sortOrder: row.sort_order,
        };
      }) as StorefrontCategory[];
      if (typeof window !== "undefined") {
        localStorage.setItem(CATS_CACHE_KEY, JSON.stringify(mapped));
      }
      return mapped;
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("storefront-root-categories-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, () => {
        queryClient.invalidateQueries({ queryKey: ["storefront-root-categories"] });
        queryClient.invalidateQueries({ queryKey: ["storefront-category-visibility"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return data ?? [];
}

export function useHiddenCategorySlugs(): Set<string> {
  const { data } = useQuery({
    queryKey: ["storefront-category-visibility"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("slug, is_active")
        .eq("is_active", false);
      if (error) throw error;
      return (data ?? []) as { slug: string; is_active: boolean }[];
    },
  });

  return useMemo(() => new Set((data ?? []).map((c) => c.slug)), [data]);
}

/** Convenience filter for any list of `{ slug }` items. */
export function useVisibleBySlug<T extends { slug: string }>(items: T[]): T[] {
  const hidden = useHiddenCategorySlugs();
  return useMemo(() => items.filter((i) => !hidden.has(i.slug)), [items, hidden]);
}
