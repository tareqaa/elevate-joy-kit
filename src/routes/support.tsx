import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { StoreShell } from "@/components/gx/StoreShell";
import { useLang } from "@/lib/gx/i18n";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";
import { toast } from "sonner";
import { Copy, Check, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "الدعم الفني | متجر GX Store" },
      {
        name: "description",
        content: "تواصل مع فريق الدعم الفني لمتجر GX Store مباشرة عبر واتساب أو ديسكورد.",
      },
    ],
    links: STORE_HEAD_LINKS,
  }),
  component: SupportPage,
});

const WHATSAPP_DISPLAY = "+962 7 7625 2313";
const WHATSAPP_COPY = "+962776252313";
const WHATSAPP_RAW = "962776252313";
const DISCORD_INVITE = "https://discord.gg/DvkUd5PgqV";
const DISCORD_SHORT = "discord.gg/DvkUd5PgqV";

function WhatsAppSvg() {
  return (
    <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
    </svg>
  );
}

function DiscordSvg() {
  return (
    <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

function useLocalSupportHours(ar: boolean) {
  const [info, setInfo] = useState<{ timeRange: string; locationName: string }>({
    timeRange: ar ? "من 10:00 صباحاً حتى 2:00 بعد منتصف الليل" : "from 10:00 AM to 2:00 AM",
    locationName: ar ? "الأردن 🇯🇴" : "Jordan 🇯🇴",
  });

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Amman";
      const now = new Date();
      // Baseline Jordan working hours: 10:00 AM to 02:00 AM next day (UTC+3)
      // 10:00 AM Jordan = 07:00 UTC, 02:00 AM Jordan = 23:00 UTC
      const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 7, 0, 0));
      const endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 0, 0));

      const fmt = (d: Date) =>
        d.toLocaleTimeString(ar ? "ar-EG" : "en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });

      const startTimeStr = fmt(startDate);
      const endTimeStr = fmt(endDate);

      const tzMapAr: Record<string, string> = {
        "Asia/Amman": "الأردن 🇯🇴",
        "Africa/Cairo": "مصر 🇪🇬",
        "Asia/Riyadh": "السعودية 🇸🇦",
        "Asia/Dubai": "الإمارات 🇦🇪",
        "Asia/Kuwait": "الكويت 🇰🇼",
        "Asia/Qatar": "قطر 🇶🇦",
        "Asia/Bahrain": "البحرين 🇧🇭",
        "Asia/Muscat": "عُمان 🇴🇲",
        "Asia/Baghdad": "العراق 🇮🇶",
        "Asia/Beirut": "لبنان 🇱🇧",
        "Asia/Damascus": "سوريا 🇸🇾",
        "Asia/Jerusalem": "فلسطين 🇵🇸",
        "Asia/Gaza": "فلسطين 🇵🇸",
        "Asia/Hebron": "فلسطين 🇵🇸",
        "Africa/Tripoli": "ليبيا 🇱🇾",
        "Africa/Tunis": "تونس 🇹🇳",
        "Africa/Algiers": "الجزائر 🇩🇿",
        "Africa/Casablanca": "المغرب 🇲🇦",
        "Africa/Khartoum": "السودان 🇸🇩",
        "Europe/Istanbul": "تركيا 🇹🇷",
        "Europe/London": "بريطانيا 🇬🇧",
        "Europe/Berlin": "ألمانيا 🇩🇪",
        "America/New_York": "أمريكا (نيويورك)",
      };

      const tzMapEn: Record<string, string> = {
        "Asia/Amman": "Jordan 🇯🇴",
        "Africa/Cairo": "Egypt 🇪🇬",
        "Asia/Riyadh": "Saudi Arabia 🇸🇦",
        "Asia/Dubai": "UAE 🇦🇪",
        "Asia/Kuwait": "Kuwait 🇰🇼",
        "Asia/Qatar": "Qatar 🇶🇦",
        "Asia/Bahrain": "Bahrain 🇧🇭",
        "Asia/Muscat": "Oman 🇴🇲",
        "Asia/Baghdad": "Iraq 🇮🇶",
        "Asia/Beirut": "Lebanon 🇱🇧",
        "Asia/Damascus": "Syria 🇸🇾",
        "Asia/Jerusalem": "Palestine 🇵🇸",
        "Asia/Gaza": "Palestine 🇵🇸",
        "Asia/Hebron": "Palestine 🇵🇸",
        "Africa/Tripoli": "Libya 🇱🇾",
        "Africa/Tunis": "Tunisia 🇹🇳",
        "Africa/Algiers": "Algeria 🇩🇿",
        "Africa/Casablanca": "Morocco 🇲🇦",
        "Africa/Khartoum": "Sudan 🇸🇩",
        "Europe/Istanbul": "Turkey 🇹🇷",
        "Europe/London": "UK 🇬🇧",
        "Europe/Berlin": "Germany 🇩🇪",
        "America/New_York": "USA (New York)",
      };

      const locationName = ar
        ? (tzMapAr[tz] || "توقيتك المحلي")
        : (tzMapEn[tz] || "Your local time");

      setInfo({
        timeRange: ar ? `من ${startTimeStr} حتى ${endTimeStr}` : `from ${startTimeStr} to ${endTimeStr}`,
        locationName,
      });
    } catch {
      // keep fallback
    }
  }, [ar]);

  return info;
}

function SupportPage() {
  const { lang, dir } = useLang();
  const ar = lang === "ar";
  const hours = useLocalSupportHours(ar);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedDiscord, setCopiedDiscord] = useState(false);

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(WHATSAPP_COPY);
    setCopiedPhone(true);
    toast.success(ar ? "تم نسخ رقم الواتساب" : "Phone number copied");
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleCopyDiscord = () => {
    navigator.clipboard.writeText(DISCORD_INVITE);
    setCopiedDiscord(true);
    toast.success(ar ? "تم نسخ رابط الديسكورد" : "Discord link copied");
    setTimeout(() => setCopiedDiscord(false), 2000);
  };

  return (
    <StoreShell>
      <div
        className="gx-support-wrap"
        dir={dir}
        style={{
          fontFamily: "'Tajawal', 'Cairo', system-ui, sans-serif",
          minHeight: "75vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "120px 20px 80px",
          maxWidth: 960,
          margin: "0 auto",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 44, width: "100%" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 16px",
              borderRadius: 999,
              background: "rgba(0, 229, 255, 0.08)",
              border: "1px solid rgba(0, 229, 255, 0.25)",
              color: "#00e5ff",
              fontSize: 13,
              fontWeight: 800,
              marginBottom: 16,
            }}
          >
            <span>🎧</span>
            <span>{ar ? "مركز الدعم الفني" : "Help & Support"}</span>
          </div>

          <h1
            style={{
              fontSize: "clamp(26px, 4vw, 38px)",
              fontWeight: 900,
              color: "#ffffff",
              margin: "0 0 14px",
              lineHeight: 1.3,
            }}
          >
            {ar ? "تواصل معنا مباشرة" : "Contact Support Directly"}
          </h1>

          <p
            style={{
              fontSize: "clamp(14px, 2vw, 16px)",
              color: "#94a3b8",
              maxWidth: 540,
              margin: "0 auto",
              lineHeight: 1.7,
            }}
          >
            {ar
              ? "فريق الدعم الفني جاهز لمساعدتك مباشرة عبر واتساب أو سيرفر ديسكورد."
              : "Our support team is ready to assist you directly via WhatsApp or Discord."}
          </p>
        </div>

        {/* 2 Clean Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 24,
            width: "100%",
            maxWidth: 820,
          }}
        >
          {/* WhatsApp Card */}
          <div
            style={{
              background: "linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, rgba(10, 15, 22, 0.95) 100%)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              borderRadius: 24,
              padding: "36px 28px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
              transition: "transform 0.2s ease, border-color 0.2s ease",
            }}
          >
            {/* Icon */}
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: 20,
                background: "rgba(16, 185, 129, 0.15)",
                border: "1px solid rgba(16, 185, 129, 0.4)",
                color: "#25D366",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
                boxShadow: "0 0 25px rgba(37, 211, 102, 0.25)",
              }}
            >
              <WhatsAppSvg />
            </div>

            {/* Title */}
            <h2
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: "#ffffff",
                margin: "0 0 24px",
              }}
            >
              {ar ? "دعم عبر الواتس" : "WhatsApp Support"}
            </h2>

            {/* Number Box with Copy */}
            <div
              style={{
                width: "100%",
                background: "rgba(0, 0, 0, 0.45)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: 14,
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 24,
              }}
            >
              <span
                dir="ltr"
                style={{
                  fontFamily: "monospace",
                  fontSize: 16,
                  fontWeight: 800,
                  color: "#ffffff",
                  letterSpacing: "0.5px",
                }}
              >
                {WHATSAPP_DISPLAY}
              </span>
              <button
                type="button"
                onClick={handleCopyPhone}
                style={{
                  background: copiedPhone ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.08)",
                  border: copiedPhone ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid rgba(255, 255, 255, 0.15)",
                  color: copiedPhone ? "#34d399" : "#cbd5e1",
                  borderRadius: 8,
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.2s ease",
                }}
              >
                {copiedPhone ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedPhone ? (ar ? "تم" : "Done") : (ar ? "نسخ" : "Copy")}</span>
              </button>
            </div>

            {/* Main Action Button */}
            <a
              href={`https://wa.me/${WHATSAPP_RAW}?text=${encodeURIComponent(
                ar ? "مرحباً متجر GX Store، أحتاج مساعدة للدعم الفني 👋" : "Hello GX Store support team 👋"
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                width: "100%",
                padding: "14px 20px",
                borderRadius: 14,
                background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
                color: "#051c14",
                fontWeight: 900,
                fontSize: 15,
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: "0 4px 20px rgba(37, 211, 102, 0.3)",
                transition: "opacity 0.2s ease, transform 0.2s ease",
              }}
            >
              <span>{ar ? "فتح محادثة واتساب" : "Start WhatsApp Chat"}</span>
              <ExternalLink size={16} />
            </a>
          </div>

          {/* Discord Card */}
          <div
            style={{
              background: "linear-gradient(180deg, rgba(88, 101, 242, 0.08) 0%, rgba(10, 15, 22, 0.95) 100%)",
              border: "1px solid rgba(88, 101, 242, 0.3)",
              borderRadius: 24,
              padding: "36px 28px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
              transition: "transform 0.2s ease, border-color 0.2s ease",
            }}
          >
            {/* Icon */}
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: 20,
                background: "rgba(88, 101, 242, 0.15)",
                border: "1px solid rgba(88, 101, 242, 0.4)",
                color: "#5865F2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
                boxShadow: "0 0 25px rgba(88, 101, 242, 0.25)",
              }}
            >
              <DiscordSvg />
            </div>

            {/* Title */}
            <h2
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: "#ffffff",
                margin: "0 0 24px",
              }}
            >
              {ar ? "دعم عبر الديسكورد" : "Discord Support"}
            </h2>

            {/* Link Box with Copy */}
            <div
              style={{
                width: "100%",
                background: "rgba(0, 0, 0, 0.45)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: 14,
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 24,
              }}
            >
              <span
                dir="ltr"
                style={{
                  fontFamily: "monospace",
                  fontSize: 14,
                  fontWeight: 800,
                  color: "#ffffff",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {DISCORD_SHORT}
              </span>
              <button
                type="button"
                onClick={handleCopyDiscord}
                style={{
                  background: copiedDiscord ? "rgba(88, 101, 242, 0.2)" : "rgba(255, 255, 255, 0.08)",
                  border: copiedDiscord ? "1px solid rgba(88, 101, 242, 0.4)" : "1px solid rgba(255, 255, 255, 0.15)",
                  color: copiedDiscord ? "#818cf8" : "#cbd5e1",
                  borderRadius: 8,
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.2s ease",
                  flexShrink: 0,
                }}
              >
                {copiedDiscord ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedDiscord ? (ar ? "تم" : "Done") : (ar ? "نسخ" : "Copy")}</span>
              </button>
            </div>

            {/* Main Action Button */}
            <a
              href={DISCORD_INVITE}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                width: "100%",
                padding: "14px 20px",
                borderRadius: 14,
                background: "linear-gradient(135deg, #5865F2 0%, #4752c4 100%)",
                color: "#ffffff",
                fontWeight: 900,
                fontSize: 15,
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: "0 4px 20px rgba(88, 101, 242, 0.3)",
                transition: "opacity 0.2s ease, transform 0.2s ease",
              }}
            >
              <span>{ar ? "الانضمام إلى السيرفر" : "Join Discord Server"}</span>
              <ExternalLink size={16} />
            </a>
          </div>
        </div>

        {/* Footer info note with dynamic visitor timezone */}
        <div
          style={{
            marginTop: 40,
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            color: "#94a3b8",
            fontWeight: 700,
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            padding: "8px 18px",
            borderRadius: 999,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: "#10b981",
              display: "inline-block",
              boxShadow: "0 0 8px #10b981",
            }}
          />
          <span>
            {ar
              ? `الدعم الفني متاح يومياً ${hours.timeRange} (بتوقيت ${hours.locationName})`
              : `Support is available daily ${hours.timeRange} (${hours.locationName})`}
          </span>
        </div>
      </div>
    </StoreShell>
  );
}
