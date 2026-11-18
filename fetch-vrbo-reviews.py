"""Pull the guest reviews of both flats from Vrbo into reviews-vrbo.json.

    python3 fetch-vrbo-reviews.py && node build.mjs

Vrbo's bot wall (Akamai) turns away curl and headless browsers, so this drives
a real Chrome window (its own profile, ~/chrome-profiles/vrbo, debugging port
9363) and keeps what the page itself loads when "See all reviews" is clicked:
the PWAReviewsOverlayProductReviewDetailsQuery answers. Run it where a screen
session exists: the Mac mini (launchd job com.chifstays.reviews).

Vrbo shows reviews in the guest's own language. A review not in English gets
an English version from reviews-manual.json > translations (by review id) if
one was written by hand, else from Google Translate's free endpoint, and the
guest's own words stay in "original".

If Vrbo changes its page, the script stops with the reason and leaves the old
reviews-vrbo.json untouched.
"""
import asyncio
import json
import os
import re
import subprocess
import sys
import urllib.parse
import urllib.request
from datetime import date

from playwright.async_api import async_playwright

LISTINGS = {"perla": "2536886a", "varanda": "2536959a"}
PORT = 9363
PROFILE = os.path.expanduser("~/chrome-profiles/vrbo")
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
QUERY = "PWAReviewsOverlayProductReviewDetailsQuery"
MONTHS = {m: i for i, m in enumerate(
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], 1)}
LANG = {"de": "German", "fr": "French", "it": "Italian", "es": "Spanish", "nl": "Dutch", "pt": "Portuguese",
        "da": "Danish", "pl": "Polish", "sv": "Swedish", "cs": "Czech", "no": "Norwegian", "fi": "Finnish"}


def cdp_up():
    try:
        urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json/version", timeout=2)
        return True
    except Exception:
        return False


async def start_chrome():
    """A normal Chrome window, not a Playwright one: the bot wall lets it in."""
    if cdp_up():
        return
    os.makedirs(PROFILE, exist_ok=True)
    subprocess.Popen([CHROME, f"--user-data-dir={PROFILE}", f"--remote-debugging-port={PORT}",
                      "--no-first-run", "--no-default-browser-check", "--restore-last-session", "about:blank"],
                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(40):
        await asyncio.sleep(0.5)
        if cdp_up():
            return
    raise SystemExit("Chrome did not open its debugging port")


def walk(obj, typename):
    if isinstance(obj, dict):
        if obj.get("__typename") == typename:
            yield obj
        for v in obj.values():
            yield from walk(v, typename)
    elif isinstance(obj, list):
        for v in obj:
            yield from walk(v, typename)


def translate(text):
    """Google Translate's free web endpoint. Returns (english, source language code)."""
    if not text.strip():
        return "", ""
    q = urllib.parse.urlencode({"client": "gtx", "sl": "auto", "tl": "en", "dt": "t", "q": text})
    req = urllib.request.Request("https://translate.googleapis.com/translate_a/single?" + q,
                                 headers={"User-Agent": "Mozilla/5.0"})
    data = json.loads(urllib.request.urlopen(req, timeout=20).read())
    return "".join(part[0] for part in data[0] if part[0]).strip(), data[2] or ""


def name_case(n):
    """"aude t." -> "Aude T.": some guests type their name in lower case."""
    return n.title() if n == n.lower() else n


def parse_review(d):
    summary = d.get("summary") or {}
    m = re.match(r"\s*([0-9.]+)\s*/\s*10", summary.get("primary") or "")
    msgs = [x.get("text") or "" for x in summary.get("supportingMessages") or []]
    stay = next((x for x in msgs if x.startswith("Stayed")), "")
    when = re.search(r"in ([A-Z][a-z]{2}) (\d{4})", stay)
    reply = next((r.get("text") for r in d.get("managementResponses") or [] if r.get("text")), "")
    body = d.get("review") or {}
    return {
        "id": d["id"],
        "name": name_case((summary.get("secondary") or "Guest").strip()),
        "from": next((x for x in msgs if x.startswith("Travel")), ""),
        # Vrbo shows the month of the stay, not the day: the 15th stands in for it.
        "date": f"{when.group(2)}-{MONTHS[when.group(1)]:02d}-15" if when else "",
        "rating": float(m.group(1)) if m else None,
        "stay": re.sub(r"\s+in [A-Z][a-z]{2} \d{4}$", "", stay),
        "text": {"title": (body.get("title") or "").strip(), "good": (body.get("text") or "").strip(), "bad": ""},
        "original": None,
        "lang": "",
        "reply": (reply or "").strip(),
    }


async def one(ctx, key, code):
    answers = []

    async def on_response(resp):
        if "graphql" not in resp.url or resp.request.method != "POST":
            return
        if QUERY not in (resp.request.post_data or ""):
            return
        try:
            answers.append(json.loads(await resp.text()))
        except Exception:
            pass

    page = await ctx.new_page()
    page.on("response", on_response)
    url = f"https://www.vrbo.com/{code}"
    await page.goto(url, wait_until="domcontentloaded", timeout=60000)
    await page.wait_for_timeout(5000)
    # Cookie banner (OneTrust), shown until the profile has an answer: reject all.
    reject = page.locator("#onetrust-reject-all-handler")
    try:
        if await reject.count() and await reject.first.is_visible():
            await reject.first.click(timeout=5000)
            await page.locator(".onetrust-pc-dark-filter, #onetrust-banner-sdk").first.wait_for(state="hidden", timeout=8000)
    except Exception:
        pass

    title = await page.title()
    if "Vrbo" not in title:
        raise SystemExit(f"{key}: Vrbo did not show the listing (page title: {title!r}), probably the bot wall")
    see_all = page.get_by_role("button", name=re.compile(r"See all \d+ reviews?"))
    if not await see_all.count():
        raise SystemExit(f"{key}: no 'See all reviews' button on {url}")
    count = int(re.search(r"\d+", await see_all.first.inner_text()).group())
    await see_all.first.scroll_into_view_if_needed()
    await see_all.first.click()
    for _ in range(30):
        await page.wait_for_timeout(500)
        if any(list(walk(a, "ProductReview")) for a in answers):
            break
    # More than one page of reviews: Vrbo adds a "More reviews" button in the dialog.
    for _ in range(20):
        more = page.get_by_role("dialog").get_by_role("button", name=re.compile(r"^(More|Show more) reviews", re.I))
        if not await more.count():
            break
        await more.first.click()
        await page.wait_for_timeout(2500)
    try:
        dialog_text = await page.get_by_role("dialog").filter(has_text="reviews").first.inner_text(timeout=5000)
    except Exception:
        dialog_text = ""
    await page.close()

    reviews, rating, categories = {}, None, []
    for a in answers:
        for d in walk(a, "ProductReview"):
            reviews[d["id"]] = parse_review(d)
        for s in walk(a, "ShoppingReviewSummary"):
            t = (((s.get("graphic") or {}).get("score") or {}).get("text") or "")
            if re.fullmatch(r"[0-9.]+", t):
                rating = float(t)
        for c in walk(a, "ReviewCategory"):
            name = ((c.get("categoryType") or {}).get("text") or "").strip()
            score = ((c.get("categoryScore") or {}).get("text") or "").strip()
            if name and re.fullmatch(r"[0-9.]+", score) and name not in dict(categories):
                categories.append([name, float(score)])
    if rating is None:   # the score box is sometimes empty; the sentence under it is not
        m = re.search(r"rated ([0-9.]+) out of 10", json.dumps(answers) + " " + dialog_text)
        rating = float(m.group(1)) if m else None
    if not reviews:
        raise SystemExit(f"{key}: page says {count} reviews but none loaded ({len(answers)} review answers caught)")
    if rating is None:
        raise SystemExit(f"{key}: {len(reviews)} reviews loaded but no overall score found")
    out = sorted(reviews.values(), key=lambda r: r["date"], reverse=True)
    print(f"{key}: {rating} from {count} reviews, {len(out)} loaded")
    return {"rating": rating, "scale": 10, "count": count, "categories": categories, "url": url, "reviews": out}


def english(stays):
    """Give every review not in English an English text, keeping the original."""
    try:
        by_hand = json.load(open("reviews-manual.json")).get("translations", {})
    except Exception:
        by_hand = {}
    try:
        old = {r["id"]: r for s in json.load(open("reviews-vrbo.json"))["stays"].values() for r in s["reviews"]}
    except Exception:
        old = {}
    for s in stays.values():
        for r in s["reviews"]:
            if r["id"] in by_hand:   # build.mjs puts the hand translation in front of the guest's words
                continue
            prev = old.get(r["id"])
            if prev and prev.get("original") == r["text"]:   # translated on an earlier run: reuse it
                r.update(text=prev["text"], original=prev["original"], lang=prev["lang"])
                continue
            words = " ".join(v for v in r["text"].values() if v)
            if not re.search(r"[A-Za-z]", words):
                continue
            _, src = translate(words[:400])
            if not src or src.startswith("en"):
                continue
            r["original"] = dict(r["text"])
            r["text"] = {k: translate(v)[0] if v else "" for k, v in r["text"].items()}
            r["lang"] = LANG.get(src.split("-")[0], src)


async def main():
    await start_chrome()
    async with async_playwright() as p:
        browser = await p.chromium.connect_over_cdp(f"http://127.0.0.1:{PORT}")
        ctx = browser.contexts[0] if browser.contexts else await browser.new_context()
        out = {"fetched": date.today().isoformat(), "stays": {}}
        try:
            for key, code in LISTINGS.items():
                out["stays"][key] = await one(ctx, key, code)
        finally:
            # Close the window through Chrome itself, so cookies are saved for next week.
            try:
                cdp = await browser.new_browser_cdp_session()
                await cdp.send("Browser.close")
            except Exception:
                pass
    english(out["stays"])

    try:
        old = json.load(open("reviews-vrbo.json"))
    except Exception:
        old = {}
    if old.get("stays") == out["stays"]:
        print("No new reviews.")
        return
    with open("reviews-vrbo.json", "w") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
        f.write("\n")
    print("reviews-vrbo.json written.")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except SystemExit:
        raise
    except Exception as e:
        sys.exit(f"Vrbo reviews failed, old file kept: {e}")
