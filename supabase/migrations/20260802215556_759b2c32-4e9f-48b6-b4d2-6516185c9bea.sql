UPDATE avatars a SET name = v.name, image_url = v.url
FROM (VALUES
('bronze',1,'Pixel Rookie','https://api.dicebear.com/9.x/pixel-art/svg?seed=Pixel%20Rookie&backgroundType=gradientLinear&backgroundColor=3a1f0a,8a5220&radius=50&scale=95'),
('bronze',2,'8-Bit Kid','https://api.dicebear.com/9.x/pixel-art/svg?seed=8-Bit%20Kid&backgroundType=gradientLinear&backgroundColor=3a1f0a,8a5220&radius=50&scale=95'),
('bronze',3,'Arcade Ace','https://api.dicebear.com/9.x/pixel-art/svg?seed=Arcade%20Ace&backgroundType=gradientLinear&backgroundColor=3a1f0a,8a5220&radius=50&scale=95'),
('bronze',4,'Coin Runner','https://api.dicebear.com/9.x/pixel-art/svg?seed=Coin%20Runner&backgroundType=gradientLinear&backgroundColor=3a1f0a,8a5220&radius=50&scale=95'),
('bronze',5,'Retro Punk','https://api.dicebear.com/9.x/pixel-art/svg?seed=Retro%20Punk&backgroundType=gradientLinear&backgroundColor=3a1f0a,8a5220&radius=50&scale=95'),
('bronze',6,'Bit Knight','https://api.dicebear.com/9.x/pixel-art/svg?seed=Bit%20Knight&backgroundType=gradientLinear&backgroundColor=3a1f0a,8a5220&radius=50&scale=95'),
('bronze',7,'Joystick Jr','https://api.dicebear.com/9.x/pixel-art/svg?seed=Joystick%20Jr&backgroundType=gradientLinear&backgroundColor=3a1f0a,8a5220&radius=50&scale=95'),
('bronze',8,'Cartridge','https://api.dicebear.com/9.x/pixel-art/svg?seed=Cartridge&backgroundType=gradientLinear&backgroundColor=3a1f0a,8a5220&radius=50&scale=95'),
('silver',1,'Shadow Ninja','https://api.dicebear.com/9.x/adventurer/svg?seed=Shadow%20Ninja&backgroundType=gradientLinear&backgroundColor=1b2430,7b8794&radius=50&scale=95'),
('silver',2,'Ronin Blade','https://api.dicebear.com/9.x/adventurer/svg?seed=Ronin%20Blade&backgroundType=gradientLinear&backgroundColor=1b2430,7b8794&radius=50&scale=95'),
('silver',3,'Frost Archer','https://api.dicebear.com/9.x/adventurer/svg?seed=Frost%20Archer&backgroundType=gradientLinear&backgroundColor=1b2430,7b8794&radius=50&scale=95'),
('silver',4,'Storm Rogue','https://api.dicebear.com/9.x/adventurer/svg?seed=Storm%20Rogue&backgroundType=gradientLinear&backgroundColor=1b2430,7b8794&radius=50&scale=95'),
('silver',5,'Iron Scout','https://api.dicebear.com/9.x/adventurer/svg?seed=Iron%20Scout&backgroundType=gradientLinear&backgroundColor=1b2430,7b8794&radius=50&scale=95'),
('silver',6,'Ember Monk','https://api.dicebear.com/9.x/adventurer/svg?seed=Ember%20Monk&backgroundType=gradientLinear&backgroundColor=1b2430,7b8794&radius=50&scale=95'),
('silver',7,'Wind Duelist','https://api.dicebear.com/9.x/adventurer/svg?seed=Wind%20Duelist&backgroundType=gradientLinear&backgroundColor=1b2430,7b8794&radius=50&scale=95'),
('silver',8,'Night Ranger','https://api.dicebear.com/9.x/adventurer/svg?seed=Night%20Ranger&backgroundType=gradientLinear&backgroundColor=1b2430,7b8794&radius=50&scale=95'),
('gold',1,'Pro Sniper','https://api.dicebear.com/9.x/personas/svg?seed=Pro%20Sniper&backgroundType=gradientLinear&backgroundColor=3a2a05,c79a24&radius=50&scale=95'),
('gold',2,'Clutch King','https://api.dicebear.com/9.x/personas/svg?seed=Clutch%20King&backgroundType=gradientLinear&backgroundColor=3a2a05,c79a24&radius=50&scale=95'),
('gold',3,'Aim Master','https://api.dicebear.com/9.x/personas/svg?seed=Aim%20Master&backgroundType=gradientLinear&backgroundColor=3a2a05,c79a24&radius=50&scale=95'),
('gold',4,'Squad Captain','https://api.dicebear.com/9.x/personas/svg?seed=Squad%20Captain&backgroundType=gradientLinear&backgroundColor=3a2a05,c79a24&radius=50&scale=95'),
('gold',5,'Flick Queen','https://api.dicebear.com/9.x/personas/svg?seed=Flick%20Queen&backgroundType=gradientLinear&backgroundColor=3a2a05,c79a24&radius=50&scale=95'),
('gold',6,'Rush Leader','https://api.dicebear.com/9.x/personas/svg?seed=Rush%20Leader&backgroundType=gradientLinear&backgroundColor=3a2a05,c79a24&radius=50&scale=95'),
('gold',7,'Tactic Mind','https://api.dicebear.com/9.x/personas/svg?seed=Tactic%20Mind&backgroundType=gradientLinear&backgroundColor=3a2a05,c79a24&radius=50&scale=95'),
('gold',8,'MVP Legend','https://api.dicebear.com/9.x/personas/svg?seed=MVP%20Legend&backgroundType=gradientLinear&backgroundColor=3a2a05,c79a24&radius=50&scale=95'),
('platinum',1,'Void Walker','https://api.dicebear.com/9.x/micah/svg?seed=Void%20Walker&backgroundType=gradientLinear&backgroundColor=06283a,3fa8c9&radius=50&scale=95'),
('platinum',2,'Neon Samurai','https://api.dicebear.com/9.x/micah/svg?seed=Neon%20Samurai&backgroundType=gradientLinear&backgroundColor=06283a,3fa8c9&radius=50&scale=95'),
('platinum',3,'Cyber Oracle','https://api.dicebear.com/9.x/micah/svg?seed=Cyber%20Oracle&backgroundType=gradientLinear&backgroundColor=06283a,3fa8c9&radius=50&scale=95'),
('platinum',4,'Quantum Rider','https://api.dicebear.com/9.x/micah/svg?seed=Quantum%20Rider&backgroundType=gradientLinear&backgroundColor=06283a,3fa8c9&radius=50&scale=95'),
('platinum',5,'Phantom Agent','https://api.dicebear.com/9.x/micah/svg?seed=Phantom%20Agent&backgroundType=gradientLinear&backgroundColor=06283a,3fa8c9&radius=50&scale=95'),
('platinum',6,'Solar Knight','https://api.dicebear.com/9.x/micah/svg?seed=Solar%20Knight&backgroundType=gradientLinear&backgroundColor=06283a,3fa8c9&radius=50&scale=95'),
('platinum',7,'Nova Witch','https://api.dicebear.com/9.x/micah/svg?seed=Nova%20Witch&backgroundType=gradientLinear&backgroundColor=06283a,3fa8c9&radius=50&scale=95'),
('platinum',8,'Ghost Operative','https://api.dicebear.com/9.x/micah/svg?seed=Ghost%20Operative&backgroundType=gradientLinear&backgroundColor=06283a,3fa8c9&radius=50&scale=95'),
('diamond',1,'Mecha Titan','https://api.dicebear.com/9.x/bottts/svg?seed=Mecha%20Titan&backgroundType=gradientLinear&backgroundColor=141a4a,6a5cff&radius=50&scale=95'),
('diamond',2,'Battle Droid','https://api.dicebear.com/9.x/bottts/svg?seed=Battle%20Droid&backgroundType=gradientLinear&backgroundColor=141a4a,6a5cff&radius=50&scale=95'),
('diamond',3,'War Machine','https://api.dicebear.com/9.x/bottts/svg?seed=War%20Machine&backgroundType=gradientLinear&backgroundColor=141a4a,6a5cff&radius=50&scale=95'),
('diamond',4,'Plasma Core','https://api.dicebear.com/9.x/bottts/svg?seed=Plasma%20Core&backgroundType=gradientLinear&backgroundColor=141a4a,6a5cff&radius=50&scale=95'),
('diamond',5,'Steel Reaper','https://api.dicebear.com/9.x/bottts/svg?seed=Steel%20Reaper&backgroundType=gradientLinear&backgroundColor=141a4a,6a5cff&radius=50&scale=95'),
('diamond',6,'Nano Sentinel','https://api.dicebear.com/9.x/bottts/svg?seed=Nano%20Sentinel&backgroundType=gradientLinear&backgroundColor=141a4a,6a5cff&radius=50&scale=95'),
('diamond',7,'Omega Unit','https://api.dicebear.com/9.x/bottts/svg?seed=Omega%20Unit&backgroundType=gradientLinear&backgroundColor=141a4a,6a5cff&radius=50&scale=95'),
('diamond',8,'Prime Bot','https://api.dicebear.com/9.x/bottts/svg?seed=Prime%20Bot&backgroundType=gradientLinear&backgroundColor=141a4a,6a5cff&radius=50&scale=95'),
('legend',1,'Dragon Emperor','https://api.dicebear.com/9.x/lorelei/svg?seed=Dragon%20Emperor&backgroundType=gradientLinear&backgroundColor=2a0b3a,ff9d00&radius=50&scale=95'),
('legend',2,'Eternal Champion','https://api.dicebear.com/9.x/lorelei/svg?seed=Eternal%20Champion&backgroundType=gradientLinear&backgroundColor=2a0b3a,ff9d00&radius=50&scale=95'),
('legend',3,'Celestial Hero','https://api.dicebear.com/9.x/lorelei/svg?seed=Celestial%20Hero&backgroundType=gradientLinear&backgroundColor=2a0b3a,ff9d00&radius=50&scale=95'),
('legend',4,'Immortal Blade','https://api.dicebear.com/9.x/lorelei/svg?seed=Immortal%20Blade&backgroundType=gradientLinear&backgroundColor=2a0b3a,ff9d00&radius=50&scale=95'),
('legend',5,'Arcane Sovereign','https://api.dicebear.com/9.x/lorelei/svg?seed=Arcane%20Sovereign&backgroundType=gradientLinear&backgroundColor=2a0b3a,ff9d00&radius=50&scale=95'),
('legend',6,'Star Conqueror','https://api.dicebear.com/9.x/lorelei/svg?seed=Star%20Conqueror&backgroundType=gradientLinear&backgroundColor=2a0b3a,ff9d00&radius=50&scale=95'),
('legend',7,'Void Emperor','https://api.dicebear.com/9.x/lorelei/svg?seed=Void%20Emperor&backgroundType=gradientLinear&backgroundColor=2a0b3a,ff9d00&radius=50&scale=95'),
('legend',8,'Mythic One','https://api.dicebear.com/9.x/lorelei/svg?seed=Mythic%20One&backgroundType=gradientLinear&backgroundColor=2a0b3a,ff9d00&radius=50&scale=95')
) AS v(slug, so, name, url)
JOIN avatar_collections c ON c.slug = v.slug
WHERE a.collection_id = c.id AND a.sort_order = v.so;

UPDATE avatar_collections SET border_css = 'linear-gradient(135deg,#8a5220,#d99a4e)', name_ar = 'مجموعة البرونز — ريترو بكسل', name_en = 'Bronze — Retro Pixel' WHERE slug = 'bronze';
UPDATE avatar_collections SET border_css = 'linear-gradient(135deg,#7b8794,#e2e8f0)', name_ar = 'مجموعة الفضة — أبطال المغامرة', name_en = 'Silver — Adventurers' WHERE slug = 'silver';
UPDATE avatar_collections SET border_css = 'linear-gradient(135deg,#c79a24,#ffd76a)', name_ar = 'مجموعة الذهب — المحترفون', name_en = 'Gold — Pro Players' WHERE slug = 'gold';
UPDATE avatar_collections SET border_css = 'linear-gradient(135deg,#3fa8c9,#a5f3fc)', name_ar = 'مجموعة البلاتين — سايبر', name_en = 'Platinum — Cyber Ops' WHERE slug = 'platinum';
UPDATE avatar_collections SET border_css = 'linear-gradient(135deg,#6a5cff,#22d3ee)', name_ar = 'مجموعة الألماس — روبوتات قتالية', name_en = 'Diamond — Battle Mechs' WHERE slug = 'diamond';
UPDATE avatar_collections SET border_css = 'linear-gradient(135deg,#ff9d00,#ff2fd0,#7c3aed)', name_ar = 'مجموعة الأساطير', name_en = 'Legend — Mythic' WHERE slug = 'legend';