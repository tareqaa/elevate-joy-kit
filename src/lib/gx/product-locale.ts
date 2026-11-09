/* ============================================================
   GX STORE — PRODUCT / CATEGORY / PLAN LOCALIZATION
   Given an original Arabic product/plan/etc., return an English
   version. Falls back to Arabic when no translation is provided.
   ============================================================ */

import type { Lang } from "./i18n";
import type { CategoryLink, GiftCard, Plan, Product, Region, Subcategory, Feature } from "@/data/products";

/* --- Product-level EN overrides (name, tagline, description, category, delivery, identifier) --- */
type ProductI18n = {
  name?: string;
  tagline?: string;
  description?: string;
  category?: string;
  identifierLabel?: string;
  deliveryMethod?: string;
};

export const PRODUCTS_EN: Record<string, ProductI18n> = {
  "tod": {
    "name": "TOD TV Streaming",
    "tagline": "Watch live Premier League, Champions League & entertainment",
    "description": "Official TOD voucher subscriptions in 1080p FHD and 4K with beIN Sports channels and unlimited on-demand movies & series.",
    "category": "Streaming Subscriptions",
    "deliveryMethod": "Official 100% discount voucher code applied directly to your personal TOD account without requiring bank payment methods."
  },
  "linkedin-career-3m": {
    "name": "LinkedIn Premium Career (3 Months)",
    "tagline": "LinkedIn Premium Career for 3 months",
    "description": "Official LinkedIn Premium Career activation link for 3 full months with 5 InMails and competitive applicant insights.",
    "category": "Software & Apps",
    "deliveryMethod": "Official activation link from LinkedIn delivered instantly to your order page."
  },
  "linkedin-career-12m": {
    "name": "LinkedIn Premium Career (12 Months)",
    "tagline": "LinkedIn Premium Career for a full year",
    "description": "Annual LinkedIn Premium Career subscription with unlimited profile searches, InMails, and LinkedIn Learning courses.",
    "category": "Software & Apps",
    "deliveryMethod": "Official direct activation on your personal account."
  },
  "linkedin-business-12m": {
    "name": "LinkedIn Premium Business (12 Months)",
    "tagline": "LinkedIn Premium Business for a full year",
    "description": "Full annual LinkedIn Business plan featuring 15 monthly InMails, complete business insights, and unlimited browsing.",
    "category": "Software & Apps",
    "deliveryMethod": "Official direct activation on your personal LinkedIn profile by our verified support team."
  },
  "fortnite-crew": {
    "name": "Fortnite Crew",
    "tagline": "Monthly Crew subscription with Battle Pass & 1,000 V-Bucks",
    "description": "Get the current Battle Pass, 1,000 V-Bucks, and exclusive monthly Crew Pack outfits with instant official top-up.",
    "category": "Games",
    "deliveryMethod": "Direct top-up to your Epic Games account via official channels."
  },
  "adobe-express": {
    "name": "Adobe Express Premium",
    "tagline": "Adobe Express Premium for a full year",
    "description": "Access thousands of premium templates, Adobe Stock photos, fonts, and generative AI features on your personal Adobe account.",
    "category": "Software & Apps",
    "deliveryMethod": "Direct activation on your personal Adobe ID email without password sharing."
  },
  "notion-business": {
    "name": "Notion Business + AI",
    "tagline": "Notion Business with 300 AI credits monthly",
    "description": "3-month official subscription to Notion Business including Notion AI, unlimited team workspaces, and advanced analytics.",
    "category": "Software & Apps",
    "deliveryMethod": "Official direct activation link or invite to your personal workspace."
  },
  "adobe-acrobat-standard": {
    "name": "Adobe Acrobat Standard DC",
    "tagline": "Official Adobe Acrobat for 2 devices",
    "description": "Create, edit, convert, and sign PDF documents with the industry-standard PDF solution on Windows and Mac.",
    "category": "Software & Apps",
    "deliveryMethod": "Official genuine product key delivered instantly with easy redemption steps."
  },
  "headspace": {
    "name": "Headspace Plus",
    "tagline": "Headspace Plus meditation & mindfulness for 1 year",
    "description": "Unlimited access to hundreds of guided meditations, sleepcasts, bedtime audio, and mindful movement sessions.",
    "category": "Subscriptions",
    "deliveryMethod": "Direct activation code or invite for your personal Headspace account."
  },
  "nordvpn": {
    "name": "NordVPN Plus",
    "tagline": "Fast & secure VPN with Threat Protection",
    "description": "High-speed encrypted VPN with malware protection, tracker blocker, and cross-platform support for unlimited devices.",
    "category": "Software & Apps",
    "deliveryMethod": "Official digital key or dedicated verified account delivered instantly."
  },
  "minecraft-realms-plus": {
    "name": "Minecraft Realms Plus",
    "tagline": "Private cloud server for you and 10 friends",
    "description": "24/7 dedicated private Minecraft server with 150+ free Marketplace packs, cross-play on PC and consoles.",
    "category": "Games",
    "deliveryMethod": "Official digital code redeemable at redeem.microsoft.com."
  },
  "valorant": {
    "name": "Valorant Points (TR)",
    "tagline": "Instant VP recharge for Turkish region accounts",
    "description": "Direct digital prepaid code to buy skins, weapons, and Battle Passes on Valorant Turkey servers at the best prices.",
    "category": "Games",
    "deliveryMethod": "Instant digital code redeemable in-game via Prepaid Cards & Codes."
  },
  "valorant-eu": {
    "name": "Valorant Points (EU)",
    "tagline": "Instant VP recharge for European accounts",
    "description": "Official European Valorant Points code delivered instantly for weapon skins, agents, and Battle Passes.",
    "category": "Games",
    "deliveryMethod": "Instant digital code redeemable in-game."
  },
  "lovable-lite-12m": {
    "name": "Lovable Pro / Lite (12 Months)",
    "tagline": "Full-stack AI developer & code builder for a year",
    "description": "Build, launch, and iterate full-stack web applications with advanced AI engineering capabilities.",
    "category": "Artificial Intelligence",
    "deliveryMethod": "Official direct invitation or activation link delivered after checkout."
  },
  "duolingo-super-12-months": {
    "name": "Duolingo Super (12 Months)",
    "tagline": "Ad-free language learning with unlimited hearts",
    "description": "Master any language with personalized practice, unlimited hearts, and offline lessons for a full 12 months.",
    "category": "Subscriptions",
    "deliveryMethod": "Official family invite link sent to your email to join with your personal Duolingo account."
  },
  "free-fire-diamonds": {
    "name": "Free Fire Diamonds",
    "tagline": "Direct instant diamonds top-up via Player ID",
    "description": "Top up Free Fire Diamonds directly using your numerical Player ID without password sharing.",
    "category": "Games",
    "deliveryMethod": "Direct top-up to your game account via Player ID within minutes."
  },
  "youtube-premium": {
    "name": "YouTube Premium",
    "tagline": "Ad-free videos, background play & YouTube Music",
    "description": "Enjoy uninterrupted YouTube without ads, background playback, offline downloads, and full YouTube Music Premium.",
    "category": "Streaming Subscriptions",
    "deliveryMethod": "Official Google Family invite sent to your personal Gmail address."
  },
  "duolingo": {
    "name": "Duolingo Super",
    "tagline": "Ad-free learning with unlimited hearts",
    "description": "Official Duolingo Super membership on your own account with full progress tracking and zero ads.",
    "category": "Subscriptions",
    "deliveryMethod": "Official invite link sent to your email."
  },
  "itunes": {
    "name": "iTunes & Apple Gift Cards",
    "tagline": "Official Apple & iTunes digital gift cards",
    "description": "Top up your Apple Account balance to buy apps, games, iCloud storage, Apple Music, and in-app purchases across US, Saudi, and UAE stores.",
    "category": "Digital Gift Cards",
    "deliveryMethod": "Instant 16-digit digital code delivered on screen, redeemable in the App Store."
  },
  "playstation": {
    "name": "PlayStation PSN Gift Cards",
    "tagline": "Official PlayStation Store wallet top-up",
    "description": "Add funds to your PSN wallet to purchase games, add-ons, and PlayStation Plus on US, Saudi, and UAE PlayStation accounts.",
    "category": "Digital Gift Cards",
    "deliveryMethod": "Instant 12-digit digital code delivered on screen, redeemable on PS4/PS5 or PlayStation Store."
  },
  "xbox": {
    "name": "Xbox & Game Pass Gift Cards",
    "tagline": "Official Xbox gift cards and subscriptions",
    "description": "Add credit to your Microsoft account or get Game Pass Ultimate codes for PC and Xbox consoles.",
    "category": "Digital Gift Cards",
    "deliveryMethod": "Instant 25-character digital key redeemable at redeem.microsoft.com."
  },
  "google-play": {
    "name": "Google Play Gift Cards",
    "tagline": "Google Play balance for Android apps & in-game purchases",
    "description": "Top up your Google Play account to purchase games, apps, movies, books, and in-game items across US, Saudi, and UAE regions.",
    "category": "Digital Gift Cards",
    "deliveryMethod": "Instant digital code redeemable at play.google.com/redeem."
  },
  "game-pass": {
    "name": "Xbox Game Pass Ultimate",
    "tagline": "Hundreds of games on Xbox and PC including Day One releases",
    "description": "Includes Xbox Live Gold, EA Play membership, and cloud gaming on supported devices with exclusive perks.",
    "category": "Games",
    "deliveryMethod": "Official 25-digit code or verified account delivered instantly."
  },
  "pc-games": {
    "name": "PC Games & CD Keys",
    "tagline": "Official Steam, Rockstar, and Epic digital games",
    "description": "100% genuine game keys with instant digital delivery and lifetime ownership on your gaming library.",
    "category": "Games",
    "deliveryMethod": "Instant digital product key delivered with full redemption instructions."
  },
  "sony": {
    "name": "PlayStation Plus",
    "tagline": "Essential, Extra, and Deluxe memberships",
    "description": "Online multiplayer, monthly games, and catalog access on your PlayStation 4 and PlayStation 5.",
    "category": "Digital Gift Cards",
    "deliveryMethod": "Instant digital voucher code."
  },
  "streaming": {
    "name": "Streaming Subscriptions",
    "tagline": "TOD, YouTube Premium, and entertainment platforms",
    "description": "Premium streaming subscriptions with instant activation and full warranty.",
    "category": "Streaming Subscriptions",
    "deliveryMethod": "Instant voucher or invite to your personal account."
  },

  snapchat: {
    name: "Snapchat+",
    tagline: "Activate Snapchat+ the easiest, fastest way",
    description:
      "Pick the duration, choose the number of accounts, and enter each account's username — official 100% activation via Snapchat's in-app gift feature.",
    category: "Snapchat+ Subscription",
    identifierLabel: "Snapchat username",
    deliveryMethod:
      'We top up your subscription directly using Snapchat\'s official "Gift Subscription" feature — only your username is needed, we never ask for your password or log into your account.',
  },
  adobe: {
    name: "Adobe Creative Cloud",
    tagline: "All Adobe apps in one subscription",
    description: "Photoshop, Illustrator, Premiere Pro and more — an official subscription on your own account at the best price.",
    category: "Software & Apps",
    identifierLabel: "Adobe ID email",
    deliveryMethod: "We activate the subscription directly on your Adobe ID via email, without asking for your password — you'll receive an official activation message from Adobe.",
  },
  canva: {
    name: "Canva Pro",
    tagline: "Canva Pro for a full year",
    description: "All Canva Pro features on your personal account — premium templates, backgrounds, fonts and background removal.",
    category: "Software & Apps",
    identifierLabel: "Canva account email",
    deliveryMethod: "We activate Canva Pro directly on your personal account — just send us your email and you'll get an official invite from Canva.",
  },
  linkedin: {
    name: "LinkedIn Premium Business",
    tagline: "LinkedIn Premium Business for a full year",
    description: "InMail access, detailed company insights and LinkedIn Learning courses on your personal account.",
    category: "Software & Apps",
    identifierLabel: "LinkedIn account email",
    deliveryMethod: "We activate LinkedIn Premium (Business) on your personal account directly — all we need is the email registered on LinkedIn.",
  },
  microsoft365: {
    name: "Microsoft 365",
    tagline: "Microsoft 365 — multiple options",
    description: "Word, Excel, PowerPoint, Outlook and more — pick what suits you: an account from us, a personal key, or a family plan for 5 users.",
    category: "Software & Apps",
    deliveryMethod: "Depending on the option: we either provide a ready account or send an official Product Key to activate on your personal account.",
  },
  autodesk: {
    name: "Autodesk All Apps",
    tagline: "All Autodesk apps for a full year",
    description: "AutoCAD, 3ds Max, Maya, Revit, Fusion 360 and 20+ apps — an official subscription on your personal account.",
    category: "Software & Apps",
    identifierLabel: "Autodesk account email",
    deliveryMethod: "We activate the official All Apps plan on your Autodesk account via email, without asking for your password.",
  },
  gemini: {
    name: "Google Gemini Plus",
    tagline: "Official 6-month activation link • No credit card required • 10-hour activation window",
    description: "Official Google Gemini Plus 6-month subscription via direct activation link. No credit card required. Note: Must be clicked and redeemed within 10 hours of delivery (link valid for 10 hours only; warranty void after 10 hours).",
    category: "AI & Software",
    identifierLabel: "Google account email",
    deliveryMethod: "We deliver an official activation link to redeem on your personal Google account. No credit card or password required.",
  },
  "windows-11-pro-retail": {
    name: "Windows 11 Pro Retail",
    tagline: "Official Retail license linked to Microsoft account (transferable)",
    description: "Genuine Windows 11 Pro Retail key. Binds to your Microsoft account and can be transferred to a new PC. Full official updates and lifetime activation.",
    category: "Software & Apps",
    deliveryMethod: "Instant delivery of the official 25-character digital Product Key with detailed activation instructions.",
  },
  "windows-11-pro-oem": {
    name: "Windows 11 Pro OEM",
    tagline: "Official OEM license tied to motherboard for lifetime",
    description: "Genuine Windows 11 Pro OEM key. Binds to your PC motherboard for lifetime activation. Unlimited reinstalls on the same PC.",
    category: "Software & Apps",
    deliveryMethod: "Instant delivery of the official 25-character digital Product Key with detailed activation instructions.",
  },
  windows: {
    name: "Windows 11 Pro Retail",
    tagline: "Official Retail license linked to Microsoft account (transferable)",
    description: "Genuine Windows 11 Pro Retail key. Binds to your Microsoft account and can be transferred to a new PC. Full official updates and lifetime activation.",
    category: "Software & Apps",
    deliveryMethod: "Instant delivery of the official 25-character digital Product Key with detailed activation instructions.",
  },
  fortnite: {
    name: "Fortnite",
    tagline: "Monthly Crew and instant V-Bucks top-up",
    description: "Subscribe to monthly Crew or top up V-Bucks directly to your Epic Games account.",
    category: "Games",
  },
};

/* --- Plan label translations by plan.id --- */
const PLAN_LABELS_EN: Record<string, string> = {
  "snap-3": "3 months",
  "snap-6": "6 months",
  "snap-12": "12 months",
  "adobe-1": "1 month",
  "adobe-4": "4 months",
  "canva-12": "12 months",
  "linkedin-12": "12 months",
  "ms365-acct-12": "Account from us — 12 months",
  "ms365-key-12": "Personal key + 1TB OneDrive — 12 months",
  "ms365-fam-12": "Family plan (5 users) — 12 months",
  "autodesk-12": "12 months — All Apps",
  "gemini-18": "18 months",
  "win-11-pro-retail": "Windows 11 Pro Retail — Official Key",
  "win-11-pro-oem": "Windows 11 Pro OEM — Official Key",
  "win-pro-oem": "Windows 10/11 Pro — OEM (Motherboard)",
  "win-pro-acct": "Windows 10/11 Pro — Account",
  "win-home-oem": "Windows 10/11 Home — OEM (Motherboard)",
  "win-home-acct": "Windows 10/11 Home — Account",
  "fn-crew": "Fortnite Crew — 1 month",
  "fn-crew-3": "Fortnite Crew — 3 months",
  "fn-vb-800": "800 V-Bucks",
  "fn-vb-2400": "2400 V-Bucks",
  "fn-vb-4500": "4500 V-Bucks",
  "fn-vb-12500": "12500 V-Bucks",
};

/* --- Plan.tag translations --- */
const PLAN_TAGS_EN: Record<string, string> = {
  "الأكثر طلبًا": "Most popular",
  "الأفضل قيمة": "Best value",
  "الأوفر": "Best deal",
  "عرض خاص": "Special offer",
  "يشمل V-Bucks شهرية": "Includes monthly V-Bucks",
};

/* --- Category translations --- */
const CATEGORY_LINKS_EN: Record<string, { name: string; desc: string }> = {
  snapchat: { name: "Snapchat+", desc: "Exclusive icon, chat colors and more" },
  subscriptions: { name: "Subscriptions", desc: "Game Pass, entertainment subscriptions & more" },
  "social-media": { name: "Social Media", desc: "TikTok, Instagram, and social media services" },
  design: { name: "Software & Apps", desc: "Adobe, Canva, Microsoft 365, Autodesk & more" },
  services: { name: "Services", desc: "Student services, transfers, and diverse digital solutions" },
  games: { name: "Games", desc: "Fortnite, PlayStation, Xbox" },
  "gift-cards": { name: "Gift Cards", desc: "PlayStation, Xbox, Google Play, iTunes" },
  products: { name: "View All", desc: "Browse all store products and subscriptions" },
  ai: { name: "Artificial Intelligence", desc: "Gemini Pro subscriptions and other AI tools" },
};

const CATEGORY_META_EN: Record<string, { name: string; tagline: string }> = {
  subscriptions: { name: "Subscriptions", tagline: "Digital gaming and entertainment subscriptions at best prices" },
  "social-media": { name: "Social Media", tagline: "Followers, growth and engagement for popular social platforms" },
  design: { name: "Software & Apps", tagline: "Professional design software and apps at competitive prices" },
  services: { name: "Services", tagline: "Fast and reliable student assistance and digital solutions" },
  games: { name: "Games", tagline: "Subscriptions, currency and top-up cards for the biggest gaming platforms" },
  "gift-cards": { name: "Gift Cards", tagline: "Official digital gift cards for global platforms with instant code delivery" },
  products: { name: "View All", tagline: "Everything GX Store offers in one place" },
  ai: { name: "Artificial Intelligence", tagline: "The most powerful AI tools at exclusive prices" },
};

const SUBCATEGORY_NAMES_EN: Record<string, string> = {
  adobe: "Adobe Creative Cloud",
  canva: "Canva Pro",
  microsoft365: "Microsoft 365",
  windows: "Windows Activation",
  autodesk: "Autodesk",
  linkedin: "LinkedIn Premium",
  gemini: "Gemini Pro",
  fortnite: "Fortnite",
  "pc-games": "PC Games",
  steam: "Steam Games",
  sony: "PlayStation Games",
  xbox: "Xbox Games",
  playstation: "PlayStation Gift Cards",
  "xbox-gc": "Xbox Gift Cards",
  "google-play": "Google Play Gift Cards",
  itunes: "iTunes Gift Cards",
};

/* --- Region names EN --- */
const REGION_NAMES_EN: Record<string, string> = {
  us: "United States (USA)",
  ae: "United Arab Emirates (UAE)",
  sa: "Saudi Arabia (KSA)",
  tr: "Turkey",
};

/* --- Gift Card names (already English mostly) & regions --- */

/* --- Features translations (indexed by original Arabic title) --- */
const FEATURE_MAP_EN: Record<string, { title: string; desc: string }> = {
  // Snapchat
  "أيقونة حصرية للتطبيق": { title: "Exclusive app icon", desc: "Change your Snapchat home-screen icon to exclusive designs not available to regular users." },
  "ألوان دردشة مخصصة": { title: "Custom chat colors", desc: "Change your chat bubble color so friends can spot you in every conversation." },
  "أفضل صديق مثبّت": { title: "Pinned best friend", desc: "Pin a person to the top of your friends list permanently, no matter how activity changes." },
  "مشاهدة القصة مرة ثانية": { title: "Story rewatch insights", desc: "See exactly who re-watched your story and how many times each person did." },
  "لمحة سريعة": { title: "Peek preview", desc: "See if a friend is typing or reading your message before you get their reply." },
  "250 جيجا تخزين سحابي": { title: "250 GB cloud storage", desc: "Save all your memories and old snaps with a huge storage space that lasts a long time." },
  // Adobe
  "كل تطبيقات Adobe": { title: "All Adobe apps", desc: "Photoshop, Illustrator, Premiere Pro, InDesign and 20+ apps in the same subscription." },
  "100 جيجا تخزين سحابي": { title: "100 GB cloud storage", desc: "Save your projects and assets safely and reach them from any device you sign in on." },
  "مكتبة Adobe Fonts": { title: "Adobe Fonts library", desc: "Thousands of professional fonts ready to use directly across all apps." },
  "تفعيل على أكثر من جهاز": { title: "Multi-device activation", desc: "Use your account on desktop and mobile at the same time." },
  // Canva
  "قوالب بريميوم": { title: "Premium templates", desc: "Full access to 100M+ premium templates, images and videos." },
  "إزالة الخلفية بضغطة": { title: "One-click background removal", desc: "The pro Background Remover tool is available inside the app." },
  "مكتبة خطوط ضخمة": { title: "Massive font library", desc: "Thousands of professional Arabic and English fonts." },
  "1 تيرا تخزين سحابي": { title: "1 TB cloud storage", desc: "Save all your designs and projects safely with plenty of room." },
  // LinkedIn
  "InMail Messages": { title: "InMail Messages", desc: "Message anyone on LinkedIn even if they're not in your network." },
  "رؤى الشركات والوظائف": { title: "Company & job insights", desc: "See applicant details and compare yourself with other applicants." },
  "LinkedIn Learning": { title: "LinkedIn Learning", desc: "Full access to thousands of professional courses with certified diplomas." },
  "مين شاف بروفايلك": { title: "Who viewed your profile", desc: "See the full list of people who visited your profile in the last 90 days." },
  // Microsoft 365
  "كل تطبيقات Office": { title: "All Office apps", desc: "Word, Excel, PowerPoint, Outlook, OneNote — full versions for desktop and mobile." },
  "1 تيرا OneDrive": { title: "1 TB OneDrive", desc: "1TB cloud storage with the personal key and family plans." },
  "يشتغل لكل الأجهزة": { title: "Works on every device", desc: "Windows, Mac, iOS, Android — same account." },
  "تفعيل رسمي 100%": { title: "100% official activation", desc: "Genuine Microsoft keys and legitimate accounts." },
  // Autodesk
  "AutoCAD & Revit": { title: "AutoCAD & Revit", desc: "The world-leading engineering and architectural design tools." },
  "Maya & 3ds Max": { title: "Maya & 3ds Max", desc: "The best 3D animation and visual effects software." },
  "Fusion 360": { title: "Fusion 360", desc: "Integrated CAD/CAM/CAE for mechanical design." },
  "+20 تطبيق آخر": { title: "20+ more apps", desc: "Full access to every Autodesk app under one subscription." },
  // Gemini
  "Gemini Advanced": { title: "Gemini Advanced", desc: "Access to Google's most capable models for complex tasks." },
  "حدود استخدام أعلى": { title: "Higher usage limits", desc: "Many more messages and conversations than the free version." },
  "رفع ملفات وصور": { title: "Upload files and images", desc: "Analyze PDFs, documents and images directly inside the chat." },
  "تكامل مع Google": { title: "Google integration", desc: "Works within Gmail, Docs and Sheets to save you time." },
  // Windows
  "مفاتيح رسمية 100%": { title: "100% official keys", desc: "Every key is genuine and activated straight from Microsoft's servers." },
  "تفعيل مدى الحياة": { title: "Lifetime activation", desc: "The key is permanent — no monthly or yearly renewal." },
  "ربط بالمذربورد أو الحساب": { title: "OEM or account binding", desc: "OEM binds to the device; Account binds to your Microsoft account for device switching." },
  "ضمان استبدال": { title: "Replacement guarantee", desc: "If the key has any issue within the warranty period, we replace it immediately." },
  // Fortnite Crew
  "طقم Crew Pack حصري شهريًا": { title: "Exclusive monthly Crew Pack", desc: "An exclusive outfit and accessories that refresh every month and can't be bought separately anywhere else." },
  "Battle Pass الموسم الحالي": { title: "Current-season Battle Pass", desc: "Your subscription automatically includes the current season's Battle Pass while active." },
  "1000 وحدة V-Bucks شهريًا": { title: "1000 monthly V-Bucks", desc: "V-Bucks credit is added to your account every month and you can spend it on anything in the store." },
};

/* --- Delivery block for Fortnite --- */
const FORTNITE_DELIVERY_EN = {
  intro: "After confirming your order, we'll need the following info to activate the Crew or top up V-Bucks directly on your account:",
  requirements: [
    "Epic Games account email and password",
    "2FA verification code if prompted during sign-in",
    "Be signed out of Fortnite and don't sign in until we complete the order",
  ],
  safety: [
    "100% official top-up via approved payment methods",
    "Used across thousands of successful orders",
    "Zero risk of account ban",
    "Sign-in data is permanently deleted right after order completion",
  ],
  platformNotes: [
    "The chosen V-Bucks amount is added directly to your account",
    "Works on every platform (PC, PlayStation, Xbox) except Nintendo Switch",
    "Works in every region worldwide",
  ],
};

/* --- FAQ translations --- */
export const FAQ_EN = [
  // Ordering & delivery
  { icon: "🛒", title: "How do I order from the store?", desc: "Select your product, add it to your cart, and complete payment directly on the website based on your location. Your digital activation code or account top-up details will appear instantly on your order page and email." },
  { icon: "🌍", title: "Do you deliver worldwide?", desc: "Yes. All our products are digital, so we deliver anywhere in the world. Some region-locked items (gift cards, game currency) require you to pick the matching region for your account." },
  { icon: "⏱️", title: "How long does delivery take?", desc: "Processing starts once payment is confirmed. Most digital orders arrive within minutes and up to a couple of hours, depending on the product, availability and region." },
  { icon: "✅", title: "How do I know my order is confirmed?", desc: "You receive an instant notification in your account and via email, and the order appears in \"My orders\" with real-time status: pending, processing, or delivered." },
  { icon: "💳", title: "What payment methods do you accept?", desc: "We accept fast and secure global payment methods: Instant checkout via Binance Pay in digital USDT, as well as Store Credit and GX Coins reward balance to cover all or part of your order." },
  { icon: "💰", title: "Are the displayed prices final?", desc: "Yes, displayed prices are final and inclusive, shown in your local currency or in USD/USDT using real-time exchange rates with zero hidden fees." },

  // Loyalty: XP, levels, coins, credit
  { icon: "⚡", title: "What is XP and how do I earn it?", desc: "Every {UNIT} of order value earns you {XP_PER_UNIT} XP. XP raises your level, and each level unlocks a bigger coin bonus, avatars and level coupons." },
  { icon: "💰", title: "What are GX Coins and how do I earn them?", desc: "Every {UNIT} you actually pay earns registered members {COINS_PER_UNIT} GX Coins, increased by your level bonus, plus tournament prizes." },
  { icon: "🧮", title: "How do I spend GX Coins?", desc: "{REDEEM_COINS} GX Coins = {REDEEM_VALUE} off, and coins can cover up to {MAX_PCT} of any order. You choose how many coins to use at checkout." },
  { icon: "📅", title: "Do GX Coins expire?", desc: "Yes — GX Coins are valid for one year from the date you earn them. Coins that pass one year without being used expire, so it's best to spend them on your next orders." },
  { icon: "🎫", title: "What's the difference between store credit and coins?", desc: "Store credit is a real balance in your currency (from refunds or admin credits) and can cover a full order. GX Coins are a reward currency capped at {MAX_PCT} of an order. Both are private and visible only to you inside your own profile." },

  // Games & tournaments
  { icon: "🎮", title: "What is GX Arena?", desc: "GX Arena is our games hub. You play mini games such as GX Blast, register in the live tournament and compete for the top spots on a real-time leaderboard." },
  { icon: "🏆", title: "How do tournaments work?", desc: "Each tournament runs for a set period with a clear start and end. Your best valid score during that window is the one on the leaderboard, and the ranking refreshes automatically." },
  { icon: "🎁", title: "What are the tournament prizes?", desc: "Prizes are set per placement and may include discount coupons (percentage, fixed amount, or product-specific), GX Coins, XP or custom prizes. All prizes are listed on the tournament page." },

  // Support & policies
  { icon: "🆘", title: "What if I have an issue with my order?", desc: "Message us on WhatsApp with your order number or a screenshot of the chat. We review the case and provide a solution as fast as possible." },
  { icon: "🛡️", title: "What's the warranty & refund policy?", desc: "We have a dedicated page explaining warranty and refunds step by step, including covered cases and exclusions. Open the warranty page from the menu." },
  { icon: "🔐", title: "Is my account data safe?", desc: "We only ask for the data required to deliver your order (such as a username or email) and never ask for your password unless the product requires it. Your balances and orders are visible only to you." },
];


/* --- Policy translations --- */
export const POLICY_EN = [
  { id: "duration", icon: "⏳", title: "Warranty duration", listKind: "covered" as const, items: [
    "Digital subscriptions: covered by warranty for the full subscription duration unless otherwise stated.",
    "Other products (codes, cards, currency, services): covered until the product is delivered successfully.",
  ]},
  { id: "mechanism", icon: "🛠️", title: "Warranty mechanism", body: "If a customer experiences any issue with a product, please contact support with the order and issue details. We'll review the case and provide the appropriate solution.", listKind: "covered" as const, items: [
    "Receiving a product that doesn't match the order.",
    "An issue with the product on receipt.",
    "The product or service not working because of an error on our side.",
    "Subscription or service stops working because of a delivery or activation issue on our side.",
  ]},
  { id: "returns", icon: "↩️", title: "Refund policy", body: "All payments are considered final once the order is executed or the product is delivered, due to its digital nature.", listKind: "excluded" as const, items: [
    "After the code or product data has been sent.",
    "After the subscription is activated or the product used.",
    "After service execution has begun.",
  ], note: "If a proven issue is on our side and we can't provide a suitable replacement, the customer is compensated based on product condition." },
  { id: "compensation", icon: "🔁", title: "Compensation & replacement", body: "If there's a defect in the product, one of the following solutions is offered depending on the case:", listKind: "process" as const, items: [
    "Replace the product with an equivalent one.",
    "Re-execute the service.",
    "Compensate the customer for the remaining subscription time if there's an active subscription.",
  ]},
  { id: "excluded", icon: "🚫", title: "Cases not covered by warranty", body: "The warranty doesn't cover issues caused by:", listKind: "excluded" as const, items: [
    "Incorrect data entered by the customer.",
    "Choosing a product that doesn't match the account region or platform.",
    "Internet or device issues.",
    "Successful product use or activation.",
    "Any changes or restrictions imposed by the service or game owners.",
    "Violation of the service provider's terms of use.",
  ]},
  { id: "activated", icon: "🔓", title: "Activated products", body: "Once a subscription is activated or a product used successfully, it cannot be replaced or refunded." },
  { id: "delay", icon: "⏰", title: "Delivery delays", body: "We strive to deliver all orders as fast as possible. If a delay happens on our side, the customer is entitled to request an appropriate resolution." },
  { id: "support", icon: "💬", title: "Support", body: "We're available to help customers and resolve any order-related issue 24/7 via WhatsApp." },
];

/* --- Localizer functions --- */

export function localizedProduct(p: Product, lang: Lang): Product {
  if (lang !== "en") return p;
  const en = PRODUCTS_EN[p.slug];
  const localizedPlans = (plans?: Plan[]) => plans?.map((pl) => ({
    ...pl,
    label: PLAN_LABELS_EN[pl.id] || pl.label,
    tag: pl.tag ? (PLAN_TAGS_EN[pl.tag] || pl.tag) : pl.tag,
  }));
  const localizedFeatures = (feats?: Feature[]) => feats?.map((f) => {
    const t = FEATURE_MAP_EN[f.title];
    return t ? { ...f, title: t.title, desc: t.desc } : f;
  });
  return {
    ...p,
    name: en?.name ?? p.name,
    tagline: en?.tagline ?? p.tagline,
    description: en?.description ?? p.description,
    category: en?.category ?? p.category,
    identifierLabel: en?.identifierLabel ?? p.identifierLabel,
    deliveryMethod: en?.deliveryMethod ?? p.deliveryMethod,
    plans: localizedPlans(p.plans),
    crewPlans: localizedPlans(p.crewPlans),
    vbucksPlans: localizedPlans(p.vbucksPlans),
    features: localizedFeatures(p.features),
    delivery: p.slug === "fortnite" && p.delivery ? FORTNITE_DELIVERY_EN : p.delivery,
  };
}

export function localizedPlanLabel(planId: string, fallback: string, lang: Lang): string {
  if (lang !== "en") return fallback;
  return PLAN_LABELS_EN[planId] || fallback;
}

export function localizedPlanTag(tag: string | null | undefined, lang: Lang): string | null | undefined {
  if (!tag || lang !== "en") return tag;
  return PLAN_TAGS_EN[tag] || tag;
}

export function localizedCategoryLink(c: CategoryLink, lang: Lang): CategoryLink {
  if (lang !== "en") return c;
  const en = CATEGORY_LINKS_EN[c.slug];
  return en ? { ...c, name: en.name, desc: en.desc } : c;
}

export function localizedCategoryMeta(slug: string, meta: { name: string; icon: string; tagline: string }, lang: Lang) {
  if (lang !== "en") return meta;
  const en = CATEGORY_META_EN[slug];
  return en ? { ...meta, name: en.name, tagline: en.tagline } : meta;
}

export function localizedSubcategory(s: Subcategory, lang: Lang): Subcategory {
  if (lang !== "en") return s;
  const key = s.slug === "xbox" && !s.product ? "xbox" : s.slug;
  const en = SUBCATEGORY_NAMES_EN[key];
  return en ? { ...s, name: en } : s;
}

export function localizedRegion(r: Region, lang: Lang): Region {
  if (lang !== "en") return r;
  const en = REGION_NAMES_EN[r.code];
  return en ? { ...r, name: en } : r;
}

export function localizedGiftCard(g: GiftCard, lang: Lang): GiftCard {
  if (lang !== "en") return g;
  return { ...g, regions: g.regions.map((r) => localizedRegion(r, lang)) };
}

/* Localize a resolved cart item name that may already contain plan label / region */
export function localizeResolvedName(name: string, lang: Lang): string {
  if (lang !== "en") return name;
  let out = name;
  // Replace Arabic product names with English equivalents when they appear
  const productNameMap: Record<string, string> = {
    "سناب بلس": "Snapchat+",
    "تفعيل ويندوز": "Windows Activation",
    "فورت نايت": "Fortnite",
  };
  for (const [ar, en] of Object.entries(productNameMap)) out = out.split(ar).join(en);
  // Plan labels
  for (const [ar, en] of Object.entries({
    "3 أشهر": "3 months",
    "6 أشهر": "6 months",
    "12 شهر": "12 months",
    "شهر واحد": "1 month",
    "4 أشهر": "4 months",
    "18 شهر": "18 months",
    "حساب من عندنا — 12 شهر": "Account from us — 12 months",
    "مفتاح شخصي + 1TB OneDrive — 12 شهر": "Personal key + 1TB OneDrive — 12 months",
    "باقة عائلية 5 مستخدمين — 12 شهر": "Family plan (5 users) — 12 months",
    "12 شهر — كل البرامج": "12 months — All Apps",
    "Fortnite Crew — شهر": "Fortnite Crew — 1 month",
    "Fortnite Crew — 3 أشهر": "Fortnite Crew — 3 months",
    "800 وحدة V-Bucks": "800 V-Bucks",
    "2400 وحدة V-Bucks": "2400 V-Bucks",
    "4500 وحدة V-Bucks": "4500 V-Bucks",
    "12500 وحدة V-Bucks": "12500 V-Bucks",
    "أمريكا (USA)": "United States (USA)",
    "الإمارات (UAE)": "UAE",
    "السعودية (KSA)": "Saudi Arabia",
    "تركيا (Turkey)": "Turkey",
  })) out = out.split(ar).join(en);
  return out;
}
