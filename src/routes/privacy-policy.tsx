import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { StoreShell } from "@/components/gx/StoreShell";
import { useLang } from "@/lib/gx/i18n";
import { useSiteSettings } from "@/lib/gx/site-settings";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — GX Store" },
      { name: "description", content: "How GX Store collects, uses, shares and protects your personal data, and how to request deletion of your account." },
      { property: "og:title", content: "Privacy Policy — GX Store" },
      { property: "og:description", content: "How GX Store collects, uses, shares and protects your personal data." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: STORE_HEAD_LINKS,
  }),
  component: PrivacyPolicyPage,
});

type Section = {
  id: string;
  icon: string;
  title: string;
  body?: string;
  listKind?: "covered" | "excluded" | "process";
  items?: string[];
  note?: string;
};

const AR = {
  title: "سياسة الخصوصية",
  desc: "نوضّح هنا ما هي البيانات التي نجمعها منك، وكيف نستخدمها ونحميها، وما هي حقوقك تجاهها.",
  footer: "استخدامك للمتجر أو إنشاء حساب فيه يعني موافقتك على سياسة الخصوصية هذه.",
  updated: (d: string) => `آخر تحديث: ${d}`,
  sections: (contact: string[]): Section[] => [
    {
      id: "collect", icon: "📋", title: "١. البيانات التي نجمعها",
      body: "نجمع فقط البيانات اللازمة لتنفيذ طلباتك والتواصل معك:",
      listKind: "covered",
      items: [
        "الاسم الذي تدخله عند إنشاء الحساب أو عند الطلب.",
        "البريد الإلكتروني المستخدم في تسجيل الدخول والتواصل.",
        "رقم التواصل (واتساب) إن زوّدتنا به لإتمام الطلب.",
        "بيانات الحساب الأساسية عند تسجيل الدخول بجوجل: الاسم، البريد الإلكتروني، والصورة الشخصية العامة — نحن لا نطّلع على كلمة مرور حساب جوجل الخاص بك إطلاقًا.",
        "معرّفات المنتج التي تدخلها بنفسك عند الطلب (مثل اسم المستخدم في اللعبة أو المنصة).",
        "بيانات تقنية محدودة مرتبطة بالطلب مثل عنوان IP ونوع المتصفح/الجهاز، لأغراض الأمان ومنع الاحتيال.",
      ],
    },
    {
      id: "use", icon: "🎯", title: "٢. كيف نستخدم بياناتك",
      body: "نستخدم بياناتك لأغراض تشغيلية واضحة فقط:",
      listKind: "process",
      items: [
        "تنفيذ طلبك وتسليم المنتج أو تفعيل الاشتراك.",
        "التواصل معك بخصوص حالة الطلب أو الدعم الفني.",
        "إدارة حسابك ونظام النقاط والمكافآت والبطولات.",
        "تحسين الخدمة وتجربة الاستخدام وتحليل الأداء بشكل عام.",
        "حماية المتجر من الاحتيال وإساءة الاستخدام.",
      ],
      note: "لا نستخدم بياناتك لأي إعلانات خارجية ولا نبيعها لأي جهة تحت أي ظرف.",
    },
    {
      id: "share", icon: "🤝", title: "٣. المشاركة مع أطراف ثالثة",
      body: "لا نشارك بياناتك إلا في أضيق الحدود اللازمة لتشغيل الخدمة:",
      listKind: "process",
      items: [
        "بوابات ومزوّدو الدفع: تُشارك بيانات الدفع مباشرة معهم لإتمام العملية، ونحن لا نخزّن أرقام بطاقاتك على خوادمنا.",
        "مزوّدو المنتجات وخدمات التسليم: يُشارك فقط المعرّف الضروري للتسليم (مثل اسم المستخدم أو البريد المرتبط بالمنتج).",
        "مزوّدو البنية التقنية (الاستضافة وقاعدة البيانات والمصادقة) بصفتهم معالجين للبيانات نيابةً عنّا.",
        "الجهات الرسمية عند وجود التزام قانوني يفرض ذلك.",
      ],
      note: "أي طرف ثالث يحصل على الحد الأدنى من البيانات اللازمة لأداء مهمته فقط، ولا يحق له استخدامها لأغراض أخرى.",
    },
    {
      id: "security", icon: "🔐", title: "٤. حفظ البيانات وتأمينها",
      listKind: "covered",
      items: [
        "تُنقل البيانات عبر اتصال مشفّر (HTTPS/TLS).",
        "تُخزَّن في قاعدة بيانات محمية بصلاحيات وصول صارمة على مستوى الصفوف، بحيث لا يرى أي مستخدم بيانات مستخدم آخر.",
        "الوصول الإداري محصور بعدد محدود من المخوّلين ولأغراض الدعم فقط.",
        "نحتفظ ببيانات الطلبات للمدة اللازمة للدعم والضمان والالتزامات المحاسبية، ثم تُحذف أو تُجهَّل.",
      ],
      note: "لا يوجد نظام آمن بنسبة 100%، لكننا نلتزم باتخاذ إجراءات حماية مناسبة وتحديثها باستمرار.",
    },
    {
      id: "rights", icon: "⚖️", title: "٥. حقوقك",
      body: "تملك في أي وقت الحق في:",
      listKind: "covered",
      items: [
        "الاطلاع على البيانات المحفوظة عنك.",
        "تصحيح أو تعديل بياناتك من صفحة حسابك.",
        "طلب حذف حسابك وبياناتك الشخصية بالكامل.",
        "سحب موافقتك على التواصل التسويقي إن وُجد.",
      ],
      note: "يُنفَّذ طلب الحذف خلال مدة معقولة من التحقق من هويتك، مع الاحتفاظ فقط بالحد الأدنى من سجلات الطلبات إن فرضته التزامات قانونية أو محاسبية.",
    },
    {
      id: "cookies", icon: "🍪", title: "٦. الكوكيز والتخزين المحلي",
      body: "نستخدم الكوكيز والتخزين المحلي في المتصفح لأغراض أساسية: إبقاء تسجيل الدخول فعّالًا، حفظ محتويات السلة، وتذكّر اللغة والعملة المفضلة لديك. يمكنك حذفها من إعدادات متصفحك، مع العلم أن بعض وظائف الموقع قد تتوقف عن العمل.",
    },
    {
      id: "changes", icon: "🔄", title: "٧. تحديثات السياسة",
      body: "قد نحدّث هذه السياسة من وقت لآخر بما يتوافق مع تطوّر الخدمة أو المتطلبات القانونية، ويُعتبر التاريخ الظاهر أعلاه هو تاريخ آخر تحديث ساري.",
    },
    {
      id: "contact", icon: "💬", title: "٨. التواصل بخصوص الخصوصية",
      body: "لأي استفسار أو طلب يتعلق ببياناتك (اطلاع، تعديل، حذف)، تواصل معنا عبر:",
      listKind: "process",
      items: contact.length ? contact : ["الدعم عبر واتساب من صفحة المتجر الرئيسية."],
    },
  ],
};

const EN = {
  title: "Privacy Policy",
  desc: "This page explains what data we collect from you, how we use and protect it, and what rights you have over it.",
  footer: "By using the store or creating an account, you agree to this Privacy Policy.",
  updated: (d: string) => `Last updated: ${d}`,
  sections: (contact: string[]): Section[] => [
    {
      id: "collect", icon: "📋", title: "1. Data we collect",
      body: "We only collect what we need to fulfil your orders and stay in touch:",
      listKind: "covered",
      items: [
        "The name you enter when creating an account or placing an order.",
        "The email address used for sign-in and communication.",
        "Your contact number (WhatsApp) if you provide it to complete an order.",
        "Basic account data when you sign in with Google: name, email address and public profile picture — we never see or receive your Google password.",
        "Product identifiers you enter yourself at checkout (such as your in-game or platform username).",
        "Limited technical data attached to an order, such as IP address and browser/device type, for security and fraud prevention.",
      ],
    },
    {
      id: "use", icon: "🎯", title: "2. How we use your data",
      body: "Your data is used for clear operational purposes only:",
      listKind: "process",
      items: [
        "Fulfilling your order and delivering the product or activating the subscription.",
        "Contacting you about order status or support.",
        "Managing your account, loyalty points, rewards and tournaments.",
        "Improving the service, user experience and overall performance analysis.",
        "Protecting the store from fraud and abuse.",
      ],
      note: "We do not use your data for third-party advertising and we never sell it to anyone.",
    },
    {
      id: "share", icon: "🤝", title: "3. Sharing with third parties",
      body: "We share data only to the minimum extent needed to run the service:",
      listKind: "process",
      items: [
        "Payment providers and gateways: payment details go directly to them to complete the transaction; we never store your card numbers on our servers.",
        "Product suppliers and delivery services: only the identifier required for delivery is shared (such as the username or email tied to the product).",
        "Infrastructure providers (hosting, database, authentication) acting as data processors on our behalf.",
        "Authorities, where a legal obligation requires it.",
      ],
      note: "Any third party receives only the minimum data needed for its task and may not use it for other purposes.",
    },
    {
      id: "security", icon: "🔐", title: "4. Storage and security",
      listKind: "covered",
      items: [
        "Data is transmitted over an encrypted connection (HTTPS/TLS).",
        "It is stored in a database protected by strict row-level access rules, so no user can read another user's data.",
        "Administrative access is limited to a small number of authorised people and used for support only.",
        "Order data is retained for as long as needed for support, warranty and accounting obligations, then deleted or anonymised.",
      ],
      note: "No system is 100% secure, but we commit to appropriate protection measures and keep them up to date.",
    },
    {
      id: "rights", icon: "⚖️", title: "5. Your rights",
      body: "At any time you have the right to:",
      listKind: "covered",
      items: [
        "Access the data we hold about you.",
        "Correct or update your details from your account page.",
        "Request full deletion of your account and personal data.",
        "Withdraw consent for marketing communication, where applicable.",
      ],
      note: "Deletion requests are processed within a reasonable period after we verify your identity; only the minimum order records required by legal or accounting obligations are kept.",
    },
    {
      id: "cookies", icon: "🍪", title: "6. Cookies and local storage",
      body: "We use cookies and browser local storage for essential purposes: keeping you signed in, saving your cart, and remembering your preferred language and currency. You can clear them from your browser settings, though some site features may stop working.",
    },
    {
      id: "changes", icon: "🔄", title: "7. Policy updates",
      body: "We may update this policy from time to time as the service evolves or legal requirements change. The date shown above is the last effective update.",
    },
    {
      id: "contact", icon: "💬", title: "8. Privacy contact",
      body: "For any question or request about your data (access, correction, deletion), contact us at:",
      listKind: "process",
      items: contact.length ? contact : ["Support via WhatsApp from the store home page."],
    },
  ],
};

function PrivacyPolicyPage() {
  const { lang } = useLang();
  const s = useSiteSettings();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const contact: string[] = [];
  if (hydrated) {
    if (s.support_email) contact.push(lang === "en" ? `Email: ${s.support_email}` : `البريد الإلكتروني: ${s.support_email}`);
    const wa = (s.support_whatsapp || "").replace(/\D/g, "");
    if (wa) contact.push(lang === "en" ? `WhatsApp: +${wa}` : `واتساب: ‎+${wa}`);
  }

  const copy = lang === "en" ? EN : AR;
  const sections = copy.sections(contact);
  const updated = lang === "en" ? "August 2026" : "آب / أغسطس ٢٠٢٦";

  return (
    <StoreShell>
      <section className="policy-hero">
        <div className="wrap">
          <h1>{copy.title}</h1>
          <p>{copy.desc}</p>
          <p style={{ marginTop: 8, fontSize: 12.5, opacity: 0.75 }}>{copy.updated(updated)}</p>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 24 }}>
        <div className="wrap">
          <div className="policy-doc">
            {sections.map((sec) => (
              <div key={sec.id} className="policy-section" id={sec.id}>
                <div className="ps-head">
                  <div className="ps-ic">{sec.icon}</div>
                  <h2>{sec.title}</h2>
                </div>
                {sec.body && <p>{sec.body}</p>}
                {sec.items && (
                  <ul className={`policy-list ${sec.listKind ?? ""}`}>
                    {sec.items.map((it, i) => <li key={i}>{it}</li>)}
                  </ul>
                )}
                {sec.note && <div className="policy-note">{sec.note}</div>}
              </div>
            ))}
            <div className="policy-final">{copy.footer}</div>
          </div>
        </div>
      </section>
    </StoreShell>
  );
}
