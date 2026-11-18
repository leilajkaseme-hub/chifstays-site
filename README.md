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

Redone on 18 November 2026. The page opens on the Perla terrace, because the
terrace and the view are what both flats are booked for. Real listing photos
only, big and early, framed inside the page width (the originals are 1200px
wide, so a full-bleed frame would soften them).

- Type: Young Serif for titles, Hanken Grotesk for reading. No Inter, no
  capital-letter labels above sections.
- Colour: cool white ground (`--mist` for alternate sections, never beige),
  one sea blue for every action, a deep Atlantic band for the boat and the
  footer, terracotta (`--roof`) for small marks only. Gold is review stars.
- Layout: 7/5 photo and text splits that mirror for the second flat,
  numbered lists instead of icon cards, cards only for reviews.
- Motion: the hero photo settles once; blocks fade in as they arrive, with no
  stagger. Off with `prefers-reduced-motion`.
- The boat photo (`assets/boat/skippers.webp`) is the two Chifbay skippers,
  copied from the Chifbay site.

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
  `fetch-booking-reviews.py` (Playwright). Vrbo blocks scripts, so its reviews
  are copied by hand into `reviews-manual.json`. `.github/workflows/reviews.yml`
  refreshes Airbnb and Booking.com every Monday. The home page shows six,
  picked by id in `FEATURED` in `build.mjs`. No rating markup in the JSON-LD:
  Google does not allow ratings taken from other sites.
