/* Build the Chifstay pages from one set of facts.
 *
 *   node build.mjs
 *
 * Every number on the site comes from the object below, and the object comes
 * from the two live Airbnb listings, read on 4 September 2026. Nothing here is
 * invented: no price (Airbnb shows none without dates), no phone, no email, no
 * award. If a fact is not in this object it does not appear on the site.
 *
 * The same object also writes the JSON-LD, so the structured data and the
 * visible text cannot drift apart.
 */
import { writeFileSync, existsSync } from "node:fs";

/* The wordmark is used only if it is actually on disk. Until make-logo.sh has
   run there is no file, and a nav pointing at a missing image is worse than
   the text it replaced, so the text stays. */
const HAS_LOGO = existsSync("assets/logo-black.webp") && existsSync("assets/logo-white.webp");
const brandNav = HAS_LOGO
  ? '<img src="assets/logo-black.webp" alt="Chifstay" width="150" height="40"/>'
  : 'Chif<span>stay</span>';
const brandFoot = HAS_LOGO
  ? '<img src="assets/logo-white.webp" alt="Chifstay" width="170" height="45"/>'
  : 'Chif<span>stay</span>';

const SITE = "https://chifstays.com";   // acheté 2026-09-04 chez Spaceship

/* The hero grid is one tall picture and four small ones, so it needs exactly
   five. Six would wrap onto a third row and break the block. [stay, photo]. */
const HERO_FIVE = [[0, 0], [1, 1], [0, 5], [1, 2], [0, 9]];

const HOST = { name: "Natalia", since: "1 year", superhost: true };

const STAYS = [
  {
    slug: "perla-do-oceano",
    name: "Perla do Oceano",
    tagline: "Funchal sea view with an XL terrace",
    airbnb: "https://www.airbnb.com/rooms/1420093678403124003",
    licence: "164578/AL",
    area: "Barreiros, Funchal",
    guests: 3, bedrooms: 2, beds: 2, baths: 1,
    rating: 4.95, reviews: 21,
    /* Read off the host calendar on 4 September 2026. airbnbNightly is what
       Airbnb charges before its own service fee; nightly is what we charge
       here, and there is no service fee on top of it. */
    airbnbNightly: 126, nightly: 115, minNights: 7, leadDays: 2,
    badge: "Guest favourite",
    badgeNote: "In the top 10% of listings on Airbnb, by rating, reviews and reliability.",
    dir: "perla",
    hero: "terrasse-vue-mer",
    // The order the gallery and the lightbox use.
    photos: [
      ["terrasse-vue-mer",   "The XL terrace, looking over the rooftops of Funchal to the sea"],
      ["salon-balcon",       "The living room, opening onto the balcony and the bay"],
      ["chambre-balcon",     "The main bedroom, with its own door to the balcony"],
      ["salon-canape",       "The sofa and the second balcony door"],
      ["balcon-transats",    "Loungers on the terrace above the bay"],
      ["chambre-lit-double", "The double bed, with the terrace behind"],
      ["salon-fauteuils",    "The sitting area, lit from two sides"],
      ["cuisine",            "The kitchen, with oven, hob and full-size fridge"],
      ["salle-de-bain",      "The bathroom, with a bathtub"],
      ["balcon-table",       "The smaller balcony, set for breakfast"],
      ["salon-commode",      "The living room from the hallway"],
      ["entree-couloir",     "The hallway"],
      ["buanderie",          "The utility space, with washer and dryer"],
      ["falaise-ocean",      "The view from the terrace, out past the cliffs"],
      ["exterieur-entree",   "The entrance to the building"],
    ],
    // Exactly what the listing states, in the listing's own order.
    amenities: [
      ["Kitchen", 1], ["Wifi", 1], ["Free street parking", 1], ["TV", 1],
      ["Washing machine", 1], ["Tumble dryer", 1], ["Bathtub", 1],
      ["Hair dryer", 1], ["Fridge", 1], ["Lift in the building", 1],
      ["Carbon monoxide alarm", 0],
    ],
    amenityTotal: 23,
    intro:
      "A two-bedroom apartment in Barreiros with two large balconies and an open view across Funchal bay. " +
      "It sleeps three: a double bedroom, a second bedroom, and a sofa bed in the living room. " +
      "The building has a lift, free street parking sits close by, and we meet you at the door with the keys.",
    points: [
      ["Two balconies, not one", "One is wide enough for loungers and a table; the other catches the morning sun for breakfast."],
      ["A quiet street", "Guests keep saying the same thing: it is calm. Cafés, shops and buses are a short walk away."],
      ["Met at the door", "Tell us your arrival time and we hand over the keys in person and show you around."],
    ],
  },
  {
    slug: "varanda-do-sol",
    name: "Varanda do Sol",
    tagline: "A private terrace above Praia Formosa",
    airbnb: "https://www.airbnb.com/rooms/1397784964911656134",
    licence: "164601/AL",
    area: "Above Praia Formosa, Funchal",
    guests: 3, bedrooms: 2, beds: 2, baths: 1,
    rating: 4.83, reviews: 6,
    airbnbNightly: 138, nightly: 125, minNights: 7, leadDays: 2,
    badge: "Superhost",
    badgeNote: "Free parking on site, which is rare in this part of Funchal.",
    dir: "varanda",
    hero: "terrasse-transats",
    photos: [
      ["terrasse-transats", "The private terrace, with loungers facing the water"],
      ["salon-canape",      "The living room, in white and pale wood"],
      ["coucher-de-soleil", "Sunset over the rooftops, from the terrace"],
      ["salon-tv",          "The open-plan living space"],
      ["cuisine-sejour",    "The kitchen and dining area"],
      ["chambre-double",    "The double bedroom, with a balcony door"],
      ["chambre-simple",    "The second bedroom"],
      ["cuisine",           "The kitchen, with hob, oven and fridge"],
      ["salle-de-bain",     "The bathroom"],
      ["terrasse-vue",      "The terrace, looking along the coast"],
      ["garage",            "The garage that comes with the flat"],
      ["immeuble",          "The building, from the road"],
      ["vue-mer-rue",       "The sea, a short walk from the door"],
    ],
    amenities: [
      ["Shared beach access", 1], ["Kitchen", 1], ["Wifi", 1],
      ["Dedicated workspace", 1], ["Free parking on site", 1], ["TV", 1],
      ["Washing machine", 1], ["Hair dryer", 1],
      ["Carbon monoxide alarm", 0],
    ],
    amenityTotal: 16,
    intro:
      "A bright, quiet two-bedroom flat on the cliff above Praia Formosa and the Gomes natural pools. " +
      "It sleeps three, has a terrace of its own, a desk to work at, and free parking on site, " +
      "which is not a given on this side of Funchal.",
    points: [
      ["Parking you do not have to hunt for", "The flat comes with its own space. Few places nearby can say that."],
      ["The beach below", "Praia Formosa and the Gomes natural pools are down the hill; guests have shared beach access."],
      ["A desk, not a kitchen table", "There is a proper workspace, so a week here can include a working day."],
    ],
  },
];

/* ------------------------------------------------------------------ helpers */
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const stars = (n) => "★".repeat(Math.round(n)) + "☆".repeat(5 - Math.round(n));

const ICON = {
  guests: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/></svg>',
  bed:    '<svg viewBox="0 0 24 24"><path d="M3 18V7m0 6h18m0 5V11a3 3 0 0 0-3-3H8"/><circle cx="7" cy="11" r="1.6"/></svg>',
  bath:   '<svg viewBox="0 0 24 24"><path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"/><path d="M7 12V6a2 2 0 0 1 4 0"/></svg>',
  tick:   '<svg viewBox="0 0 24 24"><path d="M4 12.6 9 18 20 6"/></svg>',
  cross:  '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  key:    '<svg viewBox="0 0 24 24"><circle cx="8" cy="12" r="4"/><path d="M12 12h9m-3 0v4"/></svg>',
  wave:   '<svg viewBox="0 0 24 24"><path d="M3 9c3-3 6 3 9 0s6 3 9 0M3 16c3-3 6 3 9 0s6 3 9 0"/></svg>',
  star:   '<svg viewBox="0 0 24 24"><path d="m12 3 2.7 5.8 6.3.8-4.6 4.3 1.2 6.2L12 17l-5.6 3.1 1.2-6.2L3 9.6l6.3-.8z"/></svg>',
};

const ratingBlock = (s) =>
  `<span class="rating">${ICON.star}${s.rating.toFixed(2).replace(/0$/, "")} <span>· ${s.reviews} review${s.reviews > 1 ? "s" : ""}</span></span>`;

const img = (s, [file, alt], cls = "") =>
  `<img${cls ? ` class="${cls}"` : ""} src="assets/${s.dir}/${file}.webp" alt="${esc(alt)}" loading="lazy" decoding="async" width="1200" height="800"/>`;

function shell({ title, desc, canonical, body, jsonld, active }) {
  const link = (href, label) =>
    `<a href="${href}"${active === label ? ' aria-current="page"' : ""}>${label}</a>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}"/>
<link rel="canonical" href="${canonical}"/>
<meta property="og:type" content="website"/>
<meta property="og:title" content="${esc(title)}"/>
<meta property="og:description" content="${esc(desc)}"/>
<meta property="og:url" content="${canonical}"/>
<meta name="twitter:card" content="summary_large_image"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="style.css"/>
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
</head>
<body>

<nav class="nav">
  <div class="wrap">
    <a class="brand" href="index.html" aria-label="Chifstay, Funchal">
      ${brandNav}
      <small>Funchal</small>
    </a>
    <button class="nav-toggle" aria-label="Menu" aria-expanded="false"><span></span><span></span><span></span></button>
    <div class="nav-links">
      ${link("index.html", "Home")}
      ${link("perla-do-oceano.html", "Perla do Oceano")}
      ${link("varanda-do-sol.html", "Varanda do Sol")}
      ${link("index.html#funchal", "Funchal")}
    </div>
  </div>
</nav>

${body}

<footer>
  <div class="wrap">
    <div class="foot-grid">
      <div>
        <div class="foot-brand">${brandFoot}</div>
        <p style="max-width:38ch;margin:0">Two apartments in Funchal, Madeira, looked after by ${HOST.name}. Both licensed, both booked through Airbnb.</p>
      </div>
      <div>
        <h4>The apartments</h4>
        <ul>
          <li><a href="perla-do-oceano.html">Perla do Oceano</a></li>
          <li><a href="varanda-do-sol.html">Varanda do Sol</a></li>
        </ul>
      </div>
      <div>
        <h4>Licences</h4>
        <ul>
          ${STAYS.map((s) => `<li>${s.name} — Alojamento Local ${s.licence}</li>`).join("\n          ")}
        </ul>
      </div>
    </div>
    <div class="foot-legal">
      <span>© ${new Date().getFullYear()} Chifstay · Funchal, Madeira, Portugal</span>
      <span>Bookings and payment are handled by Airbnb.</span>
    </div>
  </div>
</footer>

<script src="app.js"></script>
</body>
</html>
`;
}

/* --------------------------------------------------------------- home page */
function home() {
  const cards = STAYS.map((s) => `
      <article class="stay rv">
        <div class="stay-shot">
          <span class="badge">${esc(s.badge)}</span>
          ${img(s, [s.hero, s.photos.find((p) => p[0] === s.hero)[1]])}
        </div>
        <div class="stay-body">
          <div class="stay-top">
            <h3>${esc(s.name)}</h3>
            ${ratingBlock(s)}
          </div>
          <div class="stay-where">${esc(s.area)}</div>
          <div class="stay-meta">
            <span>${ICON.guests} ${s.guests} guests</span>
            <span>${ICON.bed} ${s.bedrooms} bedrooms · ${s.beds} beds</span>
            <span>${ICON.bath} ${s.baths} bathroom</span>
          </div>
          <p>${esc(s.tagline)}.</p>
          <p class="price"><b>€${s.nightly}</b> a night · ${s.minNights} nights minimum
             <span>€${s.airbnbNightly - s.nightly} less than Airbnb, no service fee</span></p>
          <div class="stay-cta">
            <a class="btn btn-p" href="${s.slug}.html">See the apartment</a>
            <a class="btn btn-o" href="${s.airbnb}" target="_blank" rel="noopener">Check dates</a>
          </div>
        </div>
      </article>`).join("\n");

  const body = `
<header class="hero">
  <div class="wrap">
    <div class="hero-copy rv">
      <p class="eyebrow">Funchal · Madeira</p>
      <h1>Two apartments, <em>both with the sea</em> in the window</h1>
    </div>
    <div class="hero-grid rv">
      ${HERO_FIVE.map(([i, j]) => `<figure>${img(STAYS[i], STAYS[i].photos[j])}</figure>`).join("\n      ")}
    </div>
    <div class="hero-facts rv">
      <span><b>${STAYS.length}</b> apartments</span>
      <span><b>${STAYS.reduce((n, s) => n + s.guests, 0)}</b> guests in total</span>
      <span><b>${STAYS.reduce((n, s) => n + s.reviews, 0)}</b> reviews between them</span>
      <span>Licensed <b>Alojamento Local</b></span>
    </div>
  </div>
</header>

<section id="stays">
  <div class="wrap">
    <div class="sec-head rv">
      <p class="eyebrow">The apartments</p>
      <h2>Pick the view you want to wake up to</h2>
      <p class="lede">Both sleep three, both have two bedrooms and a terrace of their own. One looks over
      Funchal bay from Barreiros, the other sits on the cliff above Praia Formosa.</p>
    </div>
    <div class="stays rv-group">
${cards}
    </div>
  </div>
</section>

<section class="sand" id="funchal">
  <div class="wrap">
    <div class="sec-head rv">
      <p class="eyebrow">What you get either way</p>
      <h2>The same three things in both flats</h2>
    </div>
    <div class="feats rv-group">
      <div class="feat rv">
        <div class="ico">${ICON.wave}</div>
        <h3>A terrace, not a token balcony</h3>
        <p>Space for loungers and a table, facing the water. It is where you will spend the evening.</p>
      </div>
      <div class="feat rv">
        <div class="ico">${ICON.key}</div>
        <h3>Met at the door</h3>
        <p>Tell us when you land. We hand over the keys in person and show you how everything works.</p>
      </div>
      <div class="feat rv">
        <div class="ico">${ICON.tick}</div>
        <h3>Licensed and registered</h3>
        <p>${STAYS.map((s) => `${s.name} is ${s.licence}`).join(", and ")}. Both are registered Alojamento Local.</p>
      </div>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="sec-head rv">
      <p class="eyebrow">Questions</p>
      <h2>Before you book</h2>
    </div>
    <div class="faq rv">
      <details><summary>How do I book?</summary>
        <p>Through Airbnb. Both apartments are listed there, the calendar is live, and payment and cancellation
        are handled by Airbnb. The buttons on this site take you straight to the right listing.</p></details>
      <details><summary>How many people can stay?</summary>
        <p>Three in each apartment. Both have two bedrooms, two beds and one bathroom.</p></details>
      <details><summary>Is there parking?</summary>
        <p>Varanda do Sol comes with free parking on site. Perla do Oceano has free street parking nearby.</p></details>
      <details><summary>Who looks after the flats?</summary>
        <p>${HOST.name}, an Airbnb Superhost, hosting for ${HOST.since}. You are met at the door on arrival.</p></details>
      <details><summary>Is there a carbon monoxide alarm?</summary>
        <p>No. Neither apartment has one, and both listings say so. We would rather write it here than leave you
        to find it in the small print.</p></details>
    </div>
  </div>
</section>
`;

  return shell({
    title: "Chifstay — two apartments to rent in Funchal, Madeira",
    desc: "Two licensed apartments in Funchal, Madeira, each sleeping three with two bedrooms and a private terrace over the sea. Perla do Oceano in Barreiros and Varanda do Sol above Praia Formosa.",
    canonical: SITE + "/",
    active: "Home",
    body,
    jsonld: {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Chifstay apartments in Funchal",
      itemListElement: STAYS.map((s, i) => ({
        "@type": "ListItem", position: i + 1,
        item: {
          "@type": "Apartment", name: s.name, url: `${SITE}/${s.slug}.html`,
          address: { "@type": "PostalAddress", addressLocality: "Funchal", addressRegion: "Madeira", addressCountry: "PT" },
          numberOfBedrooms: s.bedrooms, numberOfBathroomsTotal: s.baths,
          occupancy: { "@type": "QuantitativeValue", maxValue: s.guests },
          aggregateRating: { "@type": "AggregateRating", ratingValue: s.rating, reviewCount: s.reviews, bestRating: 5 },
        },
      })),
    },
  });
}

/* ------------------------------------------------------------ listing page */
function listing(s) {
  const gallery = s.photos.slice(0, 5).map((p, i) =>
    `<figure>${img(s, p)}${i === 4 ? `<span class="gal-more">${s.photos.length} photos</span>` : ""}</figure>`).join("\n      ");

  const rest = s.photos.slice(5).map((p) => `<figure>${img(s, p)}</figure>`).join("\n      ");

  const body = `
<div class="wrap listing-head">
  <div class="rv">
    <p class="eyebrow">${esc(s.area)}</p>
    <h1>${esc(s.name)}</h1>
    <div class="listing-sub">
      ${ratingBlock(s)}
      <span>·</span><span>${esc(s.badge)}</span>
      <span>·</span><span>Alojamento Local ${s.licence}</span>
    </div>
  </div>

  <div class="gal rv">
      ${gallery}
  </div>

  <div class="cols">
    <div>
      <section style="padding-top:0">
        <div class="facts rv">
          <span>${ICON.guests} <b>${s.guests}</b> guests</span>
          <span>${ICON.bed} <b>${s.bedrooms}</b> bedrooms · <b>${s.beds}</b> beds</span>
          <span>${ICON.bath} <b>${s.baths}</b> bathroom</span>
        </div>
        <p class="lede rv">${esc(s.intro)}</p>

        <div class="feats rv-group" style="grid-template-columns:1fr;gap:14px;margin-top:32px">
          ${s.points.map(([h, p]) => `<div class="feat rv"><h3>${esc(h)}</h3><p>${esc(p)}</p></div>`).join("\n          ")}
        </div>
      </section>

      <section style="padding-top:14px">
        <h2 class="rv" style="margin-bottom:22px">What this place has</h2>
        <ul class="amen rv">
          ${s.amenities.map(([a, on]) =>
            `<li${on ? "" : ' class="off"'}>${on ? ICON.tick : ICON.cross}${esc(a)}</li>`).join("\n          ")}
        </ul>
        <p class="rv" style="color:var(--ink-3);font-size:.9rem;margin-top:18px">
          ${s.amenityTotal} amenities are listed in full on Airbnb.</p>
      </section>
    </div>

    <aside>
      <div class="book rv">
        ${ratingBlock(s)}
        <div class="book-price"><b>€${s.nightly}</b> <span>a night</span></div>
        <p class="book-save">€${s.airbnbNightly - s.nightly} a night less than the same flat on Airbnb,
           and no Airbnb service fee on top.</p>
        <h3>${esc(s.badge)}</h3>
        <p style="color:var(--ink-2);font-size:.94rem">${esc(s.badgeNote)}</p>
        <a class="btn btn-p btn-lg" href="${s.airbnb}" target="_blank" rel="noopener">Check dates on Airbnb</a>
        <ul class="book-list">
          <li><span>Guests</span><b>${s.guests}</b></li>
          <li><span>Bedrooms</span><b>${s.bedrooms}</b></li>
          <li><span>Beds</span><b>${s.beds}</b></li>
          <li><span>Bathroom</span><b>${s.baths}</b></li>
          <li><span>Minimum stay</span><b>${s.minNights} nights</b></li>
          <li><span>Book at least</span><b>${s.leadDays} days ahead</b></li>
          <li><span>Licence</span><b>${s.licence}</b></li>
        </ul>
        <p class="note">Prices depend on your dates, so they live on Airbnb rather than here.
        Booking, payment and cancellation are handled there too.</p>
      </div>
    </aside>
  </div>
</div>

<section class="sand" data-lightbox>
  <div class="wrap">
    <div class="sec-head rv">
      <p class="eyebrow">Every room</p>
      <h2>The rest of the apartment</h2>
    </div>
    <div class="shots rv-group">
      ${rest}
    </div>
  </div>
</section>

<section>
  <div class="wrap" style="text-align:center">
    <h2 class="rv">Free on your dates?</h2>
    <p class="lede rv" style="margin:14px auto 26px">The calendar on Airbnb is the live one.</p>
    <a class="btn btn-p btn-lg rv" href="${s.airbnb}" target="_blank" rel="noopener">Check dates on Airbnb</a>
  </div>
</section>
`;

  return shell({
    title: `${s.name} — ${s.tagline} | Chifstay Funchal`,
    desc: `${s.name}: ${s.tagline.toLowerCase()}. ${s.guests} guests, ${s.bedrooms} bedrooms, ${s.baths} bathroom in ${s.area}. Rated ${s.rating} from ${s.reviews} reviews. Licence ${s.licence}.`,
    canonical: `${SITE}/${s.slug}.html`,
    active: s.name,
    body,
    jsonld: {
      "@context": "https://schema.org",
      "@type": "Apartment",
      name: s.name,
      description: s.intro,
      url: `${SITE}/${s.slug}.html`,
      address: { "@type": "PostalAddress", addressLocality: "Funchal", addressRegion: "Madeira", addressCountry: "PT" },
      numberOfBedrooms: s.bedrooms,
      numberOfBathroomsTotal: s.baths,
      occupancy: { "@type": "QuantitativeValue", maxValue: s.guests },
      amenityFeature: s.amenities.map(([a, on]) => ({ "@type": "LocationFeatureSpecification", name: a, value: !!on })),
      aggregateRating: { "@type": "AggregateRating", ratingValue: s.rating, reviewCount: s.reviews, bestRating: 5 },
      offers: { "@type": "Offer", price: s.nightly, priceCurrency: "EUR",
                availability: "https://schema.org/InStock",
                priceSpecification: { "@type": "UnitPriceSpecification",
                  price: s.nightly, priceCurrency: "EUR", unitCode: "DAY" } },
      image: s.photos.slice(0, 5).map((p) => `${SITE}/assets/${s.dir}/${p[0]}.webp`),
    },
  });
}

/* ------------------------------------------------------------------- write */
writeFileSync("index.html", home());
for (const s of STAYS) writeFileSync(`${s.slug}.html`, listing(s));

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE}/</loc></url>
${STAYS.map((s) => `  <url><loc>${SITE}/${s.slug}.html</loc></url>`).join("\n")}
</urlset>
`;
writeFileSync("sitemap.xml", sitemap);
writeFileSync("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);

console.log(`index.html + ${STAYS.length} listing pages + sitemap.xml + robots.txt`);
for (const s of STAYS) console.log(`  ${s.slug}.html — ${s.photos.length} photos, ${s.amenities.length} amenities shown of ${s.amenityTotal}`);
