/* BLACKSITE board: live Dossier Wall + dossier card from BNB Chain.
   Reads race across CONFIG.rpcs; a failed read keeps last rendered state. */
var CONFIG = {
  chainId: 56,
  rpcs: ['https://bsc-dataseed.binance.org', 'https://bsc.publicnode.com', 'https://bsc-dataseed1.defibit.io'],
  token: '0x3A4B20aA9B202385cfaEb29D2d33Fc9A48C9d2a2',
  fragments: '0x369548923912D42f990A879E813547556A792d93',
  vault: '0x49c88506EFdE3886A3657d8363346F10900f8AdF',
  genesis: 1795564800,
  fragmentsPerDossier: 60,
  threshold: 54
};
var SEL = {
  currentDossier: '0x54021928',
  fragmentsInDossier: '0x4dacf9b0',
  keystoneOf: '0xefb3169a',
  registrarOf: '0xd360eefe',
  registeredInDossier: '0xea56a500',
  declassified: '0x17bdeff9'
};

(function () {
  'use strict';
  window.__boardOwnsClock = true;
  function $(id) { return document.getElementById(id); }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function encUint(n) { return n.toString(16).padStart(64, '0'); }
  function toUint(hex) { return parseInt(hex, 16); }

  function rpcOnce(url, payload) {
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json(); });
  }
  function rpc(payload) {
    var chain = Promise.reject();
    CONFIG.rpcs.forEach(function (u) {
      chain = chain.catch(function () {
        return rpcOnce(u, payload).then(function (j) {
          if (j && (j.result !== undefined || Array.isArray(j))) return j;
          throw new Error('bad rpc');
        });
      });
    });
    return chain;
  }
  function call(to, data) {
    return rpc({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to: to, data: data }, 'latest'] })
      .then(function (j) { return j.result; });
  }
  function batch(calls) {
    var payload = calls.map(function (c, i) {
      return { jsonrpc: '2.0', id: i + 1, method: 'eth_call', params: [{ to: c.to, data: c.data }, 'latest'] };
    });
    return rpc(payload).then(function (arr) {
      var out = {};
      (Array.isArray(arr) ? arr : [arr]).forEach(function (j) { out[j.id] = j.result; });
      return calls.map(function (c, i) { return out[i + 1]; });
    });
  }

  function renderWall(recovered, keystone) {
    var wall = $('wallgrid'); if (!wall) return;
    wall.innerHTML = '';
    var missing = [];
    for (var n = 1; n <= CONFIG.fragmentsPerDossier; n++) {
      var c = document.createElement('div');
      if (keystone && n === keystone) { c.className = 'cell key'; c.innerHTML = n + '<small>KEY</small>'; }
      else if (recovered && recovered[n]) { c.className = 'cell'; c.textContent = n; }
      else { c.className = 'cell miss'; c.textContent = n; missing.push(n); }
      wall.appendChild(c);
    }
    var nums = $('missnums');
    if (nums) nums.innerHTML = missing.map(function (n) { return '<b>' + pad2(n) + '</b>'; }).join(' ');
    var lr = $('lg-recovered'), lm = $('lg-missing'), lk = $('lg-keystone');
    if (lr) lr.textContent = Object.keys(recovered || {}).length;
    if (lm) lm.textContent = missing.length;
    if (lk) lk.textContent = keystone ? ('Nº ' + keystone + ' · PAYS 5X') : 'HIDDEN UNTIL SEAL';
  }

  function setText(id, txt) { var el = $(id); if (el) el.textContent = txt; }
  var state = { dossier: 0, end: 0 };

  function tickClock() {
    var target = state.dossier >= 1 ? state.end : CONFIG.genesis;
    var s = Math.max(0, Math.floor(target - Date.now() / 1000));
    var t = pad2(Math.floor(s / 3600)) + ':' + pad2(Math.floor((s % 3600) / 60)) + ':' + pad2(s % 60);
    var c2 = $('clock2'); if (c2) c2.textContent = t;
  }

  function preLaunch(keystone) {
    state.dossier = 0;
    renderWall({}, keystone || null);
    setText('doss-title', 'DOSSIER Nº 001');
    setText('doss-status', 'OPENS 25 NOV · 00:00 UTC');
    setText('doss-recovered', '0 / ' + CONFIG.fragmentsPerDossier);
    setText('doss-stamp', 'SEALED');
    setText('miss-title', '· Nº 001 · AT LAUNCH');
    setText('mint-status', 'MINT OPENS 25 NOV · 00:00 UTC');
    setText('claim-status', 'CLAIM OPENS AT DECLASSIFICATION');
    var l1 = $('doss-line1');
    if (l1 && keystone) l1.innerHTML = 'Subject was last seen holding <span class="red">fragment ' + keystone + '</span>.';
    var p = $('doss-progress'); if (p) p.style.width = '0%';
    tickClock();
  }

  function refresh() {
    call(CONFIG.fragments, SEL.currentDossier).then(function (hex) {
      var d = toUint(hex);
      if (!d || d < 1) {
        return call(CONFIG.fragments, SEL.keystoneOf + encUint(1)).then(function (k) { preLaunch(toUint(k)); });
      }
      state.dossier = d;
      state.end = CONFIG.genesis + d * 28800;
      var base = (d - 1) * CONFIG.fragmentsPerDossier;
      var calls = [];
      for (var n = 1; n <= CONFIG.fragmentsPerDossier; n++) {
        calls.push({ to: CONFIG.vault, data: SEL.registrarOf + encUint(base + n) });
      }
      return Promise.all([
        batch(calls.slice(0, 20)), batch(calls.slice(20, 40)), batch(calls.slice(40, 60)),
        call(CONFIG.vault, SEL.registeredInDossier + encUint(d)),
        call(CONFIG.fragments, SEL.keystoneOf + encUint(d)),
        call(CONFIG.vault, SEL.declassified + encUint(d))
      ]).then(function (res) {
        var regs = res[0].concat(res[1], res[2]);
        var recovered = {};
        regs.forEach(function (h, i) { if (h && parseInt(h, 16) !== 0) recovered[i + 1] = true; });
        var regCount = toUint(res[3]);
        var keystone = toUint(res[4]);
        var declass = toUint(res[5]) === 1;
        renderWall(recovered, keystone);
        setText('doss-title', 'DOSSIER Nº ' + String(d).padStart(3, '0'));
        setText('doss-status', declass ? 'DECLASSIFIED · CLAIM OPEN' : 'WINDOW OPEN · RECOVERING');
        setText('doss-recovered', regCount + ' / ' + CONFIG.fragmentsPerDossier);
        setText('doss-stamp', declass ? 'DECLASSIFIED' : 'RECOVERING');
        setText('miss-title', '· Nº ' + String(d).padStart(3, '0') + ' · LIVE');
        setText('mint-status', 'MINT OPEN · DOSSIER Nº ' + String(d).padStart(3, '0') + ' · FIRST FREE WITH AGENT ID');
        setText('claim-status', declass ? 'CLAIM OPEN · CLOSES AT WINDOW END' : 'CLAIM OPENS AT 54 REGISTERED · NOW ' + regCount);
        var l1 = $('doss-line1');
        if (l1) l1.innerHTML = 'Subject was last seen holding <span class="red">fragment ' + keystone + '</span>.';
        var p = $('doss-progress'); if (p) p.style.width = Math.round(regCount / CONFIG.fragmentsPerDossier * 100) + '%';
        tickClock();
      });
    }).catch(function () { /* keep last rendered state */ });
  }

  try { preLaunch(null); } catch (e) {}
  try { refresh(); } catch (e) {}
  setInterval(function () { try { refresh(); } catch (e) {} }, 30000);
  setInterval(tickClock, 1000);
})();
