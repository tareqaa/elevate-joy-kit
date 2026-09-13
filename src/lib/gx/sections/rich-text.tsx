// Lightweight rich-text field + safe renderer used by section editors.
// Admin edits inline (bold / italic / underline / link / clear), the public
// side renders the sanitized HTML. Plain strings keep working unchanged.

import { useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Bold, Italic, Underline, Link2, Eraser } from "lucide-react";

/* ============================================================
   ISOMORPHIC STANDARDS-COMPLIANT HTML SANITIZER (SEC-05)
   - Strict tag allowlist: B, STRONG, I, EM, U, A, BR, SPAN, P
   - Strict attribute allowlist: ONLY href on <a>
   - Zero event handlers (onerror, onload, onclick, etc.)
   - Discards dangerous containers (<script>, <style>, <svg>, <iframe>, etc.)
   - Validates URI protocols (rejects javascript:, data:, vbscript:)
   - Runs identically in Browser and SSR (Node/Cloudflare) without heavy DOM deps
   ============================================================ */

const ALLOWED_TAGS = new Set(["B", "STRONG", "I", "EM", "U", "A", "BR", "SPAN", "P"]);
const DISCARD_CONTENT_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "IFRAME",
  "OBJECT",
  "EMBED",
  "SVG",
  "MATH",
  "NOSCRIPT",
  "TEMPLATE",
]);

function isSafeUrl(rawUrl: string): boolean {
  if (!rawUrl) return false;
  let decoded = rawUrl;
  try {
    decoded = decodeURIComponent(rawUrl);
  } catch {
    // ignore
  }

  // Decode numeric and named HTML entities
  decoded = decoded
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#([0-9]+);?/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/[\u0000-\u001F\u007F-\u009F\s]/g, ""); // Strip control characters & whitespace

  const lower = decoded.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("vbscript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("file:")
  ) {
    return false;
  }

  return (
    /^https?:\/\//i.test(decoded) ||
    /^mailto:/i.test(decoded) ||
    /^tel:/i.test(decoded) ||
    decoded.startsWith("/") ||
    decoded.startsWith("#")
  );
}

function escapeHtmlAttr(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Universal lexical tokenizer and HTML sanitizer for SSR and client fallback.
 */
function tokenizeAndSanitize(html: string): string {
  let out = "";
  let i = 0;
  const len = html.length;

  while (i < len) {
    const char = html[i];

    if (char === "<") {
      // 1. Comment: <!-- ... -->
      if (html.slice(i, i + 4) === "<!--") {
        const endComment = html.indexOf("-->", i + 4);
        if (endComment === -1) break;
        i = endComment + 3;
        continue;
      }

      // 2. Closing tag: </tag>
      if (html[i + 1] === "/") {
        const closeEnd = html.indexOf(">", i + 2);
        if (closeEnd === -1) {
          i = len;
          break;
        }
        const tagName = html.slice(i + 2, closeEnd).trim().toUpperCase();
        if (ALLOWED_TAGS.has(tagName) && tagName !== "BR") {
          out += `</${tagName.toLowerCase()}>`;
        }
        i = closeEnd + 1;
        continue;
      }

      // 3. Opening or self-closing tag: <tag attr="...">
      const tagEnd = html.indexOf(">", i + 1);
      if (tagEnd === -1) {
        i = len;
        break;
      }

      const tagContent = html.slice(i + 1, tagEnd).trim();
      const match = tagContent.match(/^([a-zA-Z0-9_-]+)/);

      if (!match) {
        i = tagEnd + 1;
        continue;
      }

      const tagName = match[1].toUpperCase();

      // If dangerous container tag, discard tag AND its inner content
      if (DISCARD_CONTENT_TAGS.has(tagName)) {
        const closingTagPattern = new RegExp(`</\\s*${tagName}\\s*>`, "i");
        const rest = html.slice(tagEnd + 1);
        const closeMatch = rest.match(closingTagPattern);
        if (closeMatch && closeMatch.index !== undefined) {
          i = tagEnd + 1 + closeMatch.index + closeMatch[0].length;
        } else {
          i = len;
        }
        continue;
      }

      // If allowed tag, parse and sanitize attributes
      if (ALLOWED_TAGS.has(tagName)) {
        if (tagName === "BR") {
          out += "<br />";
        } else if (tagName === "A") {
          // Parse href attribute strictly
          const hrefMatch = tagContent.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
          const rawHref = hrefMatch ? hrefMatch[1] ?? hrefMatch[2] ?? hrefMatch[3] ?? "" : "";

          if (rawHref && isSafeUrl(rawHref)) {
            out += `<a href="${escapeHtmlAttr(rawHref)}" target="_blank" rel="noreferrer">`;
          } else {
            out += "<a>";
          }
        } else {
          // Strip all attributes from other allowed tags
          out += `<${tagName.toLowerCase()}>`;
        }
      }

      i = tagEnd + 1;
    } else {
      // Normal text character
      out += char;
      i++;
    }
  }

  return out;
}

/**
 * Strips every tag and attribute outside the allowed formatting allowlist.
 * Works safely and identically on both browser and server (SSR).
 */
export function sanitizeRichText(html: string | null | undefined): string {
  if (!html) return "";

  // 1. Browser-native DOMParser if available
  if (typeof window !== "undefined" && typeof DOMParser !== "undefined") {
    try {
      const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
      const root = doc.body.firstElementChild;
      if (!root) return "";

      const walk = (node: Element) => {
        for (const child of Array.from(node.children)) {
          const tag = child.tagName.toUpperCase();

          if (DISCARD_CONTENT_TAGS.has(tag)) {
            child.remove();
            continue;
          }

          if (!ALLOWED_TAGS.has(tag)) {
            child.replaceWith(...Array.from(child.childNodes));
            continue;
          }

          for (const attr of Array.from(child.attributes)) {
            const isSafeHref =
              tag === "A" &&
              attr.name.toLowerCase() === "href" &&
              isSafeUrl(attr.value);

            if (!isSafeHref) {
              child.removeAttribute(attr.name);
            }
          }

          if (tag === "A") {
            child.setAttribute("target", "_blank");
            child.setAttribute("rel", "noreferrer");
          }

          walk(child);
        }
      };

      walk(root);
      return root.innerHTML;
    } catch {
      // Fall through to tokenizer
    }
  }

  // 2. SSR Tokenizer fallback
  return tokenizeAndSanitize(html);
}

export function RichHtml({ html, as: Tag = "div", className, style }: {
  html?: string | null;
  as?: "div" | "p" | "span";
  className?: string;
  style?: React.CSSProperties;
}) {
  const value = html ?? "";
  if (!value) return null;
  if (!/<[a-z][\s\S]*>/i.test(value)) return <Tag className={className} style={style}>{value}</Tag>;
  return <Tag className={className} style={style} dangerouslySetInnerHTML={{ __html: sanitizeRichText(value) }} />;
}

export function RichTextField({ label, value, onChange, rows = 3 }: {
  label: string;
  value?: string | null;
  onChange: (v: string) => void;
  rows?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Only sync from props when the field isn't focused, so typing isn't reset.
  useEffect(() => {
    const el = ref.current;
    if (!el || document.activeElement === el) return;
    const next = value ?? "";
    if (el.innerHTML !== next) el.innerHTML = next;
  }, [value]);

  function exec(cmd: string, arg?: string) {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    onChange(sanitizeRichText(ref.current?.innerHTML ?? ""));
  }

  const btn = "p-1.5 rounded text-slate-300 hover:bg-slate-800";
  return (
    <div className="space-y-1">
      <Label className="text-xs text-slate-400">{label}</Label>
      <div className="flex items-center gap-0.5 rounded-md border border-slate-800 bg-slate-950/60 p-0.5 w-fit">
        <button type="button" title="عريض" className={btn} onClick={() => exec("bold")}><Bold size={12} /></button>
        <button type="button" title="مائل" className={btn} onClick={() => exec("italic")}><Italic size={12} /></button>
        <button type="button" title="تسطير" className={btn} onClick={() => exec("underline")}><Underline size={12} /></button>
        <button type="button" title="رابط" className={btn}
          onClick={() => { const u = prompt("رابط:"); if (u) exec("createLink", u); }}><Link2 size={12} /></button>
        <button type="button" title="إزالة التنسيق" className={btn} onClick={() => exec("removeFormat")}><Eraser size={12} /></button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={() => onChange(sanitizeRichText(ref.current?.innerHTML ?? ""))}
        onBlur={() => onChange(sanitizeRichText(ref.current?.innerHTML ?? ""))}
        className="rounded-md border border-slate-800 bg-slate-900/60 px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-cyan-600"
        style={{ minHeight: rows * 22 }}
      />
    </div>
  );
}
