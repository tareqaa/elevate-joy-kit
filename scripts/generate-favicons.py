import os
from PIL import Image, ImageDraw
import numpy as np

# Source image provided by the user
SOURCE_IMAGE = r"C:\Users\alzaben\.gemini\antigravity-ide\brain\37dceceb-a6b1-497d-bd7a-8df068b73fd6\.user_uploaded\media_1789250649239.jpg"
PUBLIC_DIR = r"c:\Users\alzaben\Desktop\GXSTORE GEM\elevate-joy-kit\public"
APP_IMG_DIR = os.path.join(PUBLIC_DIR, "app", "assets", "img")

def generate_assets():
    # 1. Load source image
    src = Image.open(SOURCE_IMAGE).convert("RGB")
    arr = np.array(src)
    
    # 2. Crop exactly to the white logo bounds (threshold brightness > 35)
    gray = np.mean(arr, axis=2)
    coords = np.argwhere(gray > 35)
    y0, x0 = coords.min(axis=0)
    y1, x1 = coords.max(axis=0)
    
    cropped = src.crop((x0, y0, x1 + 1, y1 + 1))
    cw, ch = cropped.size
    print(f"Cropped logo size: {cw}x{ch}")
    
    # 3. Create high-resolution 1024x1024 master canvas for crisp downsampling
    canvas_size = 1024
    # Logo target size inside canvas: ~65% gives the ideal breathing room matching reference
    target_logo_size = int(canvas_size * 0.65)
    ratio = min(target_logo_size / cw, target_logo_size / ch)
    nw, nh = int(round(cw * ratio)), int(round(ch * ratio))
    resized_logo = cropped.resize((nw, nh), Image.Resampling.LANCZOS)
    
    # 4. Create squircle mask with continuous smooth corners (radius ~21% of canvas = 215px)
    mask = Image.new("L", (canvas_size * 2, canvas_size * 2), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle(
        [0, 0, canvas_size * 2 - 1, canvas_size * 2 - 1],
        radius=int(215 * 2),
        fill=255
    )
    mask = mask.resize((canvas_size, canvas_size), Image.Resampling.LANCZOS)
    
    # Solid black container (#000000)
    master = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    bg = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 255))
    master.paste(bg, (0, 0), mask)
    
    # 5. Extract clean alpha mask for the white logo
    carr = np.array(resized_logo)
    luma = (0.299 * carr[:, :, 0] + 0.587 * carr[:, :, 1] + 0.114 * carr[:, :, 2])
    alpha = np.clip((luma / 255.0) * 255, 0, 255).astype(np.uint8)
    
    white_logo = Image.new("RGBA", (nw, nh), (255, 255, 255, 255))
    white_logo.putalpha(Image.fromarray(alpha))
    
    ox = (canvas_size - nw) // 2
    oy = (canvas_size - nh) // 2
    master.paste(white_logo, (ox, oy), white_logo)
    
    # 6. Save outputs to public directory
    os.makedirs(PUBLIC_DIR, exist_ok=True)
    os.makedirs(APP_IMG_DIR, exist_ok=True)
    
    # High-res master 512
    icon_512 = master.resize((512, 512), Image.Resampling.LANCZOS)
    icon_512.save(os.path.join(PUBLIC_DIR, "android-chrome-512x512.png"), "PNG")
    
    # 192 for android
    icon_192 = master.resize((192, 192), Image.Resampling.LANCZOS)
    icon_192.save(os.path.join(PUBLIC_DIR, "android-chrome-192x192.png"), "PNG")
    
    # 180 for apple-touch-icon
    icon_180 = master.resize((180, 180), Image.Resampling.LANCZOS)
    icon_180.save(os.path.join(PUBLIC_DIR, "apple-touch-icon.png"), "PNG")
    
    # 48x48
    icon_48 = master.resize((48, 48), Image.Resampling.LANCZOS)
    
    # 32x32 (standard tab favicon)
    icon_32 = master.resize((32, 32), Image.Resampling.LANCZOS)
    icon_32.save(os.path.join(PUBLIC_DIR, "favicon-32x32.png"), "PNG")
    icon_32.save(os.path.join(PUBLIC_DIR, "favicon.png"), "PNG")
    
    # 16x16 (small tab favicon)
    icon_16 = master.resize((16, 16), Image.Resampling.LANCZOS)
    icon_16.save(os.path.join(PUBLIC_DIR, "favicon-16x16.png"), "PNG")
    
    # favicon.ico containing 16, 32, 48
    icon_32.save(
        os.path.join(PUBLIC_DIR, "favicon.ico"),
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)]
    )
    
    # Also update app/assets/img/gx-logo.png
    icon_512.save(os.path.join(APP_IMG_DIR, "gx-logo.png"), "PNG")
    
    print("All favicon and logo assets generated successfully!")

if __name__ == "__main__":
    generate_assets()
