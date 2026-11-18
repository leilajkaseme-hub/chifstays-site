# Chifstay

Two apartments in Funchal, Madeira, presented as one small site. Static HTML,
no framework, no build server: `node build.mjs` writes the pages and that is
the whole toolchain.

## Where the facts come from

Everything on the site is read from the two live Airbnb listings, on
4 September 2026, and lives in one object at the top of `build.mjs`:

| | Perla do Oceano | Varanda do Sol |
|---|---|---|
| Airbnb id | 1420093678403124003 | 1397784964911656134 |
| Licence | 164578/AL | 164601/AL |
| Where | Barreiros, Funchal | above Praia Formosa, Funchal |
| Sleeps | 3 · 2 bedrooms · 2 beds · 1 bath | 3 · 2 bedrooms · 2 beds · 1 bath |
| Rating | Airbnb 4.96/24, Booking 8.8/5, Vrbo 10/4 (18 Nov) | Airbnb 4.89/9, Booking 9.3/11, Vrbo 8.8/3 (18 Nov) |
| Badge | Guest favourite (top 10%) | Superhost |
| Photos | 15 | 13 |

Both pages get their visible text and their JSON-LD from that same object, so
the two cannot disagree.

**Nothing is invented.** No price, because Airbnb shows none until you pick
dates. No phone and no email, because there are none on file. No award. The
missing carbon monoxide alarm is stated on both pages, because both listings
state it and a guest deserves to read it before booking rather than after.

## Photos

`assets/perla` and `assets/varanda` hold 28 WebP files, 2.6 MB in total,
converted from the originals on the listings. The originals stay in
`source-raw/`, which is gitignored: they are 7.7 MB of PNG that nothing serves.

To change a photo, drop the new file in `source-raw/`, convert it, and add a
line to the `photos` array with an alt text that says what is actually in the
frame.

## Design

Airbnb-shaped, deliberately: white, one sea blue for actions, Figtree, photos
in rounded grids, review stars in gold. Alternate sections are a cool light
grey (`--sand` is #f7f7f7 despite its name), never beige. Buttons are flat,
10px corners, no glow. Reviews sit in CSS columns so short ones leave no holes.
A bolder redesign (full-screen terrace, serif titles) was tried on 18 Nov 2026
and turned down: keep this style and improve details.

The movement is Chifbay's: `.rv` elements start low and faded, an
IntersectionObserver adds `.in`. With JavaScript off or
`prefers-reduced-motion` on, everything is simply visible.

## Still to decide

- **The domain.** `chifstay.com` is written into the canonical tags and the
  JSON-LD in `build.mjs` but has not been registered or checked. Change `SITE`
  before this goes anywhere near a server.
- **Direct contact.** The site sends every booking to Airbnb. If you want
  direct bookings, a phone number or an email has to be added; I have neither,
  so I left it out rather than making one up.
- **Reviews.** Every review with text from Airbnb, Booking.com and Vrbo is on
  its flat's page, low scores included, with the guest's own words under any
  translation. Airbnb: `fetch-reviews.mjs`. Booking.com:
  `fetch-booking-reviews.py` (Playwright). Vrbo: `fetch-vrbo-reviews.py`, which
  needs a real Chrome window (Vrbo turns away headless browsers). All three run
  every Monday 07:40 on the Mac mini: `reviews-weekly.sh`, launchd
  `com.chifstays.reviews` (copy of the plist here), in its own clone
  `~/repos/chifstays-site`, log `~/repos/chifstays-reviews.log`. It pushes only
  when something changed and sends Telegram (notify-hub) when new reviews go
  live or a site cannot be read. `.github/workflows/reviews.yml` is a manual
  fallback (Airbnb and Booking.com only). Hand-written English for a review goes
  in `reviews-manual.json` > `translations`, keyed by the review id. Six show at first, "Show
  more reviews" adds six at a time. The home page has every review of both
  flats, the six in `FEATURED` first. **Nothing links to Airbnb, Booking.com or
  Vrbo**: the score tiles and the site buttons only filter the reviews, so
  guests stay here and book here. No rating markup in the JSON-LD: Google does
  not allow ratings taken from other sites.
- **Amenities.** The full list per flat is in `amenities` in `build.mjs`
  (from the Airbnb and Booking.com listings and the photos, 18 Nov 2026), with
  `top` choosing the ten shown before "Show all". Icons: Phosphor (MIT), one
  SVG each in `assets/icons`, inlined at build time.
- **What to do nearby.** `NEARBY` in `build.mjs`: nine places with a photo,
  two lines, and the distance from each flat. Photos in `assets/near` are from
  Wikimedia Commons (CC BY-SA, credited on the page under "Photo credits"),
  plus Chifbay's own boat photo.
