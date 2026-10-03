#!/usr/bin/env python3
"""
Builds the self-hosted web fonts in src/lib/assets/fonts/.

You only need this if you change fonts or the character set; the generated .woff2 files
are committed. Requirements: Python 3 and `pip install fonttools brotli`.

    python3 scripts/build-fonts.py

Why a custom subset instead of an npm font package: the menu is Kazakh + Russian, which on
Google Fonts / Fontsource means four files per family (latin, cyrillic, cyrillic-ext for
Ә Ғ Қ Ң Ө Ұ Ү Һ, latin-ext for ₸). One trimmed file per family is roughly a third of that,
which matters for guests on mobile data.

Both families are SIL Open Font License 1.1 without a Reserved Font Name, so subsetting and
self-hosting them is allowed; the licence texts are saved next to the fonts.
"""

import io
import pathlib
import subprocess
import urllib.parse

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

# google/fonts commit the sources are pinned to (for reproducible output).
GOOGLE_FONTS_COMMIT = "9710da1eacb3be272583c3224dcb70f9da6eadbb"
BASE = f"https://raw.githubusercontent.com/google/fonts/{GOOGLE_FONTS_COMMIT}/ofl"

OUT = pathlib.Path(__file__).resolve().parent.parent / "src" / "lib" / "assets" / "fonts"

# Basic Latin and Latin-1 (digits, punctuation, the cafe name, the odd loanword),
# general punctuation (dashes, quotes, thin and no-break spaces), currency signs (₸ ₽ €), №,
# the Russian alphabet, and the Kazakh letters Ғ Қ Ң Ү Ұ Һ Ә Ө (І is in the basic Cyrillic block).
UNICODES = (
    "U+0020-007E,U+00A0-00FF,U+0131,U+0152-0153,U+02BC,U+02C6,U+02DA,U+02DC,U+0301,"
    "U+2010-2027,U+2030-203A,U+2044,U+20AC,U+20B8,U+20BD,U+2116,U+2122,U+2212,U+FFFD,"
    "U+0400-045F,U+0490-0493,U+049A-049B,U+04A2-04A3,U+04AE-04B1,U+04BA-04BB,"
    "U+04D8-04D9,U+04E8-04E9"
)

# Kazakh letters every font must contain; the build fails otherwise.
REQUIRED = "ӘәҒғҚқҢңӨөҰұҮүҺһІі₸"

LAYOUT_FEATURES = ["kern", "liga", "calt", "ccmp", "locl", "mark", "mkmk", "tnum", "lnum", "pnum", "case"]

FONTS = [
    # Body text: variable weight axis trimmed to the 400–700 range the site uses.
    {"dir": "onest", "file": "Onest[wght].ttf", "axes": {"wght": (400, 700)}, "out": "onest-wght.woff2"},
    # Headings: a single static Bold instance.
    {"dir": "alegreya", "file": "Alegreya[wght].ttf", "axes": {"wght": 700}, "out": "alegreya-bold.woff2"},
]


def fetch(url: str) -> bytes:
    # curl uses the system certificate store (python.org builds of Python on macOS often lack one).
    return subprocess.run(["curl", "-fsSL", url], check=True, capture_output=True).stdout


def build(spec: dict) -> None:
    font = TTFont(io.BytesIO(fetch(f"{BASE}/{spec['dir']}/{urllib.parse.quote(spec['file'])}")))
    font = instancer.instantiateVariableFont(font, spec["axes"])

    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = LAYOUT_FEATURES
    options.hinting = False
    options.desubroutinize = True
    options.name_IDs = ["*"]
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=subset.parse_unicodes(UNICODES))
    subsetter.subset(font)

    cmap = font.getBestCmap()
    missing = [ch for ch in REQUIRED if ord(ch) not in cmap]
    if missing:
        raise SystemExit(f"{spec['file']} is missing {''.join(missing)}")

    target = OUT / spec["out"]
    font.flavor = "woff2"
    font.save(target)
    (OUT / f"OFL-{spec['dir']}.txt").write_bytes(fetch(f"{BASE}/{spec['dir']}/OFL.txt"))
    print(f"{target.relative_to(OUT.parent.parent.parent.parent)}  {target.stat().st_size / 1024:.1f} KB, {len(cmap)} characters")


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for spec in FONTS:
        build(spec)
