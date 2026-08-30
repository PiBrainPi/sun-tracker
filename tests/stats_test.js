#!/usr/bin/env node
/**
 * Statistik-Test: prüft dass Tageslänge 21.06. UND 21.12. Werte zeigen
 * (Bug-Fix: vorher war dayLength null → "—").
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

    // Alle Statistik-Boxen
    const boxes = await page.evaluate(() => {
      return [...document.querySelectorAll('.stat-box')].map(b => ({
        label: b.querySelector('span').textContent.trim().replace(/\n/g, ' | '),
        value: b.querySelector('b').textContent.trim()
      }));
    });
    boxes.forEach((b, i) => console.log(`  Box ${i+1}: ${b.value} — ${b.label}`));

    // Tageslänge 21.06. und 21.12. dürfen nicht "—" sein (Bug-Fix)
    const jun21 = boxes.find(b => b.label.includes('21.06') && b.label.includes('Tageslänge'));
    const dec21 = boxes.find(b => b.label.includes('21.12') && b.label.includes('Tageslänge'));
    if (jun21) {
      const ok = jun21.value !== '—' && parseFloat(jun21.value) > 10;
      check(`Tageslänge 21.06. zeigt Wert: ${jun21.value}h`, ok);
    } else check('Tageslänge 21.06. Box vorhanden', false);
    if (dec21) {
      const ok = dec21.value !== '—' && parseFloat(dec21.value) > 5 && parseFloat(dec21.value) < 10;
      check(`Tageslänge 21.12. zeigt Wert: ${dec21.value}h`, ok);
    } else check('Tageslänge 21.12. Box vorhanden', false);

    console.log(`\n=== Statistik-Test: ${pass} bestanden, ${fail} fehlgeschlagen ===`);
  } finally { await browser.close(); server.close(); }
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('FATAL:', e); process.exit(1); });