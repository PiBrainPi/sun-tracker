#!/usr/bin/env node
/**
 * Export-Verifikation: prüft txt/csv/json auf vollständige, plausible Daten.
 * Verifiziert auch die täglichen Sonnenzeiten (Sonnenaufgang/-untergang).
 */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const s = require('../src/suncalc.js');

const HTML = path.resolve(__dirname, '../src/Sun_Tracker_V03.html');
const server = http.createServer((req, res) => { res.writeHead(200, {'Content-Type':'text/html'}); res.end(fs.readFileSync(HTML)); });
const CHROMIUM_1223 = '/home/claw_01_rasbpi5_1/.cache/ms-playwright/chromium-1223/chrome-linux/chrome';

(async () => {
  let pass = 0, fail = 0;
  const check = (n, ok) => { ok ? pass++ : fail++; console.log(`${ok ? '✓' : '✗'} ${n}`); };
  await new Promise(r => server.listen(0, r));
  const url = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch({ executablePath: CHROMIUM_1223, headless: true, args:['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'load' });
    await page.click('#calcBtn');
    await page.waitForSelector('#resultSection.visible', { timeout: 30000 });

    // 1. Build-Funktionen direkt aufrufen
    const result = await page.evaluate(() => {
      const txt = buildExport('txt');
      const csv = buildExport('csv');
      const jsonRaw = buildExport('json');
      const json = JSON.parse(jsonRaw);
      return {
        txtLines: txt.split('\n').length,
        csvLines: csv.split('\n').length,
        rows: json.sonnenstaende.length,
        dailyTimes: json.sonnenzeiten.length,
        meta: json.meta,
        sample: json.sonnenstaende.slice(0, 3)
      };
    });

    // Auflösung 15 min → Datenpunkte pro Tag = 24*4=96, pro Jahr = 366*96 ≈ 35136
    const expectedRows = s.getSunData({ lat:53.5481, lng:9.9966, year:2024, resolutionMin:15, refMeridianDEG:15 }).rows.length;
    check(`JSON-Rows = Erwartung (${result.rows})`, result.rows === expectedRows);
    check(`TXT-Zeilen = Rows + Header(~7) (${result.txtLines})`, Math.abs(result.txtLines - (result.rows + 7)) <= 2);
    check(`CSV-Zeilen = Rows + Header (${result.csvLines})`, result.csvLines === result.rows + 1);
    check(`Tägliche Sonnenzeiten (${result.dailyTimes})`, result.dailyTimes === 366); // 2024 Schaltjahr

    // 2. Sonnenzeiten-Plausibilität: Hamburg 21.06. in den dailyTimes
    const june21 = await page.evaluate(() => {
      const j = JSON.parse(buildExport('json'));
      return j.sonnenzeiten.find(x => x.monat === 6 && x.tag === 21);
    });
    check(`21.06. Aufgang gesetzt (${june21 && june21.sonnenaufgang && june21.sonnenaufgang.toFixed(2)})`, june21 && june21.sonnenaufgang != null);
    check(`21.06. Untergang gesetzt (${june21 && june21.sonnenuntergang && june21.sonnenuntergang.toFixed(2)})`, june21 && june21.sonnenuntergang != null);
    if (june21 && june21.sonnenaufgang && june21.sonnenuntergang) {
      const len = june21.sonnenuntergang - june21.sonnenaufgang;
      check(`21.06. Tageslänge 16-17h (${len.toFixed(2)})`, len > 15 && len < 18);
      check(`21.06. Aufgang ~03:58 MEZ`, Math.abs(june21.sonnenaufgang - 3.97) < 0.3);
    }

    // 3. CSV-Sample plausibel
    const sample = await page.evaluate(() => buildExport('csv').split('\n').slice(1, 4).map(l => l.split(';')));
    check('CSV-Sample numerisch', sample.every(row => row.every(v => !isNaN(parseFloat(v)))));

    // 4. Höhen im vernünftigen Bereich für Hamburg (Winter ~ -20 bis Sommer ~60)
    const hRange = await page.evaluate(() => {
      const j = JSON.parse(buildExport('json'));
      let mn = 99, mx = -99;
      for (const r of j.sonnenstaende) { if (r.hoehe < mn) mn = r.hoehe; if (r.hoehe > mx) mx = r.hoehe; }
      return { mn, mx };
    });
    check(`Höhenbereich plausibel (${hRange.mn.toFixed(1)}..${hRange.mx.toFixed(1)})`, hRange.mx > 55 && hRange.mx < 65 && hRange.mn > -65 && hRange.mn < -50);

    console.log(`\n=== Export-Test: ${pass} bestanden, ${fail} fehlgeschlagen ===`);
  } finally { await browser.close(); server.close(); }
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('FATAL:', e); server.close(); process.exit(1); });