#!/usr/bin/env node
/**
 * Screenshots aller 8 Charts (helle + dunkle Variante) für visuelle Prüfung.
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
    const page = await browser.newPage({ viewport: { width: 1280, height: 2000 } });
    await page.goto(url, { waitUntil: 'load' });
    await page.click('#calcBtn');
    await page.waitForSelector('#resultSection.visible', { timeout: 30000 });
    // Alle Charts sind immer aktiv — nur neu rendern nach Berechnung
    await page.waitForTimeout(400);

    // Screenshot hell (volle Seite, alle Charts)
    await page.screenshot({ path: path.resolve(__dirname, '../assets/screenshot_alle_charts_hell.png'), fullPage: true });

    // Dunkel
    await page.click('#themeBtn');
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.resolve(__dirname, '../assets/screenshot_alle_charts_dunkel.png'), fullPage: true });

    console.log('Screenshots (alle 8 Charts, hell+dunkel) erstellt');
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exit(1); });