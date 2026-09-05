/* Booking on chifstays.com. No trip to Airbnb.
 *
 * Two months of calendar, the nights that are gone greyed out, a total that is
 * only ever a quote from the server, and a card form that is Stripe's.
 *
 * What this file is not allowed to do
 * -----------------------------------
 * It never works out a price. It sends dates and gets a figure back, because a
 * total computed here is a total a visitor can edit. The only number it puts on
 * screen comes from /v1/quote, and the amount Stripe charges is worked out
 * again inside the Worker from the same dates.
 *
 * It never guesses availability either. If the API cannot say which nights are
 * taken, the calendar stays locked and says so, rather than showing everything
 * as free. These flats also sell on Airbnb, Vrbo and Booking; a hopeful guess
 * here is two families at one door.
 */
(function () {
  'use strict';

  var API = 'https://chifbay-booking-api.chifandcopt.workers.dev/stays';
  var root = document.getElementById('book');
  if (!root) return;

  var STAY = root.dataset.stay;
  var NIGHTLY = Number(root.dataset.nightly);
  var MIN = Number(root.dataset.min);
  var LEAD = Number(root.dataset.lead);

  var blocked = null;          // Set of YYYY-MM-DD, null until the API answers
  var from = null, to = null;
  var month = new Date();
  month.setDate(1);

  var iso = function (d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };
  var addDays = function (s, n) { var d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return iso(d); };
  var nightsBetween = function (a, b) {
    var out = [], d = a;
    while (d < b) { out.push(d); d = addDays(d, 1); }
    return out;
  };

  var el = function (tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };

  /* ------------------------------------------------------------- rendering */
  function render() {
    root.innerHTML = '';

    if (blocked === null) {
      root.appendChild(el('p', 'bk-wait', 'Loading the calendar…'));
      return;
    }
    if (blocked === false) {
      var w = el('div', 'bk-down');
      w.appendChild(el('p', null, 'The calendar is not reachable right now, so we cannot show what is free.'));
      w.appendChild(el('p', null, 'Rather than guess and risk selling a week that is already taken, booking is closed for a moment. Please try again shortly.'));
      root.appendChild(w);
      return;
    }

    root.appendChild(head());
    root.appendChild(grid());
    root.appendChild(summary());
  }

  function head() {
    var h = el('div', 'bk-head');
    var prev = el('button', 'bk-nav', '‹');
    prev.type = 'button';
    prev.setAttribute('aria-label', 'Previous month');
    var first = new Date(); first.setDate(1);
    prev.disabled = month <= first;
    prev.onclick = function () { month.setMonth(month.getMonth() - 1); render(); };

    var next = el('button', 'bk-nav', '›');
    next.type = 'button';
    next.setAttribute('aria-label', 'Next month');
    next.onclick = function () { month.setMonth(month.getMonth() + 1); render(); };

    h.appendChild(prev);
    h.appendChild(el('strong', null, month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })));
    h.appendChild(next);
    return h;
  }

  function grid() {
    var g = el('div', 'bk-grid');
    ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].forEach(function (d) { g.appendChild(el('span', 'bk-dow', d)); });

    var firstOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
    var lead = (firstOfMonth.getDay() + 6) % 7;                 // Monday-first
    for (var i = 0; i < lead; i++) g.appendChild(el('span', 'bk-pad'));

    var last = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    var earliest = addDays(iso(new Date()), LEAD);

    for (var day = 1; day <= last; day++) {
      var date = iso(new Date(month.getFullYear(), month.getMonth(), day));
      var b = el('button', 'bk-day', String(day));
      b.type = 'button';
      b.dataset.date = date;

      var isBlocked = blocked.has(date);
      var tooSoon = date < earliest;
      if (isBlocked) b.classList.add('is-taken');
      if (tooSoon) b.classList.add('is-past');
      b.disabled = isBlocked || tooSoon;
      if (isBlocked) b.title = 'Already booked';

      if (from && date === from) b.classList.add('is-from');
      if (to && date === to) b.classList.add('is-to');
      if (from && to && date > from && date < to) b.classList.add('is-mid');

      b.onclick = pick;
      g.appendChild(b);
    }
    return g;
  }

  function pick(e) {
    var d = e.currentTarget.dataset.date;
    if (!from || to || d <= from) { from = d; to = null; render(); return; }

    /* A range that steps over a taken night is not a stay, it is two stays.
       Refusing it here is friendlier than letting the server refuse it after
       the guest has typed their name. */
    var clash = nightsBetween(from, d).filter(function (n) { return blocked.has(n); });
    if (clash.length) { from = d; to = null; render(); return; }

    to = d;
    render();
    quote();
  }

  function summary() {
    var s = el('div', 'bk-sum');

    if (!from || !to) {
      s.appendChild(el('p', 'bk-hint', from
        ? 'Now pick the day you leave.'
        : 'Pick the day you arrive. ' + MIN + ' nights minimum.'));
      s.appendChild(el('p', 'bk-rate', '€' + NIGHTLY + ' a night'));
      return s;
    }

    var n = nightsBetween(from, to).length;
    var row = el('div', 'bk-row');
    row.appendChild(el('span', null, fmt(from) + ' → ' + fmt(to)));
    row.appendChild(el('b', null, n + (n > 1 ? ' nights' : ' night')));
    s.appendChild(row);

    if (n < MIN) {
      s.appendChild(el('p', 'bk-err', 'The minimum stay is ' + MIN + ' nights.'));
      return s;
    }

    var total = el('div', 'bk-total');
    total.appendChild(el('span', null, '€' + NIGHTLY + ' × ' + n));
    total.appendChild(el('b', 'bk-amount', '…'));
    s.appendChild(total);

    var name = field(s, 'Your name', 'text', 'bkName');
    var mail = field(s, 'Email', 'email', 'bkMail');

    var go = el('button', 'btn btn-p btn-lg bk-go', 'Book and pay');
    go.type = 'button';
    go.onclick = function () { checkout(name.value, mail.value, go); };
    s.appendChild(go);

    s.appendChild(el('p', 'bk-note', 'Card payment through Stripe. No Airbnb service fee.'));
    return s;
  }

  function field(parent, label, type, id) {
    var l = el('label', 'bk-field');
    l.appendChild(el('span', null, label));
    var i = document.createElement('input');
    i.type = type; i.id = id; i.required = true;
    i.autocomplete = type === 'email' ? 'email' : 'name';
    l.appendChild(i);
    parent.appendChild(l);
    return i;
  }

  var fmt = function (d) {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  /* -------------------------------------------------------------- the API */
  function load() {
    fetch(API + '/v1/availability?stay=' + encodeURIComponent(STAY))
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (d) {
        if (!d.blocked) throw new Error('no calendar');
        blocked = new Set(d.blocked);
        render();
      })
      .catch(function () { blocked = false; render(); });
  }

  function quote() {
    var box = root.querySelector('.bk-amount');
    if (!box) return;
    fetch(API + '/v1/quote?stay=' + encodeURIComponent(STAY) + '&from=' + from + '&to=' + to)
      .then(function (r) { return r.json().then(function (b) { return { ok: r.ok, b: b }; }); })
      .then(function (res) {
        if (!res.ok) { box.textContent = '—'; showError(res.b.error); return; }
        box.textContent = '€' + (res.b.amount / 100).toFixed(0);
      })
      .catch(function () { box.textContent = '—'; });
  }

  function showError(msg) {
    var old = root.querySelector('.bk-err');
    if (old) old.remove();
    var p = el('p', 'bk-err', msg || 'Something went wrong. Please try again.');
    var sum = root.querySelector('.bk-sum');
    if (sum) sum.appendChild(p);
  }

  function checkout(name, mail, button) {
    if (!name || !mail) { showError('Please fill in your name and email.'); return; }
    button.disabled = true;
    button.textContent = 'Taking you to payment…';

    fetch(API + '/v1/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ stay: STAY, from: from, to: to, name: name, email: mail }),
    })
      .then(function (r) { return r.json().then(function (b) { return { ok: r.ok, b: b }; }); })
      .then(function (res) {
        if (res.ok && res.b.url) { location.href = res.b.url; return; }
        button.disabled = false;
        button.textContent = 'Book and pay';
        /* A week that went while the guest was choosing: reload the calendar so
           the greyed nights are current, rather than leaving them staring at a
           refusal they cannot see the reason for. */
        showError(res.b.error);
        if (res.b.taken) { to = null; load(); }
      })
      .catch(function () {
        button.disabled = false;
        button.textContent = 'Book and pay';
        showError('Could not reach the booking service. Please try again.');
      });
  }

  load();
})();
