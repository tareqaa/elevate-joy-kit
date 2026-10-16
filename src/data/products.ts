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
    tagline: "كل تطبيقات Adobe باشتراك واحد",
    description: "فوتوشوب، إليستريتور، بريمير برو، وأكثر — اشتراك رسمي على حسابك الخاص بأفضل سعر.",
    identifierLabel: "إيميل Adobe ID",
    identifierPlaceholder: "example@email.com",
    deliveryMethod: "منفعّلك الاشتراك مباشرة على حساب Adobe ID تبعك عن طريق الإيميل، من غير ما نطلب الباسورد — بترجعلك رسالة تفعيل رسمية من Adobe نفسها.",
    plans: [
      { id: "adobe-1", label: "شهر واحد", price: 10, oldPrice: 15 },
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
    imageUrl: "/app/assets/img/canva-logo.png",
    thumbBg: "#12151e",
    category: "البرامج والتطبيقات",
    tagline: "كانفا برو — اشتراك رسمي سنوي",
    description: "كل مميزات Canva Pro على حسابك الشخصي — قوالب بريميوم، أكثر من 100 مليون صورة وفيديو، آلاف الخطوط الاحترافية، وأداة إزالة الخلفية بضغطة زر.",
    identifierLabel: "إيميل حساب Canva",
    identifierPlaceholder: "example@email.com",
    deliveryMethod: "منفعّلك اشتراك Canva Pro مباشرة على حسابك الشخصي — بترسلنا إيميلك فقط، وبتوصلك دعوة تفعيل رسمية من كانفا مباشرة.",
    plans: [
      { id: "canva-12", label: "12 شهر (سنة كاملة)", price: 2, oldPrice: 5, tag: "الأكثر طلبًا" },
    ],
    features: [
      { icon: "✨", title: "مكتبة بريميوم كاملة", desc: "وصول غير محدود لأكثر من 100 مليون قالب، صورة، فيديو، ورسم توضيحي بجودة فائقة." },
      { icon: "🪄", title: "إزالة الخلفية السحرية", desc: "أداة Background Remover وممحاة العناصر بالذكاء الاصطناعي بضغطة زر واحدة." },
      { icon: "🔤", title: "آلاف الخطوط وألوان العلامة", desc: "تحميل خطوطك الخاصة وحفظ هوية علامتك التجارية مع Brand Kit كامل." },
      { icon: "☁️", title: "1 تيرا تخزين سحابي", desc: "مساحة سحابية ضخمة لحفظ وتنظيم كل مشاريعك ومشاركتها مع فريقك بسهولة." },
      { icon: "📐", title: "تغيير الحجم السحري Magic Resize", desc: "تحويل التصميم بضغطة واحدة ليناسب إنستغرام، تيك توك، يوتيوب، وباقي المنصات فوراً." },
    ],
  },
  linkedin: {
    slug: "linkedin",
    name: "LinkedIn Premium Business",
    icon: "💼",
    iconImg: "/app/assets/img/linkedin-logo.svg",
    imageUrl: "/app/assets/img/linkedin-logo.svg",
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
    tagline: "اشتراك أدوبي إكسبرس بريميوم 3 أشهر — كود رقمي أصلي وتفعيل رسمي بدون فيزا",
    description:
      "احصل على اشتراك Adobe Express Premium لمدة 3 أشهر عبر كود تفعيل رقمي أصلي 100%. يتيح لك تصميم منشورات السوشال ميديا، الفيديوهات، واستخدام أدوات الذكاء الاصطناعي بكل سهولة.\n\nالمواصفات والشروط:\n• كود رقمي أصلي (Digital Key).\n• مدة الاشتراك: 3 أشهر.\n• لا يتطلب أي وسيلة دفع أو بطاقة بنكية للتفعيل (No payment method required).\n• رابط التفعيل الرسمي: redeem.adobe.com\n• يعمل فقط على الحسابات التي لا تحتوي على أي اشتراك أدوبي نشط أو سابق.\n• يجب تفعيل الكود خلال 3 أيام من الشراء لضمان صلاحيته.",
    identifierLabel: "حساب أدوبي",
    identifierPlaceholder: "example@gmail.com",
    deliveryMethod: "يوصلك كود رقمي أصلي فوراً مع رابط التفعيل الرسمي redeem.adobe.com، وتفعله بدون الحاجة لأي بطاقة دفع.",
    plans: [
      { id: "adobe-express-3m", label: "3 أشهر (كود رقمي)", price: 4, oldPrice: 15, tag: "عرض خاص" },
    ],
    features: [
      { icon: "🎨", title: "تصاميم وفيديوهات احترافية", desc: "آلاف القوالب الحصرية لمنشورات السوشال ميديا، الفيديوهات والشعارات." },
      { icon: "✨", title: "Adobe Firefly AI", desc: "أقوى أدوات الذكاء الاصطناعي لتوليد الصور وتعديل العناصر بضغطة زر." },
      { icon: "🔑", title: "كود رقمي بدون فيزا", desc: "تفعيل مباشر عبر redeem.adobe.com دون الحاجة لإدخال أي بطاقة بنكية." },
      { icon: "⏳", title: "صلاحية 3 أيام", desc: "يجب استخدام الكود وتفعيله خلال 3 أيام من الشراء على حساب جديد." },
    ],
  },
  "notion-business": {
    slug: "notion-business",
    name: "Notion Business",
    nameAr: "Notion Business | اشتراك 3 أشهر مع 300 رصيد شهرياً (كود رقمي)",
    icon: "📝",
    iconImg: "/app/assets/img/catalog/notion.svg",
    imageUrl: "/app/assets/img/catalog/notion.jpg",
    thumbBg: "linear-gradient(145deg, #1f232b, #0f1115)",
    category: "البرامج والتطبيقات",
    categoryAr: "البرامج والتطبيقات",
    tagline: "نوشن بزنس 3 أشهر مع 300 رصيد شهرياً — كود رسمي لإدارة الفرق والمشاريع",
    description:
      "اشتراك Notion Business المتقدم لمدة 3 أشهر مع 300 رصيد (Credits) شهرياً عبر كود رسمي. يساعدك في تنظيم المشاريع، إدارة مهام العمل والفرق، وتوثيق الملاحظات وقواعد البيانات باحترافية وسرعة فائقة.\n\nالمواصفات والشروط:\n• كود رسمي (Key) أصلي ومضمون.\n• مدة الاشتراك: 3 أشهر مع 300 رصيد شهرياً (300 Credits per month).\n• يتطلب إضافة بطاقة دفع صالحة (فيزا / ماستركارد) في حسابك لإتمام التفعيل.\n• يجب استخدام الكود خلال 24 ساعة من تاريخ الشراء لضمان سريانه.",
    identifierLabel: "حساب Notion",
    identifierPlaceholder: "user@notion.so",
    deliveryMethod: "يوصلك الكود الرقمي لتطبيقه في إعدادات مساحة العمل في Notion مع ربط بطاقة بنكية صالحة لإتمام التفعيل.",
    plans: [
      { id: "notion-biz-3m", label: "3 أشهر (300 كريدت شهرياً)", price: 9, oldPrice: 30, tag: "300 رصيد شهرياً" },
    ],
    features: [
      { icon: "👥", title: "مساحات عمل جماعية متقدمة", desc: "أدوات مخصصة للفرق، صلاحيات متقدمة، وتحليلات المشاريع." },
      { icon: "💎", title: "300 رصيد شهرياً", desc: "يشمل 300 كريدت كل شهر لاستخدام الذكاء الاصطناعي والمميزات المتقدمة." },
      { icon: "💳", title: "يتطلب بطاقة صالحة", desc: "يلزم ربط بطاقة بنكية نشطة بالحساب لإتمام وتأكيد تفعيل الكود." },
      { icon: "⚡", title: "استخدام خلال 24 ساعة", desc: "يجب تفعيل الكود واستخدامه خلال 24 ساعة من استلامه." },
    ],
  },
  "adobe-acrobat-standard": {
    slug: "adobe-acrobat-standard",
    name: "Adobe Acrobat Standard 2026",
    nameAr: "Adobe Acrobat Standard 2026 (Global) | جهازين 3 أشهر (كود رقمي)",
    icon: "📕",
    iconImg: "/app/assets/img/catalog/adobe-acrobat.svg",
    imageUrl: "/app/assets/img/catalog/adobe-acrobat.jpg",
    thumbBg: "linear-gradient(145deg, #3a000d, #1a0005)",
    category: "البرامج والتطبيقات",
    categoryAr: "البرامج والتطبيقات",
    tagline: "أدوبي أكروبات ستاندرد 2026 لجهازين 3 أشهر — كود أصلي بدون فيزا",
    description:
      "برنامج Adobe Acrobat Standard 2026 العالمي الرسمي للتعامل مع ملفات PDF وتعديلها وتحويلها وتوقيعها إلكترونياً باحترافية.\n\nالمواصفات والشروط:\n• كود رقمي أصلي (Digital Key).\n• مدة الاشتراك: 3 أشهر كاملة.\n• يعمل على جهازين بالتزامن (2 Devices): PC / Mac / Android / iOS.\n• تفعيل رسمي ومباشر عبر صفحة أدوبي: redeem.adobe.com\n• لا يتطلب أي بطاقة دفع أو بيانات بنكية للتفعيل.\n• نسخة عالمية (Global) صالحة لكافة الدول.",
    identifierLabel: "حساب أدوبي",
    identifierPlaceholder: "example@gmail.com",
    deliveryMethod: "كود رقمي يوصلك فوراً وتفعله على حسابك في redeem.adobe.com ويعمل على جهازين بدون أي فيزا.",
    plans: [
      { id: "acrobat-std-3m", label: "3 أشهر (جهازين PC/Mac/Mobile)", price: 12, oldPrice: 40, tag: "جهازين" },
    ],
    features: [
      { icon: "📑", title: "تعديل وتحويل PDF كامل", desc: "تعديل النصوص والصور في ملفات PDF وتحويلها إلى Word وإكسل بدقة عالية." },
      { icon: "💻", title: "يعمل على جهازين", desc: "تفعيل رسمي يدعم جهازين بنفس الوقت على ويندوز، ماك، آيفون، وأندرويد." },
      { icon: "🔒", title: "بدون بطاقة بنكية", desc: "تفعيل مباشر عبر redeem.adobe.com لا يحتاج لإدخال بطاقة فيزا نهائياً." },
      { icon: "🌍", title: "عالمي Global", desc: "نسخة رسمية عالمية صالحة للعمل في كافة البلدان بدون قيود." },
    ],
  },
  headspace: {
    slug: "headspace",
    name: "Headspace",
    nameAr: "Headspace | اشتراك 4 أشهر بريميوم (رابط تفعيل رسمي)",
    icon: "🧘",
    iconImg: "/app/assets/img/catalog/headspace.svg",
    imageUrl: "/app/assets/img/catalog/headspace.jpg",
    thumbBg: "linear-gradient(145deg, #1e2340, #0f1122)",
    category: "الاشتراكات",
    categoryAr: "الاشتراكات",
    tagline: "تطبيق التأمل والنوم الشهير 4 أشهر بريميوم — بدينار واحد فقط عبر رابط تفعيل",
    description:
      "تطبيق التأمل والنوم والتركيز العالمي الشهير Headspace باشتراك 4 أشهر كاملة بريميوم بسعر دينار واحد فقط!\n\nالمواصفات والشروط:\n• مدة الاشتراك: 4 أشهر كاملة بريميوم.\n• طريقة التسليم: رابط تفعيل رسمي ومباشر (Redeem Link).\n• السعر الخيالي: 1 دينار فقط.\n• يدعم كافة الأجهزة: iOS / Android / Web.\n• يتيح الوصول الكامل لكافة جلسات التأمل، تمارين النوم، والموسيقى المركزة.",
    identifierLabel: "البريد الإلكتروني",
    identifierPlaceholder: "name@example.com",
    deliveryMethod: "يوصلك رابط تفعيل رسمي مباشر، تفتحه وتسجل دخول بحسابك ويتفعل الـ 4 أشهر بريميوم فوراً.",
    plans: [
      { id: "headspace-4m", label: "4 أشهر بريميوم (رابط تفعيل)", price: 1, oldPrice: 18, tag: "صيد اليوم (1 د.أ)" },
    ],
    features: [
      { icon: "🌙", title: "تمارين نوم واسترخاء Sleepcasts", desc: "أصوات طبيعية وقصص مهدئة تساعدك على النوم العميق والسريع." },
      { icon: "🧘‍♂️", title: "مئات جلسات التأمل", desc: "جلسات تأمل يومية لتقليل التوتر والقلق وتحسين الصحة النفسية." },
      { icon: "🎧", title: "موسيقى تركيز Focus Music", desc: "موسيقى علمية مصممة لمساعدتك على العمل والدراسة بتركيز عالي." },
      { icon: "🔗", title: "تفعيل فوري برابط", desc: "رابط تفعيل رسمي مباشر بدون تعقيدات وبدينار واحد فقط." },
    ],
  },
  nordvpn: {
    slug: "nordvpn",
    name: "NordVPN",
    nameAr: "NordVPN | اشتراك 3 أشهر لـ 10 أجهزة بدون بطاقة دفع",
    icon: "🌐",
    iconImg: "/app/assets/img/catalog/nordvpn.svg",
    imageUrl: "/app/assets/img/catalog/nordvpn.jpg",
    thumbBg: "linear-gradient(145deg, #0f2b5c, #071329)",
    category: "الاشتراكات",
    categoryAr: "الاشتراكات",
    tagline: "نورد في بي ان 3 أشهر لـ 10 أجهزة — أسرع VPN عالمي بدون بطاقة دفع",
    description:
      "اشتراك NordVPN الرسمي الأقوى عالمياً في الأمان والسرعة والتشفير لمدة 3 أشهر، يعمل على 10 أجهزة وبدون أي حاجة لبطاقة بنكية!\n\nالمواصفات والشروط:\n• مدة الاشتراك: 3 أشهر كاملة.\n• يعمل على 10 أجهزة في وقت واحد (10 Simultaneous Devices).\n• لا حاجة لبطاقة دفع أو فيزا للتفعيل (No payment methods required).\n• متوافق مع: Windows / Mac / iOS / Android / Linux / Android TV.\n• سيرفرات فائقة السرعة مع حماية من التتبع والإعلانات (Threat Protection).",
    identifierLabel: "البريد الإلكتروني",
    identifierPlaceholder: "user@gmail.com",
    deliveryMethod: "بيانات تفعيل رسمية توصلك فوراً لتسجيل الدخول في تطبيق NordVPN على حتى 10 أجهزة دون الحاجة لفيزا.",
    plans: [
      { id: "nordvpn-3m", label: "3 أشهر (10 أجهزة)", price: 6, oldPrice: 24, tag: "10 أجهزة بالتزامن" },
    ],
    features: [
      { icon: "🚀", title: "سرعات فائقة وثبات عالي", desc: "أكثر من 6000 سيرفر سريع ومستقر حول العالم لتصفح بدون أي بطء." },
      { icon: "📱", title: "حماية 10 أجهزة", desc: "استخدم الاشتراك على الكمبيوتر، اللابتوب، التلفزيون، والموبايلات بنفس الوقت." },
      { icon: "🛡️", title: "Threat Protection", desc: "حجب الإعلانات المزعجة، المواقع المشبوهة، والبرمجيات الخبيثة تلقائياً." },
      { icon: "💳", title: "بدون أي بطاقة بنكية", desc: "لا حاجة لربط فيزا أو بطاقة دفع، استمتع بالحماية مباشرة." },
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
    iconImg: "/app/assets/img/itunes-logo.svg",
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
  nameEn?: string;
  icon: string;
  type: "direct" | "group";
  accent: string;
  bg: string;
  desc: string;
  descEn?: string;
};

export const CATEGORY_LINKS: CategoryLink[] = [
  { slug: "subscriptions", name: "الاشتراكات", nameEn: "Subscriptions", icon: "⚡", type: "group", accent: "#8b5cf6", bg: "linear-gradient(145deg, rgba(139,92,246,0.18), rgba(139,92,246,0.04))", desc: "", descEn: "" },
  { slug: "social-media", name: "السوشال ميديا", nameEn: "Social Media", icon: "📱", type: "group", accent: "#0088ff", bg: "linear-gradient(145deg, rgba(0,136,255,0.18), rgba(0,136,255,0.04))", desc: "", descEn: "" },
  { slug: "design", name: "البرامج والتطبيقات", nameEn: "Apps & Software", icon: "🧩", type: "group", accent: "#00e5ff", bg: "linear-gradient(145deg, rgba(0,229,255,0.16), rgba(0,229,255,0.04))", desc: "", descEn: "" },
  { slug: "games", name: "الألعاب", nameEn: "Games", icon: "🎮", type: "group", accent: "#05df72", bg: "linear-gradient(145deg, rgba(5,223,114,0.18), rgba(5,223,114,0.04))", desc: "", descEn: "" },
  { slug: "gift-cards", name: "بطاقات الهدايا", nameEn: "Gift Cards", icon: "🎁", type: "group", accent: "#ff2d78", bg: "linear-gradient(145deg, rgba(255,45,120,0.16), rgba(255,45,120,0.04))", desc: "بطاقات شحن رقمية وتسليم فوري", descEn: "Digital Gift Cards & Instant Top-ups" },
  { slug: "products", name: "جميع المنتجات", nameEn: "All Products", icon: "🛍️", type: "direct", accent: "#00e5ff", bg: "linear-gradient(135deg, rgba(0, 112, 240, 0.95), rgba(0, 229, 255, 0.9))", desc: "عرض الكتالوج الكامل والعروض", descEn: "View Full Store Catalog & Deals" },
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
    { slug: "headspace", product: "headspace", name: "Headspace", icon: "🧘", iconImg: "/app/assets/img/catalog/headspace.svg", bg: "linear-gradient(145deg,#1e2340,#0f1122)" },
    { slug: "nordvpn", product: "nordvpn", name: "NordVPN", icon: "🌐", iconImg: "/app/assets/img/catalog/nordvpn.svg", bg: "linear-gradient(145deg,#0f2b5c,#071329)" },
  ],
  "social-media": [],
  design: [
    { slug: "adobe-express", product: "adobe-express", name: "Adobe Express", icon: "🎨", iconImg: "/app/assets/img/catalog/adobe-express.svg", bg: "linear-gradient(145deg,#2b1145,#12061f)" },
    { slug: "notion-business", product: "notion-business", name: "Notion Business", icon: "📝", iconImg: "/app/assets/img/catalog/notion.svg", bg: "linear-gradient(145deg,#1f232b,#0f1115)" },
    { slug: "adobe-acrobat-standard", product: "adobe-acrobat-standard", name: "Adobe Acrobat Standard 2026", icon: "📕", iconImg: "/app/assets/img/catalog/adobe-acrobat.svg", bg: "linear-gradient(145deg,#3a000d,#1a0005)" },
    { slug: "adobe", product: "adobe", name: "Adobe Creative Cloud", icon: "🎨", iconImg: "/app/assets/img/adobe-cc.webp", bg: "#12151e" },
    { slug: "canva", product: "canva", name: "Canva Pro", icon: "🎨", iconImg: "/app/assets/img/canva-logo.png", bg: "linear-gradient(145deg,#1a2f6b,#0a1230)" },
    { slug: "microsoft365", product: "microsoft365", name: "Microsoft 365", icon: "🅼", iconImg: "/app/assets/img/microsoft365-logo.svg", bg: "linear-gradient(145deg,#3a1208,#180804)" },
    { slug: "windows", product: "windows", name: "تفعيل ويندوز", icon: "🪟", iconImg: "/app/assets/img/windows-icon.svg", bg: "linear-gradient(145deg,#0a2540,#04101c)" },
    { slug: "autodesk", product: "autodesk", name: "Autodesk", icon: "📐", iconImg: "/app/assets/img/autodesk-logo.svg", bg: "linear-gradient(145deg,#2a1a10,#140a05)" },
    { slug: "linkedin", product: "linkedin", name: "LinkedIn Premium", icon: "💼", iconImg: "/app/assets/img/linkedin-logo.svg", bg: "linear-gradient(145deg,#3a2b08,#1a1305)" },
  ],
  games: [
    { slug: "fortnite", product: "fortnite", name: "فورت نايت", icon: "🪂", iconImg: "/app/assets/img/fortnite-logo.png", bg: "linear-gradient(145deg,#0d1a30,#080d18)" },
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
      price: 10,
      oldPrice: 15,
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
