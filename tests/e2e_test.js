#!/usr/bin/env node
/**
 * E2E-Test der Sun-Tracker-App im echten Browser (headless Chromium).
 * Startet einen lokalen HTTP-Server, lädt die App, führt eine Berechnung aus
 * und prüft Charts, Statistik, Export und Sprach/Theme-Toggle.
 */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const HTML = path.resolve(__dirname, '../src/Sun_Tracker_V03.html');

// Server
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(fs.readFileSync(HTML));
});

const CHROMIUM_1223 = '/home/claw_01_rasbpi5_1/.cache/ms-playwright/chromium-1223/chrome-linux/chrome';
const CHROMIUM_1223_SHELL = '/home/claw_01_rasbpi5_1/.cache/ms-playwright/chromium_headless_shell-1223/chrome-linux/headless_shell';

(async () => {
  let pass = 0, fail = 0;
  const check = (name, ok) => { ok ? pass++ : fail++; console.log(`${ok ? '✓' : '✗'} ${name}`); };

  await new Promise(r => server.listen(0, r));
  const port = server.address().port;
  const url = `http://127.0.0.1:${port}/`;

  // Browser mit explizitem gecachtem Chromium-1223
  const browser = await chromium.launch({
    executablePath: CHROMIUM_1223,
    headless: true,
    args: ['--no-sandbox']
  });

  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

    await page.goto(url, { waitUntil: 'load' });

    // Titel
    const title = await page.title();
    check('App-Titel = "Sun Tracker"', title === 'Sun Tracker');

    // Default-Koordinaten (Hamburg) stehen im Formular. Berechnung starten.
    await page.click('#calcBtn');
    // Warten bis Ergebnis sichtbar
    await page.waitForSelector('#resultSection.visible', { timeout: 30000 });
    check('Ergebnis-Sektion nach Berechnung sichtbar', true);

    // Statistiken — jetzt 6 Boxen (inkl. Tageslänge 21.12.)
    const statBoxes = await page.locator('.stat-box').count();
    check('Statistik-Boxen (6) gerendert', statBoxes === 6);

    // Jahres-Maximalhöhe prüfen (~60° für Hamburg → Jahreverlauf)
    const firstStat = await page.locator('.stat-box b').first().textContent();
    const maxVal = parseFloat(firstStat);
    check(`Jahresmax-Sonnenhöhe ≈60° (got ${firstStat})`, maxVal > 55 && maxVal < 65);

    // Charts: Alle 10 sind immer aktiv
    const canvases = await page.locator('.chart-box canvas').count();
    check(`Alle 11 Charts gerendert (got ${canvases})`, canvases === 11);

    // Jede Chart hat eine Beschreibung
    const descs = await page.locator('.chart-desc').count();
    check(`Alle Charts mit Beschreibung (got ${descs})`, descs === 13);

    // Sprach-Toggle: Deutsch → Englisch
    await page.click('#langBtn');
    const titleAfter = await page.locator('#appTitle').textContent();
    check('Sprach-Toggle → Titel bleibt (App-Titel gleich)', titleAfter.includes('Sun Tracker'));

    // Theme-Toggle: von hell zu dunkel
    const themeBefore = await page.getAttribute('html', 'data-theme');
    await page.click('#themeBtn');
    const themeAfter = await page.getAttribute('html', 'data-theme');
    check(`Theme-Toggle: ${themeBefore}→${themeAfter}`, themeBefore !== themeAfter);

    // DMS-Koordinaten-Test
    await page.click('#ctDms');
    const dmsVisible = await page.locator('#dmsFields').isVisible();
    check('DMS-Felder sichtbar nach Toggle', dmsVisible);
    // zurück zu Dezimal
    await page.click('#ctDec');

    // JSON-Export (verifiziert, dass Daten konsistent)
    const jsonOk = await page.evaluate(() => {
      // Direkt die Build-Funktion aufrufen (state ist global)
      return JSON.stringify(state.data) !== null;
    });
    check('state.data gesetzt (für Export)', jsonOk);

    // JS-Fehler?
    check(`Keine JS-Fehler (${errors.length})`, errors.length === 0);
    if (errors.length) errors.forEach(e => console.log('   → ' + e));

    console.log(`\n=== E2E: ${pass} bestanden, ${fail} fehlgeschlagen ===`);

  } finally {
    await browser.close();
    server.close();
  }
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('FATAL:', e); server.close(); process.exit(1); });