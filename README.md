# SwissRail — landing page

A responsive, animated landing page for Swiss rail tickets, passes and scenic
routes, modelled on the structure and offering of swissrailways.com. Enquiries
from the booking form are written to a Google Sheet.

```
swisscharge/
├── index.html
├── Code.gs                    ← paste into Apps Script, deploy, get URL
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
   `Code.gs`.
3. **Deploy ▸ New deployment ▸ Web app**
   - Execute as: **Me**
   - Who has access: **Anyone** ← must be *Anyone*, not *Anyone with a Google account*
4. Authorise when prompted (*Advanced ▸ Go to project ▸ Allow*). The Gmail
   scope is what lets it send the notification email.
5. Copy the `/exec` URL.
6. Open `assets/js/main.js` and paste it into the first setting:

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

To check the whole path end to end, run `testSubmission` from the Apps Script
editor: it writes one dummy row and sends one notification email, so you can
verify both halves before wiring up the site. Delete the test row afterwards.

Until the endpoint is set, the form validates normally and then tells you it
isn't connected yet, so nothing fails silently.

### Columns written

`Received at · Name · Email · Phone · Interested in · Travel date · Duration ·
Adults · Children · Class · Message · Consent ·
Page URL · Referrer · User agent`

To add a field: add the input to `index.html`, add its `name` to the `payload`
object in `main.js`, then add the same key to `FIELDS` and a label to `HEADERS`
in `Code.gs`. Order in those two arrays defines column order — keep `FIELDS` in
step with the payload, or the columns drift out of line with their labels.

Re-deploy after **any** edit to `Code.gs` (*Deploy ▸ Manage deployments ▸ edit ▸
Version: New version*), otherwise the old code keeps serving.

### Email alerts

`NOTIFY_EMAIL` in `Code.gs` receives every submission as an HTML summary, with
the enquirer's address set as reply-to. Comma-separate the value for several
recipients, or set it to `''` to turn notifications off. Set `SEND_AUTOREPLY` to
`true` to also send the enquirer a confirmation.

Mail is sent inside its own try/catch, so a delivery failure never loses a row
that has already been written. Note the ~100 emails/day `MailApp` quota on a
consumer Gmail account.

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
  then clears each error live as it's fixed.
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
