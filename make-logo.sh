#!/bin/bash
# Turn the Chifstay wordmark into the two files the site needs.
#
#   ./make-logo.sh ~/Downloads/chifstay-logo.png
#
# In:  the wordmark as supplied, black artwork on a white background.
# Out: assets/logo-black.png  black artwork, background removed
#      assets/logo-white.png  the same shape in white, background removed
#      plus .webp of each, which is what the pages actually load.
#
# Why two files and not one recoloured by CSS: this is a raster wordmark, so a
# filter would have to invert it, and inverting anti-aliased black gives grey
# fringes on a dark ground. Two exports, each with clean alpha, look right on
# both.
set -euo pipefail

SRC="${1:-}"
[ -f "$SRC" ] || { echo "usage: ./make-logo.sh <fichier-du-logo>"; exit 1; }
cd "$(dirname "$0")"
mkdir -p assets

echo "source : $(magick identify -format '%wx%h %[colorspace]' "$SRC")"

# Trim the white margin first so the logo sits flush in the nav, then key the
# white out. -fuzz 12% catches the off-white of a scan or a JPEG without eating
# into the strokes; the alpha is what removes the box, not a white rectangle.
magick "$SRC" \
  -fuzz 12% -trim +repage \
  -bordercolor white -border 2 \
  -alpha set -fuzz 12% -fill none -draw "alpha 0,0 floodfill" \
  -shave 2x2 \
  -resize x400 \
  PNG32:assets/logo-black.png

# The white version: keep the alpha that was just computed, paint every opaque
# pixel white. +level-colors does it without touching the edge softness, so the
# curves stay smooth on a dark ground.
magick assets/logo-black.png \
  -channel RGB -fill white -colorize 100 \
  PNG32:assets/logo-white.png

for f in logo-black logo-white; do
  cwebp -quiet -q 92 -alpha_q 100 "assets/$f.png" -o "assets/$f.webp"
  printf "  %-16s %sx%s  %s ko png  %s ko webp\n" "$f" \
    "$(magick identify -format %w "assets/$f.png")" \
    "$(magick identify -format %h "assets/$f.png")" \
    "$(( $(stat -f%z "assets/$f.png") / 1024 ))" \
    "$(( $(stat -f%z "assets/$f.webp") / 1024 ))"
done

# A quick honesty check: a logo whose background was not keyed out is opaque
# everywhere, and that is the failure that looks fine on a white page and
# terrible in the footer.
for f in logo-black logo-white; do
  op=$(magick "assets/$f.png" -alpha extract -format "%[fx:mean]" info:)
  echo "  $f opacite moyenne $op  $(python3 -c "print('fond transparent OK' if $op < 0.6 else 'ATTENTION: fond encore opaque')")"
done

echo
echo "Fait. Lancez maintenant :  node build.mjs"
