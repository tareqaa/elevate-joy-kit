import { createFileRoute } from "@tanstack/react-router";
import { StoreShell } from "@/components/gx/StoreShell";
import { useLang } from "@/lib/gx/i18n";
import { POLICY_EN } from "@/lib/gx/product-locale";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";
import type { ReactNode } from "react";

export const Route = createFileRoute("/policy")({
  head: () => ({
    meta: [
      { title: "Warranty & Refunds — GX Store" },
      { name: "description", content: "GX Store warranty and refund policy details." },
    ],
    links: STORE_HEAD_LINKS,
  }),
  component: PolicyPage,
});

type Section = { id: string; icon: string; title: string; body?: ReactNode; listKind?: "covered" | "excluded" | "process"; items?: string[]; note?: string };

const SECTIONS_AR: Section[] = [
  { id: "duration", icon: "⏳", title: "مدة الضمان", listKind: "covered", items: [
    "الاشتراكات الرقمية: يشملها الضمان طوال مدة الاشتراك، ما لم يُذكر خلاف ذلك.",
    "باقي المنتجات (أكواد، بطاقات، عملات، خدمات): الضمان حتى يتم تسليم المنتج بنجاح.",
  ]},
  { id: "mechanism", icon: "🛠️", title: "آلية الضمان",
    body: <p>في حال واجه العميل أي مشكلة في المنتج، يرجى التواصل مع الدعم وتزويدنا بتفاصيل الطلب والمشكلة، وسيتم مراجعة الحالة والعمل على تقديم الحل المناسب.</p>,
    listKind: "covered",
    items: [
      "استلام منتج غير مطابق للطلب.",
      "وجود مشكلة في المنتج عند الاستلام.",
      "عدم عمل المنتج أو الخدمة بسبب خلل من طرفنا.",
      "توقف الاشتراك أو الخدمة بسبب مشكلة مرتبطة بالتسليم أو التفعيل من طرفنا.",
    ]},
  { id: "returns", icon: "↩️", title: "سياسة الاسترجاع",
    body: <p>جميع عمليات الدفع تعتبر نهائية بعد تنفيذ الطلب أو تسليم المنتج نظرًا لطبيعته الرقمية.</p>,
    listKind: "excluded",
    items: [
      "بعد إرسال الكود أو بيانات المنتج.",
      "بعد تفعيل الاشتراك أو استخدام المنتج.",
      "بعد بدء تنفيذ الخدمة.",
    ],
    note: "في حال وجود مشكلة مثبتة من طرفنا وعدم القدرة على توفير بديل مناسب، يتم تعويض العميل حسب حالة المنتج." },
  { id: "compensation", icon: "🔁", title: "التعويض والاستبدال",
    body: <p>في حال وجود خلل في المنتج، يتم تقديم أحد الحلول التالية حسب الحالة:</p>,
    listKind: "process",
    items: [
      "استبدال المنتج بمنتج مماثل.",
      "إعادة تنفيذ الخدمة.",
      "تعويض العميل عن المدة المتبقية من الاشتراك في حال وجود اشتراك فعال.",
    ]},
  { id: "excluded", icon: "🚫", title: "الحالات غير المشمولة بالضمان",
    body: <p>لا يشمل الضمان المشاكل الناتجة عن:</p>,
    listKind: "excluded",
    items: [
      "إدخال بيانات خاطئة من قبل العميل.",
      "اختيار منتج غير مناسب لمنطقة الحساب أو المنصة.",
      "مشاكل الإنترنت أو الجهاز المستخدم.",
      "استخدام المنتج أو تفعيله بنجاح.",
      "أي تغييرات أو قيود تفرضها الشركات المالكة للخدمات أو الألعاب.",
      "مخالفة شروط استخدام الخدمة الخاصة بالشركة المقدمة للمنتج.",
    ]},
  { id: "activated", icon: "🔓", title: "المنتجات المفعلة", body: <p>بعد تفعيل الاشتراك أو استخدام المنتج بنجاح، لا يمكن استبداله أو استرجاع قيمته.</p> },
  { id: "delay", icon: "⏰", title: "التأخير في التسليم", body: <p>نسعى لتسليم جميع الطلبات بأسرع وقت ممكن. في حال حدوث تأخير من طرفنا، يحق للعميل طلب حل مناسب.</p> },
  { id: "support", icon: "💬", title: "الدعم", body: <p>نحن متواجدون لمساعدة العملاء وحل أي مشكلة تتعلق بالطلبات على مدار الساعة عبر واتساب.</p> },
];

function PolicyPage() {
  const { t, lang } = useLang();
  const sections: Section[] = lang === "en"
    ? POLICY_EN.map((s) => ({ ...s, body: s.body ? <p>{s.body}</p> : undefined }))
    : SECTIONS_AR;

  return (
    <StoreShell>
      <section className="policy-hero">
        <div className="wrap">
          <h1>{t("policy.title")}</h1>
          <p>{t("policy.desc")}</p>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 24 }}>
        <div className="wrap">
          <div className="policy-doc">
            {sections.map(s => (
              <div key={s.id} className="policy-section" id={s.id}>
                <div className="ps-head">
                  <div className="ps-ic">{s.icon}</div>
                  <h2>{s.title}</h2>
                </div>
                {s.body}
                {s.items && (
                  <ul className={`policy-list ${s.listKind ?? ""}`}>
                    {s.items.map((it, i) => <li key={i}>{it}</li>)}
                  </ul>
                )}
                {s.note && <div className="policy-note">{s.note}</div>}
              </div>
            ))}
            <div className="policy-final">{t("policy.footer")}</div>
          </div>
        </div>
      </section>
    </StoreShell>
  );
}
