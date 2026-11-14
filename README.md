# Llifior Lodges: direct-booking website

A plain HTML/CSS/JavaScript site. There is no build step, framework or database. Visitors browse the lodges, pick dates on a live calendar, see the price and send a **booking request**. You confirm the request by email and take the deposit through a payment link. **The site never collects card details.**

## Files

| Path | What it is |
|---|---|
| `index.html` | Home: hero, intro, lodge cards, location |
| `lodges.html` | All lodges |
| `lodge.html?id=<lodge-id>` | Lodge detail with availability calendar, price calculator and booking form |
| `confirmation.html` | Booking reference and summary after a request is sent |
| `location.html`, `faq.html`, `contact.html` | Things to do, FAQ/policies, contact form |
| `data/config.json` | Business settings: email, phone, check-in times, form endpoint, deposit link |
| `data/lodges.json` | Lodges: rates, cleaning fee, pet fee, minimum stay, changeover days, seasonal prices |
| `data/availability.json` | **Booked / closed dates** for each lodge |
| `css/style.css`, `js/*.js` | Styling and logic |

## Preview on your computer

```bash
cd llifior-lodges
python3 -m http.server 8000
# open http://localhost:8000
```
(Double-clicking `index.html` will not load the lodge data, because browsers block JSON loads from `file://`.)

## Everyday editing

### Block dates (bookings from you, Sykes, Original Cottages, owner stays)
Edit `data/availability.json`. List the **nights** that are taken. For a stay from 5 to 8 December, the nights are 5, 6 and 7, so the 8th stays free for the next arrival:
```json
"bwncath": [ {"from": "2026-12-05", "to": "2026-12-07"}, "2026-12-31" ]
```
The example dates in the file are made up. Replace them with your real calendar. **While you also sell on Sykes, keep this file in step with Sykes so you never double-book.** Every direct request is only a *request* until you confirm it, which protects you.

### Change prices
In `data/lodges.json`, each lodge has:
- `nightlyRate` (the standard rate per night), `cleaningFee` (once per stay), `petFee` (per dog, per stay)
- `minNights` (minimum stay), `changeoverDays` (`[1,5]` = Monday/Friday arrivals and departures only; `[]` = any day)
- `seasons` for higher or lower rates over date ranges:
```json
"seasons": [ {"from": "2027-07-17", "to": "2027-08-31", "nightlyRate": 240},
             {"from": "2026-12-20", "to": "2027-01-02", "nightlyRate": 260} ]
```
**The rates in the file are placeholders** worked out from public listing prices (Nov 2026). Set your own direct prices before going live.

### Contact details
In `data/config.json`, set `contactEmail` and `contactPhone`. They then appear across the whole site. Anything still in `[square brackets]` on the site is a placeholder for you to fill in. Search the files for `[` to find them.

### Photos
Put your own photos in `images/`. Then replace the `<div class="photo">[Add … photo]</div>` blocks with `<img src="images/your-photo.jpg" alt="…">`. For lodge cards and the lodge page, edit `lodgeCard` in `js/common.js` and the `l-photo` element in `lodge.html`, or add an `"image"` field to each lodge. Use only photos you own. Do not reuse agency listing photos.

## How booking requests reach you (pick one)

The form tries these in order: **1) `bookingEndpoint` → 2) Netlify Forms → 3) email (mailto) fallback.**

1. **Formspree** (works on any host; free tier available): create a form at formspree.io, then paste its URL into `data/config.json` → `"bookingEndpoint": "https://formspree.io/f/xxxxxxx"`. You receive an email for each request, including the booking reference, dates, guests and quoted price.
2. **Netlify Forms** (if you host on Netlify): leave `bookingEndpoint` empty and keep `"useNetlifyForms": true`. Netlify picks up the `booking` and `contact` forms automatically when you deploy. Turn on email notifications under *Site → Forms → Notifications*.
3. **Fallback**: if neither is set up, the confirmation page shows a **"Send booking email"** button. It opens the guest's email app with a pre-filled request addressed to your `contactEmail`.

The contact page form works on Netlify straight away. On another host, change its `action` to your Formspree URL.

## Deploy for free

**Netlify (easiest):** sign in at app.netlify.com → *Add new site → Deploy manually* → drag the `llifior-lodges` folder onto the page. Then add your own domain under *Domain settings* (e.g. llifiorlodges.co.uk, about £10/year from any registrar).

**GitHub Pages:** create a repository, upload the contents of this folder, then go to *Settings → Pages → Deploy from branch (main, root)*. Netlify Forms will not work on GitHub Pages, so use Formspree (option 1).

## Taking deposits later (Stripe Payment Links)

1. Create a Stripe account → *Payment Links* → create a link (for example "Llifior Lodges deposit" with "customer chooses amount", or a fixed amount per lodge).
2. Paste the link into `data/config.json` → `"depositPaymentLink": "https://buy.stripe.com/…"`.
3. The confirmation page then shows a **Pay deposit** button. A safer routine is to send the link in your confirmation email only **after** you have checked the dates. Card details are entered on Stripe's own secure page, never on this site.

`depositPercent` (default 25) controls the deposit figure shown in the quote.

## Before you go live (checklist)
- [ ] Real nightly/seasonal rates, cleaning and pet fees, minimum stays
- [ ] Real blocked dates (and a routine to keep them in sync with Sykes/agency bookings)
- [ ] Contact email and phone in `config.json`
- [ ] Own photos for each lodge and the hero
- [ ] Deposit, balance, cancellation, damage-deposit and privacy text in `faq.html`
- [ ] Form endpoint set up and tested with a real request
- [ ] Check your agency contract for any exclusivity or minimum-availability terms before you take direct bookings
