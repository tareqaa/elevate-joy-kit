/* TEMPORARY one-off catalog import endpoint — deleted right after it runs. */
import { createFileRoute } from "@tanstack/react-router";
import { PRODUCTS_CATALOG, GIFT_CARDS_CATALOG, SUBCATEGORIES, CATEGORY_META } from "@/data/products";
import { localizedProduct, localizedRegion } from "@/lib/gx/product-locale";

export const Route = createFileRoute("/api/public/seed-catalog")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");
        const log: string[] = [];
        const ck = (r: { error: unknown }, w: string) => { if (r.error) log.push(w + ": " + JSON.stringify(r.error)); };

        const cats = (await sb.from("categories").select("id,slug")).data ?? [];
        const catId = (slug: string) => cats.find((c: { slug: string }) => c.slug === slug)?.id ?? null;

        const subBySlug: Record<string, any> = {};
        for (const k in SUBCATEGORIES) for (const s of SUBCATEGORIES[k]) subBySlug[s.product || s.slug] = s;
        const TEMPLATES: Record<string, string> = { snapchat: "multi_account", fortnite: "dual_plans" };
        const PRODUCT_CAT: Record<string, string> = {
          adobe: "adobe", canva: "canva", microsoft365: "microsoft365", windows: "windows-keys",
          autodesk: "autodesk", linkedin: "linkedin-premium", gemini: "gemini", fortnite: "fortnite", snapchat: "snapchat",
        };

        ck(await sb.from("product_features").delete().not("id", "is", null), "del features");
        ck(await sb.from("product_variants").delete().not("id", "is", null), "del variants");

        for (const slug in PRODUCTS_CATALOG) {
          const ar: any = PRODUCTS_CATALOG[slug];
          const en: any = localizedProduct(ar, "en");
          const patch: Record<string, unknown> = {
            name_ar: ar.name, name_en: en.name,
            tagline_ar: ar.tagline, tagline_en: en.tagline,
            description_ar: ar.description, description_en: en.description,
            icon: ar.icon, icon_image_url: ar.iconImg ?? subBySlug[slug]?.iconImg ?? null,
            thumb_bg: ar.thumbBg,
            delivery_method_ar: ar.deliveryMethod ?? null, delivery_method_en: en.deliveryMethod ?? null,
            page_template: TEMPLATES[slug] || "standard",
            delivery_details: ar.delivery ? { ar: ar.delivery, en: en.delivery } : {},
            category_id: catId(PRODUCT_CAT[slug]),
            is_active: true,
          };
          if (ar.identifierLabel) { patch['identifier_label_ar'] = ar.identifierLabel; patch['identifier_label_en'] = en.identifierLabel ?? ar.identifierLabel; }
          if (ar.identifierPlaceholder) patch['identifier_placeholder'] = ar.identifierPlaceholder;
          ck(await sb.from("products").update(patch as never).eq("slug", slug), "upd " + slug);

          const { data: prow } = await sb.from("products").select("id").eq("slug", slug).single();
          if (!prow) { log.push("missing product " + slug); continue; }
          const pid = prow.id;

          const rows: any[] = [];
          const groups: [string | null, any[], any[]][] = [
            [null, ar.plans || [], en.plans || []],
            ["crew", ar.crewPlans || [], en.crewPlans || []],
            ["vbucks", ar.vbucksPlans || [], en.vbucksPlans || []],
          ];
          for (const [group, list, enList] of groups) {
            list.forEach((pl: any, i: number) => {
              const ep = enList.find((x: any) => x.id === pl.id) || pl;
              rows.push({
                product_id: pid, cart_id: pl.id, label_ar: pl.label, label_en: ep.label,
                price_jod: pl.price, old_price_jod: pl.oldPrice ?? null,
                tag_ar: pl.tag ?? null, tag_en: ep.tag ?? null, plan_group: group,
                sort_order: i, is_active: true,
              });
            });
          }
          if (rows.length) ck(await sb.from("product_variants").insert(rows), "vars " + slug);

          const feats = (ar.features || []).map((f: any, i: number) => {
            const ef = (en.features || [])[i] || f;
            return { product_id: pid, icon: f.icon, title_ar: f.title, title_en: ef.title, desc_ar: f.desc, desc_en: ef.desc, sort_order: i };
          });
          if (feats.length) ck(await sb.from("product_features").insert(feats), "feats " + slug);
        }

        ck(await sb.from("product_variants").update({ delivery_type: "account" }).eq("cart_id", "ms365-acct-12"), "ms365 acct");

        const GC_CATEGORY: Record<string, string> = { playstation: "gc-playstation", xbox: "gc-xbox", "google-play": "gc-google-play", itunes: "gc-itunes" };
        const GC_NAMES_AR: Record<string, string> = { playstation: "بطاقات بلايستيشن", xbox: "بطاقات إكسبوكس", "google-play": "بطاقات جوجل بلاي", itunes: "بطاقات آيتونز" };
        let gcSort = 20;
        for (const slug in GIFT_CARDS_CATALOG) {
          const gc: any = GIFT_CARDS_CATALOG[slug];
          const sub = SUBCATEGORIES["gift-cards"]!.find((s) => s.slug === slug);
          const row = {
            slug, category_id: catId(GC_CATEGORY[slug]!),
            name_ar: GC_NAMES_AR[slug] || gc.name, name_en: gc.name,
            tagline_ar: "اختر المنطقة والفئة المناسبة", tagline_en: "Pick your region and denomination",
            description_ar: "بطاقة رقمية تصلك فورًا بعد تأكيد الطلب.",
            description_en: "A digital card delivered instantly after your order is confirmed.",
            icon: gc.icon, icon_image_url: gc.iconImg ?? sub?.iconImg ?? null,
            thumb_bg: sub?.bg ?? gc.cardGradient, accent_color: gc.accent, card_gradient: gc.cardGradient,
            page_template: "gift_card", delivery_type: "code", region: "حسب المنطقة",
            delivery_method_ar: "منرسلك كود البطاقة الرقمي بعد تأكيد الطلب — تأكد من اختيار المنطقة المطابقة لحسابك.",
            delivery_method_en: "We send the digital card code after your order is confirmed — make sure the region matches your account.",
            sort_order: gcSort++, is_active: true, delivery_details: {},
          };
          ck(await sb.from("products").upsert(row as never, { onConflict: "slug" }), "gc " + slug);
          const { data: prow } = await sb.from("products").select("id").eq("slug", slug).single();
          if (!prow) continue;
          const rows: any[] = [];
          gc.regions.forEach((r: any, ri: number) => {
            const er: any = localizedRegion(r, "en");
            r.denominations.forEach((d: any, di: number) => {
              rows.push({
                product_id: prow.id, cart_id: d.id, label_ar: d.value, label_en: d.value, price_jod: d.price,
                plan_group: r.code, region: `${r.name}|${er.name}|${r.flag ?? ""}`,
                sort_order: ri * 100 + di, is_active: true, delivery_type: "code",
              });
            });
          });
          if (rows.length) ck(await sb.from("product_variants").insert(rows), "gc vars " + slug);
        }

        const LINK_META: Record<string, { icon: string; tagline_ar: string; tagline_en: string }> = {
          design: { icon: "🧩", tagline_ar: CATEGORY_META['design']!.tagline, tagline_en: "Professional design software and apps at competitive prices" },
          ai: { icon: "🤖", tagline_ar: CATEGORY_META['ai']!.tagline, tagline_en: "The most powerful AI tools at exclusive prices" },
          games: { icon: "🎮", tagline_ar: CATEGORY_META['games']!.tagline, tagline_en: "Subscriptions, currency and top-up cards for the biggest gaming platforms" },
          "gift-cards": { icon: "🎁", tagline_ar: CATEGORY_META['gift-cards']!.tagline, tagline_en: "Digital top-up cards for the biggest platforms" },
          snapchat: { icon: "👻", tagline_ar: "فعّل سناب بلس بأسهل وأسرع طريقة", tagline_en: "Activate Snapchat+ the easiest, fastest way" },
        };
        for (const slug in LINK_META) {
          const m = LINK_META[slug]!;
          ck(await sb.from("categories").update({ icon: m.icon, tagline_ar: m.tagline_ar, tagline_en: m.tagline_en }).eq("slug", slug), "cat " + slug);
        }
        const CHILD: Record<string, any> = {};
        for (const k in SUBCATEGORIES) for (const s of SUBCATEGORIES[k]) CHILD[s.slug === "xbox" && !s.product ? "xbox-games" : s.slug] = s;
        CHILD["linkedin-premium"] = CHILD["linkedin"];
        CHILD["windows-keys"] = CHILD["windows"];
        for (const slug in CHILD) {
          const s = CHILD[slug];
          if (!s) continue;
          ck(await sb.from("categories").update({ icon: s.icon, icon_url: s.iconImg ?? null, theme_gradient: s.bg }).eq("slug", slug), "child " + slug);
        }

        return Response.json({ ok: log.length === 0, log });
      },
    },
  },
});
