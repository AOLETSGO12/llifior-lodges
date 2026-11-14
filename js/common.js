/* Llifior Lodges - shared helpers. No build step, no dependencies. */
(function () {
  'use strict';
  var LL = (window.LL = {});

  LL.loadJSON = function (path) {
    return fetch(path, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('Could not load ' + path + ' (' + r.status + ')');
      return r.json();
    });
  };
  LL.loadAll = function () {
    return Promise.all([
      LL.loadJSON('data/config.json'),
      LL.loadJSON('data/lodges.json'),
      LL.loadJSON('data/availability.json')
    ]).then(function (res) {
      return { config: res[0], lodges: res[1].lodges, availability: res[2] };
    });
  };

  LL.money = function (n) {
    return '£' + Number(n).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };
  LL.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  /* Wrap [square bracket placeholders] so they stand out until the owner fills them in. */
  LL.ph = function (s) {
    return LL.esc(s).replace(/\[([^\]]+)\]/g, '<span class="placeholder">[$1]</span>');
  };

  /* Date helpers - all dates are local calendar days, stored as YYYY-MM-DD. */
  LL.iso = function (d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };
  LL.parse = function (s) {
    var p = s.split('-').map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  };
  LL.addDays = function (d, n) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  };
  LL.nightsBetween = function (a, b) {
    return Math.round((LL.parse(b) - LL.parse(a)) / 86400000);
  };
  LL.pretty = function (s) {
    return LL.parse(s).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  /* Turn availability entries (ranges or single dates) into a Set of blocked NIGHTS. */
  LL.blockedSet = function (entries) {
    var set = new Set();
    (entries || []).forEach(function (e) {
      if (typeof e === 'string') { set.add(e); return; }
      var d = LL.parse(e.from), end = LL.parse(e.to);
      while (d <= end) { set.add(LL.iso(d)); d = LL.addDays(d, 1); }
    });
    return set;
  };

  /* Price for a stay: per-night rate (seasonal if set) + cleaning fee + per-pet fee. */
  LL.quote = function (lodge, checkIn, checkOut, pets) {
    var nights = LL.nightsBetween(checkIn, checkOut);
    var lines = [], accom = 0, d = LL.parse(checkIn);
    for (var i = 0; i < nights; i++) {
      var key = LL.iso(d), rate = lodge.nightlyRate;
      (lodge.seasons || []).forEach(function (s) { if (key >= s.from && key <= s.to) rate = s.nightlyRate; });
      accom += rate; d = LL.addDays(d, 1);
    }
    var cleaning = lodge.cleaningFee || 0;
    var petTotal = (lodge.petFee || 0) * (pets || 0);
    var total = accom + cleaning + petTotal;
    return { nights: nights, accommodation: accom, avgNightly: nights ? accom / nights : 0, cleaning: cleaning, pets: petTotal, total: total };
  };

  LL.makeRef = function () {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = '';
    var arr = new Uint32Array(5);
    (window.crypto || window.msCrypto).getRandomValues(arr);
    for (var i = 0; i < 5; i++) s += chars[arr[i] % chars.length];
    var d = new Date();
    return 'LL-' + String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '-' + s;
  };

  LL.lodgeCard = function (l) {
    return '<article class="card">' +
      (l.cover ? '<a href="lodge.html?id=' + encodeURIComponent(l.id) + '"><img class="card-img" loading="lazy" src="images/' + l.id + '/thumbs/' + l.cover + '" alt="' + LL.esc(l.name) + ' lodge"></a>' : '<div class="photo">[Add ' + LL.esc(l.name) + ' photo]</div>') +
      '<div class="body"><h3>' + LL.esc(l.name) + ' <small style="font-weight:400;color:var(--muted);font-size:.8em">(' + LL.esc(l.english) + ')</small></h3>' +
      '<div class="meta"><span>Sleeps ' + l.sleeps + '</span><span>' + l.bedrooms + ' bed' + (l.bedrooms > 1 ? 's' : '') + '</span><span>' + l.bathrooms + ' bath</span><span>' + (l.pets ? l.pets + ' dogs welcome' : 'No pets') + '</span></div>' +
      '<p style="margin:0">' + LL.esc(l.tagline) + '. Private hot tub.</p>' +
      '<div class="price">From ' + LL.money(l.nightlyRate) + ' <small>/ night</small> <span class="placeholder">[Confirm price]</span></div>' +
      '<div style="margin-top:auto"><a class="btn" href="lodge.html?id=' + encodeURIComponent(l.id) + '">View &amp; book</a></div>' +
      '</div></article>';
  };

  /* Fill [data-cfg="key"] elements with config values (email/phone etc.). */
  LL.fillConfig = function (cfg) {
    document.querySelectorAll('[data-cfg]').forEach(function (el) {
      var v = cfg[el.getAttribute('data-cfg')];
      if (v == null) return;
      el.innerHTML = LL.ph(v);
      if (el.tagName === 'A' && v.indexOf('[') !== 0) {
        el.href = (el.getAttribute('data-cfg') === 'contactEmail' ? 'mailto:' : 'tel:') + v.replace(/\s/g, '');
      }
    });
  };

  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.querySelector('.menu-btn'), nav = document.querySelector('header.site nav');
    if (btn && nav) btn.addEventListener('click', function () {
      var open = nav.classList.toggle('open'); btn.setAttribute('aria-expanded', open);
    });
    var y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear();
    if (location.protocol === 'file:') {
      var warn = document.createElement('div');
      warn.className = 'msg err wrap';
      warn.textContent = 'Preview tip: open this site through a web server (see README: "python3 -m http.server"), not by double-clicking the file, so lodge data can load.';
      document.body.insertBefore(warn, document.body.firstChild.nextSibling);
    }
    if (document.body.hasAttribute('data-autoload')) {
      LL.loadAll().then(function (d) {
        LL.fillConfig(d.config);
        var g = document.getElementById('lodge-grid');
        if (g) g.innerHTML = d.lodges.map(LL.lodgeCard).join('');
      }).catch(function (e) { console.error(e); });
    }
  });
})();
