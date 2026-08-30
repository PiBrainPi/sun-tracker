#!/usr/bin/env node
/**
 * Syntax- und Strukturprüfung der Single-File-HTML-App.
 * Extrahiert alle <script>-Blöcke und prüft sie mit `new Function` (Syntax-Check),
 * ohne sie auszuführen (kein DOM nötig für den Syntax-Pass).
 */
const fs = require('fs');
const path = process.argv[2] || 'src/Sun_Tracker_V02.html';
const html = fs.readFileSync(path, 'utf8');

let pass = 0, fail = 0;
const checks = [];

// 1. Grundstruktur: <!DOCTYPE>, <html>, <head>, <body>
for (const tag of ['<!DOCTYPE html>', '<html', '<head>', '<body>']) {
  const ok = html.toLowerCase().includes(tag.toLowerCase());
  checks.push([`enthält ${tag}`, ok]);
}

// 2. Script-Blöcke
const scripts = html.match(/<script>([\s\S]*?)<\/script>/g) || [];
checks.push(['Anzahl <script>-Blöcke >= 1', scripts.length >= 1]);

// 3. Syntaxprüfung jedes Script-Blocks
scripts.forEach((block, i) => {
  const code = block.replace(/^<script>/, '').replace(/<\/script>$/, '');
  try {
    new Function(code); // nur Syntax, nicht ausführen
    checks.push([`Script ${i}: Syntax OK`, true]);
  } catch (e) {
    checks.push([`Script ${i}: SYNTAXFEHLER — ${e.message}`, false]);
  }
});

// 4. Kein unbalanciertes <div> (grobe Struktur)
const openDivs = (html.match(/<div\b/g) || []).length;
const closeDivs = (html.match(/<\/div>/g) || []).length;
checks.push([`<div> balanciert (${openDivs} offen, ${closeDivs} zu)`, openDivs === closeDivs]);

// 5. Keine offensichtlich kaputten IDs
const ids = [...new Set([...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]))];
checks.push(['IDs gefunden: ' + ids.length, ids.length > 10]);

// Ausgabe
for (const [name, ok] of checks) {
  if (ok) pass++; else fail++;
  console.log(`${ok ? '✓' : '✗'} ${name}`);
}
console.log(`\n=== ${pass} bestanden, ${fail} fehlgeschlagen ===`);
process.exit(fail === 0 ? 0 : 1);