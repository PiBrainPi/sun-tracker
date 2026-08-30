#!/usr/bin/env node
/**
 * Fachliche Prüfung der drei zu prüfenden Diagramme (Heatmap, Zeitgleichung, Sonnenpfad)
 * + der neuen Charts (Tageslängen-Matrix, Monats-Balken).
 * Verifiziert die zugrunde liegenden Daten anhand physikalischer Erwartungen.
 */
const s = require('../src/suncalc.js');

let pass = 0, fail = 0;
const check = (n, ok) => { ok ? pass++ : fail++; console.log(`${ok ? '✓' : '✗'} ${n}`); };

const LAT = 53.5481, LNG = 9.9966, YEAR = 2024;
const data = s.getSunData({ lat: LAT, lng: LNG, year: YEAR, resolutionMin: 15, refMeridianDEG: 15 });
const rows = data.rows;

/* ---------- 1. HEATMAP-Daten (Sonnenhöhe pro Stunde/Tag) ---------- */
console.log('\n--- Heatmap (Höhe × Tag × Uhrzeit) ---');
// 1a. Sommer: um 06:00 im Juni muss die Sonne über dem Horizont stehen (Hamburg, Juni ~04:30 Aufgang)
const jun6 = rows.find(r => r.monat === 6 && r.tag === 21 && r.stunde === 6 && r.minute === 0);
check('Heatmap 21.06. 06:00: Sonne über Horizont (Höhe > 0)', jun6 && jun6.hoehe > 0);
// 1b. Winter: um 08:00 im Dezember muss die Sonne noch unter dem Horizont sein (Aufgang ~08:42)
const dec8 = rows.find(r => r.monat === 12 && r.tag === 21 && r.stunde === 8 && r.minute === 0);
if (dec8) {
  console.log(`  21.12. 08:00 Höhe = ${dec8.hoehe.toFixed(2)}° (Aufgang ~08:42 → sollte < 0 sein)`);
  check('Heatmap 21.12. 08:00: Sonne unter Horizont (Höhe < 0)', dec8.hoehe < 0);
} else check('21.12. 08:00 Datenpunkt vorhanden', false);
// 1c. Wertebereich: nie > 90 oder < -90
let rangeOk = true;
for (const r of rows) if (r.hoehe > 90 || r.hoehe < -90) { rangeOk = false; break; }
check('Heatmap-Werte im physikalischen Bereich [-90,90]', rangeOk);

/* ---------- 2. ZEITGLEICHUNG ---------- */
console.log('\n--- Zeitgleichung (Equation of Time) ---');
// Bekannte Extremwerte der Zeitgleichung (~ November +16 min, Februar -14 min)
const eotDates = [
  { m: 11, d: 3, label: 'Anfang Nov (≈ +16 min)', min: 10, max: 20 },   // wahres Maximum ~+16.4 min um 3. Nov
  { m: 2, d: 11, label: 'Mitte Feb (≈ -14 min)', min: -17, max: -10 },   // Minimum ~-14.2 min um 11. Feb
  { m: 4, d: 15, label: 'Mitte Apr (≈ 0 min)', min: -1.5, max: 1.5 },    // Nulldurchgang
  { m: 6, d: 14, label: 'Juni (≈ 0 min)', min: -1.5, max: 1.5 },
];
for (const e of eotDates) {
  const doy = s.dayOfYear(YEAR, e.m, e.d);
  const val = s.equationOfTime(doy);
  check(`Zeitgleichung ${e.label}: ${val.toFixed(1)} min`, val >= e.min && val <= e.max);
}
// Glatte Kurve: keine großen Sprünge zwischen aufeinanderfolgenden Tagen
let maxJump = 0;
for (let d = 1; d < 365; d++) {
  const jump = Math.abs(s.equationOfTime(d+1) - s.equationOfTime(d));
  if (jump > maxJump) maxJump = jump;
}
check(`Zeitgleichung glatt (max Tages-Sprung ${maxJump.toFixed(3)} min < 1)`, maxJump < 1);

/* ---------- 3. SONNENPFAD (Polar) ---------- */
console.log('\n--- Sonnenpfad (Polar) ---');
// Zu jeder Azimut-Richtung muss die Sonnenhöhe im Sommer höher sein als im Winter (Süd)
const day = (m, tg) => rows.filter(r => r.monat === m && r.tag === tg);
const junDay = day(6, 21), decDay = day(12, 21);
// Höhe bei Azimut 180° (Süd) um die Mittagszeit
const hSuedSommer = junDay.filter(r => r.azimut >= 170 && r.azimut <= 190).reduce((a,b) => Math.max(a, b.hoehe), -90);
const hSuedWinter = decDay.filter(r => r.azimut >= 170 && r.azimut <= 190).reduce((a,b) => Math.max(a, b.hoehe), -90);
console.log(`  Maximale Sonnenhöhe bei Süd (180°): Sommer ${hSuedSommer.toFixed(1)}°, Winter ${hSuedWinter.toFixed(1)}°`);
check('Sonnenpfad: Sommer höher als Winter bei Süd', hSuedSommer > hSuedWinter);
// Sommer: Sonne erreicht Azimut-Werte unter 90° (NO) und über 270° (NW) — weiter Bogen
const azJunMin = Math.min(...junDay.map(r => r.azimut));
const azJunMax = Math.max(...junDay.map(r => r.azimut));
console.log(`  Azimut-Bereich 21.06.: ${azJunMin.toFixed(0)}° bis ${azJunMax.toFixed(0)}°`);
check('Sonnenpfad Sommer: weiter Bogen über Nordost (Azimut < 90)', azJunMin < 90);
check('Sonnenpfad Sommer: weiter Bogen über Nordwest (Azimut > 270)', azJunMax > 270);
// Winter: enger Bogen um Süd (über dem Horizont). Im Winter steht die Sonne
// im Norden nie über dem Horizont, daher ist der sichtbare Azimut-Bereich eng
// um Süd. Wir filtern auf Sonnenhöhe > 0 (wie der Polar-Renderer es tut).
const decDayAbove = decDay.filter(r => r.hoehe > 0);
const azDecMin = Math.min(...decDayAbove.map(r => r.azimut));
const azDecMax = Math.max(...decDayAbove.map(r => r.azimut));
console.log(`  Azimut-Bereich 21.12. (über Horizont): ${azDecMin.toFixed(0)}° bis ${azDecMax.toFixed(0)}°`);
check('Sonnenpfad Winter: enger Bogen um Süd (Azimut > 90)', azDecMin > 90);
check('Sonnenpfad Winter: enger Bogen um Süd (Azimut < 270)', azDecMax < 270);

/* ---------- 4. NEUE CHARTS (Tageslängen-Matrix + Monats-Balken) ---------- */
console.log('\n--- Tageslängen-Matrix & Monats-Balken ---');
// 4a. Anzahl Stunden mit Sonne über Horizont im Juni > im Dezember
const hoursAbove = (m) => rows.filter(r => r.monat === m && r.tag === 21 && r.hoehe > 0).length;
const junHours = hoursAbove(6), decHours = hoursAbove(12);
console.log(`  Stunden mit Sonne > 0° am 21.06.: ${junHours}, am 21.12.: ${decHours}`);
check('Matrix: Juni deutlich mehr Sonnenstunden als Dezember', junHours > decHours + 6);
// 4b. Ø-Tageslänge-Monatswerte: Juni > Dezember
const dayLenAvg = (m) => {
  const days = data.dailyTimes.filter(dt => dt.monat === m && dt.dayLength != null);
  return days.reduce((a,b) => a + b.dayLength, 0) / days.length;
};
const avgJun = dayLenAvg(6), avgDec = dayLenAvg(12);
console.log(`  Ø Tageslänge Juni: ${avgJun.toFixed(2)}h, Dezember: ${avgDec.toFixed(2)}h`);
check('Monats-Balken: Ø Juni > Ø Dezember', avgJun > avgDec + 5);
// 4c. Ø-Tageslänge Reihenfolge: Feb < Mär (steigend), Nov > Dez (fallend) — keine Sprünge
check('Monats-Balken: Feb < Mär', dayLenAvg(2) < dayLenAvg(3));
check('Monats-Balken: Nov > Dez', dayLenAvg(11) > dayLenAvg(12));

console.log(`\n=== Chart-Logik-Test: ${pass} bestanden, ${fail} fehlgeschlagen ===`);
process.exit(fail === 0 ? 0 : 1);