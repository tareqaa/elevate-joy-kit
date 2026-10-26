/**
 * Serialises a value for use inside an inline <script type="application/ld+json">.
 * JSON.stringify alone does not escape "</script>" or HTML-significant characters,
 * so stored text (product / category names) could break out of the script tag.
 * Escaping <, >, & and the JS line separators keeps the output valid JSON while
 * making it impossible to terminate the surrounding script element.
 */
export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
