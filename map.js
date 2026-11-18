/* The map on each flat's page. Leaflet with OpenStreetMap tiles, no Google embed.
 * It starts only when the map scrolls near the screen, so the page does not
 * load map tiles for a guest who never gets that far. A circle, not a pin:
 * the exact door is sent after booking. */
(function () {
  'use strict';
  var el = document.getElementById('map');
  if (!el || !window.L) return;
  var started = false;
  function start() {
    if (started) return;
    started = true;
    var at = [parseFloat(el.dataset.lat), parseFloat(el.dataset.lng)];
    var map = L.map(el, { scrollWheelZoom: false, dragging: !L.Browser.mobile, tap: false, zoomControl: true })
      .setView(at, 15);
    /* Carto's free tiles now want a key; OpenStreetMap's own tiles do not. */
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
    L.circle(at, { radius: 220, color: '#0a6ba8', weight: 2, fillColor: '#0a6ba8', fillOpacity: 0.16 }).addTo(map);
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (e) {
      if (e[0].isIntersecting) { start(); io.disconnect(); }
    }, { rootMargin: '300px 0px' });
    io.observe(el);
  } else {
    start();
  }
})();
