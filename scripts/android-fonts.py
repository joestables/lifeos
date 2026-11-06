"""Writes LifeOS's font (tokens.md: Plus Jakarta Sans) as the static TTFs
Android draws natively with: the Alarm screen and the Today widget
(components.md). From the web app's own variable font
(@fontsource-variable/plus-jakarta-sans, OFL-1.1), latin, at the weights the
design system uses. Run after the font changes, with fontTools and brotli:

    python3 scripts/android-fonts.py
"""

from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2"
OUT = ROOT / "android/app/src/main/res/font"
# The weights tokens.md uses: body, semibold (buttons, titles), h2, h1 and the clock.
WEIGHTS = {400: "regular", 600: "semibold", 700: "bold", 750: "heavy"}

OUT.mkdir(parents=True, exist_ok=True)
for weight, name in WEIGHTS.items():
    font = TTFont(SOURCE)
    instance = instantiateVariableFont(font, {"wght": weight})
    instance.flavor = None
    instance.save(OUT / f"plus_jakarta_sans_{name}.ttf")

fonts = "\n".join(
    f'    <font app:fontStyle="normal" app:fontWeight="{w}" app:font="@font/plus_jakarta_sans_{n}"\n'
    f'        android:fontStyle="normal" android:fontWeight="{w}" android:font="@font/plus_jakarta_sans_{n}" />'
    for w, n in WEIGHTS.items()
)
(OUT / "lifeos_sans.xml").write_text(
    '<?xml version="1.0" encoding="utf-8"?>\n'
    "<!-- LifeOS's font (tokens.md), Plus Jakarta Sans (OFL-1.1): written by\n"
    "     scripts/android-fonts.py. -->\n"
    '<font-family xmlns:android="http://schemas.android.com/apk/res/android"\n'
    '    xmlns:app="http://schemas.android.com/apk/res-auto">\n'
    f"{fonts}\n"
    "</font-family>\n"
)
print(f"{len(WEIGHTS)} weights written.")
