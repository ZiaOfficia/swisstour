# SwissRail — landing page

A responsive, animated landing page for Swiss rail tickets, passes and scenic
routes, modelled on the structure and offering of swissrailways.com. Enquiries
from the booking form are written to a Google Sheet.

```
swisscharge/
├── index.html
├── google-apps-script.gs      ← paste into Apps Script, deploy, get URL
├── assets/
│   ├── css/styles.css
│   ├── js/main.js             ← CONFIG.SHEET_ENDPOINT goes here
│   └── img/                   ← 14 photos, all bundled locally
└── README.md
```

## Run it

No build step, no dependencies. Open `index.html` in a browser, or serve it:

```bash
python -m http.server 8000
```

## Connect the Google Sheet

1. Create a Google Sheet.
2. **Extensions ▸ Apps Script**, delete the sample code, paste all of
   `google-apps-script.gs`.
3. **Deploy ▸ New deployment ▸ Web app**
   - Execute as: **Me**
   - Who has access: **Anyone** ← must be *Anyone*, not *Anyone with a Google account*
4. Copy the `/exec` URL.
5. Open `assets/js/main.js` and paste it into the first setting:

```js
const CONFIG = {
  SHEET_ENDPOINT: "https://script.google.com/macros/s/AKfycb.../exec",
  FALLBACK_EMAIL: "hello@example.com"
};
```

That's the only change needed. The script creates a `Leads` tab with a styled,
frozen header row on the first submission.

To check the deployment is live, open the `/exec` URL directly — it should
return `{"result":"success","message":"SwissRail endpoint is live."}`.

Until the endpoint is set, the form validates normally and then tells you it
isn't connected yet, so nothing fails silently.

### Columns written

`Received at · Full name · Email · Phone · Country · Interested in · From · To ·
Travel date · Return date · Adults · Children · Class · Message · Consent ·
Page URL · Referrer · User agent`

To add a field: add the input to `index.html`, add its `name` to the `payload`
object in `main.js`, then add the same key to `FIELDS` and a label to `HEADERS`
in the Apps Script. Order in those two arrays defines column order.

### Email alerts (optional)

In `google-apps-script.gs`, set `NOTIFY_EMAIL` to your address. Every
submission then sends you a summary with the enquirer's address as reply-to.

## What's on the page

Utility bar · sticky header with scrollspy · hero with trip planner · animated
stat strip · three travel passes · three scenic routes · six mountain railways ·
six reasons to book · three-step explainer · reviews · booking form · FAQ
accordion · CTA band · footer · sticky mobile CTA.

## Features worth knowing about

- **Trip planner → form.** The hero widget doesn't submit on its own — it
  prefills the booking form (product, stations, date, party size), scrolls to
  it, pulses it, and focuses the first field. Every "Select pass" / "Book"
  button on a card does the same thing. One funnel, one submission.
- **Dark mode.** Toggle in the utility bar; defaults to the OS setting and
  remembers the choice in `localStorage`.
- **Validation** runs on submit, focuses and scrolls to the first bad field,
  then clears each error live as it's fixed. Return date can't precede
  departure; past dates are blocked.
- **Spam honeypot** — a hidden `company` field. If filled, the submit is
  silently dropped.
- **Motion** is driven by `IntersectionObserver` and fully disabled under
  `prefers-reduced-motion`.
- **Accessibility** — skip link, focus-visible rings, ARIA on the nav, tabs and
  form status region, labels on every control.

## Before you go live

- Replace the brand name, logo, phone, email and social links.
- Prices and copy are drawn from public listings and are **illustrative**;
  confirm them against your own inventory.
- The page describes the operator as an "authorised ticket partner". Only keep
  that claim if it's true for your business — don't present the site as SBB,
  Switzerland Tourism, or an official subsidiary unless you are one.
- Reviews and stats in the trust strip are placeholders. Swap in real ones.
- Point `#privacy`, `#terms` and `#legal` at real pages.
- Photo attribution is required — see `assets/img/CREDITS.md`.
