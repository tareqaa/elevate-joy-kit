import { describe, it, expect, vi, beforeEach } from "vitest";
import { runWithStartContext } from "@tanstack/start-storage-context";

// Mock supabase-request and pricing.server
const mockResetPasswordForEmail = vi.fn();
const mockRpc = vi.fn();

const mockSupabaseClient = {
  auth: {
    resetPasswordForEmail: mockResetPasswordForEmail,
  },
  rpc: mockRpc,
} as any;

vi.mock("@/lib/gx/supabase-request", () => ({
  getPublicClient: vi.fn(() => mockSupabaseClient),
  getVerifiedCaller: vi.fn(),
  getUserScopedClient: vi.fn(),
}));

vi.mock("@/lib/gx/pricing.server", () => ({
  isAdminUser: vi.fn(),
}));

import { purgeCatalogCacheFn } from "../catalog.functions";
import { handleTranslateTexts } from "../translate.functions";
import { sanitizeRichText } from "../sections/rich-text";
import { handlePasswordReset } from "../auth.functions";
import { resolveSafeClientIp, isValidIp } from "../ip";
import { assertSafeImageUpload } from "../safe-image";
import { getVerifiedCaller, getUserScopedClient } from "@/lib/gx/supabase-request";
import { isAdminUser } from "@/lib/gx/pricing.server";

const mockStartContext = {
  request: new Request("http://localhost:8080/"),
  startOptions: {},
} as any;

/* ============================================================
   SEC-02: Public Catalog Cache Eviction Authorization
   ============================================================ */
describe("SEC-02: purgeCatalogCacheFn authorization guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated callers", async () => {
    vi.mocked(getVerifiedCaller).mockResolvedValueOnce(null);

    await expect(
      runWithStartContext(mockStartContext, () =>
        purgeCatalogCacheFn({ data: { slug: "test-product" } })
      )
    ).rejects.toThrow("Unauthorized: authentication required");
  });

  it("rejects non-admin authenticated callers", async () => {
    vi.mocked(getVerifiedCaller).mockResolvedValueOnce({
      userId: "user-123",
      token: "fake-user-token",
    });
    vi.mocked(getUserScopedClient).mockReturnValueOnce({} as any);
    vi.mocked(isAdminUser).mockResolvedValueOnce(false);

    await expect(
      runWithStartContext(mockStartContext, () =>
        purgeCatalogCacheFn({ data: { slug: "test-product" } })
      )
    ).rejects.toThrow("Forbidden: admin role required");
  });

  it("allows verified admin callers to execute without error", async () => {
    vi.mocked(getVerifiedCaller).mockResolvedValueOnce({
      userId: "admin-456",
      token: "fake-admin-token",
    });
    vi.mocked(getUserScopedClient).mockReturnValueOnce({} as any);
    vi.mocked(isAdminUser).mockResolvedValueOnce(true);

    let error: Error | null = null;
    try {
      await runWithStartContext(mockStartContext, () =>
        purgeCatalogCacheFn({ data: { slug: "test-product" } })
      );
    } catch (e: any) {
      error = e;
    }
    expect(error).toBeNull();
  });
});

/* ============================================================
   SEC-04: Google Translate Proxy Hardening
   ============================================================ */
describe("SEC-04: handleTranslateTexts proxy hardening & rate limiting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects oversized character batches exceeding 2500 characters", async () => {
    const hugeText = "a".repeat(300);
    const oversizedBatch = Array(10).fill(hugeText); // 3000 chars

    await expect(
      handleTranslateTexts({ texts: oversizedBatch, target: "ar" }, "198.51.100.1")
    ).rejects.toThrow("Payload too large: maximum 2500 total characters per request");
  });

  it("enforces server-side IP rate limiting for translation requests", async () => {
    const uniqueIp = "198.51.100.42";

    // Mock global fetch for translation
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [[["مرحبا", "hello"]]],
    } as any);

    try {
      // Consume the allowed limit (10 requests)
      for (let i = 0; i < 10; i++) {
        await handleTranslateTexts({ texts: [`unique-text-${i}`], target: "ar" }, uniqueIp);
      }

      // 11th request must be rejected by server IP rate limiting
      await expect(
        handleTranslateTexts({ texts: ["rate-limit-trigger"], target: "ar" }, uniqueIp)
      ).rejects.toThrow("Rate limit exceeded");
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("serves repeated requests from in-memory cache without calling translation service", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [[["رائع جدا", "very cool"]], null, "en"],
    } as any);

    const originalFetch = global.fetch;
    global.fetch = fetchSpy;

    const uniqueIp = "198.51.100.99";
    try {
      // First call translates and caches
      const firstRes = await handleTranslateTexts(
        { texts: ["very cool test cache text"], target: "ar" },
        uniqueIp
      );
      expect(firstRes[0].text).toBe("رائع جدا");
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Second call must hit cache without additional fetch
      const secondRes = await handleTranslateTexts(
        { texts: ["very cool test cache text"], target: "ar" },
        uniqueIp
      );
      expect(secondRes[0].text).toBe("رائع جدا");
      expect(fetchSpy).toHaveBeenCalledTimes(1); // Fetch not called again!
    } finally {
      global.fetch = originalFetch;
    }
  });
});

/* ============================================================
   SEC-05: SSR Rich Text Sanitization
   ============================================================ */
describe("SEC-05: sanitizeRichText SSR & Client security", () => {
  it("strips script tags and malicious executable scripts", () => {
    const dirty = '<p>Normal text <script>alert("XSS")</script> more text</p>';
    const clean = sanitizeRichText(dirty);
    expect(clean).not.toContain("<script");
    expect(clean).not.toContain("alert");
    expect(clean).toContain("<p>");
    expect(clean).toContain("Normal text");
    expect(clean).toContain("more text");
  });

  it("strips event handlers (onerror, onload, onclick, onmouseover)", () => {
    const dirtyImg = '<img src="invalid.jpg" onerror="alert(document.cookie)">';
    const cleanImg = sanitizeRichText(dirtyImg);
    expect(cleanImg).not.toContain("onerror");
    expect(cleanImg).not.toContain("alert");
    expect(cleanImg).not.toContain("<img"); // img is not in allowlist

    const dirtyBold = '<b onclick="alert(1)" onmouseover="alert(2)">Bold Safe Text</b>';
    const cleanBold = sanitizeRichText(dirtyBold);
    expect(cleanBold).toBe("<b>Bold Safe Text</b>");
    expect(cleanBold).not.toContain("onclick");
    expect(cleanBold).not.toContain("onmouseover");
  });

  it("strips dangerous SVG and IFRAME vectors", () => {
    const dirtySvg = '<svg onload="alert(1)"><circle cx="50" cy="50" r="40" /></svg>';
    const cleanSvg = sanitizeRichText(dirtySvg);
    expect(cleanSvg).not.toContain("<svg");
    expect(cleanSvg).not.toContain("onload");
    expect(cleanSvg).not.toContain("alert");

    const dirtyIframe = '<iframe src="https://evil.com"></iframe>';
    const cleanIframe = sanitizeRichText(dirtyIframe);
    expect(cleanIframe).not.toContain("<iframe");
  });

  it("blocks pseudo-protocol XSS in links (javascript:, data:, vbscript:)", () => {
    const jsLink = '<a href="javascript:alert(1)">Click Me</a>';
    const cleanJs = sanitizeRichText(jsLink);
    expect(cleanJs).not.toContain("javascript:");
    expect(cleanJs).not.toContain("alert");

    const obfuscatedJs = '<a href="jav&#x09;ascript:alert(1)">Click Me</a>';
    const cleanObfuscated = sanitizeRichText(obfuscatedJs);
    expect(cleanObfuscated).not.toContain("javascript");
    expect(cleanObfuscated).not.toContain("alert");

    const dataLink = '<a href="data:text/html,<script>alert(1)</script>">Click Me</a>';
    const cleanData = sanitizeRichText(dataLink);
    expect(cleanData).not.toContain("data:");
  });

  it("preserves legitimate formatting and safe links", () => {
    const valid = '<p>Welcome to <b>GX Store</b>! Check our <i>special</i> <a href="https://gxstore.net/games">Catalog</a>.</p><br />';
    const clean = sanitizeRichText(valid);
    expect(clean).toContain("<p>Welcome to <b>GX Store</b>! Check our <i>special</i>");
    expect(clean).toContain('<a href="https://gxstore.net/games" target="_blank" rel="noreferrer">Catalog</a>');
    expect(clean).toContain("<br />");
  });
});

/* ============================================================
   SEC-08: Password Reset Hardening
   ============================================================ */
describe("SEC-08: handlePasswordReset hardening", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid email addresses", async () => {
    await expect(
      handlePasswordReset({ email: "not-an-email", lang: "en" }, "192.0.2.1", mockSupabaseClient)
    ).rejects.toThrow("Invalid email format");
  });

  it("respects database cooldown and does not dispatch GoTrue email", async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        allowed: false,
        remaining_minutes: 45,
        message_en: "You can only request a password reset once per hour. Please wait 45 minutes.",
      },
    });

    const res = await handlePasswordReset(
      {
        email: "cooldown-user@example.com",
        lang: "en",
      },
      "192.0.2.2",
      mockSupabaseClient
    );

    expect(res.ok).toBe(false);
    expect(res.message).toContain("wait 45 minutes");
    expect(mockResetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("dispatches GoTrue reset email and records request when cooldown allows", async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        allowed: true,
      },
    });
    mockResetPasswordForEmail.mockResolvedValueOnce({ error: null });

    const res = await handlePasswordReset(
      {
        email: "legit-user@example.com",
        redirectTo: "http://localhost:8080/reset-password",
        lang: "ar",
      },
      "192.0.2.3",
      mockSupabaseClient
    );

    expect(res.ok).toBe(true);
    expect(mockResetPasswordForEmail).toHaveBeenCalledWith("legit-user@example.com", {
      redirectTo: "http://localhost:8080/reset-password",
    });
    // Verifies record_password_reset_request was called
    expect(mockRpc).toHaveBeenCalledWith("record_password_reset_request", {
      _email: "legit-user@example.com",
    });
  });

  it("enforces server IP rate limiting after exceeding 5 requests per IP", async () => {
    const rateLimitIp = "203.0.113.88";

    mockRpc.mockResolvedValue({ data: { allowed: true } });
    mockResetPasswordForEmail.mockResolvedValue({ error: null });

    // Consume the allowed 5 requests
    for (let i = 0; i < 5; i++) {
      const res = await handlePasswordReset(
        {
          email: `spam-test-${i}@example.com`,
          lang: "en",
        },
        rateLimitIp,
        mockSupabaseClient
      );
      expect(res.ok).toBe(true);
    }

    // 6th attempt from same IP must be rejected by server IP rate limiting
    const sixthRes = await handlePasswordReset(
      {
        email: "spam-test-6@example.com",
        lang: "en",
      },
      rateLimitIp,
      mockSupabaseClient
    );

    expect(sixthRes.ok).toBe(false);
    expect(sixthRes.message).toContain("Too many password reset requests");
  });

  it("prevents account enumeration by returning generic success message when user not found", async () => {
    mockRpc.mockResolvedValueOnce({ data: { allowed: true } });
    mockResetPasswordForEmail.mockResolvedValueOnce({
      error: { message: "User not found" },
    });

    const res = await handlePasswordReset(
      {
        email: "nonexistent-user@example.com",
        lang: "ar",
      },
      "192.0.2.199",
      mockSupabaseClient
    );

    // Must return ok: true with generic message, NOT exposing "User not found"
    expect(res.ok).toBe(true);
    expect(res.message).toBe(
      "إذا كان هذا البريد مسجلاً لدينا، فسيتم إرسال رابط استعادة كلمة المرور إليه."
    );
  });
});

describe("FIX 3: Safe Client IP Resolution", () => {
  it("extracts rightmost valid proxy hop from X-Forwarded-For instead of spoofable first entry", () => {
    const headers: Record<string, string> = {
      "x-forwarded-for": "10.0.0.1, 203.0.113.50, 198.51.100.22",
    };
    const ip = resolveSafeClientIp((name) => headers[name.toLowerCase()]);
    expect(ip).toBe("198.51.100.22");
  });

  it("prefers cf-connecting-ip when present and valid", () => {
    const headers: Record<string, string> = {
      "cf-connecting-ip": "198.51.100.99",
      "x-forwarded-for": "10.0.0.1",
    };
    const ip = resolveSafeClientIp((name) => headers[name.toLowerCase()]);
    expect(ip).toBe("198.51.100.99");
  });

  it("falls back to 127.0.0.1 when no valid IP header is provided", () => {
    const headers: Record<string, string> = {
      "x-forwarded-for": "invalid-ip-string",
    };
    const ip = resolveSafeClientIp((name) => headers[name.toLowerCase()]);
    expect(ip).toBe("127.0.0.1");
  });

  it("validates IPv4 and IPv6 addresses correctly", () => {
    expect(isValidIp("192.168.1.1")).toBe(true);
    expect(isValidIp("::1")).toBe(true);
    expect(isValidIp("2001:db8::1")).toBe(true);
    expect(isValidIp("999.999.999.999")).toBe(false);
    expect(isValidIp("not-an-ip")).toBe(false);
    expect(isValidIp("<script>")).toBe(false);
  });
});

describe("FIX 7: Admin SVG Image Security Validator", () => {
  it("rejects SVG files containing script tags", async () => {
    const maliciousSvg = `<svg xmlns="http://www.w3.org/2000/svg"><script>alert("xss")</script></svg>`;
    const file = new File([maliciousSvg], "malicious.svg", { type: "image/svg+xml" });

    await expect(assertSafeImageUpload(file)).rejects.toThrow("ملف SVG غير آمن");
  });

  it("rejects SVG files containing event handlers", async () => {
    const maliciousSvg = `<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><circle cx="10" cy="10" r="5" /></svg>`;
    const file = new File([maliciousSvg], "malicious.svg", { type: "image/svg+xml" });

    await expect(assertSafeImageUpload(file)).rejects.toThrow("ملف SVG غير آمن");
  });

  it("rejects SVG files containing javascript: URLs", async () => {
    const maliciousSvg = `<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)"><text>Click</text></a></svg>`;
    const file = new File([maliciousSvg], "malicious.svg", { type: "image/svg+xml" });

    await expect(assertSafeImageUpload(file)).rejects.toThrow("ملف SVG غير آمن");
  });

  it("allows clean SVG vector files without active content", async () => {
    const cleanSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="red" /></svg>`;
    const file = new File([cleanSvg], "logo.svg", { type: "image/svg+xml" });

    await expect(assertSafeImageUpload(file)).resolves.not.toThrow();
  });

  it("allows standard raster images", async () => {
    const file = new File(["fake-png-data"], "photo.png", { type: "image/png" });
    await expect(assertSafeImageUpload(file)).resolves.not.toThrow();
  });
});

