/* ============================================================
   GX STORE — PRODUCT CATALOG (shared data)
   Every price is stored in JOD (base currency) and converted
   on render via GXCurrency.format().

   SITE STRUCTURE:
   - Top-level categories shown on the homepage (CATEGORY_LINKS).
     A category is either:
       type:'direct'  -> its card links straight to a product page
                          (e.g. Snapchat)
       type:'group'   -> its card links to a category landing page
                          that lists subcategories (e.g. Games)
   - Subcategories (SUBCATEGORIES) belong to a group category and
     either link to a real product page, or are marked comingSoon.
   - PRODUCTS_CATALOG holds the actual sellable plans for every
     product page (keyed by product slug, used in the URL).

   To add a new subcategory later: add it to SUBCATEGORIES, and if
   it sells anything, add a matching entry to PRODUCTS_CATALOG plus
   a thin page shell under its folder.
   ============================================================ */

const PRODUCTS_CATALOG = {

  snapchat: {
    slug:'snapchat',
    name:'سناب بلس',
    icon:'👻',
    thumbBg:'linear-gradient(145deg,#3a3a10,#14150c)',
    category:'اشتراك سناب بلس',
    tagline:'فعّل سناب بلس بأسهل وأسرع طريقة',
    description:'اختار المدة المناسبة إلك، حدد عدد الحسابات، وحط يوزر كل حساب — تفعيل رسمي 100% عن طريق خاصية الإهداء داخل سناب شات.',
    identifierLabel:'يوزر السناب شات',
    identifierPlaceholder:'مثال: yazan.q',
    deliveryMethod:'منشحنلك الاشتراك مباشرة عن طريق خاصية "إهداء الاشتراك" الرسمية داخل سناب شات — باستخدام يوزرك فقط، من غير ما نطلب باسورد أو نسجل دخول على حسابك.',
    plans:[
      {id:'snap-3',  label:'3 أشهر',  price:5,  oldPrice:7,  tag:null},
      {id:'snap-6',  label:'6 أشهر',  price:9,  oldPrice:13, tag:'الأكثر طلبًا'},
      {id:'snap-12', label:'12 شهر',  price:17, oldPrice:24, tag:null},
    ],
    features:[
      {icon:'⭐', title:'أيقونة حصرية للتطبيق', desc:'بدّل شكل أيقونة سناب شات على شاشتك الرئيسية باختيارك من تصاميم حصرية مو متوفرة للمستخدم العادي.'},
      {icon:'🎨', title:'ألوان دردشة مخصصة', desc:'غيّر لون فقاعات الشات الخاصة فيك، وخلي صاحبك يميزك بلونك المختار بكل محادثة.'},
      {icon:'👑', title:'أفضل صديق مثبّت', desc:'ثبّت شخص وحدة فوق قائمة الأصدقاء تبعك بشكل دائم، مهما تغيرت الخوارزمية أو نشاطكم.'},
      {icon:'🔁', title:'مشاهدة القصة مرة ثانية', desc:'اعرف بالضبط مين رجع يتفرج على الستوري تبعك وكم مرة شافها كل شخص.'},
      {icon:'👀', title:'لمحة سريعة', desc:'شوف إذا صاحبك بلّش يقرا رسالتك أو دخل نص الشات قبل ما يوصلك الرد منه.'},
      {icon:'☁️', title:'250 جيجا تخزين سحابي', desc:'احفظ كل ذكرياتك وسناباتك القديمة بمساحة تخزين ضخمة تكفيك لفترة طويلة.'},
    ],
  },

  adobe: {
    slug:'adobe',
    name:'Adobe Creative Cloud',
    icon:'🎨',
    thumbBg:'linear-gradient(145deg,#2a0d30,#150818)',
    category:'البرامج والتطبيقات',
    tagline:'كل تطبيقات Adobe باشتراك واحد',
    description:'فوتوشوب، إليستريتور، بريمير برو، وأكثر — اشتراك رسمي على حسابك الخاص بأفضل سعر.',
    identifierLabel:'إيميل Adobe ID',
    identifierPlaceholder:'example@email.com',
    deliveryMethod:'منفعّلك الاشتراك مباشرة على حساب Adobe ID تبعك عن طريق الإيميل، من غير ما نطلب الباسورد — بترجعلك رسالة تفعيل رسمية من Adobe نفسها.',
    plans:[
      {id:'adobe-1', label:'شهر واحد', price:5, oldPrice:8, tag:null},
    ],
    features:[
      {icon:'🖌️', title:'كل تطبيقات Adobe', desc:'فوتوشوب، إليستريتور، بريمير برو، إنديزاين وأكثر من 20 تطبيق بنفس الاشتراك.'},
      {icon:'☁️', title:'100 جيجا تخزين سحابي', desc:'احفظ مشاريعك ومصادرك بأمان وارجعلها من أي جهاز تسجل دخول منه.'},
      {icon:'🔤', title:'مكتبة Adobe Fonts', desc:'آلاف الخطوط الاحترافية جاهزة للاستخدام المباشر بكل تطبيقاتك.'},
      {icon:'🖥️', title:'تفعيل على أكثر من جهاز', desc:'تقدر تستخدم حسابك من الكمبيوتر والموبايل بنفس الوقت.'},
    ],
  },

  fortnite: {
    slug:'fortnite',
    name:'فورت نايت',
    icon:'🪂',
    thumbBg:'linear-gradient(145deg,#0d1a30,#080d18)',
    category:'الألعاب',
    tagline:'كرو شهري ورصيد V-Bucks يوصلك فورًا',
    description:'اشترك بالـ Crew الشهري أو اشحن رصيد V-Bucks مباشرة على حساب Epic Games تبعك.',
    delivery:{
      intro:'بعد تأكيد طلبك، رح نحتاج منك المعلومات التالية عشان نفعّل الكرو أو نشحن الرصيد مباشرة على حسابك:',
      requirements:[
        'إيميل وباسورد حساب Epic Games',
        'كود التحقق (2FA) إذا طلب منك أثناء الدخول',
        'كون مسجّل خروج من فورت نايت، وما تسجّل دخول لحسابك لين نخلّص الطلب',
      ],
      safety:[
        'شحن رسمي 100% عبر طرق دفع معتمدة',
        'استخدمناها بآلاف الطلبات الناجحة',
        'صفر مخاطرة حظر (بان) على حسابك',
        'بيانات الدخول تنحذف نهائيًا فور إتمام الطلب',
      ],
      platformNotes:[
        'الكمية المختارة من V-Bucks بتنضاف مباشرة لحسابك',
        'بيشتغل على كل المنصات (PC، بلايستيشن، إكسبوكس) ما عدا Nintendo Switch',
        'بيشتغل لكل مناطق العالم',
      ],
    },
    // Fortnite Crew — monthly subscription plans
    crewPlans:[
      {id:'fn-crew',   label:'Fortnite Crew — شهر',    price:4, oldPrice:6,  tag:'يشمل V-Bucks شهرية'},
      {id:'fn-crew-3', label:'Fortnite Crew — 3 أشهر', price:9, oldPrice:12, tag:null},
    ],
    // V-Bucks fixed bundles
    vbucksPlans:[
      {id:'fn-vb-800',   label:'800 وحدة V-Bucks',   price:5,  oldPrice:7},
      {id:'fn-vb-2400',  label:'2400 وحدة V-Bucks',  price:12, oldPrice:16},
      {id:'fn-vb-4500',  label:'4500 وحدة V-Bucks',  price:19, oldPrice:25},
      {id:'fn-vb-12500', label:'12500 وحدة V-Bucks', price:38, oldPrice:49},
    ],
    // Official Fortnite Crew monthly subscription benefits
    features:[
      {icon:'🎽', title:'طقم Crew Pack حصري شهريًا', desc:'تشكيلة (Outfit) حصرية مع إكسسواراتها تتجدد كل شهر، وما بتنباع بشكل منفصل بأي مكان تاني.'},
      {icon:'🎫', title:'Battle Pass الموسم الحالي', desc:'يشمل اشتراكك Battle Pass الموسم الحالي تلقائيًا طول ما اشتراكك فعّال.'},
      {icon:'🪙', title:'1000 وحدة V-Bucks شهريًا', desc:'رصيد V-Bucks بينضاف لحسابك كل شهر طول فترة الاشتراك، تصرفه على أي شي بالمتجر.'},
    ],
  },

};

/* ============================================================
   GIFT CARDS CATALOG — separate from PRODUCTS_CATALOG because
   each platform is organized by region (country), and each
   region has its own list of fixed-value denominations.
   Prices are stored in JOD (base currency), same as everywhere
   else on the site, and converted for display via GXCurrency.
   ============================================================ */
const GIFT_CARDS_CATALOG = {

  playstation:{
    name:'PlayStation Gift Cards',
    icon:'🎮',
    accent:'#00a3ff',
    cardGradient:'linear-gradient(135deg,#0a3d91,#0066cc 45%,#00a3ff)',
    regions:[
      {code:'us', flag:'🇺🇸', name:'أمريكا (USA)', denominations:[
        {id:'psn-us-10',  value:'10$',  price:8},
        {id:'psn-us-20',  value:'20$',  price:15},
        {id:'psn-us-50',  value:'50$',  price:36},
        {id:'psn-us-60',  value:'60$',  price:44},
        {id:'psn-us-100', value:'100$', price:71},
      ]},
      {code:'ae', flag:'🇦🇪', name:'الإمارات (UAE)', denominations:[
        {id:'psn-ae-10',  value:'10$',  price:8},
        {id:'psn-ae-20',  value:'20$',  price:15},
        {id:'psn-ae-50',  value:'50$',  price:37},
        {id:'psn-ae-60',  value:'60$',  price:44},
        {id:'psn-ae-100', value:'100$', price:71},
      ]},
      {code:'sa', flag:'🇸🇦', name:'السعودية (KSA)', denominations:[
        {id:'psn-sa-10',  value:'10$',  price:8},
        {id:'psn-sa-20',  value:'20$',  price:16},
        {id:'psn-sa-50',  value:'50$',  price:38},
        {id:'psn-sa-60',  value:'60$',  price:45},
        {id:'psn-sa-100', value:'100$', price:72},
      ]},
    ],
  },

  xbox:{
    name:'Xbox Gift Cards',
    icon:'🕹️',
    accent:'#4fdc4f',
    cardGradient:'linear-gradient(135deg,#0e4d0e,#107c10 45%,#4fdc4f)',
    regions:[
      {code:'tr', flag:'🇹🇷', name:'تركيا (Turkey)', denominations:[
        {id:'xbox-tr-50',  value:'50 TRY',  price:1.87},
        {id:'xbox-tr-100', value:'100 TRY', price:2.97},
        {id:'xbox-tr-300', value:'300 TRY', price:6.67},
      ]},
    ],
  },

  'google-play':{
    name:'Google Play Gift Cards',
    icon:'▶️',
    accent:'#34a853',
    cardGradient:'linear-gradient(135deg,#1a73e8,#34a853 35%,#fbbc04 70%,#ea4335)',
    regions:[], // no denominations added yet
  },

  itunes:{
    name:'iTunes Gift Cards',
    icon:'🎵',
    accent:'#f107a3',
    cardGradient:'linear-gradient(135deg,#7b2ff7,#f107a3 55%,#ff5c8a)',
    regions:[
      // Source values were given in USD; converted to JOD at the site's
      // internal USD rate (1 JOD = 1.41 USD) for consistency with the
      // rest of the store's pricing/currency system.
      {code:'tr', flag:'🇹🇷', name:'تركيا (Turkey)', denominations:[
        {id:'itunes-tr-100',  value:'100 TRY',  price:2.22},
        {id:'itunes-tr-200',  value:'200 TRY',  price:3.90},
        {id:'itunes-tr-300',  value:'300 TRY',  price:5.46},
        {id:'itunes-tr-500',  value:'500 TRY',  price:8.99},
        {id:'itunes-tr-1000', value:'1000 TRY', price:17.38},
      ]},
    ],
  },

};

/* ---------------- CATEGORY TREE (top-level, shown on homepage) ---------------- */
const CATEGORY_LINKS = [
  {slug:'snapchat',    name:'سناب بلس',          icon:'👻', type:'direct', accent:'#FFCB47', bg:'linear-gradient(145deg, rgba(255,203,71,0.18), rgba(255,203,71,0.04))', desc:'أيقونة حصرية، ألوان دردشة، وأكثر'},
  {slug:'design',      name:'البرامج والتطبيقات', icon:'🧩', type:'group',  accent:'#C6FF3D', bg:'linear-gradient(145deg, rgba(198,255,61,0.16), rgba(198,255,61,0.04))', desc:'Adobe Creative Cloud وأكثر قريبًا'},
  {slug:'games',       name:'الألعاب',           icon:'🎮', type:'group',  accent:'#00E5FF', bg:'linear-gradient(145deg, rgba(0,229,255,0.16), rgba(0,229,255,0.04))',   desc:'فورت نايت، بلايستيشن، إكسبوكس'},
  {slug:'gift-cards',  name:'بطاقات الهدايا',     icon:'🎁', type:'group',  accent:'#FF2D78', bg:'linear-gradient(145deg, rgba(255,45,120,0.16), rgba(255,45,120,0.04))', desc:'PlayStation، Xbox، Google Play، iTunes'},
];

/* ---------------- SUBCATEGORIES per group category ---------------- */
const SUBCATEGORIES = {
  design:[
    {slug:'adobe', product:'adobe', name:'Adobe Creative Cloud', icon:'🎨', bg:'linear-gradient(145deg,#2a0d30,#150818)', comingSoon:false},
  ],
  games:[
    {slug:'fortnite', product:'fortnite', name:'فورت نايت',       icon:'🪂', bg:'linear-gradient(145deg,#0d1a30,#080d18)', comingSoon:false},
    {slug:'sony',      product:null,       name:'بلايستيشن (سوني)', icon:'🎮', bg:'linear-gradient(145deg,#0d1430,#080a18)', comingSoon:true},
    {slug:'xbox',      product:null,       name:'إكسبوكس',         icon:'🕹️', bg:'linear-gradient(145deg,#0d2a1a,#081510)', comingSoon:true},
  ],
  'gift-cards':[
    {slug:'playstation', name:'PlayStation Gift Cards', icon:'🎮', bg:'linear-gradient(145deg, rgba(0,163,255,0.18), rgba(0,163,255,0.04))', cardGradient:'linear-gradient(135deg,#0a3d91,#0066cc 45%,#00a3ff)', accent:'#00a3ff'},
    {slug:'xbox',         name:'Xbox Gift Cards',        icon:'🕹️', bg:'linear-gradient(145deg, rgba(79,220,79,0.18), rgba(79,220,79,0.04))',  cardGradient:'linear-gradient(135deg,#0e4d0e,#107c10 45%,#4fdc4f)', accent:'#4fdc4f'},
    {slug:'google-play',  name:'Google Play Gift Cards', icon:'▶️', bg:'linear-gradient(145deg, rgba(52,168,83,0.18), rgba(52,168,83,0.04))',  cardGradient:'linear-gradient(135deg,#1a73e8,#34a853 35%,#fbbc04 70%,#ea4335)', accent:'#34a853'},
    {slug:'itunes',       name:'iTunes Gift Cards',      icon:'🎵', bg:'linear-gradient(145deg, rgba(241,7,163,0.18), rgba(241,7,163,0.04))',  cardGradient:'linear-gradient(135deg,#7b2ff7,#f107a3 55%,#ff5c8a)', accent:'#f107a3'},
  ],
};

const CATEGORY_META = {
  design:{name:'البرامج والتطبيقات', icon:'🧩', tagline:'برامج التصميم والتطبيقات الاحترافية بأسعار منافسة'},
  games:{name:'الألعاب', icon:'🎮', tagline:'اشتراكات، عملات، وكروت شحن لأشهر منصات الألعاب'},
  'gift-cards':{name:'بطاقات الهدايا', icon:'🎁', tagline:'بطاقات شحن رقمية لأشهر المنصات — القيم والأسعار قريبًا'},
};

// Build a flat list of "featured" cart-able items pulled from every product's plans,
// used to render the homepage products grid.
function getFeaturedItems(){
  const picks = [
    {product:'snapchat', planId:'snap-6'},
    {product:'adobe',    planId:'adobe-1'},
    {product:'fortnite', planId:'fn-crew'},
    {product:'fortnite', planId:'fn-vb-2400'},
    {product:'snapchat', planId:'snap-12'},
    {product:'fortnite', planId:'fn-vb-800'},
  ];
  return picks.map(({product, planId}) => {
    const p = PRODUCTS_CATALOG[product];
    const allPlans = [...(p.plans || []), ...(p.crewPlans || []), ...(p.vbucksPlans || [])];
    const plan = allPlans.find(pl => pl.id === planId);
    const linkBase = product === 'snapchat' ? '/snapchat/' : product === 'adobe' ? '/design/adobe/' : '/games/fortnite/';
    return {
      cartId: plan.id,
      product,
      name: `${p.name} — ${plan.label}`,
      icon: p.icon,
      bg: p.thumbBg,
      price: plan.price,
      oldPrice: plan.oldPrice,
      link: linkBase,
      requiresDetails: product === 'snapchat',
    };
  });
}

// Look up any plan across the whole catalog by its cart id (used by cart.js)
function findPlanByCartId(cartId){
  for(const key in PRODUCTS_CATALOG){
    const p = PRODUCTS_CATALOG[key];
    const allPlans = [...(p.plans || []), ...(p.crewPlans || []), ...(p.vbucksPlans || [])];
    const plan = allPlans.find(pl => pl.id === cartId);
    if(plan){
      return {
        cartId: plan.id,
        product: key,
        name: `${p.name} — ${plan.label}`,
        icon: p.icon,
        bg: p.thumbBg,
        price: plan.price,
      };
    }
  }
  // Search gift card denominations (nested under platform -> region)
  for(const platformKey in GIFT_CARDS_CATALOG){
    const platform = GIFT_CARDS_CATALOG[platformKey];
    for(const region of platform.regions){
      const denom = region.denominations.find(d => d.id === cartId);
      if(denom){
        return {
          cartId: denom.id,
          product: platformKey,
          name: `${platform.name} (${region.name}) — ${denom.value}`,
          icon: platform.icon,
          bg: platform.cardGradient,
          price: denom.price,
        };
      }
    }
  }
  return null;
}
