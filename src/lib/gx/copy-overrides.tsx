// Site-wide inline text editing.
//
// Any text on ANY store page can be overridden without code:
//  - overrides live in site_settings under the "site_copy" key
//  - a key is `${pathname}|${cssPath}` so the same wording on two pages
//    can differ, with an original-text fallback when the DOM shifts
//  - admins toggle "edit text" mode, click any text, type, then save.

import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type CopyEntry = { text: string; orig?: string };
export type CopyMap = Record<string, CopyEntry>;

export const EDIT_FLAG = "gx_text_edit";

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "SVG", "PATH", "INPUT", "TEXTAREA", "SELECT", "OPTION", "NOSCRIPT", "IFRAME"]);

function cssPath(el: Element): string {
  const parts: string[] = [];
  let node: Element | null = el;
  while (node && node !== document.body && parts.length < 12) {
    const parent: Element | null = node.parentElement;
    if (!parent) break;
    const idx = Array.prototype.indexOf.call(parent.children, node) + 1;
    parts.unshift(`${node.tagName.toLowerCase()}:nth-child(${idx})`);
    node = parent;
  }
  return parts.join(">");
}

function isEditableText(el: Element): el is HTMLElement {
  if (SKIP_TAGS.has(el.tagName)) return false;
  if (el.closest("[data-gx-noedit]")) return false;
  if (el.childElementCount > 0) return false;
  const t = (el.textContent ?? "").trim();
  return t.length > 0 && t.length < 400;
}

export function keyFor(pathname: string, el: Element) {
  return `${pathname}|${cssPath(el)}`;
}

async function fetchCopy(): Promise<CopyMap> {
  const { data } = await supabase.from("site_settings").select("value").eq("key", "site_copy").maybeSingle();
  const v = data?.value as unknown;
  return v && typeof v === "object" ? (v as CopyMap) : {};
}

/** Applies stored overrides + (for admins) provides click-to-edit. */
export function InlineTextEditor() {
  const location = useLocation();
  const pathname = location.pathname;
  const [copy, setCopy] = useState<CopyMap>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState<CopyMap>({});
  const applying = useRef(false);

  // Load overrides once.
  useEffect(() => { fetchCopy().then(setCopy).catch(() => {}); }, []);

  // Admin check.
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (!uid) return;
      const { data } = await supabase.rpc("has_role", { _user_id: uid, _role: "admin" });
      if (alive) setIsAdmin(Boolean(data));
    })().catch(() => {});
    return () => { alive = false; };
  }, []);

  // Listen for the toggle event fired from the admin FAB.
  useEffect(() => {
    function onToggle() { setEditing((v) => !v); }
    window.addEventListener("gx:toggle-text-edit", onToggle);
    return () => window.removeEventListener("gx:toggle-text-edit", onToggle);
  }, []);

  const apply = useCallback(() => {
    if (applying.current) return;
    applying.current = true;
    try {
      const prefix = `${pathname}|`;
      for (const [k, entry] of Object.entries(copy)) {
        if (!k.startsWith(prefix)) continue;
        const sel = k.slice(prefix.length);
        let el: Element | null = null;
        try { el = document.body.querySelector(`:scope>${sel}`) ?? document.querySelector(sel); } catch { el = null; }
        if (!el && entry.orig) {
          el = Array.from(document.body.querySelectorAll<HTMLElement>("*"))
            .find((n) => n.childElementCount === 0 && (n.textContent ?? "").trim() === entry.orig) ?? null;
        }
        if (el && (el.textContent ?? "") !== entry.text) el.textContent = entry.text;
      }
    } finally {
      requestAnimationFrame(() => { applying.current = false; });
    }
  }, [copy, pathname]);

  // Re-apply on route change / DOM churn.
  useEffect(() => {
    if (Object.keys(copy).length === 0) return;
    const t = setTimeout(apply, 40);
    const obs = new MutationObserver(() => {
      if (applying.current) return;
      window.clearTimeout((obs as unknown as { _t?: number })._t);
      (obs as unknown as { _t?: number })._t = window.setTimeout(apply, 120);
    });
    obs.observe(document.body, { childList: true, subtree: true });
    return () => { clearTimeout(t); obs.disconnect(); };
  }, [apply, copy]);

  // Click-to-edit wiring.
  useEffect(() => {
    if (!editing || !isAdmin) return;
    document.body.classList.add("gx-text-edit-on");

    function onClick(e: MouseEvent) {
      const el = e.target as HTMLElement | null;
      if (!el || !isEditableText(el)) return;
      if (el.closest(".gx-text-edit-bar")) return;
      e.preventDefault();
      e.stopPropagation();
      if (el.isContentEditable) return;
      const orig = el.dataset.gxOrig ?? (el.textContent ?? "");
      el.dataset.gxOrig = orig;
      el.contentEditable = "true";
      el.classList.add("gx-text-editing");
      el.focus();

      const commit = () => {
        el.contentEditable = "false";
        el.classList.remove("gx-text-editing");
        const text = (el.textContent ?? "").trim();
        if (text && text !== orig.trim()) {
          setPending((p) => ({ ...p, [keyFor(pathname, el)]: { text, orig: orig.trim() } }));
        }
        el.removeEventListener("blur", commit);
        el.removeEventListener("keydown", onKey);
      };
      const onKey = (ev: KeyboardEvent) => {
        if (ev.key === "Enter" && !ev.shiftKey) { ev.preventDefault(); el.blur(); }
        if (ev.key === "Escape") { el.textContent = orig; el.blur(); }
      };
      el.addEventListener("blur", commit);
      el.addEventListener("keydown", onKey);
    }

    document.addEventListener("click", onClick, true);
    return () => {
      document.body.classList.remove("gx-text-edit-on");
      document.removeEventListener("click", onClick, true);
    };
  }, [editing, isAdmin, pathname]);

  async function save() {
    const merged: CopyMap = { ...copy, ...pending };
    const { error } = await supabase.from("site_settings")
      .upsert({ key: "site_copy", value: merged as never }, { onConflict: "key" });
    if (error) { toast.error("فشل الحفظ — تأكد أنك أدمن"); return; }
    setCopy(merged);
    setPending({});
    toast.success("تم حفظ النصوص");
  }

  async function resetPage() {
    const prefix = `${pathname}|`;
    const merged: CopyMap = Object.fromEntries(Object.entries(copy).filter(([k]) => !k.startsWith(prefix)));
    const { error } = await supabase.from("site_settings")
      .upsert({ key: "site_copy", value: merged as never }, { onConflict: "key" });
    if (error) { toast.error("فشل الاستعادة"); return; }
    setCopy(merged);
    setPending({});
    toast.success("تمت استعادة نصوص هذه الصفحة");
    window.location.reload();
  }

  const count = Object.keys(pending).length;

  return (
    <>
      <style>{editCss}</style>
      {editing && isAdmin && (
        <div className="gx-text-edit-bar" dir="rtl" data-gx-noedit>
          <span className="gx-teb-dot" />
          <span className="gx-teb-label">وضع تحرير النصوص — اضغط أي نص لتعديله</span>
          {count > 0 && <span className="gx-teb-count">{count} تعديل</span>}
          <button className="gx-teb-btn primary" onClick={save} disabled={count === 0}>حفظ</button>
          <button className="gx-teb-btn" onClick={() => { setPending({}); window.location.reload(); }}>تراجع</button>
          <button className="gx-teb-btn danger" onClick={resetPage}>استعادة الأصل</button>
          <button className="gx-teb-btn" onClick={() => setEditing(false)}>خروج</button>
        </div>
      )}
    </>
  );
}

const editCss = `
body.gx-text-edit-on *:not(.gx-text-edit-bar):not(.gx-text-edit-bar *):hover{outline:1px dashed rgba(0,212,255,.55);outline-offset:2px;cursor:text;}
.gx-text-editing{outline:2px solid #00d4ff !important;background:rgba(0,212,255,.08);border-radius:4px;}
.gx-text-edit-bar{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);z-index:120;display:flex;align-items:center;gap:8px;padding:9px 12px;border-radius:14px;background:rgba(8,12,20,.96);backdrop-filter:blur(14px);box-shadow:0 18px 44px rgba(0,0,0,.55),inset 0 0 0 1px rgba(0,212,255,.28);font-size:12.5px;color:#c9d2de;flex-wrap:wrap;max-width:94vw;}
.gx-teb-dot{width:8px;height:8px;border-radius:50%;background:#00d4ff;box-shadow:0 0 10px #00d4ff;}
.gx-teb-label{font-weight:700;}
.gx-teb-count{background:rgba(0,212,255,.14);color:#7dfffe;border-radius:99px;padding:2px 9px;font-weight:800;}
.gx-teb-btn{border:0;cursor:pointer;padding:6px 12px;border-radius:9px;background:rgba(255,255,255,.07);color:#dfe6ee;font-weight:800;font-size:12px;}
.gx-teb-btn:hover{background:rgba(255,255,255,.13);}
.gx-teb-btn.primary{background:linear-gradient(135deg,#00d4ff,#7dfffe);color:#031018;}
.gx-teb-btn.primary:disabled{opacity:.4;cursor:not-allowed;}
.gx-teb-btn.danger{color:#ff9aa2;}
`;
