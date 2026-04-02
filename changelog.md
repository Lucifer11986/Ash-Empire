# 📋 Versionsübersicht — Ash & Empire

---

## [1.1.0] — 2026-04 — Performance & Dokumentation

### Performance
- **hasInfra() O(1) Cache** — Set-basierter Infrastruktur-Cache statt `buildings.some()` pro Bürger/Feind jeden Frame
- **Happiness-Block refactored** — 12 separate `filter()`-Aufrufe durch einen einzigen `forEach`-Pass ersetzt
- **Buff-Flags gecacht** — `monument`/`school`-Prüfung für alle Bürger gemeinsam gecacht (60-Tick-Intervall)
- **Tower-Liste gecacht** — Turm-Array nur bei Bauen/Abreißen neu aufgebaut
- **FloatingText konsolidiert** — Marktplatz & Theater zeigen Gesamtsumme statt N einzelner Texte
- **Animal flee-Throttle** — Bürgernähe-Scan bei Tieren von jedem Frame auf alle 10 Frames reduziert
- **Rock-Count Single-Pass** — Erz-Zählung durch einen `forEach` statt 3× `filter()`
- **Cache-Invalidierung** — alle Caches werden gezielt bei `placeBuilding()` und `demolishSelected()` geleert

### Dokumentation
- Werft & Schiff-System als implementiert dokumentiert (war fälschlich als "geplant" markiert)
- Mod-System vollständig dokumentiert
- Gesellschaftsgebäude (Kapelle, Tempel, Schule, Theater etc.) in alle Docs aufgenommen
- Bekannte Einschränkungen aktualisiert

---

## [1.0.0] — 2026-04 — Feature-Complete Alpha

### Neu
- **Chunk-basiertes Rendering** — 10×10 Chunks, nur sichtbare gerendert (~91% Objekte deaktiviert)
- **Katastrophen** — Feuer 🔥, Seuche 🤒, Erdbeben 🌋 (ab Epoche 2, zufällig alle ~2-4 Min)
- **Bosse** — alle 5 Wellen: Plünderer / Mauerbrecher / Kriegsherr, lila Aura, Gold-Belohnung
- **Diplomatiesystem** — Reisende Händler, Handelsrouten, Bündnisse, Tributzahlung
- **Werft & Handelsschiffe** — Schiffe legen ab, fahren zum Kartenrand, kehren mit Waren zurück; Piratencheck; Cooldown 1200 Ticks
- **Gesellschaftsgebäude** — Kapelle, Tempel, Heilstätte, Marktplatz, Park, Schule, Theater, Rathaus
- **Tutorial erzwungen** — Weiter gesperrt bis Aufgabe erledigt, Highlights + Pfeile
- **Straßen** — Terrain-Anpassung, Drag-to-build, 2er-Raster
- **Mod-System** — JSON-Codes für Ressourcen, Epoche, Forschung, Cheats, Produktionsgeschwindigkeit
- **Neue Sounds** — 10 neue Sound-Events

### Fixes
- Nahrungslogik: alle 6 Quellen werden gezählt (Hunger-Bug behoben)
- UNEMPLOYED bleiben bei Hunger aktiv
- Statistiken zählen keine Straßen/Pfade als Gebäude

---

## [0.9.0] — 2026-03 — Performance & UI

### Neu
- LOD-System, Fische, Kollisionserkennung, Ressourcen-Trend, Nacht-Skip, Tutorial

---

## [0.8.0] — 2026-03 — Belagerungs-KI & Jahreszeiten

### Neu
- Belagerungs-KI (3 Verhaltensweisen), Multi-Seiten-Spawn, Jahreszeiten-Visuals

---

## [0.7.0] — 2026-03 — Truppen-System

### Neu
- Soldaten, Ritter, Bogenschützen, Kaserne, Schießstand

---

## [0.6.0] — 2026-03 — Statistik & Forschung

### Neu
- Stats-Panel, Forschungsbaum (10 Technologien)

---

## [0.4.0] — 2026-03 — Gegner & Wellen

### Neu
- 3 Fraktionen, Wellen-System ab Epoche 3

---

## [0.3.0] — 2026-03 — Jahreszeiten & Wetter

### Neu
- 4 Jahreszeiten, Schnee, Dürre, saisonale Farben

---

## [0.1.0] — 2026-02 — Grundsystem & Datei-Aufteilung

### Neu
- 7 Dateien, Firebase Cloud-Save, prozedurales Terrain, Bürger-KI