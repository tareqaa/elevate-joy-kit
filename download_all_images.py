import os, json, urllib.request, time

os.makedirs('public/app/assets/img/catalog', exist_ok=True)
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
}

# Read output.txt containing the json of all products with image_url
with open(r'C:\Users\alzaben\.gemini\antigravity-ide\brain\c09de7a6-cd92-4522-a6a9-85ebe77fd211\.system_generated\steps\798\output.txt', 'r', encoding='utf-8') as f:
    raw_obj = json.load(f)

res_text = raw_obj['result']
s_idx = res_text.find('[{')
e_idx = res_text.rfind('}]') + 2
json_str = res_text[s_idx:e_idx]
items = json.loads(json_str)

print(f"Total items to download: {len(items)}")

updates = []

# Override Xbox Game Pass Ultimate with the clean official Microsoft poster (without "1 Month")
GPU_CLEAN_URL = 'https://cms-assets.xboxservices.com/assets/35/4b/354b3ddf-1b39-48c2-92d7-44e5fda75dc4.jpg?n=RE2TAjc.jpg&q=90&o=f&w=720&h=1080'

for item in items:
    slug = item['slug']
    url = item['image_url']
    if slug == 'xbox-game-pass-ultimate':
        url = GPU_CLEAN_URL

    ext = '.jpg'
    if '.png' in url.lower():
        ext = '.png'
    elif '.webp' in url.lower():
        ext = '.webp'

    dest_filename = f"{slug}{ext}"
    dest_path = os.path.join('public/app/assets/img/catalog', dest_filename)

    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = resp.read()
            # Check content-type
            ct = resp.headers.get('Content-Type', '')
            if 'png' in ct and not dest_filename.endswith('.png'):
                ext = '.png'
                dest_filename = f"{slug}.png"
                dest_path = os.path.join('public/app/assets/img/catalog', dest_filename)
            elif 'webp' in ct and not dest_filename.endswith('.webp'):
                ext = '.webp'
                dest_filename = f"{slug}.webp"
                dest_path = os.path.join('public/app/assets/img/catalog', dest_filename)
            
            with open(dest_path, 'wb') as out_f:
                out_f.write(data)
            
            local_url = f"/app/assets/img/catalog/{dest_filename}"
            updates.append((slug, local_url))
            print(f"[OK] {slug} -> {local_url} ({len(data)} bytes)")
    except Exception as e:
        print(f"[ERR] {slug} ({url}): {e}")
        # fallback try if driffle has raw static url
        if 'driffle.com/_next/image?url=' in url:
            try:
                import urllib.parse
                parsed = urllib.parse.urlparse(url)
                qs = urllib.parse.parse_qs(parsed.query)
                raw_url = qs.get('url', [''])[0]
                if raw_url:
                    req = urllib.request.Request(raw_url, headers=headers)
                    with urllib.request.urlopen(req, timeout=15) as resp2:
                        data = resp2.read()
                        with open(dest_path, 'wb') as out_f:
                            out_f.write(data)
                        local_url = f"/app/assets/img/catalog/{dest_filename}"
                        updates.append((slug, local_url))
                        print(f"[RETRY OK] {slug} -> {local_url}")
            except Exception as e2:
                print(f"[RETRY FAILED] {slug}: {e2}")

# Write SQL update file
sql_statements = []
for slug, local_url in updates:
    sql_statements.append(f"UPDATE products SET image_url = '{local_url}', icon_image_url = '{local_url}' WHERE slug = '{slug}';")

with open('update_local_images.sql', 'w', encoding='utf-8') as f:
    f.write('\n'.join(sql_statements))

print(f"\nCompleted {len(updates)} / {len(items)} image downloads.")
print("Generated update_local_images.sql")
