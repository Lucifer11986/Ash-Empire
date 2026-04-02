# 📚 Technische Dokumentation — Ash & Empire v1.1.0

---

## Architektur

```
index.html → sfx.js → noise.js → buildings.js → entities.js → game.js → cloud.js (module)
```

| Objekt | Datei | Zweck |
|--------|-------|-------|
| `window.Sfx` | sfx.js | Sound-System |
| `Noise` | noise.js | Perlin Noise |
| `TextureGen` | noise.js | Dynamische Texturen |
| `BUILDINGS` | buildings.js | Gebäude-Definitionen |
| `MeshFactory` | buildings.js | 3D-Geometrien |
| `SpatialGrid` | game.js | O(1) Gebäude-Suche |
| `ChunkGrid` | game.js | Chunk-basiertes Rendering |
| `GameState` | game.js | Globaler Spielzustand |
| `window.Game` | game.js | Hauptcontroller |
| `Enemy` | entities.js | Gegner + Boss |
| `Animal` | entities.js | Tiere |
| `Citizen` | entities.js | Bürger |

---

## GameState (vollständig)

```javascript
{
  resources: {
    wood, stone, food, gold, clay, coal, wheat, meat, fish,
    planks, bricks, flour, iron, tools, weapons,
    fruits, vegetables, milk, wool, cheese
  },
  maxStorage: 2000,
  population: [], buildings: [], enemies: [], animals: [],
  projectiles: [], ships: [],
  mapProps: { trees: [], rocks: [], bushes: [], growingTrees: [] },

  // Zeit & Wetter
  timeOfDay, isNight, isPaused, daySpeed,
  season,        // 0=Frühling 1=Sommer 2=Herbst 3=Winter
  seasonDay,     // 0–7 (seasonLength = 8)
  isDrought, droughtTimer,
  weatherTimer,  // Regen/Schnee-Timer

  // Spielfortschritt
  currentEpoch,  // 1–4
  happiness,     // 0–100
  taxLevel,      // 0=Niedrig 1=Normal 2=Hoch
  isStarving,
  waveNumber, nextWaveTick,

  // Katastrophen
  activeDisaster,    // 'fire' | 'plague' | 'earthquake' | null
  disasterTimer, plagueTimer, nextDisasterTick,

  // Diplomatie
  diplomacy: {
    factions: {
      bandits: { name, icon, allied, allyTimer, tributeCost },
      orks:    { name, icon, allied, allyTimer, tributeCost },
      nomads:  { name, icon, allied, allyTimer, tributeCost },
    },
    nextTraderTick,
    activeTrader,      // { offer[], timer, mesh, target } | null
    tradeRouteIncome,
  },
  diplomacyOpen,

  // Forschung
  research: {
    betterTools, farming, cityPlanning,
    smelting, armor, forestry,
    warfare, fortification, tradeRoutes, foodStorage
  },

  // Infrastruktur
  footTraffic: {},   // "x,z" → Trampelzähler
  paths: Set,        // "x,z" Keys automatisch angelegter Pfade
  taxLevel,
  nightLights: [],   // { light, max, parent }
}
```

---

## window.Game — Methoden

### Kern
| Methode | Beschreibung |
|---------|-------------|
| `init()` | Engine, Kamera, Materialien, Grids, Performance-Caches |
| `start()` | Landschaft generieren, Render-Loop |
| `restartGame()` | Alles zurücksetzen, neue Karte |

### Terrain & Rendering
| Methode | Beschreibung |
|---------|-------------|
| `getHeightAt(x, z)` | Terrain-Höhe (Perlin Noise + Randabfall) |
| `generateLandscape()` | Terrain + Props + Fische + Wasser |
| `snapGroundMeshToTerrain(root, type, x, y, z, isGhost)` | Straßen/Pfade ans Terrain anpassen |
| `updateLOD()` | Chunk-Visibility + LOD alle 30 Ticks |
| `applySeasonVisuals(season)` | Farben, Partikel, Wasser je Jahreszeit |
| `startLeafParticles()` | Herbst-Laubpartikel |

### Bauen
| Methode | Beschreibung |
|---------|-------------|
| `setBuildMode(type)` | Baumodus aktivieren, Ghost erstellen |
| `placeBuilding(type, x, z)` | Gebäude platzieren, Grid + Caches aktualisieren |
| `demolishSelected()` | Abreißen, Ressourcen zurückgeben, Caches leeren |
| `selectBuilding(bData)` | Inspector öffnen, Highlight setzen |
| `upgradeTownhall()` | Epoche I→II→III→IV |
| `assignWorker(delta)` | Arbeiter zuweisen (+1) oder entfernen (-1) |
| `setUnitType(type)` | Kaserne: 'soldier' oder 'knight' |

### Performance-Caches
| Methode / Property | Beschreibung |
|--------------------|-------------|
| `hasInfra(x, z, type)` | O(1) Infrastruktur-Check via Set-Cache |
| `_rebuildInfraCache()` | Baut `_infraCache` Set neu auf |
| `getBuffFlags()` | Monument/Schule-Status gecacht (60-Tick-Intervall) |
| `_infraCache` | Set mit `"x,z,type"` Keys, `null` = muss rebuild |
| `_towerCache` | Array aktiver Türme, `null` = muss rebuild |
| `_buffCache` | `{ monument, school }`, wird via `_buffCacheTick` versioniert |

Alle drei Caches werden in `placeBuilding()` und `demolishSelected()` auf `null` gesetzt.

### Spawning
| Methode | Beschreibung |
|---------|-------------|
| `spawnCitizen()` | Bürger erstellen, am Zentrum positionieren |
| `spawnEnemy(type)` | Feind an zufälligem Winkel spawnen |
| `spawnEnemyAt(type, angle)` | Feind an konkretem Winkel spawnen |
| `spawnBoss(epoch)` | Boss je Epoche, lila Aura, Belohnung |
| `spawnWave()` | Welle mit Typ, Anzahl, evtl. mehrere Seiten |
| `spawnAnimal()` | Tier (Hirsch) in der Landschaft |
| `spawnRock(x, y, z, type)` | Fels (stone/iron/coal) |
| `spawnTrader()` | Händler mit 3 zufälligen Angeboten |
| `spawnShip(wharf)` | Handelsschiff an Werft starten |
| `spawnProjectile(from, target)` | Pfeil vom Turm auf Feind |

### Werft & Schiffe
| Methode | Beschreibung |
|---------|-------------|
| `spawnShip(wharf)` | Erstellt Schiff-Mesh (Rumpf, Mast, Segel, Licht), setzt Kurs zum Kartenrand |
| `updateShips()` | Bewegt Schiffe, prüft Ankunft, führt Piratencheck durch, liefert Waren |

**Ship-Objekt:**
```javascript
{
  mesh,       // TransformNode mit Rumpf/Mast/Segel
  wharf,      // Werft-bData
  state,      // 'OUTBOUND' | 'INBOUND'
  timer,      // Ticks seit Start
  target,     // { x, z } Kartenrand-Ziel
  payload,    // { gold, wood, iron, planks, label }
  light,      // PointLight am Schiff
}
```

**Payload-Varianten:**
- 🪵 Holz & Gold — 60H + 80G
- ⚙️ Eisen & Gold — 40Ei + 120G
- 🪵 Bretter & Gold — 50B + 60G
- 💰 Reiner Gewinn — 150G
- ⚓ Gemischte Waren — 20Ei + 30P + 80G

### Diplomatie
| Methode | Beschreibung |
|---------|-------------|
| `toggleDiplomacy()` | Panel öffnen/schließen |
| `updateDiplomacyUI()` | Bündnis-Status, Händlerangebote |
| `updateDiplomacyTick()` | Bündnis-Timer, Händler-Bewegung, nächsten Händler planen |
| `formAlliance(key)` | Bündnis schließen (`allied=true`, `allyTimer=3000`) |
| `payTribute()` | Alle Feinde abkaufen |
| `buyFromTrader(idx)` | Ware vom aktiven Händler kaufen |

### Katastrophen
| Methode | Beschreibung |
|---------|-------------|
| `triggerDisaster()` | Wählt zufällig aus: fire / plague / earthquake (ab E3) |
| `startFire()` | Feuer-PartikelSystem am Gebäude, Schaden-Interval |
| `extinguishFire(target, destroyed)` | Feuer löschen oder Gebäude abreißen |
| `startPlague()` | 20% Pop stirbt (10% mit Heilstätte), Zufriedenheit -30 |
| `startEarthquake()` | Gebäude-HP reduziert, Kamera-Shake, Partikel |
| `showDisasterAlert(text, color)` | Rotes Banner oben in der UI |

### Tutorial
| Methode | Beschreibung |
|---------|-------------|
| `initTutorial()` | Nur beim ersten Start (localStorage-Check) |
| `showTutorial()` | Manuell öffnen (setzt localStorage zurück) |
| `skipTutorial()` | Speichert `ash_empire_tutorial_done=1` |
| `tutorialNext()` | Nur wenn `check()` erfüllt, sonst Shake-Animation |
| `checkTutorialProgress()` | Alle 30 Ticks — automatischer Fortschritt |

9 Tutorial-Schritte: Zentrum → Holzfäller → Mine → Nahrung → Sägewerk → Haus → Forschung → Epoche II → Fertig

### Mod-System
| Methode | Beschreibung |
|---------|-------------|
| `applyMod()` | Liest JSON aus Input, ruft `_loadMod()` |
| `_loadMod(mod)` | Wendet Ressourcen, Epoch, Research, Cheats, Speed an |
| `_clearMod()` | Entfernt `window.GameMod`, löscht localStorage-Eintrag |
| `_loadSavedMod()` | Stellt Flags (nicht State) beim Neustart wieder her |

**Mod-Felder:**
```javascript
{
  resources: { gold, wood, stone, ... },
  epoch: 1–4,
  happiness: 0–100,
  taxLevel: 0–2,
  waveNumber: N,
  population: N,
  research: { betterTools: true, ... },
  buildingCosts: { house: { w: 0, s: 0 } },
  buildingNames: { house: { name: "...", desc: "..." } },
  productionSpeed: 0.1–10,
  enemyStrength: 0.1–10,
  waveInterval: N,
  cheats: { godMode, noEnemies, infiniteResources, instantBuild }
}
```

### UI
| Methode | Beschreibung |
|---------|-------------|
| `updateUI()` | Ressourcen, Bevölkerung, Gebäude-Buttons (Kosten/disabled) |
| `updateLOD()` | Chunk-Visibility + Baum/Busch/Tier-LOD |
| `drawMinimap()` | Canvas-Minimap mit Gebäuden, Bürgern, Feinden, Truppen |
| `notify(text, type)` | Benachrichtigungs-Stack (max 4, auto-fade) |
| `showMsg(txt)` | Kurze System-Nachricht unten |
| `createFloatingText(text, pos, color)` | GUI-Text der aufsteigt und verschwindet |
| `spawnResParticles(pos, color)` | Partikeleffekt bei Ressourcen/Treffern |

### Save/Load
| Methode | Beschreibung |
|---------|-------------|
| `saveLocal(slot)` | localStorage Slot 0–N |
| `loadLocal(slot)` | Lädt aus localStorage |
| `saveGameCloud()` | Firebase Firestore (mit localStorage-Backup) |
| `loadGameCloud()` | Firebase Firestore (Fallback: localStorage) |
| `_buildSaveData()` | Serialisiert Ressourcen, Gebäude, Pop, Epoche, Forschung, Diplomatie |
| `_applySaveData(data)` | Deserialisiert, generiert Karte neu, stellt Gebäude + Pop wieder her |

---

## Rendering-System

### ChunkGrid
```
Kartengröße: 1000×1000
Chunk-Größe: 100×100
Grid: 10×10 = 100 Chunks

updateVisibility(camX, camZ, radius=280):
  → aktiviert Chunks innerhalb radius
  → deaktiviert alle anderen
  → ~9 von 100 Chunks aktiv = 91% deaktiviert
```

### LOD-System (innerhalb aktiver Chunks)
| Objekt | Distanz | Aktion |
|--------|---------|--------|
| Baum | < 120 | Skalierung 1.0 |
| Baum | 120–240 | Skalierung 0.7 |
| Baum | > 240 | Chunk deaktiviert |
| Busch | > 180 | Kinder deaktiviert |
| Tier | > 180 | `setEnabled(false)` |

### SpatialGrid (Gebäude-Suche)
```javascript
window.getNearbyBuildings(x, z, radius)
// Zellgröße: 50 Units
// Gibt nur Zellen im Radius zurück — O(1) statt O(n)
// Wird in placeBuilding() insert und demolishSelected() remove aktualisiert
```

### Performance-Caches (v1.1.0)
```
_infraCache   — Set<"x,z,type">: O(1) hasInfra()-Lookup
                 Rebuild: beim ersten Aufruf nach null-Setzung
                 Invalidiert: placeBuilding(), demolishSelected()

_towerCache   — Array aktiver Türme (type==='tower', !isConstructing)
                 Invalidiert: placeBuilding(), demolishSelected()

_buffCache    — { monument: bool, school: bool }
                 Gültig für 60 Ticks (_buffCacheTick)
                 Genutzt von: Citizen.update() für Speed-Berechnung

Animal._fleeTimer  — Bürgernähe-Scan alle 10 Frames statt jeden Frame
```

---

## Enemy & Boss

### Normale Feinde
| Typ | HP | Speed | Verhalten |
|-----|----|-------|-----------|
| bandit | 40 | 0.05 | Schwarm, `approachAngle` |
| ork | 80 | 0.07 | Mauerbrecher, `siegeTarget` |
| nomad | 25 | 0.10 | Infiltration, umgeht Mauern, stiehlt 40G |

### Bosse (alle 5 Wellen, 3s nach Welle)
| Boss | Epoche | HP | Schaden | Besonderheit |
|------|--------|----|---------|--------------|
| Plünderer | 2 | 300 | 5 | Gebäude-Angriff |
| Mauerbrecher | 3 | 500 | 10 | Priorisiert Mauern |
| Kriegsherr | 4 | 800 | 15 | Heilt Feinde +5 HP / 60 Ticks in Radius 20 |

Boss-Belohnung: `bossEpoch × 100` Gold

---

## Citizen-KI

### States
```
IDLE → MOVING_WORK → WORK → RETURN_WORKPLACE → IDLE
     → PROCESS (Industrie-Gebäude)
     → GO_SLEEP → MOVING_SLEEP → SLEEPING
     → TRAINING (Kaserne)
     → MOVING_IDLE (Herumwandern)
```

### Job-Routing
| Job | Logik |
|-----|-------|
| WOODCUTTER | Nächsten Baum finden, fällen, Holz zurückbringen |
| MINER | Nächsten Fels finden, abbauen, Ressource zurückbringen |
| FARMER | Felder bestellen, Weizen ernten |
| GATHERER | Beeren/Nahrung sammeln |
| HUNTER | Tier finden, töten, Fleisch zurückbringen |
| FISHER | Wassernähe-Logik, Fisch produzieren |
| SAWMILL/BAKER/SMELTER/... | `state = PROCESS`, Inventar-basiertes Rezept |
| SOLDIER/KNIGHT/ARCHER | `guardLogic()` — Feinde suchen, Patrouille |
| GUARD | Wie SOLDIER (Legacy) |
| FORESTER | Baum pflanzen (GrowingTree), Wachstum 0.0001/Tick |
| INNKEEPER/MERCHANT/... | Steht am Gebäude, rotiert leicht |

### Speed-Berechnung (alle 30 Ticks)
```javascript
spd = baseSpd * (happiness/100 * 0.5 + 0.5)
spd *= 1.2  // Monument (gecacht)
spd *= 1.1  // Schule (gecacht)
spd *= 1.3  // Werkzeuge vorhanden
spd *= 1.2  // betterTools erforscht
spd *= 1.5  // Regen + FARMER/FISHER
spd *= 0.8  // Regen + andere Jobs
```

### Trampelpfad-System
```javascript
// In Citizen.moveTo() — alle 20 Ticks
footTraffic["x,z"]++
if(footTraffic > 15) → automatisch 'path' platzieren
```

---

## Katastrophen-Timing

```
Erste Katastrophe: nach 3000 Ticks (~50s bei Normalspeed)
Folgekatastrophen:  alle 2400–4800 Ticks zufällig
Bedingung:          ≥ 3 Gebäude (kein road/path), kein aktives Disaster
```

---

## Diplomatiesystem

```
Händler-Intervall:  1200 Ticks (600 mit Marktplatz) + bis zu 400 zufällig
Händler-Dauer:      600 Ticks (3 Angebote, Gold-Kauf)
Bündnis-Dauer:      allyTimer = 3000 Ticks (~5 Wellen)
Tributkosten:       50G + waveNumber × 20G
```

---

## Werft & Schiff-System

```
Abfahrt:    automatisch wenn wharf.workers.length > 0
            && !alreadySailing && cooldownOk && !wharf.shipState
Reisedauer: ~900 Ticks zum Rand + ~900 Ticks zurück
Piratencheck beim Erreichen des Kartenrands (Zufallsereignis)
Cooldown:   wharf.nextVoyageTick = tickCounter + 1200
```

---

## Wellen-System

```
Bedingung:  isNight && tickCounter >= nextWaveTick && enemies.length === 0
Interval:   max(800, 2400 - waveNumber×60) Ticks
            × 1.5 mit 'warfare'-Forschung
            überschreibbar per GameMod.waveInterval

Wellen-Zusammensetzung:
  count = 2 + floor(wave × 0.8)
  sides = min(3, floor(wave/3)) ab Welle 5
  Boss  = alle 5 Wellen (3s Verzögerung nach Welle)
```

---

## Forschungsbaum

| Tech | Bedingung | Effekt im Code |
|------|-----------|----------------|
| betterTools | — | `citizen.spd *= 1.2` |
| farming | — | Ernte-Multiplikator ×1.5 |
| cityPlanning | — | `hBonus = 2` → +2 Pop/Haus |
| smelting | — | Schmelze-Timer 200→100 |
| armor | — | `guardHP` ×2 |
| forestry | — | Baumwachstum 0.0001→0.0002/Tick |
| warfare | — | Wellen-Interval ×1.5 |
| fortification | — | Mauer-HP 400→1200 |
| tradeRoutes | — | Markt-Gold ×2 |
| foodStorage | — | Kein Winter-Nahrungsverderb |

---

## Firebase / Cloud

```javascript
// Hilfsfunktion — sicherer Zugriff auf Firebase-Variablen
function _fb() { return window._getFirebaseVars?.() ?? {}; }

// Gespeichert in _buildSaveData():
//   version, timestamp, seedX, seedY
//   resources, epoch, happiness, taxLevel
//   waveNumber, nextWaveTick, tickCounter
//   timeOfDay, season, seasonDay
//   research (alle 10), diplomacy (factions + nextTraderTick)
//   buildings (type, x, y, z, rotY, isConstructing, buildProgress,
//              localInv, workersCount, shipState, nextVoyageTick)
//   population (job, x, z)
```

---

## Bekannte Einschränkungen

| Problem | Status |
|---------|--------|
| Straßen an sehr steilen Hängen nicht perfekt | In Arbeit |
| Chunk-Rendering für Bürger/Feinde | Geplant |
| Keine Mehrspielerfähigkeit | Nicht geplant |