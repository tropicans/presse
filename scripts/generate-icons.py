import os
import base64
from PIL import Image

src_path = r"C:\Users\yudhiar\.gemini\antigravity-ide\brain\64ecf350-2c56-45c4-8bbb-90afcfa50a18\.user_uploaded\media_1790565095304.png"
src = Image.open(src_path).convert("RGBA")

# The squircle icon is bounded by (267, 96, 757, 574)
icon = src.crop((267, 96, 757, 574)) # 490 x 478
# Center it on a 490x490 canvas to preserve exact aspect ratio
canvas = Image.new("RGBA", (490, 490), (0, 0, 0, 0))
canvas.paste(icon, (0, 6))

# Resampled versions
img_512 = canvas.resize((512, 512), Image.Resampling.LANCZOS)
img_192 = canvas.resize((192, 192), Image.Resampling.LANCZOS)
img_180 = canvas.resize((180, 180), Image.Resampling.LANCZOS)
img_48 = canvas.resize((48, 48), Image.Resampling.LANCZOS)
img_32 = canvas.resize((32, 32), Image.Resampling.LANCZOS)
img_16 = canvas.resize((16, 16), Image.Resampling.LANCZOS)

# Target directories
public_dir = r"c:\Users\yudhiar\Downloads\oprek\Dev\jott\public"
app_dir = r"c:\Users\yudhiar\Downloads\oprek\Dev\jott\src\app"

# Save PNGs in public
img_512.save(os.path.join(public_dir, "icon-512.png"), "PNG")
img_192.save(os.path.join(public_dir, "icon-192.png"), "PNG")
img_512.save(os.path.join(public_dir, "icon.png"), "PNG")
img_512.save(os.path.join(public_dir, "logo.png"), "PNG")
img_180.save(os.path.join(public_dir, "apple-touch-icon.png"), "PNG")
img_32.save(os.path.join(public_dir, "favicon-32x32.png"), "PNG")
img_16.save(os.path.join(public_dir, "favicon-16x16.png"), "PNG")

# Save ICO in public
canvas.save(os.path.join(public_dir, "favicon.ico"), format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])

# Save in src/app
img_512.save(os.path.join(app_dir, "icon.png"), "PNG")
img_180.save(os.path.join(app_dir, "apple-icon.png"), "PNG")
canvas.save(os.path.join(app_dir, "favicon.ico"), format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])

# Generate SVG containing base64 data URI
with open(os.path.join(public_dir, "icon-512.png"), "rb") as f:
    b64_png = base64.b64encode(f.read()).decode("utf-8")

svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <image href="data:image/png;base64,{b64_png}" width="512" height="512" />
</svg>
'''

with open(os.path.join(app_dir, "icon.svg"), "w", encoding="utf-8") as f:
    f.write(svg_content)

with open(os.path.join(public_dir, "logo.svg"), "w", encoding="utf-8") as f:
    f.write(svg_content)

print("All icon assets generated successfully!")
