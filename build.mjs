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
import { writeFileSync, existsSync, readFileSync } from "node:fs";

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

const HOST = { name: "Natalia and Hugo", since: "1 year", superhost: true };

/* Guest reviews from the three sites the flats are sold on.
     reviews.json          Airbnb, by fetch-reviews.mjs (weekly on GitHub)
     reviews-booking.json  Booking.com, by fetch-booking-reviews.py (weekly on GitHub)
     reviews-manual.json   Vrbo, copied by hand (Vrbo blocks scripts), and clean
                           English for reviews that came with no translation
   Every review with words in it is shown on its flat's page, low scores
   included; only the home page picks a few, by id, below. A missing file just
   means that site's reviews are not shown. */
const load = (f) => (existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : {});
const SRC = {
  airbnb: load("reviews.json").stays || {},
  booking: load("reviews-booking.json").stays || {},
  // fetch-vrbo-reviews.py, on the Mac mini (Vrbo turns away headless browsers).
  vrbo: load("reviews-vrbo.json").stays || {},
};
const TRANSLATIONS = load("reviews-manual.json").translations || {};
const PLATFORM = { airbnb: "Airbnb", booking: "Booking.com", vrbo: "Vrbo" };
const FEATURED = [
  ["perla", "1528274650272740814"],    // Airbnb, Jack: peaceful, clean, luxurious
  ["varanda", "1759321504500034996"],  // Airbnb, Hannah: the waves from the terrace
  ["varanda", "7cdb02945bb456af"],     // Booking, Diana: the terrace, the beach, the centre
  ["perla", "1589109082578789745"],    // Airbnb, Yanrui: New Year fireworks over the bay
  ["perla", "69da5b3638ec8b101f304ca7"],// Vrbo, Nina: two weeks, the views, the buses
  ["varanda", "1647925537615631678"],  // Airbnb, Andreas: restaurants, private parking
];

const STAYS = [
  {
    key: "perla",
    slug: "perla-do-oceano",
    name: "Perla do Oceano Suite",
    tagline: "Funchal sea view with an XL terrace",
    airbnb: "https://www.airbnb.com/rooms/1420093678403124003",
    licence: "164578/AL",
    area: "Barreiros, Funchal",
    /* The street, not the door: the map shows an area, the address comes after booking. */
    geo: [32.6474, -16.9333],
    guests: 3, bedrooms: 2, beds: 2, baths: 1,
    rating: 4.95, reviews: 21,
    /* 23 Nov 2026: nightly = the lowest rate here, Airbnb's own price without
       Airbnb's fee (Airbnb 134.65 / 1.14). The full table is in the booking
       Worker (ST_RATES); the server prices every stay, never this file. */
    airbnbNightly: 135, nightly: 118, minNights: 7, leadDays: 2,
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
    /* What is in the flat, from the Airbnb and Booking.com listings and the
       photos (18 Nov 2026). [icon file in assets/icons, label]. The first ten
       of `top` show on the page; the rest open with "Show all". */
    top: ["Sea view", "XL terrace", "Wifi", "Full kitchen", "Dishwasher", "Washing machine", "Tumble dryer",
          "Bathtub", "Lift", "Free street parking"],
    amenities: [
      ["Views and outside", [
        ["waves", "Sea view", "Over Funchal bay and the harbour"],
        ["sun-horizon", "XL terrace", "Loungers and space to sit out"],
        ["coffee", "Second balcony", "Morning sun and a breakfast table"],
        ["mountains", "Mountain view", "The hills behind Funchal"],
      ]],
      ["Kitchen and dining", [
        ["cooking-pot", "Full kitchen", "Hob, pots and pans, oil, salt and pepper"],
        ["oven", "Oven", ""],
        ["snowflake", "Full-size fridge-freezer", ""],
        ["drop", "Dishwasher", ""],
        ["coffee", "Espresso machine", ""],
        ["bowl-food", "Plates, bowls and cutlery", ""],
        ["wine", "Wine glasses", ""],
        ["cooking-pot", "Blender", ""],
        ["fork-knife", "Dining table", ""],
      ]],
      ["Bedrooms and laundry", [
        ["bed", "Extra pillows and blankets", ""],
        ["towel", "Bed linen and towels", ""],
        ["coat-hanger", "Hangers", ""],
        ["vault", "Safe", ""],
        ["washing-machine", "Washing machine", ""],
        ["wind", "Tumble dryer", ""],
      ]],
      ["Bathroom", [
        ["bathtub", "Bathtub", ""],
        ["hair-dryer", "Hair dryer", ""],
        ["toilet", "Bidet", ""],
        ["spray-bottle", "Cleaning products", ""],
      ]],
      ["Living and internet", [
        ["wifi-high", "Wifi", ""],
        ["television-simple", "TV", "Big screen, sign in to your own Netflix"],
      ]],
      ["Building and parking", [
        ["elevator", "Lift", "Sixth floor, no stairs to carry bags up"],
        ["car", "Free street parking", ""],
        ["bus", "Bus stop", "About two minutes on foot"],
      ]],
      ["Safety", [
        ["siren", "Smoke alarm", ""],
      ]],
    ],
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
    key: "varanda",
    slug: "varanda-do-sol",
    name: "Varanda do Sol Suite",
    tagline: "A private terrace above Praia Formosa",
    airbnb: "https://www.airbnb.com/rooms/1397784964911656134",
    licence: "164601/AL",
    area: "Above Praia Formosa, Funchal",
    geo: [32.6372, -16.9469],
    guests: 3, bedrooms: 2, beds: 2, baths: 1,
    rating: 4.83, reviews: 6,
    airbnbNightly: 149, nightly: 131, minNights: 7, leadDays: 2,
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
    top: ["Sea view", "Private terrace", "Free parking in the garage", "Wifi", "Desk to work at", "Full kitchen",
          "Dishwasher", "Washing machine", "Beach access", "Ceiling fan"],
    amenities: [
      ["Views and outside", [
        ["waves", "Sea view", "Over Praia Formosa and along the coast"],
        ["sun-horizon", "Private terrace", "Loungers, facing the water"],
        ["fork-knife", "Outdoor dining area", "Eat out on the terrace"],
        ["umbrella-simple", "Beach access", "Praia Formosa and the Doca do Cavacas pools below"],
      ]],
      ["Kitchen and dining", [
        ["cooking-pot", "Full kitchen", "Hob, pots and pans, oil, salt and pepper"],
        ["oven", "Oven", ""],
        ["snowflake", "Fridge", ""],
        ["oven", "Microwave", ""],
        ["drop", "Dishwasher", ""],
        ["coffee", "Coffee machine", ""],
        ["tea-bag", "Electric kettle", ""],
        ["bowl-food", "Plates, bowls and cutlery", ""],
      ]],
      ["Bedrooms and laundry", [
        ["t-shirt", "Wardrobes", "In both bedrooms"],
        ["towel", "Bed linen and towels", ""],
        ["washing-machine", "Washing machine", ""],
      ]],
      ["Bathroom", [
        ["shower", "Shower", ""],
        ["hair-dryer", "Hair dryer", ""],
      ]],
      ["Living, work and internet", [
        ["wifi-high", "Wifi", ""],
        ["desk", "Desk to work at", ""],
        ["television-simple", "TV", ""],
        ["fan", "Ceiling fan", ""],
      ]],
      ["Parking", [
        ["garage", "Free parking in the garage", "Your own space in the building"],
        ["bus", "Bus stop", "A short walk up the road"],
      ]],
      ["Safety", [
        ["siren", "Smoke alarm", ""],
        ["fire-extinguisher", "Fire extinguisher", ""],
      ]],
    ],
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

/* Things to do around the flats. Photos: Wikimedia Commons (free licence,
   credited on the page) and Chifbay's own for the boat. geo is the place
   itself; the page shows the straight-line distance from each flat. */
const NEARBY = [
  { key: "formosa", name: "Praia Formosa", geo: [32.6380, -16.9480],
    text: "The biggest beach in Funchal. Dark pebbles, lifeguards in summer and cafés on the sand. A flat seafront path runs west from here to Câmara de Lobos.",
    credit: ["Dietmar Rabich", "CC BY-SA 4.0", "https://commons.wikimedia.org/wiki/File:S%C3%A3o_Martinho_(Madeira,_Portugal),_Praia_Formosa_--_2025_--_0656.jpg"] },
  { key: "cavacas", name: "Doca do Cavacas pools", geo: [32.6386, -16.9393],
    text: "Sea pools cut into black lava rock, with a fish restaurant on top. You swim in calm water while the waves break just outside.",
    credit: ["H. Zell", "CC BY-SA 3.0", "https://commons.wikimedia.org/wiki/File:Doca_do_Cavacas_-_Funchal_01.jpg"] },
  { key: "lido", name: "The Lido promenade", geo: [32.6380, -16.9335],
    text: "A seafront walk past gardens, cafés and the Lido and Ponta Gorda pools. Flat the whole way, and at its best around sunset.",
    credit: ["Dr. Thomas Liptak", "CC BY-SA 4.0", "https://commons.wikimedia.org/wiki/File:Funchal,_Promenade_do_Lido_(Passeio_P%C3%BAblico_Mar%C3%ADtimo)_2.jpg"] },
  { key: "camara", name: "Câmara de Lobos", geo: [32.6487, -16.9768],
    text: "A fishing village with painted boats pulled up on the slipway, a small bay, and poncha bars. Churchill came here to paint in 1950.",
    credit: ["Dietmar Rabich", "CC BY-SA 4.0", "https://commons.wikimedia.org/wiki/File:C%C3%A2mara_de_Lobos_(Madeira,_Portugal),_Porto_de_C%C3%A2mara_de_Lobos_--_2025_--_1901.jpg"] },
  { key: "girao", name: "Cabo Girão skywalk", geo: [32.6563, -17.0047],
    text: "A glass floor at the edge of one of the highest sea cliffs in Europe, 580 metres straight down to the fields and the sea.",
    credit: ["Ximonic (Simo Räsänen)", "CC BY-SA 4.0", "https://commons.wikimedia.org/wiki/File:Glass_balcony_of_Cabo_Gir%C3%A3o_skywalk,_C%C3%A2mara_de_Lobos,_Madeira,_2023_May.jpg"] },
  { key: "market", name: "The market and the old town", geo: [32.6497, -16.9035],
    text: "Mercado dos Lavradores sells exotic fruit, fish and flowers. Next to it, Rua de Santa Maria has its painted doors and many of the best restaurants in town.",
    credit: ["Dietmar Rabich", "CC BY-SA 4.0", "https://commons.wikimedia.org/wiki/File:Funchal_(Madeira,_Portugal),_Mercado_dos_Lavradores_--_2025_--_0995.jpg"] },
  { key: "monte", name: "Cable car to Monte", geo: [32.6482, -16.9019],
    text: "Fifteen minutes in the air from the old town up to Monte, its gardens and its church. Come back down in a wicker toboggan, pushed by two men in straw hats.",
    credit: ["Ввласенко", "CC BY-SA 3.0", "https://commons.wikimedia.org/wiki/File:Funchal_Cable_Car_Madeira.jpg"] },
  { key: "barcelos", name: "Pico dos Barcelos", geo: [32.6626, -16.9407],
    text: "A viewpoint above the city. The whole of Funchal bay in one look, and even better at night with the lights on.",
    credit: ["Diego Delso", "CC BY-SA 4.0", "https://commons.wikimedia.org/wiki/File:Vista_de_Funchal_desde_Pico_dos_Barcelos,_Madeira,_Portugal,_2019-05-29,_DD_45.jpg"] },
  { key: "boat", name: "Our boat, Chifbay", geo: [32.6450, -16.9100], link: "https://chifbay.com",
    text: "We also run a private boat from Marina do Funchal. Along the coast to Cabo Girão, with a swim and paddle boards, just your group on board.",
    credit: null },
];
const amenityCount = (s) => s.amenities.reduce((n, [, l]) => n + l.length, 0);
const amenityByLabel = (s, label) => {
  const a = s.amenities.flatMap(([, l]) => l).find((x) => x[1] === label);
  if (!a) throw new Error(`${s.key}: "${label}" is in top but not in amenities`);
  return a;
};
const km = ([a, b], [c, d]) => {
  const r = Math.PI / 180, x = (d - b) * r * Math.cos(((a + c) / 2) * r), y = (c - a) * r;
  return Math.hypot(x, y) * 6371;
};
const fmtKm = (k) => (k < 1 ? `${Math.round(k * 10) * 100} m` : `${k.toFixed(1)} km`);

/* Cards of what to do nearby. On a flat page they are sorted by distance
   from that flat and show it; on the home page they keep the list order. */
const nearbyBlock = (stay) => {
  const list = stay ? [...NEARBY].sort((x, y) => km(stay.geo, x.geo) - km(stay.geo, y.geo)) : NEARBY;
  return `<section${stay ? ' class="sand"' : ""} id="nearby">
  <div class="wrap">
    <div class="sec-head rv">
      <p class="eyebrow">Around ${stay ? "the flat" : "the flats"}</p>
      <h2>What to do nearby</h2>
      <p class="lede">${stay
        ? `Sorted by distance from ${esc(stay.name)}, as the crow flies. Buses, Bolt and Uber cover all of it; we are happy to tell you what we would do.`
        : "Both flats are on the west side of Funchal, between the Lido and Praia Formosa. Everything below is a short bus, Bolt or Uber ride away."}</p>
    </div>
    <div class="near rv-group">
      ${list.map((n) => `<article class="near-card rv">
        <img src="assets/near/${n.key}.webp" alt="${esc(n.name)}" loading="lazy" decoding="async" width="1200" height="800"/>
        <div>
          ${stay ? `<span class="near-km">${fmtKm(km(stay.geo, n.geo))}</span>` : ""}
          <h3>${esc(n.name)}</h3>
          <p>${esc(n.text)}</p>
          ${n.link ? `<a class="near-link" href="${n.link}" rel="noopener">See the boat trips</a>` : ""}
        </div>
      </article>`).join("\n      ")}
    </div>
    <details class="near-credits">
      <summary>Photo credits</summary>
      <p>${NEARBY.filter((n) => n.credit).map((n) => `${esc(n.name)}: <a href="${n.credit[2]}" rel="noopener">${esc(n.credit[0])}</a>, ${esc(n.credit[1])}`).join(" · ")}. From Wikimedia Commons, cropped. The boat photo is ours.</p>
    </details>
  </div>
</section>`;
};

/* Amenity icons are Phosphor (MIT), one file each in assets/icons, inlined so
   the page makes no extra requests. */
const ICON_CACHE = {};
const aicon = (name) => (ICON_CACHE[name] ??= readFileSync(`assets/icons/${name}.svg`, "utf8")
  .replace(/ xmlns="[^"]*"/, "").replace("<svg", '<svg aria-hidden="true"').trim());

/* Every review becomes the same shape: a title, what was good, what was not,
   the guest's own words when we show a translation, and the host's reply. */
const asParts = (t) => (t == null ? null : typeof t === "string" ? { title: "", good: t, bad: "" } : t);
function normalise(platform, r, scale) {
  const tr = TRANSLATIONS[r.id];
  const text = asParts(tr ? tr.text : r.text);
  const original = tr ? asParts(r.original || r.text) : asParts(r.original || null);
  return {
    id: r.id, platform, scale, name: r.name, from: r.from || "", date: r.date, rating: r.rating,
    stay: r.stay || "", text, original: original && original.good + original.title + original.bad ? original : null,
    lang: tr ? tr.lang : r.lang || "", reply: r.reply || "",
  };
}

for (const s of STAYS) {
  s.sources = [];
  s.reviewList = [];
  for (const key of Object.keys(SRC)) {
    const d = SRC[key][s.key];
    if (!d) continue;
    const scale = d.scale || 5;
    s.sources.push({ key, name: PLATFORM[key], rating: d.rating, scale, count: d.count, categories: d.categories || [] });
    s.reviewList.push(...(d.reviews || []).map((r) => normalise(key, r, scale)));
    if (key === "airbnb") { s.rating = d.rating; s.reviews = d.count; s.categories = d.categories || []; }
  }
  s.reviewList.sort((a, b) => b.date.localeCompare(a.date));
  s.reviewTotal = s.sources.reduce((n, x) => n + x.count, 0) || s.reviews;
}
const ALL_REVIEWS = STAYS.reduce((n, s) => n + s.reviews, 0);          // Airbnb only
const AVG = (STAYS.reduce((n, s) => n + s.rating * s.reviews, 0) / ALL_REVIEWS).toFixed(2);
const TOTAL = STAYS.reduce((n, s) => n + s.reviewTotal, 0);              // all three sites
/* One score per site across both flats, weighted by how many reviews each has. */
const SITE_SCORES = Object.keys(PLATFORM).map((key) => {
  const rows = STAYS.map((s) => s.sources.find((x) => x.key === key)).filter(Boolean);
  const count = rows.reduce((n, x) => n + x.count, 0);
  if (!count) return null;
  return { key, name: PLATFORM[key], scale: rows[0].scale, count,
    rating: rows.reduce((n, x) => n + x.rating * x.count, 0) / count };
}).filter(Boolean);
/* The home page shows every review of both flats: the chosen six first, then
   the rest, newest first. Each card says which flat it is about. */
const HOME_REVIEWS = (() => {
  const all = STAYS.flatMap((s) => s.reviewList.map((r) => ({ ...r, stayName: s.name })));
  const first = FEATURED.map(([k, id]) => all.find((r) => r.id === id && r.stayName === STAYS.find((x) => x.key === k).name)).filter(Boolean);
  return [...first, ...all.filter((r) => !first.includes(r)).sort((a, b) => b.date.localeCompare(a.date))];
})();
const fmtScore = (v, scale) => (scale === 5 ? v.toFixed(2) : v % 1 ? v.toFixed(1) : String(v));

/* ------------------------------------------------------------------ helpers */
/* One place that decides what a URL looks like. GitHub Pages already serves
   /perla-do-oceano for perla-do-oceano.html, so the extension is only ever
   noise in a link, in a canonical and in a sitemap. The home page is "/" and
   never "/index". The .html forms still answer 200 for anyone holding an old
   link; the canonical tells search engines which of the two is the real one. */
const url = (slug) => (slug ? `/${slug}` : "/");

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

const MONTH = (d) => new Date(d + "T12:00:00Z").toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
const para = (t) => esc(t).split(/\n+/).map((x) => `<p>${x}</p>`).join("");
const initial = (n) => esc(n.trim().charAt(0).toUpperCase());

const block = (t) => `${t.title ? `<p class="rev-title">${esc(t.title)}</p>` : ""}${t.good ? para(t.good) : ""}${
  t.bad ? `<p class="rev-bad"><span>Less good:</span> ${esc(t.bad).replace(/\n+/g, " ")}</p>` : ""}`;

/* One review card. A review written in another language shows an English
   translation, says so, and keeps the guest's own words one tap away. Airbnb
   scores out of 5 and shows stars; Booking.com and Vrbo score out of 10 and
   show the number, as they do on their own sites. */
const reviewCard = (r, { stayName = "", hidden = false, reveal = false } = {}) => `
        <article class="rev${reveal ? " rv" : ""}${hidden ? " rev-more" : ""}" data-src="${r.platform}"${hidden ? " hidden" : ""}>
          <header>
            <span class="rev-av" aria-hidden="true">${initial(r.name)}</span>
            <div><b>${esc(r.name)}</b><span>${esc(r.from)}</span></div>
            <span class="rev-src rev-src-${r.platform}">${esc(PLATFORM[r.platform])}</span>
          </header>
          <div class="rev-meta">${r.scale === 5
            ? `<span class="rev-stars" aria-label="${r.rating} out of 5 stars">${"★".repeat(r.rating)}<i>${"★".repeat(5 - r.rating)}</i></span>`
            : `<span class="rev-ten" aria-label="${r.rating} out of 10">${Number(r.rating).toFixed(r.rating % 1 ? 1 : 0)}<i>/10</i></span>`}
            <span>${MONTH(r.date)}</span>${r.stay ? `<span>${esc(r.stay)}</span>` : ""}${stayName ? `<span>${esc(stayName)}</span>` : ""}</div>
          <div class="rev-text">${block(r.text)}</div>
          ${r.original ? `<details class="rev-orig"><summary>Translated from ${esc(r.lang)} · show original</summary>${block(r.original)}</details>` : ""}
          ${r.reply ? `<details class="rev-orig"><summary>Reply from ${esc(HOST.name)}</summary>${para(r.reply)}</details>` : ""}
        </article>`;

/* The site scores as small tiles. A tile never leaves the site: it filters
   the reviews below to that site, the same as the buttons. Guests book here. */
const siteTiles = (rows) => `<div class="src-tiles" role="group" aria-label="Scores by site">
      ${rows.map((x) => `<button type="button" class="src-tile" data-filter="${x.key}" aria-pressed="false">
        <span>${esc(x.name)}</span><b>${fmtScore(x.rating, x.scale)}<i>/${x.scale}</i></b><small>${x.count} rating${x.count > 1 ? "s" : ""}</small></button>`).join("\n      ")}
    </div>`;

/* Filter buttons, the cards, and "Show more": 6 at first, 6 more per tap.
   Every review is in the page so search engines and screen readers have them. */
const PAGE = 6;
const reviewBlock = (list) => `
    <div class="rev-filter rv" role="group" aria-label="Show reviews from">
      <button type="button" class="on" data-filter="all" aria-pressed="true">All ${list.length}</button>
      ${Object.keys(PLATFORM).map((k) => {
        const n = list.filter((r) => r.platform === k).length;
        return n ? `<button type="button" data-filter="${k}" aria-pressed="false">${esc(PLATFORM[k])} ${n}</button>` : "";
      }).join("\n      ")}
    </div>
    <div class="revs rv-group">
      ${list.map((r, i) => reviewCard(r, { stayName: r.stayName || "", hidden: i >= PAGE, reveal: i < PAGE })).join("")}
    </div>
    <div class="rev-links">
      <button class="btn btn-o" type="button" data-more-reviews${list.length > PAGE ? "" : " hidden"}>Show more reviews</button>
    </div>`;

const img = (s, [file, alt], cls = "") =>
  `<img${cls ? ` class="${cls}"` : ""} src="assets/${s.dir}/${file}.webp" alt="${esc(alt)}" loading="lazy" decoding="async" width="1200" height="800"/>`;

function shell({ title, desc, canonical, body, jsonld, active, booking, noindex, image, map }) {
  const link = (href, label) =>
    `<a href="${href}"${active === label ? ' aria-current="page"' : ""}>${label}</a>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}"/>
${noindex ? '<meta name="robots" content="noindex,nofollow"/>' : ""}
<link rel="canonical" href="${canonical}"/>
<meta property="og:type" content="website"/>
<meta property="og:title" content="${esc(title)}"/>
<meta property="og:description" content="${esc(desc)}"/>
<meta property="og:url" content="${canonical}"/>
<meta name="twitter:card" content="summary_large_image"/>
${image ? `<meta property="og:image" content="${image}"/>\n<meta name="twitter:image" content="${image}"/>` : ""}
${map ? '<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin=""/>' : ""}
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="style.css"/>
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
</head>
<body>

<nav class="nav">
  <div class="wrap">
    <a class="brand" href="/" aria-label="Chifstay, Funchal">
      ${brandNav}
      <small>Funchal</small>
    </a>
    <button class="nav-toggle" aria-label="Menu" aria-expanded="false"><span></span><span></span><span></span></button>
    <div class="nav-links">
      ${link("/", "Home")}
      ${link("/perla-do-oceano", "Perla do Oceano")}
      ${link("/varanda-do-sol", "Varanda do Sol")}
      ${link("/#reviews", "Reviews")}
      ${link("/#boat", "The boat")}
    </div>
  </div>
</nav>

${body}

<footer>
  <div class="wrap">
    <div class="foot-grid">
      <div>
        <div class="foot-brand">${brandFoot}</div>
        <p style="max-width:38ch;margin:0">Two apartments in Funchal, Madeira, looked after by ${HOST.name}. Both licensed. Book direct, no service fee.</p>
      </div>
      <div>
        <h4>The apartments</h4>
        <ul>
          <li><a href="/perla-do-oceano">Perla do Oceano</a></li>
          <li><a href="/varanda-do-sol">Varanda do Sol</a></li>
        </ul>
      </div>
      <div>
        <h4>On the water</h4>
        <ul>
          <li><a href="https://chifbay.com" rel="noopener">Chifbay, private boat tours</a></li>
          <li><a href="https://chifbay.com/hidden-coves-half-day" rel="noopener">The day trip</a></li>
          <li><a href="https://chifbay.com/sunset-cruise" rel="noopener">The sunset trip</a></li>
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
      <span>Card payments by Stripe.</span>
    </div>
  </div>
</footer>

<script src="app.js"></script>
${booking ? '<script src="booking.js"></script>' : ""}
${map ? '<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>\n<script src="map.js"></script>' : ""}
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
          <p class="price"><b>from €${s.nightly}</b> a night · ${s.minNights} nights minimum
             <span>Airbnb's own price without Airbnb's fees. 20% to book, the rest on arrival</span></p>
          <div class="stay-cta">
            <a class="btn btn-p" href="${url(s.slug)}">See the apartment</a>
            <a class="btn btn-o" href="${url(s.slug)}#book">Check dates</a>
          </div>
        </div>
      </article>`).join("\n");

  const body = `
<header class="intro">
  <div class="wrap">
    <div class="hero-copy rv">
      <p class="eyebrow">Funchal · Madeira</p>
      <h1>Two apartments, both with the sea in the window</h1>
      <p class="lede">Both sleep three, both have two bedrooms and a terrace of their own. One looks over
      Funchal bay from Barreiros, the other sits on the cliff above Praia Formosa.</p>
    </div>
    <div class="hero-facts rv">
      <span><b>${STAYS.length}</b> apartments</span>
      <span><b>${STAYS.reduce((n, s) => n + s.guests, 0)}</b> guests in total</span>
      <a class="hero-rating" href="#reviews">${ICON.star}<b>${AVG}</b> on Airbnb · ${TOTAL} guest reviews on 3 sites</a>
      <span>Licensed <b>Alojamento Local</b></span>
    </div>
  </div>
</header>

${STAYS.map((s, i) => `
<section class="flat${i % 2 ? " sand" : ""}" id="${s.slug}">
  <div class="wrap flat-in${i % 2 ? " flip" : ""}">
    <div class="flat-shots rv">
      ${s.photos.slice(0, 3).map((ph, j) => `<figure${j ? "" : ' class="lead"'}>${img(s, ph)}</figure>`).join("\n      ")}
    </div>
    <div class="flat-copy rv">
      <span class="badge-flat">${esc(s.badge)}</span>
      <h2>${esc(s.name)}</h2>
      <p class="flat-where">${esc(s.area)}</p>
      ${ratingBlock(s)}
      <div class="stay-meta">
        <span>${ICON.guests} ${s.guests} guests</span>
        <span>${ICON.bed} ${s.bedrooms} bedrooms · ${s.beds} beds</span>
        <span>${ICON.bath} ${s.baths} bathroom</span>
      </div>
      <p>${esc(s.tagline)}.</p>
      <p class="price"><b>from €${s.nightly}</b> a night · ${s.minNights} nights minimum
         <span>Airbnb's own price without Airbnb's fees. 20% to book, the rest on arrival</span></p>
      <div class="stay-cta">
        <a class="btn btn-p" href="${url(s.slug)}">See the apartment</a>
        <a class="btn btn-o" href="${url(s.slug)}#book">Check dates</a>
      </div>
    </div>
  </div>
</section>`).join("\n")}

<section id="reviews">
  <div class="wrap">
    <div class="sec-head rv">
      <p class="eyebrow">Guest reviews</p>
      <h2>${HOME_REVIEWS.length} guest reviews, from three sites</h2>
      <p class="lede">Each one written by a guest after their stay, on Airbnb, Booking.com or Vrbo. Nothing is
      edited; reviews in other languages show an English translation, with the guest's own words one tap away.</p>
    </div>
    <div class="rv">${siteTiles(SITE_SCORES)}</div>
    ${reviewBlock(HOME_REVIEWS)}
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

${nearbyBlock(null)}

<section class="sand" id="boat">
  <div class="wrap">
    <div class="sec-head rv">
      <p class="eyebrow">The same crew, on the water</p>
      <h2>We also run the boat</h2>
      <p class="lede">Chifbay is our private boat out of Marina do Funchal, the same family, a few minutes
      from either apartment. One group at a time, never shared: Cabo Girão, a swim at Fajã dos Padres, or the
      coast at golden hour. Guests staying with us book it directly.</p>
    </div>
    <div class="feats rv-group">
      <div class="feat rv">
        <div class="ico">${ICON.wave}</div>
        <h3>The day trip</h3>
        <p>Two and a half or three hours down the west coast, with swimming and paddle boarding.</p>
        <p style="margin-top:12px"><a class="btn btn-o" href="https://chifbay.com/hidden-coves-half-day"
           rel="noopener">See the day trip</a></p>
      </div>
      <div class="feat rv">
        <div class="ico">${ICON.star}</div>
        <h3>The sunset trip</h3>
        <p>Two hours to Cabo Girão as the light goes, or two and a half on to Ribeira Brava.</p>
        <p style="margin-top:12px"><a class="btn btn-o" href="https://chifbay.com/sunset-cruise"
           rel="noopener">See the sunset trip</a></p>
      </div>
      <div class="feat rv">
        <div class="ico">${ICON.key}</div>
        <h3>Rated 5.0</h3>
        <p>Across every verified trip, with the same two skippers on board each time.</p>
        <p style="margin-top:12px"><a class="btn btn-o" href="https://chifbay.com" rel="noopener">Visit chifbay.com</a></p>
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
        <p>Here, on this site. Pick your dates on the apartment page and pay a 20% deposit by card through Stripe;
        the rest is paid when you arrive. The
        calendar shows what is actually free: it reads the same availability as Airbnb, Vrbo and Booking, so a
        night sold anywhere is closed everywhere.</p></details>
      <details><summary>Is it cheaper than Airbnb?</summary>
        <p>Yes. You pay the same price as on Airbnb without Airbnb's fees, with the same weekly (5%) and monthly (10%)
        discounts. Only 20% is paid online to book; the rest is paid on arrival.</p></details>
      <details><summary>How many people can stay?</summary>
        <p>Three in each apartment. Both have two bedrooms, two beds and one bathroom.</p></details>
      <details><summary>Is there parking?</summary>
        <p>Varanda do Sol comes with free parking on site. Perla do Oceano has free street parking nearby.</p></details>
      <details><summary>Who looks after the flats?</summary>
        <p>${HOST.name}, who live in Funchal. Both flats are Superhost-run on Airbnb, and you are met at the door on arrival.</p></details>
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
    canonical: SITE + url(),
    active: "Home",
    image: `${SITE}/assets/gbp/perla-terrasse-vue-mer.jpg`,
    body,
    jsonld: {
      "@context": "https://schema.org",
      "@type": "ItemList",
      publisher: { "@type": "Organization", name: "Chifstay", url: SITE,
                   parentOrganization: { "@type": "Organization", name: "Chifbay", url: "https://chifbay.com" } },
      name: "Chifstay apartments in Funchal",
      itemListElement: STAYS.map((s, i) => ({
        "@type": "ListItem", position: i + 1,
        item: {
          "@type": "Apartment", name: s.name, url: `${SITE}${url(s.slug)}`,
          address: { "@type": "PostalAddress", addressLocality: "Funchal", addressRegion: "Madeira", addressCountry: "PT" },
          numberOfBedrooms: s.bedrooms, numberOfBathroomsTotal: s.baths,
          occupancy: { "@type": "QuantitativeValue", maxValue: s.guests },
        },
      })),
    },
  });
}

/* ------------------------------------------------------------ listing page */
function listing(s) {
  /* One gallery, not two. The five that show are the grid; the rest are in the
     same lightbox behind them, hidden from the page but present in the DOM so
     the viewer has every photo in order and the page stays short. Two galleries
     half a page apart made a guest hunt for pictures they had already seen. */
  const gallery = s.photos.slice(0, 5).map((p, i) =>
    `<figure>${img(s, p)}${i === 4 ? `<span class="gal-more">Show all ${s.photos.length} photos</span>` : ""}</figure>`).join("\n      ");

  const rest = s.photos.slice(5).map((p) => `<figure hidden>${img(s, p)}</figure>`).join("\n      ");

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
      ${rest}
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

      <section style="padding-top:14px" id="amenities">
        <h2 class="rv" style="margin-bottom:22px">What this place has</h2>
        <ul class="amen rv">
          ${s.top.map((label) => { const a = amenityByLabel(s, label);
            return `<li>${aicon(a[0])}<span>${esc(a[1])}${a[2] ? `<small>${esc(a[2])}</small>` : ""}</span></li>`; }).join("\n          ")}
        </ul>
        <details class="amen-all rv">
          <summary class="btn btn-o"><span class="more">Show all ${amenityCount(s)} amenities</span><span class="less">Show fewer</span></summary>
          ${s.amenities.map(([group, list]) => `<h3>${esc(group)}</h3>
          <ul class="amen">
            ${list.map(([ic, label, note]) => `<li>${aicon(ic)}<span>${esc(label)}${note ? `<small>${esc(note)}</small>` : ""}</span></li>`).join("\n            ")}
          </ul>`).join("\n          ")}
        </details>
      </section>
    </div>

    <aside>
      <div class="book rv">
        ${ratingBlock(s)}
        <div class="book-price"><b>from €${s.nightly}</b> <span>a night</span></div>
        <p class="book-save">Airbnb's own price without Airbnb's fees: 5% off a week, 10% off a month.
           Pay 20% to book, the rest on arrival. Pick your dates for the exact price.</p>
        <h3>${esc(s.badge)}</h3>
        <p style="color:var(--ink-2);font-size:.94rem">${esc(s.badgeNote)}</p>
        <div id="book" data-stay="${s.key}" data-nightly="${s.nightly}"
             data-min="${s.minNights}" data-lead="${s.leadDays}"></div>
        <ul class="book-list">
          <li><span>Guests</span><b>${s.guests}</b></li>
          <li><span>Bedrooms</span><b>${s.bedrooms}</b></li>
          <li><span>Beds</span><b>${s.beds}</b></li>
          <li><span>Bathroom</span><b>${s.baths}</b></li>
          <li><span>Minimum stay</span><b>${s.minNights} nights</b></li>
          <li><span>Book at least</span><b>${s.leadDays} days ahead</b></li>
          <li><span>Licence</span><b>${s.licence}</b></li>
        </ul>
        <p class="note">Booked and paid here. The calendar reads the same availability as Airbnb,
        Vrbo and Booking, so a night sold anywhere is closed everywhere.</p>
      </div>
    </aside>
  </div>
</div>

<section class="sand" id="reviews">
  <div class="wrap">
    <div class="sec-head rv">
      <p class="eyebrow">Guest reviews</p>
      <h2>${s.reviewList.length} guest reviews, from three sites</h2>
    </div>
    <div class="rv">${siteTiles(s.sources)}</div>
    ${s.categories && s.categories.length ? `<div class="rev-head rv">
      <p class="rev-cats-h">Airbnb scores, out of 5</p>
      <ul class="rev-cats">
        ${s.categories.map(([l, v]) => `<li><span>${esc(l)}</span><i><em style="width:${(v / 5) * 100}%"></em></i><b>${v.toFixed(1)}</b></li>`).join("\n        ")}
      </ul>
    </div>` : ""}
    ${reviewBlock(s.reviewList)}
  </div>
</section>

<section id="where">
  <div class="wrap">
    <div class="sec-head rv">
      <p class="eyebrow">Where you will be</p>
      <h2>${esc(s.area)}</h2>
      <p class="lede">The circle shows the area. The exact address and the way in come with your booking.</p>
    </div>
    <div class="map rv" id="map" data-lat="${s.geo[0]}" data-lng="${s.geo[1]}" role="img"
         aria-label="Map of ${esc(s.area)}, Madeira"></div>
  </div>
</section>

${nearbyBlock(s)}

<section>
  <div class="wrap" style="text-align:center">
    <h2 class="rv">Free on your dates?</h2>
    <p class="lede rv" style="margin:14px auto 26px">Book straight here, and keep what Airbnb would have charged you on top.</p>
    <a class="btn btn-p btn-lg rv" href="#book">Pick your dates</a>
  </div>
</section>
`;

  return shell({
    title: `${s.name} — ${s.tagline} | Chifstay Funchal`,
    desc: `${s.name}: ${s.tagline.toLowerCase()}. ${s.guests} guests, ${s.bedrooms} bedrooms, ${s.baths} bathroom in ${s.area}. Rated ${s.rating} from ${s.reviews} reviews. Licence ${s.licence}.`,
    canonical: `${SITE}${url(s.slug)}`,
    active: s.name,
    booking: true,
    map: true,
    image: `${SITE}/assets/gbp/${s.key}-${s.hero}.jpg`,
    body,
    jsonld: {
      "@context": "https://schema.org",
      "@type": "Apartment",
      name: s.name,
      description: s.intro,
      url: `${SITE}${url(s.slug)}`,
      address: { "@type": "PostalAddress", addressLocality: "Funchal", addressRegion: "Madeira", addressCountry: "PT" },
      numberOfBedrooms: s.bedrooms,
      numberOfBathroomsTotal: s.baths,
      occupancy: { "@type": "QuantitativeValue", maxValue: s.guests },
      amenityFeature: s.amenities.flatMap(([, l]) => l).map(([, a]) => ({ "@type": "LocationFeatureSpecification", name: a, value: true })),
      /* No aggregateRating and no Review here: Google's rules forbid marking up
         ratings collected on other sites (Airbnb, Booking, Vrbo), and breaking
         them can cost the page its rich results. The reviews stay visible. */
      offers: { "@type": "Offer", price: s.nightly, priceCurrency: "EUR",
                description: "Lowest nightly rate; high season costs more.",
                availability: "https://schema.org/InStock",
                priceSpecification: { "@type": "UnitPriceSpecification",
                  price: s.nightly, priceCurrency: "EUR", unitCode: "DAY" } },
      image: s.photos.slice(0, 5).map((p) => `${SITE}/assets/${s.dir}/${p[0]}.webp`),
    },
  });
}


/* ------------------------------------------------------- after the payment
 * Stripe sends the guest back here. The page asks the Worker what actually
 * happened rather than believing the URL, because anything in a query string
 * is something a visitor can type. One <h1>, set once, and noindex: this page
 * exists for one person for one minute. */
function bookingDone() {
  const body = `
<section style="min-height:60vh;display:grid;place-items:center;text-align:center">
  <div class="wrap" style="max-width:620px">
    <p class="eyebrow" id="dnEyebrow">Booking</p>
    <h1 id="dnTitle" style="margin-bottom:16px">Checking your booking…</h1>
    <p class="lede" id="dnText" style="margin-inline:auto">One moment.</p>
    <div id="dnFacts" style="margin-top:26px"></div>
    <p style="margin-top:30px"><a class="btn btn-o" href="/">Back to the apartments</a></p>
  </div>
</section>

<script>
(function () {
  var API = 'https://chifbay-booking-api.chifandcopt.workers.dev/stays';
  var id = new URLSearchParams(location.search).get('id');
  var title = document.getElementById('dnTitle');
  var text  = document.getElementById('dnText');
  var facts = document.getElementById('dnFacts');

  function say(t, p) { title.textContent = t; text.textContent = p; }

  if (!id) { say('We could not find that booking', 'The link is missing its reference. If you were charged, write to us and we will sort it out.'); return; }

  /* The webhook usually lands before the guest does, but not always, so a
     booking still showing as held is worth one retry rather than an alarming
     message about a payment that did go through. */
  var tries = 0;
  (function check() {
    fetch(API + '/v1/booking/' + encodeURIComponent(id))
      .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function (b) {
        if (b.status !== 'paid' && tries++ < 4) { setTimeout(check, 2000); return; }
        if (b.status === 'paid') {
          say('You are booked', 'We have your deposit and the dates are yours. You will hear from us with the keys and the arrival details.');
          facts.innerHTML = '<ul class="book-list" style="text-align:left;max-width:320px;margin:0 auto">'
            + '<li><span>Arrive</span><b>' + b.from + '</b></li>'
            + '<li><span>Leave</span><b>' + b.to + '</b></li>'
            + '<li><span>Nights</span><b>' + b.nights + '</b></li>'
            + '<li><span>Stay</span><b>&euro;' + (b.amount / 100).toFixed(0) + '</b></li>'
            + '<li><span>Paid now</span><b>&euro;' + ((b.deposit != null ? b.deposit : b.amount) / 100).toFixed(0) + '</b></li>'
            + (b.balance ? '<li><span>On arrival</span><b>&euro;' + (b.balance / 100).toFixed(0) + '</b></li>' : '')
            + '</ul>' + (b.balance ? '<p style="color:var(--ink-2);font-size:.9rem;margin-top:12px">The rest and the Funchal tourist tax (&euro;2 per adult per night, 7 nights at most) are paid when you arrive.</p>' : '');
        } else {
          say('Payment not completed', 'Nothing has been charged and the dates have been released. You can pick them again whenever you like.');
        }
      })
      .catch(function () {
        say('We could not load your booking', 'If your card was charged you are booked, and we will be in touch. Otherwise nothing was taken.');
      });
  })();
})();
</script>`;
  return shell({
    title: "Booking confirmed | Chifstay",
    desc: "Your Chifstay booking.",
    canonical: `${SITE}/booking-done`,
    noindex: true,
    body,
    jsonld: { "@context": "https://schema.org", "@type": "WebPage", name: "Booking confirmed" },
  });
}

/* ------------------------------------------------------------------- write */
writeFileSync("index.html", home());
writeFileSync("booking-done.html", bookingDone());
for (const s of STAYS) writeFileSync(`${s.slug}.html`, listing(s));

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE}${url()}</loc></url>
${STAYS.map((s) => `  <url><loc>${SITE}${url(s.slug)}</loc></url>`).join("\n")}
</urlset>
`;
writeFileSync("sitemap.xml", sitemap);
writeFileSync("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);

console.log(`index.html + ${STAYS.length} listing pages + sitemap.xml + robots.txt`);
for (const s of STAYS) console.log(`  ${s.slug}.html — ${s.photos.length} photos, ${amenityCount(s)} amenities, ${s.reviewList.length} reviews`);
