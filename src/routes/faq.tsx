import { createFileRoute } from "@tanstack/react-router";
import { StoreShell } from "@/components/gx/StoreShell";
import { FeatureAccordion } from "@/components/gx/Primitives";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "الأسئلة الشائعة — GX Store" },
      { name: "description", content: "أجوبة لأكثر الأسئلة تكرارًا عن الطلب، التسليم، والدفع في GX Store." },
    ],
  }),
  component: FaqPage,
});

const FAQ = [
  { icon: "🛒", title: "كيف أطلب من المتجر؟", desc: "اختار المنتج المناسب، أضفه للسلة، وبعدها اضغط «إتمام الطلب عبر واتساب». بنراجع طلبك معك ونؤكد التوفر والسعر وطريقة الدفع قبل البدء بالتنفيذ." },
  { icon: "⏱️", title: "كم وقت التسليم؟", desc: "يبدأ تجهيز الطلب بعد تأكيد الدفع. أغلب الطلبات الرقمية يتم تسليمها خلال دقائق إلى ساعتين، وقد يختلف الوقت حسب نوع المنتج، التوفر، والمنطقة." },
  { icon: "✅", title: "كيف أعرف أن طلبي تم تأكيده؟", desc: "بنرسل لك تأكيدًا عبر واتساب بعد مراجعة الطلب واستلام إثبات الدفع. احتفظ برسالة الطلب إلى أن يكتمل التسليم." },
  { icon: "💰", title: "هل الأسعار الظاهرة نهائية؟", desc: "الأسعار المعروضة محدثة قدر الإمكان، والتأكيد النهائي للسعر والتوفر يتم عبر واتساب قبل الدفع، خصوصًا للطلبات الخاصة أو المنتجات التي تختلف بحسب المنطقة." },
  { icon: "🆘", title: "ماذا أفعل إذا واجهت مشكلة في الطلب؟", desc: "تواصل معنا مباشرة على واتساب مع رقم الطلب أو صورة من المحادثة. نراجع المشكلة ونعطيك الحل المناسب بأسرع وقت." },
  { icon: "🛡️", title: "شو سياسة الضمان والاسترجاع؟", desc: "عندنا صفحة مستقلة توضح كل تفاصيل الضمان والاسترجاع خطوة بخطوة. افتح صفحة الضمان من القائمة." },
];

function FaqPage() {
  return (
    <StoreShell>
      <section className="faq-hero">
        <div className="wrap">
          <h1>الأسئلة الشائعة</h1>
          <p>كل ما تحتاج معرفته عن طريقة الطلب، وقت التسليم، وتأكيد الطلب.</p>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 20 }}>
        <div className="wrap">
          <div className="faq-accordion">
            <FeatureAccordion features={FAQ} />
          </div>
        </div>
      </section>
    </StoreShell>
  );
}
