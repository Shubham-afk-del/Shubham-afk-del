# Glyph data

The SVGs on this profile draw their text from glyph outlines instead of fonts,
so they render the same everywhere. These files hold outlines, advance widths
and pair kerning taken from the cuts my portfolio uses:

- `display.json`, `text.json`: Mona Sans by GitHub (weight 600 width 112, and weight 420 width 100)
- `mono.json`: Fragment Mono by Wei Huang
- `serif.json`: Newsreader Italic by Production Type (weight 400, optical size 48)

All three typefaces are licensed under the SIL Open Font License 1.1
(https://openfontlicense.org), and these derived files are distributed under it too.
`extract.py` rebuilds them with fontTools and HarfBuzz.
