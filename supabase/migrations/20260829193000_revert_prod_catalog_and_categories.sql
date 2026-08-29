-- ============================================================
-- Migration: Revert yesterday's imported products and categories
-- ============================================================

DO $$
DECLARE
  v_prod_slugs text[] := ARRAY[
    'arc-raiders-global-pc-steam-digital-key',
    'arc-raiders-global-pc-steam-digital-key-1',
    'assassins-creed-valhalla-steam-key-pc-global',
    'avast-secureline-vpn-1-devices-1-year-avast-key-gl',
    'avg-secure-vpn-1-device-1-year-avg-key-global',
    'batman-arkham-collection-steam-key-global',
    'batman-arkham-origins-steam-key-global',
    'bioshock-infinite-steam-key-global',
    'bioshock-the-collection-steam-key-global',
    'bioshock-the-collection-xbox-live-key-global',
    'capcut-pro-1-month-global-capcut-account',
    'control-ultimate-edition-steam-key-global',
    'dark-souls-remastered-xbox-live-key-global',
    'discord-nitro-1-month-digtal-key-global',
    'discord-nitro-1-year-global',
    'discord-nitro-3-month-trail-0-global',
    'discord-server-14x-boost-1-month-subscription-glob',
    'discord-server-14x-boost-3-months-subscription-glo',
    'discord-server-7x-boost-1-month-subscription-globa',
    'ea-sports-fc-26-global-pc-steam-account',
    'ea-sports-fc-27-global-pc-steam-account',
    'ea-sports-fc-27-global-xbox-standard-edition',
    'euro-truck-simulator-2-global-pc-mac-linux-steam-d',
    'expressvpn-1-month-account',
    'forza-horizon-6-global-pc-steam-account',
    'forza-horizon-6-global-pc-xbox-series-xs-xbox-live',
    'google-play-gift-card-10-usd-key-united-states',
    'google-play-gift-card-100-usd-key-united-states',
    'google-play-gift-card-20-usd-key-united-states',
    'google-play-gift-card-5-usd-key-united-states',
    'google-play-gift-card-50-usd-key-united-states',
    'grand-theft-auto-v-enhanced-pc-rockstar-games-laun',
    'grand-theft-auto-v-xbox-series-sx-xbox-live-key-gl',
    'gta-iv-complete-edition-rockstar-games-launcher-ke',
    'helldivers-2-global-pc-steam-digital-key',
    'hollow-knight-silksong-global-pc-steam-digital-key',
    'hollow-knight-silksong-pcxbox-xbox-live-key-global',
    'human-fall-flat-steam-key-global',
    'jusant-pc-steam-key-global',
    'mafia-ii-definitive-edition-steam-key-global',
    'middle-earth-shadow-of-mordor-goty-steam-key-globa',
    'middle-earth-shadow-of-war-definitive-edition-stea',
    'minecraft-java-bedrock-edition-pc-windows-store-ke',
    'minecraft-xbox-onexbox-series-xs-xbox-live-key-glo',
    'mortal-kombat-1-pc-steam-key-global',
    'mortal-kombat-11-ultimate-steam-key-global',
    'mortal-kombat-xl-steam-key-global',
    'mount-blade-ii-bannerlord-steam-key-global',
    'nba-2k26-global-pc-steam-digital-key',
    'ori-and-the-blind-forest-definitive-edition-steam-',
    'pc-game-pass-12-month',
    'pc-game-pass-3-month',
    'pc-game-pass-6-month',
    'pc-game-pass-9-month',
    'peak-steam-key-pc-global',
    'ratchet-clank-rift-apart-pc-steam-key-global',
    'red-dead-redemption-2-rockstar-games-launcher-key-',
    'resident-evil-4-gold-edition-pc-steam-key-global',
    'resident-evil-4-pc-steam-key-global',
    'resident-evil-7-biohazard-steam-key-global',
    'resident-evil-7-gold-edition-village-gold-edition-',
    'resident-evil-village-resident-evil-8-gold-edition',
    'resident-evil-village-resident-evil-8-steam-key-gl',
    'surfshark-vpn-unlimited-devices-2-month-trial-key-',
    'xbox-gamepass-ultimate-1-month',
    'xbox-gamepass-ultimate-10-month-account',
    'xbox-gamepass-ultimate-10-month',
    'xbox-gamepass-ultimate-12-month-account',
    'xbox-gamepass-ultimate-12-month',
    'xbox-gamepass-ultimate-2-month-account',
    'xbox-gamepass-ultimate-35-month',
    'xbox-gamepass-ultimate-4-month-account',
    'xbox-gamepass-ultimate-6-month-account',
    'xbox-gamepass-ultimate-65-month',
    'xbox-gamepass-ultimate-8-month'
  ];
  v_cat_slugs text[] := ARRAY[
    'rockstar-games',
    'discord',
    'vpn-services'
  ];
BEGIN
  -- 1. Delete product variants
  DELETE FROM public.product_variants
  WHERE product_id IN (
    SELECT id FROM public.products
    WHERE slug = ANY(v_prod_slugs)
       OR created_at >= '2026-08-28T00:00:00Z'
  );

  -- 2. Delete products
  DELETE FROM public.products
  WHERE slug = ANY(v_prod_slugs)
     OR created_at >= '2026-08-28T00:00:00Z';

  -- 3. Delete categories added yesterday
  DELETE FROM public.categories
  WHERE slug = ANY(v_cat_slugs);

END $$;
