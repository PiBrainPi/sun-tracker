#!/usr/bin/env node
/**
 * Screenshots der geänderten Diagramme: c2 (Monatsstatistiken), c10 (Monatl. Tageslänge), c9-Matrix.
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
    const page = await browser.newPage({ viewport: { width: 1300, height: 900 } });
    await page.goto(url, { waitUntil: 'load' });
    await page.click('#calcBtn');
    await page.waitForSelector('#resultSection.visible', { timeout: 30000 });
    await page.waitForTimeout(400);
    // c2 Monatsstatistiken
    const c2 = page.locator('.chart-box[data-chart="c2"]');
    await c2.scrollIntoViewIfNeeded(); await page.waitForTimeout(200);
    await c2.screenshot({ path: path.resolve(__dirname, '../assets/diagramm_monatsstatistiken.png') });
    // c10 Monatliche Tageslänge
    const c10 = page.locator('.chart-box[data-chart="c10"]');
    await c10.scrollIntoViewIfNeeded(); await page.waitForTimeout(200);
    await c10.screenshot({ path: path.resolve(__dirname, '../assets/diagramm_monatl_tageslaenge.png') });
    // c9 Matrix
    const c9 = page.locator('.chart-box[data-chart="c9"]');
    await c9.scrollIntoViewIfNeeded(); await page.waitForTimeout(200);
    await c9.screenshot({ path: path.resolve(__dirname, '../assets/matrix_zahlenwerte.png') });
    console.log('Screenshots erstellt: c2, c10, c9');
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exit(1); });