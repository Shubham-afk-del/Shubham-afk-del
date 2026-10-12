"""
Turn my GitHub avatar into the pixel portrait the CRT terminal draws.

The studio background is a smooth grey gradient, so it is found by growing a
region in from the image edges while neighbouring pixels stay close in colour;
that region becomes the dark screen. Everything else (hair, face, shirt, suit)
is quantised to four phosphor levels with a little ordered dithering.

Run once, locally (needs Pillow):
    python scripts/portrait.py ~/Downloads/github-avatar-800.jpg
"""

import json
import sys
from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter

COLS, ROWS = 56, 64
BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]


def background_mask(img: Image.Image, tolerance: float = 11.0) -> list[list[bool]]:
    w, h = img.size
    px = img.load()
    seen = [[False] * w for _ in range(h)]
    queue = deque()
    # Seed from the top and the upper sides only: the suit runs off the bottom edge.
    for x in range(w):
        queue.append((x, 0))
    for y in range(int(h * 0.62)):
        queue.extend([(0, y), (w - 1, y)])
    for x, y in queue:
        seen[y][x] = True
    while queue:
        x, y = queue.popleft()
        r, g, b = px[x, y]
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not seen[ny][nx]:
                r2, g2, b2 = px[nx, ny]
                # Only neutral greys belong to the backdrop; skin and the suit are tinted.
                neutral = max(r2, g2, b2) - min(r2, g2, b2) < 22
                if neutral and abs(r2 - r) + abs(g2 - g) + abs(b2 - b) < tolerance:
                    seen[ny][nx] = True
                    queue.append((nx, ny))
    return seen


def main() -> None:
    src = Image.open(Path(sys.argv[1]).expanduser()).convert("RGB")
    # Head and shoulders, at the terminal's aspect ratio.
    crop_w = 600
    crop_h = round(crop_w * ROWS / COLS)
    left = (src.width - crop_w) // 2
    img = src.crop((left, 40, left + crop_w, 40 + crop_h)).filter(ImageFilter.GaussianBlur(1.2))
    work = img.resize((COLS * 5, ROWS * 5), Image.LANCZOS)
    mask = background_mask(work)

    cells = []
    for row in range(ROWS):
        line = []
        for col in range(COLS):
            bg = 0
            lum = 0.0
            for dy in range(5):
                for dx in range(5):
                    x, y = col * 5 + dx, row * 5 + dy
                    bg += mask[y][x]
                    r, g, b = work.getpixel((x, y))
                    lum += 0.2126 * r + 0.7152 * g + 0.0722 * b
            line.append(None if bg > 15 else lum / (25 * 255))
        cells.append(line)

    # Stretch the subject's own tonal range (5th to 97th percentile) over the
    # four phosphor levels, so the face keeps its eyes, brows and beard.
    values = sorted(v for line in cells for v in line if v is not None)
    lo = values[int(len(values) * 0.05)]
    hi = values[int(len(values) * 0.97)]
    grid = []
    for row, line in enumerate(cells):
        out_line = []
        for col, v in enumerate(line):
            if v is None:
                out_line.append(0)
                continue
            t = min(1.0, max(0.0, (v - lo) / (hi - lo))) ** 0.9
            t += (BAYER[row % 4][col % 4] / 16 - 0.5) * 0.16
            out_line.append(max(1, min(4, 1 + int(t * 4))))
        grid.append("".join(map(str, out_line)))

    if len(sys.argv) > 2:
        shades = {0: (4, 22, 10), 1: (20, 92, 44), 2: (40, 160, 78), 3: (86, 224, 128), 4: (196, 255, 214)}
        preview = Image.new("RGB", (COLS * 6, ROWS * 6), shades[0])
        for row, line in enumerate(grid):
            for col, ch in enumerate(line):
                preview.paste(shades[int(ch)], (col * 6, row * 6, col * 6 + 6, row * 6 + 4))
        preview.save(sys.argv[2])

    out = Path(__file__).parent / "portrait.json"
    out.write_text(json.dumps({"cols": COLS, "rows": ROWS, "levels": grid}, indent=1))
    print("\n".join(row.replace("0", " ") for row in grid))


if __name__ == "__main__":
    main()
