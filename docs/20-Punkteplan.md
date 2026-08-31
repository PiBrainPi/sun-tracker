# Sun Tracker — 20-Punkteplan (Konzeption → Umsetzung → Test)

> **STATUS (31.08.2026, V04):** Alle Phasen A–D sind umgesetzt. Die aktive Version ist
> `src/Sun_Tracker_V04_2026-08-31.html` (DSGVO-Update: Datenschutz-Modal DE/EN, Drittland/DPF, HmbBfDI,
> Widerspruch, Stand — deployed als `gh-pages`). V03 war der vorherige funktionale Stand. Dieser Plan
> dient als **historischer Referenzplan** — der aktuelle Stand steht in `docs/ENTWICKLUNG.md`. Die hier
> beschriebenen 8 Charts sind inzwischen auf **10** erweitert (c9 Tageslängen-Matrix, c10 Monats-Balken).

Projekt: Neuaufbau des Sonnenstands-Rechners als **Single-File-HTML/JS-Web-App**
Basis: archivierte Python-Version V2.1 (`_archiv_alt/Sonnenstand_20181006_14.py`)
Zielplattform: lokaler Browser + später VPS (statisches Hosting)

Legende: [K] Konzeption · [P] Planung · [U] Umsetzung · [T] Test

---

## Phase A — Konzeption & Anforderungen (abgeschlossen durch Nutzer-Feedback)

**1. [K] Anforderungsanalyse & Scope-Festlegung**
- Kernfunktion (Sonnenhöhe/-azimut pro Tag) aus V2.1 übernehmen
- Kein Feature-Verlust beim HTML-Umbau; Export wird erweitert
- Ergebnis: Lastenheft (siehe docs/LASTENHEFT.md)

**2. [K] Standort & Koordinaten-Formate**
- User kann wählen zwischen **Dezimalgrad** (z. B. 53.5481) und **Grad/Minuten/Sekunden** (z. B. 53°32'53"N)
- Implementierung: Umrechnung DMS ↔ Dezimal in beide Richtungen
- Optional: Browser-Geolocation-Button („Meinen Standort verwenden")

**3. [K] Zeitzonen-Modell**
- UTC-Offset als Dropdown (→ Referenzmeridian = Offset × 15°)
- Sommerzeit-Schalter (keine/automatisch)
- Doku: Zeitzone beeinflusst Plot-Beschriftung, nicht die Astronomie-Basis

**4. [K] Export-Formate der Rohdaten**
- User wählt: `.txt` (Leerzeichen-getrennt, V1.1-kompatibel) | `.csv` (Semikolon, BOM) | `.json`
- Download nativ im Browser (Blob → a[download])

**5. [K] PDF-Bericht — zwei Wege als Option**
- (a) Library: `html2canvas` + `jsPDF` (rendert Charts + Metadaten in mehrseitiges PDF)
- (b) Nativ: Browser-Druck („Als PDF speichern")
- Beide Optionen anbietbar; User wählt Modus

**6. [K] Charts — voller vorgeschlagener Umfang (alle 8)**
1. Jahresverlauf Sonnenhöhe (12 Uhr)
2. Monatsstatistiken (Box-Plot oder Balken)
3. Solstitiums-Vergleich 21.06 vs 21.12 (Sonnenhöhe über den Tag)
4. Solstitiums-Vergleich Azimut (Sonnenhöhe über den Tag)
5. Sonnenpfad-Diagramm (Polar)
6. Tageslänge über das Jahr
7. Zeitgleichung (Equation of Time)
8. Heatmap: Sonnenhöhe × Jahr × Uhrzeit

**7. [K] Zusatzdaten — Sonnenaufgang/-untergang & Dämmerung**
- Berechnung der Nullstellen (Sonnenhöhe = 0) → Auf-/Untergang
- Dämmerungsphasen (bürgerlich −6°, nautisch −12°, astronomisch −18°)
- Zusatzausgabe in Rohdaten + Charts (Tageslänge nutzt das)

**8. [K] UX & Visual Design**
- **Helles Standard-Theme** + **dunkles Theme**, umschaltbar
- **Runder Toggle-Button Sonne/Mond** für Theme
- **Runder Toggle-Button mit Länderflagge** für Sprache
- Sprachen: Deutsch, Englisch, Spanisch, Portugiesisch, Mandarin
- Responsive (Desktop/Tablet/Mobile)

---

## Phase B — Technische Planung

**9. [P] Architektur & Ordnerstruktur**
- Single-File `Sun_Tracker_V0X.html` in `src/`
- Ordner: `src/`, `tests/`, `assets/`, `docs/`, `deploy/` (nginx, scripts) — siehe README
- Entscheidung: kein Framework, reines HTML/CSS/JS (Canvas-basiert oder lib? → siehe Punkt 10)

**10. [P] Chart-Engine-Auswahl**
- Option A: nativer Canvas (kein externer Code, aber mehr Aufwand für Achsen/Box-Plots)
- Option B: eingebettete Library (z. B. Chart.js / ECharts) per CDN oder Inline
- Bewertung Single-File: ECharts/Chart.js per CDN = braucht Internet; Inline = voluminös
- Empfehlung für echte Offline-Einzeldatei: **eigener Canvas-Renderer** für die 8 Diagramme

**11. [P] Internationalisierung (i18n)**
- Übersetzungs-Strings zentral als Objekt `I18N = { de: {...}, en: {...}, ... }`
- Sprache setzt `document.documentElement.lang` + ersetzt alle Texte
- Anzahl/Zeit-/Zahlenformat-Lokalisierung

**12. [P] Berechnungsmodul (Kern)**
- Port der V2.1-Formeln nach JS (DeKLination, Zeitgleichung, Stundenwinkel, Azimut)
- Erweiterung: Sonnenauf-/untergang via Nullstellen-Suche
- Saubere Trennung: `suncalc.js`-Modul, getrennt von UI

**13. [P] Performance & Asynchronität**
- 1-Min-Auflösung = 525.600 Datenpunkte
- Berechnung in **Web Worker** (asynchron) → UI bleibt responsive
- **Fortschrittsanzeige** (Progress-Bar + Prozent) über postMessage
- Abbrechbarkeit der laufenden Berechnung

**14. [P] Export- & PDF-Pipeline**
- Blob-Erzeugung für txt/csv/json
- PDF: html2canvas+jsPDF eingebunden ODER native Druck-View
- Bericht enthält: Deckblatt, Statistik, Charts, Datenanhang

**15. [P] VPS-Readiness (jetzt schon mitdenken)**
- App ist rein statisch → deploybar ohne Build
- `deploy/nginx/` = fertige Server-Config-Vorlage
- `deploy/scripts/` = Deploy-Skript (scp/rsync + Reload)
- Optional später: PWA (manifest + Service Worker) nachrüstbar

---

## Phase C — Umsetzung

**16. [U] Kern-Module implementieren**
- `suncalc.js`: Astronomie + Auf-/Untergang + Dämmerung (pure Funktionen)
- `i18n.js`: Übersetzungen
- UI: Eingabeformular (Standort, Koordinaten-Typ, Zeitzone, Auflösung, Export-Format)

**17. [U] Charts & Visualisierung**
- Canvas-Renderer für die 8 Diagrammtypen
- Achsen, Legenden, Annotationen, Nacht-Schattierung, responsives Resize

**18. [U] Export + PDF + Theme/Language-Toggle**
- Download-Handler (txt/csv/json)
- PDF-Generierung (beide Modi)
- Theme- und Sprach-Toggle (runde Buttons, persistente Auswahl via localStorage)

---

## Phase D — Test & Verifikation

**19. [T] Automatisierte Tests (Plausibilität)**
- Unit-Tests der `suncalc`-Formeln gegen bekannte Referenzwerte:
  - 21.06. (Mittsommer): Maximalsonnenhöhe ≈ 90° − Breitengrad + 23.44°
  - 21.12. (Wintersonnenwende): ≈ 90° − Breitengrad − 23.44°
  - DMS ↔ Dezimal-Konvertierung (Hamburg 53°32'53"N 9°59'35"E ≈ 53.5481, 9.9931)
  - Zeitzonen-Referenzmeridian-Fälle
  - Grenzwerte: Breitengrad ±90, Längengrad ±180, Sonne im Zenit (Azimut-Fallback)
- Validierung: Jahresverlauf ist glatt (kein Sprung an Monatsgrenzen — der V2.1-Bug darf nicht zurückkehren)

**20. [T] End-to-End-Test & Abnahme**
- Browser-Smoke-Test aller 8 Charts + Export + PDF + Toggle
- Verifikation: Zahlen in CSV/JSON stimmen mit Charts überein
- Bugfix-Schleife + Dokumentation der Pitfalls
- Abschluss: Bereit für lokale Nutzung + VPS-Deployment

---

## Übersicht Phasen & Punkte

| Phase | Punkte | Zweck |
|---|---|---|
| A Konzeption | 1–8 | Was bauen wir? Anforderungen final |
| B Planung | 9–15 | Wie bauen wir es? Architektur |
| C Umsetzung | 16–18 | Code schreiben |
| D Test | 19–20 | Harte Verifikation & Abnahme |

**Stand:** 16.08.2026 · Plan genehmigt, Implementierung noch nicht gestartet.