"""
Turn the portfolio's font cuts into glyph outlines the SVG scripts can lay out.

Every SVG in this profile draws its text as vector outlines instead of relying
on a font being available inside an <img>, so it renders the same on every
browser and in GitHub's image proxy. This writes one JSON file per font:
advance widths, outlines in font units (y up) and the pair kerning HarfBuzz
applies, so the Node scripts can set text without a shaping engine.

Run once, locally (needs fontTools + uharfbuzz):
    python scripts/fonts/extract.py <portfolio-v2 checkout>
"""

import io
import json
import sys
from pathlib import Path

import uharfbuzz as hb
from fontTools.pens.basePen import BasePen
from fontTools.ttLib import TTFont

FONTS = {
    # name: (path inside the portfolio checkout, what it is)
    "display": ("assets/og/mona-display.ttf", "Mona Sans, weight 600, width 112"),
    "text": ("assets/og/mona-text.ttf", "Mona Sans, weight 420, width 100"),
    "mono": ("assets/og/fragment-mono.ttf", "Fragment Mono Regular"),
    "serif": ("app/fonts/newsreader-italic-display.woff2", "Newsreader Italic, weight 400, opsz 48"),
}


class CommandPen(BasePen):
    """Records an outline as [op, x, y, ...] lists with integer font units."""

    def __init__(self, glyph_set):
        super().__init__(glyph_set)
        self.commands = []

    def _moveTo(self, pt):
        self.commands.append(["M", *map(round, pt)])

    def _lineTo(self, pt):
        self.commands.append(["L", *map(round, pt)])

    def _qCurveToOne(self, pt1, pt2):
        self.commands.append(["Q", *map(round, pt1), *map(round, pt2)])

    def _curveToOne(self, pt1, pt2, pt3):
        self.commands.append(["C", *map(round, pt1), *map(round, pt2), *map(round, pt3)])

    def _closePath(self):
        self.commands.append(["Z"])


def extract(path: Path) -> dict:
    font = TTFont(path)
    cmap = font.getBestCmap()
    glyph_set = font.getGlyphSet()
    hmtx = font["hmtx"]
    upm = font["head"].unitsPerEm
    os2 = font["OS/2"]

    glyphs = {}
    for code, name in sorted(cmap.items()):
        pen = CommandPen(glyph_set)
        glyph_set[name].draw(pen)
        glyphs[chr(code)] = {"adv": hmtx[name][0], "d": pen.commands}

    # Pair kerning as HarfBuzz applies it (GPOS 'kern'): shape every pair and
    # keep the difference between the shaped and the nominal first advance.
    # HarfBuzz reads plain sfnt data, so a WOFF2 file is decompressed first.
    sfnt = io.BytesIO()
    font.flavor = None
    font.save(sfnt)
    hb_font = hb.Font(hb.Face(hb.Blob(sfnt.getvalue())))
    chars = [c for c in glyphs if c.strip()]
    kern = {}
    for a in chars:
        for b in chars:
            buf = hb.Buffer()
            buf.add_str(a + b)
            buf.guess_segment_properties()
            hb.shape(hb_font, buf, {"kern": True, "liga": False})
            if len(buf.glyph_positions) != 2:
                continue
            delta = buf.glyph_positions[0].x_advance - glyphs[a]["adv"]
            if delta:
                kern[a + b] = delta

    return {
        "upm": upm,
        "ascender": font["hhea"].ascent,
        "descender": font["hhea"].descent,
        "capHeight": getattr(os2, "sCapHeight", 0),
        "xHeight": getattr(os2, "sxHeight", 0),
        "glyphs": glyphs,
        "kern": kern,
    }


def main() -> None:
    root = Path(sys.argv[1]).expanduser()
    out = Path(__file__).parent
    for name, (rel, label) in FONTS.items():
        data = extract(root / rel)
        data["name"] = label
        (out / f"{name}.json").write_text(json.dumps(data, separators=(",", ":")))
        print(f"{name}: {len(data['glyphs'])} glyphs, {len(data['kern'])} kerning pairs")


if __name__ == "__main__":
    main()
