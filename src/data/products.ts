/* ============================================================
   GX STORE — PRODUCT CATALOG (typed, single source of truth)
   Ported from public/app/assets/js/products-data.js
   All prices are in JOD (base currency).
   ============================================================ */

export type Plan = {
  id: string;
  label: string;
  price: number;
  oldPrice?: number;
  tag?: string | null;
  imageUrl?: string;
};

export type Feature = { icon: string; title: string; desc: string };

export type Product = {
  slug: string;
  name: string;
  nameAr?: string;
  taglineAr?: string;
  categoryAr?: string;
  variants?: Plan[];
  icon: string;
  iconImg?: string;
  imageUrl?: string;
  thumbBg: string;
  category: string;
  tagline: string;
  description: string;
  identifierLabel?: string;
  identifierPlaceholder?: string;
  deliveryMethod?: string;
  plans?: Plan[];
  features?: Feature[];
  // Fortnite-only:
  crewPlans?: Plan[];
  vbucksPlans?: Plan[];
  delivery?: {
    intro: string;
    requirements: string[];
    safety: string[];
    platformNotes: string[];
  };
};

export const PRODUCTS_CATALOG: Record<string, Product> = {
  tod: {
    slug: "tod",
    name: "اشتراكات TOD by beIN",
    nameAr: "TOD by beIN | اشتراكات تود الرسمية (كود تفعيل)",
    categoryAr: "اشتراكات المشاهدة",
    icon: "📺",
    iconImg: "/app/assets/img/catalog/tod-icon.webp",
    imageUrl: "/app/assets/img/catalog/tod_total_one_year.webp",
    thumbBg: "linear-gradient(145deg, #2b1154, #120626)",
    category: "اشتراكات المشاهدة",
    tagline: "أكواد تفعيل رقمية رسمية على حسابك الشخصي لمشاهدة أقوى الدوريات والبطولات والترفيه بضمان كامل المدة",
    description:
      "اشتراكات منصة TOD الرسمية التابعة لمجموعة beIN الإعلامية لمتابعة أقوى البطولات والدوريات العالمية (دوري أبطال أوروبا، الدوري الإنجليزي الممتاز، الدوري الإسباني، وغيرها) بالإضافة إلى مكتبة ضخمة من الأفلام والمسلسلات والإنتاجات الحصرية.\n\nجميع الاشتراكات عبارة عن أكواد وقسائم رقمية أصلية ورسمية 100% يتم تفعيلها مباشرة على حسابك الشخصي في TOD مع ضمان كامل وشامل طوال فترة الاشتراك.\n\nالفرق بين باقات TOD الرسمية:\n• باقة TOD Mobile: مخصصة للمشاهدة على الهواتف الذكية والأجهزة اللوحية (شاشة واحدة - دقة SD/HD) ولا تدعم البث على التلفزيون.\n• باقة TOD Total / TV: الباقة الشاملة الأكثر طلباً، تدعم المشاهدة على الشاشات الذكية (Smart TV)، الكمبيوتر، والهواتف (شاشتان في نفس الوقت - دقة Full HD 1080p).\n• باقة TOD 4K: أعلى فئة لعشاق السينما والرياضة بدقة 4K Ultra HD فائقة الوضوح وصوت محيطي Dolby Atmos على الشاشات المتوافقة مع جهازين بالتزامن.",
    identifierLabel: "كود تفعيل رقمي فوري",
    identifierPlaceholder: "يصلك كود التفعيل الرقمي فور إتمام الطلب",
    deliveryMethod:
      "كود تفعيل رقمي رسمي 100% يوصلك فوراً لتفعيله مباشرة على حسابك الشخصي في منصة TOD عبر موقع tod.tv بدون الحاجة لكلمة المرور.",
    plans: [
      { id: "tod-total-1d", label: "TOD Total — يوم واحد (One Day)", price: 1.3, oldPrice: 2.0, tag: "يوم واحد", imageUrl: "/app/assets/img/catalog/one_day.webp" },
      { id: "tod-total-1w", label: "TOD Total — أسبوع واحد (One Week)", price: 1.95, oldPrice: 3.0, tag: "أسبوع واحد", imageUrl: "/app/assets/img/catalog/one_week_2.webp" },
      { id: "tod-mobile-1m", label: "TOD Mobile — شهر واحد (One Month)", price: 3.5, oldPrice: 5.0, tag: "موبايل • شهر", imageUrl: "/app/assets/img/catalog/1-01.webp" },
      { id: "tod-total-1m", label: "TOD Total — شهر واحد (One Month)", price: 6.0, oldPrice: 8.5, tag: "الأكثر طلباً", imageUrl: "/app/assets/img/catalog/1-03.webp" },
      { id: "tod-4k-1m", label: "TOD 4K Ultra HD — شهر واحد (One Month)", price: 7.6, oldPrice: 11.0, tag: "4K فائقة", imageUrl: "/app/assets/img/catalog/1-02.webp" },
      { id: "tod-mobile-6m", label: "TOD Mobile — 6 أشهر (6 Months)", price: 17.0, oldPrice: 24.0, tag: "توفير نصف سنوي", imageUrl: "/app/assets/img/catalog/tod_mobile_6_months_1.webp" },
      { id: "tod-tv-6m", label: "TOD TV (Total) — 6 أشهر (6 Months)", price: 31.0, oldPrice: 42.0, tag: "شاشات Smart TV", imageUrl: "/app/assets/img/catalog/total_6_months.webp" },
      { id: "tod-mobile-1y", label: "TOD Mobile — سنة كاملة (One Year)", price: 35.0, oldPrice: 50.0, tag: "سنة كاملة", imageUrl: "/app/assets/img/catalog/tod_mobile_-one_year.webp" },
      { id: "tod-tv-1y", label: "TOD TV (Total) — سنة كاملة (One Year)", price: 60.0, oldPrice: 85.0, tag: "الأفضل قيمة", imageUrl: "/app/assets/img/catalog/tod_total_one_year.webp" },
      { id: "tod-4k-1y", label: "TOD 4K Ultra HD — سنة كاملة (One Year)", price: 80.0, oldPrice: 110.0, tag: "الباقة الملكية 4K", imageUrl: "/app/assets/img/catalog/4k_.png" },
    ],
    features: [
      { icon: "⚽", title: "دوريات وبطولات beIN الحصرية", desc: "بث مباشر عالي الوضوح لأقوى البطولات: دوري أبطال أوروبا، الدوري الإنجليزي الممتاز، الدوري الإسباني، وغيرها." },
      { icon: "🎬", title: "مكتبة ترفيهية ضخمة وحصرية", desc: "آلاف الساعات من أحدث الأفلام والمسلسلات الحصرية العربية والتركية والعالمية، وبرامج الأطفال." },
      { icon: "📺", title: "شاشات وأجهزة متعددة (Mobile / TV / 4K)", desc: "خيارات متعددة: باقة Mobile للهواتف، باقة Total / TV للشاشات الذكية (جهازين معاً)، وباقة 4K لأعلى وضوح سينمائي." },
      { icon: "⚡", title: "كود تفعيل رسمي فوري على حسابك", desc: "كود رقمي أصلي ورسمي 100% تفعله بنفسك على حسابك الشخصي عبر موقع tod.tv بدون طلب باسورد." },
      { icon: "🛡️", title: "ضمان كامل مدة الاشتراك", desc: "ضمان حقيقي وشامل طوال فترة الاشتراك بالكامل مع دعم فني متواصل من فريق متجر GX Store." },
    ],
  },
  snapchat: {
    slug: "snapchat",
    name: "سناب بلس",
    icon: "👻",
    iconImg: "/app/assets/img/snapchat-logo.png",
    imageUrl: "/app/assets/img/snapchat-logo.png",
    thumbBg: "#FFFC00",
    category: "اشتراك سناب بلس",
    tagline: "فعّل سناب بلس بأسهل وأسرع طريقة",
    description:
      "اختار المدة المناسبة إلك، حدد عدد الحسابات، وحط يوزر كل حساب — تفعيل رسمي 100% عن طريق خاصية الإهداء داخل سناب شات.",
    identifierLabel: "يوزر السناب شات",
    identifierPlaceholder: "مثال: yazan.q",
    deliveryMethod:
      'منشحنلك الاشتراك مباشرة عن طريق خاصية "إهداء الاشتراك" الرسمية داخل سناب شات — باستخدام يوزرك فقط، من غير ما نطلب باسورد أو نسجل دخول على حسابك.',
    plans: [
      { id: "snap-3", label: "3 أشهر", price: 4, oldPrice: 7, tag: null },
      { id: "snap-6", label: "6 أشهر", price: 7.5, oldPrice: 14, tag: "الأكثر طلبًا" },
      { id: "snap-12", label: "12 شهر", price: 15, oldPrice: 26, tag: null },
    ],
    features: [
      { icon: "⭐", title: "أيقونة حصرية للتطبيق", desc: "بدّل شكل أيقونة سناب شات على شاشتك الرئيسية باختيارك من تصاميم حصرية مو متوفرة للمستخدم العادي." },
      { icon: "🎨", title: "ألوان دردشة مخصصة", desc: "غيّر لون فقاعات الشات الخاصة فيك، وخلي صاحبك يميزك بلونك المختار بكل محادثة." },
      { icon: "👑", title: "أفضل صديق مثبّت", desc: "ثبّت شخص وحدة فوق قائمة الأصدقاء تبعك بشكل دائم، مهما تغيرت الخوارزمية أو نشاطكم." },
      { icon: "🔁", title: "مشاهدة القصة مرة ثانية", desc: "اعرف بالضبط مين رجع يتفرج على الستوري تبعك وكم مرة شافها كل شخص." },
      { icon: "👀", title: "لمحة سريعة", desc: "شوف إذا صاحبك بلّش يقرا رسالتك أو دخل نص الشات قبل ما يوصلك الرد منه." },
      { icon: "☁️", title: "250 جيجا تخزين سحابي", desc: "احفظ كل ذكرياتك وسناباتك القديمة بمساحة تخزين ضخمة تكفيك لفترة طويلة." },
    ],
  },
  adobe: {
    slug: "adobe",
    name: "Adobe Creative Cloud",
    icon: "🎨",
    iconImg: "/app/assets/img/adobe-cc.webp",
    imageUrl: "/app/assets/img/adobe-cc.webp",
    thumbBg: "#12151e",
    category: "البرامج والتطبيقات",
    tagline: "الحزمة الكاملة لكل تطبيقات أدوبي — كود تفعيل رقمي رسمي",
    description:
      "الحزمة الإبداعية الاحترافية الكاملة من شركة أدوبي، وتضم أكثر من 20 برنامجاً وتطبيقاً رائداً في مجالات التصميم الجرافيكي والمونتاج وتحرير الفيديو ومعالجة الصور، مثل فوتوشوب وإليستريتور وبريمير برو، مع مساحة تخزين سحابية ومكتبة خطوط ضخمة.\n\nالمواصفات والشروط الهامة:\n• كود رقمي أصلي ورسمي 100% لاشتراك شهر واحد (كود تفعيل وليس حساباً جاهزاً).\n• يتم تفعيل الكود مباشرة على حسابك الشخصي في أدوبي عبر: redeem.adobe.com\n• وصول كامل إلى كافة برامج وتطبيقات أدوبي وتحديثاتها الرسمية.\n• مساحة تخزين سحابية لحفظ المشاريع ومزامنتها بين الأجهزة.\n• تفعيل رسمي ومباشر ومضمون طوال فترة الاشتراك.",
    identifierLabel: "إيميل Adobe ID",
    identifierPlaceholder: "example@email.com",
    deliveryMethod: "كود رقمي أصلي ورسمي 100% يوصلك فوراً لتفعيله مباشرة على حسابك الشخصي في أدوبي عبر redeem.adobe.com — كود تفعيل وليس حساباً جاهزاً.",
    plans: [
      { id: "adobe-1", label: "شهر واحد (كود رقمي أصلي)", price: 13, oldPrice: 18, tag: "كود رسمي" },
    ],
    features: [
      { icon: "🖌️", title: "كافة تطبيقات أدوبي", desc: "فوتوشوب، إليستريتور، بريمير برو، إنديزاين وأكثر من 20 تطبيقاً باشتراك واحد." },
      { icon: "☁️", title: "تخزين سحابي ومزامنة", desc: "حفظ المشاريع والملفات بأمان والوصول إليها من مختلف أجهزتك بسهولة." },
      { icon: "🔤", title: "مكتبة خطوط متكاملة", desc: "آلاف الخطوط الاحترافية الجاهزة للاستخدام في كافة تصميماتك." },
      { icon: "🖥️", title: "دعم العمل المتعدد", desc: "إمكانية تشغيل واستخدام التطبيقات على الكمبيوتر والأجهزة المحمولة." },
    ],
  },
  canva: {
    slug: "canva",
    name: "Canva Edu Pro",
    icon: "🎨",
    iconImg: "/app/assets/img/canva-logo.png",
    imageUrl: "/app/assets/img/canva-logo.png",
    thumbBg: "#12151e",
    category: "البرامج والتطبيقات",
    tagline: "كانفا إديو برو — اشتراك رسمي سنوي بدعوة فريق",
    description:
      "اشتراك كانفا إديو برو (Canva Edu Pro) الرسمي لمدة 12 شهراً (سنة كاملة). يتم تفعيل الاشتراك عبر إرسال رابط دعوة رسمي للانضمام إلى فريق عمل (Team) مفعل عليه اشتراك Canva Pro بكافة ميزاته الاحترافية على حسابك الشخصي مباشرة.\n\nالمواصفات وطريقة التفعيل:\n• نوع الاشتراك: Canva Edu Pro بكامل ميزات وأدوات كانفا برو.\n• مدة الاشتراك: 12 شهراً (سنة كاملة) مع ضمان كامل طوال فترة الاشتراك.\n• طريقة التسليم: رابط تفعيل / دعوة انضمام رسمية لفريق عمل تُرسل إلى بريدك الإلكتروني المسجل في كانفا.\n• تفعيل رسمي وآمن ومضمون 100% على حسابك الشخصي.\n• يشمل الوصول غير المحدود لمكتبة القوالب، الخطوط، ميزات الذكاء الاصطناعي، وممحاة الخلفية السحرية.",
    identifierLabel: "إيميل حساب Canva",
    identifierPlaceholder: "example@email.com",
    deliveryMethod: "رابط دعوة تفعيل رسمي يوصلك فوراً على إيميلك للانضمام إلى فريق Canva Edu Pro وتفعيل جميع ميزات البرو لمدة 12 شهر مباشرة.",
    plans: [
      { id: "canva-12", label: "12 شهر (سنة كاملة)", price: 2, oldPrice: 5, tag: "الأكثر طلبًا" },
    ],
    features: [
      { icon: "✨", title: "اشتراك Canva Edu Pro", desc: "دعوة رسمية لفريق مفعل عليه اشتراك كانفا برو بكافة ميزاته الاحترافية لمدة 12 شهر." },
      { icon: "🪄", title: "إزالة الخلفية السحرية", desc: "أداة Background Remover وممحاة العناصر بالذكاء الاصطناعي بضغطة زر واحدة." },
      { icon: "🔤", title: "آلاف الخطوط وألوان العلامة", desc: "تحميل خطوطك الخاصة وحفظ هوية علامتك التجارية مع Brand Kit كامل." },
      { icon: "☁️", title: "1 تيرا تخزين سحابي", desc: "مساحة سحابية ضخمة لحفظ وتنظيم كل مشاريعك ومشاركتها مع فريقك بسهولة." },
      { icon: "📐", title: "تغيير الحجم السحري Magic Resize", desc: "تحويل التصميم بضغطة واحدة ليناسب إنستغرام، تيك توك، يوتيوب، وباقي المنصات فوراً." },
    ],
  },
  "linkedin-career-3m": {
    slug: "linkedin-career-3m",
    name: "LinkedIn Career (3 أشهر)",
    nameAr: "لينكدإن كرير | اشتراك 3 أشهر رابط تفعيل (حصرياً للحسابات التي لم تشترك مسبقاً)",
    icon: "💼",
    iconImg: "/app/assets/img/linkedin-logo.svg",
    imageUrl: "/app/assets/img/linkedin-logo.svg",
    thumbBg: "linear-gradient(145deg,#001f3f,#004182)",
    category: "البرامج والتطبيقات",
    tagline: "اشتراك لينكدإن كرير 3 أشهر رسمي — حصرياً للحسابات التي لم يسبق لها تفعيل بريميوم نهائياً",
    description:
      "اشتراك لينكدإن كرير (LinkedIn Premium Career) الرسمي لمدة 3 أشهر كاملة لتطوير مسارك المهني والوصول لأفضل الفرص الوظيفية. يتيح لك إرسال 5 رسائل InMail شهرياً للتواصل مع مسؤولي التوظيف مباشرة، معرفة من زار ملفك الشخصي خلال آخر 90 يوماً، مقارنة ملفك بالمتقدمين الآخرين على أي وظيفة، والوصول غير المحدود لمكتبة دورات LinkedIn Learning مع شهادات معتمدة.",
    identifierLabel: "إيميل حساب LinkedIn",
    identifierPlaceholder: "example@email.com",
    deliveryMethod: "رابط تفعيل رسمي ومباشر (Activation Link) يصلك فور إتمام الدفع مع خطوات تفعيل بسيطة وآمنة.",
    plans: [
      { id: "linkedin-career-3m", label: "3 أشهر رابط تفعيل (حسابات جديدة فقط)", price: 9, oldPrice: 25, tag: "رابط تفعيل" },
    ],
    features: [
      { icon: "📩", title: "5 رسائل InMail شهرياً", desc: "تواصل مباشر مع مسؤولي التوظيف والشركات حتى خارج شبكتك." },
      { icon: "👀", title: "من زار ملفك الشخصي", desc: "اطّلع على القائمة الكاملة لجميع من زار حسابك خلال 90 يوماً." },
      { icon: "📊", title: "رؤى الوظائف والمتقدمين", desc: "قارن مؤهلاتك وخبراتك مع المتقدمين للوظائف وتصدر القوائم." },
      { icon: "🎓", title: "LinkedIn Learning", desc: "وصول غير محدود لآلاف الدورات التخصصية بشهادات معتمدة." },
    ],
  },
  "linkedin-career-12m": {
    slug: "linkedin-career-12m",
    name: "LinkedIn Career (12 شهر)",
    nameAr: "لينكدإن كرير | اشتراك سنة كاملة (شحن مباشر على الحساب)",
    icon: "💼",
    iconImg: "/app/assets/img/linkedin-logo.svg",
    imageUrl: "/app/assets/img/linkedin-logo.svg",
    thumbBg: "linear-gradient(145deg,#001f3f,#003366)",
    category: "البرامج والتطبيقات",
    tagline: "اشتراك لينكدإن كرير سنة كاملة 12 شهر — شحن وتفعيل مباشر على حسابك الشخصي",
    description:
      "اشتراك لينكدإن كرير (LinkedIn Premium Career) السنوي الرسمي لمدة 12 شهراً متواصلة. يتم تفعيله وشحنه مباشرة على حسابك الشخصي دون الحاجة لبطاقة دفع بنكية. يمنحك كل مميزات كرير طوال عام كامل: 5 رسائل InMail شهرياً، معرفة زوار البروفايل بالكامل، رؤى التوظيف التنافسية، ووصول غير محدود لـ LinkedIn Learning. يعمل على جميع الحسابات حتى لو سبق لها الاشتراك.",
    identifierLabel: "رقم الواتساب للتواصل والتفعيل",
    identifierPlaceholder: "ضع رقم الواتس اب الخاص بك لسهولة التواصل والتفعيل (مثال: 0791234567)",
    deliveryMethod: "شحن وتفعيل رسمي ومباشر على حسابك الشخصي عبر فريق الدعم الفني دون الحاجة لأي بطاقات دفع.",
    plans: [
      { id: "linkedin-career-12m", label: "12 شهر (سنة كاملة)", price: 32, oldPrice: 60, tag: "توفير سنوي" },
    ],
    features: [
      { icon: "⚡", title: "شحن مباشر على الحساب", desc: "تفعيل رسمي وآمن دون الحاجة لربط أي وسيلة دفع خاصة بك." },
      { icon: "📩", title: "InMail Messages", desc: "5 رسائل InMail شهرياً لمراسلة صناع القرار مباشرة." },
      { icon: "🎓", title: "LinkedIn Learning", desc: "مكتبة تعليمية ضخمة بشهادات احترافية تضاف لملفك." },
      { icon: "🛡️", title: "ضمان 12 شهراً", desc: "ضمان حقيقي ومستمر طوال فترة الاشتراك السنوي." },
    ],
  },
  "linkedin-business-12m": {
    slug: "linkedin-business-12m",
    name: "LinkedIn Business (12 شهر)",
    nameAr: "لينكدإن بزنس | اشتراك سنة كاملة (شحن مباشر على الحساب)",
    icon: "💼",
    iconImg: "/app/assets/img/linkedin-logo.svg",
    imageUrl: "/app/assets/img/linkedin-logo.svg",
    thumbBg: "linear-gradient(145deg,#001224,#002b54)",
    category: "البرامج والتطبيقات",
    tagline: "اشتراك لينكدإن بزنس سنة كاملة 12 شهر — شحن مباشر لأعلى باقة أعمال ومبيعات",
    description:
      "اشتراك لينكدإن بزنس (LinkedIn Premium Business) السنوي الرسمي لمدة 12 شهراً كاملة. الباقة الاحترافية الأقوى لرواد الأعمال، مسؤولي المبيعات، والشركات. يمنحك 15 رسالة InMail شهرياً، تصفح غير محدود لشبكة لينكدإن وملفات المستخدمين حتى الدرجة الثالثة (Unlimited People Browsing)، رؤى وتحليلات نمو الشركات وأداء الموظفين، ووصول كامل لـ LinkedIn Learning. يعمل على جميع الحسابات.",
    identifierLabel: "رقم الواتساب للتواصل والتفعيل",
    identifierPlaceholder: "ضع رقم الواتس اب الخاص بك لسهولة التواصل والتفعيل (مثال: 0791234567)",
    deliveryMethod: "شحن مباشر وسريع لباقة الأعمال الرسمية على حسابك الشخصي من قبل فريق العمل.",
    plans: [
      { id: "linkedin-business-12m", label: "12 شهر (سنة كاملة)", price: 60, oldPrice: 120, tag: "باقة الأعمال" },
    ],
    features: [
      { icon: "👑", title: "أقوى باقة أعمال", desc: "ميزات المبيعات والنمو للشركات والتنفيذيين ورواد الأعمال." },
      { icon: "📩", title: "15 InMail شهرياً", desc: "تواصل موسع وغير محدود مع الشخصيات الهامة والتنفيذيين." },
      { icon: "🔍", title: "تصفح غير محدود", desc: "استعراض كامل لملفات شبكة لينكدإن حتى الدرجة الثالثة دون قيود." },
      { icon: "📊", title: "تحليلات الشركات", desc: "رؤى تفصيلية لنمو الشركات وتوزيع الموظفين في السوق." },
    ],
  },
  linkedin: {
    slug: "linkedin",
    name: "LinkedIn Premium",
    icon: "💼",
    iconImg: "/app/assets/img/linkedin-logo.svg",
    imageUrl: "/app/assets/img/linkedin-logo.svg",
    thumbBg: "linear-gradient(145deg,#001f3f,#004182)",
    category: "البرامج والتطبيقات",
    tagline: "طوّر مسارك المهني مع LinkedIn Premium — باقات Career و Business الرسمية",
    description:
      "اشتراكات LinkedIn Premium الرسمية لتطوير مسارك المهني والوصول لأفضل الفرص الوظيفية وريادة الأعمال. اختر بين باقة Career (3 أشهر أو سنة) أو باقة Business السنوية.",
    identifierLabel: "إيميل حساب LinkedIn",
    identifierPlaceholder: "example@email.com",
    deliveryMethod: "رابط تفعيل لـ 3 أشهر أو شحن وتفعيل مباشر للباقات السنوية.",
    plans: [
      { id: "linkedin-career-3m", label: "LinkedIn Career — 3 أشهر (رابط تفعيل)", price: 9, oldPrice: 25, tag: "رابط تفعيل" },
      { id: "linkedin-career-12m", label: "LinkedIn Career — 12 شهر (شحن من الحساب)", price: 32, oldPrice: 60, tag: "شحن على الحساب" },
      { id: "linkedin-business-12m", label: "LinkedIn Business — 12 شهر (شحن من الحساب)", price: 60, oldPrice: 120, tag: "الأعلى طلباً" },
    ],
    features: [
      { icon: "📩", title: "InMail Messages", desc: "راسل أي شخص على LinkedIn حتى لو مش ضمن شبكتك." },
      { icon: "📊", title: "رؤى الشركات والوظائف", desc: "شوف تفاصيل التقديمات، وقارن نفسك بالمتقدمين الآخرين." },
      { icon: "🎓", title: "LinkedIn Learning", desc: "وصول كامل لآلاف الدورات الاحترافية بشهادات معتمدة." },
      { icon: "👀", title: "مين شاف بروفايلك", desc: "اطّلع على كامل قائمة الأشخاص الي زاروا صفحتك خلال 90 يوم." },
    ],
  },
  microsoft365: {
    slug: "microsoft365",
    name: "Microsoft 365",
    icon: "🅼",
    iconImg: "/app/assets/img/microsoft365-logo.svg",
    imageUrl: "/app/assets/img/microsoft365-logo.svg",
    thumbBg: "linear-gradient(145deg,#3a1208,#180804)",
    category: "البرامج والتطبيقات",
    tagline: "مايكروسوفت 365 — أكثر من خيار",
    description: "Word, Excel, PowerPoint, Outlook والمزيد — اختر الخيار الي بناسبك: حساب من عندنا، مفتاح شخصي، أو باقة عائلية 5 مستخدمين.",
    deliveryMethod: "حسب الخيار المختار: إما نعطيك بيانات حساب جاهز من عندنا، أو نرسلك مفتاح تفعيل رسمي (Product Key) لتفعّله على حسابك الشخصي مباشرة.",
    plans: [
      { id: "ms365-acct-12", label: "حساب من عندنا — 12 شهر", price: 7, oldPrice: 12, tag: "الأوفر" },
      { id: "ms365-key-12", label: "مفتاح شخصي + 1TB OneDrive — 12 شهر", price: 15, oldPrice: 22, tag: "الأكثر طلبًا" },
      { id: "ms365-fam-12", label: "باقة عائلية 5 مستخدمين — 12 شهر", price: 35, oldPrice: 55 },
    ],
    features: [
      { icon: "📝", title: "كل تطبيقات Office", desc: "Word, Excel, PowerPoint, Outlook, OneNote — نسخ كاملة للكمبيوتر والموبايل." },
      { icon: "☁️", title: "1 تيرا OneDrive", desc: "مساحة تخزين سحابي 1TB بخيارات المفتاح الشخصي والعائلي." },
      { icon: "👨‍👩‍👧", title: "يشتغل لكل الأجهزة", desc: "ويندوز، ماك، iOS، أندرويد — نفس الحساب." },
      { icon: "🛡️", title: "تفعيل رسمي 100%", desc: "مفاتيح أصلية من مايكروسوفت وحسابات نظامية." },
    ],
  },
  autodesk: {
    slug: "autodesk",
    name: "Autodesk All Apps",
    icon: "📐",
    iconImg: "/app/assets/img/autodesk-logo.svg",
    imageUrl: "/app/assets/img/autodesk-logo.svg",
    thumbBg: "linear-gradient(145deg,#2a1a10,#140a05)",
    category: "البرامج والتطبيقات",
    tagline: "كل برامج أوتوديسك سنة كاملة",
    description: "AutoCAD، 3ds Max، Maya، Revit، Fusion 360 وأكثر من 20 برنامج — اشتراك رسمي على حسابك الشخصي.",
    identifierLabel: "إيميل حساب Autodesk",
    identifierPlaceholder: "example@email.com",
    deliveryMethod: "منفعّلك باقة All Apps الرسمية على حساب Autodesk تبعك بالإيميل، بدون ما نطلب الباسورد.",
    plans: [{ id: "autodesk-12", label: "12 شهر — كل البرامج", price: 5, oldPrice: 15, tag: "عرض خاص" }],
    features: [
      { icon: "🏗️", title: "AutoCAD & Revit", desc: "أدوات التصميم الهندسي والمعماري الرائدة عالميًا." },
      { icon: "🎬", title: "Maya & 3ds Max", desc: "أفضل برامج التحريك ثلاثي الأبعاد وإنشاء المؤثرات." },
      { icon: "🔧", title: "Fusion 360", desc: "برنامج CAD/CAM/CAE متكامل للتصميم الميكانيكي." },
      { icon: "📦", title: "+20 تطبيق آخر", desc: "وصول كامل لكل تطبيقات Autodesk بنفس الاشتراك." },
    ],
  },
  gemini: {
    slug: "gemini",
    name: "Gemini Pro",
    icon: "✨",
    iconImg: "/app/assets/img/gemini-logo.svg",
    imageUrl: "/app/assets/img/gemini-logo.svg",
    thumbBg: "linear-gradient(145deg,#2a1a4a,#0e0820)",
    category: "الذكاء الاصطناعي",
    tagline: "Gemini Pro سنة ونص",
    description: "الوصول لنماذج Gemini Advanced، حدود استخدام أعلى، وتكامل مع تطبيقات Google — كله على حسابك الشخصي.",
    identifierLabel: "إيميل حساب Google",
    identifierPlaceholder: "example@gmail.com",
    deliveryMethod: "منرسلك رابط تفعيل (Activation Link) لحساب Google الشخصي تبعك، بتضغط عليه وبينفعّل الاشتراك مباشرة بدون ما نطلب الباسورد.",
    plans: [{ id: "gemini-18", label: "18 شهر", price: 4, oldPrice: 20, tag: "الأفضل قيمة" }],
    features: [
      { icon: "🧠", title: "Gemini Advanced", desc: "وصول لأقوى نماذج Google بأعلى ذكاء وقدرة على المهام المعقدة." },
      { icon: "⚡", title: "حدود استخدام أعلى", desc: "رسائل ومحادثات أكثر بكثير مقارنة بالنسخة المجانية." },
      { icon: "📎", title: "رفع ملفات وصور", desc: "حلّل ملفات PDF ووثائق وصور بشكل مباشر داخل المحادثة." },
      { icon: "🔗", title: "تكامل مع Google", desc: "يشتغل ضمن Gmail وDocs وSheets لتوفير وقتك." },
    ],
  },
  windows: {
    slug: "windows",
    name: "تفعيل ويندوز",
    icon: "🪟",
    iconImg: "/app/assets/img/windows-icon.svg",
    imageUrl: "/app/assets/img/windows-icon.svg",
    thumbBg: "linear-gradient(145deg,#0a2540,#04101c)",
    category: "البرامج والتطبيقات",
    tagline: "مفاتيح تفعيل رسمية لويندوز 10 و 11",
    description: "اختار النسخة الي بناسبك (Pro أو Home) وطريقة الربط (OEM على الجهاز أو Account على حسابك) — تفعيل رسمي مدى الحياة.",
    deliveryMethod: "منرسلك مفتاح التفعيل (Product Key) الرسمي مع خطوات مفصّلة للتفعيل. مفاتيح OEM بترتبط بالمذربورد، ومفاتيح Account بترتبط بحساب مايكروسوفت تبعك.",
    plans: [
      { id: "win-pro-oem", label: "Windows 10/11 Pro — OEM (Motherboard)", price: 3, oldPrice: 140 },
      { id: "win-pro-acct", label: "Windows 10/11 Pro — Account", price: 5, oldPrice: 140, tag: "الأكثر طلبًا" },
      { id: "win-home-oem", label: "Windows 10/11 Home — OEM (Motherboard)", price: 3, oldPrice: 100 },
      { id: "win-home-acct", label: "Windows 10/11 Home — Account", price: 5, oldPrice: 100 },
    ],
    features: [
      { icon: "🔑", title: "مفاتيح رسمية 100%", desc: "كل مفتاح أصلي ومفعّل مباشرة من خوادم مايكروسوفت." },
      { icon: "♾️", title: "تفعيل مدى الحياة", desc: "المفتاح دائم — بدون تجديد شهري أو سنوي." },
      { icon: "💻", title: "ربط بالمذربورد أو الحساب", desc: "OEM بترتبط بالجهاز، وAccount بترتبط بحساب مايكروسوفت لتنقل بين الأجهزة." },
      { icon: "🛡️", title: "ضمان استبدال", desc: "لو المفتاح صار فيه أي مشكلة خلال فترة الضمان، منستبدله فورًا." },
    ],
  },
  fortnite: {
    slug: "fortnite",
    name: "فورت نايت",
    icon: "🪂",
    iconImg: "/app/assets/img/fortnite-logo.png",
    imageUrl: "/app/assets/img/fortnite-logo.png",
    thumbBg: "linear-gradient(145deg,#0d1a30,#080d18)",
    category: "الألعاب",
    tagline: "كرو شهري ورصيد V-Bucks يوصلك فورًا",
    description: "اشترك بالـ Crew الشهري أو اشحن رصيد V-Bucks مباشرة على حساب Epic Games تبعك.",
    identifierLabel: "رقم الواتساب للتواصل والتفعيل",
    identifierPlaceholder: "ضع رقم الواتس اب الخاص بك لسهولة التواصل والتفعيل (مثال: 0791234567)",
    delivery: {
      intro: "بعد تأكيد طلبك، رح نتواصل معك مباشرة عبر الواتساب لتأكيد وشحن رصيد V-Bucks أو تفعيل الكرو بكل سهولة وأمان دون أي تعقيد:",
      requirements: [
        "رقم الواتساب الخاص بك للتواصل المباشر مع فريق الدعم والتفعيل",
        "تأكيد باقة V-Bucks أو الكرو المطلوب شحنها",
        "تفعيل رسمي ومضمون 100% بأسرع وقت",
      ],
      safety: [
        "شحن رسمي 100% عبر طرق دفع معتمدة",
        "استخدمناها بآلاف الطلبات الناجحة",
        "صفر مخاطرة حظر (بان) على حسابك",
        "خدمة عملاء ودعم فني متواصل 24/7",
      ],
      platformNotes: [
        "الكمية المختارة من V-Bucks بتنضاف مباشرة لحسابك",
        "بيشتغل على كل المنصات (PC، بلايستيشن، إكسبوكس) ما عدا Nintendo Switch",
        "بيشتغل لكل مناطق العالم",
      ],
    },
    crewPlans: [
      { id: "fn-crew", label: "Fortnite Crew — شهر واحد", price: 4, oldPrice: 6, tag: "يشمل 1000 V-Bucks", imageUrl: "https://cdn1.epicgames.com/offer/fn/FNECO_41-30_August_Crew_Lineup_EGS_Launcher_Blade_1200x1600_1200x1600-911e7061d0aa458aa67d4e5897fcb473" },
      { id: "fn-crew-3", label: "Fortnite Crew — 3 أشهر", price: 9, oldPrice: 12, tag: "الأفضل قيمة", imageUrl: "https://cdn1.epicgames.com/offer/fn/FNECO_41-30_August_Crew_Lineup_EGS_Launcher_Blade_1200x1600_1200x1600-911e7061d0aa458aa67d4e5897fcb473" },
    ],
    vbucksPlans: [
      { id: "fn-vb-800", label: "800 وحدة V-Bucks", price: 5, oldPrice: 7, imageUrl: "https://cdn1.epicgames.com/offer/fn/EN_FNECO_41-00_RMT_CoreV-BucksPacks_800_EGS_Portrait_1200x1600_1200x1600-79529d8c20514e82ae2ebce58991b912" },
      { id: "fn-vb-2400", label: "2400 وحدة V-Bucks", price: 12, oldPrice: 16, imageUrl: "https://cdn1.epicgames.com/offer/fn/EN_FNECO_41-00_RMT_CoreV-BucksPacks_2400_EGS_Landscape_2560x1440_2560x1440-e51d802c9d414431973ae3e2ba60528d" },
      { id: "fn-vb-4500", label: "4500 وحدة V-Bucks", price: 19, oldPrice: 25, imageUrl: "https://cdn1.epicgames.com/offer/fn/EN_FNECO_41-00_RMT_CoreV-BucksPacks_4500_EGS_Landscape_2560x1440_2560x1440-799cfafb76bf4ae795fece5e4c0de4a3" },
      { id: "fn-vb-12500", label: "12500 وحدة V-Bucks", price: 38, oldPrice: 49, imageUrl: "https://cdn1.epicgames.com/offer/fn/EN_FNECO_41-00_RMT_CoreV-BucksPacks_12500_EGS_Portrait_1200x1600_1200x1600-070f17d0f6a34e9180b2927c8c24c40e" },
    ],
    features: [
      { icon: "🎽", title: "طقم Crew Pack حصري شهريًا", desc: "تشكيلة (Outfit) حصرية مع إكسسواراتها تتجدد كل شهر، وما بتنباع بشكل منفصل بأي مكان تاني." },
      { icon: "🎫", title: "Battle Pass الموسم الحالي", desc: "يشمل اشتراكك Battle Pass الموسم الحالي تلقائيًا طول ما اشتراكك فعّال." },
      { icon: "💰", title: "1000 وحدة V-Bucks شهريًا", desc: "رصيد V-Bucks بينضاف لحسابك كل شهر طول فترة الاشتراك، تصرفه على أي شي بالمتجر." },
    ],
  },
  "adobe-express": {
    slug: "adobe-express",
    name: "Adobe Express Premium",
    nameAr: "Adobe Express Premium | اشتراك 3 أشهر (كود رقمي)",
    icon: "🎨",
    iconImg: "/app/assets/img/catalog/adobe-express.svg",
    imageUrl: "/app/assets/img/catalog/adobe-express.jpg",
    thumbBg: "linear-gradient(145deg, #2b1145, #12061f)",
    category: "البرامج والتطبيقات",
    categoryAr: "البرامج والتطبيقات",
    tagline: "تصميم احترافي وسريع لمنشورات السوشال ميديا والفيديوهات بالذكاء الاصطناعي",
    description:
      "منصة تصميم سحابية متكاملة وسهلة الاستخدام من شركة أدوبي، تمكنك من صناعة تصاميم مذهلة لمنصات التواصل الاجتماعي، والشعارات، والملصقات الإعلانية، ومقاطع الفيديو القصيرة، بالاعتماد على قوالب جاهزة وميزات الذكاء الاصطناعي المتقدمة لتوليد الصور وتعديلها.\n\nالمواصفات والشروط:\n• كود رقمي أصلي لاشتراك بريميوم لمدة 3 أشهر.\n• تفعيل رسمي ومباشر عبر صفحة أدوبي: redeem.adobe.com\n• لا يتطلب إضافة أي بطاقة دفع أو بيانات بنكية للتفعيل.\n• مخصص للحسابات التي لا تحتوي على أي اشتراك نشط أو سابق في أدوبي.\n• يشترط تفعيل الكود خلال 3 أيام من الشراء.",
    identifierLabel: "حساب أدوبي",
    identifierPlaceholder: "example@gmail.com",
    deliveryMethod: "كود رقمي أصلي يتم تفعيله مباشرة على صفحة redeem.adobe.com دون الحاجة لأي بطاقة دفع.",
    plans: [
      { id: "adobe-express-3m", label: "3 أشهر (كود رقمي)", price: 3, oldPrice: 15, tag: "عرض خاص" },
    ],
    features: [
      { icon: "🎨", title: "تصاميم وفيديوهات احترافية", desc: "آلاف القوالب الحصرية لمنشورات وسائل التواصل الاجتماعي وتعديل الفيديوهات." },
      { icon: "✨", title: "توليد بالذكاء الاصطناعي", desc: "أدوات ذكية لتوليد وتعديل الصور وتفريغ العناصر بضغطة زر واحدة." },
      { icon: "🔑", title: "تفعيل مباشر بدون فيزا", desc: "كود رقمي رسمي يتم تفعيله على صفحة أدوبي بدون إدخال بطاقة دفع." },
      { icon: "⏳", title: "صلاحية التفعيل 3 أيام", desc: "ينصح بتفعيل الكود خلال 3 أيام من استلامه على حساب جديد." },
    ],
  },
  "notion-business": {
    slug: "notion-business",
    name: "Notion Business",
    nameAr: "Notion Business | اشتراك 3 أشهر مع رصيد ذكاء اصطناعي",
    icon: "📝",
    iconImg: "/app/assets/img/catalog/notion.svg",
    imageUrl: "/app/assets/img/catalog/notion.png",
    thumbBg: "linear-gradient(145deg, #1f232b, #0f1115)",
    category: "البرامج والتطبيقات",
    categoryAr: "البرامج والتطبيقات",
    tagline: "مساحة عمل رقمية شاملة لإدارة المهام والمشاريع مع 300 رصيد شهرياً",
    description:
      "مساحة عمل رقمية شاملة ومتطورة لتنظيم المهام، وإدارة المشاريع، وتدوين الملاحظات، وبناء قواعد البيانات الذكية للأفراد وفرق العمل. توفر بيئة تعاونية مرنة تدمج كل مستنداتك وخططك في مكان واحد.\n\nالمواصفات والشروط:\n• كود رسمي أصلي لخطة الأعمال لمدة 3 أشهر.\n• يتضمن 300 رصيد شهرياً لأدوات الذكاء الاصطناعي لكتابة النصوص وتلخيصها وتنظيم البيانات.\n• يجب استخدام كود التفعيل خلال 24 ساعة من تاريخ الشراء.\n• يتطلب التفعيل إضافة بطاقة دفع صالحة في إعدادات الحساب لتأكيد الاشتراك.",
    identifierLabel: "حساب Notion",
    identifierPlaceholder: "user@notion.so",
    deliveryMethod: "كود رقمي رسمي يتم تطبيقه في إعدادات مساحة العمل في Notion مع ربط بطاقة بنكية صالحة لإتمام التفعيل.",
    plans: [
      { id: "notion-biz-3m", label: "3 أشهر (300 رصيد شهرياً)", price: 9, oldPrice: 30, tag: "300 رصيد شهرياً" },
    ],
    features: [
      { icon: "👥", title: "تنظيم المشاريع والفرق", desc: "إدارة متقدمة للمهام وقواعد البيانات وصلاحيات مخصصة لفرق العمل." },
      { icon: "💎", title: "300 رصيد ذكاء اصطناعي", desc: "رصيد شهري لتوليد وتلخيص النصوص وترتيب البيانات بذكاء." },
      { icon: "💳", title: "يتطلب بطاقة دفع صالحة", desc: "يلزم إضافة بطاقة بنكية صالحة في إعدادات الحساب لتأكيد التفعيل." },
      { icon: "⚡", title: "التفعيل خلال 24 ساعة", desc: "يرجى تطبيق الكود في حسابك خلال 24 ساعة من تاريخ الشراء." },
    ],
  },
  "adobe-acrobat-standard": {
    slug: "adobe-acrobat-standard",
    name: "Adobe Acrobat Standard 2026",
    nameAr: "Adobe Acrobat Standard 2026 | جهازين 3 أشهر (كود رقمي)",
    icon: "📕",
    iconImg: "/app/assets/img/catalog/adobe-acrobat.svg",
    imageUrl: "/app/assets/img/catalog/adobe-acrobat.jpg",
    thumbBg: "linear-gradient(145deg, #3a000d, #1a0005)",
    category: "البرامج والتطبيقات",
    categoryAr: "البرامج والتطبيقات",
    tagline: "البرنامج المعتمد عالمياً لإنشاء وتعديل وتوقيع ملفات PDF لجهازين",
    description:
      "البرنامج الرائد والمعتمد عالمياً للتعامل مع مستندات PDF. يتيح لك تحرير وتعديل النصوص والصور داخل الملفات، وتحويل ملفات PDF إلى مستندات مايكروسوفت أوفيس والعكس، وتوقيع العقود والمستندات إلكترونياً وحمايتها بكلمات مرور وتشفير موثوق.\n\nالمواصفات والشروط:\n• كود رقمي أصلي لاشتراك كامل لمدة 3 أشهر.\n• يعمل على جهازين بالتزامن (أجهزة الكمبيوتر والهواتف الذكية).\n• تفعيل رسمي عبر صفحة أدوبي: redeem.adobe.com\n• لا يتطلب إضافة أي بطاقة دفع للتفعيل.\n• نسخة عالمية صالحة للاستخدام في جميع الدول.",
    identifierLabel: "حساب أدوبي",
    identifierPlaceholder: "example@gmail.com",
    deliveryMethod: "كود رقمي يوصلك فوراً وتفعله على حسابك في redeem.adobe.com ويعمل على جهازين بدون أي فيزا.",
    plans: [
      { id: "acrobat-std-3m", label: "3 أشهر (جهازين PC/Mac/Mobile)", price: 12, oldPrice: 40, tag: "جهازين" },
    ],
    features: [
      { icon: "📑", title: "تحرير ملفات PDF بالكامل", desc: "تعديل النصوص والصور وتحويل الملفات بدقة وسهولة." },
      { icon: "💻", title: "يعمل على جهازين", desc: "يدعم التشغيل على جهازي كمبيوتر أو أجهزة محمولة بالتزامن." },
      { icon: "🔒", title: "تفعيل بدون بطاقة بنكية", desc: "يتم تفعيل الكود مباشرة عبر موقع أدوبي دون طلب أي بطاقة." },
      { icon: "🌍", title: "نسخة عالمية معتمدة", desc: "كود أصلي صالح للتفعيل والاستخدام في كافة الدول." },
    ],
  },
  headspace: {
    slug: "headspace",
    name: "Headspace",
    nameAr: "Headspace | اشتراك 4 أشهر بريميوم",
    icon: "🧘",
    iconImg: "/app/assets/img/catalog/headspace.svg",
    imageUrl: "/app/assets/img/catalog/headspace.png",
    thumbBg: "linear-gradient(145deg, #1e2340, #0f1122)",
    category: "البرامج والتطبيقات",
    categoryAr: "البرامج والتطبيقات",
    tagline: "تطبيق التأمل والنوم والتركيز الرائد عالمياً — 4 أشهر كاملة",
    description:
      "تطبيق رائد عالمياً في مجال التأمل والنوم والاسترخاء والصحة النفسية. يقدم جلسات صوتية وتمارين تنفس موجهة لتقليل التوتر وتصفية الذهن، ومقاطع صوتية تساعد على النوم العميق والاسترخاء، بالإضافة إلى موسيقى مخصصة لرفع مستوى التركيز أثناء العمل والدراسة.\n\nالمواصفات والشروط:\n• اشتراك بريميوم كامل لمدة 4 أشهر.\n• طريقة التسليم: رابط تفعيل رسمي مباشر يربط بحسابك.\n• متوافق مع هواتف آيفون وأندرويد وأجهزة الكمبيوتر والمتصفح.\n• لا يتطلب إضافة أي بطاقة بنكية للتفعيل.",
    identifierLabel: "البريد الإلكتروني",
    identifierPlaceholder: "name@example.com",
    deliveryMethod: "رابط تفعيل رسمي يوصلك فوراً، تفتحه وتسجل دخول بحسابك لتفعيل الـ 4 أشهر بريميوم مباشرة.",
    plans: [
      { id: "headspace-4m", label: "4 أشهر بريميوم (رابط تفعيل)", price: 1, oldPrice: 18, tag: "صيد اليوم (1 د.أ)" },
    ],
    features: [
      { icon: "🧘‍♂️", title: "جلسات تأمل يومية", desc: "تمارين استرخاء وتنفس موجهة لتقليل التوتر وتصفية الذهن." },
      { icon: "🌙", title: "مقاطع صوتية لنوم هادئ", desc: "أصوات طبيعية وقصص مهدئة تساعد على النوم العميق والاسترخاء." },
      { icon: "🎧", title: "موسيقى مخصصة للتركيز", desc: "مقاطع صوتية مدروسة علمياً للمساعدة على التركيز أثناء العمل والدراسة." },
      { icon: "🔗", title: "تفعيل فوري برابط مباشر", desc: "رابط تفعيل رسمي يربط بحسابك مباشرة دون الحاجة لبطاقة بنكية." },
    ],
  },
  nordvpn: {
    slug: "nordvpn",
    name: "NordVPN",
    nameAr: "NordVPN | اشتراك 3 أشهر (10 أجهزة)",
    icon: "🌐",
    iconImg: "/app/assets/img/catalog/nordvpn.svg",
    imageUrl: "/app/assets/img/catalog/nordvpn.jpg",
    thumbBg: "linear-gradient(145deg, #0f2b5c, #071329)",
    category: "البرامج والتطبيقات",
    categoryAr: "البرامج والتطبيقات",
    tagline: "خدمة التصفح الآمن وحماية الخصوصية الرائدة عالمياً لـ 10 أجهزة — رابط تفعيل مباشر",
    description:
      "أقوى خدمة شبكة افتراضية خاصة (VPN) لحماية خصوصيتك وأمان بياناتك على الإنترنت. تمنحك تصفحاً مشفراً وسريعاً مع إمكانية تغيير موقعك الجغرافي للوصول إلى المحتوى والمواقع المفضلة، وتأمين اتصالك على شبكات الواي فاي العامة.\n\nالمواصفات وطريقة التفعيل:\n• اشتراك كامل لمدة 3 أشهر مع ضمان كامل طوال المدة.\n• يدعم تشغيل وحماية حتى 10 أجهزة في الوقت نفسه.\n• متوافق مع كافة الأنظمة: ويندوز، ماك، آيفون، أندرويد والشاشات الذكية.\n• طريقة التسليم: رابط تفعيل رسمي ومباشر يربط بحسابك لتفعيل الاشتراك فوراً بدون الحاجة لبطاقة دفع.",
    identifierLabel: "البريد الإلكتروني",
    identifierPlaceholder: "user@gmail.com",
    deliveryMethod: "رابط تفعيل رسمي ومباشر يوصلك فوراً لتفعيل اشتراك NordVPN على حسابك والتمتع بالحماية على ما يصل إلى 10 أجهزة بالتزامن.",
    plans: [
      { id: "nordvpn-3m", label: "3 أشهر (10 أجهزة)", price: 10, oldPrice: 24, tag: "10 أجهزة بالتزامن" },
    ],
    features: [
      { icon: "🚀", title: "سرعات فائقة واستقرار عالي", desc: "آلاف السيرفرات السريعة والمستقرة حول العالم لتصفح آمن وسلس." },
      { icon: "📱", title: "حماية 10 أجهزة بالتزامن", desc: "تشغيل متزامن على الكمبيوتر واللابتوب والهواتف والشاشات الذكية." },
      { icon: "🛡️", title: "حماية الخصوصية وتشفير قوي", desc: "تشفير عالي المستوى مع حظر المواقع المشبوهة والإعلانات المزعجة." },
      { icon: "🔗", title: "رابط تفعيل رسمي ومباشر", desc: "رابط تفعيل يوصلك فوراً لتفعيل اشتراكك والتمتع بالحماية على كافة أجهزتك مباشرة بدون بطاقة دفع." },
    ],
  },
  "minecraft-realms-plus": {
    slug: "minecraft-realms-plus",
    name: "Minecraft Realms Plus",
    nameAr: "Minecraft Realms Plus | اشتراك شهر (Global - Xbox / PC)",
    icon: "⛏️",
    iconImg: "/app/assets/img/catalog/minecraft-realms-plus.png",
    imageUrl: "/app/assets/img/catalog/minecraft-realms-plus.png",
    thumbBg: "linear-gradient(145deg, #1b3b1e, #0a1a0c)",
    category: "الألعاب",
    categoryAr: "الألعاب",
    tagline: "سيرفر خاص لك ولأصدقائك في ماينكرافت مع أكثر من 150 محتوى في Marketplace",
    description:
      "سيرفر خاص ومستضاف سحابياً دائماً للعب مع حتى 10 من أصدقائك في نفس الوقت في عالم ماينكرافت الخاص بك، حتى عندما تكون غير متصل بالإنترنت. يمنحك اشتراك Realms Plus وصولاً شهرياً لأكثر من 150 حزمة من محتويات Marketplace المميزة بما فيها العوالم، السكنات، وحزم القوام (Texture Packs).\n\nالمواصفات والشروط:\n• كود رقمي أصلي لاشتراك شهر واحد في Minecraft Realms Plus.\n• يدعم اللعب المشترك (Cross-Platform) بين Xbox One، Xbox Series X|S، والكمبيوتر (Bedrock).\n• نسخة عالمية (Global) صالحة للاستخدام والتفعيل في جميع الدول.\n• تفعيل رسمي ومباشر عبر حساب مايكروسوفت / إكسبوكس الخاص بك: redeem.microsoft.com.",
    identifierLabel: "حساب مايكروسوفت / إكسبوكس",
    identifierPlaceholder: "gamer@xbox.com",
    deliveryMethod: "كود رقمي أصلي يوصلك فوراً لتفعيله مباشرة على حساب مايكروسوفت / إكسبوكس الخاص بك عبر redeem.microsoft.com",
    plans: [
      { id: "minecraft-realms-plus-1m", label: "اشتراك شهر واحد (كود رقمي Global)", price: 3, oldPrice: 6.5, tag: "كود رقمي أصلي" },
    ],
    features: [
      { icon: "🏰", title: "سيرفر خاص دائم 24/7", desc: "عالم ماينكرافت سحابي خاص بك يستوعب حتى 10 لاعبين في نفس الوقت ويبقى متاحاً طول الوقت." },
      { icon: "📦", title: "+150 محتوى مجاني في Marketplace", desc: "وصول شهري لأكثر من 150 حزمة عوالم وسكنات وألعاب مصغرة تتجدد باستمرار." },
      { icon: "🔄", title: "نسخ احتياطي سحابي وحفظ آمن", desc: "حفظ تلقائي لعوالمك وإمكانية استرجاعها وتحميلها على جهازك في أي وقت." },
      { icon: "🔑", title: "كود رقمي عالمي (Global)", desc: "تفعيل رسمي عبر redeem.microsoft.com بدون الحاجة لأي بطاقة دفع بنكية." },
    ],
  },
  valorant: {
    slug: "valorant",
    name: "Valorant Points (Turkey)",
    nameAr: "شحن نقاط فالورانت (Valorant Points) | كود رقمي (الحسابات التركية)",
    icon: "🎯",
    iconImg: "/app/assets/img/valorant-logo.png",
    imageUrl: "/app/assets/img/catalog/valorant-cover.jpg",
    thumbBg: "linear-gradient(145deg, #2b0811, #120407)",
    category: "الألعاب",
    categoryAr: "الألعاب",
    tagline: "شحن نقاط فالورانت (Valorant Points) للحسابات التركية بتسليم فوري لكود التفعيل",
    description:
      "اشحن نقاط فالورانت (VP) لحسابك التركي فوراً وبأفضل الأسعار الرسمية. استلم كود التفعيل الرقمي فور إتمام الدفع وفعّله مباشرة داخل لعبة Valorant لشراء أحدث السكنات وحزم الأسلحة وبطاقات المعركة (Battle Pass).",
    deliveryMethod: "كود رقمي رسمي يتم تسليمه فوراً بعد الدفع ليتم استرداده وتفعيله مباشرة داخل لعبة Valorant.",
    plans: [
      { id: "vp-tr-375", label: "375 VP", price: 2.25 },
      { id: "vp-tr-825", label: "825 VP", price: 4.45 },
      { id: "vp-tr-1700", label: "1700 VP", price: 8.75 },
      { id: "vp-tr-2925", label: "2925 VP", price: 13.75 },
      { id: "vp-tr-4325", label: "4325 VP", price: 19.50 },
      { id: "vp-tr-8900", label: "8900 VP", price: 37.45 },
    ],
    features: [
      { icon: "⚡", title: "تسليم فوري للأكواد", desc: "كود التفعيل الرقمي يظهر مباشرة فور إتمام عملية الدفع." },
      { icon: "🇹🇷", title: "مخصص للحسابات التركية", desc: "صالح للاسترداد حصرياً على حسابات Valorant التابعة لمنطقة تركيا (Riot Games Turkey)." },
      { icon: "🛡️", title: "شحن أصلي ورسمي 100%", desc: "أكواد معتمدة رسمياً تضمن سلامة حسابك وخلوها من أي مخاطر حظر." },
      { icon: "🔫", title: "شراء السكنات والباتل باس", desc: "استخدم نقاط VP لشراء حزم الأسلحة، السكنات الحصرية، وتفعيل بطاقة المعركة." },
    ],
  },
  "lovable-lite-12m": {
    slug: "lovable-lite-12m",
    name: "Lovable Lite",
    nameAr: "Lovable Lite | اشتراك سنة كاملة (300 رصيد شهرياً)",
    icon: "⚡",
    iconImg: "/app/assets/img/catalog/lovable.webp",
    imageUrl: "/app/assets/img/catalog/lovable.webp",
    thumbBg: "linear-gradient(145deg, #2e124d, #140624)",
    category: "البرامج والتطبيقات",
    categoryAr: "البرامج والتطبيقات",
    tagline: "بناء وتطوير تطبيقات الويب بالذكاء الاصطناعي — 300 رصيد شهرياً ودعم Custom Domain",
    description:
      "منصة Lovable (lovable.dev) الرائدة عالمياً في بناء وتطوير تطبيقات الويب الكاملة (Full-Stack Web Applications) باستخدام أحدث نماذج الذكاء الاصطناعي من خلال المحادثة والوصف الطبيعي فقط. باقة Lovable Lite السنوية توفر لك 300 رصيد شهرياً لإنشاء وتطوير ونشر تطبيقاتك ومواقعك بكل سهولة.\n\nالمواصفات وأبرز المميزات:\n• نوع الاشتراك: باقة Lovable Lite الرسمية لمدة 12 شهراً (سنة كاملة).\n• الرصيد: 300 رصيد ذكاء اصطناعي يتجدد شهرياً لبناء التطبيقات وتعديل الكود.\n• دعم النطاق المخصص (Custom Domain): إمكانية ربط دومين خاص بمشاريعك ومواقعك المنشورة مباشرة.\n• طريقة التفعيل: رابط دعوة وتفعيل رسمي يتم ربطه بمساحة العمل (Workspace) الخاصة بك.\n• تصدير الكود بالكامل والربط مع GitHub: كود نظيف واحترافي مبني على React و Tailwind CSS.\n• تكامل مباشر مع قواعد بيانات Supabase والمصادقة (Auth) والتخزين السحابي.",
    identifierLabel: "حساب Lovable",
    identifierPlaceholder: "user@lovable.dev",
    deliveryMethod: "رابط تفعيل ودعوة رسمية لمساحة العمل (Workspace Invite Link) يوصلك فوراً لتفعيل الباقة على حسابك في Lovable.",
    plans: [
      { id: "lovable-lite-12m", label: "12 شهر (300 رصيد شهرياً - مساحة عمل)", price: 20, oldPrice: 60, tag: "300 رصيد شهرياً" },
    ],
    features: [
      { icon: "⚡", title: "300 رصيد شهرياً", desc: "رصيد شهري متجدد لبناء تطبيقات ومواقع الويب وتعديل الأكواد بالذكاء الاصطناعي." },
      { icon: "🌐", title: "دعم الدومين المخصص (Custom Domain)", desc: "إمكانية ربط ونشر نطاقاتك الخاصة مباشرة على مشاريعك وتطبيقاتك." },
      { icon: "💻", title: "تصدير الكود والربط مع GitHub", desc: "كود نظيف مبني على React و Tailwind مع تصدير ومزامنة كاملة." },
      { icon: "🔗", title: "دعوة تفعيل لمساحة العمل", desc: "تفعيل رسمي وآمن بنقرة واحدة عبر رابط دعوة رسمي لمساحة العمل الخاصة بك." },
    ],
  },
  "duolingo-super-12-months": {
    slug: "duolingo-super-12-months",
    name: "Duolingo Super",
    nameAr: "اشتراك دولينجو سوبر | سنة كاملة (12 شهر) كود رقمي عالمي",
    icon: "🦉",
    iconImg: "/app/assets/img/catalog/duolingo-super.png",
    imageUrl: "/app/assets/img/catalog/duolingo-super.png",
    thumbBg: "linear-gradient(145deg, #1b380f, #0c1c06)",
    category: "البرامج والتطبيقات",
    categoryAr: "البرامج والتطبيقات",
    tagline: "تفعيل سنة كاملة من Duolingo Super بدون إعلانات وبقلوب غير محدودة",
    description:
      "كود تفعيل اشتراك دولينجو سوبر (Duolingo Super) لمدة 12 شهراً كاملاً.\n\nطريقة التفعيل:\n1. ادخل إلى رابط الاسترداد الرسمي: https://www.duolingo.com/redeem\n2. سجّل الدخول بحسابك في Duolingo\n3. أدخل الكود المستلم واضغط على استرداد.\n\n⚠️ ملاحظة هامة: لتفعيل الاشتراك بنجاح، يجب ألا يكون لديك أي اشتراك نشط حالياً على حسابك.",
    identifierLabel: "كود رقمي عالمي",
    identifierPlaceholder: "يصلك كود التفعيل الرقمي فوراً",
    deliveryMethod: "كود تفعيل رقمي فوري عالمي يتم استرداده عبر https://www.duolingo.com/redeem",
    plans: [
      { id: "duolingo-12m", label: "اشتراك 12 شهر (سنة كاملة)", price: 4, oldPrice: 9.99, tag: "سنة كاملة 🚀" },
    ],
    features: [
      { icon: "❤️", title: "قلوب غير محدودة", desc: "تعلم ومارس التمارين بحرية تامة دون القلق من نفاد القلوب أو الأخطاء." },
      { icon: "🚫", title: "بدون أي إعلانات", desc: "تجربة تعليمية سلسة وسريعة بدون مقاطعات إعلانية مزعجة." },
      { icon: "🎯", title: "مراجعة الأخطاء المخصصة", desc: "تدريب مكثف على النقاط التي أخطأت فيها لتحسين مستواك اللغوي." },
      { icon: "🔑", title: "كود تفعيل رسمي عالمي", desc: "كود رقمي أصلي 100% يتم استرداده مباشرة على حسابك في Duolingo." },
    ],
  },
};

export type Denomination = { id: string; value: string; price: number };
export type Region = { code: string; flag: string; name: string; denominations: Denomination[] };
export type GiftCard = {
  name: string;
  variants?: Plan[];
  icon: string;
  iconImg?: string;
  accent: string;
  cardGradient: string;
  regions: Region[];
};

export const GIFT_CARDS_CATALOG: Record<string, GiftCard> = {
  playstation: {
    name: "PlayStation Gift Cards",
    icon: "🎮",
    iconImg: "/app/assets/img/playstation-logo.svg",
    accent: "#00a3ff",
    cardGradient: "linear-gradient(135deg,#0a3d91,#0066cc 45%,#00a3ff)",
    regions: [
      { code: "us", flag: "🇺🇸", name: "أمريكا (USA)", denominations: [
        { id: "psn-us-10", value: "10$", price: 8 },
        { id: "psn-us-20", value: "20$", price: 15 },
        { id: "psn-us-50", value: "50$", price: 36 },
        { id: "psn-us-60", value: "60$", price: 44 },
        { id: "psn-us-100", value: "100$", price: 71 },
      ]},
      { code: "ae", flag: "🇦🇪", name: "الإمارات (UAE)", denominations: [
        { id: "psn-ae-10", value: "10$", price: 8.25 },
        { id: "psn-ae-20", value: "20$", price: 15.5 },
        { id: "psn-ae-50", value: "50$", price: 37.75 },
        { id: "psn-ae-60", value: "60$", price: 45 },
        { id: "psn-ae-100", value: "100$", price: 72 },
      ]},
      { code: "sa", flag: "🇸🇦", name: "السعودية (KSA)", denominations: [
        { id: "psn-sa-10", value: "10$", price: 8.25 },
        { id: "psn-sa-20", value: "20$", price: 16.5 },
        { id: "psn-sa-50", value: "50$", price: 38.75 },
        { id: "psn-sa-60", value: "60$", price: 46 },
        { id: "psn-sa-100", value: "100$", price: 76 },
      ]},
    ],
  },
  xbox: {
    name: "Xbox Gift Cards",
    icon: "🕹️",
    iconImg: "/app/assets/img/xbox-logo.svg",
    accent: "#4fdc4f",
    cardGradient: "linear-gradient(135deg,#0e4d0e,#107c10 45%,#4fdc4f)",
    regions: [
      { code: "tr", flag: "🇹🇷", name: "تركيا (Turkey)", denominations: [
        { id: "xbox-tr-50", value: "50 TRY", price: 1.15 },
        { id: "xbox-tr-100", value: "100 TRY", price: 2.30 },
        { id: "xbox-tr-300", value: "300 TRY", price: 6.50 },
      ]},
      { code: "us", flag: "🇺🇸", name: "أمريكا (USA)", denominations: [
        { id: "xbox-us-5", value: "5$", price: 4 },
        { id: "xbox-us-10", value: "10$", price: 8 },
        { id: "xbox-us-15", value: "15$", price: 12 },
        { id: "xbox-us-20", value: "20$", price: 15 },
        { id: "xbox-us-25", value: "25$", price: 19 },
        { id: "xbox-us-50", value: "50$", price: 36 },
        { id: "xbox-us-100", value: "100$", price: 71 },
      ]},
    ],
  },
  "google-play": {
    name: "Google Play Gift Cards",
    icon: "▶️",
    iconImg: "/app/assets/img/googleplay-logo.png",
    accent: "#34a853",
    cardGradient: "linear-gradient(135deg,#1a73e8,#34a853 35%,#fbbc04 70%,#ea4335)",
    regions: [],
  },
  itunes: {
    name: "iTunes Gift Cards",
    icon: "🎵",
    iconImg: "/app/assets/img/itunes-logo.svg",
    accent: "#f107a3",
    cardGradient: "linear-gradient(135deg,#7b2ff7,#f107a3 55%,#ff5c8a)",
    regions: [
      { code: "us", flag: "🇺🇸", name: "أمريكا (USA)", denominations: [
        { id: "itunes-us-5", value: "5$ USD", price: 5.0 },
        { id: "itunes-us-10", value: "10$ USD", price: 8.5 },
        { id: "itunes-us-15", value: "15$ USD", price: 12.5 },
        { id: "itunes-us-20", value: "20$ USD", price: 16.0 },
        { id: "itunes-us-25", value: "25$ USD", price: 19.5 },
        { id: "itunes-us-50", value: "50$ USD", price: 38.5 },
        { id: "itunes-us-100", value: "100$ USD", price: 74.5 },
      ]},
    ],
  },
};

export type CategoryLink = {
  slug: string;
  name: string;
  nameEn?: string;
  icon: string;
  type: "direct" | "group";
  accent: string;
  bg: string;
  desc: string;
  descEn?: string;
};

export const CATEGORY_LINKS: CategoryLink[] = [
  { slug: "subscriptions", name: "الاشتراكات", nameEn: "Subscriptions", icon: "⚡", type: "group", accent: "#8b5cf6", bg: "linear-gradient(145deg, rgba(139,92,246,0.18), rgba(139,92,246,0.04))", desc: "اشتراكات المشاهدة والألعاب والترفيه", descEn: "Streaming, Gaming & Entertainment" },
  { slug: "social-media", name: "السوشال ميديا", nameEn: "Social Media", icon: "📱", type: "group", accent: "#0088ff", bg: "linear-gradient(145deg, rgba(0,136,255,0.18), rgba(0,136,255,0.04))", desc: "خدمات زيادة المتابعين والتفاعل الحقيقي", descEn: "Real Followers & Engagement" },
  { slug: "design", name: "البرامج والتطبيقات", nameEn: "Apps & Software", icon: "🧩", type: "group", accent: "#00e5ff", bg: "linear-gradient(145deg, rgba(0,229,255,0.16), rgba(0,229,255,0.04))", desc: "برامج وتطبيقات الإنتاجية والتصميم والحماية", descEn: "Productivity, Design & Utility Apps" },
  { slug: "games", name: "الألعاب", nameEn: "Games", icon: "🎮", type: "group", accent: "#05df72", bg: "linear-gradient(145deg, rgba(5,223,114,0.18), rgba(5,223,114,0.04))", desc: "ألعاب PC والكونسول وشحن الألعاب", descEn: "PC & Console Games & Top-ups" },
  { slug: "gift-cards", name: "بطاقات الهدايا", nameEn: "Gift Cards", icon: "🎁", type: "group", accent: "#ff2d78", bg: "linear-gradient(145deg, rgba(255,45,120,0.16), rgba(255,45,120,0.04))", desc: "بطاقات شحن رقمية وتسليم فوري للأكواد", descEn: "Digital Gift Cards & Instant Delivery" },
  { slug: "products", name: "جميع المنتجات", nameEn: "All Products", icon: "🛍️", type: "direct", accent: "#00e5ff", bg: "linear-gradient(135deg, rgba(0, 112, 240, 0.95), rgba(0, 229, 255, 0.9))", desc: "تصفح جميع المنتجات والعروض الحصرية", descEn: "Browse All Products & Deals" },
];

export type Subcategory = {
  slug: string;
  product?: string | null;
  name: string;
  icon: string;
  iconImg?: string;
  bg: string;
  comingSoon?: boolean;
  cardGradient?: string;
  accent?: string;
};

export const SUBCATEGORIES: Record<string, Subcategory[]> = {
  subscriptions: [
    { slug: "streaming", product: null, name: "اشتراكات المشاهدة", icon: "🍿", iconImg: "/app/assets/img/streaming-icon.png", bg: "linear-gradient(145deg,#2b0015,#15000a)" },
    { slug: "game-pass", product: "xbox-game-pass-ultimate", name: "Xbox Game Pass", icon: "🎮", iconImg: "/app/assets/img/xbox-logo.svg", bg: "linear-gradient(145deg,#0d2a1a,#081510)" },
  ],
  streaming: [
    { slug: "tod", product: "tod", name: "اشتراكات TOD", icon: "📺", iconImg: "/app/assets/img/catalog/tod-icon.webp", bg: "linear-gradient(145deg,#2b1154,#120626)" },
    { slug: "youtube-premium", product: "youtube-premium", name: "يوتيوب بريميوم", icon: "▶️", iconImg: "/app/assets/img/youtube-logo.svg", bg: "linear-gradient(145deg,#3a0005,#1a0002)" },
  ],
  "social-media": [],
  design: [
    { slug: "gemini", product: "gemini", name: "Google Gemini AI", icon: "✨", iconImg: "/app/assets/img/gemini-logo.svg", bg: "linear-gradient(145deg,#0f1f3d,#071020)" },
    { slug: "lovable-lite-12m", product: "lovable-lite-12m", name: "Lovable Lite", icon: "⚡", iconImg: "/app/assets/img/catalog/lovable.webp", bg: "linear-gradient(145deg,#2e124d,#140624)" },
    { slug: "notion-business", product: "notion-business", name: "Notion Business", icon: "📝", iconImg: "/app/assets/img/catalog/notion.svg", bg: "linear-gradient(145deg,#1f232b,#0f1115)" },
    { slug: "nordvpn", product: "nordvpn", name: "NordVPN", icon: "🌐", iconImg: "/app/assets/img/catalog/nordvpn.svg", bg: "linear-gradient(145deg,#0f2b5c,#071329)" },
    { slug: "headspace", product: "headspace", name: "Headspace", icon: "🧘", iconImg: "/app/assets/img/catalog/headspace.svg", bg: "linear-gradient(145deg,#1e2340,#0f1122)" },
    { slug: "adobe-express", product: "adobe-express", name: "Adobe Express", icon: "🎨", iconImg: "/app/assets/img/catalog/adobe-express.svg", bg: "linear-gradient(145deg,#2b1145,#12061f)" },
    { slug: "adobe-acrobat-standard", product: "adobe-acrobat-standard", name: "Adobe Acrobat Standard 2026", icon: "📕", iconImg: "/app/assets/img/catalog/adobe-acrobat.svg", bg: "linear-gradient(145deg,#3a000d,#1a0005)" },
    { slug: "adobe", product: "adobe", name: "Adobe Creative Cloud", icon: "🎨", iconImg: "/app/assets/img/adobe-cc.webp", bg: "#12151e" },
    { slug: "canva", product: "canva", name: "Canva Pro", icon: "🎨", iconImg: "/app/assets/img/canva-logo.png", bg: "linear-gradient(145deg,#1a2f6b,#0a1230)" },
    { slug: "microsoft365", product: "microsoft365", name: "Microsoft 365", icon: "🅼", iconImg: "/app/assets/img/microsoft365-logo.svg", bg: "linear-gradient(145deg,#3a1208,#180804)" },
    { slug: "windows", product: "windows", name: "تفعيل ويندوز", icon: "🪟", iconImg: "/app/assets/img/windows-icon.svg", bg: "linear-gradient(145deg,#0a2540,#04101c)" },
    { slug: "autodesk", product: "autodesk", name: "Autodesk", icon: "📐", iconImg: "/app/assets/img/autodesk-logo.svg", bg: "linear-gradient(145deg,#2a1a10,#140a05)" },
    { slug: "linkedin-career-3m", product: "linkedin-career-3m", name: "LinkedIn Career (3 أشهر)", icon: "💼", iconImg: "/app/assets/img/linkedin-logo.svg", bg: "linear-gradient(145deg,#001f3f,#004182)" },
    { slug: "linkedin-career-12m", product: "linkedin-career-12m", name: "LinkedIn Career (سنة)", icon: "💼", iconImg: "/app/assets/img/linkedin-logo.svg", bg: "linear-gradient(145deg,#001f3f,#003366)" },
    { slug: "linkedin-business-12m", product: "linkedin-business-12m", name: "LinkedIn Business (سنة)", icon: "💼", iconImg: "/app/assets/img/linkedin-logo.svg", bg: "linear-gradient(145deg,#001224,#002b54)" },
    { slug: "duolingo", product: "duolingo-super-12-months", name: "Duolingo Super", icon: "🦉", iconImg: "/app/assets/img/catalog/duolingo-super.png", bg: "linear-gradient(145deg,#1f3a10,#0d1a06)" },
  ],
  games: [
    { slug: "fortnite", product: "fortnite", name: "فورت نايت", icon: "🪂", iconImg: "/app/assets/img/fortnite-logo.png", bg: "linear-gradient(145deg,#0d1a30,#080d18)" },
    { slug: "valorant", product: "valorant", name: "فالورانت", icon: "🎯", iconImg: "/app/assets/img/valorant-logo.png", bg: "linear-gradient(145deg,#2b0811,#120407)" },
    { slug: "minecraft-realms-plus", product: "minecraft-realms-plus", name: "Minecraft Realms Plus", icon: "⛏️", iconImg: "/app/assets/img/catalog/minecraft-realms-plus.png", bg: "linear-gradient(145deg,#1b3b1e,#0a1a0c)" },
    { slug: "pc-games", product: null, name: "ألعاب PC", icon: "🖥️", iconImg: "/app/assets/img/steam-logo.svg", bg: "linear-gradient(145deg,#101a24,#05090d)" },
    { slug: "sony", product: null, name: "ألعاب بلايستيشن", icon: "🎮", iconImg: "/app/assets/img/playstation-logo.svg", bg: "linear-gradient(145deg,#0d1430,#080a18)", comingSoon: true },
    { slug: "xbox", product: null, name: "ألعاب إكسبوكس", icon: "🕹️", iconImg: "/app/assets/img/xbox-logo.svg", bg: "linear-gradient(145deg,#0d2a1a,#081510)", comingSoon: true },
  ],
  "gift-cards": [
    { slug: "playstation", name: "PlayStation Gift Cards", icon: "🎮", iconImg: "/app/assets/img/playstation-logo.svg", bg: "linear-gradient(145deg, rgba(0,163,255,0.18), rgba(0,163,255,0.04))", cardGradient: "linear-gradient(135deg,#0a3d91,#0066cc 45%,#00a3ff)", accent: "#00a3ff" },
    { slug: "xbox", name: "Xbox Gift Cards", icon: "🕹️", iconImg: "/app/assets/img/xbox-logo.svg", bg: "linear-gradient(145deg, rgba(79,220,79,0.18), rgba(79,220,79,0.04))", cardGradient: "linear-gradient(135deg,#0e4d0e,#107c10 45%,#4fdc4f)", accent: "#4fdc4f" },
    { slug: "google-play", name: "Google Play Gift Cards", icon: "▶️", iconImg: "/app/assets/img/googleplay-logo.png", bg: "linear-gradient(145deg, rgba(52,168,83,0.18), rgba(52,168,83,0.04))", cardGradient: "linear-gradient(135deg,#1a73e8,#34a853 35%,#fbbc04 70%,#ea4335)", accent: "#34a853" },
    { slug: "itunes", name: "iTunes Gift Cards", icon: "🎵", iconImg: "/app/assets/img/itunes-logo.svg", bg: "linear-gradient(145deg, rgba(241,7,163,0.18), rgba(241,7,163,0.04))", cardGradient: "linear-gradient(135deg,#7b2ff7,#f107a3 55%,#ff5c8a)", accent: "#f107a3" },
  ],
};

export const CATEGORY_META: Record<string, { name: string; icon: string; tagline: string }> = {
  subscriptions: { name: "الاشتراكات", icon: "⚡", tagline: "اشتراكات الألعاب والترفيه الرقمي بأفضل الأسعار" },
  "social-media": { name: "السوشال ميديا", icon: "📱", tagline: "خدمات وتطوير حسابات التواصل الاجتماعي المختلفة" },
  design: { name: "البرامج والتطبيقات", icon: "🧩", tagline: "برامج التصميم والتطبيقات الاحترافية بأسعار منافسة" },
  services: { name: "الخدمات", icon: "🛠️", tagline: "حلول وخدمات رقمية، تصاميم وإعلانات احترافية سريعة وموثوقة" },
  games: { name: "الألعاب", icon: "🎮", tagline: "اشتراكات، عملات، وكروت شحن لأشهر منصات الألعاب" },
  "gift-cards": { name: "بطاقات الهدايا", icon: "🎁", tagline: "بطاقات شحن رقمية رسمية معتمدة لأشهر المنصات والمتاجر العالمية بتسليم فوري للأكواد" },
  products: { name: "جميع المنتجات", icon: "🛍️", tagline: "عرض الكتالوج الكامل وعروض متجر GX Store" },
  ai: { name: "الذكاء الاصطناعي", icon: "🤖", tagline: "أقوى أدوات الذكاء الاصطناعي بأسعار حصرية" },
};

export type ResolvedPlan = {
  cartId: string;
  product: string;
  name: string;
  icon: string;
  iconImage?: string | null;
  imageUrl?: string | null;
  bg: string;
  price: number;
  deliveryType?: string | null;
  region?: string | null;
  oldPrice?: number | null;
};

export function findPlanByCartId(cartId: string): ResolvedPlan | null {
  for (const key in PRODUCTS_CATALOG) {
    const p = PRODUCTS_CATALOG[key];
    const all = [...(p.plans || []), ...(p.crewPlans || []), ...(p.vbucksPlans || [])];
    const plan = all.find((pl) => pl.id === cartId);
    if (plan) {
      const img = plan.imageUrl || p.imageUrl || p.iconImg || null;
      return {
        cartId: plan.id,
        product: key,
        name: `${p.name} — ${plan.label}`,
        icon: p.icon,
        iconImage: img,
        imageUrl: img,
        bg: p.thumbBg || "linear-gradient(145deg,#12151e,#0b0d14)",
        price: plan.price,
      };
    }
  }
  for (const platformKey in GIFT_CARDS_CATALOG) {
    const platform = GIFT_CARDS_CATALOG[platformKey];
    for (const region of platform.regions) {
      const denom = region.denominations.find((d) => d.id === cartId);
      if (denom) {
        const img = platform.iconImg || null;
        return {
          cartId: denom.id,
          product: platformKey,
          name: `${platform.name} (${region.name}) — ${denom.value}`,
          icon: platform.icon,
          iconImage: img,
          imageUrl: img,
          bg: platform.cardGradient || "linear-gradient(145deg,#12151e,#0b0d14)",
          price: denom.price,
        };
      }
    }
  }
  return null;
}

export function getProductLink(slug: string): string {
  return `/product/${slug}`;
}

export function getCategoryLink(slug: string): string {
  if (slug === "snapchat") return "/product/snapchat";
  if (slug === "fortnite") return "/product/fortnite";
  if (slug === "products" || slug === "all") return "/products";
  if (slug === "steam") return "/category/pc-games";
  if (["pc-games", "xbox-games", "sony"].includes(slug)) return `/category/${slug}`;
  return `/category/${slug}`;
}

export function getGiftCardLink(slug: string): string {
  return `/product/${slug}`;
}

export type FeaturedItem = {
  cartId: string;
  product: string;
  name: string;
  icon: string;
  bg: string;
  price: number;
  oldPrice: number;
  link: string;
  imageUrl?: string | null;
  iconImage?: string | null;
  badge?: string | null;
  region?: string | null;
  deliveryType?: string | null;
};

export function getFeaturedItems(): FeaturedItem[] {
  return [
    {
      cartId: "snap-6",
      product: "snapchat",
      name: "سناب بلس — 6 أشهر",
      icon: "👻",
      bg: "linear-gradient(145deg,#3a3a10,#14150c)",
      price: 9,
      oldPrice: 14,
      link: "/product/snapchat",
      imageUrl: "/app/assets/img/snapchat-logo.png",
      iconImage: "/app/assets/img/snapchat-logo.png",
    },
    {
      cartId: "fn-crew",
      product: "fortnite",
      name: "فورت نايت كرو — شهر",
      icon: "🪂",
      bg: "linear-gradient(145deg,#0d1a30,#080d18)",
      price: 4,
      oldPrice: 6,
      link: "/product/fortnite#fn-crew",
      imageUrl: "https://cdn1.epicgames.com/offer/fn/FNECO_41-30_August_Crew_Lineup_EGS_Launcher_Blade_1200x1600_1200x1600-911e7061d0aa458aa67d4e5897fcb473",
      iconImage: "/app/assets/img/fortnite-crew-logo.png",
    },
    {
      cartId: "adobe-1",
      product: "adobe",
      name: "أدوبي كرييتف كلاود — اشتراك شهر",
      icon: "🎨",
      bg: "linear-gradient(145deg,#2a0d30,#150818)",
      price: 13,
      oldPrice: 18,
      link: "/product/adobe",
      imageUrl: "/app/assets/img/adobe-cc.webp",
      iconImage: "/app/assets/img/adobe-cc.webp",
    },
    {
      cartId: "red-dead-redemption-2",
      product: "red-dead-redemption-2",
      name: "Red Dead Redemption 2 (RDR2) | كود روكستار (PC)",
      icon: "🎮",
      bg: "linear-gradient(145deg,#10141f,#090c14)",
      price: 13,
      oldPrice: 25,
      link: "/product/red-dead-redemption-2",
      imageUrl: "/app/assets/img/catalog/red-dead-redemption-2.jpg",
      iconImage: "/app/assets/img/catalog/red-dead-redemption-2.jpg",
    },
    {
      cartId: "gemini-18",
      product: "gemini",
      name: "Gemini Pro — 18 شهر",
      icon: "✨",
      bg: "linear-gradient(145deg,#2a1a4a,#0e0820)",
      price: 4,
      oldPrice: 20,
      link: "/product/gemini",
      imageUrl: "/app/assets/img/gemini-logo.svg",
      iconImage: "/app/assets/img/gemini-logo.svg",
    },
    {
      cartId: "fn-vb-2400",
      product: "fortnite",
      name: "فورت نايت — 2400 وحدة V-Bucks",
      icon: "🪂",
      bg: "linear-gradient(145deg,#0d1a30,#080d18)",
      price: 12,
      oldPrice: 16,
      link: "/product/fortnite",
      imageUrl: "/app/assets/img/fortnite-logo.png",
      iconImage: "/app/assets/img/fortnite-logo.png",
    },
    {
      cartId: "snap-3",
      product: "snapchat",
      name: "سناب بلس — 3 أشهر",
      icon: "👻",
      bg: "linear-gradient(145deg,#3a3a10,#14150c)",
      price: 4,
      oldPrice: 7,
      link: "/product/snapchat",
      imageUrl: "/app/assets/img/snapchat-logo.png",
      iconImage: "/app/assets/img/snapchat-logo.png",
    },
    {
      cartId: "fn-vb-800",
      product: "fortnite",
      name: "فورت نايت — 800 وحدة V-Bucks",
      icon: "🪂",
      bg: "linear-gradient(145deg,#0d1a30,#080d18)",
      price: 5,
      oldPrice: 7,
      link: "/product/fortnite",
      imageUrl: "/app/assets/img/fortnite-logo.png",
      iconImage: "/app/assets/img/fortnite-logo.png",
    },
  ];
}
