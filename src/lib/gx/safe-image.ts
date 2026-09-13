/**
 * Validates images prior to upload to prevent stored XSS vectors.
 *
 * SVG files can contain executable scripts (<script>, event handlers, foreignObject)
 * that execute in browser contexts if opened directly. This validator permits
 * legitimate SVG vector graphics while strictly rejecting any active or executable content.
 */

const DANGEROUS_SVG_PATTERNS = [
  /<script\b/i,
  /<foreignobject\b/i,
  /<iframe\b/i,
  /<object\b/i,
  /<embed\b/i,
  /\bon\w+\s*=/i, // onload, onerror, onclick, onmouseover, etc.
  /\bjavascript\s*:/i,
  /\bvbscript\s*:/i,
  /\bdata\s*:\s*text\/html/i,
  /<meta\b/i,
  /<link\b/i,
];

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export async function assertSafeImageUpload(file: File): Promise<void> {
  if (!file) {
    throw new Error("No file provided");
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error("حجم الصورة كبير جداً (الحد الأقصى 10 ميجابايت)");
  }

  const name = file.name.toLowerCase();
  const isSvg = file.type === "image/svg+xml" || name.endsWith(".svg");

  if (isSvg) {
    let content: string;
    try {
      content = await file.text();
    } catch {
      throw new Error("تعذّر قراءة ملف SVG للتحقق من أمانه");
    }

    // Check against dangerous active content
    for (const pattern of DANGEROUS_SVG_PATTERNS) {
      if (pattern.test(content)) {
        throw new Error(
          "ملف SVG غير آمن: يحتوي على سكربتات أو عناصر برمجية غير مصرح بها. يرجى إزالة الأكواد البرمجية من الملف قبل رفعه."
        );
      }
    }

    // Ensure it is structurally an SVG XML document
    const trimmed = content.trim().toLowerCase();
    if (!trimmed.includes("<svg") || !trimmed.includes("</svg>")) {
      throw new Error("ملف SVG تالف أو غير صالح");
    }
  }
}
