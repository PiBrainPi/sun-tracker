#!/usr/bin/env node
/** Diagnose: JS-Fehler beim Laden/Rechnen der Sun_Tracker V03. */
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
    const errors = [];
    page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message + ' STACK: ' + (e.stack || '').split('\n').slice(0,4).join(' | ')));
    page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(500);
    console.log('Nach Load, Fehler:', JSON.stringify(errors, null, 2));
    // Versuche Berechnung
    try {
      await page.click('#calcBtn');
      await page.waitForTimeout(1000);
      console.log('calcBtn geklickt');
    } catch (e) { console.log('calcBtn Fehler:', e.message); }
    const visible = await page.locator('#resultSection.visible').count();
    console.log('resultSection.visible count:', visible);
    // Lese evtl. angezeigten Fehler
    const errText = await page.locator('#resultSection').textContent().catch(()=>'');
    console.log('resultSection Inhalt (erste 200):', errText.slice(0,200));
    console.log('JS-Fehler gesamt:', JSON.stringify(errors, null, 2));
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error('FATAL:', e); process.exit(1); });