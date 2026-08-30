# Assets / Icons (geplant)

Für die HTML-App werden folgende Assets benötigt. Da die App als **Single-File** ausgeliefert
werden soll (nur eine `Sun_Tracker_V0X.html` für VPS), werden SVG-Icons **inline** in die HTML
eingebettet statt als separate Dateien. Dieser Ordner `assets/` dient daher als **Quellverzeichnis**
für die Icons in voller Größe; die finalen Versionen landen als Inline-SVG in der App.

## Theme-Toggle (Sonne/Mond)
- Sonne: Kreis mit Strahlen (SVG)
- Mond: Sichel (SVG)
- Rund-Button mit weichem Schatten

## Sprach-Toggle (Länderflaggen)
- **Deutsch** 🇩🇪 (schwarz-rot-gold)
- **Englisch** 🇬🇧 (Union Jack)
- **Spanisch** 🇪🇸 (rot-gelb-rot)
- **Portugiesisch** 🇵🇹 (grün-rot)
- **Mandarin** 🇨🇳 (rot mit Stern)

Hinweis: Emoji-Flaggen sind plattformabhängig (Windows zeigt keine 🇩🇪-Emoji).
Für konsistente Darstellung überall sollten die Flaggen als **Inline-SVG** gezeichnet werden
(rechteckige Farbbalken + einfache Symbole). Das ist die professionelle Lösung.