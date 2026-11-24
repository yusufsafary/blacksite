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
