/* Llifior Lodges - lodge detail page: calendar, live price, booking request. */
(function () {
  'use strict';
  var LL = window.LL;
  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var state = { checkIn: null, checkOut: null, monthOffset: 0 };
  var data, lodge, blocked, today, maxDate;

  function $(id) { return document.getElementById(id); }

  function isFreeNight(key) { return !blocked.has(key); }
  function changeoverOK(d) {
    var days = lodge.changeoverDays || [];
    return days.length === 0 || days.indexOf(d.getDay()) !== -1;
  }
  function minNights() { return lodge.minNights || data.config.defaultMinNights || 1; }

  /* Can this day start a stay? Free night, in the window, allowed changeover day, and a min-stay fits. */
  function canCheckIn(d) {
    if (d <= today || d > maxDate) return false;
    if (!changeoverOK(d)) return false;
    for (var i = 0; i < minNights(); i++) if (!isFreeNight(LL.iso(LL.addDays(d, i)))) return false;
    return true;
  }
  /* Can this day end the currently selected stay? Every night between must be free. */
  function canCheckOut(d) {
    if (!state.checkIn) return false;
    var start = LL.parse(state.checkIn);
    if (d <= start || d > LL.addDays(maxDate, 1)) return false;
    var n = Math.round((d - start) / 86400000);
    if (n < minNights()) return false;
    if (!changeoverOK(d)) return false;
    for (var i = 0; i < n; i++) if (!isFreeNight(LL.iso(LL.addDays(start, i)))) return false;
    return true;
  }

  function renderMonth(y, m) {
    var first = new Date(y, m, 1), startDow = (first.getDay() + 6) % 7; // Monday-first
    var daysIn = new Date(y, m + 1, 0).getDate();
    var html = '<div class="cal"><h4>' + first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) + '</h4><table><thead><tr>';
    ['M', 'T', 'W', 'T', 'F', 'S', 'S'].forEach(function (h) { html += '<th>' + h + '</th>'; });
    html += '</tr></thead><tbody><tr>';
    for (var i = 0; i < startDow; i++) html += '<td></td>';
    for (var day = 1; day <= daysIn; day++) {
      var d = new Date(y, m, day), key = LL.iso(d), cls = [], enabled;
      var picking = state.checkIn && !state.checkOut ? 'out' : 'in';
      if (picking === 'out') enabled = canCheckOut(d) || key === state.checkIn;
      else enabled = canCheckIn(d);
      if (d <= today) cls.push('past');
      else if (isFreeNight(key) && !changeoverOK(d)) cls.push('nochange');
      if (key === state.checkIn || key === state.checkOut) cls.push('sel');
      else if (state.checkIn && state.checkOut && key > state.checkIn && key < state.checkOut) cls.push('inrange');
      var label = LL.pretty(key) + (enabled ? '' : (blocked.has(key) ? ' - booked' : ' - unavailable'));
      html += '<td><button type="button" data-d="' + key + '" class="' + cls.join(' ') + '"' + (enabled ? '' : ' disabled') + ' aria-label="' + label + '">' + day + '</button></td>';
      if ((startDow + day) % 7 === 0 && day !== daysIn) html += '</tr><tr>';
    }
    html += '</tr></tbody></table></div>';
    return html;
  }

  function renderCalendar() {
    var base = new Date(today.getFullYear(), today.getMonth() + state.monthOffset, 1);
    $('cal-months').innerHTML = renderMonth(base.getFullYear(), base.getMonth()) + renderMonth(base.getFullYear(), base.getMonth() + 1);
    $('cal-prev').disabled = state.monthOffset <= 0;
    $('cal-next').disabled = new Date(base.getFullYear(), base.getMonth() + 1, 1) >= maxDate;
    var hint = $('cal-hint');
    if (!state.checkIn) hint.textContent = 'Select your arrival date.';
    else if (!state.checkOut) hint.textContent = 'Now select your departure date (min. ' + minNights() + ' nights). Tap arrival again to undo.';
    else hint.textContent = 'Dates selected. Click another date to start again.';
  }

  function onDayClick(e) {
    var b = e.target.closest('button[data-d]');
    if (!b || b.disabled) return;
    var key = b.getAttribute('data-d'), d = LL.parse(key);
    if (state.checkIn && !state.checkOut && key === state.checkIn) state.checkIn = null; // click arrival again to undo
    else if (state.checkIn && !state.checkOut && canCheckOut(d)) state.checkOut = key;
    else { state.checkIn = key; state.checkOut = null; }
    update();
  }

  function update() {
    renderCalendar();
    var pets = Number($('f-pets').value || 0);
    var box = $('quote'), btn = $('to-details');
    $('f-checkin').value = state.checkIn || '';
    $('f-checkout').value = state.checkOut || '';
    if (!(state.checkIn && state.checkOut)) {
      box.innerHTML = '<p class="msg info">From ' + LL.money(lodge.nightlyRate) + ' per night. ' + LL.ph(lodge.priceNote) + '</p>';
      btn.disabled = true; return;
    }
    var q = LL.quote(lodge, state.checkIn, state.checkOut, pets);
    state.quote = q;
    var dep = data.config.depositPercent ? Math.round(q.total * data.config.depositPercent) / 100 : 0;
    box.innerHTML = '<table>' +
      '<tr><td>' + LL.pretty(state.checkIn) + ' &rarr; ' + LL.pretty(state.checkOut) + '</td><td></td></tr>' +
      '<tr><td>' + q.nights + ' nights' + (q.nights ? ' &times; ' + LL.money(Math.round(q.avgNightly * 100) / 100) + (lodge.seasons && lodge.seasons.length ? ' avg' : '') : '') + '</td><td>' + LL.money(q.accommodation) + '</td></tr>' +
      '<tr><td>Cleaning fee</td><td>' + LL.money(q.cleaning) + '</td></tr>' +
      (pets ? '<tr><td>Pets (' + pets + ' &times; ' + LL.money(lodge.petFee) + ')</td><td>' + LL.money(q.pets) + '</td></tr>' : '') +
      '<tr class="total"><td>Total</td><td>' + LL.money(q.total) + '</td></tr>' +
      (dep ? '<tr><td colspan="2" style="text-align:left;color:var(--muted);font-size:.9rem">Deposit to secure (' + data.config.depositPercent + '%): ' + LL.money(dep) + ', due once we confirm availability.</td></tr>' : '') +
      '</table>';
    btn.disabled = false;
  }

  function renderGallery() {
    var imgs = lodge.images || [], main = $('l-photo'), grid = $('l-gallery');
    if (!imgs.length) { main.textContent = '[Add ' + lodge.name + ' photos]'; return; }
    var cur = 0;
    function src(i, thumb) { return 'images/' + lodge.id + '/' + (thumb ? 'thumbs/' : '') + imgs[i]; }
    function show(i) {
      cur = (i + imgs.length) % imgs.length;
      main.innerHTML = '<img src="' + src(cur) + '" alt="' + LL.esc(lodge.name) + ' photo ' + (cur + 1) + ' of ' + imgs.length + '">' +
        '<button type="button" class="gal-nav prev" aria-label="Previous photo">&#8249;</button><button type="button" class="gal-nav next" aria-label="Next photo">&#8250;</button>' +
        '<span class="gal-count">' + (cur + 1) + ' / ' + imgs.length + '</span>';
      grid.querySelectorAll('button').forEach(function (b, j) { b.classList.toggle('on', j === cur); });
    }
    main.classList.add('has-img');
    grid.innerHTML = imgs.map(function (f, i) { return '<button type="button" data-i="' + i + '"><img loading="lazy" src="' + src(i, true) + '" alt="' + LL.esc(lodge.name) + ' thumbnail ' + (i + 1) + '"></button>'; }).join('');
    grid.addEventListener('click', function (e) { var b = e.target.closest('button[data-i]'); if (b) show(Number(b.dataset.i)); });
    main.addEventListener('click', function (e) {
      if (e.target.closest('.prev')) show(cur - 1); else if (e.target.closest('.next')) show(cur + 1);
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') show(cur - 1); if (e.key === 'ArrowRight') show(cur + 1); });
    show(0);
  }

  function showStep(n) {
    $('step-dates').classList.toggle('hidden', n !== 1);
    $('step-details').classList.toggle('hidden', n !== 2);
    document.querySelectorAll('.steps span').forEach(function (s, i) { s.classList.toggle('on', i === n - 1); });
  }

  function buildPayload(form) {
    var fd = new FormData(form), p = {};
    fd.forEach(function (v, k) { p[k] = v; });
    var q = LL.quote(lodge, state.checkIn, state.checkOut, Number(p.pets || 0));
    p.reference = LL.makeRef();
    p.lodge = lodge.name;
    p.lodge_id = lodge.id;
    p.check_in = state.checkIn;
    p.check_out = state.checkOut;
    p.nights = q.nights;
    p.price_accommodation = q.accommodation;
    p.price_cleaning = q.cleaning;
    p.price_pets = q.pets;
    p.price_total = q.total;
    p.submitted_at = new Date().toISOString();
    delete p['bot-field'];
    return p;
  }

  function summaryText(p) {
    return [
      'Booking request ' + p.reference,
      'Lodge: ' + p.lodge,
      'Dates: ' + LL.pretty(p.check_in) + ' to ' + LL.pretty(p.check_out) + ' (' + p.nights + ' nights)',
      'Guests: ' + p.guests + ', pets: ' + p.pets,
      'Quoted total: ' + LL.money(p.price_total) + ' (accommodation ' + LL.money(p.price_accommodation) + ', cleaning ' + LL.money(p.price_cleaning) + ', pets ' + LL.money(p.price_pets) + ')',
      'Name: ' + p.name, 'Email: ' + p.email, 'Phone: ' + p.phone,
      'Message: ' + (p.message || '-')
    ].join('\n');
  }

  function encodeForm(obj) {
    return Object.keys(obj).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(obj[k]); }).join('&');
  }

  /* Pluggable delivery: 1) Formspree-style endpoint, 2) Netlify Forms, 3) mailto fallback. */
  function send(p) {
    var cfg = data.config;
    if (cfg.bookingEndpoint) {
      return fetch(cfg.bookingEndpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(Object.assign({ _subject: 'Booking request ' + p.reference + ' - ' + p.lodge, _replyto: p.email }, p))
      }).then(function (r) { if (!r.ok) throw new Error('Endpoint returned ' + r.status); return 'endpoint'; });
    }
    if (cfg.useNetlifyForms && location.protocol !== 'file:') {
      return fetch('/', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: encodeForm(Object.assign({ 'form-name': 'booking' }, p))
      }).then(function (r) { if (!r.ok) throw new Error('Netlify Forms returned ' + r.status); return 'netlify'; });
    }
    return Promise.reject(new Error('No endpoint configured'));
  }

  function mailtoHref(p) {
    var to = data.config.contactEmail && data.config.contactEmail.indexOf('[') !== 0 ? data.config.contactEmail : '';
    return 'mailto:' + to + '?subject=' + encodeURIComponent('Booking request ' + p.reference + ' - ' + p.lodge) + '&body=' + encodeURIComponent(summaryText(p));
  }

  function onSubmit(e) {
    e.preventDefault();
    var form = e.target, f = form.elements, err = $('form-error');
    err.classList.add('hidden');
    if (f['bot-field'] && f['bot-field'].value) return; // honeypot
    var guests = Number(f['guests'].value), pets = Number(f['pets'].value);
    var problems = [];
    if (!state.checkIn || !state.checkOut) problems.push('Please choose your dates.');
    if (!f['name'].value.trim()) problems.push('Please enter your name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f['email'].value)) problems.push('Please enter a valid email address.');
    if (!f['phone'].value.trim()) problems.push('Please enter a phone number.');
    if (!(guests >= 1 && guests <= lodge.sleeps)) problems.push(lodge.name + ' sleeps up to ' + lodge.sleeps + '.');
    if (pets > (lodge.pets || 0)) problems.push('Up to ' + (lodge.pets || 0) + ' pets are allowed.');
    if (!f['terms'].checked) problems.push('Please accept the booking terms.');
    if (problems.length) { err.innerHTML = problems.map(LL.esc).join('<br>'); err.classList.remove('hidden'); return; }

    var p = buildPayload(form), btn = $('submit-btn');
    btn.disabled = true; btn.textContent = 'Sending…';
    send(p).then(function (via) {
      p.delivery = via;
    }).catch(function (ex) {
      console.warn('Falling back to email:', ex.message);
      p.delivery = 'mailto';
      p.mailto = mailtoHref(p);
    }).then(function () {
      sessionStorage.setItem('ll-booking', JSON.stringify(p));
      location.href = 'confirmation.html';
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var id = new URLSearchParams(location.search).get('id');
    LL.loadAll().then(function (d) {
      data = d;
      LL.fillConfig(d.config);
      lodge = d.lodges.filter(function (l) { return l.id === id; })[0] || d.lodges[0];
      blocked = LL.blockedSet(d.availability[lodge.id]);
      var now = new Date(); today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      maxDate = new Date(today.getFullYear(), today.getMonth() + (d.config.bookingWindowMonths || 18), today.getDate());
      document.title = lodge.name + ' | Llifior Lodges';
      $('l-name').textContent = lodge.name;
      $('l-english').textContent = lodge.english;
      $('l-tagline').textContent = lodge.tagline;
      renderGallery();
      $('l-meta').innerHTML = '<span>Sleeps ' + lodge.sleeps + '</span><span>' + lodge.bedrooms + ' bedrooms</span><span>' + lodge.bathrooms + ' bathrooms</span><span>' + (lodge.pets ? 'Up to ' + lodge.pets + ' dogs' : 'No pets') + '</span><span>Check-in ' + d.config.checkInTime + ' / out ' + d.config.checkOutTime + '</span>';
      $('l-summary').textContent = lodge.summary;
      $('l-features').innerHTML = lodge.features.map(function (f) { return '<li>' + LL.esc(f) + '</li>'; }).join('');
      var rules = 'Minimum stay ' + minNights() + ' nights.';
      if (lodge.changeoverDays && lodge.changeoverDays.length) rules += ' Arrivals and departures on ' + lodge.changeoverDays.map(function (x) { return DOW[x]; }).join(' or ') + ' only.';
      $('l-rules').textContent = rules;
      var gs = $('f-guests'); gs.innerHTML = '';
      for (var i = 1; i <= lodge.sleeps; i++) gs.innerHTML += '<option' + (i === Math.min(2, lodge.sleeps) ? ' selected' : '') + '>' + i + '</option>';
      var ps = $('f-pets'); ps.innerHTML = '';
      for (var j = 0; j <= (lodge.pets || 0); j++) ps.innerHTML += '<option value="' + j + '">' + j + '</option>';
      $('cal-months').addEventListener('click', onDayClick);
      $('cal-prev').addEventListener('click', function () { state.monthOffset--; renderCalendar(); });
      $('cal-next').addEventListener('click', function () { state.monthOffset++; renderCalendar(); });
      $('f-pets').addEventListener('change', update);
      $('to-details').addEventListener('click', function () { showStep(2); $('details-summary').innerHTML = $('quote').innerHTML; window.scrollTo({ top: $('booking').offsetTop - 80, behavior: 'smooth' }); });
      $('back-dates').addEventListener('click', function () { showStep(1); });
      $('booking-form').addEventListener('submit', onSubmit);
      update();
    }).catch(function (e) {
      $('booking').innerHTML = '<p class="msg err">Sorry, the booking calendar could not load. Please contact us directly. (' + LL.esc(e.message) + ')</p>';
    });
  });
})();
