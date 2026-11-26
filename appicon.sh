#!/usr/bin/env bash
# The installable app: writes an app's icons and web manifest into its static dir from the mark.
#   ./appicon.sh <static-dir> <app> <char> [colour] [start-url] [extra-json]
#   ./appicon.sh ../bill/web/static bill € '#18181b'
# Writes app-icon.svg (the source), app-icon-192.png, app-icon-512.png (also maskable), app-icon.png (180, Apple)
# and manifest.webmanifest. The icon: the mark in text-on-accent on a full square in the brand colour (the platform
# rounds or masks it; the mark stays inside the middle 60 %). extra-json is merged into the manifest (jot: share_target).
# Needs Chrome for the PNGs; CHROME=/path/to/chrome to override. Bash 3.2 compatible.
set -eu
[ $# -ge 3 ] || { sed -n 3,4p "$0"; exit 2; }
dir=$1 app=$2 char=${3#][} colour=${4:-#18181b} start=${5:-/} extra=${6:-}
CHROME=${CHROME:-$(command -v google-chrome || command -v chromium || command -v chrome || echo "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")}
[ -x "$CHROME" ] || for c in "/c/Program Files/Google/Chrome/Application/chrome.exe" "/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"; do [ -x "$c" ] && CHROME=$c && break; done
win() { if command -v cygpath >/dev/null; then cygpath -w "$1"; else echo "$1"; fi; }
url() { if command -v cygpath >/dev/null; then echo "file:///$(cygpath -m "$1")"; else echo "file://$1"; fi; }
mkdir -p "$dir"; dir=$(cd "$dir" && pwd)

cat > "$dir/app-icon.svg" <<EOF
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="$colour"/><svg x="112" y="112" width="288" height="288" viewBox="-2.5 0 32 32"><path d="M1 5h4v22H1M12.5 5h-4v22h4" fill="none" stroke="#fff" stroke-width="2.5"/><text x="14.5" y="24" fill="#fff" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace" font-weight="700" font-size="20">$char</text></svg></svg>
EOF
for s in 192 512 180; do
  out=app-icon-$s.png; [ $s = 180 ] && out=app-icon.png
  "$CHROME" --headless --disable-gpu --hide-scrollbars --default-background-color=00000000 --window-size=512,512 --force-device-scale-factor=$(awk "BEGIN{print $s/512}") \
    --screenshot="$(win "$dir/$out")" "$(url "$dir/app-icon.svg")" >/dev/null 2>&1
  [ -s "$dir/$out" ] || { echo "appicon: $out not written (Chrome: $CHROME)" >&2; exit 1; }
done

cat > "$dir/manifest.webmanifest" <<EOF
{"name": "nobloat/$app", "short_name": "$app", "start_url": "$start", "scope": "/", "display": "standalone",
 "background_color": "#f6f6f5", "theme_color": "#ffffff",
 "icons": [{"src": "/static/app-icon-192.png", "sizes": "192x192", "type": "image/png"},
  {"src": "/static/app-icon-512.png", "sizes": "512x512", "type": "image/png"},
  {"src": "/static/app-icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
  {"src": "/static/app-icon.svg", "sizes": "any", "type": "image/svg+xml"}]${extra:+,
 $extra}}
EOF
echo "$dir: app-icon.svg app-icon-192.png app-icon-512.png app-icon.png manifest.webmanifest"
