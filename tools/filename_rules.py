"""Filename recognition rules shared by the artwork manager and tests."""

from __future__ import annotations

import re
from pathlib import Path


YEAR_RE = re.compile(r"(?<!\d)((?:19|20)\d{2})(?!\d)")
SIZE_RE = re.compile(r"\d+(?:\.\d+)?\s*[×xX*]\s*\d+(?:\.\d+)?\s*(?:cm|CM|厘米)?")
COPY_SUFFIX_RE = re.compile(r"(?:[-_ ](?:thumb|large|缩略图|大图)|\s*\(\d+\)|\s*副本)$", re.I)


def split_filename(stem: str, separators: str = "_-—") -> list[str]:
    stem = COPY_SUFFIX_RE.sub("", stem.strip())
    chars = "".join(re.escape(ch) for ch in separators)
    return [part.strip() for part in re.split(f"[{chars}]+", stem) if part.strip()]


def infer_filename(path: str | Path, settings: dict, known_authors: list[str]) -> dict:
    """Infer metadata without inventing uncertain values."""
    stem = Path(path).stem
    parts = split_filename(stem, settings.get("separators", "_-—"))
    materials = sorted(settings.get("materials", []), key=len, reverse=True)
    author = next((name for name in known_authors if name and name in stem), "")
    if not author and parts and re.fullmatch(r"[\u4e00-\u9fff·]{2,8}", parts[0]):
        author = parts[0]
    year_match = YEAR_RE.search(stem)
    year = year_match.group(1) if year_match else ""
    size_match = SIZE_RE.search(stem)
    size = size_match.group(0).replace("x", " × ").replace("X", " × ").replace("*", " × ") if size_match else ""
    medium = next((item for item in materials if item.lower() in stem.lower()), "")

    consumed = {value for value in (author, year, medium) if value}
    title_parts = []
    for part in parts:
        cleaned = part
        if size and SIZE_RE.fullmatch(part):
            continue
        if part in consumed:
            continue
        cleaned = YEAR_RE.sub("", cleaned).strip(" ()（）")
        if medium:
            cleaned = cleaned.replace(medium, "").strip()
        if author:
            cleaned = cleaned.replace(author, "").strip()
        if cleaned and not SIZE_RE.fullmatch(cleaned):
            title_parts.append(cleaned)
    title = " ".join(title_parts).strip() or stem

    mappings = settings.get("authorChapters", {})
    chapter = mappings.get(author, "voices" if author else "")
    confidence = sum(bool(x) for x in (author, title, medium, year, chapter))
    return {
        "source": str(path), "title": title, "artist": author,
        "medium": medium, "year": year, "size": size, "chapter": chapter,
        "confidence": confidence,
    }
