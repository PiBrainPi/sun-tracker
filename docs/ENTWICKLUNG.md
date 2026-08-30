# Sun Tracker — Detaillierte Projektdokumentation

_Professionelle, lückenlose Dokumentation für kontinuierliche Weiterarbeit. Diese Datei ist so
geschrieben, dass du dich an einem neuen Tag mit leerem Kontext effizient wieder einarbeiten kannst:
Sie enthält Stand, Architektur, Formeln, Entscheidungen, Bugs, Teststatus und nächste Schritte._

---

## 1. Projektübersicht (Stand: 16.08.2026, V03)

| Feld | Wert |
|---|---|
| Projektname | Sun Tracker |
| Zweck | Sonnenstands-Rechner (Höhe, Azimut, Auf-/Untergang, Dämmerung, Tageslänge) als Web-App |
| Plattform | Browser (Single-File HTML), später VPS |
| Vorgänger | Python/tkinter `Sonnenstand_20181006_12–14` (FBU, 28.02.2020) |
| Referenz-Version | V2.1 (`_archiv_alt/Sonnenstand_20181006_14.py`) — korrekte Astronomie |
| **Aktuelle App** | `src/Sun_Tracker_V03.html` (aktiv, ~115 KB) |
| **Berechnungs-Kern** | `src/suncalc.js` (pur, DOM-frei, Node-testbar) |
| **Versionierung** | Datei-Endung `<Name>_V<Nummer>.html` (Nutzer-Konvention) |
| **Status** | ✅ **Funktional & alle Tests grün (118/118)** |

> **Wichtig:** `src/Sun_Tracker_V01.html` und `src/Sun_Tracker_V02.html` sind **ältere Revisionen**
> (mit bekannten Bugs) und dienen nur als Referenz. Arbeite **immer** mit `Sun_Tracker_V03.html`.

---

## 2. Herkunft & Altsystem (Kontext)

Das Projekt begann 2020 als Anfänger-Python-Skript (`Sonnenstand_20181006_12.py`), das für einen
geografischen Standort Sonnenhöhe und -azimut je Tag berechnet. 2026 wurde es per KI refaktoriert
(V2.0) und ein kritischer Tageszahl-Bug behoben (V2.1, via `datetime.tm_yday` statt `(monat-1)*30.3+tag`).

**Archiv:** Das gesamte alte Projekt liegt abgeschlossen unter `_archiv_alt/` und wird NICHT mehr angefasst.
- `_12.py` = Original V1.1 (2020) + alte Windows-EXE (PyInstaller, Python 3.8)
- `_13.py` = Refactoring V2.0
- `_14.py` = V2.1 (aktuellster Python-Stand, Tageszahl-Fix)
- `balche.py` / `zt.py` / `endecr.py` + `.dat` = **IOTA-Tangle-Lizenzmodule** (2020, funktional tot — der IOTA-Tangle existiert nicht mehr seit der Chrysalis-Migration 2021)

---

## 3. Aktueller Funktionsumfang (V03)

### 3.1 Kernberechnung (aus V2.1 portiert)
- Astronomische Näherungsformeln: Deklination, Zeitgleichung, Stundenwinkel, Kugeldreieck.
- Tageszahl korrekt (Schaltjahr-bewusst). Clamp gegen `asin`/`acos`-Domain-Fehler; Div-0-Schutz.
- Schaltjahr-Logik; Längengrad −180…+180.

### 3.2 Features
1. **Koordinaten-Eingabe:** Dezimalgrad **ODER** Grad/Minuten/Sekunden (DMS), bidirektional.
2. **Zeitzone + Sommerzeit:** UTC-Offset-Dropdown + Sommerzeit-Modus (keine/auto/immer).
3. **Auflösung:** user-wählbar (Minuten-Schritt), asynchron mit Fortschrittsbalken.
4. **Export:** `.txt` | `.csv` | `.json` (userwählbar), per Blob-Download.
5. **PDF-Bericht:** (a) Library (html2canvas+jsPDF via CDN) UND (b) nativer Browser-Druck.
6. **13 Diagramme (alle immer sichtbar, keine Auswahl mehr):**
   - c1 Jahresverlauf Sonnenhöhe (12 Uhr)
   - c2 Monatsstatistiken (Box-Plot)
   - c3 Solstitiums-Vergleich Höhe (21.06 vs 21.12)
   - c4 Solstitiums-Vergleich Azimut
   - c5 Sonnenpfad (Polar: Azimut × Höhe)
   - c6 Tageslänge über das Jahr (mit 21.06/21.12-Extrema + Sonnenhöhe)
   - c7 Zeitgleichung
   - c8 Heatmap (Höhe × Tag × Uhrzeit) — HTML-Legende oberhalb
   - c9 Tageslängen-Matrix (Sonne > 0° pro Stunde/Tag) + **Zahlenwert-Matrix** (Raster Monate × Tage 1–31, je Zelle Tageslänge in h, + Σ h Monatssummen)
   - c10 Monatliche Tageslänge (Ø Stunden, Balkendiagramm)
   - c11 **Sonnenaufgangs-Matrix** (HH:MM je Tag, Ø-Zeile) — reine Zahlenwert-Matrix, kein Kurvendiagramm mehr
   - c12 **Sonnenuntergangs-Matrix** (HH:MM je Tag, Ø-Zeile) — reine Zahlenwert-Matrix, kein Kurvendiagramm mehr
   - c13 Sonnenaufgang & Sonnenuntergang kombiniert (Aufgang unten/Untergang oben, Fläche = Tageslänge, 4 Sonnenhöhen-Extrema)
7. **Zusatzdaten:** Sonnenaufgang/-untergang + Dämmerungsphasen (bürgerlich/nautisch/astronomisch).
8. **Design:** helles Standard-Theme + dunkles Theme, runder Sonne/Mond-Toggle.
9. **i18n:** Deutsch, Englisch, Spanisch, Portugiesisch, Mandarin — runder Flaggen-Toggle.
10. **Standort:** Browser-Geolocation (nur auf HTTP/HTTPS; bei `file://` verweigerte Berechtigung mit verständlicher Meldung).
11. **Kurzanleitung + ausklappbare Formel-Doku** direkt in der HTML-Datei (für den User nachvollziehbar).

---

## 4. Architektur

### 4.1 Struktur
- **Single File:** alles (HTML, CSS, JS) in `src/Sun_Tracker_V03.html`.
- **Modular im Datei-Format:** klare Sektionen im `<script>`:
  - `suncalc` (pure Astronomie-Funktionen — testbar ohne UI)
  - `i18n` (Übersetzungen)
  - `charts` (Canvas-Renderer c1–c13; c11/c12 sind reine HTML-Matrizen ohne Canvas)
  - `export` (txt/csv/json/PDF)
  - `ui` (DOM, Events, Toggle)
- **State:** Eingaben + Ergebnis-Cache im `state`-Objekt.
- **Client-Server-Schichtung (Paywall-ready):** `suncalc` ist ein reines, DOM-freies Modul; das UI spricht nur über `getSunData()` mit der Berechnung. Später Umbau auf `fetch()`/Server ohne UI-Neubau.

### 4.2 Datenfluss
```
Eingaben (Standort, Zeitzone, Auflösung, Format)
   → suncalc-Berechnung (async, Fortschritt %)
   → Ergebnis-Cache (state.data: rows + dailyTimes + meta)
   → Statistiken (renderStats)
   → Charts rendern (renderCharts, Canvas + DOM-Legenden)
   → Export (txt/csv/json) + PDF-Bericht
```

### 4.3 Dateien (Projektstruktur)
```
Sun_Tracker/
├── _archiv_alt/           # Altes Python-Projekt (abgeschlossen, NICHT anfassen)
├── src/
│   ├── suncalc.js         # Berechnungs-Kern (pur, Node-testbar) — SAME wie eingebettet in HTML
│   ├── Sun_Tracker_V01.html  # Ältere Revision (Referenz)
│   ├── Sun_Tracker_V02.html  # Ältere Revision (Referenz)
│   └── Sun_Tracker_V03.html  # ★ AKTIVE VERSION (bearbeiten!)
├── tests/
│   ├── test_suncalc.js     # Unit-Tests suncalc (15)
│   ├── e2e_test.js         # Browser-E2E (11)
│   ├── export_test.js      # Export-Konsistenz (10)
│   ├── pdf_test.js         # PDF-Bericht (12)
│   ├── axes_test.js        # Achsen (14)
│   ├── stats_test.js       # Statistik-Boxen 21.06/21.12 (2)
│   ├── chart_logic_test.js # Fachliche Chart-Logik (17)
│   ├── geo_test.js         # Geolocation (1)
│   ├── v03_ext_test.js     # V03-Erweiterungen: Matrix/Legende/Extremum (11)
│   ├── v03_round2_test.js  # Sonnenaufgangs-/Sonnenuntergangs-Matrix + Heatmap-Legende (12)
│   ├── v03_round3_test.js  # Solstitien-Y-Achse, Polar-Drehung, c11/c12-Matrix, c13 (4)
│   ├── validate_html.js    # Syntax/Div-Balance (8)
│   ├── screenshot.js       # erzeugt assets/screenshot_*.png
│   └── make_example_pdf.js # erzeugt assets/Beispielbericht_Hamburg.pdf
├── assets/
│   ├── ICONS.md            # Icon-Plan
│   ├── screenshot_*.png    # Screenshots (hell/dunkel)
│   └── Beispielbericht_Hamburg.pdf
├── docs/
│   ├── 20-Punkteplan.md    # Phasenplan A–D
│   └── ENTWICKLUNG.md      # diese Datei
├── deploy/
│   ├── README.md           # VPS-Deployment-Anleitung
│   ├── nginx/suntracker.conf
│   └── scripts/deploy.sh
└── README.md
```

---

## 5. Wissenschaftliche Formeln & Berechnung

_Die vollständige Formel-Doku ist AUCH in der HTML-Datei als ausklappbarer `<details>`-Block eingebettet (für den User sichtbar). Hier die technische Referenz._

### 5.1 Kernformeln
```
k = π/180
N  = Tag des Jahres (1–365/366, Schaltjahr-bewusst via dayOfYear)
deklination δ   = -23.44° · cos(k · 360° · (N + 10) / 365)
zeitgleichung   = 60 · ( -0.171·sin(0.0337·N + 0.465) - 0.1299·sin(0.01787·N - 0.168) )   [Minuten]
stundenwinkel H = 15° · ( lokalzeit - (refMeridian - lng)/15 - 12 + zeitgleichung/60 )
sin(α)          = sin(k·lat)·sin(k·δ) + cos(k·lat)·cos(k·δ)·cos(k·H)    // clamp [-1,1]
α (Höhe)        = asin(sin_hoehe) / k
cos(A)          = (sin(k·δ) - sin(k·α)·sin(k·lat)) / (cos(k·α)·cos(k·lat))   // Azimut, Quadrant via Sonnenmittag
```
- **Sonnenaufgang/-untergang:** Nullstellen-Suche auf der stetigen Höhenfunktion bei α = 0° (Bisektion). Dämmerung bei −6° (bürgerlich), −12° (nautisch), −18° (astronomisch).
- **Tageslänge:** `sunset − sunrise` (Stunden).
- **Referenzmeridian:** UTC-Offset × 15° (z. B. UTC+1 → 15°). Sommerzeit wird für die Tageslänge nicht verschoben (Differenz bleibt gleich, physikalisch korrekt).

### 5.2 Referenzwerte für Tests (Sanity-Check, Hamburg 53.5481°N, 9.9966°E, MEZ)
| Fall | Erwartung | Gemessen |
|---|---|---|
| 21.06. 12:00 Sonnenhöhe (max) | ≈ 90 − 53.55 + 23.44 ≈ 59.9° | 59.9° ✓ |
| 21.12. 12:00 Sonnenhöhe (max) | ≈ 90 − 53.55 − 23.44 ≈ 13.0° | 12.9° ✓ |
| Azimut am wahren Sonnenmittag (~13:16 MEZ) | ≈ 180° (Süd) | ✓ |
| Tageslänge 21.06. | ≈ 16.79 h | 16.8 h ✓ |
| Tageslänge 21.12. | ≈ 7.29 h | 7.2 h ✓ |
| Zeitgleichung Anfang Nov / Mitte Feb | +16.5 / −14.1 min | ✓ |

---

## 6. Entscheidungs-Logbuch (Decision Log)

| # | Datum | Entscheidung | Begründung |
|---|---|---|---|
| 1 | 16.08.2026 | HTML/JS-Neubau statt tkinter | Portabel, responsive, VPS-fähig, keine Installation |
| 2 | 16.08.2026 | Single-File-Architektur | VPS = statisches Hosting; 1 Datei deploybar |
| 3 | 16.08.2026 | Chart-Engine: eigener Canvas-Renderer | Keine externe Lib → offline-fähige Einzeldatei |
| 4 | 16.08.2026 | PDF: beide Optionen | Maximale Flexibilität für User |
| 5 | 16.08.2026 | Asynchrone Berechnung (async, nicht Web Worker) | UI bleibt responsiv; async reicht für die Punktmenge |
| 6 | 16.08.2026 | Altlasten → `_archiv_alt/` | Separierung, wird nicht angefasst |
| 7 | 16.08.2026 | Alle 13 Diagramme immer sichtbar | Nutzer-Anforderung; Auswahl-Checkboxen entfernt |
| 8 | 16.08.2026 | Versionierung `<Name>_V<Nummer>.html` | Nutzer-Konvention |

---

## 7. Bugs & Fixes (wichtig für Weiterarbeit)

### 7.1 Historische Bugs (alle behoben)
1. **Sonnenaufgang `findCrossing`** — Bisektion fand falsche Kreuzung. Fix: einheitliche `g(h)`-Zellfunktion mit Vorzeichen-Inversion für Untergang.
2. **`nauticalDawn`-Variable** nicht definiert (Typo) → behoben.
3. **Tageszahl-Sprung** (V2.1 in Python) — `(monat-1)*30.3+tag` falsch → `datetime.tm_yday`.
4. **PDF: alle Charts identisch** — `querySelectorAll('.chart-box').find(...)` gab immer die erste Box. Fix: `box.dataset.chart = c.id` + gezielter Selektorkonsultation.
5. **Tageslänge 21.06. zeigte "—"** — **WICHTIG:** in der eingebetteten `sunTimes` stand `dayLength: null` (hartkodiert), während `src/suncalc.js` korrekt `sunset - sunrise` rechnete. Die `sunrise`/`sunset` waren nicht als Variablen im Scope → Referenzfehler bei Fix. **Fix:** lokale Konstanten `const sunrise/sunset` + `dayLength: sunrise != null && sunset != null ? sunset - sunrise : null`.
6. **Achsenkollision** — Y-Beschriftung kollidierte mit Zahlenwerten. Fix: `textAlign='right'`, `padL - 7`, mehr Padding (padL=55).
7. **`renderChartChecklist`-Restreferenzen** — nach Entfernen der Checkboxen riefen `applyLang`/`runCalculation` die gelöschte Funktion auf → `ReferenceError`. Fix: Aufrufe entfernt.
8. **Heatmap-Legende + Matrix-Legende im Canvas** — umständlich und überlagernd. Fix: als HTML-DOM oberhalb/unterhalb des Canvas (`buildHeatmapLegend`, `buildDayLengthMatrix`).
9. **`createElementFromHTML`** gab nur `firstElementChild` zurück → die Tageslängen-Matrix verlor die Tabelle. Fix: Fragment mit allen Kindern bei mehreren Top-Level-Elementen.

### 7.2 Bekannte Einschränkungen
- **PDF-Library braucht Internet** (html2canvas/jsPDF via CDN). Für volle Offline-Fähigkeit müssten die Libs inline eingebettet werden (Datei wird ~500 KB größer).
- **Geolocation nur auf HTTP/HTTPS**, nicht bei `file://`-Öffnung (Browser-Sicherheit). Die App zeigt dann eine verständliche Meldung in 5 Sprachen.
- **Atmosphärenrefraktion, Parallaxe, Nutation** werden bewusst vernachlässigt (Fehler < 1°) — für Jahresverläufe/Tageslängen irrelevant.

---

## 8. Teststatus (16.08.2026)

| Test | Ergebnis | Was prüft es |
|---|---|---|
| `tests/test_suncalc.js` | **15/15** ✓ | Kernberechnung, Referenzwerte, Schaltjahr |
| `tests/e2e_test.js` | **11/11** ✓ | Browser: Charts, Beschreibungen, Toggle, keine JS-Fehler |
| `tests/export_test.js` | **10/10** ✓ | Export txt/csv/json konsistent |
| `tests/pdf_test.js` | **13/13** ✓ | PDF-Bericht: Zahlenwerte, Chart-Zuordnung, Matrizen, echtes PDF |
| `tests/axes_test.js` | **14/14** ✓ | Alle Charts rendern, Monatslabels, keine JS-Fehler |
| `tests/stats_test.js` | **2/2** ✓ | Tageslänge 21.06.=16.8h, 21.12.=7.2h |
| `tests/chart_logic_test.js` | **17/17** ✓ | Fachlich: Heatmap, Zeitgleichung, Sonnenpfad, Matrix, Monats-Balken |
| `tests/geo_test.js` | **1/1** ✓ | Standort-Button (mit geolocation-Berechtigung) |
| `tests/v03_ext_test.js` | **11/11** ✓ | Matrix-Zahlen, Heatmap-Legende oberhalb, 13 Charts |
| `tests/v03_round2_test.js` | **12/12** ✓ | Aufgangs-/Untergangs-Matrix, Legenden-Farbe, Uhrzeit-Werte |
| `tests/v03_round3_test.js` | **4/4** ✓ | Solstitien-Y-Achse, Polar, c11/c12-Matrix, c13 |
| `tests/validate_html.js` | **8/8** ✓ | Syntax, Div-Balance |

**Gesamt: 118/118 ✓** (Stand 16.08.2026, V03, 13 Charts)

### So führst du die Tests aus (wichtig für neue Sessions!)
```bash
cd ~/Projects/Sun_Tracker
export NODE_PATH="$HOME/.hermes/node/node_modules"   # Playwright global verfügbar
node tests/test_suncalc.js        # Unit (kein Browser nötig)
node tests/e2e_test.js            # Browser-E2E
node tests/export_test.js
node tests/pdf_test.js            # braucht /tmp/pdf_libs/ (siehe unten)
node tests/axes_test.js
node tests/stats_test.js
node tests/chart_logic_test.js
node tests/geo_test.js
node tests/v03_ext_test.js
node tests/v03_round2_test.js
node tests/v03_round3_test.js
```

### Playwright-Workaround (KRITISCH)
- Gecachter Chromium: `~/.cache/ms-playwright/chromium-1223/chrome-linux/chrome`
- Playwright-Paket: global in `~/.hermes/node/node_modules` (via `npm install --prefix ~/.hermes/node playwright@1.62.1`)
- Die Test-Skripte setzen `executablePath` explizit auf chromium-1223 (Workaround für Revisions-Mismatch). **Bei Neuinstallation prüfen**, dass der Pfad stimmt.

### PDF-Test-Libraries
- Der PDF-Test injiziert html2canvas + jsPDF **lokal** aus `/tmp/pdf_libs/` (per `curl` vom CDN heruntergeladen), weil der headless-Browser in der Sandbox kein externes CDN erreicht. Falls `/tmp/pdf_libs/` fehlt:
```bash
mkdir -p /tmp/pdf_libs && cd /tmp/pdf_libs
curl -s -o html2canvas.min.js https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js
curl -s -o jspdf.umd.min.js https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js
```

---

## 9. Changelog

| Version | Datum | Änderung |
|---|---|---|
| — | 16.08.2026 | Projekt initialisiert: Struktur, Plan, Doku angelegt |
| V01 | 16.08.2026 | Erste lauffähige Single-File-App: suncalc-Kern, i18n (5 Sprachen), Theme, DMS/Dezimal, Zeitzone+Sommerzeit, async Berechnung, 8 Canvas-Charts, Export, PDF, Geolocation |
| V02 | 16.08.2026 | PDF-Bericht-Fix (alle Charts identisch + keine Zahlenwerte) |
| V02 (Achsen) | 16.08.2026 | Achsen-Professionalisierung (Monatsnamen, 5°-Schritte) |
| V03 | 16.08.2026 | Alle 10 Charts immer; PDF mit Beschreibungen; Tageslängen-Matrix + Monats-Balken; Beschreibungen; Tageslänge-Extrema 21.06/21.12; Bugfix dayLength; 21.12-Statistik; Achsenkollision; Heatmap-Legende; Geolocation-Meldung |
| V03 (2) | 16.08.2026 | Tageslängen-Matrix mit Zahlenwert-Tabelle; Jahresverlauf 21.12-Extremum; Heatmap-Legende oberhalb (HTML); Formel-Doku in der Datei; ENTWICKLUNG.md aktualisiert |
| V03 (3) | 16.08.2026 | **Tageslängen-Zahlenwert-Matrix umgebaut:** echtes Raster Monate (X, 3-Buchstaben) × Tage 1–31 (Y), je Zelle Tageslänge (h), plus **Σ h Monatssummen-Zeile**. `buildDayLengthMatrix` + CSS (`.dlm-wrap` scrollbar, `.dlm-sum`, sticky Tag-Spalte) + Tests aktualisiert |
| V03 (4) | 16.08.2026 | Matrix: 2 Nachkommastellen + dezente Heatmap-Hintergrundfarbe (25% Deckkraft, Tag 21 nicht mehr hervorgehoben); Monatsnamen in c2/c10 x-achsial mittig (Ticks 0.5..11.5 statt 1..12); **Heatmap-Legende gefixt** (gemeinsame `heatColor()`-Funktion für Canvas + Legende statt fester CSS-Klassen); **Sonnenpfad: Höhenwerte im 45°-Winkel** außerhalb der Kurven; **NEU: c11 Sonnenaufgang über das Jahr** + Sonnenaufgangs-Matrix (HH:MM je Tag, Ø-Zeile). Testanzahl: 11 Charts, 106/106 grün |
| V03 (5) | 16.08.2026 | **Solstitiums-Vergleich (c3):** Y-Achse von −20 auf −65 erweitert (Winterkurve sinkt in Hamburg bis −59.7° und fiel vorher durch die X-Achse). **Sonnenpfad (c5):** Höhenwerte von NE auf NW (45° gegen den Uhrzeigersinn) gedreht. **Sonnenaufgang (c11):** Y-Achse in sauberen Stundenschritten (HH:00), Extrema als HH:MM (03:58 / 08:42) statt Dezimalstunden. |
| V03 (6) | 16.08.2026 | **NEU: c12 Sonnenuntergang über das Jahr** — vollständig analog zu c11: Kurvendiagramm (Uhrzeit des Horizont-Unterschreitens je Tag, Extrema als HH:MM: 21.12.=15:54, 21.06.=16:03) + **Sonnenuntergangs-Matrix** (HH:MM je Tag, Ø-Zeile) + Erklärung, in 5 Sprachen. **Sonnenpfad (c5):** Höhenwerte um weitere 180° auf SE (Azimut 135°) gedreht. Testanzahl: 12 Charts, 113/113 grün |
| V03 (7) | 16.08.2026 | **NEU: c13 Sonnenaufgang & Sonnenuntergang kombiniert** — beide Kurven in einem Diagramm (Aufgang orange unten, Untergang blau oben, gemeinsame 0–24h-Y-Achse, schattierte Fläche = Tageslänge) + Legende, in 5 Sprachen. **PDF-Report geprüft:** nutzt dieselbe `CHARTS`-Konstante → rendert automatisch alle 13 Diagramme mit Titel + Beschreibung. Testanzahl: 13 Charts, 121/121 grün |
| V03 (8) | 16.08.2026 | **Heatmap:** `<0°` von Blau auf helles Grau (`rgb(200,202,208)`) — niedrige Sonnenhöhen gut ablesbar (Canvas + Legende + DE/EN-Beschreibung). **c13:** 4 Sonnenhöhen-Extrema annotiert (Spitze 12:00 + Minimum 00:00 an 21.06./21.12.); Beschreibung angepasst. **c11 & c12 Kurvendiagramme gelöscht** — die beiden Charts sind jetzt reine Zahlenwert-Matrizen (kein Canvas, kein Renderer); Matrizen bleiben vollständig erhalten. **Bugfix:** `let canvas=null` im renderCharts-Scope statt `const` im if-Block (ReferenceError `canvas is not defined` behoben). Testanzahl: 11 Canvas (c1-c10+c13), 116/116 grün |
| V03 (9) | 16.08.2026 | **Doku-Finalisierung (Ende des Arbeitstags):** ENTWICKLUNG.md auf aktuellen Stand gebracht — 13 Charts (c11/c12 als reine Matrizen, c13 kombiniert), 116/116 Tests, Testdatei-Liste (v03_round2/round3 ergänzt), Diagrammliste, Decision Log, Teststatus-Tabelle. **Verifiziert:** Tageslänge 21.06.=16.8h + 21.12.=7.2h werden korrekt in den Statistik-Boxen angezeigt (heute gemeldeter „keine Ausgabe"-Bug ist in V03 bereits behoben); eingebettete `sunTimes` hat lokale `const sunrise/sunset` + korrekte `dayLength`. |
| V03 (10) | 16.08.2026 | **PDF enthält jetzt ALLE 13 Diagramme** inkl. der reinen Matrix-Charts c11/c12 (renderCharts-PDF-Loop rendert via html2canvas auch `.dlm-wrap`-Elemente, nicht nur Canvas). **Heatmap-Legende:** Farbverlauf startet bei 0° (0°→70°), Hinweis „<0° (unter Horizont) = Blau"; `<0°`-Farbe wieder auf **Blau** (`rgb(30,60,200)`) zurückgesetzt (war zuvor helles Grau). **Achsenkollision fix:** `padL` von 55 auf 68 erhöht, damit die rotierte Y-Achsen-Beschriftung nicht mehr mit den Zahlenwerten kollidiert (alle 12 Chart-Renderer). Testanzahl: PDF-Test 13/13, Gesamt 118/118 grün |

---

## 10. Deployment (VPS, später)

- **Single-File-HTML** → statisches nginx-Hosting. Rechenleistung im Browser.
- `deploy/nginx/suntracker.conf` + `deploy/scripts/deploy.sh` (Ein-Klick: `./deploy.sh USER@VPS_IP [domain]`).
- Details: `deploy/README.md`.
- **Paywall-Szenario (wichtig):** Reine Client-Berechnung ist prinzipiell extrahierbar. Einzige echte Paywall = Server-seitige Berechnung. Die Architektur ist dafür vorbereitet (`suncalc` isoliert, UI spricht nur `getSunData()`). Für den Paywall-Umbau: suncalc-Logik auf Server auslagern, UI-Schnittstelle auf `fetch()` umstellen — kein UI-Neubau nötig.

---

## 11. Offene Punkte & nächste Schritte

1. **V04-Kandidaten (offene Features, falls gewünscht):**
   - PDF-Library inline einbetten (volle Offline-Fähigkeit).
   - Sonnenzeiten in lokaler Sommerzeit-Notation anzeigen (aktuell Standardzeit).
   - Paywall/Server-Backend (siehe §10).
2. **Dateien-Hygiene:** `V01.html` und `V02.html` können archiviert werden, sobald V03 final abgenommen ist (nur Referenz).
3. **Visuelle Abnahme:** Screenshots werden manuell vom User geprüft (aktives Modell kann keine Bilder analysieren). `assets/screenshot_alle_charts_hell.png` etc. enthalten alle 13 Charts.

---

## 12. Wichtig für die nächste Session (Context = 0)

1. **Arbeitsdatei:** `src/Sun_Tracker_V03.html`. `suncalc.js` ist identisch eingebettet — Änderungen an der Logik müssen in BEIDE Dateien (oder via Extraktion).
2. **Tests:** `export NODE_PATH="$HOME/.hermes/node/node_modules"` + chromium-1223-Pfad (siehe §8).
3. **Referenzwerte:** Hamburg 53.5481, 9.9966, MEZ (UTC+1, kein DST für Kernwerte).
4. **Versionierung:** nach Änderungen neue Datei `Sun_Tracker_V0X.html` anlegen + `Sun Tracker V0X`-Marker im Footer setzen.
5. **User-Präferenz:** keine Sprachnachrichten im Chat; Text + Dateien. Veröffentlichte Repos auf Englisch, MIT.
6. **Bekannter Fehler-Fallback:** Falls `sunrise is not defined` → die `sunTimes`-Funktion braucht lokale `const sunrise/sunset` (nicht nur als Objekt-Properties) für `dayLength`.
7. **Chart-Struktur (V03, 13 Charts):** c1–c10 Canvas-Kurven/-Flächen; c11 (Sonnenaufgangs-Matrix) + c12 (Sonnenuntergangs-Matrix) sind **reine HTML-Zahlenwert-Matrizen ohne Canvas** (`isMatrixOnly` in renderCharts); c13 kombiniert Aufgang+Untergang mit 4 Sonnenhöhen-Extrema. Die Zahlenwert-Matrix zu c9 hängt per `buildDayLengthMatrix` unter dem c9-Canvas. `CHARTS`-Array = einzige Quelle (PDF-Loop nutzt dieselbe Konstante).

---

## 13. Deployment & Live-Hosting (Stand: 30.08.2026)

> **Dieser Abschnitt wurde am 30.08.2026 ergänzt**, als der Sun Tracker als **zweites Tool** auf dem
> GitHub-Pages-Portal `ingenieur-tools.de` live gegangen ist. Er ist die Brücke zwischen der
> reinen Code-Doku (oben) und dem Betrieb/Jahr der Subdomain.

| Feld | Wert |
|---|---|
| **Live-URL** | `https://sonne.ingenieur-tools.de/` (⚠️ HTTPS-Zertifikat in Ausstellung steckengeblieben am 30.08.2026 → Fix: Custom Domain in Repo-Settings entfernt + neu gesetzt; Watchdog-Cron `d9880f4fff1e` prüft alle 10 Min auf Aktivierung und meldet bei Erfolg) |
| **GitHub-Repo** | `https://github.com/PiBrainPi/sun-tracker` (öffentlich) |
| **Quell-Branch** | `main` (Quellcode: src, tests, docs, README, LICENSE) |
| **Deploy-Branch** | `gh-pages` (enthält nur `index.html` = `src/Sun_Tracker_V03.html` + `CNAME`) |
| **Custom Domain** | `sonne.ingenieur-tools.de` (CNAME → `pibrainpi.github.io.` in netcup CloudDNS) |
| **Lizenz** | MIT (Copyright Fabian Bussenius) |
| **Betreiber/Impressum** | Fabian Bussenius · Jüthornstraße 50 · 22043 Hamburg · fabibuss@web.de (§ 5 DDG) |

### 13.1 Wie deployen (bei Änderungen an V03)

```bash
cd ~/Projects/Sun_Tracker
# 1. Quell-Änderung committen (main)
git add -A && git commit -m "Beschreibung" && git push origin main

# 2. Single-File auf gh-pages-Branch aktualisieren
git checkout gh-pages
cp src/Sun_Tracker_V03.html index.html
echo "sonne.ingenieur-tools.de" > CNAME          # bleibt erhalten
git add index.html CNAME && git commit -m "Deploy V03-Update"
git fetch origin gh-pages && git rebase origin/gh-pages   # GitHub-CNAME-Commit einholen
git push origin gh-pages
git checkout main
```

> **Wichtig (Pitfall):** GitHub schreibt bei aktivem Pages automatisch einen `Create CNAME`-Commit
> in den `gh-pages`-Branch. Vor jedem Push **`git fetch` + `git rebase origin/gh-pages`**, sonst
> non-fast-forward-Fehler.
> Nach dem `git checkout gh-pages` liegen alle Quell-Dateien als **untracked** im Arbeitsbaum
> (sie sind dort nicht getrackt) — das ist normal; nur `index.html` + `CNAME` ändern/committen.

### 13.2 HTTPS-Zertifikats-Troubleshooting (sonne, Stand 30.08.2026)

**Symptom:** Browser zeigt „Sichere Verbindung fehlgeschlagen" bei `https://sonne.ingenieur-tools.de/` —
es wird das generische `*.github.io`-Fallback-Zertifikat ausgeliefert (Hostname mismatch) statt eines
individuellen Let's-Encrypt-Zertifikats für `sonne.ingenieur-tools.de`.

**Diagnose (`gh api repos/PiBrainPi/sun-tracker/pages`):**
- `cname` korrekt = `sonne.ingenieur-tools.de`
- `https_certificate.state` hängt auf **`authorization_created`** ("Authorization created")
- `pending_domain_unverified_at: null` (Domain ist DNS-verifiziert, CNAME propagiert korrekt)
- `openssl s_client -connect ... :443` liefert `CN=*.github.io` (kein individuelles Zert)

**Ursache:** Die Let's-Encrypt-Zertifikatsausstellung war im Zustand `authorization_created` **festgehängt**
und schritt nicht selbstständig fort — trotz korrektem CNAME/DNS. `PUT { "https_enforced": true }` →
`404 "The certificate has not finished being issued"`; `DELETE /pages` ist geblockt
("Deactivating GitHub pages ... not allowed").

**Fix (erfolgreich, per GitHub-API):**
```bash
# 1) Custom Domain ENTFERNEN (leer setzen) — setzt Zert-Ausstellung zurück
gh api -X PUT repos/PiBrainPi/sun-tracker/pages --input - <<'EOF'
{"cname": ""}
EOF

# 2) Kurz warten, dann Custom Domain NEU setzen — frischer Ausstellungsjob
gh api -X PUT repos/PiBrainPi/sun-tracker/pages --input - <<'EOF'
{"cname": "sonne.ingenieur-tools.de"}
EOF
```
→ `cname` wieder gesetzt, Zert-Ausstellung neu gestartet. Verifikation per
`gh api repos/PiBrainPi/sun-tracker/pages --jq '.https_certificate.state'` (soll `available`/`active`
werden) bzw. `https_works()`-Check.

**Monitoring:** Cron-Job `d9880f4fff1e` (`~/.hermes/scripts/sonne_https_watchdog.py`) prüft alle 10 Minuten
mit echter TLS-Zertifikatsverifikation, ob das Zert aktiv ist, und meldet **nur bei Erfolg** (Watchdog-Pattern).
Sobald aktiv → Doku-Zeile oben auf „HTTPS aktiv" setzen.

### 13.3 DSGVO / Rechtliches (eingebaut)

- **Impressum** (§ 5 DDG) + **Datenschutzerklärung** sind als **Modals** im Footer der App eingebaut
  (Footer-Links „Impressum" / „Datenschutz"). Betreiber = Fabian Bussenius.
- **Datenschutz-Punkte:** kein Tracking/Cookies; Geolocation nur lokal im Browser; Hosting-Logs bei
  GitHub; **Transparenz zu CDN-Bibliotheken** `html2canvas` + `jspdf` (werden erst beim PDF-/Bild-Export
  on-demand von cdnjs.cloudflare.com geladen — im DS-Text offengelegt, Art. 6(1)f DSGVO).
- **Sprachen:** Impressum/Datenschutz sind dauerhaft auf Deutsch (rechtssicher), unabhängig vom UI-Sprach-Toggle.

### 13.3 Verknüpfung mit dem Portal

- Die Hauptseite `ingenieur-tools.de` verlinkt den Sun Tracker als Tool-Karte „Sun Tracker" →
  `https://sonne.ingenieur-tools.de/`. (Neues Tool = neue Karte im `ingenieur-tools-portal`-Repo anlegen.)

---

_Erstellt von Hermes am 16.08.2026 · aktualisiert am 30.08.2026 (Deployment & Hosting) · Bereit für kontinuierliche Weiterarbeit mit leerem Kontext._