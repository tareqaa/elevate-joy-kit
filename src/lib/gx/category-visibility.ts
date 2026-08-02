/**
 * Live visibility for the static storefront category links.
 *
 * The navbar / footer / home grid still render the hand-tuned CATEGORY_LINKS
 * (icons, gradients, copy), but a category that an admin switched off in
 * `categories.is_active` must disappear from those menus instead of leading
 * to a 404 page.
 */
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

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
