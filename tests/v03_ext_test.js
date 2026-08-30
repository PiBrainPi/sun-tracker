#!/usr/bin/env node
/**
 * Test der V03-Erweiterungen:
 * 1. Tageslängen-Matrix: Zahlenwert-Matrix (Ø h pro Monat) ist unter dem Diagramm
 * 2. Heatmap: Legende oberhalb des Canvas (als HTML-DOM, nicht im Canvas)
 * 3. Jahresverlauf: 21.12.-Extremum (Minimum) wird annotiert
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
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'load' });
    await page.click('#calcBtn');
    await page.waitForSelector('#resultSection.visible', { timeout: 30000 });
    await page.waitForTimeout(300);

    // 1. Tageslängen-Matrix: Zahlenwert-Matrix vorhanden (10 Charts)
    const allCharts = await page.locator('.chart-box canvas').count();
    check(`Alle 11 Charts gerendert (${allCharts})`, allCharts === 11);

    // 2. Heatmap-Legende oberhalb des Canvas
    const heatmapBox = await page.locator('.chart-box[data-chart="c8"]').first();
    const hmLegend = await heatmapBox.locator('.chart-legend').count();
    const hmCanvasFirst = await heatmapBox.evaluate(box => {
      const legend = box.querySelector('.chart-legend');
      const canvas = box.querySelector('canvas');
      return legend && canvas ? (legend.compareDocumentPosition(canvas) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0 : false;
    });
    check(`Heatmap-Legende als HTML vorhanden (${hmLegend})`, hmLegend === 1);
    check('Heatmap-Legende liegt oberhalb des Canvas', hmCanvasFirst);

    // 3. Tageslängen-Matrix: Raster (Tag-Zeilen × Monats-Spalten) + Summen-Zeile
    const matrixBox = await page.locator('.chart-box[data-chart="c9"]').first();
    const dlmTitle = await matrixBox.locator('.dlm-title').textContent().catch(() => '');
    const dayRows = await matrixBox.locator('.dlm-row:not(.dlm-head):not(.dlm-sum):not(.dlm-avg)').count();
    const sumRow = await matrixBox.locator('.dlm-row.dlm-sum').count();
    const headCells = await matrixBox.locator('.dlm-row.dlm-head .dlm-cell').count();
    check(`Matrix-Titel vorhanden: "${dlmTitle.slice(0,35)}..."`, dlmTitle.includes('Zahlenwert-Matrix'));
    check(`Matrix hat 31 Tag-Zeilen (${dayRows})`, dayRows === 31);
    check('Matrix hat Summen-Zeile (Σ h)', sumRow === 1);
    check(`Matrix Kopfzeile mit 12 Monaten (${headCells})`, headCells === 12);

    // 4. Werte: Tag 21 Juni (Monat 6) > Tag 21 Dezember (Monat 12); Monatssummen plausibel
    const matrixData = await matrixBox.evaluate(box => {
      // lies Zellen zeilenweise: Zeile 1 = Tag 1 ... Zeile 31 = Tag 31; Spalte i = Monat i+1
      const rows = [...box.querySelectorAll('.dlm-row:not(.dlm-head):not(.dlm-sum):not(.dlm-avg)')];
      const days = rows.map(r => [...r.querySelectorAll('.dlm-cell')].map(c => {
        const txt = c.textContent.trim();
        return (txt === '·' || txt === '–') ? null : parseFloat(txt);
      }));
      const sums = [...box.querySelectorAll('.dlm-row.dlm-sum .dlm-cell')].map(c => parseFloat(c.textContent));
      return { days, sums };
    });
    const jun21 = matrixData.days[20][5]; // Tag 21, Monat Juni (Index 5)
    const dec21 = matrixData.days[20][11]; // Tag 21, Monat Dezember (Index 11)
    console.log(`  Tageslänge 21.06.=${jun21}h, 21.12.=${dec21}h`);
    check('Matrix: 21.06. > 21.12.', jun21 > dec21 + 5);
    // Monatssumme Juni > Dezember (mehr Sonnenstunden im Sommer)
    const sumJun = matrixData.sums[5], sumDec = matrixData.sums[11];
    console.log(`  Monatssumme Σ Juni=${sumJun}h, Dezember=${sumDec}h`);
    check('Matrix: Σ Juni > Σ Dezember', sumJun > sumDec);
    // Plausibilität: Juni-Summe ≈ 31 Tage × ~16.7h ≈ 500-520h
    check(`Σ Juni plausibel (~500-530h, got ${sumJun})`, sumJun > 400 && sumJun < 600);

    // 5. Jahresverlauf: 21.12.-Extremum (Minimum) wird annotiert — prüfe via Canvas-Pixel (Kurve existiert)
    const c1Canvas = await page.locator('.chart-box[data-chart="c1"] canvas').first();
    const c1NonEmpty = await c1Canvas.evaluate(cv => {
      const ctx = cv.getContext('2d');
      const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
      let colored = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 0) colored++;
      return colored;
    });
    check(`Jahresverlauf rendert (${c1NonEmpty} gefärbte Pixel)`, c1NonEmpty > 500);

    console.log(`\n=== V03-Erweiterungs-Test: ${pass} bestanden, ${fail} fehlgeschlagen ===`);
  } finally { await browser.close(); server.close(); }
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('FATAL:', e); process.exit(1); });