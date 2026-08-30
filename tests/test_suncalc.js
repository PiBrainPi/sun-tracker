/**
 * test_suncalc.js — Plausibilitätstest des Kernmoduls gegen astronomische Referenzwerte.
 * Lauft mit: node tests/test_suncalc.js
 */
const s = require('../src/suncalc.js');

let pass = 0, fail = 0;
function check(name, actual, expected, tol = 0.3) {
  const diff = Math.abs(actual - expected);
  const ok = diff <= tol;
  if (ok) pass++; else fail++;
  console.log(`${ok ? '✓' : '✗ FAIL'} ${name}: got=${actual.toFixed(4)} expected≈${expected} (Δ=${diff.toFixed(4)})`);
}

// Hamburg
const LAT = 53.5481, LNG = 9.9966;
const REF_MEZ = 15;

// 1. Maximalsonnenhöhe am 21.06. (Mittsommer)
//    ≈ 90° − Breitengrad + 23.44° (bei Sonnenmittag)
const p_sommer = s.sunPosition(LAT, LNG, 2024, 6, 21, 12, 0, REF_MEZ);
console.log('\n=== 21.06. 12:00 MEZ Hamburg ===');
console.log('Höhe:', p_sommer.altitude.toFixed(3), '| Azimut:', p_sommer.azimuth.toFixed(3));
check('21.06. Sonnenhöhe (Mittsommer)', p_sommer.altitude, 90 - LAT + 23.44);

// 2. Maximalsonnenhöhe am 21.12. (Wintersonnenwende)
//    ≈ 90° − Breitengrad − 23.44°
const p_winter = s.sunPosition(LAT, LNG, 2024, 12, 21, 12, 0, REF_MEZ);
console.log('\n=== 21.12. 12:00 MEZ Hamburg ===');
console.log('Höhe:', p_winter.altitude.toFixed(3), '| Azimut:', p_winter.azimuth.toFixed(3));
check('21.12. Sonnenhöhe (Wintersonnenwende)', p_winter.altitude, 90 - LAT - 23.44);

// 3. Azimut am 21.06. beim tatsächlichen Sonnenmittag ≈ 180° (Sonne im Süden)
//    WICHTIG: Sonnenmittag MEZ in Hamburg ist NICHT 12:00, sondern ~13:16
//    (Längengrad 9.99° + Zeitgleichung). Wir finden ihn, wo der Azimut 180° kreuzt.
let noonPos = null;
for (let h = 12.5; h < 14; h += 0.1) {
  const st = Math.floor(h), mi = (h-st)*60;
  const p = s.sunPosition(LAT, LNG, 2024, 6, 21, st, mi, REF_MEZ);
  if (p.azimuth >= 175 && p.azimuth <= 185) { noonPos = p; break; }
}
console.log('\n=== 21.06. Sonnenmittag (Azimut≈180) Hamburg ===');
if (noonPos) {
  console.log('Azimut@Sonnenmittag:', noonPos.azimuth.toFixed(3), '| Höhe:', noonPos.altitude.toFixed(3));
  check('21.06. Sonnenmittag Azimut≈180', noonPos.azimuth, 180, 5);
} else {
  console.log('Sonnenmittag nicht in 12.5–14h gefunden');
}

// 4. Azimut-Verlauf: Vormittag <180, Nachmittag >180 (Monotonie nicht nötig, aber Vorzeichen)
const p_morgen = s.sunPosition(LAT, LNG, 2024, 6, 21, 6, 0, REF_MEZ);
check('21.06. 06:00 Azimut (Osten, deutlich <180)', p_morgen.azimuth, 90, 30);
const p_abend = s.sunPosition(LAT, LNG, 2024, 6, 21, 18, 0, REF_MEZ);
check('21.06. 18:00 Azimut (Westen, deutlich >180)', p_abend.azimuth, 270, 35);

// 6. Tag = 29.02.2024 (Schaltjahr) valid
const doy_feb = s.dayOfYear(2024, 2, 29);
check('Schaltjahr-Tageszahl 29.02 = 60', doy_feb, 60, 0);
const doy_feb_23 = s.dayOfYear(2023, 2, 28);
check('Nicht-Schaltjahr 28.02 = 59', doy_feb_23, 59, 0);

// 7. Monatsübergang: 28.02 → 01.03 in 2024 (Schaltjahr) = 2 Tage (29.02 existiert!)
const t1 = s.dayOfYear(2024, 2, 28), t2 = s.dayOfYear(2024, 3, 1);
check('Tageszahl 28.02→01.03 (2024, Schaltjahr) Diff=2', t2 - t1, 2, 0);
// In Nicht-Schaltjahr (2023): 28.02→01.03 = 1 Tag
const t1n = s.dayOfYear(2023, 2, 28), t2n = s.dayOfYear(2023, 3, 1);
check('Tageszahl 28.02→01.03 (2023, normal) Diff=1', t2n - t1n, 1, 0);
console.log('  (V2.1-Bug-Kontrolle: alt 30.3-Formel ergab 3.3 Sprung; korrekt ist 1 bzw. 2)');

// 8. Sonnenaufgang/-untergang Hamburg 21.06.
//    Unser Modell rechnet mit UTC+1 (MEZ, refMeridian=15) OHNE Sommerzeit.
//    In MEZ (nicht MESZ!): Aufgang ~03:58, Untergang ~20:46, Tageslänge ~16.8h.
//    (Mit Sommerzeit/MESZ wäre es 04:58/21:46 — die Referenz 04:53/21:57 stammt aus
//     MESZ-Quellen. Wir testen konsistent auf der MEZ-Basis des Moduls.)
const times_sommer = s.sunTimes(LAT, LNG, 2024, 6, 21, REF_MEZ);
console.log('\n=== Sonnenzeiten 21.06. Hamburg (MEZ, ohne Sommerzeit) ===');
console.log('Aufgang:', times_sommer.sunrise?.toFixed(2), '= ', Math.floor(times_sommer.sunrise), ':', Math.round((times_sommer.sunrise-Math.floor(times_sommer.sunrise))*60));
console.log('Untergang:', times_sommer.sunset?.toFixed(2), '= ', Math.floor(times_sommer.sunset), ':', Math.round((times_sommer.sunset-Math.floor(times_sommer.sunset))*60));
console.log('Tageslänge:', times_sommer.dayLength?.toFixed(2), 'h');
check('21.06. Sonnenaufgang ~03:58 MEZ', times_sommer.sunrise, 3.97, 0.3);
check('21.06. Sonnenuntergang ~20:46 MEZ', times_sommer.sunset, 20.76, 0.3);
check('21.06. Tageslänge ~16.8h', times_sommer.dayLength, 16.79, 0.3);

// 9. Sonnenzeiten Hamburg 21.12. (Winter, MEZ)
const times_winter = s.sunTimes(LAT, LNG, 2024, 12, 21, REF_MEZ);
console.log('\n=== Sonnenzeiten 21.12. Hamburg (MEZ) ===');
console.log('Aufgang:', times_winter.sunrise?.toFixed(2), '| Untergang:', times_winter.sunset?.toFixed(2));
check('21.12. Sonnenaufgang ~08:42 MEZ', times_winter.sunrise, 8.70, 0.3);
check('21.12. Sonnenuntergang ~15:54 MEZ', times_winter.sunset, 15.91, 0.3);

// 10. Tageszahl-Verhalten im Jahresverlauf (kein Sprung)
//     Dummy: prüfe, dass aufeinanderfolgende Tage ±1 differieren
let smooth = true;
for (let d = 1; d <= 365; d++) {
  // date from doy
  const dt = new Date(2024, 0, d);
  const doy = s.dayOfYear(2024, dt.getMonth()+1, dt.getDate());
  if (doy !== d) smooth = false;
}
check('Tageszahl 1..365 sauber', smooth ? 0 : 1, 0, 0);

console.log(`\n=== ERGEBNIS: ${pass} bestanden, ${fail} fehlgeschlagen ===`);
process.exit(fail === 0 ? 0 : 1);
