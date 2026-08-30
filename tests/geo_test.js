#!/usr/bin/env node
/**
 * Standort-Bug-Test: prüft den Geolocation-Flow.
 * - HTTP-Server (127.0.0.1, wo Geolocation erlaubt ist)
 * - prüft ob navigator.geolocation verfügbar und ob der Button die Koordinaten setzt
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
    const context = await browser.newContext();
    // Geolocation aktivieren (Hamburg)
    await context.grantPermissions(['geolocation'], { origin: url });
    await context.setGeolocation({ latitude: 53.5481, longitude: 9.9966 });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'load' });

    // Prüfe ob Geolocation verfügbar ist
    const hasGeo = await page.evaluate(() => typeof navigator.geolocation !== 'undefined');
    console.log('navigator.geolocation verfügbar:', hasGeo);

    // Button klicken
    await page.click('#geoBtn');
    await page.waitForTimeout(1500);
    const status = await page.locator('#geoStatus').textContent();
    console.log('Status nach Klick:', JSON.stringify(status));

    // Prüfe ob latDec gesetzt wurde
    const latVal = await page.locator('#latDec').inputValue();
    console.log('latDec nach Geolocation:', latVal);

    // Bewertung
    if (latVal && parseFloat(latVal) > 50) {
      console.log('\n✓ Standort-Button funktioniert (lat = ' + latVal + ')');
    } else {
      console.log('\n✗ Standort-Button setzt keine Koordinaten. Status: ' + status);
    }
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error('FATAL:', e); process.exit(1); });