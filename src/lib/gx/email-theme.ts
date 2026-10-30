/**
 * GX STORE — UNIFIED EMAIL THEME & BUILDER
 * Pixel-perfect dark theme modeled after Driffle email specifications:
 * - Clean deep charcoal card surface (#141416) on dark background (#0d0d0f)
 * - Centered high-res store logo header
 * - Royal Blue primary action button (#2563eb)
 * - Muted uppercase labels (#71717a) with crisp white values (#ffffff)
 * - Big centered product cards with official high-quality covers
 * - Structured financial breakdown with green promo discount
 * - Friendly sign-off message & automated disclaimer
 * - Clean dark footer with official copyright, customer support link, and social channels
 * - Full mobile responsiveness (@media max-width: 600px)
 */

export const CDN_ASSETS_BASE = "https://cdn.jsdelivr.net/gh/tareqaa/elevate-joy-kit@main/public";
export const OFFICIAL_LOGO_URL = `${CDN_ASSETS_BASE}/app/assets/img/gx-logo.png`;

export interface EmailMetaItem {
  label: string;
  value: string;
  isLtr?: boolean;
}

export interface EmailProductItem {
  name: string;
  image?: string;
  region?: string;
  price?: string;
  qty?: number;
  credentialsHtml?: string;
}

export interface EmailBreakdownRow {
  label: string;
  value: string;
  isPromo?: boolean;
  isTotal?: boolean;
}

export interface RenderDriffleEmailOptions {
  lang: "ar" | "en";
  subject: string;
  headline: string;
  greetingText: string;
  bodyText: string;
  introDetailsText?: string;
  ctaButton?: {
    text: string;
    url: string;
  };
  meta: {
    orderIdLabel: string;
    orderIdValue: string;
    dateLabel: string;
    dateValue: string;
    emailLabel: string;
    emailValue: string;
  };
  summaryTitle: string;
  products?: EmailProductItem[];
  customSummaryHtml?: string;
  breakdown?: {
    rows: EmailBreakdownRow[];
    paidUsingLabel?: string;
    paidUsingMethod?: string;
    paidAmountLabel?: string;
    paidAmountValue?: string;
  };
  closingMessageHtml?: string;
  notesHtml?: string;
}

export function escapeHtml(str: string): string {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderDriffleEmail(opts: RenderDriffleEmailOptions): string {
  const isAr = opts.lang === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const align = isAr ? "right" : "left";
  const reverseAlign = isAr ? "left" : "right";

  const closingMessage =
    opts.closingMessageHtml ||
    (isAr
      ? `<p style="margin:0 0 12px;">نتمنى لك تجربة ممتعة! إذا كانت لديك أي استفسارات أو تحتاج إلى مساعدة، يمكنك التواصل مع فريق الدعم في أي وقت.</p><p style="margin:0 0 14px;color:#38bdf8;font-weight:700;">نحن دائماً هنا لمساعدتك!</p><p style="margin:0;font-weight:700;color:#ffffff;">مع أطيب التحيات،<br>فريق GX Store</p>`
      : `<p style="margin:0 0 12px;">We hope you enjoy your purchase, and if you have any questions, feel free to reach out to our support team anytime!</p><p style="margin:0 0 14px;color:#38bdf8;font-weight:700;">We're always here to help!</p><p style="margin:0;font-weight:700;color:#ffffff;">Happy gaming!<br>Team GX Store</p>`);

  const disclaimer = isAr
    ? "*تم إنشاء هذه الرسالة تلقائياً. يرجى عدم الرد عليها مباشرة.*"
    : "*This email has been generated automatically. Please do not reply to it.*";

  const copyrightText = isAr
    ? `جميع الحقوق محفوظة © ${new Date().getFullYear()} متجر GX Store.`
    : `Copyright © ${new Date().getFullYear()} GX Store. All rights reserved.`;

  const receivedReason = isAr
    ? "تلقيت هذه الرسالة لأنك قمت بطلب أو لديك حساب مسجل في متجر GX Store."
    : "You received this email because you are registered with GX Store.";

  const supportLinkText = isAr ? "خدمة العملاء والدعم الفني" : "Customer Support";

  // Products HTML
  let productsHtml = "";
  if (opts.customSummaryHtml) {
    productsHtml = opts.customSummaryHtml;
  } else if (opts.products && opts.products.length > 0) {
    productsHtml = opts.products
      .map((p) => {
        const imgTag = p.image
          ? `<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" width="210" style="max-width:210px;width:100%;height:auto;border-radius:12px;display:block;margin:0 auto 16px;box-shadow:0 8px 24px rgba(0,0,0,0.5);border:1px solid #27272a;" />`
          : "";

        return `
          <div style="text-align:center;margin:0 auto 24px;padding:0 8px;">
            ${imgTag}
            <div style="font-size:17px;font-weight:700;color:#ffffff;line-height:1.4;margin-bottom:6px;">
              ${escapeHtml(p.name)}
            </div>
            ${
              p.region
                ? `<div style="font-size:13px;color:#a1a1aa;margin-bottom:6px;">${escapeHtml(p.region)}</div>`
                : ""
            }
            ${
              p.price
                ? `<div style="font-size:18px;font-weight:800;color:#ffffff;margin-bottom:12px;">${escapeHtml(p.price)}</div>`
                : ""
            }
            ${p.credentialsHtml ? p.credentialsHtml : ""}
          </div>
        `;
      })
      .join("");
  }

  // Financial Breakdown HTML
  let breakdownHtml = "";
  if (opts.breakdown && opts.breakdown.rows && opts.breakdown.rows.length > 0) {
    const rowsHtml = opts.breakdown.rows
      .map((row) => {
        if (row.isTotal) {
          return `
            <tr>
              <td colspan="2" style="border-top:1px solid #27272a;padding:8px 0 0;"></td>
            </tr>
            <tr>
              <td style="color:#ffffff;font-size:15px;font-weight:800;padding:8px 0 12px;text-transform:uppercase;">${escapeHtml(row.label)}</td>
              <td align="${reverseAlign}" style="color:#ffffff;font-size:16px;font-weight:900;padding:8px 0 12px;direction:ltr;unicode-bidi:isolate;">${escapeHtml(row.value)}</td>
            </tr>
          `;
        }

        const valueColor = row.isPromo ? "#22c55e" : "#ffffff";
        const valueWeight = row.isPromo ? "700" : "600";

        return `
          <tr>
            <td style="color:#a1a1aa;font-size:13px;padding:6px 0;">${escapeHtml(row.label)}</td>
            <td align="${reverseAlign}" style="color:${valueColor};font-size:13px;font-weight:${valueWeight};padding:6px 0;direction:ltr;unicode-bidi:isolate;">${escapeHtml(row.value)}</td>
          </tr>
        `;
      })
      .join("");

    const paidUsingSection =
      opts.breakdown.paidUsingMethod && opts.breakdown.paidAmountValue
        ? `
          <tr>
            <td colspan="2" style="border-top:1px solid #27272a;padding:12px 0 0;"></td>
          </tr>
          <tr>
            <td style="color:#71717a;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">${escapeHtml(opts.breakdown.paidUsingLabel || (isAr ? "طريقة الدفع (YOU PAID USING)" : "YOU PAID USING"))}</td>
            <td align="${reverseAlign}" style="color:#71717a;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">${escapeHtml(opts.breakdown.paidAmountLabel || (isAr ? "المبلغ (AMOUNT)" : "AMOUNT"))}</td>
          </tr>
          <tr>
            <td style="color:#ffffff;font-size:13.5px;font-weight:700;padding-top:4px;">${escapeHtml(opts.breakdown.paidUsingMethod)}</td>
            <td align="${reverseAlign}" style="color:#ffffff;font-size:14px;font-weight:800;padding-top:4px;direction:ltr;unicode-bidi:isolate;">${escapeHtml(opts.breakdown.paidAmountValue)}</td>
          </tr>
        `
        : "";

    breakdownHtml = `
      <div style="border-top:1px solid #232326;margin:22px 0 18px;"></div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:16px 0 8px;">
        ${rowsHtml}
        ${paidUsingSection}
      </table>
    `;
  }

  return `<!DOCTYPE html>
<html lang="${opts.lang}" dir="${dir}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(opts.subject)}</title>
  <style>
    @media only screen and (max-width: 600px) {
      .outer-wrap { padding: 12px 8px !important; }
      .main-card { width: 100% !important; max-width: 100% !important; border-radius: 12px !important; }
      .content-area { padding: 24px 18px 20px !important; }
      .header-area { padding: 22px 18px 16px !important; }
      .footer-area { padding: 22px 18px !important; }
      .cta-btn { display: block !important; width: 100% !important; box-sizing: border-box !important; padding: 14px 16px !important; text-align: center !important; }
      .meta-col { display: block !important; width: 100% !important; margin-bottom: 12px !important; text-align: ${align} !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#0d0d0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f4f4f5;direction:${dir};text-align:${align};-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="outer-wrap" style="background-color:#0d0d0f;width:100%;padding:32px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="main-card" style="max-width:560px;width:100%;margin:0 auto;background-color:#141416;border:1px solid #232326;border-radius:16px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,0.6);">
          
          <!-- Top Header: Logo Only (Clean & Centered) -->
          <tr>
            <td class="header-area" style="padding:28px 24px 20px;text-align:center;">
              <a href="https://gxstore.me" target="_blank" style="text-decoration:none;display:inline-block;">
                <img src="${OFFICIAL_LOGO_URL}" alt="GX Store" width="125" height="auto" style="max-width:125px;height:auto;display:block;margin:0 auto;" />
              </a>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td class="content-area" style="padding:4px 28px 28px;">
              
              <!-- Headline -->
              <h1 style="margin:0 0 16px;color:#ffffff;font-size:24px;font-weight:800;line-height:1.3;letter-spacing:-0.3px;">
                ${escapeHtml(opts.headline)}
              </h1>

              <!-- Greeting -->
              <p style="margin:0 0 10px;font-size:15px;font-weight:700;color:#ffffff;line-height:1.6;">
                ${escapeHtml(opts.greetingText)}
              </p>

              <!-- Body Text -->
              <p style="margin:0 0 14px;font-size:14.5px;color:#d4d4d8;line-height:1.75;">
                ${escapeHtml(opts.bodyText)}
              </p>

              ${
                opts.introDetailsText
                  ? `<p style="margin:0 0 20px;font-size:14px;color:#a1a1aa;line-height:1.6;">${escapeHtml(opts.introDetailsText)}</p>`
                  : ""
              }

              <!-- Big Primary CTA Button (Driffle Blue) -->
              ${
                opts.ctaButton
                  ? `
              <div style="margin:20px 0 26px;text-align:center;">
                <a href="${escapeHtml(opts.ctaButton.url)}" target="_blank" class="cta-btn" style="display:inline-block;background-color:#2563eb;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:13px 30px;border-radius:8px;letter-spacing:0.3px;box-shadow:0 4px 14px rgba(37,99,235,0.35);">
                  ${escapeHtml(opts.ctaButton.text)}
                </a>
              </div>
              `
                  : ""
              }

              ${
                opts.notesHtml
                  ? `<div style="background:#18181b;border:1px solid #27272a;border-radius:10px;padding:14px 16px;margin:20px 0 24px;font-size:13px;color:#e4e4e7;line-height:1.7;">
                      ${opts.notesHtml}
                     </div>`
                  : ""
              }

              <!-- Divider -->
              <div style="border-top:1px solid #232326;margin:24px 0 20px;"></div>

              <!-- Metadata Grid (ORDER ID, ORDER DATE, EMAIL ID) -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:8px;">
                <tr>
                  <td width="50%" valign="top" class="meta-col" style="padding-bottom:14px;text-align:${align};">
                    <div style="font-size:11px;color:#71717a;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">
                      ${escapeHtml(opts.meta.orderIdLabel)}
                    </div>
                    <div style="font-size:14px;color:#ffffff;font-weight:700;direction:ltr;unicode-bidi:isolate;display:inline-block;">
                      ${escapeHtml(opts.meta.orderIdValue)}
                    </div>
                  </td>
                  <td width="50%" valign="top" class="meta-col" style="padding-bottom:14px;text-align:${reverseAlign};">
                    <div style="font-size:11px;color:#71717a;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">
                      ${escapeHtml(opts.meta.dateLabel)}
                    </div>
                    <div style="font-size:14px;color:#ffffff;font-weight:700;display:inline-block;">
                      ${escapeHtml(opts.meta.dateValue)}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" valign="top" style="padding-bottom:4px;text-align:${align};">
                    <div style="font-size:11px;color:#71717a;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">
                      ${escapeHtml(opts.meta.emailLabel)}
                    </div>
                    <div style="font-size:14px;color:#ffffff;font-weight:700;direction:ltr;unicode-bidi:isolate;display:inline-block;">
                      ${escapeHtml(opts.meta.emailValue)}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <div style="border-top:1px solid #232326;margin:18px 0 22px;"></div>

              <!-- Section Title (ORDER SUMMARY) -->
              <div style="font-size:15px;color:#ffffff;font-weight:800;letter-spacing:1px;text-transform:uppercase;text-align:center;margin:0 0 22px;">
                ${escapeHtml(opts.summaryTitle)}
              </div>

              <!-- Product Summary Cards -->
              ${productsHtml}

              <!-- Financial Breakdown -->
              ${breakdownHtml}

              <!-- Divider -->
              <div style="border-top:1px solid #232326;margin:24px 0 20px;"></div>

              <!-- Closing Friendly Support Message -->
              <div style="font-size:14px;color:#d4d4d8;line-height:1.75;margin-bottom:20px;">
                ${closingMessage}
              </div>

              <!-- Divider -->
              <div style="border-top:1px solid #232326;margin:22px 0 16px;"></div>

              <!-- Automated Disclaimer -->
              <div style="text-align:center;font-size:12px;color:#71717a;font-style:italic;line-height:1.5;">
                ${disclaimer}
              </div>

            </td>
          </tr>

          <!-- Dark Footer Box -->
          <tr>
            <td class="footer-area" style="background-color:#0c0c0e;border-top:1px solid #232326;padding:26px 20px;text-align:center;">
              <a href="https://gxstore.me" target="_blank" style="text-decoration:none;display:inline-block;margin-bottom:12px;">
                <img src="${OFFICIAL_LOGO_URL}" alt="GX Store" width="100" height="auto" style="max-width:100px;height:auto;display:block;margin:0 auto;" />
              </a>
              <p style="margin:0 0 6px;font-size:12px;color:#71717a;font-weight:500;">
                ${copyrightText}
              </p>
              <p style="margin:0 0 14px;font-size:11.5px;color:#52525b;">
                ${receivedReason}
              </p>
              <p style="margin:0 0 18px;font-size:12.5px;">
                <a href="https://gxstore.me/contact" target="_blank" style="color:#a1a1aa;text-decoration:underline;">
                  ${supportLinkText}
                </a>
              </p>
              <!-- Social Channels -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;">
                <tr>
                  <td style="padding:0 8px;">
                    <a href="https://www.instagram.com/gxstore_jo/" target="_blank" title="Instagram" style="text-decoration:none;">
                      <img src="${CDN_ASSETS_BASE}/app/assets/img/instagram-logo.png" alt="Instagram" width="22" height="22" style="display:block;opacity:0.8;" />
                    </a>
                  </td>
                  <td style="padding:0 8px;">
                    <a href="https://facebook.com" target="_blank" title="Facebook" style="text-decoration:none;">
                      <img src="${CDN_ASSETS_BASE}/app/assets/img/facebook-logo.png" alt="Facebook" width="22" height="22" style="display:block;opacity:0.8;" />
                    </a>
                  </td>
                  <td style="padding:0 8px;">
                    <a href="https://wa.me/962776252313" target="_blank" title="WhatsApp" style="text-decoration:none;">
                      <span style="display:inline-block;background-color:#25D366;color:#ffffff;border-radius:50%;width:22px;height:22px;line-height:22px;text-align:center;font-size:12px;font-weight:700;">💬</span>
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
