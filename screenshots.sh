#!/usr/bin/env bash
# Screenshots of the examples: every design (gallery, light and dark), every page (desktop light, phone dark),
# and a custom brand with logo. Needs Chrome; CHROME=/path/to/chrome to override. Bash 3.2 compatible.
set -eu
cd "$(dirname "$0")"
CHROME=${CHROME:-$(command -v google-chrome || command -v chromium || echo "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")}
base="file://$( (pwd -W 2>/dev/null || pwd) | sed 's|^\([A-Za-z]\):|/\1:|')/examples"
mkdir -p screenshots
shot() { # name width height page query
  "$CHROME" --headless --disable-gpu --hide-scrollbars --force-prefers-reduced-motion --timeout=3000 \
    --window-size="$2,$3" --screenshot="$PWD/screenshots/$1.png" "$base/$4?nopanel&$5" >/dev/null 2>&1
  echo "screenshots/$1.png"
}
for d in graphite paper; do
  q="design=$( [ $d = graphite ] || echo $d )&brand=&logo="
  shot "gallery-$d-light" 1280 2250 index.html "$q&theme=light"
  shot "gallery-$d-dark" 1280 2250 index.html "$q&theme=dark"
done
for p in dashboard list detail form dates week month settings status login; do
  shot "$p-desktop" 1280 1000 $p.html "design=&brand=&logo=&theme=light"
  shot "$p-phone-dark" 500 1100 $p.html "design=&brand=&logo=&theme=dark"
done
shot brand-light 1280 900 list.html "design=&brand=%237c3aed&logo=1&theme=light"
shot brand-dark 1280 900 list.html "design=&brand=%237c3aed&logo=1&theme=dark"
shot brand-login 500 800 login.html "design=paper&brand=%237c3aed&logo=1&theme=light"
for d in graphite paper; do
  q="design=$( [ $d = graphite ] || echo $d )&brand=&logo="
  shot "design-$d-dashboard" 1280 900 dashboard.html "$q&theme=light"
  shot "design-$d-list-dark" 1280 760 list.html "$q&theme=dark"
  shot "design-$d-form-phone" 500 1000 form.html "$q&theme=light"
done
shot preview 1600 1000 preview.html "page=list.html&design=paper&theme=dark"
