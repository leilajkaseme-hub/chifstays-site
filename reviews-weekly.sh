#!/bin/bash
# reviews-weekly.sh: bring the Airbnb, Booking.com and Vrbo reviews of both
# flats onto chifstays.com, once a week, on the Mac mini.
#
#   launchd com.chifstays.reviews (Monday 07:40), plist copy: com.chifstays.reviews.plist
#
# Runs in its own clone, ~/repos/chifstays-site, that only this job writes to.
# Each site can fail without stopping the others; the page is rebuilt from
# whatever came in, committed and pushed (GitHub Pages publishes it).
# Telegram (notify-hub): "done" when new reviews went live, "alerts" once a
# day per site that could not be read. Nothing when nothing changed.
set -uo pipefail
export PATH="$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export PW_CHANNEL=chrome
REPO="$HOME/repos/chifstays-site"
HUB="/Users/Shared/Claude/automation/notify-hub/hub.py"
LOG="$HOME/repos/chifstays-reviews.log"
exec >>"$LOG" 2>&1
echo "=== $(date '+%Y-%m-%d %H:%M') start"

hub() { /usr/bin/python3 "$HUB" send "$@" || echo "telegram send failed"; }

if [ ! -d "$REPO/.git" ]; then
  gh repo clone leilajkaseme-hub/chifstays-site "$REPO" -- --depth 20 || {
    hub alerts "Chifstays reviews: could not clone the site repo on the mini." --once chifstays-reviews-clone; exit 1; }
fi
cd "$REPO" || exit 1
# Robot-only clone: start each week from exactly what is live.
git fetch --quiet origin main && git reset --quiet --hard origin/main || {
  hub alerts "Chifstays reviews: git fetch failed on the mini." --once chifstays-reviews-git; exit 1; }
# launchd runs a copy outside the clone. Refresh it for next week by rename,
# so this running copy is never rewritten under bash's feet.
cp reviews-weekly.sh "$HOME/repos/.chifstays-reviews.sh.new" && mv -f "$HOME/repos/.chifstays-reviews.sh.new" "$HOME/repos/chifstays-reviews.sh"

ids() {   # every review id in the three files, one per line
  python3 - <<'EOF'
import json
for f in ("reviews.json", "reviews-booking.json", "reviews-vrbo.json"):
    try:
        for s in json.load(open(f))["stays"].values():
            for r in s["reviews"]:
                print(f.split(".")[0], r["id"])
    except Exception:
        pass
EOF
}
before="$(ids | sort)"

failed=()
node fetch-reviews.mjs            || failed+=("Airbnb")
python3 fetch-booking-reviews.py  || failed+=("Booking.com")
python3 fetch-vrbo-reviews.py     || failed+=("Vrbo")

for site in "${failed[@]}"; do
  hub alerts "Chifstays reviews: $site could not be read this week. Its old reviews stay on the site. Log: ~/repos/chifstays-reviews.log on the mini." \
    --once "chifstays-reviews-$site"
done

if ! node build.mjs; then
  hub alerts "Chifstays reviews: the site build failed on the mini, nothing was published." --once chifstays-reviews-build
  exit 1
fi

if [ -z "$(git status --porcelain)" ]; then
  echo "nothing changed"
  [ ${#failed[@]} -eq 0 ] && exit 0 || exit 1
fi

new="$(comm -13 <(echo "$before") <(ids | sort) | cut -d' ' -f1 | sort | uniq -c \
  | awk '{n+=$1; s=s sep ($2=="reviews"?"Airbnb":$2=="reviews-booking"?"Booking.com":"Vrbo") " " $1; sep=", "} END {if (n) print n " (" s ")"}')"

git add -A
git -c user.name="Enzo" -c user.email="enzo@users.noreply.github.com" \
  commit --quiet -m "Weekly reviews from Airbnb, Booking.com and Vrbo${new:+: $new new}"
if ! git -c credential.helper= -c credential.helper='!gh auth git-credential' push --quiet origin HEAD:main; then
  hub alerts "Chifstays reviews: the push to GitHub failed on the mini, new reviews are not live." --once chifstays-reviews-push
  exit 1
fi
echo "pushed ${new:-score or text changes only}"
if [ -n "$new" ]; then
  hub done "New guest reviews on chifstays.com: $new." --button "See them=https://chifstays.com/#reviews"
fi
[ ${#failed[@]} -eq 0 ]
