// Lightweight rich-text field + safe renderer used by section editors.
// Admin edits inline (bold / italic / underline / link / clear), the public
// side renders the sanitized HTML. Plain strings keep working unchanged.

import { useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Bold, Italic, Underline, Link2, Eraser } from "lucide-react";

const ALLOWED_TAGS = new Set(["B", "STRONG", "I", "EM", "U", "A", "BR", "SPAN", "P"]);

/** Strip every tag/attribute outside a tiny inline allowlist. */
export function sanitizeRichText(html: string): string {
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return html.replace(/<\/?(script|style|iframe|object|embed)[^>]*>/gi, "");
  }
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return "";
  const walk = (node: Element) => {
    for (const child of Array.from(node.children)) {
      if (!ALLOWED_TAGS.has(child.tagName)) {
        child.replaceWith(...Array.from(child.childNodes));
        continue;
      }
      for (const attr of Array.from(child.attributes)) {
        const keep =
          child.tagName === "A" && attr.name === "href" && !/^\s*javascript:/i.test(attr.value);
        if (!keep) child.removeAttribute(attr.name);
      }
      if (child.tagName === "A") {
        child.setAttribute("target", "_blank");
        child.setAttribute("rel", "noreferrer");
      }
      walk(child);
    }
  };
  walk(root);
  return root.innerHTML;
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
