import os
from PIL import Image, ImageChops, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC_512 = os.path.join(ROOT, "public", "icon-512.png")
PUBLIC_192 = os.path.join(ROOT, "public", "icon-192.png")
FAVICON_ICO = os.path.join(ROOT, "public", "favicon.ico")


def build_square_master(art: Image.Image, size: int = 512, fill_ratio: float = 0.78) -> Image.Image:
    """Create a centered white-background square icon from the cropped Opal artwork."""
    canvas = Image.new("RGBA", (size, size), (255, 255, 255, 255))
    max_dim = int(round(size * fill_ratio))
    scale = min(max_dim / art.width, max_dim / art.height)
    new_w = max(1, int(round(art.width * scale)))
    new_h = max(1, int(round(art.height * scale)))
    resized = art.resize((new_w, new_h), Image.Resampling.LANCZOS).convert("RGBA")
    x = (size - new_w) // 2
    y = (size - new_h) // 2
    canvas.paste(resized, (x, y))
    return canvas


def masked_legacy_icon(master: Image.Image, size: int, is_round: bool) -> Image.Image:
    base = master.resize((size, size), Image.Resampling.LANCZOS).convert("RGBA")
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    if is_round:
        draw.ellipse((0, 0, size - 1, size - 1), fill=255)
    else:
        radius = int(round(size * 0.22))
        draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(base, (0, 0), mask)
    return out


def main() -> None:
    src = Image.open(PUBLIC_512).convert("RGB")
    bg = Image.new("RGB", src.size, (255, 255, 255))
    diff = ImageChops.difference(src, bg).point(lambda x: 255 if x > 8 else 0)
    bbox = diff.getbbox()
    art = src.crop(bbox) if bbox else src

    # 1. Public PWA & web icons
    master_512 = build_square_master(art, 512, fill_ratio=0.80)
    master_512.convert("RGB").save(PUBLIC_512, format="PNG", optimize=True)
    master_512.resize((192, 192), Image.Resampling.LANCZOS).convert("RGB").save(
        PUBLIC_192, format="PNG", optimize=True
    )
    master_512.resize((32, 32), Image.Resampling.LANCZOS).save(
        FAVICON_ICO, format="ICO", sizes=[(32, 32)]
    )

    # 2. Android adaptive foreground (artwork centered inside 66% safe zone)
    res_dir = os.path.join(ROOT, "android", "res")
    adaptive_src = build_square_master(art, 432, fill_ratio=0.58)
    nodpi_dir = os.path.join(res_dir, "drawable-nodpi")
    os.makedirs(nodpi_dir, exist_ok=True)
    adaptive_src.save(
        os.path.join(nodpi_dir, "ic_launcher_foreground.png"), format="PNG", optimize=True
    )

    # 3. Legacy launcher density icons
    densities = {
        "mdpi": 48,
        "hdpi": 72,
        "xhdpi": 96,
        "xxhdpi": 144,
        "xxxhdpi": 192,
    }
    for density, sz in densities.items():
        d = os.path.join(res_dir, f"mipmap-{density}")
        os.makedirs(d, exist_ok=True)
        masked_legacy_icon(master_512, sz, is_round=False).save(
            os.path.join(d, "ic_launcher.png"), format="PNG", optimize=True
        )
        masked_legacy_icon(master_512, sz, is_round=True).save(
            os.path.join(d, "ic_launcher_round.png"), format="PNG", optimize=True
        )

    print("Generated Opal web and Android launcher icons.")


if __name__ == "__main__":
    main()
