(function () {
  'use strict';
  var LL = window.LL;
  document.addEventListener('DOMContentLoaded', function () {
    var raw = sessionStorage.getItem('ll-booking'), box = document.getElementById('conf');
    if (!raw) { box.innerHTML = '<p>No booking request found. <a href="lodges.html">Browse the lodges</a>.</p>'; return; }
    var p = JSON.parse(raw);
    LL.loadJSON('data/config.json').then(function (cfg) {
      var sent = p.delivery !== 'mailto';
      var html = '<p>Your booking reference</p><div class="ref">' + LL.esc(p.reference) + '</div>' +
        (sent
          ? '<p class="msg info">Thank you, ' + LL.esc(p.name.split(' ')[0]) + '. Your request has been sent. We will check availability and reply to <strong>' + LL.esc(p.email) + '</strong>, normally within 24 hours. Your booking is confirmed once we reply and the deposit is paid.</p>'
          : '<p class="msg err">Almost done: online sending is not set up yet, so please <strong>send us the pre-filled email</strong> to submit your request.</p><p><a class="btn" href="' + LL.esc(p.mailto) + '">Send booking email</a></p>') +
        '<div class="panel summary"><table>' +
        '<tr><td>Lodge</td><td>' + LL.esc(p.lodge) + '</td></tr>' +
        '<tr><td>Arrive</td><td>' + LL.pretty(p.check_in) + ' (from ' + LL.esc(cfg.checkInTime) + ')</td></tr>' +
        '<tr><td>Depart</td><td>' + LL.pretty(p.check_out) + ' (by ' + LL.esc(cfg.checkOutTime) + ')</td></tr>' +
        '<tr><td>Nights</td><td>' + p.nights + '</td></tr>' +
        '<tr><td>Guests / pets</td><td>' + LL.esc(p.guests) + ' / ' + LL.esc(p.pets) + '</td></tr>' +
        '<tr><td>Accommodation</td><td>' + LL.money(p.price_accommodation) + '</td></tr>' +
        '<tr><td>Cleaning</td><td>' + LL.money(p.price_cleaning) + '</td></tr>' +
        (Number(p.price_pets) ? '<tr><td>Pets</td><td>' + LL.money(p.price_pets) + '</td></tr>' : '') +
        '<tr class="total"><td>Quoted total</td><td>' + LL.money(p.price_total) + '</td></tr></table></div>';
      if (cfg.depositPaymentLink && sent) {
        html += '<p style="margin-top:18px">Once we have confirmed your dates you can pay your deposit securely (card payment handled by Stripe, not this website):</p><p><a class="btn secondary" href="' + LL.esc(cfg.depositPaymentLink) + '" target="_blank" rel="noopener">Pay deposit</a></p>';
      }
      html += '<p style="margin-top:18px"><button class="btn secondary" onclick="window.print()">Print / save</button></p>';
      box.innerHTML = html;
    });
  });
})();
