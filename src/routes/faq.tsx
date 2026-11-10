import { createFileRoute } from "@tanstack/react-router";
import { StoreShell } from "@/components/gx/StoreShell";
import { FeatureAccordion } from "@/components/gx/Primitives";
import { useLang, getHeadLang } from "@/lib/gx/i18n";
import { useCurrency } from "@/lib/gx/currency";
import { useUserCountry } from "@/lib/gx/country-phone";
import { FAQ_EN } from "@/lib/gx/product-locale";
import { useLoyaltyCopy } from "@/lib/gx/loyalty-copy";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";

export const Route = createFileRoute("/faq")({
  head: () => {
    const isEn = getHeadLang() === "en";
    return {
      meta: [
        { title: isEn ? "FAQ | GX Store" : "الأسئلة الشائعة | متجر GX Store" },
        {
          name: "description",
          content: isEn
            ? "Answers to the most common questions about ordering, delivery, and payment at GX Store."
            : "إجابات على الأسئلة الأكثر شيوعاً حول الطلب والتسليم والدفع في متجر GX Store.",
        },
      ],
      links: STORE_HEAD_LINKS,
    };
  },
  component: FaqPage,
});

const FAQ_AR = [
  // الطلب والتسليم
  { icon: "🛒", title: "كيف أطلب من المتجر؟", desc: "اختار المنتج المناسب، أضفه للسلة، وأكمل الدفع مباشرة على الموقع حسب بلدك. بيوصلك كودك الرقمي أو بيانات طلبك فوراً على صفحة الطلب وبريدك الإلكتروني." },
  { icon: "🌍", title: "هل التوصيل متاح لكل الدول؟", desc: "نعم، كل منتجاتنا رقمية فبنوصلك بأي مكان بالعالم. بعض المنتجات مرتبطة بمنطقة معيّنة (بطاقات وعملات ألعاب) فلازم تختار المنطقة الي بتناسب حسابك." },
  { icon: "⏱️", title: "كم وقت التسليم؟", desc: "يبدأ تجهيز الطلب بعد تأكيد الدفع. أغلب الطلبات الرقمية بتوصل خلال دقائق إلى ساعتين، وقد يختلف الوقت حسب نوع المنتج والتوفر والمنطقة." },
  { icon: "✅", title: "كيف أعرف أن طلبي تم تأكيده؟", desc: "بيوصلك إشعار فوري داخل حسابك وبريدك الإلكتروني، وبتلاقي الطلب في صفحة «طلباتي» مع حالته مباشرة: قيد الانتظار، قيد التنفيذ، أو تم التسليم." },
  { icon: "💳", title: "شو طرق الدفع المتاحة؟", desc: "نوفر وسائل دفع متعددة وفورية: الدفع المباشر عبر كليك (CliQ)، المحافظ الإلكترونية المعتمدة (زين كاش، أمنية، ويوالت UWallet)، بالإضافة إلى بايننس باي (Binance Pay) بعملة USDT الرقمية، كما يمكنك استخدام رصيد المتجر أو GX Coins لتغطية قيمة الطلب أو جزء منه." },
  { icon: "💰", title: "هل الأسعار الظاهرة نهائية؟", desc: "نعم، الأسعار الظاهرة نهائية وشاملة، وتظهر بعملتك المحلية أو بالدولار الأمريكي / USDT وفق سعر الصرف اللحظي دون أي رسوم خفية." },

  // الولاء: XP، المستويات، العملات، الرصيد
  { icon: "⚡", title: "شو هي نقاط XP وكيف بجمعها؟", desc: "مقابل كل {UNIT} من قيمة طلبك تكسب {XP_PER_UNIT} نقطة خبرة (XP). النقاط بترفع مستواك، وكل مستوى بيفتح لك مكافأة عملات أعلى وأفاتارات وكوبونات خاصة بالمستوى." },
  { icon: "💰", title: "شو هي GX Coins وكيف بحصل عليها؟", desc: "مقابل كل {UNIT} تدفعها فعلياً تكسب {COINS_PER_UNIT} GX Coins للمستخدمين المسجلين، وتزيد حسب نسبة مكافأة مستواك، بالإضافة إلى جوائز البطولات." },
  { icon: "🧮", title: "كيف بستخدم GX Coins؟", desc: "كل {REDEEM_COINS} عملة = خصم {REDEEM_VALUE}، والعملات بتغطي حتى {MAX_PCT} من قيمة الطلب. بتختار عدد العملات الي بدك تستخدمها عند إتمام الطلب." },
  { icon: "📅", title: "هل تنتهي صلاحية GX Coins؟", desc: "نعم، صلاحية GX Coins سنة واحدة من تاريخ الحصول عليها. أي عملات بيمر عليها سنة بدون استخدام بتنتهي صلاحيتها، فالأفضل تستفيد منها بطلباتك القادمة." },
  { icon: "🎫", title: "شو الفرق بين رصيد المتجر و GX Coins؟", desc: "رصيد المتجر هو رصيد حقيقي بعملتك (من استرجاع أو إضافة من الإدارة) وبيغطي كامل الطلب. أما GX Coins فهي عملة مكافآت بحد أقصى {MAX_PCT} من قيمة الطلب. الاثنين خاصين فيك وما بيشوفهم غيرك، بيظهروا بس داخل ملفك الشخصي." },

  // الألعاب والبطولات
  { icon: "🎮", title: "شو هي ساحة GX Arena؟", desc: "قسم الألعاب في المتجر. بتلعب ألعاب مصغّرة مثل GX Blast، بتسجل في البطولة النشطة، وبتنافس على المراكز الأولى بلوحة متصدرين محدّثة لحظياً." },
  { icon: "🏆", title: "كيف بتشتغل البطولات؟", desc: "كل بطولة إلها وقت بداية ونهاية واضحين، وأفضل نتيجة صحيحة إلك خلال هالفترة هي الي بتنحسب بالترتيب، والترتيب بيتحدث تلقائياً." },
  { icon: "🎁", title: "شو جوائز البطولات؟", desc: "الجوائز محددة لكل مركز، وممكن تكون كوبون خصم (نسبة، قيمة ثابتة، أو مخصص لمنتج معيّن)، GX Coins، XP، أو جائزة مخصصة. كل التفاصيل ظاهرة بصفحة البطولة." },

  // الدعم والسياسات
  { icon: "🆘", title: "ماذا أفعل إذا واجهت مشكلة في الطلب؟", desc: "تواصل معنا مباشرة على واتساب مع رقم الطلب أو صورة من المحادثة. نراجع المشكلة ونعطيك الحل المناسب بأسرع وقت." },
  { icon: "🛡️", title: "شو سياسة الضمان والاسترجاع؟", desc: "عندنا صفحة مستقلة توضح كل تفاصيل الضمان والاسترجاع خطوة بخطوة، بما فيها الحالات المشمولة وغير المشمولة. افتح صفحة الضمان من القائمة." },
  { icon: "🔐", title: "هل بيانات حسابي آمنة؟", desc: "بنطلب بس البيانات الضرورية لتسليم الطلب (مثل اسم المستخدم أو الإيميل) وما بنطلب كلمة السر إلا إذا كان المنتج بيتطلب ذلك. رصيدك وطلباتك ما بيشوفهم غيرك." },
];

function FaqPage() {
  const { t, lang } = useLang();
  const { currency } = useCurrency();
  const country = useUserCountry();
  const copy = useLoyaltyCopy();

  const isAr = lang !== "en";
  const isJordan = country.code === "JO" || currency === "JOD";

  const paymentDesc = isAr
    ? (isJordan
        ? "نوفر وسائل دفع متعددة وفورية: الدفع المباشر عبر كليك (CliQ)، المحافظ الإلكترونية المعتمدة (زين كاش، أمنية، ويوالت UWallet)، بالإضافة إلى بايننس باي (Binance Pay) بعملة USDT الرقمية، كما يمكنك الدفع باستخدام رصيد المتجر أو عملات المكافآت GX Coins."
        : "نوفر وسائل دفع رقمية سريعة وآمنة عالمياً: الدفع المباشر والآمن عبر بايننس باي (Binance Pay) بعملة USDT الرقمية، بالإضافة إلى إمكانية الدفع عبر رصيد المتجر (Store Credit) وعملات المكافآت GX Coins لتغطية كامل قيمة الطلب أو جزء منه.")
    : (isJordan
        ? "We offer fast and secure payment options: Instant checkout via CliQ, certified electronic wallets (Zain Cash, Umniah, UWallet), Binance Pay in digital USDT, as well as Store Credit and GX Coins."
        : "We accept fast and secure global payment methods: Instant checkout via Binance Pay in digital USDT, as well as Store Credit and GX Coins reward balance to cover all or part of your order.");

  const rawList = (lang === "en" ? FAQ_EN : FAQ_AR).map((f, idx) => {
    if (idx === 4) {
      return { ...f, desc: paymentDesc };
    }
    return f;
  });

  const faq = rawList.map((f) => ({ ...f, desc: copy.fill(f.desc) }));
  const groups = [
    { title: isAr ? "🛍️ الطلب والتسليم" : "🛍️ Ordering & delivery", items: faq.slice(0, 6) },
    { title: isAr ? "🎖️ نظام الولاء: XP و GX Coins" : "🎖️ Loyalty: XP & GX Coins", items: faq.slice(6, 11) },
    { title: isAr ? "🎮 الألعاب والبطولات" : "🎮 Games & tournaments", items: faq.slice(11, 14) },
    { title: isAr ? "🛡️ الدعم والسياسات" : "🛡️ Support & policies", items: faq.slice(14) },
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

