#!/usr/bin/env node
/** Screenshots Runde 4: Polar (SE), Sonnenuntergang (c12 Kurve + Matrix). */
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
    await page.waitForTimeout(400);
    for (const [id, file] of [['c5','diagramm_polar_se'],['c12','diagramm_sonnenuntergang']]) {
      const box = page.locator(`.chart-box[data-chart="${id}"]`);
      await box.scrollIntoViewIfNeeded();
      await page.waitForTimeout(150);
      await box.screenshot({ path: path.resolve(__dirname, `../assets/${file}.png`) });
    }
    console.log('Screenshots erstellt: Polar-SE, Sonnenuntergang');
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exit(1); });