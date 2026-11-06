#!/usr/bin/env python3
"""Copies the Noto Sans script and symbol fonts into src/assets/fonts/fallback.

Usage: Font_Fallback_Import.py <noto font dir> <output dir>
Needs fonttools (nix-shell -p python3Packages.fonttools).

Variable fonts are pinned to Regular: resvg draws a variable font with its
default instance, which is Light or Bold depending on the file. Then run
tools/Font_Fallback_Generator.ts to rebuild the coverage table.
"""

import re
import shutil
import sys
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

# Style and width variants of fonts already imported, and the base fonts
# already in src/assets/fonts.
EXCLUDED = re.compile(
    r"Mono|Display|Looped|UI|Condensed|"
    r"-(Bold|Black|Light|Thin|Medium|ExtraBold|ExtraLight|SemiBold|Italic)|"
    r"^NotoSans(-|\.|Arabic|JP|KR|CJK)|"
    # No use on a card: 2.8 MB of notation, layout variants, a test font. Kharoshthi
    # aborts local resvg: right-to-left, so the space closing its clusters (svgKit.text)
    # lands on the wrong side, and nobody writes nicknames in it.
    r"SignWriting|AdlamUnjoined|SyriacWestern|NotoSansTest|Kharoshthi"
)

# Scripts Noto only draws with serifs. Tibetan marks are common in decorated
# nicknames. Tangut stays out: thousands of glyphs nobody uses as decoration.
SERIF_ONLY = re.compile(
    r"^NotoSerif(Ahom|DivesAkuru|Dogra|KhitanSmallScript|Makasar|NPHmong|OldUyghur|"
    r"OttomanSiyaq|Tibetan|Todhri|Toto|Vithkuqi|Yezidi)"
)


def main(source: Path, output: Path) -> None:
    output.mkdir(parents=True, exist_ok=True)

    files = (
        sorted(source.glob("NotoSans*.*"))
        + sorted(source.glob("NotoMusic*.*"))
        + [path for path in sorted(source.glob("NotoSerif*.*")) if SERIF_ONLY.search(path.name)]
    )
    for path in files:
        if path.suffix not in (".ttf", ".otf") or EXCLUDED.search(path.name):
            continue

        target = output / path.name
        font = TTFont(path)

        if "fvar" not in font:
            shutil.copyfile(path, target)
            target.chmod(0o644)
            continue

        axes = {
            axis.axisTag: 400 if axis.axisTag == "wght" else axis.defaultValue
            for axis in font["fvar"].axes
        }
        static = instancer.instantiateVariableFont(font, axes, updateFontNames=True)
        static.save(target)


if __name__ == "__main__":
    main(Path(sys.argv[1]), Path(sys.argv[2]))
