# Sun Tracker — Sun Height Calculator

A modern **single-file web app** for computing solar position data (sun height, azimuth,
rise/set, twilights, day length) for any location and any day of the year. Successor to a
Python/tkinter version from 2020.

**🌐 Live:** [https://sonne.ingenieur-tools.de/](https://sonne.ingenieur-tools.de/)

## Features

- **Sun height & azimuth** at a selectable time resolution
- **Sunrise, sunset & twilight phases** (civil / nautical / astronomical)
- **10 scientific charts**: annual course, monthly statistics, solstice comparison,
  solar path, day length, equation of time, heatmap, day-length matrix + monthly bars
- **Day-length matrix** with monthly averages and 21.06. / 21.12. values
- **Data export** as `.txt` / `.csv` / `.json`
- **Professional PDF report** (all charts + descriptions)
- Optional **geolocation** (processed locally in the browser, not stored or transmitted)

## Privacy (DSGVO-compliant)

The app is fully client-side. It sets **no tracking cookies**, uses **no analytics**, and
stores **no personal data**. The CDN libraries (`html2canvas`, `jspdf`) are loaded on demand
only when an export is requested. Impressum + privacy policy are embedded in the app footer.

## Project structure

```
sun-tracker/
├── src/
│   ├── suncalc.js         # Pure calculation core (Meeus/NOAA), testable
│   └── Sun_Tracker_V04_2026-08-31.html   # ★ ACTIVE single-file app (DSGVO v2; V01–V03 older)
├── tests/                 # Automated tests & reference values (96 checks)
├── docs/ENTWICKLUNG.md    # Full project documentation (German)
├── assets/                # Icons, screenshots, example PDF (gitignored)
├── LICENSE                # MIT License
└── README.md
```

## Quick start (local)

1. Open `src/Sun_Tracker_V04_2026-08-31.html` in a browser (double-click is enough).
2. No server, no build, no installation required.

## Tech

- **Structure:** Single file (all in one `.html`)
- **UI languages:** German · English · Spanish · Portuguese · Mandarin
- **Themes:** light/dark, switchable (sun/moon toggle)
- **Charts:** custom Canvas renderer (offline-capable, no external chart library)
- **Calculation:** `suncalc` module (Meeus/NOAA algorithms, spherical astronomy)

## License

MIT — see [LICENSE](LICENSE). © 2026 Fabian Bussenius.