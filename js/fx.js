/* BLACKSITE fx: next-dossier countdown (8h boundaries, UTC). */
(function () {
  function pad(n) { return String(n).padStart(2, '0'); }
  var GENESIS = 1795564800 * 1000;
  function tick() {
    var now = Date.now();
    var period = 8 * 3600 * 1000;
    var next = Math.ceil(now / period) * period;
    if (now < GENESIS) next = GENESIS;
    var s = Math.max(0, Math.floor((next - now) / 1000));
    var t = pad(Math.floor(s / 3600)) + ':' + pad(Math.floor((s % 3600) / 60)) + ':' + pad(s % 60);
    var c = document.getElementById('clock');
    if (c) c.textContent = t;
    var c2 = document.getElementById('clock2');
    if (c2 && !window.__boardOwnsClock) c2.textContent = t;
  }
  tick(); setInterval(tick, 1000);
})();

/* BLACKSITE fx2: intro, reveal, progress, tick, tilt, scanline. */
(function () {
  var RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var bar = document.createElement('div'); bar.id = 'pbar'; document.body.appendChild(bar);
  var ticking = false;
  function upd() {
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    var y = h.scrollTop || document.body.scrollTop;
    bar.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
    ticking = false;
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(upd); } }, { passive: true });
  upd();
  var targets = document.querySelectorAll('.shead, .step, .panel, .spec-grid > *, .doc h2, .facts .wrap > *, .swap-panel, .note-box, .missing');
  targets.forEach(function (el, i) { el.classList.add('rv'); el.style.transitionDelay = ((i % 4) * 55) + 'ms'; });
  if (RM || !('IntersectionObserver' in window)) { targets.forEach(function (el) { el.classList.add('in'); }); }
  else {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { threshold: 0.08, rootMargin: '0px 0px -4% 0px' });
    targets.forEach(function (el) { io.observe(el); });
  }
  ['clock', 'clock2'].forEach(function (id) {
    var el = document.getElementById(id); if (!el || RM) return;
    var last = el.textContent;
    setInterval(function () {
      if (el.textContent !== last) { last = el.textContent; el.classList.remove('tick-pop'); void el.offsetWidth; el.classList.add('tick-pop'); }
    }, 250);
  });
  var hero = document.querySelector('.hero');
  if (hero && !RM) { var sc = document.createElement('div'); sc.className = 'scanline'; hero.appendChild(sc); }
  var card = document.querySelector('.dossier');
  if (card && !RM && window.matchMedia('(pointer: fine)').matches && window.innerWidth > 900) {
    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect();
      var dx = (e.clientX - r.left) / r.width - 0.5, dy = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = 'perspective(1100px) rotate(1.2deg) rotateX(' + (-dy * 5).toFixed(2) + 'deg) rotateY(' + (dx * 5).toFixed(2) + 'deg)';
    });
    card.addEventListener('pointerleave', function () { card.style.transform = ''; });
  }
  if (!RM && document.getElementById('wallgrid') && !sessionStorage.getItem('bsIntro')) {
    sessionStorage.setItem('bsIntro', '1');
    var ov = document.createElement('div'); ov.id = 'intro';
    ov.innerHTML = '<img class="imark" src="img/logo-mark.png" alt="">' +
      '<div class="iword">BLACK<span>SITE</span></div>' +
      '<div class="istamp">EYES ONLY</div>' +
      '<div class="iline">DOSSIER Nº 001 · OPENS 00:00 UTC</div>' +
      '<div class="ibar"><i></i></div>';
    document.body.appendChild(ov);
    document.body.style.overflow = 'hidden';
    setTimeout(function () { ov.classList.add('away'); document.body.style.overflow = ''; }, 1200);
    setTimeout(function () { ov.remove(); }, 1900);
  }
})();
