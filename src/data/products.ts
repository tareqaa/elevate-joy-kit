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
};

export type Feature = { icon: string; title: string; desc: string };

export type Product = {
  slug: string;
  name: string;
  icon: string;
  iconImg?: string;
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
  snapchat: {
    slug: "snapchat",
    name: "سناب بلس",
    icon: "👻",
    thumbBg: "linear-gradient(145deg,#3a3a10,#14150c)",
    category: "اشتراك سناب بلس",
    tagline: "فعّل سناب بلس بأسهل وأسرع طريقة",
    description:
      "اختار المدة المناسبة إلك، حدد عدد الحسابات، وحط يوزر كل حساب — تفعيل رسمي 100% عن طريق خاصية الإهداء داخل سناب شات.",
    identifierLabel: "يوزر السناب شات",
    identifierPlaceholder: "مثال: yazan.q",
    deliveryMethod:
      'منشحنلك الاشتراك مباشرة عن طريق خاصية "إهداء الاشتراك" الرسمية داخل سناب شات — باستخدام يوزرك فقط، من غير ما نطلب باسورد أو نسجل دخول على حسابك.',
    plans: [
      { id: "snap-3", label: "3 أشهر", price: 5, oldPrice: 7, tag: null },
      { id: "snap-6", label: "6 أشهر", price: 9, oldPrice: 14, tag: "الأكثر طلبًا" },
      { id: "snap-12", label: "12 شهر", price: 17, oldPrice: 26, tag: null },
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
    thumbBg: "linear-gradient(145deg,#2a0d30,#150818)",
    category: "البرامج والتطبيقات",
    tagline: "كل تطبيقات Adobe باشتراك واحد",
    description: "فوتوشوب، إليستريتور، بريمير برو، وأكثر — اشتراك رسمي على حسابك الخاص بأفضل سعر.",
    identifierLabel: "إيميل Adobe ID",
    identifierPlaceholder: "example@email.com",
    deliveryMethod: "منفعّلك الاشتراك مباشرة على حساب Adobe ID تبعك عن طريق الإيميل، من غير ما نطلب الباسورد — بترجعلك رسالة تفعيل رسمية من Adobe نفسها.",
    plans: [
      { id: "adobe-1", label: "شهر واحد", price: 5, oldPrice: 8 },
      { id: "adobe-4", label: "4 أشهر", price: 13, oldPrice: 20, tag: "الأكثر طلبًا" },
    ],
    features: [
      { icon: "🖌️", title: "كل تطبيقات Adobe", desc: "فوتوشوب، إليستريتور، بريمير برو، إنديزاين وأكثر من 20 تطبيق بنفس الاشتراك." },
      { icon: "☁️", title: "100 جيجا تخزين سحابي", desc: "احفظ مشاريعك ومصادرك بأمان وارجعلها من أي جهاز تسجل دخول منه." },
      { icon: "🔤", title: "مكتبة Adobe Fonts", desc: "آلاف الخطوط الاحترافية جاهزة للاستخدام المباشر بكل تطبيقاتك." },
      { icon: "🖥️", title: "تفعيل على أكثر من جهاز", desc: "تقدر تستخدم حسابك من الكمبيوتر والموبايل بنفس الوقت." },
    ],
  },
  canva: {
    slug: "canva",
    name: "Canva Pro",
    icon: "🎨",
    iconImg: "/app/assets/img/canva-logo.png",
    thumbBg: "linear-gradient(145deg,#0a3d4d,#062028)",
    category: "البرامج والتطبيقات",
    tagline: "كانفا برو سنة كاملة",
    description: "كل مميزات Canva Pro على حسابك الشخصي — قوالب بريميوم، خلفيات، خطوط، وإزالة الخلفية.",
    identifierLabel: "إيميل حساب Canva",
    identifierPlaceholder: "example@email.com",
    deliveryMethod: "منفعّلك اشتراك Canva Pro مباشرة على حسابك الشخصي — بترسلنا إيميلك بس، وبتوصلك دعوة رسمية من كانفا للانضمام.",
    plans: [{ id: "canva-12", label: "12 شهر", price: 2, oldPrice: 4, tag: "الأفضل قيمة" }],
    features: [
      { icon: "✨", title: "قوالب بريميوم", desc: "وصول كامل لأكثر من 100 مليون قالب وصورة وفيديو بريميوم." },
      { icon: "🪄", title: "إزالة الخلفية بضغطة", desc: "أداة Background Remover الاحترافية جاهزة داخل التطبيق." },
      { icon: "🔤", title: "مكتبة خطوط ضخمة", desc: "آلاف الخطوط الاحترافية بما فيها العربي والإنجليزي." },
      { icon: "☁️", title: "1 تيرا تخزين سحابي", desc: "احفظ كل تصاميمك ومشاريعك بأمان ومساحة كبيرة." },
    ],
  },
  linkedin: {
    slug: "linkedin",
    name: "LinkedIn Premium Business",
    icon: "💼",
    iconImg: "/app/assets/img/linkedin-logo.png",
    thumbBg: "linear-gradient(145deg,#082a4a,#03101e)",
    category: "البرامج والتطبيقات",
    tagline: "لينكدإن بريميوم بزنس سنة كاملة",
    description: "وصول InMail، رؤى تفصيلية للشركات، ودورات LinkedIn Learning على حسابك الشخصي.",
    identifierLabel: "إيميل حساب LinkedIn",
    identifierPlaceholder: "example@email.com",
    deliveryMethod: "منفعّلك اشتراك LinkedIn Premium (Business) على حسابك الشخصي مباشرة — كل الي نحتاجه إيميلك المسجّل باللينكدإن.",
    plans: [{ id: "linkedin-12", label: "12 شهر", price: 75, oldPrice: 120 }],
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
    thumbBg: "linear-gradient(145deg,#2a1a4a,#0e0820)",
    category: "الذكاء الاصطناعي",
    tagline: "Gemini Pro سنة ونص",
    description: "الوصول لنماذج Gemini Advanced، حدود استخدام أعلى، وتكامل مع تطبيقات Google — كله على حسابك الشخصي.",
    identifierLabel: "إيميل حساب Google",
    identifierPlaceholder: "example@gmail.com",
    deliveryMethod: "منرسلك رابط تفعيل (Activation Link) لحساب Google الشخصي تبعك، بتضغط عليه وبينفعّل الاشتراك مباشرة بدون ما نطلب الباسورد.",
    plans: [{ id: "gemini-18", label: "18 شهر", price: 8, oldPrice: 20, tag: "الأفضل قيمة" }],
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
    iconImg: "/app/assets/img/windows-logo.svg",
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
    thumbBg: "linear-gradient(145deg,#0d1a30,#080d18)",
    category: "الألعاب",
    tagline: "كرو شهري ورصيد V-Bucks يوصلك فورًا",
    description: "اشترك بالـ Crew الشهري أو اشحن رصيد V-Bucks مباشرة على حساب Epic Games تبعك.",
    delivery: {
      intro: "بعد تأكيد طلبك، رح نحتاج منك المعلومات التالية عشان نفعّل الكرو أو نشحن الرصيد مباشرة على حسابك:",
      requirements: [
        "إيميل وباسورد حساب Epic Games",
        "كود التحقق (2FA) إذا طلب منك أثناء الدخول",
        "كون مسجّل خروج من فورت نايت، وما تسجّل دخول لحسابك لين نخلّص الطلب",
      ],
      safety: [
        "شحن رسمي 100% عبر طرق دفع معتمدة",
        "استخدمناها بآلاف الطلبات الناجحة",
        "صفر مخاطرة حظر (بان) على حسابك",
        "بيانات الدخول تنحذف نهائيًا فور إتمام الطلب",
      ],
      platformNotes: [
        "الكمية المختارة من V-Bucks بتنضاف مباشرة لحسابك",
        "بيشتغل على كل المنصات (PC، بلايستيشن، إكسبوكس) ما عدا Nintendo Switch",
        "بيشتغل لكل مناطق العالم",
      ],
    },
    crewPlans: [
      { id: "fn-crew", label: "Fortnite Crew — شهر", price: 4, oldPrice: 6, tag: "يشمل V-Bucks شهرية" },
      { id: "fn-crew-3", label: "Fortnite Crew — 3 أشهر", price: 9, oldPrice: 12 },
    ],
    vbucksPlans: [
      { id: "fn-vb-800", label: "800 وحدة V-Bucks", price: 5, oldPrice: 7 },
      { id: "fn-vb-2400", label: "2400 وحدة V-Bucks", price: 12, oldPrice: 16 },
      { id: "fn-vb-4500", label: "4500 وحدة V-Bucks", price: 19, oldPrice: 25 },
      { id: "fn-vb-12500", label: "12500 وحدة V-Bucks", price: 38, oldPrice: 49 },
    ],
    features: [
      { icon: "🎽", title: "طقم Crew Pack حصري شهريًا", desc: "تشكيلة (Outfit) حصرية مع إكسسواراتها تتجدد كل شهر، وما بتنباع بشكل منفصل بأي مكان تاني." },
      { icon: "🎫", title: "Battle Pass الموسم الحالي", desc: "يشمل اشتراكك Battle Pass الموسم الحالي تلقائيًا طول ما اشتراكك فعّال." },
      { icon: "🪙", title: "1000 وحدة V-Bucks شهريًا", desc: "رصيد V-Bucks بينضاف لحسابك كل شهر طول فترة الاشتراك، تصرفه على أي شي بالمتجر." },
    ],
  },
};

export type Denomination = { id: string; value: string; price: number };
export type Region = { code: string; flag: string; name: string; denominations: Denomination[] };
export type GiftCard = {
  name: string;
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
    iconImg: "/app/assets/img/playstation-logo.png",
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
        { id: "psn-ae-10", value: "10$", price: 8 },
        { id: "psn-ae-20", value: "20$", price: 15 },
        { id: "psn-ae-50", value: "50$", price: 37 },
        { id: "psn-ae-60", value: "60$", price: 44 },
        { id: "psn-ae-100", value: "100$", price: 71 },
      ]},
      { code: "sa", flag: "🇸🇦", name: "السعودية (KSA)", denominations: [
        { id: "psn-sa-10", value: "10$", price: 8 },
        { id: "psn-sa-20", value: "20$", price: 16 },
        { id: "psn-sa-50", value: "50$", price: 38 },
        { id: "psn-sa-60", value: "60$", price: 45 },
        { id: "psn-sa-100", value: "100$", price: 72 },
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
    iconImg: "/app/assets/img/itunes-logo.png",
    accent: "#f107a3",
    cardGradient: "linear-gradient(135deg,#7b2ff7,#f107a3 55%,#ff5c8a)",
    regions: [
      { code: "tr", flag: "🇹🇷", name: "تركيا (Turkey)", denominations: [
        { id: "itunes-tr-100", value: "100 TRY", price: 2.22 },
        { id: "itunes-tr-200", value: "200 TRY", price: 3.90 },
        { id: "itunes-tr-300", value: "300 TRY", price: 5.46 },
        { id: "itunes-tr-500", value: "500 TRY", price: 8.99 },
        { id: "itunes-tr-1000", value: "1000 TRY", price: 17.38 },
      ]},
    ],
  },
};

export type CategoryLink = {
  slug: string;
  name: string;
  icon: string;
  type: "direct" | "group";
  accent: string;
  bg: string;
  desc: string;
};

export const CATEGORY_LINKS: CategoryLink[] = [
  { slug: "snapchat", name: "سناب بلس", icon: "👻", type: "direct", accent: "#FFCB47", bg: "linear-gradient(145deg, rgba(255,203,71,0.18), rgba(255,203,71,0.04))", desc: "أيقونة حصرية، ألوان دردشة، وأكثر" },
  { slug: "design", name: "البرامج والتطبيقات", icon: "🧩", type: "group", accent: "#C6FF3D", bg: "linear-gradient(145deg, rgba(198,255,61,0.16), rgba(198,255,61,0.04))", desc: "Adobe، Canva، Microsoft 365، Autodesk وأكثر" },
  { slug: "ai", name: "الذكاء الاصطناعي", icon: "🤖", type: "group", accent: "#b26bff", bg: "linear-gradient(145deg, rgba(178,107,255,0.18), rgba(178,107,255,0.04))", desc: "اشتراكات Gemini Pro وأدوات AI الأخرى" },
  { slug: "games", name: "الألعاب", icon: "🎮", type: "group", accent: "#00E5FF", bg: "linear-gradient(145deg, rgba(0,229,255,0.16), rgba(0,229,255,0.04))", desc: "فورت نايت، بلايستيشن، إكسبوكس" },
  { slug: "gift-cards", name: "بطاقات الهدايا", icon: "🎁", type: "group", accent: "#FF2D78", bg: "linear-gradient(145deg, rgba(255,45,120,0.16), rgba(255,45,120,0.04))", desc: "PlayStation، Xbox، Google Play، iTunes" },
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
  design: [
    { slug: "adobe", product: "adobe", name: "Adobe Creative Cloud", icon: "🎨", iconImg: "/app/assets/img/adobe-cc.webp", bg: "linear-gradient(145deg,#2a0d30,#150818)" },
    { slug: "canva", product: "canva", name: "Canva Pro", icon: "🎨", iconImg: "/app/assets/img/canva-logo.png", bg: "linear-gradient(145deg,#1a2f6b,#0a1230)" },
    { slug: "microsoft365", product: "microsoft365", name: "Microsoft 365", icon: "🅼", iconImg: "/app/assets/img/microsoft365-logo.svg", bg: "linear-gradient(145deg,#3a1208,#180804)" },
    { slug: "windows", product: "windows", name: "تفعيل ويندوز", icon: "🪟", iconImg: "/app/assets/img/windows-logo.svg", bg: "linear-gradient(145deg,#0a2540,#04101c)" },
    { slug: "autodesk", product: "autodesk", name: "Autodesk", icon: "📐", iconImg: "/app/assets/img/autodesk-logo.svg", bg: "linear-gradient(145deg,#2a1a10,#140a05)" },
    { slug: "linkedin", product: "linkedin", name: "LinkedIn Premium", icon: "💼", iconImg: "/app/assets/img/linkedin-logo.png", bg: "linear-gradient(145deg,#3a2b08,#1a1305)" },
  ],
  ai: [
    { slug: "gemini", product: "gemini", name: "Gemini Pro", icon: "✨", iconImg: "/app/assets/img/gemini-logo.svg", bg: "linear-gradient(145deg,#2a1a4a,#0e0820)" },
  ],
  games: [
    { slug: "fortnite", product: "fortnite", name: "فورت نايت", icon: "🪂", iconImg: "/app/assets/img/fortnite-logo.png", bg: "linear-gradient(145deg,#0d1a30,#080d18)" },
    { slug: "steam", product: null, name: "ألعاب Steam", icon: "🎮", iconImg: "/app/assets/img/steam-logo.svg", bg: "linear-gradient(145deg,#101a24,#05090d)", comingSoon: true },
    { slug: "sony", product: null, name: "ألعاب بلايستيشن", icon: "🎮", iconImg: "/app/assets/img/playstation-logo.png", bg: "linear-gradient(145deg,#0d1430,#080a18)", comingSoon: true },
    { slug: "xbox", product: null, name: "ألعاب إكسبوكس", icon: "🕹️", iconImg: "/app/assets/img/xbox-logo.svg", bg: "linear-gradient(145deg,#0d2a1a,#081510)", comingSoon: true },
  ],
  "gift-cards": [
    { slug: "playstation", name: "PlayStation Gift Cards", icon: "🎮", iconImg: "/app/assets/img/playstation-logo.png", bg: "linear-gradient(145deg, rgba(0,163,255,0.18), rgba(0,163,255,0.04))", cardGradient: "linear-gradient(135deg,#0a3d91,#0066cc 45%,#00a3ff)", accent: "#00a3ff" },
    { slug: "xbox", name: "Xbox Gift Cards", icon: "🕹️", iconImg: "/app/assets/img/xbox-logo.svg", bg: "linear-gradient(145deg, rgba(79,220,79,0.18), rgba(79,220,79,0.04))", cardGradient: "linear-gradient(135deg,#0e4d0e,#107c10 45%,#4fdc4f)", accent: "#4fdc4f" },
    { slug: "google-play", name: "Google Play Gift Cards", icon: "▶️", iconImg: "/app/assets/img/googleplay-logo.png", bg: "linear-gradient(145deg, rgba(52,168,83,0.18), rgba(52,168,83,0.04))", cardGradient: "linear-gradient(135deg,#1a73e8,#34a853 35%,#fbbc04 70%,#ea4335)", accent: "#34a853" },
    { slug: "itunes", name: "iTunes Gift Cards", icon: "🎵", iconImg: "/app/assets/img/itunes-logo.png", bg: "linear-gradient(145deg, rgba(241,7,163,0.18), rgba(241,7,163,0.04))", cardGradient: "linear-gradient(135deg,#7b2ff7,#f107a3 55%,#ff5c8a)", accent: "#f107a3" },
  ],
};

export const CATEGORY_META: Record<string, { name: string; icon: string; tagline: string }> = {
  design: { name: "البرامج والتطبيقات", icon: "🧩", tagline: "برامج التصميم والتطبيقات الاحترافية بأسعار منافسة" },
  ai: { name: "الذكاء الاصطناعي", icon: "🤖", tagline: "أقوى أدوات الذكاء الاصطناعي بأسعار حصرية" },
  games: { name: "الألعاب", icon: "🎮", tagline: "اشتراكات، عملات، وكروت شحن لأشهر منصات الألعاب" },
  "gift-cards": { name: "بطاقات الهدايا", icon: "🎁", tagline: "بطاقات شحن رقمية لأشهر المنصات — القيم والأسعار قريبًا" },
};

export type ResolvedPlan = {
  cartId: string;
  product: string;
  name: string;
  icon: string;
  bg: string;
  price: number;
};

export function findPlanByCartId(cartId: string): ResolvedPlan | null {
  for (const key in PRODUCTS_CATALOG) {
    const p = PRODUCTS_CATALOG[key];
    const all = [...(p.plans || []), ...(p.crewPlans || []), ...(p.vbucksPlans || [])];
    const plan = all.find((pl) => pl.id === cartId);
    if (plan) {
      return { cartId: plan.id, product: key, name: `${p.name} — ${plan.label}`, icon: p.icon, bg: p.thumbBg, price: plan.price };
    }
  }
  for (const platformKey in GIFT_CARDS_CATALOG) {
    const platform = GIFT_CARDS_CATALOG[platformKey];
    for (const region of platform.regions) {
      const denom = region.denominations.find((d) => d.id === cartId);
      if (denom) {
        return { cartId: denom.id, product: platformKey, name: `${platform.name} (${region.name}) — ${denom.value}`, icon: platform.icon, bg: platform.cardGradient, price: denom.price };
      }
    }
  }
  return null;
}

export function getProductLink(slug: string): string {
  if (slug === "snapchat") return "/snapchat";
  if (slug === "fortnite") return "/games/fortnite";
  if (slug === "gemini") return "/ai/gemini";
  return `/design/${slug}`;
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
};

export function getFeaturedItems(): FeaturedItem[] {
  const picks: { product: string; planId: string }[] = [
    { product: "snapchat", planId: "snap-6" },
    { product: "adobe", planId: "adobe-4" },
    { product: "fortnite", planId: "fn-crew" },
    { product: "fortnite", planId: "fn-vb-2400" },
    { product: "snapchat", planId: "snap-3" },
    { product: "fortnite", planId: "fn-vb-800" },
  ];
  return picks
    .map(({ product, planId }) => {
      const p = PRODUCTS_CATALOG[product];
      const all = [...(p.plans || []), ...(p.crewPlans || []), ...(p.vbucksPlans || [])];
      const plan = all.find((pl) => pl.id === planId);
      if (!plan || !plan.oldPrice) return null;
      return {
        cartId: plan.id,
        product,
        name: `${p.name} — ${plan.label}`,
        icon: p.icon,
        bg: p.thumbBg,
        price: plan.price,
        oldPrice: plan.oldPrice,
        link: getProductLink(product),
      };
    })
    .filter((x): x is FeaturedItem => x !== null);
}
