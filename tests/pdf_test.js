#!/usr/bin/env node
/**
 * PDF-Berichtstest: verifiziert die NEUE Berichtslogik.
 * 1. computeReportValues() liefert korrekte Zahlenwerte
 * 2. Chart-Boxen tragen data-chart und sind eindeutig (jede Chart = eigenes Canvas)
 * 3. (Optional, internetabhängig) echter PDF-Download
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

    // 1. computeReportValues liefert Zahlen
    const v = await page.evaluate(() => computeReportValues());
    check('Jahresmax (≈60°)', v.maxHoehe > 55 && v.maxHoehe < 65);
    check('Höhe 21.06. (≈60°)', v.soHoehe > 55 && v.soHoehe < 65);
    check('Tageslänge 21.06. (~16.8h)', v.tlSommer > 15 && v.tlSommer < 18);
    check('Tageslänge 21.12. (~7.2h)', v.tlWinter > 6 && v.tlWinter < 8.5);
    check('Sonnenaufgang 21.06. gesetzt', v.srSommer != null);
    check('Sonnenmittag gesetzt', v.soNoon != null && v.soNoon > 12 && v.soNoon < 14);

    // 2. Chart-Zuordnung: Jede aktive Chart-Box hat eigenes Canvas mit data-chart
    const chartMap = await page.evaluate(() => {
      const boxes = [...document.querySelectorAll('.chart-box')];
      return boxes.map(b => ({ id: b.dataset.chart, hasCanvas: !!b.querySelector('canvas') }));
    });
    const active = chartMap.filter(b => b.id); // data-chart nur bei aktiven
    check(`Aktive Charts haben data-chart (${active.length})`, active.length >= 10);
    // Keine doppelten IDs → jede Chart ein eigenes Canvas (der ursprüngliche Bug!)
    const ids = active.map(b => b.id);
    const uniqueIds = new Set(ids);
    check('Keine doppelten Chart-Canvas (Bug-Fix)', uniqueIds.size === ids.length);

    // 3. Libraries injizieren (lokal, um CDN-Sandbox im Test zu umgehen)
    await page.addScriptTag({ path: '/tmp/pdf_libs/html2canvas.min.js' });
    await page.addScriptTag({ path: '/tmp/pdf_libs/jspdf.umd.min.js' });
    const libsOk = await page.evaluate(() => typeof html2canvas !== 'undefined' && typeof jspdf !== 'undefined');
    check('html2canvas + jspdf geladen', libsOk);

    // 3b. Matrix-nur-Charts (c11/c12) lassen sich per html2canvas rendern → landen im PDF
    if (libsOk) {
      const matrixOk = await page.evaluate(async () => {
        const box = document.querySelector('.chart-box[data-chart="c11"] .dlm-wrap');
        if (!box) return { found: false, pixels: 0 };
        const img = await html2canvas(box, { backgroundColor: null, width: box.scrollWidth, height: box.scrollHeight });
        const d = img.getContext('2d').getImageData(0, 0, img.width, img.height).data;
        let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
        return { found: true, pixels: n };
      });
      check(`c11-Matrix im PDF renderbar (${matrixOk.found ? matrixOk.pixels + 'px' : 'fehlt'})`, matrixOk.found && matrixOk.pixels > 500);
    }

    // 4. Vollständiger PDF-Export mit den NEUEN Berichtslogik
    if (libsOk) {
      const downloadPromise = page.waitForEvent('download', { timeout: 30000 }).catch(() => null);
      await page.evaluate(async () => { await handlePdfExport(); });
      const dl = await downloadPromise;
      if (dl) {
        const fname = dl.suggestedFilename();
        check(`PDF heruntergeladen: ${fname}`, fname && fname.endsWith('.pdf'));
        const p = '/tmp/' + fname;
        await dl.saveAs(p);
        // Auf vollständigen Schreibvorgang warten
        let size = 0;
        for (let i = 0; i < 50; i++) {
          try { size = fs.statSync(p).size; if (size > 0) break; } catch (e) {}
          await new Promise(r => setTimeout(r, 200));
        }
        check(`PDF-Größe > 10KB (${(size/1024).toFixed(0)}KB)`, size > 10000);
        // Prüfe PDF-Magic-Byte
        const fd = fs.openSync(p, 'r');
        const buf = Buffer.alloc(4); fs.readSync(fd, buf, 0, 4, 0); fs.closeSync(fd);
        check('PDF-Magic-Byte "%PDF"', buf.toString('ascii') === '%PDF');
        fs.unlinkSync(p);
      } else {
        check('PDF exportiert', false);
      }
    }

    console.log(`\n=== PDF-Test: ${pass} bestanden, ${fail} fehlgeschlagen ===`);
  } finally { await browser.close(); server.close(); }
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('FATAL:', e); server.close(); process.exit(1); });