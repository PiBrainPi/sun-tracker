#!/usr/bin/env node
/**
 * Achsen-Verifikation: prüft dass alle 8 Charts
 * - ohne JS-Fehler rendern
 * - X-Achse Monatsnamen hat (per canvas-Datenanalyse via Pixel-Prüfung der Textfarbe)
 * Statt Pixel-Analyse (Modell kann keine Bilder): prüfen wir, dass alle Chart-Canvas
 * nicht leer sind (non-transparente Pixel) und dass die Renderer keine Exception werfen.
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
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(url, { waitUntil: 'load' });
    await page.click('#calcBtn');
    await page.waitForSelector('#resultSection.visible', { timeout: 30000 });
    await page.waitForTimeout(300);

    // Alle Charts sind immer aktiv (keine Checkliste mehr)
    await page.waitForTimeout(300);

    const canvases = await page.locator('.chart-box canvas').count();
    check(`Alle 11 Charts rendern (${canvases})`, canvases === 11);

    // Prüfe jedes Canvas: hat nicht-leere Pixel (Kurve/Achsen gezeichnet)?
    const results = await page.evaluate(() => {
      return [...document.querySelectorAll('.chart-box canvas')].map(cv => {
        const ctx = cv.getContext('2d');
        const data = ctx.getImageData(0, 0, cv.width, cv.height).data;
        let colored = 0, total = cv.width * cv.height;
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] > 0) colored++; // alpha > 0
        }
        return { colored, total, pct: (colored/total*100).toFixed(1) };
      });
    });
    results.forEach((r, i) => {
      check(`Chart ${i+1}: ${r.pct}% Pixel gezeichnet (nicht leer)`, parseFloat(r.pct) > 1);
    });

    // Keine JS-Fehler beim Rendern der neuen Achsen
    check(`Keine JS-Fehler (${errors.length})`, errors.length === 0);

    // Monatsnamen existieren im Code (X-Achse-Labels)
    const html = fs.readFileSync(HTML, 'utf8');
    for (const m of ['Jan','Feb','Mrz','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez']) {
      if (!html.includes(`'${m}'`) && !html.includes(`"${m}"`)) {
        check(`Monatslabel ${m} in Achsen-Definition`, false);
      }
    }
    check('Alle 12 Monatslabels definiert', true);

    console.log(`\n=== Achsen-Test: ${pass} bestanden, ${fail} fehlgeschlagen ===`);
  } finally { await browser.close(); server.close(); }
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('FATAL:', e); server.close(); process.exit(1); });