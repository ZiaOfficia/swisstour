/**
 * SwissRail landing page -> Google Sheet + email notification
 * -------------------------------------------------------------
 * SETUP (5 minutes)
 *
 * 1. Create a Google Sheet (any name).
 * 2. Extensions > Apps Script. Delete the sample code, paste this whole file
 *    into Code.gs, and save.
 * 3. Deploy > New deployment > type "Web app"
 *      Execute as:      Me
 *      Who has access:  Anyone   <- must be "Anyone", NOT "Anyone with Google account"
 * 4. Authorise when prompted (Advanced > Go to project > Allow). The mail
 *    permission is what lets it notify you.
 * 5. Copy the /exec URL and paste it into CONFIG.SHEET_ENDPOINT in
 *    assets/js/main.js.
 *
 * After ANY edit here: Deploy > Manage deployments > pencil icon >
 * Version: New version > Deploy. Otherwise the old code keeps serving.
 * ------------------------------------------------------------- */

/** Tab that receives the rows. Created automatically if missing. */
var SHEET_NAME = 'Leads';

/** Every submission is emailed here. Comma-separate for several recipients. */
var NOTIFY_EMAIL = 'Proviare10@gmail.com';

/** Also send the enquirer a "we got it" confirmation. */
var SEND_AUTOREPLY = false;

/** Name shown as the sender on notification emails. */
var SENDER_NAME = 'SwissRail Website';

/** Column order. Keys must match the payload posted by assets/js/main.js. */
var FIELDS = [
  'timestamp',
  'fullName',
  'email',
  'phone',
  'country',
  'product',
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

/** Human-readable header row, same order as FIELDS. */
var HEADERS = [
  'Received at',
  'Full name',
  'Email',
  'Phone',
  'Country',
  'Interested in',
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

/* ------------------------------------------------------------- */

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
      } catch (parseErr) { /* keep the form params */ }
    }

    // Honeypot: the hidden "company" field is only ever filled by bots.
    if (params.company) {
      return json({ result: 'success', message: 'ok' });
    }

    var sheet = getSheet_();

    var row = FIELDS.map(function (key) {
      if (key === 'timestamp') {
        var t = params.timestamp ? new Date(params.timestamp) : new Date();
        return isNaN(t.getTime()) ? new Date() : t;
      }
      return params[key] != null ? String(params[key]) : '';
    });

    sheet.appendRow(row);
    var rowNumber = sheet.getLastRow();

    // A mail failure must never lose the row that is already saved.
    try {
      if (NOTIFY_EMAIL) notify_(params, rowNumber);
      if (SEND_AUTOREPLY && params.email) autoReply_(params);
    } catch (mailErr) {
      console.error('Mail failed: ' + mailErr);
    }

    return json({ result: 'success', row: rowNumber });
  } catch (err) {
    return json({ result: 'error', message: String((err && err.message) || err) });
  } finally {
    lock.releaseLock();
  }
}

/** Lets you sanity-check the deployment by opening the /exec URL in a browser. */
function doGet() {
  return json({ result: 'success', message: 'SwissRail endpoint is live.' });
}

/**
 * Run this once from the Apps Script editor (Run button) to confirm the sheet
 * is written and the notification email actually arrives.
 */
function testSubmission() {
  var res = doPost({
    parameter: {
      timestamp: new Date().toISOString(),
      fullName: 'Test Traveller',
      email: 'test@example.com',
      phone: '+41 79 000 00 00',
      country: 'Switzerland',
      product: 'Swiss Travel Pass',
      travelDate: '2026-09-15',
      returnDate: '2026-09-22',
      adults: '2',
      children: '1',
      travelClass: 'First',
      message: 'This is a test row - delete it.',
      consent: 'Yes',
      pageUrl: 'https://example.com/',
      referrer: 'direct',
      userAgent: 'Apps Script test'
    }
  });
  console.log(res.getContent());
}

/* -- helpers -------------------------------------------------- */

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);

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

function notify_(p, rowNumber) {
  var subject = 'New SwissRail enquiry - ' + (p.fullName || 'unknown') +
                (p.product ? ' (' + p.product + ')' : '');

  var rows = FIELDS.map(function (key, i) {
    return '<tr>' +
      '<td style="padding:6px 12px;border-bottom:1px solid #e6e9ee;' +
      'font:13px/1.5 Arial,sans-serif;color:#5b6672;white-space:nowrap">' +
      escapeHtml_(HEADERS[i]) + '</td>' +
      '<td style="padding:6px 12px;border-bottom:1px solid #e6e9ee;' +
      'font:13px/1.5 Arial,sans-serif;color:#0c1b2a">' +
      escapeHtml_(p[key] || '-') + '</td></tr>';
  }).join('');

  var html =
    '<div style="background:#f4f6f9;padding:24px">' +
      '<table style="max-width:640px;margin:auto;background:#ffffff;' +
      'border-radius:10px;border-collapse:collapse;width:100%">' +
        '<tr><td style="background:#0c1b2a;color:#ffffff;padding:16px 20px;' +
        'font:600 16px/1.4 Arial,sans-serif">New booking enquiry</td></tr>' +
        '<tr><td style="padding:8px 8px 16px">' +
          '<table style="width:100%;border-collapse:collapse">' + rows + '</table>' +
          '<p style="font:12px/1.5 Arial,sans-serif;color:#8a94a0;padding:12px">' +
          'Saved to the "' + escapeHtml_(SHEET_NAME) + '" sheet, row ' + rowNumber + '.' +
          (p.email ? ' Reply to this email to answer the enquirer directly.' : '') +
          '</p>' +
        '</td></tr>' +
      '</table>' +
    '</div>';

  var plain = FIELDS.map(function (key, i) {
    return HEADERS[i] + ': ' + (p[key] || '-');
  }).join('\n');

  var options = { name: SENDER_NAME, htmlBody: html };
  if (p.email && isEmail_(p.email)) options.replyTo = String(p.email).trim();

  MailApp.sendEmail(NOTIFY_EMAIL, subject, plain, options);
}

function autoReply_(p) {
  if (!isEmail_(p.email)) return;

  var first = String(p.fullName || '').trim().split(' ')[0] || 'there';
  var body =
    'Hi ' + first + ',\n\n' +
    'Thanks for your enquiry - we have it, and a rail specialist will reply ' +
    'within one working day.\n\n' +
    'What you sent us:\n' +
    '  Interested in: ' + (p.product || '-') + '\n' +
    '  Travel date:   ' + (p.travelDate || '-') + '\n' +
    '  Return date:   ' + (p.returnDate || '-') + '\n' +
    '  Travellers:    ' + (p.adults || '-') + ' adult(s), ' +
                          (p.children || '0') + ' child(ren)\n\n' +
    'Kind regards,\nSwissRail';

  MailApp.sendEmail(String(p.email).trim(), 'We received your SwissRail enquiry', body, {
    name: SENDER_NAME,
    replyTo: NOTIFY_EMAIL.split(',')[0].trim()
  });
}

function isEmail_(v) {
  return /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(String(v).trim());
}

function escapeHtml_(v) {
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
