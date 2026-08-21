/**
 * SwissRail landing page → Google Sheets
 * ─────────────────────────────────────────────────────────────
 * SETUP (5 minutes)
 *
 * 1. Create a Google Sheet. Name the first tab whatever you like.
 * 2. Extensions ▸ Apps Script. Delete the sample code and paste this file.
 * 3. Deploy ▸ New deployment ▸ type "Web app"
 *      Execute as:        Me
 *      Who has access:    Anyone            ← must be "Anyone", not "Anyone with Google account"
 * 4. Copy the /exec URL it gives you.
 * 5. Paste that URL into CONFIG.SHEET_ENDPOINT in assets/js/main.js.
 *
 * Re-deploy (Deploy ▸ Manage deployments ▸ edit ▸ New version) after any edit
 * to this file, otherwise the old version keeps serving.
 * ───────────────────────────────────────────────────────────── */

/** Tab that receives the rows. Created automatically if missing. */
var SHEET_NAME = 'Leads';

/** Set to an email address to get notified on every submission, or '' for none. */
var NOTIFY_EMAIL = '';

/** Column order. Keys must match the field names posted by main.js. */
var FIELDS = [
  'timestamp',
  'fullName',
  'email',
  'phone',
  'country',
  'product',
  'fromStation',
  'toStation',
  'travelDate',
  'returnDate',
  'adults',
  'children',
  'travelClass',
  'message',
  'consent',
  'pageUrl',
  'referrer',
  'userAgent'
];

/** Human-readable header row. */
var HEADERS = [
  'Received at',
  'Full name',
  'Email',
  'Phone',
  'Country',
  'Interested in',
  'From',
  'To',
  'Travel date',
  'Return date',
  'Adults',
  'Children',
  'Class',
  'Message',
  'Consent',
  'Page URL',
  'Referrer',
  'User agent'
];

/* ───────────────────────────────────────────────────────────── */

function doPost(e) {
  // One writer at a time, so concurrent submissions can't collide.
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return json({ result: 'error', message: 'Server busy, please retry.' });
  }

  try {
    var params = (e && e.parameter) ? e.parameter : {};

    // Support a raw JSON body too, in case you post from elsewhere.
    if (e && e.postData && e.postData.type === 'application/json') {
      try {
        params = JSON.parse(e.postData.contents);
      } catch (parseErr) { /* keep form params */ }
    }

    var sheet = getSheet_();

    var row = FIELDS.map(function (key) {
      if (key === 'timestamp') {
        return params.timestamp ? new Date(params.timestamp) : new Date();
      }
      return params[key] != null ? String(params[key]) : '';
    });

    sheet.appendRow(row);

    if (NOTIFY_EMAIL) notify_(params);

    return json({ result: 'success', row: sheet.getLastRow() });
  } catch (err) {
    return json({ result: 'error', message: String(err && err.message || err) });
  } finally {
    lock.releaseLock();
  }
}

/** Lets you sanity-check the deployment by opening the /exec URL in a browser. */
function doGet() {
  return json({ result: 'success', message: 'SwissRail endpoint is live.' });
}

/* ── helpers ─────────────────────────────────────────────── */

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  // Write the header row once, then freeze and style it.
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length)
      .setFontWeight('bold')
      .setBackground('#0c1b2a')
      .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, HEADERS.length);
  }

  return sheet;
}

function notify_(p) {
  var subject = 'New SwissRail enquiry — ' + (p.product || 'general');
  var lines = FIELDS.map(function (key, i) {
    return HEADERS[i] + ': ' + (p[key] || '—');
  });
  MailApp.sendEmail({
    to: NOTIFY_EMAIL,
    subject: subject,
    body: lines.join('\n'),
    replyTo: p.email || undefined
  });
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
