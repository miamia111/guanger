"""Generate mobile-friendly WebP variants for exhibition artwork images."""

from pathlib import Path
from PIL import Image, ImageOps


PROJECT_DIR = Path(__file__).resolve().parents[1]
SOURCE_DIR = PROJECT_DIR / "assets" / "originals"
OUTPUT_DIR = PROJECT_DIR / "public" / "artworks"
THUMB_LONG_EDGE = 720
LARGE_LONG_EDGE = 1800
DECOR_DIR = PROJECT_DIR / "public" / "decor"


def resized(image: Image.Image, long_edge: int) -> Image.Image:
    width, height = image.size
    scale = min(1.0, long_edge / max(width, height))
    if scale == 1.0:
        return image.copy()
    size = (max(1, round(width * scale)), max(1, round(height * scale)))
    return image.resize(size, Image.Resampling.LANCZOS)


def save_variant(image: Image.Image, destination: Path, long_edge: int, quality: int) -> None:
    output = resized(image, long_edge)
    if output.mode not in ("RGB", "RGBA"):
        output = output.convert("RGBA" if "A" in output.getbands() else "RGB")
    output.save(destination, "WEBP", quality=quality, method=6)


def main() -> None:
    sources = [
        path
        for path in SOURCE_DIR.iterdir()
        if path.is_file() and not path.stem.endswith(("-thumb", "-large"))
    ]
    for source in sorted(sources):
        with Image.open(source) as opened:
            image = ImageOps.exif_transpose(opened)
            thumb = OUTPUT_DIR / f"{source.stem}-thumb.webp"
            large = OUTPUT_DIR / f"{source.stem}-large.webp"
            save_variant(image, thumb, THUMB_LONG_EDGE, 78)
            save_variant(image, large, LARGE_LONG_EDGE, 82)
            print(f"{source.name} -> {thumb.name}, {large.name}")

    # UI assets have dedicated display-sized variants. Keeping these separate
    # prevents a small button or translucent ornament from downloading a
    # multi-megabyte source image on first visit.
    ui_variants = [
        (DECOR_DIR / "button-paint-texture.png", DECOR_DIR / "button-paint-texture.webp", 720, 68),
        (DECOR_DIR / "lavender-landscape-v2.webp", DECOR_DIR / "lavender-landscape-mobile.webp", 960, 66),
        (DECOR_DIR / "guide-botanical-v3.webp", DECOR_DIR / "guide-botanical-mobile.webp", 560, 66),
        (OUTPUT_DIR / "chen-temple-large.webp", OUTPUT_DIR / "chen-temple-home-720.webp", 720, 70),
        (OUTPUT_DIR / "chen-temple-large.webp", OUTPUT_DIR / "chen-temple-home-1080.webp", 1080, 72),
    ]
    for source, destination, long_edge, quality in ui_variants:
        with Image.open(source) as opened:
            save_variant(ImageOps.exif_transpose(opened), destination, long_edge, quality)
        print(f"{source.name} -> {destination.name}")


if __name__ == "__main__":
    main()
