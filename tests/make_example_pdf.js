#!/usr/bin/env node
/**
 * Erzeugt ein Beispiel-PDF (Beispielbericht) für den User zur visuellen Prüfung.
 */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const HTML = path.resolve(__dirname, '../src/Sun_Tracker_V03.html');
const server = http.createServer((req, res) => { res.writeHead(200, {'Content-Type':'text/html'}); res.end(fs.readFileSync(HTML)); });
const CHROMIUM_1223 = '/home/claw_01_rasbpi5_1/.cache/ms-playwright/chromium-1223/chrome-linux/chrome';

(async () => {
  await new Promise(r => server.listen(0, r));
  const url = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch({ executablePath: CHROMIUM_1223, headless: true, args:['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'load' });
    await page.click('#calcBtn');
    await page.waitForSelector('#resultSection.visible', { timeout: 30000 });
    // Libraries injizieren
    await page.addScriptTag({ path: '/tmp/pdf_libs/html2canvas.min.js' });
    await page.addScriptTag({ path: '/tmp/pdf_libs/jspdf.umd.min.js' });
    // Download fangen
    const dlPromise = page.waitForEvent('download', { timeout: 30000 });
    await page.evaluate(async () => { await handlePdfExport(); });
    const dl = await dlPromise;
    const out = path.resolve(__dirname, '../assets/Beispielbericht_Hamburg.pdf');
    await dl.saveAs(out);
    // warten auf vollständigen write
    let size = 0;
    for (let i = 0; i < 50; i++) { try { size = fs.statSync(out).size; if (size > 0) break; } catch(e){} await new Promise(r=>setTimeout(r,200)); }
    console.log('Beispiel-PDF erstellt:', out, '(' + (size/1024).toFixed(0) + ' KB)');
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exit(1); });