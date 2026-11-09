/**
 * GX STORE — UNIFIED PRODUCT ACTIVATION & REDEMPTION GUIDE
 * Provides exact, platform-specific activation instructions for every product in the store
 * (Steam, PlayStation, Xbox, Apple, Google Play, Rockstar, Windows, Office, Discord, etc.)
 * Used across:
 * - Order delivery & token pages (GxOrderDeliveryView)
 * - Customer "My Orders" tab on /account
 * - Order completion emails sent to customers
 * - Product detail pages (GxProductTemplate)
 */

export interface ActivationGuide {
  platformName: string;
  title: string;
  steps: string[];
  directUrl?: string;
}

export function resolveProductActivationGuide(
  product: {
    name?: string;
    nameAr?: string;
    nameEn?: string;
    slug?: string;
    platform?: string;
    region?: string | null;
    deliveryType?: string;
    deliveryInstructionsAr?: string | null;
    deliveryInstructionsEn?: string | null;
  },
  lang: "ar" | "en" = "ar"
): ActivationGuide {
  const isAr = lang === "ar";
  const name = (product.name || product.nameAr || product.nameEn || "").toLowerCase();
  const slug = (product.slug || "").toLowerCase();
  const plat = (product.platform || "").toLowerCase();

  // 1. Check if product has custom delivery instructions stored in DB
  const customAr = product.deliveryInstructionsAr?.trim();
  const customEn = product.deliveryInstructionsEn?.trim();

  // If custom instructions exist and are not generic system placeholders
  if (isAr && customAr && customAr.length > 20 && !customAr.includes("إعدادات النظام")) {
    try {
      const parsed = JSON.parse(customAr);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return {
          platformName: "GX Store",
          title: "طريقة التفعيل والاستخدام:",
          steps: parsed.map(String),
        };
      }
    } catch {
      const lines = customAr.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length > 0) {
        return {
          platformName: "GX Store",
          title: "طريقة التفعيل والاستخدام:",
          steps: lines,
        };
      }
    }
  }

  if (!isAr && customEn && customEn.length > 20 && !customEn.includes("System Settings")) {
    try {
      const parsed = JSON.parse(customEn);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return {
          platformName: "GX Store",
          title: "How to redeem and activate:",
          steps: parsed.map(String),
        };
      }
    } catch {
      const lines = customEn.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length > 0) {
        return {
          platformName: "GX Store",
          title: "How to redeem and activate:",
          steps: lines,
        };
      }
    }
  }

  // 2. Platform / Game detection

  // Steam Games & Keys
  const isSteam =
    plat.includes("steam") ||
    slug.includes("steam") ||
    name.includes("ستيم") ||
    name.includes("steam") ||
    slug.includes("arc-raiders") ||
    slug.includes("assassins-creed") ||
    slug.includes("batman") ||
    slug.includes("bioshock-infinite") ||
    slug.includes("control-") ||
    slug.includes("euro-truck") ||
    slug.includes("helldivers") ||
    slug.includes("hollow-knight") ||
    slug.includes("human-fall-flat") ||
    slug.includes("jusant") ||
    slug.includes("mafia-") ||
    slug.includes("shadow-of-mordor") ||
    slug.includes("shadow-of-war") ||
    slug.includes("mortal-kombat") ||
    slug.includes("mount-and-blade") ||
    slug.includes("nba-") ||
    slug.includes("ori-") ||
    slug.includes("peak") ||
    slug.includes("ratchet-and-clank") ||
    slug.includes("resident-evil") ||
    slug.includes("ea-fc-27-pc") ||
    slug.includes("ea-fc-26-pc") ||
    slug.includes("call-of-duty") ||
    slug.includes("forza-horizon-6-pc");

  if (isSteam) {
    return {
      platformName: "Steam (PC)",
      title: isAr ? "طريقة تفعيل كود ستيم (Steam PC):" : "How to redeem Steam product key:",
      directUrl: "https://store.steampowered.com/account/registerkey",
      steps: isAr
        ? [
            "عبر المتصفح: سجل الدخول وفعّل الكود مباشرة عبر الرابط الرسمي: https://store.steampowered.com/account/registerkey",
            "أو عبر تطبيق Steam للكمبيوتر: افتح التطبيق، من القائمة العلوية اضغط Games ثم اختر Activate a Product on Steam...",
            "أدخل كود اللعبة الرقمي واضغط متابعة (Next) لتتم إضافة اللعبة فوراً وبشكل دائم إلى مكتبتك (Library).",
          ]
        : [
            "Via Web Browser: Sign in and redeem your product code directly at: https://store.steampowered.com/account/registerkey",
            "Or via Steam PC Client: Open Steam, click 'Games' from the top menu, then select 'Activate a Product on Steam...'",
            "Enter your product key and click Next to permanently add the game to your Steam Library.",
          ],
    };
  }

  // PlayStation (PSN) Cards & Games
  const isPlayStation =
    plat.includes("playstation") ||
    plat.includes("ps4") ||
    plat.includes("ps5") ||
    plat.includes("psn") ||
    slug.includes("playstation") ||
    slug.includes("psn") ||
    name.includes("بلايستيشن") ||
    name.includes("playstation") ||
    name.includes("psn") ||
    name.includes("ps5") ||
    name.includes("ps4");

  if (isPlayStation) {
    return {
      platformName: "PlayStation Store (PSN)",
      title: isAr ? "طريقة استرداد بطاقات وكود بلايستيشن ستور:" : "How to redeem PlayStation Store voucher:",
      directUrl: "https://store.playstation.com",
      steps: isAr
        ? [
            "عبر المتصفح: سجل الدخول عبر PlayStation Store على https://store.playstation.com واضغط على صورة حسابك ثم اختر استرداد الرمز (Redeem Code).",
            "أو عبر جهاز PS4 / PS5: ادخل إلى PlayStation Store، اضغط أيقونة الخيارات (...) في الزاوية العلوية ثم اختر استرداد الرمز (Redeem Code).",
            "أدخل الرمز المكون من 12 رقماً/حرفاً واضغط استرداد (Redeem) ليتم شحن الرصيد في محفظتك فوراً.",
          ]
        : [
            "Via Web Browser: Sign in to PlayStation Store at https://store.playstation.com click your avatar and select Redeem Code.",
            "Or via PS4/PS5 Console: Open PlayStation Store, select the (...) menu icon at the top, and choose Redeem Code.",
            "Enter your 12-digit voucher code and select Redeem to immediately credit your wallet balance.",
          ],
    };
  }

  // Xbox Games & Cards
  const isXbox =
    plat.includes("xbox") ||
    slug.includes("xbox") ||
    name.includes("إكسبوكس") ||
    name.includes("اكسبوكس") ||
    name.includes("xbox") ||
    slug.includes("pc-game-pass") ||
    slug.includes("game-pass");

  if (isXbox) {
    return {
      platformName: "Xbox / Microsoft",
      title: isAr ? "طريقة تفعيل كود إكسبوكس أو مايكروسوفت:" : "How to redeem Xbox / Microsoft code:",
      directUrl: "https://redeem.microsoft.com",
      steps: isAr
        ? [
            "عبر المتصفح: سجل الدخول بحساب مايكروسوفت عبر الرابط الرسمي: https://redeem.microsoft.com",
            "أو عبر جهاز Xbox: افتح متجر Store، اضغط زر القائمة (View) واختر استرداد (Redeem).",
            "أدخل كود التفعيل المكون من 25 حرفاً واضغط تأكيد (Confirm) لإضافة اللعبة أو الرصيد لحسابك فوراً.",
          ]
        : [
            "Via Web Browser: Sign in to your Microsoft account at: https://redeem.microsoft.com",
            "Or via Xbox Console: Open the Store app, press the View button, and select Redeem.",
            "Enter your 25-character code and select Confirm to add the game, subscription, or balance to your account.",
          ],
    };
  }

  // Apple / iTunes Cards
  const isApple =
    plat.includes("apple") ||
    plat.includes("itunes") ||
    slug.includes("itunes") ||
    slug.includes("apple") ||
    name.includes("آيتونز") ||
    name.includes("ايتونز") ||
    name.includes("ابل") ||
    name.includes("آبل") ||
    name.includes("itunes") ||
    name.includes("apple");

  if (isApple) {
    return {
      platformName: "Apple App Store & iTunes",
      title: isAr ? "طريقة استرداد بطاقات آبل وآيتونز:" : "How to redeem Apple Gift Card:",
      directUrl: "https://apps.apple.com/redeem",
      steps: isAr
        ? [
            "افتح متجر App Store على جهاز iPhone أو iPad أو Mac، أو عبر الرابط: https://apps.apple.com/redeem",
            "اضغط على صورة حسابك في أعلى الشاشة، ثم اختر تحصيل بطاقة هدية أو رمز (Redeem Gift Card or Code).",
            "أدخل رمز البطاقة واضغط تحصيل (Redeem) لتتم إضافة الرصيد إلى رصيد حساب Apple الخاص بك فوراً.",
          ]
        : [
            "Open App Store on iPhone, iPad, or Mac, or visit: https://apps.apple.com/redeem",
            "Tap your account avatar at the top of the screen, then tap 'Redeem Gift Card or Code'.",
            "Enter your code and tap Redeem to instantly add the balance to your Apple Account balance.",
          ],
    };
  }

  // Google Play Cards
  const isGooglePlay =
    slug.includes("google-play") ||
    name.includes("جوجل بلاي") ||
    name.includes("google play");

  if (isGooglePlay) {
    return {
      platformName: "Google Play Store",
      title: isAr ? "طريقة شحن واسترداد بطاقات جوجل بلاي:" : "How to redeem Google Play gift card:",
      directUrl: "https://play.google.com/redeem",
      steps: isAr
        ? [
            "عبر المتصفح: توجه إلى الرابط المباشر لاسترداد بطاقات جوجل بلاي: https://play.google.com/redeem",
            "أو عبر الهاتف: افتح متجر Google Play، اضغط على صورة ملفك الشخصي > المدفوعات والاشتراكات > استخدام رمز الهدية.",
            "أدخل رمز البطاقة واضغط استرداد (Redeem) لشحن رصيد Google Play فوراً.",
          ]
        : [
            "Via Web Browser: Go to the direct redemption portal at: https://play.google.com/redeem",
            "Or via Phone App: Open Google Play, tap your profile icon > Payments & subscriptions > Redeem code.",
            "Enter your gift card code and tap Redeem to apply the balance to your Google Play account.",
          ],
    };
  }

  // Rockstar Games (GTA V, RDR 2)
  const isRockstar =
    slug.includes("red-dead-redemption") ||
    slug.includes("gta-v") ||
    name.includes("rockstar") ||
    name.includes("روكستار") ||
    name.includes("grand theft auto");

  if (isRockstar) {
    return {
      platformName: "Rockstar Games",
      title: isAr ? "طريقة تفعيل كود ألعاب روكستار (Rockstar Games):" : "How to redeem Rockstar Games code:",
      directUrl: "https://socialclub.rockstargames.com/rockstar-games-launcher",
      steps: isAr
        ? [
            "قم بتنزيل وتثبيت Rockstar Games Launcher، ثم سجّل الدخول بحسابك: https://socialclub.rockstargames.com/rockstar-games-launcher",
            "اضغط على زر القائمة الموجود في الزاوية العلوية اليمنى، ثم اختر استرداد الرمز (Redeem Code).",
            "أدخل الرمز الخاص بك واضغط تأكيد لبدء تفعيل وتحميل اللعبة فوراً.",
          ]
        : [
            "Download and install Rockstar Games Launcher, then sign in at: https://socialclub.rockstargames.com/rockstar-games-launcher",
            "Click the profile menu in the top right corner, then choose Redeem Code.",
            "Enter your code and confirm to activate and download the game to your library.",
          ],
    };
  }

  // Windows Keys
  const isWindows =
    slug.includes("windows") ||
    name.includes("ويندوز") ||
    name.includes("windows");

  if (isWindows) {
    return {
      platformName: "Microsoft Windows",
      title: isAr ? "طريقة تنشيط مفتاح ويندوز (Windows):" : "How to activate Windows product key:",
      steps: isAr
        ? [
            "على جهاز الكمبيوتر: افتح الإعدادات (Settings) > النظام (System) > التنشيط (Activation).",
            "اضغط على خيار تغيير مفتاح المنتج (Change product key).",
            "أدخل المفتاح الرقمي المكون من 25 خانة المستلم من المتجر واضغط تنشيط (Activate) للتفعيل الدائم والأصلي 100%.",
          ]
        : [
            "On your PC, open Settings > System > Activation.",
            "Click on 'Change product key'.",
            "Enter your 25-character digital license key and click Activate for genuine lifetime Microsoft authentication.",
          ],
    };
  }

  // Microsoft 365 / Office
  const isOffice =
    slug.includes("microsoft365") ||
    slug.includes("office") ||
    name.includes("مايكروسوفت") ||
    name.includes("أوفيس") ||
    name.includes("office");

  if (isOffice) {
    return {
      platformName: "Microsoft 365 / Office",
      title: isAr ? "طريقة تفعيل مايكروسوفت أوفيس 365:" : "How to setup Microsoft 365 / Office:",
      directUrl: "https://setup.office.com",
      steps: isAr
        ? [
            "توجه إلى الرابط الرسمي لإعداد حزمة أوفيس: https://setup.office.com",
            "سجل الدخول بحساب Microsoft الخاص بك (أو أنشئ حساباً جديداً).",
            "أدخل المفتاح الرقمي المكون من 25 خانة لربط الرخصة بحسابك وتحميل برامج Office مباشرة.",
          ]
        : [
            "Visit the official Microsoft setup portal at: https://setup.office.com",
            "Sign in with your Microsoft personal account.",
            "Enter your 25-character product key to bind the subscription to your account and download Office apps.",
          ],
    };
  }

  // Roblox Robux
  const isRoblox =
    slug.includes("roblox") ||
    name.includes("روبلوكس") ||
    name.includes("roblox");

  if (isRoblox) {
    return {
      platformName: "Roblox",
      title: isAr ? "طريقة استرداد وشحن روبلوكس روبوكس:" : "How to redeem Roblox Robux:",
      directUrl: "https://www.roblox.com/redeem",
      steps: isAr
        ? [
            "توجه إلى صفحة استرداد روبلوكس الرسمية: https://www.roblox.com/redeem",
            "سجل الدخول بحساب Roblox الخاص بك الذي ترغب بالشحن له.",
            "أدخل الكود الرقمي في خانة Code واضغط على استرداد (Redeem) لتتم إضافة الرصيد لحسابك فوراً.",
          ]
        : [
            "Go to the official Roblox redeem page: https://www.roblox.com/redeem",
            "Log in to your Roblox account.",
            "Enter your code in the Code box and click Redeem to receive your Robux immediately.",
          ],
    };
  }

  // Valorant Points (VP)
  const isValorant =
    slug.includes("valorant") ||
    name.includes("فالورانت") ||
    name.includes("valorant");

  if (isValorant) {
    return {
      platformName: "Riot Games / VALORANT",
      title: isAr ? "طريقة شحن وتفعيل كود فالورانت (Valorant Points):" : "How to redeem Valorant Points (VP):",
      steps: isAr
        ? [
            "افتح لعبة VALORANT وسجل الدخول بحساب Riot الخاص بك.",
            "اضغط على أيقونة نقاط VALORANT (أيقونة V) بجانب علامة التبويب للمتجر في أعلى يمين الشاشة.",
            "اختر طريقة الدفع عبر بطاقات الدفع المسبق والأكواد (Prepaid Cards & Codes).",
            "أدخل كود التفعيل واضغط تأكيد (Submit / Redeem) لتتم إضافة نقاط VP إلى رصيدك فوراً وبشكل دائم.",
          ]
        : [
            "Launch VALORANT and log in to your Riot Games account.",
            "Click on the VALORANT Points (V icon) next to the Store tab in the top right.",
            "Select 'Prepaid Cards & Codes' payment method.",
            "Enter your digital code and click Submit / Redeem to instantly receive your VP balance.",
          ],
    };
  }

  // Fortnite V-Bucks & Crew
  const isFortnite =
    slug.includes("fortnite") ||
    name.includes("فورت نايت") ||
    name.includes("فورتنايت") ||
    name.includes("fortnite");

  if (isFortnite) {
    return {
      platformName: "Epic Games / Fortnite",
      title: isAr ? "طريقة استرداد وشحن فورت نايت (V-Bucks / Crew):" : "How to redeem Fortnite V-Bucks:",
      directUrl: "https://www.epicgames.com/fortnite/en-US/vbuckscard",
      steps: isAr
        ? [
            "لبطاقات V-Bucks: توجه إلى الرابط الرسمي: https://www.epicgames.com/fortnite/en-US/vbuckscard",
            "سجل الدخول بحساب Epic Games المربوط بلعبتك، واضغط Get Started.",
            "أدخل الرمز الرقمي، واختر الجهاز الذي تلعب عليه (PlayStation, Xbox, PC, Nintendo Switch) لتطبيق الرصيد مباشرة.",
            "لاشتراك فورتنايت كرو أو الشحن المباشر: تتم إضافة الحزمة مباشرة إلى حسابك فور تنفيذ الطلب.",
          ]
        : [
            "For V-Bucks Cards: Visit the official portal: https://www.epicgames.com/fortnite/en-US/vbuckscard",
            "Sign in with the Epic Games account linked to your game, and click Get Started.",
            "Enter your digital code and choose your gaming platform (PlayStation, Xbox, PC, Switch) to claim your V-Bucks.",
            "For Fortnite Crew / Direct Top-ups: Package is applied directly to your account upon fulfillment.",
          ],
    };
  }

  // Discord Nitro
  const isDiscord =
    slug.includes("discord") ||
    name.includes("ديسكورد") ||
    name.includes("discord");

  if (isDiscord) {
    return {
      platformName: "Discord",
      title: isAr ? "طريقة تفعيل اشتراك ديسكورد نيترو (Discord Nitro):" : "How to redeem Discord Nitro:",
      steps: isAr
        ? [
            "افتح الرابط المستلم من المتجر في متصفحك وأنت مسجل الدخول بحسابك على Discord.",
            "أو في تطبيق Discord: اذهب إلى إعدادات المستخدم (User Settings) > مخزون الهدايا (Gift Inventory).",
            "أدخل الرمز أو اضغط قبول الهدية (Accept Gift) لتفعيل مزايا Nitro والسيرفر بوست فوراً.",
          ]
        : [
            "Open your activation link in your web browser while logged into your Discord account.",
            "Or in Discord app: Go to User Settings > Gift Inventory.",
            "Enter the code or accept the gift link to activate your Nitro perks and boosts instantly.",
          ],
    };
  }

  // YouTube Premium
  const isYouTube =
    slug.includes("youtube") ||
    name.includes("يوتيوب") ||
    name.includes("youtube");

  if (isYouTube) {
    return {
      platformName: "YouTube",
      title: isAr ? "طريقة تفعيل يوتيوب بريميوم (YouTube Premium):" : "How to activate YouTube Premium:",
      steps: isAr
        ? [
            "ستصلك دعوة تفعيل رسمية إلى بريدك الإلكتروني من Google / YouTube.",
            "افتح رسالة الدعوة واضغط على زر قبول الدعوة (Accept Invitation).",
            "أكد انضمامك للمجموعة العائلية للاستمتاع فوراً بيوتيوب بدون إعلانات وتطبيق YouTube Music.",
          ]
        : [
            "You will receive an official activation invitation sent directly to your email address from Google.",
            "Open the invitation email and click 'Accept Invitation'.",
            "Confirm joining to instantly enjoy ad-free YouTube and background playback with YouTube Music.",
          ],
    };
  }

  // LinkedIn Premium
  const isLinkedIn =
    slug.includes("linkedin") ||
    name.includes("لينكدإن") ||
    name.includes("لينكد ان") ||
    name.includes("linkedin");

  if (isLinkedIn) {
    return {
      platformName: "LinkedIn",
      title: isAr ? "طريقة تفعيل اشتراك لينكدإن بريميوم (LinkedIn Premium):" : "How to activate LinkedIn Premium:",
      steps: isAr
        ? [
            "افتح رابط التفعيل المستلم في صفحة الطلب عبر متصفحك وأنت مسجل الدخول بحسابك الشخصي في LinkedIn.",
            "اضغط على زر تفعيل العرض (Activate Offer / Redeem).",
            "سيتم تطبيق الاشتراك بنسبة خصم 100% دون الحاجة لإدخال أي بطاقة بنكية.",
          ]
        : [
            "Open your activation link in your browser while logged into your personal LinkedIn account.",
            "Click on 'Activate Offer' or 'Redeem'.",
            "Your Premium plan will be activated at 100% full discount without needing any credit card.",
          ],
    };
  }

  // Google Gemini Plus
  const isGemini =
    slug === "gemini" ||
    slug.startsWith("gemini") ||
    name.includes("جيمناي") ||
    name.includes("gemini");

  if (isGemini) {
    return {
      platformName: "Google AI",
      title: isAr ? "طريقة تفعيل اشتراك Google Gemini Plus (رابط تفعيل):" : "How to activate Google Gemini Plus:",
      steps: isAr
        ? [
            "افتح رابط التفعيل الرسمي المستلم في صفحة الطلب أو عبر إيميلك وأنت مسجل الدخول بحساب Google الشخصي.",
            "اضغط على قبول العرض وتفعيل الاشتراك مباشرة على حسابك دون الحاجة لكلمة المرور.",
            "ملاحظة هامة جداً: لا يلزم إدخال أي بطاقة بنكية (Credit Card) إطلاقاً لإتمام التفعيل.",
            "تنبيه صلاحية الرابط: يجب الدخول وتفعيل الرابط خلال 10 ساعات فقط من وقت التسليم؛ تنتهي صلاحية الرابط بعد 10 ساعات وينتهي الضمان تماماً إذا لم يتم التفعيل خلال هذه المدة.",
          ]
        : [
            "Open the official activation link received on your order confirmation page while logged into your Google account.",
            "Click to accept and activate the Google Gemini Plus subscription directly on your personal account.",
            "Important note: No bank card or credit card is required to activate the link.",
            "10-Hour Window: You must redeem the link within 10 hours of delivery. The link expires after 10 hours and warranty is void if not activated within this period.",
          ],
    };
  }

  // Canva Pro
  const isCanva =
    slug.includes("canva") ||
    name.includes("كانفا") ||
    name.includes("canva");

  if (isCanva) {
    return {
      platformName: "Canva",
      title: isAr ? "طريقة تفعيل اشتراك كانفا برو (Canva Pro):" : "How to activate Canva Pro:",
      steps: isAr
        ? [
            "افتح رابط الدعوة الرسمي المستلم في صفحة الطلب أو عبر إيميلك.",
            "سجل الدخول بحساب Canva الخاص بك (أو أنشئ حساباً جديداً).",
            "اضغط انضمام إلى الفريق (Join Team) للتمتع بجميع ميزات Canva Pro والقوالب المدفوعة فوراً.",
          ]
        : [
            "Open the official team invitation link received on your order screen or email.",
            "Sign in with your Canva account (or create a new one).",
            "Click 'Join Team' to instantly unlock all Canva Pro templates, brand kits, and premium tools.",
          ],
    };
  }

  // TOD TV
  const isTod =
    slug.includes("tod") ||
    name.includes("تود") ||
    name.includes("tod");

  if (isTod) {
    return {
      platformName: "TOD TV (beIN)",
      title: isAr ? "طريقة تفعيل اشتراك تود (TOD TV):" : "How to redeem TOD TV subscription:",
      directUrl: "https://www.tod.tv",
      steps: isAr
        ? [
            "افتح موقع https://www.tod.tv أو حمل تطبيق TOD على هاتفك أو شاشتك الذكية.",
            "سجل الدخول أو أنشئ حساباً جديداً، ثم اذهب إلى صفحة الاشتراك أو استرداد القسيمة.",
            "أدخل كود القسيمة الرقمي المستلم من المتجر لتفعيل الباقة الرياضية والترفيهية فوراً.",
          ]
        : [
            "Visit https://www.tod.tv or open the TOD app on your phone or Smart TV.",
            "Sign in to your account, then navigate to Subscriptions or Redeem Voucher.",
            "Enter your digital voucher code to activate sports and entertainment live streaming immediately.",
          ],
    };
  }

  // Razer Gold
  const isRazer =
    slug.includes("razer") ||
    name.includes("ريزر") ||
    name.includes("razer");

  if (isRazer) {
    return {
      platformName: "Razer Gold",
      title: isAr ? "طريقة شحن بطاقات ريزر جولد (Razer Gold):" : "How to reload Razer Gold PIN:",
      directUrl: "https://gold.razer.com/gold/reload",
      steps: isAr
        ? [
            "توجه إلى صفحة شحن ريزر جولد الرسمية: https://gold.razer.com/gold/reload",
            "سجل الدخول بحساب Razer Gold الخاص بك.",
            "اختر طريقة الدفع عبر Razer Gold PIN، أدخل رمز الـ PIN المكون من 14 خانة واضغط Next لإضافة الرصيد لمحفظتك فوراً.",
          ]
        : [
            "Visit the official Razer Gold reload page: https://gold.razer.com/gold/reload",
            "Sign in to your Razer Gold account.",
            "Select 'Razer Gold PIN' as payment method, enter your 14-digit PIN, and click Next to add funds.",
          ],
    };
  }

  // VPN Services (NordVPN, ExpressVPN, Surfshark, Avast, AVG)
  const isVpn =
    slug.includes("vpn") ||
    name.includes("vpn") ||
    slug.includes("nordvpn") ||
    slug.includes("expressvpn") ||
    slug.includes("surfshark");

  if (isVpn) {
    return {
      platformName: "VPN Service",
      title: isAr ? "طريقة تفعيل واستخدام اشتراك الـ VPN:" : "How to activate and use VPN subscription:",
      steps: isAr
        ? [
            "قم بتنزيل التطبيق الرسمي للخدمة من موقعهم أو متجر التطبيقات على جهازك.",
            "سجل الدخول باستخدام بيانات الحساب (الإيميل وكلمة السر) أو أدخل كود التفعيل المستلم.",
            "اختر السيرفر أو الدولة التي ترغب بالاتصال بها واستمتع باتصال آمن وسريع 100%.",
          ]
        : [
            "Download the official app from the provider website or your device app store.",
            "Sign in using the provided account credentials or enter the activation code.",
            "Select your desired server location and connect for 100% secure, high-speed browsing.",
          ],
    };
  }

  // Social Media Direct Top-up
  const isSocial =
    slug.includes("followers") ||
    slug.includes("likes") ||
    slug.includes("facebook") ||
    slug.includes("instagram");

  if (isSocial) {
    return {
      platformName: "Social Media Services",
      title: isAr ? "تعليمات تنفيذ الخدمة:" : "Service fulfillment details:",
      steps: isAr
        ? [
            "تأكد أن حسابك ومنشوراتك عامة (Public) وليست خاصة (Private) أثناء التنفيذ.",
            "يبدأ إرسال المتابعين/التفاعل تلقائياً خلال وقت قصير بعد تأكيد الطلب.",
            "لا تقم بتغيير يوزر الحساب أو رابط المنشور حتى يكتمل الطلب بالكامل.",
          ]
        : [
            "Ensure your profile and posts are set to Public (not Private) during fulfillment.",
            "Delivery starts automatically shortly after order confirmation.",
            "Do not change your username or post URL until completion.",
          ],
    };
  }

  // Default fallback
  return {
    platformName: "GX Store",
    title: isAr ? "طريقة استرداد وتفعيل الكود:" : "How to redeem and activate:",
    steps: isAr
      ? [
          "انسخ الكود الرقمي أو بيانات التفعيل الموضحة أعلاه.",
          "توجه إلى الموقع أو التطبيق الرسمي للخدمة وسجل الدخول بحسابك.",
          "ألصق الكود في خانة استرداد الرموز (Redeem Code / Product Key) للتفعيل الفوري والمباشر.",
        ]
      : [
          "Copy the digital key or credentials shown above.",
          "Visit the official website or app of the service and sign in.",
          "Paste the key into the Redeem Code / Product Key field for instant activation.",
        ],
  };
}
