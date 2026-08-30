#!/usr/bin/env node
/** Screenshots Runde 6: Heatmap (grau <0°), c13 (mit Extrema), c11/c12 als reine Matrizen. */
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
    const page = await browser.newPage({ viewport: { width: 1300, height: 900 } });
    await page.goto(url, { waitUntil: 'load' });
    await page.click('#calcBtn');
    await page.waitForSelector('#resultSection.visible', { timeout: 30000 });
    await page.waitForTimeout(500);
    for (const [id, file] of [['c8','diagramm_heatmap_grau'],['c13','diagramm_kombiniert_extrema'],['c12','diagramm_untergangs_matrix']]) {
      const box = page.locator(`.chart-box[data-chart="${id}"]`);
      await box.scrollIntoViewIfNeeded();
      await page.waitForTimeout(150);
      await box.screenshot({ path: path.resolve(__dirname, `../assets/${file}.png`) });
    }
    console.log('Screenshots Runde 6 erstellt');
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exit(1); });