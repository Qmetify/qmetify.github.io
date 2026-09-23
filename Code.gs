/**
 * Qmetify: válaszgyűjtő végpont Google Táblázathoz
 * Qmetify: response collector for Google Sheets
 *
 * Telepítés / Setup:
 * 1. Hozz létre egy új Google Táblázatot. / Create a new Google Sheet.
 * 2. Bővítmények > Apps Script. Töröld a mintakódot, és másold be ezt a fájlt.
 *    Extensions > Apps Script. Replace the sample code with this file.
 * 3. Telepítés > Új telepítés > Típus: Webalkalmazás.
 *    Végrehajtás: Én. Hozzáférés: Bárki.
 *    Deploy > New deployment > Web app. Execute as: Me. Who has access: Anyone.
 * 4. A kapott /exec végű URL-t másold a tervező "Beküldési cím" mezőjébe.
 *    Paste the resulting /exec URL into the designer's "Submission address" field.
 *
 * Kódfrissítésnél: Telepítések kezelése > ceruza > Új verzió (a cím nem változik).
 * When updating the code: Manage deployments > pencil > New version (same URL).
 *
 * Felmérésenként három lap készül (a felmérés azonosítójával a nevükben):
 * Each study gets three sheets (named after the study ID):
 *   <id> · Q-sorts     sorok = állítások, oszlopok = válaszadók, utolsó oszlop: az állítás szövege
 *                      rows = statements, columns = participants, last column: statement text
 *   <id> · Comments    a szélső állítások indoklásai, soronként egy / extreme-statement comments
 *   <id> · Background  válaszadónként egy sor: idők és utólagos kérdések / one row per participant
 * A "_raw" lapra minden válasz teljes nyers JSON-ja is bekerül. / Full raw JSON goes to "_raw".
 */

var RAW_SHEET = '_raw';
var MAX_TEXT = 5000;

function doGet(e) {
  return json_({ ok: true, app: 'qmetify', time: new Date().toISOString() });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return json_({ ok: false, error: 'busy' });
  }
  try {
    var p = JSON.parse(e.postData.contents);
    if (!p || !p.surveyId || !p.participantId || !p.sort) {
      return json_({ ok: false, error: 'invalid payload' });
    }
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var now = new Date();

    var raw = sheet_(ss, RAW_SHEET);
    if (raw.getLastRow() === 0) {
      raw.appendRow(['received', 'survey_id', 'participant_id', 'json']);
      raw.setFrozenRows(1);
    }
    raw.appendRow([now, safe_(p.surveyId), safe_(p.participantId), safe_(JSON.stringify(p))]);

    var base = sheetName_(p.surveyId);
    var code = writeQsorts_(ss, base, p);
    writeComments_(ss, base, p, code, now);
    writeBackground_(ss, base, p, code, now);
    return json_({ ok: true, participant: code });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/** Q-sort mátrix: sorok = állítások, oszlopok = válaszadók, a szöveg az utolsó oszlopban. */
function writeQsorts_(ss, base, p) {
  var sh = sheet_(ss, base + ' · Q-sorts');
  var ids = (p.statementIds || Object.keys(p.sort)).map(String);
  var texts = p.statementTexts || {};

  if (sh.getLastRow() === 0) {
    var init = [['statement_id', 'statement_text']];
    ids.forEach(function (id) { init.push([id, safe_(texts[id] || '')]); });
    sh.getRange(1, 1, init.length, 2).setValues(init);
    sh.setFrozenRows(1);
    sh.setFrozenColumns(1);
  }

  var lastCol = sh.getLastColumn();
  var header = sh.getRange(1, 1, 1, lastCol).getValues()[0];
  var textCol = header.indexOf('statement_text') + 1;
  if (textCol < 1) {
    textCol = lastCol + 1;
    sh.getRange(1, textCol).setValue('statement_text');
  }

  // állítássorok: hiányzók hozzáadása, üres szövegek kitöltése
  var rowIds = sh.getRange(1, 1, sh.getLastRow(), 1).getValues().map(function (r) { return String(r[0]); });
  ids.forEach(function (id) {
    if (rowIds.indexOf(id) < 0) {
      rowIds.push(id);
      sh.getRange(rowIds.length, 1).setValue(id);
    }
  });
  var textVals = sh.getRange(1, textCol, rowIds.length, 1).getValues();
  var changed = false;
  for (var i = 1; i < rowIds.length; i++) {
    if (!textVals[i][0] && texts[rowIds[i]]) { textVals[i][0] = safe_(texts[rowIds[i]]); changed = true; }
  }
  if (changed) sh.getRange(1, textCol, rowIds.length, 1).setValues(textVals);

  // új válaszadó oszlopa a szövegoszlop elé
  var n = textCol - 2;
  var code = 'P' + ('00' + (n + 1)).slice(-3) + '_' + String(p.participantId).replace(/[^A-Za-z0-9]/g, '').slice(0, 6);
  sh.insertColumnBefore(textCol);
  var col = rowIds.map(function (id, r) {
    if (r === 0) return [code];
    return [p.sort.hasOwnProperty(id) ? num_(p.sort[id]) : ''];
  });
  sh.getRange(1, textCol, col.length, 1).setValues(col);
  return code;
}

/** Indoklások: egy sor egy komment. */
function writeComments_(ss, base, p, code, now) {
  var sh = sheet_(ss, base + ' · Comments');
  if (sh.getLastRow() === 0) {
    sh.appendRow(['participant', 'received', 'statement_id', 'score', 'statement_text', 'comment']);
    sh.setFrozenRows(1);
  }
  var c = p.comments || {}, texts = p.statementTexts || {};
  Object.keys(c).forEach(function (id) {
    sh.appendRow([code, now, safe_(id), num_(p.sort[id]), safe_(texts[id] || ''), safe_(c[id])]);
  });
}

/** Háttéradatok: válaszadónként egy sor. */
function writeBackground_(ss, base, p, code, now) {
  var sh = sheet_(ss, base + ' · Background');
  var d = p.durations || {};
  var row = {
    participant: code,
    received: now,
    participant_id: safe_(p.participantId),
    lang: safe_(p.lang || ''),
    config_version: safe_(p.configVersion || ''),
    started_at: safe_(p.startedAt || ''),
    submitted_at: safe_(p.submittedAt || ''),
    presort_sec: num_(d.presortSec),
    sort_sec: num_(d.sortSec),
    total_min: d.totalSec ? Math.round(d.totalSec / 6) / 10 : '',
    moves: num_(p.moves)
  };
  var ans = p.answers || {};
  Object.keys(ans).forEach(function (k) {
    var v = ans[k];
    row['q_' + k] = safe_(Array.isArray(v) ? v.join('; ') : v);
  });
  appendByHeader_(sh, row);
}

function sheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function appendByHeader_(sh, row) {
  var lastCol = sh.getLastColumn();
  var header = lastCol ? sh.getRange(1, 1, 1, lastCol).getValues()[0] : [];
  var missing = Object.keys(row).filter(function (k) { return header.indexOf(k) < 0; });
  if (missing.length) {
    header = header.concat(missing);
    sh.getRange(1, 1, 1, header.length).setValues([header]);
    sh.setFrozenRows(1);
  }
  sh.appendRow(header.map(function (k) { return row.hasOwnProperty(k) ? row[k] : ''; }));
}

function sheetName_(id) {
  return String(id).replace(/[^\w\-]/g, '_').slice(0, 80) || 'survey';
}

/** Képletbefecskendezés elleni védelem / guard against formula injection */
function safe_(v) {
  if (v === null || v === undefined) return '';
  var s = String(v).slice(0, MAX_TEXT);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function num_(v) {
  if (v === null || v === undefined || v === '') return '';
  var n = Number(v);
  return isFinite(n) ? n : '';
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
