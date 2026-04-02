# ⚔️ Ash & Empire

> Ein browserbasiertes 3D-Aufbauspiel entwickelt mit BabylonJS

![Version](https://img.shields.io/badge/Version-1.1.0-purple)
![Status](https://img.shields.io/badge/Status-In%20Entwicklung-orange)
![Engine](https://img.shields.io/badge/Engine-BabylonJS-blue)

---

## 🎮 Über das Spiel

Ash & Empire ist ein browserbasiertes 3D-Aufbauspiel in dem du eine Siedlung von einem kleinen Dorf zu einem mächtigen Imperium aufbaust. Verwalte Ressourcen, erforsche Technologien, bilde Truppen aus, handle mit Fraktionen und verteidige dich gegen feindliche Wellen — inklusive mächtiger Bosse.

---

## 🚀 Schnellstart

1. Repository klonen
2. `index.html` mit **VS Code Live Server** öffnen
3. Datenschutz bestätigen → **SPIEL STARTEN**
4. Tutorial folgen → Zentrum platzieren → losspielen

> ⚠️ Muss über lokalen Webserver laufen (nicht direkt als Datei öffnen)

---

## 🗂️ Projektstruktur

```
Ash-Empire/
├── index.html        — UI, CSS, Startseite mit Slideshow
├── game.js           — GameState, window.Game, alle Systeme
├── entities.js       — Enemy, Animal, Citizen Klassen
├── buildings.js      — Gebäude-Definitionen + 3D-Geometrien
├── cloud.js          — Firebase Cloud-Save (ES-Modul)
├── sfx.js            — Sound-System (Web Audio API)
├── noise.js          — Perlin Noise + Textur-Generator
```

---

## 🎯 Spielprinzip

### Epochen
| Epoche | Name | Besonderheiten |
|--------|------|----------------|
| I | Frühzeit | Ressourcen sammeln, erste Gebäude |
| II | Mittelalter | Industrie, Mauern, Truppen, Katastrophen möglich |
| III | Hochmittelalter | Feinde, Forschung, Bosse |
| IV | Imperium | Kriegsherr-Boss, volle Stärke |

### Epoche-Upgrades (am Zentrum)
| Von → Nach | Kosten |
|-----------|--------|
| I → II | 200 Holz · 150 Stein · 80 Bretter |
| II → III | 350 Stein · 150 Ziegel · 80 Eisen |
| III → IV | 800 Gold · 300 Ziegel · 300 Eisen |

### Ressourcen
Holz · Stein · Gold · Lehm · Kohle · Eisen · Weizen · Mehl · Bretter · Ziegel · Werkzeuge · Waffen · Nahrung (6 Arten: Essen, Fleisch, Fisch, Obst, Käse, Gemüse)

### Jahreszeiten
🌸 Frühling → ☀️ Sommer → 🍂 Herbst → ❄️ Winter

Jede Jahreszeit dauert 8 Tage. Im Winter verdirbt Nahrung (außer mit Forschung "Vorratshaltung"). Im Herbst fallen Laubpartikel.

---

## ⌨️ Steuerung

| Taste | Funktion |
|-------|----------|
| `WASD` | Kamera bewegen |
| `1/2/3` | Spielgeschwindigkeit |
| `Leertaste` | Pause |
| `B` | Bau-Menü |
| `R` | Gebäude rotieren |
| `Rechtsklick` | Abbrechen / Truppe abwählen |
| `Linksklick Truppe` | Auswählen |
| `Linksklick Boden` | Truppe hinschicken |
| `Drag (Straße)` | Straße ziehen |

---

## 🏗️ Gebäude

### 🏠 Siedlung / Infrastruktur
| Gebäude | Epoche | Effekt |
|---------|--------|--------|
| Straße | I | Speed ×2 |
| Brücke | I | Wasserüberquerung |
| Zentrum | I | Epoche-Upgrade, Startgebäude |
| Haus | I | Max Pop +4 (+2 mit Stadtplanung) |
| Lager | I | Kapazität +500 |
| Park | I | Zufriedenheit +6 |
| Kapelle | I | Zufriedenheit +10, Wachstum +20% |

### 🌾 Nahrung & Rohstoffe
| Gebäude | Epoche | Produziert |
|---------|--------|-----------|
| Holzfäller | I | Holz |
| Mine | I | Stein / Eisen / Kohle |
| Lehmgrube | I | Lehm |
| Sammler | I | Nahrung (Beeren) |
| Jäger | I | Fleisch |
| Hafen | I | Fisch (am Wasser) |
| Obstgarten | I | Obst |
| Gemüsegarten | I | Gemüse |
| Kuhherde | I | Milch |
| Schweinestall | I | Fleisch |
| Weizenfarm | II | Weizen |
| Schafherde | II | Wolle |

### ⚙️ Industrie & Verarbeitung
| Gebäude | Epoche | Rezept |
|---------|--------|--------|
| Sägewerk | I | 8 Holz → 15 Bretter |
| Ziegelei | I | 8 Lehm + 3 Holz → 12 Ziegel |
| Mühle | I | 8 Weizen → 12 Mehl |
| Bäckerei | I | 8 Mehl + 2 Holz → 40 Essen |
| Küche | I | Gemüse → Essen |
| Käserei | II | Milch → Käse |
| Schmelze | II | 4 Erz + 4 Kohle → 6 Eisen |
| Förster | II | Pflanzt Bäume nach |
| Werkzeugmacher | III | 4 Eisen + 4 Kohle → 8 Werkzeuge |
| Waffenschmiede | III | 6 Eisen + 6 Holz → 8 Waffen |

### 🏛️ Gesellschaft & Zufriedenheit
| Gebäude | Epoche | Effekt |
|---------|--------|--------|
| Markt | II | Passiv Gold, Händler |
| Taverne | II | Zufriedenheit +15 |
| Tempel | II | Zufriedenheit +20 |
| Heilstätte | II | Seuchen-Resistenz, Zufriedenheit +8 |
| Marktplatz | II | Gold +5/Runde, Händler häufiger |
| Schule | II | Arbeiter +10% Speed |
| Theater | III | Zufriedenheit +25, Gold +10/Runde |
| Rathaus | III | Steuern +20%, Zufriedenheit -5 |
| Monument | IV | Globaler Speed-Buff alle Bürger |

### ⚔️ Militär & Verteidigung
| Gebäude | Epoche | Einheit |
|---------|--------|---------|
| Kaserne | II | Soldaten (10 Waffen) / Ritter (20 Waffen + 10 Eisen) |
| Schießstand | II | Bogenschützen (5 Waffen) |
| Steinmauer | II | Blockiert Feinde (HP 400 / 1200 mit Festungsbau) |
| Wachturm | IV | Feuert Pfeile, Reichweite 40 |

### ⚓ Hafen & Handel
| Gebäude | Epoche | Effekt |
|---------|--------|--------|
| Hafen | I | Fischerei (am Wasser) |
| Werft | II | Handelsschiffe: fahren zum Kartenrand, bringen Gold + Waren zurück |

---

## 🔬 Forschung (10 Technologien)

| Stufe | Tech | Kosten | Effekt |
|-------|------|--------|--------|
| 1 | ⛏️ Bessere Werkzeuge | 100G | Alle Arbeiter +20% Speed |
| 1 | 🌾 Ackerbau | 80G + 50H | Ernte-Multiplikator ×1.5 |
| 1 | 🏠 Stadtplanung | 100G + 50S | +2 Pop pro Haus |
| 2 | 🔥 Schmelzkunst | 150G + 30Ei | Schmelze ×2 schneller |
| 2 | 🛡️ Rüstung | 150G + 50Ei | Wachen-HP ×2 |
| 2 | 🌲 Forstwirtschaft | 120G + 40H | Baumwachstum ×2 |
| 3 | ⚔️ Kriegskunst | 300G + 100Ei | Wellen-Intervall ×1.5 |
| 3 | 🏰 Festungsbau | 250G + 100Z | Mauer-HP ×3 (400→1200) |
| 3 | 📦 Handelsrouten | 300G | Markt-Gold ×2 |
| 3 | 🍞 Vorratshaltung | 200G + 50Z | Kein Nahrungsverderb im Winter |

---

## 🤝 Diplomatie

### Händler
Erscheinen ab Epoche II alle 1200–2000 Ticks (halbiert mit Marktplatz). Bieten 3 zufällige Waren gegen Gold. Bleiben 600 Ticks.

### Bündnisse
| Fraktion | Kosten | Dauer |
|----------|--------|-------|
| Banditen | 150G | 5 Wellen Frieden |
| Orks | 250G | 5 Wellen Frieden |
| Nomaden | 200G | 5 Wellen Frieden |

### Tributzahlung
Kostet `50G + Wellennummer × 20G`. Alle aktiven Feinde ziehen sofort ab.

---

## ⛵ Werft & Handelsschiffe

- Werft braucht mindestens 1 Arbeiter
- Schiff fährt automatisch zum Kartenrand (~15s) und zurück (~15s)
- Mögliche Rückfracht: Gold + Holz · Gold + Eisen · Gold + Bretter · reiner Gewinnlauf · gemischte Waren
- Piratencheck beim Erreichen des Kartenrands (Zufallsereignis)
- Cooldown: 1200 Ticks zwischen Fahrten pro Werft

---

## 👹 Feinde & Bosse

### Normale Feinde (ab Epoche III)
| Typ | HP | Speed | Verhalten |
|-----|----|-------|-----------|
| Bandit | 40 | 0.05 | Schwarm, nähert sich aus zufälligem Winkel |
| Ork | 80 | 0.07 | Mauerbrecher — priorisiert Mauern |
| Nomade | 25 | 0.10 | Infiltration — umgeht Mauern, stiehlt Gold |

### Bosse (alle 5 Wellen)
| Boss | Epoche | HP | Schaden | Besonderheit |
|------|--------|----|---------|--------------|
| 💀 Der Plünderer | II | 300 | 5 | Greift Gebäude an |
| 🪓 Der Mauerbrecher | III | 500 | 10 | Priorisiert Mauern |
| 👑 Der Kriegsherr | IV | 800 | 15 | Heilt Feinde +5 HP / 60 Ticks |

Boss-Belohnung: `Epoche × 100 Gold`

---

## 🌋 Katastrophen (ab Epoche II)

| Event | Effekt | Gegenmaßnahme |
|-------|--------|---------------|
| 🔥 Feuer | Gebäude brennt, Schaden über Zeit | Feuerwehr (geplant), oder warten |
| 🤒 Seuche | 20% Pop stirbt (10% mit Heilstätte), Zufriedenheit -30 | Heilstätte halbiert Dauer + Verluste |
| 🌋 Erdbeben | Gebäude verlieren HP, Kamera-Shake | — |

Erste Katastrophe nach ~3000 Ticks, danach alle 2400–4800 Ticks zufällig.

---

## 🎮 Mod-System

Mods werden als JSON über das Einstellungs-Panel eingegeben:

```json
{
  "resources": { "gold": 9999, "wood": 500 },
  "epoch": 3,
  "research": { "betterTools": true, "warfare": true },
  "cheats": {
    "godMode": true,
    "noEnemies": false,
    "infiniteResources": false,
    "instantBuild": false
  },
  "productionSpeed": 2.0,
  "enemyStrength": 1.5,
  "waveInterval": 600
}
```

---

## ⚙️ Performance-System

| System | Beschreibung |
|--------|-------------|
| Chunk-Rendering | 10×10 Chunks à 100×100 Units — nur sichtbare Chunks aktiv (~91% deaktiviert) |
| LOD-System | Bäume in 3 Skalierungsstufen je Kameradistanz |
| SpatialGrid | O(1) Gebäude-Nachbarschaftssuche per Zellenindex |
| hasInfra-Cache | Set-basierter O(1) Cache statt O(n) Array-Scan pro Bürger |
| Buff-Flags-Cache | Monument/Schule-Prüfung alle 60 Ticks gecacht |
| Tower-Cache | Turmliste nur bei Bauen/Abreißen neu aufgebaut |
| Animal-Throttle | Bürgernähe-Scan alle 10 Frames statt jeden Frame |
| Citizen-Throttling | Bürger-Updates gestaffelt (jeder zweite Frame) |

---

## 🛠️ Technologien

| Bereich | Technologie |
|---------|-------------|
| 3D Engine | BabylonJS 6.x |
| Terrain | Perlin Noise (prozedural, seeded) |
| UI | Tailwind CSS |
| Sound | Web Audio API |
| Cloud | Firebase Firestore (anonyme Auth) |

---

**Entwickler:** Lucifer
**Repository:** https://github.com/Lucifer11986/Ash-Empire
