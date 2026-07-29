import { createServerFn } from "@tanstack/react-start";

/**
 * Machine translation for user-written content (reviews) through Google Translate.
 * Runs server-side to avoid CORS and to keep one shared cache-friendly endpoint.
 */
export const translateTexts = createServerFn({ method: "POST" })
  .inputValidator((input: { texts: string[]; target: string }) => ({
    texts: (input?.texts ?? []).slice(0, 40).map((t) => String(t ?? "").slice(0, 600)),
    target: input?.target === "ar" ? "ar" : "en",
  }))
  .handler(async ({ data }) => {
    const out: { text: string; from: string | null }[] = [];
    for (const text of data.texts) {
      if (!text.trim()) { out.push({ text, from: null }); continue; }
      try {
        const url =
          "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=" +
          data.target + "&dt=t&q=" + encodeURIComponent(text);
        const res = await fetch(url);
        if (!res.ok) { out.push({ text, from: null }); continue; }
        const json = (await res.json()) as [Array<[string]>, unknown, string];
        const translated = (json?.[0] ?? []).map((s) => s?.[0] ?? "").join("");
        const from = typeof json?.[2] === "string" ? json[2] : null;
        out.push(
          translated && from && from !== data.target
            ? { text: translated, from }
            : { text, from: null },
        );
      } catch {
        out.push({ text, from: null });
      }
    }
    return out;
  });
