"""Generate mobile-friendly WebP variants for exhibition artwork images."""

from pathlib import Path
from PIL import Image, ImageOps


PROJECT_DIR = Path(__file__).resolve().parents[1]
SOURCE_DIR = PROJECT_DIR / "assets" / "originals"
OUTPUT_DIR = PROJECT_DIR / "public" / "artworks"
THUMB_LONG_EDGE = 720
LARGE_LONG_EDGE = 1800


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


if __name__ == "__main__":
    main()
