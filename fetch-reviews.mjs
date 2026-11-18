/* Pull the guest reviews of both flats from Airbnb into reviews.json.
 *
 *   node fetch-reviews.mjs && node build.mjs
 *
 * Reads the public listing page (overall rating, review count, the six
 * category scores) and Airbnb's own reviews query (the review text, with
 * Airbnb's English translation when the guest wrote in another language).
 * Nothing is edited or picked: every review with words in it is kept, 4 stars
 * included. Only the first name, the country or "years on Airbnb" line, the
 * date and the rating are kept, the same as Airbnb shows to anyone.
 *
 * If Airbnb changes its query, the script stops with the reason and leaves
 * the old reviews.json untouched. The fix is a new hash: open a listing,
 * click "Show all reviews", and copy the StaysPdpReviewsQuery hash from the
 * network tab into HASH below.
 */
import { readFileSync, writeFileSync } from "node:fs";

const HASH = "cfdc3ffbe997a618795fc5a8f9a9b484054ce9be68c8788cd2ffda999934c5ae";
const KEY = "d306zoyjsyarp7ifhu67rjxn52tv0t20";   // Airbnb's public web key, the same for every visitor
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const LISTINGS = { perla: "1420093678403124003", varanda: "1397784964911656134" };

const clean = (s) => String(s || "")
  .replace(/<br\s*\/?>/gi, "\n")
  .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/\n{3,}/g, "\n\n").trim();

async function summary(id) {
  const res = await fetch(`https://www.airbnb.com/rooms/${id}?locale=en`, { headers: { "User-Agent": UA, "Accept-Language": "en" } });
  if (!res.ok) throw new Error(`listing ${id}: HTTP ${res.status}`);
  const html = await res.text();
  const rating = Number(html.match(/"guestSatisfactionOverall":([0-9.]+)/)?.[1]);
  const count = Number(html.match(/"reviewCount":(\d+)/)?.[1]);
  const cats = html.match(/"categoryRatings":(\[[^\]]*\])/);
  if (!rating || !count) throw new Error(`listing ${id}: no rating found on the page`);
  const categories = cats ? JSON.parse(cats[1]).map((c) => [c.label, Number(c.localizedRating)]) : [];
  return { rating, count, categories };
}

async function reviews(id) {
  const out = [];
  for (let offset = 0; offset < 500; offset += 50) {
    const variables = {
      id: Buffer.from(`StayListing:${id}`).toString("base64"),
      pdpReviewsRequest: { fieldSelector: "for_p3_translation_only", forPreview: false, limit: 50, first: 50,
        offset: String(offset), showingTranslationButton: false, sortingPreference: "MOST_RECENT" },
    };
    const q = new URLSearchParams({ operationName: "StaysPdpReviewsQuery", locale: "en", currency: "EUR",
      variables: JSON.stringify(variables),
      extensions: JSON.stringify({ persistedQuery: { version: 1, sha256Hash: HASH } }) });
    const res = await fetch(`https://www.airbnb.com/api/v3/StaysPdpReviewsQuery/${HASH}?${q}`,
      { headers: { "X-Airbnb-API-Key": KEY, "User-Agent": UA, "Accept-Language": "en" } });
    if (!res.ok) throw new Error(`reviews ${id}: HTTP ${res.status} (the query hash has probably changed, see the top of this file)`);
    const page = (await res.json())?.data?.presentation?.stayProductDetailPage?.reviews?.reviews;
    if (!Array.isArray(page)) throw new Error(`reviews ${id}: unexpected answer from Airbnb`);
    out.push(...page);
    if (page.length < 50) break;
  }
  return out.map((r) => {
    const tr = r.localizedReview;
    const translated = tr && tr.needsTranslation && tr.comments;
    return {
      id: r.id,
      name: r.reviewer?.firstName || "Guest",
      from: r.localizedReviewerLocation || "",
      date: String(r.createdAt).slice(0, 10),
      rating: r.rating,
      stay: r.reviewHighlight || "",
      text: clean(translated ? tr.comments : r.comments),
      original: translated ? clean(r.comments) : "",
      lang: translated ? (tr.disclaimer || "").replace(/^Translated from /, "") : "",
    };
  }).filter((r) => r.text.replace(/[\s.!]/g, "").length > 2);   // "." is not a review
}

const result = { fetched: new Date().toISOString().slice(0, 10), stays: {} };
for (const [key, id] of Object.entries(LISTINGS)) {
  const [s, list] = await Promise.all([summary(id), reviews(id)]);
  result.stays[key] = { ...s, reviews: list };
  console.log(`${key}: ${s.rating} from ${s.count} reviews, ${list.length} with text`);
}

let old = "";
try { old = readFileSync("reviews.json", "utf8"); } catch {}
const next = JSON.stringify(result, null, 1) + "\n";
if (old && JSON.parse(old).stays && JSON.stringify(JSON.parse(old).stays) === JSON.stringify(result.stays)) {
  console.log("No new reviews.");
} else {
  writeFileSync("reviews.json", next);
  console.log("reviews.json written.");
}
