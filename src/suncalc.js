/**
 * suncalc.js — Astronomisches Kernmodul (pure Funktionen, kein DOM)
 * -------------------------------------------------------------
 * Port der Python-Formeln aus V2.1 (Sonnenstand_20181006_14.py) nach JavaScript.
 * Erweitert um Sonnenaufgang/-untergang und Dämmerungsphasen.
 *
 * Architektur: Dieses Modul ist die geschützte "Berechnungs-Schicht".
 * Die UI spricht NUR über eine Schnittstelle (getSunData) mit ihr zu.
 * Später kann diese Schicht ohne UI-Änderung auf einen Server wandern
 * (Paywall-fähig) — das Modul selbst bleibt identisch.
 *
 * Alle Funktionen sind deterministisch und testbar (kein DOM, keine Seiteneffekte).
 */

"use strict";

// Grad <-> Bogenmaß
const RAD = Math.PI / 180;

/**
 * Berechnet die Tageszahl (1–365/366) für ein Datum.
 * @param {number} y Jahr
 * @param {number} m Monat (1–12)
 * @param {number} d Tag
 * @returns {number} Tag im Jahr
 */
function dayOfYear(y, m, d) {
  // Schaltjahr-Regel
  const leap = (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
  const daysPerMonth = [0, 31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let doy = d;
  for (let i = 1; i < m; i++) doy += daysPerMonth[i];
  return doy;
}

/**
 * Prüft, ob ein Jahr ein Schaltjahr ist.
 */
function isLeapYear(y) {
  return (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
}

/**
 * Sonnendeklination in Grad.
 * @param {number} tageszahl 1–366
 */
function declination(tageszahl) {
  return -23.45 * Math.cos(RAD * 360 * (tageszahl + 10) / 365);
}

/**
 * Zeitgleichung in Minuten (Differenz wahrer/mittlerer Sonnenzeit).
 */
function equationOfTime(tageszahl) {
  return 60 * (
    -0.171 * Math.sin(0.0337 * tageszahl + 0.465)
    - 0.1299 * Math.sin(0.01787 * tageszahl - 0.168)
  );
}

/**
 * Berechnet Sonnenhöhe und Sonnenazimut für einen Standort + Zeitpunkt.
 *
 * @param {number} lat   Breitengrad (Dezimalgrad, -90..90)
 * @param {number} lng   Längengrad (Dezimalgrad, -180..180)
 * @param {number} year  Jahr (für Tageszahl/Schaltjahr)
 * @param {number} monat 1–12
 * @param {number} tag   1–31
 * @param {number} stunde 0–23
 * @param {number} minute 0–59
 * @param {number} refMeridianDEG Referenzmeridian der Zeitzone (z. B. 15 = UTC+1)
 * @param {number} dstOffset  Sommerzeit-Offset in Stunden (0 oder 1), bereits in stunde enthalten
 * @returns {{altitude:number, azimuth:number, declination:number, hourAngle:number}}
 */
function sunPosition(lat, lng, year, monat, tag, stunde, minute, refMeridianDEG = 15) {
  const tz = dayOfYear(year, monat, tag);

  const dec = declination(tz);
  const eot = equationOfTime(tz);

  // Lokalzeit als Dezimalstunden
  const lokalzeit = stunde + minute / 60;

  // Stundenwinkel (15° pro Stunde)
  const hourAngle = 15 * (
    lokalzeit
    - (refMeridianDEG - lng) / 15
    - 12
    + eot / 60
  );

  // Sinus der Sonnenhöhe (Kugeldreieck) + clamp gegen Domain-Fehler
  const sinAlt = Math.sin(RAD * lat) * Math.sin(RAD * dec)
    + Math.cos(RAD * lat) * Math.cos(RAD * dec) * Math.cos(RAD * hourAngle);
  const sinAltClamped = Math.max(-1, Math.min(1, sinAlt));
  const altitude = Math.asin(sinAltClamped) / RAD;

  // Kosinus der Höhe (für Azimut-Nenner)
  const cosAlt = Math.cos(RAD * altitude);

  // Azimut: Zenit/Nadir-Guard
  let azimuth;
  if (cosAlt < 1e-10) {
    azimuth = 180; // Fallback: Süd
  } else {
    let cosAz = -(Math.sin(RAD * lat) * sinAltClamped - Math.sin(RAD * dec))
      / (Math.cos(RAD * lat) * cosAlt);
    cosAz = Math.max(-1, Math.min(1, cosAz));
    // Sonnenmittag für Quadrant
    const sonnenmittag = 12 + (refMeridianDEG - lng) / 15 - eot / 60;
    if (lokalzeit <= sonnenmittag) {
      azimuth = Math.acos(cosAz) / RAD;
    } else {
      azimuth = 360 - Math.acos(cosAz) / RAD;
    }
  }

  return { altitude, azimuth, declination: dec, hourAngle, equationOfTime: eot, dayOfYear: tz };
}

/**
 * Findet den Zeitpunkt (Dezimalstunden) an dem die Sonnenhöhe einen Zielwert
 * erreicht (Sonnenaufgang: alt=0 vormittags, Untergang: alt=0 nachmittags,
 * Dämmerung: alt=-6/-12/-18). Bisektion auf der stetigen Höhenfunktion.
 *
 * @returns {number|null} Dezimalstunde oder null wenn Sonne nie den Wert erreicht
 */
function findCrossing(lat, lng, year, monat, tag, targetAlt, isMorning, refMeridianDEG, eot) {
  // Einheitliche Höhen-Funktion (Dezimalstunde → Sonnenhöhe)
  const alt = (hour) => sunPosition(lat, lng, year, monat, tag, hour, 0, refMeridianDEG).altitude;

  // Definiere g(h) = altitude(h) - targetAlt. Kreuzung wo g = 0.
  // Aufgang (isMorning): g wechselt von - nach + (steigend)
  // Untergang (isMorning=false): g wechselt von + nach - (fallend)
  // Bisektion zwischen lo (g_lo < 0 für Aufgang) und hi (g_hi > 0).
  // Für Untergang invertieren wir das Vorzeichen, sodass wir immer
  // von "negativ" zu "positiv" suchen können.
  const g = (hour) => isMorning ? (alt(hour) - targetAlt) : (targetAlt - alt(hour));

  // Scan über den Tag (feine Schritte, 2 min) nach Vorzeichenwechsel
  const step = 1 / 30; // 2 Minuten
  let prev = g(0);
  let prevH = 0;
  for (let h = step; h <= 24.001; h += step) {
    const cur = g(h);
    if (prev < 0 && cur >= 0) {
      // Bisektion zwischen prevH und h
      let lo = prevH, hi = h;
      for (let i = 0; i < 60; i++) {
        const mid = (lo + hi) / 2;
        if (g(mid) < 0) lo = mid; else hi = mid;
      }
      return (lo + hi) / 2;
    }
    prev = cur;
    prevH = h;
  }
  return null;
}

/**
 * Liefert Sonnenaufgang, -untergang und Dämmerungszeiten (Dezimalstunden) für einen Tag.
 * @returns {object|null} null wenn Sonne nie auf/untergeht (Polartag/-nacht)
 */
function sunTimes(lat, lng, year, monat, tag, refMeridianDEG) {
  const eot = equationOfTime(dayOfYear(year, monat, tag));
  const sunrise = findCrossing(lat, lng, year, monat, tag, 0, true, refMeridianDEG, eot);
  const sunset = findCrossing(lat, lng, year, monat, tag, 0, false, refMeridianDEG, eot);
  const civilDawn = findCrossing(lat, lng, year, monat, tag, -6, true, refMeridianDEG, eot);
  const civilDusk = findCrossing(lat, lng, year, monat, tag, -6, false, refMeridianDEG, eot);
  const nautDawn = findCrossing(lat, lng, year, monat, tag, -12, true, refMeridianDEG, eot);
  const nautDusk = findCrossing(lat, lng, year, monat, tag, -12, false, refMeridianDEG, eot);
  const astDawn = findCrossing(lat, lng, year, monat, tag, -18, true, refMeridianDEG, eot);
  const astDusk = findCrossing(lat, lng, year, monat, tag, -18, false, refMeridianDEG, eot);

  // Sonnenmittag (Solar Noon) = Zeitpunkt wo Azimut = 180° (Süd, nördliche Hemisphäre)
  // ≈ wenn Stundenwinkel = 0
  const solarNoon = 12 + (refMeridianDEG - lng) / 15 - eot / 60;

  return {
    sunrise, sunset, solarNoon,
    civilDawn, civilDusk,
    nauticalDawn: nautDawn, nauticalDusk: nautDusk,
    astroDawn: astDawn, astroDusk: astDusk,
    dayLength: sunrise != null && sunset != null ? sunset - sunrise : null
  };
}

/**
 * ———— HAUPTSCHNITTSTELLE ————
 * Berechnet alle Sonnenstände für ein Jahr in gegebener Auflösung.
 * Dies ist die Funktion, die später auf den Server wandern kann.
 *
 * @param {object} cfg
 * @param {number} cfg.lat
 * @param {number} cfg.lng
 * @param {number} cfg.year
 * @param {number} cfg.resolutionMin  Zeitauflösung in Minuten (Teiler von 60)
 * @param {number} cfg.refMeridianDEG
 * @returns {object} { rows:[...], meta:{...} }
 */
function getSunData(cfg) {
  const { lat, lng, year, resolutionMin, refMeridianDEG } = cfg;
  const rows = [];

  for (let monat = 1; monat <= 12; monat++) {
    const daysInMonth = new Date(year, monat, 0).getDate();
    for (let tag = 1; tag <= daysInMonth; tag++) {
      for (let stunde = 0; stunde < 24; stunde++) {
        for (let minute = 0; minute < 60; minute += resolutionMin) {
          const p = sunPosition(lat, lng, year, monat, tag, stunde, minute, refMeridianDEG);
          rows.push({
            monat, tag, stunde, minute,
            hoehe: p.altitude,
            azimut: p.azimuth
          });
        }
      }
    }
  }

  // Sonnenaufgang/-untergang pro Tag
  const dailyTimes = [];
  for (let monat = 1; monat <= 12; monat++) {
    const daysInMonth = new Date(year, monat, 0).getDate();
    for (let tag = 1; tag <= daysInMonth; tag++) {
      dailyTimes.push({
        monat, tag,
        ...sunTimes(lat, lng, year, monat, tag, refMeridianDEG)
      });
    }
  }

  return {
    rows,
    dailyTimes,
    meta: { lat, lng, year, resolutionMin, refMeridianDEG }
  };
}

// Export für Node/Test-Umgebung UND Browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { sunPosition, sunTimes, getSunData, dayOfYear, declination, equationOfTime, isLeapYear };
}
if (typeof window !== 'undefined') {
  window.suncalc = { sunPosition, sunTimes, getSunData, dayOfYear, declination, equationOfTime, isLeapYear };
}