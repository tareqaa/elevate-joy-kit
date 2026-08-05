import { createFileRoute } from "@tanstack/react-router";
import { StoreShell } from "@/components/gx/StoreShell";
import { FeatureAccordion } from "@/components/gx/Primitives";
import { useLang } from "@/lib/gx/i18n";
import { FAQ_EN } from "@/lib/gx/product-locale";
import { useLoyaltyCopy } from "@/lib/gx/loyalty-copy";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — GX Store" },
      { name: "description", content: "Answers to the most common questions about ordering, delivery, and payment at GX Store." },
    ],
    links: STORE_HEAD_LINKS,
  }),
  component: FaqPage,
});

const FAQ_AR = [
  // الطلب والتسليم
  { icon: "🛒", title: "كيف أطلب من المتجر؟", desc: "اختار المنتج المناسب، أضفه للسلة، وبعدها اضغط «إتمام الطلب عبر واتساب». بنراجع طلبك معك ونؤكد التوفر والسعر وطريقة الدفع قبل البدء بالتنفيذ." },
  { icon: "🌍", title: "هل التوصيل متاح لكل الدول؟", desc: "نعم، كل منتجاتنا رقمية فبنوصلك بأي مكان بالعالم. بعض المنتجات مرتبطة بمنطقة معيّنة (بطاقات وعملات ألعاب) فلازم تختار المنطقة الي بتناسب حسابك." },
  { icon: "⏱️", title: "كم وقت التسليم؟", desc: "يبدأ تجهيز الطلب بعد تأكيد الدفع. أغلب الطلبات الرقمية بتوصل خلال دقائق إلى ساعتين، وقد يختلف الوقت حسب نوع المنتج والتوفر والمنطقة." },
  { icon: "✅", title: "كيف أعرف أن طلبي تم تأكيده؟", desc: "بنرسل لك تأكيد عبر واتساب، وبيوصلك إشعار داخل حسابك، وبتلاقي الطلب في صفحة «طلباتي» مع حالته: قيد الانتظار، قيد التنفيذ، تم التسليم." },
  { icon: "💳", title: "شو طرق الدفع المتاحة؟", desc: "بنتفق على طريقة الدفع عبر واتساب (حوالات محلية، محافظ إلكترونية، وطرق أخرى متاحة). كمان بتقدر تدفع جزء من الطلب برصيد المتجر أو GX Coins." },
  { icon: "💰", title: "هل الأسعار الظاهرة نهائية؟", desc: "الأسعار بتظهر بعملتك المحلية حسب سعر الصرف المباشر وبتتحدث باستمرار، والتأكيد النهائي للسعر والتوفر بيتم عبر واتساب قبل الدفع." },

  // الولاء: XP، المستويات، العملات، الرصيد
  { icon: "⚡", title: "شو هي نقاط XP وكيف بجمعها؟", desc: "مقابل كل {UNIT} من قيمة طلبك تكسب {XP_PER_UNIT} نقطة خبرة (XP). النقاط بترفع مستواك، وكل مستوى بيفتح لك مكافأة عملات أعلى وأفاتارات وكوبونات خاصة بالمستوى." },
  { icon: "💰", title: "شو هي GX Coins وكيف بحصل عليها؟", desc: "مقابل كل {UNIT} تدفعها فعلياً تكسب {COINS_PER_UNIT} GX Coins، وتزيد حسب نسبة مكافأة مستواك. كمان بتحصل على عملات من عجلة الحظ ومن جوائز البطولات." },
  { icon: "🧮", title: "كيف بستخدم GX Coins؟", desc: "كل {REDEEM_COINS} عملة = خصم {REDEEM_VALUE}، والعملات بتغطي حتى {MAX_PCT} من قيمة الطلب. بتختار عدد العملات الي بدك تستخدمها عند إتمام الطلب." },
  { icon: "📅", title: "هل تنتهي صلاحية GX Coins؟", desc: "نعم، صلاحية GX Coins سنة واحدة من تاريخ الحصول عليها. أي عملات بيمر عليها سنة بدون استخدام بتنتهي صلاحيتها، فالأفضل تستفيد منها بطلباتك القادمة." },
  { icon: "🎫", title: "شو الفرق بين رصيد المتجر و GX Coins؟", desc: "رصيد المتجر هو رصيد حقيقي بعملتك (من استرجاع أو إضافة من الإدارة) وبيغطي كامل الطلب. أما GX Coins فهي عملة مكافآت بحد أقصى {MAX_PCT} من قيمة الطلب. الاثنين خاصين فيك وما بيشوفهم غيرك، بيظهروا بس داخل ملفك الشخصي." },

  // الألعاب والبطولات
  { icon: "🎮", title: "شو هي ساحة GX Arena؟", desc: "قسم الألعاب في المتجر. بتلعب ألعاب مصغّرة مثل GX Blast، بتسجل في البطولة النشطة، وبتنافس على المراكز الأولى بلوحة متصدرين محدّثة لحظياً." },
  { icon: "🏆", title: "كيف بتشتغل البطولات؟", desc: "كل بطولة إلها وقت بداية ونهاية واضحين، وأفضل نتيجة صحيحة إلك خلال هالفترة هي الي بتنحسب بالترتيب، والترتيب بيتحدث تلقائياً." },
  { icon: "🎁", title: "شو جوائز البطولات؟", desc: "الجوائز محددة لكل مركز، وممكن تكون كوبون خصم (نسبة، قيمة ثابتة، أو مخصص لمنتج معيّن)، GX Coins، XP، أو جائزة مخصصة. كل التفاصيل ظاهرة بصفحة البطولة." },
  { icon: "🎡", title: "شو هي عجلة الحظ؟", desc: "لفة يومية مجانية ممكن تربح فيها XP أو GX Coins أو كوبون خصم أو بوست مضاعفة مؤقتة للمكافآت. وفي لفات إضافية ممكن يمنحها فريق المتجر." },

  // الدعم والسياسات
  { icon: "🆘", title: "ماذا أفعل إذا واجهت مشكلة في الطلب؟", desc: "تواصل معنا مباشرة على واتساب مع رقم الطلب أو صورة من المحادثة. نراجع المشكلة ونعطيك الحل المناسب بأسرع وقت." },
  { icon: "🛡️", title: "شو سياسة الضمان والاسترجاع؟", desc: "عندنا صفحة مستقلة توضح كل تفاصيل الضمان والاسترجاع خطوة بخطوة، بما فيها الحالات المشمولة وغير المشمولة. افتح صفحة الضمان من القائمة." },
  { icon: "🔐", title: "هل بيانات حسابي آمنة؟", desc: "بنطلب بس البيانات الضرورية لتسليم الطلب (مثل اسم المستخدم أو الإيميل) وما بنطلب كلمة السر إلا إذا كان المنتج بيتطلب ذلك. رصيدك وطلباتك ما بيشوفهم غيرك." },
];

function FaqPage() {
  const { t, lang } = useLang();
  const copy = useLoyaltyCopy();
  const faq = (lang === "en" ? FAQ_EN : FAQ_AR).map((f) => ({ ...f, desc: copy.fill(f.desc) }));
  const isAr = lang !== "en";
  const groups = [
    { title: isAr ? "🛍️ الطلب والتسليم" : "🛍️ Ordering & delivery", items: faq.slice(0, 6) },
    { title: isAr ? "🎖️ نظام الولاء: XP و GX Coins" : "🎖️ Loyalty: XP & GX Coins", items: faq.slice(6, 11) },
    { title: isAr ? "🎮 الألعاب والبطولات" : "🎮 Games & tournaments", items: faq.slice(11, 15) },
    { title: isAr ? "🛡️ الدعم والسياسات" : "🛡️ Support & policies", items: faq.slice(15) },
  ];
  return (
    <StoreShell>
      <section className="faq-hero">
        <div className="wrap">
          <h1>{t("faq.title")}</h1>
          <p>{t("faq.desc")}</p>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 20 }}>
        <div className="wrap">
          {groups.map((g) => (
            <div key={g.title} style={{ marginBottom: 26 }}>
              <h2 style={{ fontSize: 17, fontWeight: 900, marginBottom: 12 }}>{g.title}</h2>
              <div className="faq-accordion">
                <FeatureAccordion features={g.items} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </StoreShell>
  );
}

