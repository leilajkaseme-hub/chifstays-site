"""Pull the guest reviews of both flats from Booking.com into reviews-booking.json.

    python3 fetch-booking-reviews.py && node build.mjs

Booking has no open review feed, so this opens each property page in a
headless Chromium (Playwright), clicks "Read all reviews", and keeps what the
page itself loads: every review card, page after page, plus Booking's own
English translation of the ones written in another language. The score and
the six category scores are read off the page.

If Booking changes its page, the script stops with the reason and leaves the
old reviews-booking.json untouched.
"""
import asyncio
import json
import os
import re
import sys
from datetime import date, datetime, timezone

from playwright.async_api import async_playwright

PROPERTIES = {
    "perla": "funchal-bay-view-walk-to-lido-amp-city-center",
    "varanda": "ocean-cliff-retreat-between-natural-pools-amp-praia-formosa",
}
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/130.0 Safari/537.36")
LANG = {"de": "German", "fr": "French", "it": "Italian", "es": "Spanish", "nl": "Dutch",
        "pt": "Portuguese", "da": "Danish", "pl": "Polish", "sv": "Swedish", "cs": "Czech"}


def walk(obj, typename):
    if isinstance(obj, dict):
        if obj.get("__typename") == typename:
            yield obj
        for v in obj.values():
            yield from walk(v, typename)
    elif isinstance(obj, list):
        for v in obj:
            yield from walk(v, typename)


def join(title, pos, neg):
    """Booking splits a review into a title, what was good and what was not.
    They are kept apart so the page can show them the way Booking does."""
    return {"title": (title or "").strip(), "good": (pos or "").strip(), "bad": (neg or "").strip()}


async def one(ctx, key, slug):
    page = await ctx.new_page()
    cards, translations = {}, {}

    async def on_response(resp):
        if "graphql" not in resp.url:
            return
        try:
            data = json.loads(await resp.text())
        except Exception:
            return
        for c in walk(data, "ReviewCard"):
            cards[c["reviewUrl"]] = c
        for t in walk(data, "TranslatedReview"):
            translations[t["reviewUrl"]] = t

    page.on("response", on_response)
    url = f"https://www.booking.com/hotel/pt/{slug}.en-gb.html"
    await page.goto(url, wait_until="domcontentloaded")
    await page.wait_for_timeout(4000)
    for sel in ("#onetrust-reject-all-handler", "button:has-text('Decline')"):
        try:
            await page.click(sel, timeout=1500)
        except Exception:
            pass

    # The score box has two names depending on the page layout; read both.
    score_text = " ".join(await page.eval_on_selector_all(
        "[data-testid=review-score-right-component], [data-testid=review-score-component]",
        "els => els.map(e => e.innerText)")).replace("\n", " ").replace("\xa0", " ")
    m = (re.search(r"([0-9.]+)\D+based on (\d+) review", score_text)
         or re.search(r"^\s*([0-9.]+)\D+?(\d+) reviews", score_text))
    if not m:
        raise SystemExit(f"{key}: no score on {url}")
    rating, count = float(m.group(1)), int(m.group(2))
    subs = await page.eval_on_selector_all(
        "[data-testid=review-subscore]", "els => els.map(e => e.innerText)")
    categories = []
    for s in subs:
        # "Cleanliness, 9.6, Average rating out of 10 ..." or "Staff\t10"
        m2 = re.match(r"\s*([A-Za-z][A-Za-z ]*?)[,\t\n]+\s*([0-9]+(?:\.[0-9])?)", s)
        if m2 and m2.group(1) not in dict(categories):
            categories.append([m2.group(1).strip(), float(m2.group(2))])

    # Booking shuffles the order between visits; a fixed order keeps the file
    # unchanged when nothing new came in.
    ORDER = ["Cleanliness", "Comfort", "Facilities", "Location", "Staff", "Value for money"]
    categories.sort(key=lambda c: (ORDER.index(c[0]) if c[0] in ORDER else 99, c[0]))

    await page.click("button:has-text('Read all reviews')", timeout=10000)
    await page.wait_for_timeout(4000)
    # Page through the drawer until every review has been loaded.
    for _ in range(20):
        if len(cards) >= count:
            break
        nxt = page.locator("[aria-label='Next page']")
        if not await nxt.count() or await nxt.first.is_disabled():
            break
        await nxt.first.click()
        await page.wait_for_timeout(3000)
    await page.close()

    reviews = []
    for rid, c in cards.items():
        td = c.get("textDetails") or {}
        g = c.get("guestDetails") or {}
        bd = c.get("bookingDetails") or {}
        lang = (td.get("lang") or "").split("-")[0]
        tr = translations.get(rid)
        original = join(td.get("title"), td.get("positiveText"), td.get("negativeText"))
        text = join(tr.get("title"), tr.get("positiveText"), tr.get("negativeText")) if tr else original
        if not any(text.values()):
            continue
        nights = bd.get("numNights")
        reviews.append({
            "id": rid,
            "name": "Guest" if g.get("anonymous") else (g.get("username") or "Guest"),
            "from": g.get("countryName") or "",
            "date": datetime.fromtimestamp(c["reviewedDate"], timezone.utc).strftime("%Y-%m-%d"),
            "rating": c.get("reviewScore"),
            "stay": f"Stayed {nights} night{'s' if nights != 1 else ''}" if nights else "",
            "text": text,
            "original": original if tr else None,
            "lang": LANG.get(lang, lang) if tr else "",
            "reply": ((c.get("partnerReply") or {}).get("reply") or "").strip(),
        })
    reviews.sort(key=lambda r: r["date"], reverse=True)
    if len(reviews) < min(count, 1):
        raise SystemExit(f"{key}: page says {count} reviews but none loaded")
    print(f"{key}: {rating} from {count} reviews, {len(reviews)} with text")
    return {"rating": rating, "scale": 10, "count": count, "categories": categories,
            "url": url.replace(".en-gb", ""), "reviews": reviews}


async def main():
    async with async_playwright() as p:
        # PW_CHANNEL=chrome uses the installed Google Chrome (the Mac mini has no Playwright Chromium).
        browser = await p.chromium.launch(channel=os.environ.get("PW_CHANNEL") or None,
                                          args=["--disable-blink-features=AutomationControlled"])
        ctx = await browser.new_context(locale="en-GB", user_agent=UA, viewport={"width": 1300, "height": 900})
        out = {"fetched": date.today().isoformat(), "stays": {}}
        for key, slug in PROPERTIES.items():
            out["stays"][key] = await one(ctx, key, slug)
        await browser.close()

    try:
        old = json.load(open("reviews-booking.json"))
    except Exception:
        old = {}
    if old.get("stays") == out["stays"]:
        print("No new reviews.")
        return
    with open("reviews-booking.json", "w") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
        f.write("\n")
    print("reviews-booking.json written.")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except SystemExit:
        raise
    except Exception as e:
        sys.exit(f"Booking reviews failed, old file kept: {e}")
