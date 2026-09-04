/* Chifstays booking API.
 *
 * Direct bookings for two apartments in Funchal, paid by card through Stripe,
 * without sending the guest to Airbnb.
 *
 * The one thing this has to get right
 * -----------------------------------
 * Both flats are already sold on Airbnb, and Airbnb already imports the Vrbo
 * and Booking.com calendars, so Airbnb's own iCal export carries all three
 * channels. Reading that one feed is enough to know every night that is taken
 * elsewhere. In the other direction this Worker publishes its own bookings at
 * /ical/<stay>.ics, and that URL goes into Airbnb as an imported calendar, so
 * a night sold here closes on Airbnb too.
 *
 * Nothing is sold on a night that is not free in BOTH directions. A hold is
 * taken before the guest reaches Stripe and released if they do not pay, so
 * two people cannot buy the same week while one of them is typing a card.
 *
 * Money
 * -----
 * The secret key never appears here. It is a Worker secret. The catalogue
 * below carries the nightly rate, and the amount charged is always recomputed
 * from it on the server: the browser sends dates, never a price.
 */

const STAYS = {
  perla: {
    name: "Perla do Oceano",
    nightly: 11500,          // cents. 115.00 EUR
    minNights: 7,
    leadDays: 2,
    icalVar: "ICAL_PERLA",
    slug: "perla-do-oceano",
  },
  varanda: {
    name: "Varanda do Sol",
    nightly: 12500,          // cents. 125.00 EUR
    minNights: 7,
    leadDays: 2,
    icalVar: "ICAL_VARANDA",
    slug: "varanda-do-sol",
  },
};

const CURRENCY = "eur";
const HOLD_MINUTES = 30;
const TZ = "Atlantic/Madeira";

/* ------------------------------------------------------------------ dates */
const isDate = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + "T00:00:00Z"));
const day = (s) => Date.parse(s + "T00:00:00Z") / 86400000;
const fromDay = (n) => new Date(n * 86400000).toISOString().slice(0, 10);
const today = () => new Date().toISOString().slice(0, 10);

/* Every night between check-in and check-out, check-out excluded: a guest
   leaving on the 19th does not occupy the night of the 19th. Getting this
   wrong blocks one night too many on every booking, for ever. */
function nightsBetween(from, to) {
  const out = [];
  for (let d = day(from); d < day(to); d++) out.push(fromDay(d));
  return out;
}

/* ------------------------------------------------------------------- iCal
 * A deliberately small parser. Airbnb, Vrbo and Booking all publish the same
 * shape: VEVENT blocks with DTSTART;VALUE=DATE and DTEND;VALUE=DATE. DTEND is
 * exclusive, which matches nightsBetween above. Anything it cannot read is
 * skipped rather than guessed, and a feed that fails to load is treated as
 * "everything is busy", never as "everything is free". */
function parseICal(text) {
  const nights = new Set();
  const blocks = text.split(/BEGIN:VEVENT/).slice(1);
  for (const b of blocks) {
    const s = b.match(/DTSTART[^:]*:(\d{8})/);
    const e = b.match(/DTEND[^:]*:(\d{8})/);
    if (!s || !e) continue;
    const iso = (v) => `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`;
    for (const n of nightsBetween(iso(s[1]), iso(e[1]))) nights.add(n);
  }
  return [...nights];
}

async function refreshChannel(env, key) {
  const stay = STAYS[key];
  const url = env[stay.icalVar];
  if (!url) return { ok: false, why: "no feed url set" };
  try {
    const r = await fetch(url, { cf: { cacheTtl: 0 } });
    if (!r.ok) return { ok: false, why: `feed HTTP ${r.status}` };
    const nights = parseICal(await r.text());
    await env.BOOKINGS.put(`channels:${key}`, JSON.stringify({ nights, at: Date.now() }));
    return { ok: true, nights: nights.length };
  } catch (err) {
    return { ok: false, why: String(err).slice(0, 120) };
  }
}

/* Nights this Worker must refuse: sold elsewhere, sold here, or held here.
 * If the channel feed has never loaded we say so and refuse everything, because
 * selling blind on a flat that is live on three other sites is how you end up
 * with two families at one door. */
async function blockedNights(env, key) {
  const ch = await env.BOOKINGS.get(`channels:${key}`, "json");
  if (!ch) return { known: false, nights: new Set() };

  const set = new Set(ch.nights);
  const now = Date.now();
  const list = await env.BOOKINGS.list({ prefix: `book:${key}:` });
  for (const k of list.keys) {
    const b = await env.BOOKINGS.get(k.name, "json");
    if (!b) continue;
    if (b.status === "held" && b.expires < now) continue;   // a dead hold blocks nothing
    if (b.status === "cancelled") continue;
    for (const n of b.nights) set.add(n);
  }
  return { known: true, nights: set, feedAge: now - ch.at };
}

/* --------------------------------------------------------------- responses */
const json = (env, body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": env.SITE_ORIGIN || "*",
      "cache-control": "no-store",
    },
  });

/* ------------------------------------------------------------------ quote
 * The only place a price is ever worked out. Called by /v1/quote so the page
 * can show a total, and again inside /v1/checkout so the amount Stripe is
 * asked for cannot be influenced by anything the browser sent. */
function quote(stay, from, to) {
  if (!isDate(from) || !isDate(to)) return { error: "dates must be YYYY-MM-DD" };
  const nights = nightsBetween(from, to);
  if (nights.length < 1) return { error: "check-out must be after check-in" };
  if (nights.length < stay.minNights) return { error: `minimum stay is ${stay.minNights} nights` };
  if (day(from) - day(today()) < stay.leadDays) return { error: `book at least ${stay.leadDays} days ahead` };
  return { nights, count: nights.length, amount: nights.length * stay.nightly, currency: CURRENCY };
}

/* ------------------------------------------------------------------ Stripe */
async function stripe(env, path, form) {
  const r = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(form),
  });
  const body = await r.json();
  if (!r.ok) throw new Error(body.error?.message || `stripe ${r.status}`);
  return body;
}

/* Stripe signs its webhooks. Without this check anyone who finds the URL can
   post "paid" and get a free week. */
async function signatureOk(env, sig, payload) {
  if (!sig || !env.STRIPE_WEBHOOK_SECRET) return false;
  const parts = Object.fromEntries(sig.split(",").map((p) => p.split("=")));
  if (!parts.t || !parts.v1) return false;
  if (Math.abs(Date.now() / 1000 - Number(parts.t)) > 300) return false;   // replay window
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(env.STRIPE_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${parts.t}.${payload}`));
  const mine = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  if (mine.length !== parts.v1.length) return false;
  let diff = 0;
  for (let i = 0; i < mine.length; i++) diff |= mine.charCodeAt(i) ^ parts.v1.charCodeAt(i);
  return diff === 0;                                        // constant time
}

/* -------------------------------------------------------------------- ics */
function icsFor(key, bookings) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const ev = bookings.map((b) => {
    const out = fromDay(day(b.nights[b.nights.length - 1]) + 1);
    return `BEGIN:VEVENT
UID:${b.id}@chifstays.com
DTSTAMP:${stamp}
DTSTART;VALUE=DATE:${b.nights[0].replace(/-/g, "")}
DTEND;VALUE=DATE:${out.replace(/-/g, "")}
SUMMARY:Booked on chifstays.com
END:VEVENT`;
  }).join("\n");
  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Chifstays//Booking//EN
CALSCALE:GREGORIAN
X-WR-CALNAME:Chifstays ${STAYS[key].name}
X-WR-TIMEZONE:${TZ}
${ev}
END:VCALENDAR`;
}

/* ------------------------------------------------------------------ routes */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const p = url.pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: {
        "access-control-allow-origin": env.SITE_ORIGIN || "*",
        "access-control-allow-headers": "content-type",
        "access-control-allow-methods": "GET,POST,OPTIONS",
      }});
    }

    if (p === "/v1/health") {
      const out = {};
      for (const k of Object.keys(STAYS)) {
        const ch = await env.BOOKINGS.get(`channels:${k}`, "json");
        out[k] = ch ? { feedNights: ch.nights.length, ageMinutes: Math.round((Date.now() - ch.at) / 60000) }
                    : { feed: "never loaded" };
      }
      return json(env, { ok: true, stripe: !!env.STRIPE_SECRET_KEY, channels: out });
    }

    if (p === "/v1/catalogue") {
      return json(env, { currency: CURRENCY, timezone: TZ,
        stays: Object.fromEntries(Object.entries(STAYS).map(([k, s]) =>
          [k, { name: s.name, slug: s.slug, nightly: s.nightly, minNights: s.minNights, leadDays: s.leadDays }])) });
    }

    if (p === "/v1/availability") {
      const key = url.searchParams.get("stay");
      if (!STAYS[key]) return json(env, { error: "unknown stay" }, 400);
      const b = await blockedNights(env, key);
      if (!b.known) return json(env, { error: "calendar not loaded yet", blocked: null }, 503);
      return json(env, { stay: key, blocked: [...b.nights].sort(), feedAgeMinutes: Math.round(b.feedAge / 60000) });
    }

    if (p === "/v1/quote") {
      const key = url.searchParams.get("stay");
      if (!STAYS[key]) return json(env, { error: "unknown stay" }, 400);
      const q = quote(STAYS[key], url.searchParams.get("from"), url.searchParams.get("to"));
      if (q.error) return json(env, q, 400);
      const b = await blockedNights(env, key);
      if (!b.known) return json(env, { error: "calendar not loaded yet" }, 503);
      const clash = q.nights.filter((n) => b.nights.has(n));
      if (clash.length) return json(env, { error: "some nights are taken", taken: clash }, 409);
      return json(env, { stay: key, ...q });
    }

    if (p === "/v1/checkout" && request.method === "POST") {
      let body;
      try { body = await request.json(); } catch { return json(env, { error: "bad json" }, 400); }
      const key = body.stay;
      if (!STAYS[key]) return json(env, { error: "unknown stay" }, 400);
      const stay = STAYS[key];

      const q = quote(stay, body.from, body.to);          // priced here, never by the browser
      if (q.error) return json(env, q, 400);

      const b = await blockedNights(env, key);
      if (!b.known) return json(env, { error: "calendar not loaded yet" }, 503);
      const clash = q.nights.filter((n) => b.nights.has(n));
      if (clash.length) return json(env, { error: "some nights are taken", taken: clash }, 409);

      const id = crypto.randomUUID();
      await env.BOOKINGS.put(`book:${key}:${id}`, JSON.stringify({
        id, stay: key, nights: q.nights, from: body.from, to: body.to,
        amount: q.amount, status: "held", expires: Date.now() + HOLD_MINUTES * 60000,
        email: (body.email || "").slice(0, 200), name: (body.name || "").slice(0, 120),
      }), { expirationTtl: 60 * 60 * 24 * 400 });

      try {
        const s = await stripe(env, "checkout/sessions", {
          mode: "payment",
          "line_items[0][quantity]": String(q.count),
          "line_items[0][price_data][currency]": CURRENCY,
          "line_items[0][price_data][unit_amount]": String(stay.nightly),
          "line_items[0][price_data][product_data][name]": `${stay.name} — ${q.count} nights`,
          "line_items[0][price_data][product_data][description]": `${body.from} to ${body.to}`,
          success_url: `${env.SITE_ORIGIN}/booking-done.html?id=${id}`,
          cancel_url: `${env.SITE_ORIGIN}/${stay.slug}.html`,
          client_reference_id: id,
          "metadata[booking]": id,
          "metadata[stay]": key,
          customer_email: body.email || undefined,
          expires_at: String(Math.floor(Date.now() / 1000) + HOLD_MINUTES * 60),
        });
        return json(env, { id, url: s.url });
      } catch (err) {
        await env.BOOKINGS.delete(`book:${key}:${id}`);     // no session, no hold
        return json(env, { error: String(err).slice(0, 160) }, 502);
      }
    }

    if (p === "/v1/webhook" && request.method === "POST") {
      const payload = await request.text();
      if (!(await signatureOk(env, request.headers.get("stripe-signature"), payload))) {
        return new Response("bad signature", { status: 400 });
      }
      const ev = JSON.parse(payload);
      if (ev.type === "checkout.session.completed") {
        const id = ev.data.object.metadata?.booking;
        const key = ev.data.object.metadata?.stay;
        if (id && STAYS[key]) {
          const k = `book:${key}:${id}`;
          const b = await env.BOOKINGS.get(k, "json");
          if (b && b.status !== "paid") {
            b.status = "paid";
            b.paidAt = Date.now();
            b.stripe = ev.data.object.id;
            await env.BOOKINGS.put(k, JSON.stringify(b), { expirationTtl: 60 * 60 * 24 * 400 });
          }
        }
      }
      return new Response("ok");
    }

    // The calendar Airbnb, Vrbo and Booking import so a night sold here closes there.
    const m = p.match(/^\/ical\/([a-z]+)\.ics$/);
    if (m && STAYS[m[1]]) {
      const key = m[1];
      const list = await env.BOOKINGS.list({ prefix: `book:${key}:` });
      const out = [];
      for (const k of list.keys) {
        const b = await env.BOOKINGS.get(k.name, "json");
        if (b && b.status === "paid") out.push(b);
      }
      return new Response(icsFor(key, out), {
        headers: { "content-type": "text/calendar; charset=utf-8", "cache-control": "no-store" },
      });
    }

    if (p.startsWith("/v1/booking/")) {
      const id = p.split("/").pop();
      for (const key of Object.keys(STAYS)) {
        const b = await env.BOOKINGS.get(`book:${key}:${id}`, "json");
        if (b) return json(env, { id: b.id, stay: b.stay, from: b.from, to: b.to,
                                  nights: b.nights.length, amount: b.amount, status: b.status });
      }
      return json(env, { error: "not found" }, 404);
    }

    return json(env, { error: "not found" }, 404);
  },

  /* Every 15 minutes: pull the channel calendars, and settle holds that Stripe
     has decided on. A hold that expired without payment simply stops counting;
     one that was paid but whose webhook never arrived is caught here, which is
     what makes "charged but not booked" impossible. */
  async scheduled(event, env, ctx) {
    for (const key of Object.keys(STAYS)) await refreshChannel(env, key);

    const now = Date.now();
    for (const key of Object.keys(STAYS)) {
      const list = await env.BOOKINGS.list({ prefix: `book:${key}:` });
      for (const k of list.keys) {
        const b = await env.BOOKINGS.get(k.name, "json");
        if (!b || b.status !== "held" || b.expires > now) continue;
        let paid = false;
        try {
          const r = await fetch(
            `https://api.stripe.com/v1/checkout/sessions?limit=1&client_reference_id=${b.id}`,
            { headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } });
          const d = await r.json();
          paid = d.data?.[0]?.payment_status === "paid";
        } catch { continue; }                 // unreachable Stripe: leave it held, try next tick
        b.status = paid ? "paid" : "cancelled";
        await env.BOOKINGS.put(k.name, JSON.stringify(b), { expirationTtl: 60 * 60 * 24 * 400 });
      }
    }
  },
};
