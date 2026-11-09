/* ============================================================
   USER AGENT & DEVICE PARSER
   Extracts friendly device name, OS, browser, and device category
   from standard HTTP User-Agent strings.
   ============================================================ */

export type ParsedDeviceInfo = {
  deviceName: string;
  deviceType: "desktop" | "mobile" | "tablet";
  browser: string;
  os: string;
  icon: "monitor" | "smartphone" | "tablet" | "laptop";
};

export function parseUserAgent(uaString?: string | null): ParsedDeviceInfo {
  const ua = (uaString || "").trim();

  if (!ua) {
    return {
      deviceName: "جهاز غير معروف",
      deviceType: "desktop",
      browser: "متصفح ويب",
      os: "نظام غير معروف",
      icon: "monitor",
    };
  }

  // 1. Detect Device Type
  const isTablet = /iPad|Tablet|(Android(?!.*Mobile))/i.test(ua);
  const isMobile = !isTablet && /Mobile|iPhone|iPod|Android.*Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const deviceType: "desktop" | "mobile" | "tablet" = isTablet ? "tablet" : isMobile ? "mobile" : "desktop";

  // 2. Detect OS
  let os = "نظام غير معروف";
  if (/Windows NT 10.0/i.test(ua)) os = "Windows 11 / 10";
  else if (/Windows NT 6.3/i.test(ua)) os = "Windows 8.1";
  else if (/Windows NT 6.1/i.test(ua)) os = "Windows 7";
  else if (/Windows NT/i.test(ua)) os = "Windows";
  else if (/iPhone/i.test(ua)) os = "iOS (iPhone)";
  else if (/iPad/i.test(ua)) os = "iPadOS (iPad)";
  else if (/Mac OS X/i.test(ua)) os = "macOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/Linux/i.test(ua)) os = "Linux";

  // 3. Detect Browser
  let browser = "متصفح ويب";
  if (/Edg\//i.test(ua)) browser = "Microsoft Edge";
  else if (/OPR\/|Opera/i.test(ua)) browser = "Opera";
  else if (/SamsungBrowser/i.test(ua)) browser = "Samsung Internet";
  else if (/Chrome\//i.test(ua)) browser = "Google Chrome";
  else if (/Firefox\//i.test(ua)) browser = "Mozilla Firefox";
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = "Apple Safari";

  // 4. Friendly Device Name
  let deviceName = `${os} (${browser})`;
  if (deviceType === "mobile" && /iPhone/i.test(ua)) {
    deviceName = `iPhone — ${browser}`;
  } else if (deviceType === "mobile" && /Android/i.test(ua)) {
    deviceName = `هاتف Android — ${browser}`;
  } else if (deviceType === "tablet") {
    deviceName = `جهاز لوحي Tablet — ${browser}`;
  } else if (/Windows/i.test(ua)) {
    deviceName = `كمبيوتر Windows — ${browser}`;
  } else if (/Mac/i.test(ua)) {
    deviceName = `جهاز Mac — ${browser}`;
  }

  const icon: "monitor" | "smartphone" | "tablet" | "laptop" =
    deviceType === "mobile" ? "smartphone" : deviceType === "tablet" ? "tablet" : "monitor";

  return {
    deviceName,
    deviceType,
    browser,
    os,
    icon,
  };
}

