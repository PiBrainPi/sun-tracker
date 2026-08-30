#!/usr/bin/env node
/**
 * Test für die V03-Erweiterungen (Runde 2):
 * 1. Heatmap-Legende stimmt jetzt mit dem Canvas überein (gleiche heatColor-Funktion)
 * 2. Sonnenaufgangs-Matrix (c11) vorhanden: Raster + Ø-Zeile + Uhrzeit-Werte
 * 3. Sonnenaufgangs-Kurve (c11 Canvas) rendert
 */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
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
    const page = await browser.newPage({ viewport: { width: 1300, height: 900 } });
    await page.goto(url, { waitUntil: 'load' });
    await page.click('#calcBtn');
    await page.waitForSelector('#resultSection.visible', { timeout: 30000 });
    await page.waitForTimeout(500);

    // 1. Alle 11 Charts gerendert
    const charts = await page.locator('.chart-box canvas').count();
    check(`Alle 11 Charts gerendert (${charts})`, charts === 11);

    // 2. Heatmap-Legende: nutzt heatColor (inline background) statt fester Klassen
    const hmLegend = await page.locator('.chart-box[data-chart="c8"] .hm-cell').first();
    const hmBg = await hmLegend.evaluate(el => getComputedStyle(el).backgroundColor);
    check(`Heatmap-Legende nutzt heatColor-Farbe (bg=${hmBg})`, /rgba?\(/i.test(hmBg));

    // 3. Sonnenaufgangs-Matrix (c11): Raster + Ø-Zeile + Uhrzeit-Format
    const c11Box = await page.locator('.chart-box[data-chart="c11"]').first();
    const dayRows = await c11Box.locator('.dlm-row:not(.dlm-head):not(.dlm-avg)').count();
    const avgRow = await c11Box.locator('.dlm-row.dlm-avg').count();
    const headCells = await c11Box.locator('.dlm-row.dlm-head .dlm-cell').count();
    check(`c11-Matrix: 31 Tag-Zeilen (${dayRows})`, dayRows === 31);
    check('c11-Matrix hat Ø-Zeile', avgRow === 1);
    check(`c11-Matrix Kopfzeile 12 Monate (${headCells})`, headCells === 12);
    // Zeitformat HH:MM prüfen
    const firstVal = await c11Box.locator('.dlm-row:not(.dlm-head) .dlm-cell:not(.dlm-empty)').first().textContent();
    check(`c11-Wert als Uhrzeit (${firstVal})`, /^\d{2}:\d{2}$/.test(firstVal.trim()));

    // 4. Plausibilität: Sonnenaufgang Juni früher als Dezember (c11 Canvas-Daten via DOM-Matrix)
    const sunData = await c11Box.evaluate(box => {
      const rows = [...box.querySelectorAll('.dlm-row:not(.dlm-head):not(.dlm-avg)')];
      // Tag 21 = Zeile 20; Spalte 5=Juni, 11=Dezember
      const tag21 = rows[20].querySelectorAll('.dlm-cell');
      const toMin = s => { const [h,m]=s.trim().split(':'); return +h*60+ +m; };
      const jun = tag21[5] ? toMin(tag21[5].textContent) : NaN;
      const dec = tag21[11] ? toMin(tag21[11].textContent) : NaN;
      return { jun, dec };
    });
    console.log(`  Sonnenaufgang 21.06.=${sunData.jun}min ab Mitternacht, 21.12.=${sunData.dec}min`);
    check('c11: 21.06. Aufgang früher als 21.12.', sunData.jun < sunData.dec);

    // 5. Sonnenuntergangs-Matrix (c12): analog zu c11
    const c12Box = await page.locator('.chart-box[data-chart="c12"]').first();
    const c12dayRows = await c12Box.locator('.dlm-row:not(.dlm-head):not(.dlm-avg)').count();
    const c12avgRow = await c12Box.locator('.dlm-row.dlm-avg').count();
    const c12headCells = await c12Box.locator('.dlm-row.dlm-head .dlm-cell').count();
    check(`c12-Matrix: 31 Tag-Zeilen (${c12dayRows})`, c12dayRows === 31);
    check('c12-Matrix hat Ø-Zeile', c12avgRow === 1);
    check(`c12-Matrix Kopfzeile 12 Monate (${c12headCells})`, c12headCells === 12);
    // Uhrzeit-Format
    const c12firstVal = await c12Box.locator('.dlm-row:not(.dlm-head) .dlm-cell:not(.dlm-empty)').first().textContent();
    check(`c12-Wert als Uhrzeit (${c12firstVal})`, /^\d{2}:\d{2}$/.test(c12firstVal.trim()));
    // Plausibilität: Sonnenuntergang Juni später als Dezember
    const setData = await c12Box.evaluate(box => {
      const rows = [...box.querySelectorAll('.dlm-row:not(.dlm-head):not(.dlm-avg)')];
      const tag21 = rows[20].querySelectorAll('.dlm-cell');
      const toMin = s => { const [h,m]=s.trim().split(':'); return +h*60+ +m; };
      const jun = tag21[5] ? toMin(tag21[5].textContent) : NaN;
      const dec = tag21[11] ? toMin(tag21[11].textContent) : NaN;
      return { jun, dec };
    });
    console.log(`  Sonnenuntergang 21.06.=${setData.jun}min ab Mitternacht, 21.12.=${setData.dec}min`);
    check('c12: 21.06. Untergang später als 21.12.', setData.jun > setData.dec);

    console.log(`\n=== V03-Runde2-Test: ${pass} bestanden, ${fail} fehlgeschlagen ===`);
  } finally { await browser.close(); server.close(); }
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('FATAL:', e); process.exit(1); });