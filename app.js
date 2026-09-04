/* Chifstay — the moving parts. No dependencies, no build step.
 *
 * Four small things: the sticky nav shadow, the reveal-on-scroll, the phone
 * menu, and the photo lightbox. Each one is written so the page still works
 * with the script missing or broken: .rv is revealed by a fallback, the menu
 * links are ordinary anchors, and a gallery figure without the lightbox is
 * still a picture on the page.
 */
(function () {
  'use strict';

  var reduce = false;
  try { reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  /* ---------------------------------------------------------------- nav */
  var nav = document.querySelector('.nav');
  if (nav) {
    var onScroll = function () { nav.classList.toggle('stuck', window.scrollY > 8); };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    var toggle = document.querySelector('.nav-toggle');
    var links = document.querySelector('.nav-links');
    if (toggle && links) {
      toggle.addEventListener('click', function () {
        var open = links.classList.toggle('open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      links.addEventListener('click', function (e) {
        if (e.target.tagName === 'A') { links.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }
      });
    }
  }

  /* -------------------------------------------------------------- reveal
     Same mechanism as chifbay.com. The stagger is set here rather than in the
     CSS so a group of any length works without a rule per child. */
  var rv = [].slice.call(document.querySelectorAll('.rv'));
  document.querySelectorAll('.rv-group').forEach(function (g) {
    [].slice.call(g.children).forEach(function (child, i) {
      if (child.classList.contains('rv')) child.style.transitionDelay = (i * 90) + 'ms';
    });
  });

  if (reduce || !('IntersectionObserver' in window)) {
    rv.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    rv.forEach(function (el) { io.observe(el); });

    /* Anything already on screen at load should not wait for a scroll that may
       never come on a short page. */
    addEventListener('load', function () {
      rv.forEach(function (el) {
        if (el.getBoundingClientRect().top < innerHeight) el.classList.add('in');
      });
    });
  }

  /* ------------------------------------------------------------ lightbox
     Built from whatever the page already has: every figure inside .gal or
     [data-lightbox] becomes a slide, in document order. */
  var figs = [].slice.call(document.querySelectorAll('.gal figure, [data-lightbox] figure'));
  if (!figs.length) return;

  var shots = figs.map(function (f) {
    var img = f.querySelector('img');
    return img ? { src: img.getAttribute('data-full') || img.src, alt: img.alt || '' } : null;
  }).filter(Boolean);
  if (!shots.length) return;

  var box = document.createElement('div');
  box.className = 'lb';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', 'Photos');
  box.innerHTML =
    '<button class="lb-close" aria-label="Fermer">&times;</button>' +
    '<button class="lb-prev" aria-label="Photo précédente">&#8249;</button>' +
    /* a 1x1 transparent gif until a slide is opened: an <img> with no src at
       all reads as a broken image to anything auditing the page */
    '<img alt="" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7">' +
    '<button class="lb-next" aria-label="Photo suivante">&#8250;</button>' +
    '<div class="lb-count"></div>';
  document.body.appendChild(box);

  var img = box.querySelector('img');
  var count = box.querySelector('.lb-count');
  var at = 0;
  var lastFocus = null;

  function show(i) {
    at = (i + shots.length) % shots.length;
    img.src = shots[at].src;
    img.alt = shots[at].alt;
    count.textContent = (at + 1) + ' / ' + shots.length;
  }
  function open(i) {
    lastFocus = document.activeElement;
    show(i);
    box.classList.add('on');
    document.body.style.overflow = 'hidden';
    box.querySelector('.lb-close').focus();
  }
  function close() {
    box.classList.remove('on');
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  figs.forEach(function (f, i) {
    f.setAttribute('tabindex', '0');
    f.setAttribute('role', 'button');
    f.addEventListener('click', function () { open(i); });
    f.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i); }
    });
  });

  box.querySelector('.lb-close').addEventListener('click', close);
  box.querySelector('.lb-prev').addEventListener('click', function (e) { e.stopPropagation(); show(at - 1); });
  box.querySelector('.lb-next').addEventListener('click', function (e) { e.stopPropagation(); show(at + 1); });
  box.addEventListener('click', function (e) { if (e.target === box || e.target === img) close(); });
  addEventListener('keydown', function (e) {
    if (!box.classList.contains('on')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(at - 1);
    if (e.key === 'ArrowRight') show(at + 1);
  });
})();
