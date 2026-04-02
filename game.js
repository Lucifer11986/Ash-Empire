// game.js — GameState + window.Game controller

        // ── Spatial Grid für schnelle Nachbarschaftssuche ──
        class SpatialGrid {
            constructor(cellSize = 50) {
                this.cellSize = cellSize;
                this.cells = new Map();
            }
            _key(x, z) {
                return `${Math.floor(x / this.cellSize)},${Math.floor(z / this.cellSize)}`;
            }
            insert(obj) {
                const key = this._key(obj.x, obj.z);
                if(!this.cells.has(key)) this.cells.set(key, []);
                this.cells.get(key).push(obj);
            }
            remove(obj) {
                const key = this._key(obj.x, obj.z);
                const cell = this.cells.get(key);
                if(cell) { const i = cell.indexOf(obj); if(i !== -1) cell.splice(i, 1); }
            }
            getNearby(x, z, radius = 50) {
                const result = [];
                const minCX = Math.floor((x - radius) / this.cellSize);
                const maxCX = Math.floor((x + radius) / this.cellSize);
                const minCZ = Math.floor((z - radius) / this.cellSize);
                const maxCZ = Math.floor((z + radius) / this.cellSize);
                for(let cx = minCX; cx <= maxCX; cx++) {
                    for(let cz = minCZ; cz <= maxCZ; cz++) {
                        const cell = this.cells.get(`${cx},${cz}`);
                        if(cell) result.push(...cell);
                    }
                }
                return result;
            }
            clear() { this.cells.clear(); }
            rebuild(items) { this.clear(); items.forEach(item => this.insert(item)); }
        }

        // Globale Hilfsfunktion — von entities.js genutzt
        window.getNearbyBuildings = (x, z, radius = 50) => {
            if(window.Game?.buildingGrid) return window.Game.buildingGrid.getNearby(x, z, radius);
            return GameState.buildings;
        };

        // ── Chunk-System für effizientes Rendering ──────────────────────
        class ChunkGrid {
            constructor(mapSize = 1000, chunkSize = 100) {
                this.mapSize = mapSize;
                this.chunkSize = chunkSize;
                this.chunksPerAxis = Math.ceil(mapSize / chunkSize); // 10
                this.chunks = new Map(); // "cx,cz" → { trees:[], rocks:[], bushes:[] }
            }

            _key(cx, cz) { return `${cx},${cz}`; }

            _chunkOf(x, z) {
                const half = this.mapSize / 2;
                const cx = Math.floor((x + half) / this.chunkSize);
                const cz = Math.floor((z + half) / this.chunkSize);
                return { cx: Math.max(0, Math.min(this.chunksPerAxis-1, cx)),
                          cz: Math.max(0, Math.min(this.chunksPerAxis-1, cz)) };
            }

            getChunk(cx, cz) {
                const key = this._key(cx, cz);
                if(!this.chunks.has(key)) this.chunks.set(key, { trees:[], rocks:[], bushes:[] });
                return this.chunks.get(key);
            }

            addTree(obj)  { const {cx,cz} = this._chunkOf(obj.x, obj.z); this.getChunk(cx,cz).trees.push(obj); }
            addRock(obj)  { const {cx,cz} = this._chunkOf(obj.x, obj.z); this.getChunk(cx,cz).rocks.push(obj); }
            addBush(obj)  { const {cx,cz} = this._chunkOf(obj.x, obj.z); this.getChunk(cx,cz).bushes.push(obj); }

            removeRock(obj) {
                const {cx,cz} = this._chunkOf(obj.x, obj.z);
                const chunk = this.chunks.get(this._key(cx,cz));
                if(chunk) chunk.rocks = chunk.rocks.filter(r => r !== obj);
            }

            // Alle Objekte in Chunks innerhalb Radius um (camX,camZ) aktivieren, andere deaktivieren
            updateVisibility(camX, camZ, activeRadius = 250) {
                const {cx: ccx, cz: ccz} = this._chunkOf(camX, camZ);
                const chunkRadius = Math.ceil(activeRadius / this.chunkSize);

                this.chunks.forEach((chunk, key) => {
                    const [kx, kz] = key.split(',').map(Number);
                    const dx = Math.abs(kx - ccx);
                    const dz = Math.abs(kz - ccz);
                    const visible = dx <= chunkRadius && dz <= chunkRadius;
                    const setEnabled = visible;

                    chunk.trees.forEach(t => { if(t.mesh) t.mesh.setEnabled(setEnabled); });
                    chunk.rocks.forEach(r => { if(r.mesh) r.mesh.setEnabled(setEnabled); });
                    chunk.bushes.forEach(b => { if(b.mesh) b.mesh.setEnabled(setEnabled); });
                });
            }

            clear() { this.chunks.clear(); }
        }

        const GameState = {
            resources: { wood: 800, stone: 600, food: 800, gold: 100, clay: 0, coal: 0, wheat: 0, meat: 0, fish: 0, planks: 0, bricks: 0, flour: 0, iron: 0, tools: 0, weapons: 0, fruits: 0, vegetables: 0, milk: 0, wool: 0, cheese: 0 },
            maxStorage: 2000, population: [], buildings: [], enemies: [], animals: [],
            centerTile: null, selectedBuilding: null, buildMode: null, buildRotation: 0, selectedTroop: null,
            mapProps: { trees: [], rocks: [], bushes: [], growingTrees: [] },
            projectiles: [],
            timeOfDay: 0.25, isStarving: false, isNight: false, isPaused: false,
            weatherTimer: 0, happiness: 100, nightLights: [], daySpeed: 1, currentEpoch: 1,
            season: 0, seasonDay: 0, seasonLength: 8,
            isDrought: false, droughtTimer: 0,
            waveNumber: 0, nextWaveTick: 0,
            activeDisaster: null, disasterTimer: 0, plagueTimer: 0, nextDisasterTick: 0,
            diplomacy: {
                factions: {
                    bandits:  { name: 'Banditen',  icon: '🗡️', allied: false, allyTimer: 0, tributeCost: 150 },
                    orks:     { name: 'Orks',      icon: '🪓', allied: false, allyTimer: 0, tributeCost: 250 },
                    nomads:   { name: 'Nomaden',   icon: '🏹', allied: false, allyTimer: 0, tributeCost: 200 },
                },
                nextTraderTick: 0,
                activeTrader: null,  // { offer: [], timer: 0, mesh: null }
                tradeRouteIncome: 0,
            },
            diplomacyOpen: false,
            research: {
                betterTools: false, farming: false, cityPlanning: false,
                smelting: false, armor: false, forestry: false,
                warfare: false, fortification: false, tradeRoutes: false, foodStorage: false
            },
            footTraffic: {}, paths: new Set(), taxLevel: 1,
            ships: []  // { mesh, wharf, state, timer, returnPayload }
        };

        
        window.Game = {
            canvas: null, engine: null, scene: null, camera: null, hl: null, gui: null,
            waterLevel: 0.5, mapSize: 1000, keys: {}, timeSpeed: 1, minimapCtx: null, tickCounter: 0, ghostRoot: null, fireflies: null,
            uiNeedsUpdate: true, buildCategory: 'infra', minimapBg: null, rainPS: null, leafPS: null,
            statsHistory: { pop: [], gold: [], food: [], happiness: [] },
            statTab: 'pop', statsOpen: false, statsTick: 0, researchOpen: false,
            prevResources: {}, buildingGrid: null, chunkGrid: null,
            tutorialStep: 0, tutorialActive: true,
            // ── PERFORMANCE CACHES ──
            _infraCache: null, _towerCache: null, _buffCache: null, _buffCacheTick: -1,
            // ── LICHT-POOL (max 6 PointLights statt 1 pro Gebäude) ──
            _lightPool: null,  // Array von { light, inUse }
            _lightPoolSize: 6,
            
            init() {
                if (this.engine) return; 
                window.Sfx.init(); 
                // Firebase wird vom ES-Modul in index.html geladen
                
                this.canvas = document.getElementById("renderCanvas");
                this.engine = new BABYLON.Engine(this.canvas, true, { antialias: true, adaptToDeviceRatio: true, preserveDrawingBuffer: true });
                this.scene = new BABYLON.Scene(this.engine);
                this.scene.clearColor = new BABYLON.Color4(0.02, 0.02, 0.04, 1);
                this.scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
                this.scene.fogDensity = 0.002;

                this.hemiLight = new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0, 1, 0), this.scene);
                this.sunLight = new BABYLON.DirectionalLight("sun", new BABYLON.Vector3(-1, -1.5, -1), this.scene);
                this.sunLight.position = new BABYLON.Vector3(50, 80, 50);

                // Licht-Pool initialisieren — feste Anzahl PointLights statt 1 pro Gebäude
                this._lightPool = [];
                for(let i = 0; i < this._lightPoolSize; i++) {
                    const pl = new BABYLON.PointLight("poolLight_" + i, new BABYLON.Vector3(0, 0, 0), this.scene);
                    pl.intensity = 0;
                    pl.range = 28;
                    this._lightPool.push({ light: pl, inUse: false });
                }
                
                this.shadows = new BABYLON.ShadowGenerator(1024, this.sunLight);
                this.shadows.useBlurExponentialShadowMap = false;
                this.shadows.usePoissonSampling = true;

                this.gl = new BABYLON.GlowLayer("glow", this.scene);
                this.gl.intensity = 1.2;

                this.gui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

                this.camera = new BABYLON.ArcRotateCamera("cam", Math.PI/4, Math.PI/3, 150, BABYLON.Vector3.Zero(), this.scene);
                this.camera.attachControl(this.canvas, true);
                this.camera.inputs.attached.pointers.buttons = [1,2]; 
                this.camera.lowerRadiusLimit = 10;
                this.camera.upperRadiusLimit = 600;

                this.hl = new BABYLON.HighlightLayer("hl", this.scene);

                this.createMaterials();
                this.buildingGrid = new SpatialGrid(50);
                this.chunkGrid = new ChunkGrid(this.mapSize, 100);
                this.createFireflies();
                this.createRainSystem();
                this.createSnowSystem();
                this.setupKeyboard();
                this.setupMinimapInteraction();
                this.engine.resize();;
            },

            setupKeyboard() {
                window.addEventListener("keydown", (e) => { 
                    this.keys[e.key.toLowerCase()] = true; 
                    if(e.code === 'Space') this.togglePause();
                    if(e.key === '1') { window.Sfx.click(); this.setSpeed(1); }
                    if(e.key === '2') { window.Sfx.click(); this.setSpeed(2); }
                    if(e.key === '3') { window.Sfx.click(); this.setSpeed(3); }
                    if(e.key.toLowerCase() === 'b') { window.Sfx.click(); this.toggleBuildMenu(); }
                    if(e.key.toLowerCase() === 'r' && GameState.buildMode && this.ghostRoot) {
                        GameState.buildRotation += Math.PI / 2;
                        this.ghostRoot.rotation.y = GameState.buildRotation;
                    }
                });
                window.addEventListener("keyup", (e) => { this.keys[e.key.toLowerCase()] = false; });
            },

            setupMinimapInteraction() {
                const mm = document.getElementById('minimapCanvas');
                if(!mm) return;
                mm.addEventListener('pointerdown', (e) => {
                    const rect = mm.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    const worldX = ((x - 80) / 160) * this.mapSize;
                    const worldZ = ((y - 80) / 160) * this.mapSize;
                    this.camera.target.x = worldX; this.camera.target.z = worldZ;
                    window.Sfx.click();
                });
            },

            openSettings() {
                setTimeout(() => this.refreshSaveInfo(), 100); document.getElementById('settings-modal').classList.remove('hidden'); },
            closeSettings() { document.getElementById('settings-modal').classList.add('hidden'); },
            switchTab(tabId) {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                // Korrekt: Button selbst markieren, nicht Child-Element
                const tabBtns = document.querySelectorAll('.tab-btn');
                tabBtns.forEach(b => {
                    if(b.getAttribute('onclick') && b.getAttribute('onclick').includes(`'${tabId}'`)) {
                        b.classList.add('active');
                    }
                });
                ['general', 'cloud', 'mod', 'feedback'].forEach(id => { 
                    let el = document.getElementById('tab-' + id);
                    if(el) el.classList.add('hidden'); 
                });
                let t = document.getElementById('tab-' + tabId);
                if(t) t.classList.remove('hidden');
                window.Sfx.click();
            },
            
            restartGame() {
                if(!confirm("Wirklich neu starten? Alle Fortschritte gehen verloren!")) return;
                
                // Alle Meshes aufräumen
                GameState.buildings.forEach(b => { if(b.mesh) b.mesh.dispose(); });
                GameState.population.forEach(p => { if(p.mesh) p.mesh.dispose(); });
                GameState.enemies.forEach(e => { if(e.mesh) e.mesh.dispose(); });
                GameState.animals.forEach(a => { if(a.mesh) a.mesh.dispose(); });
                GameState.projectiles.forEach(p => { if(p.mesh) p.mesh.dispose(); });
                GameState.mapProps.trees.forEach(t => { if(t.mesh) t.mesh.dispose(); });
                GameState.mapProps.rocks.forEach(r => { if(r.mesh) r.mesh.dispose(); });
                GameState.mapProps.bushes.forEach(b => { if(b.mesh) b.mesh.dispose(); });
                if(this.groundMesh) this.groundMesh.dispose();
                if(this.waterMesh) this.waterMesh.dispose();
                if(this.ghostRoot) { this.ghostRoot.dispose(); this.ghostRoot = null; }
                
                // GameState zurücksetzen
                GameState.resources = { wood: 800, stone: 600, food: 800, gold: 100, clay: 0, coal: 0, wheat: 0, meat: 0, fish: 0, planks: 0, bricks: 0, flour: 0, iron: 0, tools: 0, weapons: 0 };
                GameState.buildings = []; GameState.population = []; GameState.enemies = [];
                GameState.animals = []; GameState.projectiles = []; GameState.nightLights = [];
                GameState.mapProps = { trees: [], rocks: [], bushes: [], growingTrees: [] };
                GameState.centerTile = null; GameState.selectedBuilding = null; GameState.buildMode = null;
                GameState.timeOfDay = 0.25; GameState.isStarving = false; GameState.isNight = false;
                GameState.happiness = 100; GameState.daySpeed = 1; GameState.currentEpoch = 1;
                GameState.footTraffic = {}; GameState.paths = new Set(); GameState.taxLevel = 1; GameState.ships = [];
                GameState.maxStorage = 2000; GameState.weatherTimer = 0;
                GameState.season = 0; GameState.seasonDay = 0;
                if(this.leafPS) this.leafPS.emitRate = 0;
                if(this.buildingGrid) this.buildingGrid.clear();
                if(this.chunkGrid) this.chunkGrid.clear();
                // Licht-Pool zurücksetzen (Lichter behalten, nur Intensität auf 0)
                if(this._lightPool) this._lightPool.forEach(p => { p.inUse = false; p.light.intensity = 0; });
                // Performance-Caches invalidieren
                this._infraCache = null; this._towerCache = null; this._buffCache = null;
                if(this.fishObjects) { this.fishObjects.forEach(f => { if(f && !f.isDisposed()) f.dispose(); }); this.fishObjects = []; }
                if(this._fishAnimHandle) { this.scene.onBeforeRenderObservable.remove(this._fishAnimHandle); this._fishAnimHandle = null; }
                setTimeout(() => this.applySeasonVisuals(0), 500);
                GameState.isDrought = false; GameState.droughtTimer = 0;
                GameState.waveNumber = 0; GameState.nextWaveTick = 0;
                GameState.activeDisaster = null; GameState.disasterTimer = 0; GameState.plagueTimer = 0; GameState.nextDisasterTick = 0;
                GameState.diplomacy.factions.bandits.allied = false; GameState.diplomacy.factions.bandits.allyTimer = 0;
                GameState.diplomacy.factions.orks.allied = false; GameState.diplomacy.factions.orks.allyTimer = 0;
                GameState.diplomacy.factions.nomads.allied = false; GameState.diplomacy.factions.nomads.allyTimer = 0;
                GameState.diplomacy.nextTraderTick = 0; GameState.diplomacy.activeTrader = null;
                GameState.diplomacyOpen = false;
                document.getElementById('diplomacy-panel')?.classList.add('hidden');
                this.statsHistory = { pop: [], gold: [], food: [], happiness: [] };
                this.statsOpen = false;
                this.researchOpen = false;
                const statsPanel = document.getElementById('stats-panel');
                if(statsPanel) statsPanel.classList.add('hidden');
                const resPanel = document.getElementById('research-panel');
                if(resPanel) resPanel.classList.add('hidden');
                GameState.research = { betterTools: false, farming: false, cityPlanning: false,
                    smelting: false, armor: false, forestry: false,
                    warfare: false, fortification: false, tradeRoutes: false, foodStorage: false };
                if(this.snowPS) this.snowPS.emitRate = 0;
                
                // Neue Karte generieren
                Noise.seedOffsetX = Math.random() * 10000;
                Noise.seedOffsetY = Math.random() * 10000;
                window.GameMod = window.GameMod || {};
                this._loadSavedMod();
                this.generateLandscape();
                this.initMinimapBg();
                this.closeInspector();
                this.closeSettings();
                this.setBuildMode(null);
                this.setBuildCategory('infra');
                
                // UI zurücksetzen
                document.getElementById('epoch-status').innerText = '🏛️ Epoche: I';
                document.getElementById('happiness-status').innerText = '❤️ 100%';
                document.getElementById('btn-tax').innerText = 'Steuern: Normal';
                document.getElementById('season-status').innerText = '🌸 Jahreszeit: Frühling';
                
                this.uiNeedsUpdate = true;
                this.showMsg("Neues Spiel gestartet! Platziere das Zentrum!");
            },

            updateSettings() { GameState.daySpeed = parseFloat(document.getElementById('sel-time').value); },

            getCostLabel(type) {
                const cfg = BUILDINGS[type];
                if(!cfg) return '';
                const map = { w:'H', s:'S', g:'G', p:'B', b:'Z', i:'Ei' };
                return Object.entries(cfg.cost)
                    .filter(([k,v]) => v > 0)
                    .map(([k,v]) => v + (map[k]||k))
                    .join(' ') || 'Kostenlos';
            },

            research(tech) {
                window.Sfx.click();
                if(GameState.research[tech]) { this.showMsg("Bereits erforscht!"); return; }
                const costs = {
                    betterTools:   { gold: 100 },
                    farming:       { gold: 80,  wood: 50 },
                    cityPlanning:  { gold: 100, stone: 50 },
                    smelting:      { gold: 150, iron: 30 },
                    armor:         { gold: 150, iron: 50 },
                    forestry:      { gold: 120, wood: 40 },
                    warfare:       { gold: 300, iron: 100 },
                    fortification: { gold: 250, bricks: 100 },
                    tradeRoutes:   { gold: 300 },
                    foodStorage:   { gold: 200, bricks: 50 },
                };
                const c = costs[tech];
                if(!c) return;
                for(let [res, amt] of Object.entries(c)) {
                    if((GameState.resources[res] || 0) < amt) {
                        window.Sfx.error(); this.showMsg("Ressourcen fehlen!"); return;
                    }
                }
                for(let [res, amt] of Object.entries(c)) { GameState.resources[res] -= amt; }
                GameState.research[tech] = true;
                const names = { betterTools:'Bessere Werkzeuge', farming:'Ackerbau', cityPlanning:'Stadtplanung',
                    smelting:'Schmelzkunst', armor:'Rüstung', forestry:'Forstwirtschaft',
                    warfare:'Kriegskunst', fortification:'Festungsbau', tradeRoutes:'Handelsrouten', foodStorage:'Vorratshaltung' };
                window.Sfx.research && window.Sfx.research();
                this.notify(`🔬 ${names[tech] || tech} erforscht!`, 'success');
                if(GameState.centerTile) this.createFloatingText(`🔬 ${names[tech]}!`, GameState.centerTile.mesh, '#a855f7');
                this.updateResearchUI();
                this.uiNeedsUpdate = true;
            },

            updateResearchUI() {
                const techs = ['betterTools','farming','cityPlanning','smelting','armor',
                               'forestry','warfare','fortification','tradeRoutes','foodStorage'];
                techs.forEach(tech => {
                    const btn = document.getElementById('res-' + tech);
                    if(!btn) return;
                    if(GameState.research[tech]) {
                        btn.style.borderColor = '#22c55e';
                        btn.style.opacity = '0.6';
                        btn.disabled = true;
                        const title = btn.querySelector('.text-sm');
                        if(title && !title.textContent.startsWith('✅')) title.textContent = '✅ ' + title.textContent;
                    }
                });
            },

            applySeasonVisuals(season) {
                if(!this.mats) return;
                const bushColors = [
                    new BABYLON.Color3(0.15, 0.55, 0.15),  // Frühling — hellgrün
                    new BABYLON.Color3(0.05, 0.35, 0.05),  // Sommer — dunkelgrün
                    new BABYLON.Color3(0.55, 0.25, 0.05),  // Herbst — orange/braun
                    new BABYLON.Color3(0.75, 0.80, 0.82),  // Winter — weiß/grau
                ];
                const trunkColors = [
                    new BABYLON.Color3(0.35, 0.22, 0.12),
                    new BABYLON.Color3(0.30, 0.18, 0.10),
                    new BABYLON.Color3(0.28, 0.16, 0.08),
                    new BABYLON.Color3(0.55, 0.45, 0.38),
                ];
                const groundEmissive = [
                    new BABYLON.Color3(0.0,  0.02, 0.0),
                    new BABYLON.Color3(0.02, 0.02, 0.0),
                    new BABYLON.Color3(0.04, 0.01, 0.0),
                    new BABYLON.Color3(0.06, 0.06, 0.08),
                ];
                this.mats.bush.diffuseColor = bushColors[season];
                if(this.mats.treeTrunk) this.mats.treeTrunk.diffuseColor = trunkColors[season];
                if(this.mats.ground) this.mats.ground.emissiveColor = groundEmissive[season];
                if(this.mats.water) {
                    this.mats.water.diffuseColor = season === 3
                        ? new BABYLON.Color3(0.3, 0.4, 0.55)
                        : new BABYLON.Color3(0.1, 0.4, 0.8);
                }
                // Herbst: Laubpartikel an, sonst aus
                if(season === 2) this.startLeafParticles();
                else if(this.leafPS) this.leafPS.emitRate = 0;
            },

            startLeafParticles() {
                if(!this.leafPS) {
                    this.leafPS = new BABYLON.ParticleSystem("leaves", 500, this.scene);
                    this.leafPS.particleTexture = this.particleTex;
                    this.leafPS.emitter = new BABYLON.Vector3(0, 8, 0);
                    this.leafPS.minEmitBox = new BABYLON.Vector3(-150, 0, -150);
                    this.leafPS.maxEmitBox = new BABYLON.Vector3(150, 5, 150);
                    this.leafPS.color1 = new BABYLON.Color4(0.8, 0.3, 0.05, 0.9);
                    this.leafPS.color2 = new BABYLON.Color4(0.6, 0.15, 0.02, 0.7);
                    this.leafPS.colorDead = new BABYLON.Color4(0.4, 0.1, 0, 0);
                    this.leafPS.minSize = 0.3; this.leafPS.maxSize = 0.7;
                    this.leafPS.minLifeTime = 4; this.leafPS.maxLifeTime = 8;
                    this.leafPS.gravity = new BABYLON.Vector3(0.5, -1.5, 0.3);
                    this.leafPS.direction1 = new BABYLON.Vector3(-1, -1, -1);
                    this.leafPS.direction2 = new BABYLON.Vector3(1, -0.5, 1);
                    this.leafPS.minAngularSpeed = -2; this.leafPS.maxAngularSpeed = 2;
                    this.leafPS.blendMode = BABYLON.ParticleSystem.BLENDMODE_ALPHA;
                    this.leafPS.start();
                }
                this.leafPS.emitRate = 80;
            },

            // ── MOD-SYSTEM ──────────────────────────────────────────────
            applyMod() {
                const input = document.getElementById('mod-input')?.value?.trim();
                if(!input) { window.Sfx.error(); this.showMsg("Kein Mod-Code eingegeben!"); return; }
                try {
                    const mod = JSON.parse(input);
                    this._loadMod(mod);
                } catch(e) {
                    window.Sfx.error();
                    this.showMsg("Fehlerhafter JSON: " + e.message);
                }
            },

            _loadMod(mod) {
                const errors = [];
                const applied = [];

                // === RESSOURCEN ===
                if(mod.resources) {
                    Object.entries(mod.resources).forEach(([k, v]) => {
                        if(k in GameState.resources) {
                            GameState.resources[k] = Math.max(0, Number(v));
                            applied.push(`res.${k}=${v}`);
                        } else { errors.push(`Unbekannte Ressource: ${k}`); }
                    });
                }

                // === SPIELZUSTAND ===
                if(mod.epoch !== undefined) {
                    const ep = Math.max(1, Math.min(4, parseInt(mod.epoch)));
                    GameState.currentEpoch = ep;
                    document.getElementById('epoch-status').innerText = `🏛️ Epoche: ${['I','II','III','IV'][ep-1]}`;
                    applied.push(`epoch=${ep}`);
                }
                if(mod.happiness !== undefined) {
                    GameState.happiness = Math.max(0, Math.min(100, parseInt(mod.happiness)));
                    applied.push(`happiness=${GameState.happiness}`);
                }
                if(mod.taxLevel !== undefined) {
                    GameState.taxLevel = Math.max(0, Math.min(2, parseInt(mod.taxLevel)));
                    const labels = ['Niedrig','Normal','Hoch'];
                    const btn = document.getElementById('btn-tax');
                    if(btn) btn.innerText = 'Steuern: ' + labels[GameState.taxLevel];
                    applied.push(`tax=${labels[GameState.taxLevel]}`);
                }
                if(mod.waveNumber !== undefined) {
                    GameState.waveNumber = Math.max(0, parseInt(mod.waveNumber));
                    applied.push(`wave=${GameState.waveNumber}`);
                }
                if(mod.population !== undefined) {
                    const target = Math.max(0, Math.min(200, parseInt(mod.population)));
                    const current = GameState.population.length;
                    if(target > current) {
                        for(let i = 0; i < target - current; i++) this.spawnCitizen();
                    } else if(target < current) {
                        const toRemove = GameState.population.splice(target);
                        toRemove.forEach(c => { if(c.mesh) c.mesh.dispose(); });
                    }
                    applied.push(`pop=${target}`);
                }

                // === FORSCHUNG ===
                if(mod.research) {
                    Object.entries(mod.research).forEach(([k, v]) => {
                        if(k in GameState.research) {
                            GameState.research[k] = !!v;
                            applied.push(`research.${k}=${v}`);
                        } else { errors.push(`Unbekannte Forschung: ${k}`); }
                    });
                }

                // === GEBÄUDE-KOSTEN ÜBERSCHREIBEN ===
                if(mod.buildingCosts && typeof BUILDINGS !== 'undefined') {
                    Object.entries(mod.buildingCosts).forEach(([bType, costs]) => {
                        if(BUILDINGS[bType]) {
                            Object.assign(BUILDINGS[bType].cost, costs);
                            applied.push(`cost.${bType}`);
                        } else { errors.push(`Unbekanntes Gebäude: ${bType}`); }
                    });
                }

                // === GEBÄUDE-BESCHREIBUNGEN ===
                if(mod.buildingNames && typeof BUILDINGS !== 'undefined') {
                    Object.entries(mod.buildingNames).forEach(([bType, info]) => {
                        if(BUILDINGS[bType]) {
                            if(info.name) BUILDINGS[bType].name = info.name;
                            if(info.desc) BUILDINGS[bType].desc = info.desc;
                            applied.push(`name.${bType}`);
                        }
                    });
                }

                // === PRODUKTIONSGESCHWINDIGKEIT (GameMod global) ===
                if(mod.productionSpeed !== undefined) {
                    window.GameMod = window.GameMod || {};
                    window.GameMod.productionSpeed = Math.max(0.1, Math.min(10, Number(mod.productionSpeed)));
                    applied.push(`prodSpeed=${window.GameMod.productionSpeed}x`);
                }

                // === FEIND-STÄRKE ===
                if(mod.enemyStrength !== undefined) {
                    window.GameMod = window.GameMod || {};
                    window.GameMod.enemyStrength = Math.max(0.1, Math.min(10, Number(mod.enemyStrength)));
                    applied.push(`enemyStrength=${window.GameMod.enemyStrength}x`);
                }

                // === WELLEN-INTERVALL ===
                if(mod.waveInterval !== undefined) {
                    window.GameMod = window.GameMod || {};
                    window.GameMod.waveInterval = Math.max(100, parseInt(mod.waveInterval));
                    applied.push(`waveInterval=${window.GameMod.waveInterval}`);
                }

                // === CHEATS ===
                if(mod.cheats) {
                    window.GameMod = window.GameMod || {};
                    if(mod.cheats.godMode !== undefined) {
                        window.GameMod.godMode = !!mod.cheats.godMode;
                        applied.push(`godMode=${window.GameMod.godMode}`);
                    }
                    if(mod.cheats.noEnemies !== undefined) {
                        window.GameMod.noEnemies = !!mod.cheats.noEnemies;
                        applied.push(`noEnemies=${window.GameMod.noEnemies}`);
                    }
                    if(mod.cheats.infiniteResources !== undefined) {
                        window.GameMod.infiniteResources = !!mod.cheats.infiniteResources;
                        applied.push(`infiniteRes=${window.GameMod.infiniteResources}`);
                    }
                    if(mod.cheats.instantBuild !== undefined) {
                        window.GameMod.instantBuild = !!mod.cheats.instantBuild;
                        applied.push(`instantBuild=${window.GameMod.instantBuild}`);
                    }
                }

                // === MOD SPEICHERN ===
                try { localStorage.setItem('ash_empire_active_mod', JSON.stringify(mod)); } catch(e) {}

                this.uiNeedsUpdate = true;
                window.Sfx.click && window.Sfx.click();

                if(errors.length > 0) {
                    this.showMsg(`⚠️ Mod teilweise geladen. Fehler: ${errors.join(', ')}`);
                    this.notify(`Mod: ${applied.length} Änderungen · ${errors.length} Fehler`, 'warning');
                } else if(applied.length > 0) {
                    this.showMsg(`✅ Mod geladen! (${applied.length} Änderungen)`);
                    this.notify(`🎮 Mod aktiv: ${applied.slice(0, 3).join(', ')}${applied.length > 3 ? ' ...' : ''}`, 'success');
                    this.closeSettings();
                } else {
                    this.showMsg("Mod enthält keine bekannten Einträge.");
                }

                this._refreshModStatus();
            },

            _clearMod() {
                window.GameMod = {};
                try { localStorage.removeItem('ash_empire_active_mod'); } catch(e) {}
                this.showMsg("Mod deaktiviert.");
                this._refreshModStatus();
                this.uiNeedsUpdate = true;
            },

            _loadSavedMod() {
                try {
                    const raw = localStorage.getItem('ash_empire_active_mod');
                    if(raw) {
                        window.GameMod = window.GameMod || {};
                        const mod = JSON.parse(raw);
                        // Nur GameMod-Flags wiederherstellen (keine State-Änderungen beim Neustart)
                        if(mod.productionSpeed) window.GameMod.productionSpeed = mod.productionSpeed;
                        if(mod.enemyStrength)   window.GameMod.enemyStrength   = mod.enemyStrength;
                        if(mod.waveInterval)    window.GameMod.waveInterval    = mod.waveInterval;
                        if(mod.cheats) {
                            if(mod.cheats.godMode !== undefined)           window.GameMod.godMode           = mod.cheats.godMode;
                            if(mod.cheats.noEnemies !== undefined)         window.GameMod.noEnemies         = mod.cheats.noEnemies;
                            if(mod.cheats.infiniteResources !== undefined) window.GameMod.infiniteResources = mod.cheats.infiniteResources;
                            if(mod.cheats.instantBuild !== undefined)      window.GameMod.instantBuild      = mod.cheats.instantBuild;
                        }
                        return mod;
                    }
                } catch(e) {}
                return null;
            },

            _refreshModStatus() {
                const el = document.getElementById('mod-status');
                if(!el) return;
                const gm = window.GameMod || {};
                const flags = [];
                if(gm.godMode)           flags.push('🛡️ GodMode');
                if(gm.noEnemies)         flags.push('🕊️ NoEnemies');
                if(gm.infiniteResources) flags.push('♾️ InfRes');
                if(gm.instantBuild)      flags.push('⚡ InstantBuild');
                if(gm.productionSpeed && gm.productionSpeed !== 1) flags.push(`⚙️ Prod×${gm.productionSpeed}`);
                if(gm.enemyStrength && gm.enemyStrength !== 1)     flags.push(`⚔️ Str×${gm.enemyStrength}`);
                if(gm.waveInterval)      flags.push(`🌊 Wave:${gm.waveInterval}`);

                const saved = localStorage.getItem('ash_empire_active_mod');
                if(flags.length > 0) {
                    el.innerHTML = `<span class="text-green-400 font-bold">✅ Mod aktiv:</span> <span class="text-purple-300">${flags.join(' · ')}</span>`;
                } else if(saved) {
                    el.innerHTML = `<span class="text-yellow-400 font-bold">📦 Mod gespeichert</span> <span class="text-slate-400">(State-Mods angewendet)</span>`;
                } else {
                    el.innerHTML = `<span class="text-slate-500">Kein aktiver Mod</span>`;
                }
            },

            

            async sendFeedback() {
                let txt = document.getElementById('feedback-text').value;
                if(txt.trim().length < 5) { window.Sfx.error(); this.showMsg("Bitte mehr Text eingeben!"); return; }
                
                window.Sfx.click();
                this.showMsg("Sende Feedback...");
                
                try {
                    if(_fb().auth && _fb().auth.currentUser && _fb().db) {
                        const fbId = 'fb_' + Date.now() + '_' + Math.random().toString(36).substr(2,5);
                        const fbRef = _fb().doc(_fb().db, 'artifacts', _fb().appId, 'public', 'data', 'feedback', fbId);
                        await _fb().setDoc(fbRef, { text: txt, user: _fb().auth.currentUser.uid, timestamp: new Date().toISOString() });
                    }
                } catch(e) { console.warn("Cloud feedback failed", e); }
                
                this.showMsg("Feedback an Lucifer gesendet! Danke!");
                document.getElementById('feedback-text').value = '';
                this.closeSettings();
            },

            cycleTaxes() {
                GameState.taxLevel = (GameState.taxLevel + 1) % 3;
                let t = ["Niedrig", "Normal", "Hoch"];
                document.getElementById('btn-tax').innerText = "Steuern: " + t[GameState.taxLevel];
                this.uiNeedsUpdate = true;
            },

            // ── SAVE-SYSTEM (v2) ─────────────────────────────────────────
            _buildSaveData() {
                return {
                    version: 2,
                    timestamp: new Date().toISOString(),
                    // Karte
                    seedX: Noise.seedOffsetX,
                    seedY: Noise.seedOffsetY,
                    // Ressourcen
                    resources: GameState.resources,
                    // Spielzustand
                    epoch: GameState.currentEpoch,
                    happiness: GameState.happiness,
                    taxLevel: GameState.taxLevel,
                    waveNumber: GameState.waveNumber,
                    nextWaveTick: GameState.nextWaveTick,
                    tickCounter: this.tickCounter,
                    timeOfDay: GameState.timeOfDay,
                    season: GameState.season,
                    seasonDay: GameState.seasonDay,
                    // Forschung (komplett)
                    research: GameState.research,
                    // Diplomatie
                    diplomacy: {
                        factions: Object.fromEntries(
                            Object.entries(GameState.diplomacy.factions).map(([k,v]) => [k, { allied: v.allied, tributeCost: v.tributeCost }])
                        ),
                        nextTraderTick: GameState.diplomacy.nextTraderTick,
                    },
                    // Gebäude (inkl. Rotation, localInv, Zustand)
                    buildings: GameState.buildings.map(b => ({
                        type: b.type,
                        x: b.x, y: b.y, z: b.z,
                        rotY: b.mesh ? b.mesh.rotation.y : 0,
                        isConstructing: b.isConstructing,
                        buildProgress: b.buildProgress,
                        localInv: b.localInv,
                        workersCount: b.workers.length,
                        shipState: b.shipState || null,
                        nextVoyageTick: b.nextVoyageTick || 0,
                    })),
                    // Bevölkerung (mit Job-Verteilung)
                    population: GameState.population.map(c => ({
                        job: c.job,
                        x: c.mesh ? c.mesh.position.x : 0,
                        z: c.mesh ? c.mesh.position.z : 0,
                    })),
                };
            },

            _applySaveData(data) {
                // Ressourcen
                const defaults = {wood:0,stone:0,food:0,gold:0,clay:0,coal:0,wheat:0,meat:0,fish:0,planks:0,bricks:0,flour:0,iron:0,tools:0,weapons:0,fruits:0,vegetables:0,milk:0,wool:0,cheese:0};
                GameState.resources = Object.assign({}, defaults, data.resources);
                // Spielzustand
                Noise.seedOffsetX = data.seedX; Noise.seedOffsetY = data.seedY;
                GameState.currentEpoch = data.epoch || 1;
                GameState.happiness = data.happiness ?? 70;
                GameState.taxLevel = data.taxLevel ?? 1;
                GameState.waveNumber = data.waveNumber ?? 0;
                GameState.nextWaveTick = data.nextWaveTick ?? 0;
                this.tickCounter = data.tickCounter ?? 0;
                GameState.timeOfDay = data.timeOfDay ?? 0.25;
                GameState.season = data.season ?? 0;
                GameState.seasonDay = data.seasonDay ?? 0;
                // Forschung
                if(data.research) GameState.research = Object.assign({}, GameState.research, data.research);
                // Diplomatie
                if(data.diplomacy) {
                    Object.entries(data.diplomacy.factions || {}).forEach(([k,v]) => {
                        if(GameState.diplomacy.factions[k]) Object.assign(GameState.diplomacy.factions[k], v);
                    });
                    GameState.diplomacy.nextTraderTick = data.diplomacy.nextTraderTick || 0;
                }
                // UI
                document.getElementById('epoch-status').innerText = `🏛️ Epoche: ${['I','II','III','IV'][GameState.currentEpoch-1]}`;
                const taxLabels = ['Keine','Normal','Hoch'];
                const taxBtn = document.getElementById('btn-tax');
                if(taxBtn) taxBtn.innerText = 'Steuern: ' + taxLabels[GameState.taxLevel];

                // Welt bereinigen
                GameState.buildings.forEach(b => { if(b.mesh) b.mesh.dispose(); }); GameState.buildings = [];
                GameState.population.forEach(p => { if(p.mesh) p.mesh.dispose(); }); GameState.population = [];
                GameState.enemies.forEach(e => { if(e.mesh) e.mesh.dispose(); }); GameState.enemies = [];
                GameState.animals.forEach(a => { if(a.mesh) a.mesh.dispose(); }); GameState.animals = [];
                GameState.projectiles.forEach(p => { if(p.mesh) p.mesh.dispose(); }); GameState.projectiles = [];
                GameState.ships.forEach(s => { if(s.mesh) s.mesh.dispose(); }); GameState.ships = [];
                GameState.mapProps.trees.forEach(t => { if(t.mesh) t.mesh.dispose(); });
                GameState.mapProps.rocks.forEach(r => { if(r.mesh) r.mesh.dispose(); });
                GameState.mapProps.bushes.forEach(b => { if(b.mesh) b.mesh.dispose(); });
                GameState.mapProps.trees = []; GameState.mapProps.rocks = []; GameState.mapProps.bushes = []; GameState.nightLights = [];
                GameState.paths.clear(); GameState.footTraffic = {};
                if(this.groundMesh) this.groundMesh.dispose(); if(this.waterMesh) this.waterMesh.dispose();

                // Landschaft neu generieren
                this.generateLandscape(); GameState.centerTile = null;
                this.initMinimapBg();

                // Gebäude wiederherstellen
                (data.buildings || []).forEach(bData => {
                    if(!BUILDINGS[bData.type]) return;
                    let root = BABYLON.MeshBuilder.CreateBox("r_" + bData.type, {size: 0.1}, this.scene);
                    root.position = new BABYLON.Vector3(bData.x, bData.y, bData.z);
                    if(bData.rotY) root.rotation.y = bData.rotY;
                    MeshFactory.createBuildingGeometry(bData.type, root, this.scene, this.mats, false);
                    root.getChildMeshes().forEach(m => this.shadows.addShadowCaster(m));
                    this.snapGroundMeshToTerrain(root, bData.type, bData.x, bData.y, bData.z);
                    const realB = {
                        id: Math.random().toString(36).substr(2,9),
                        type: bData.type, x: bData.x, y: bData.y, z: bData.z,
                        mesh: root, workers: [],
                        maxWorkers: BUILDINGS[bData.type].maxWorkers,
                        role: BUILDINGS[bData.type].role,
                        localInv: bData.localInv || {wood:0,stone:0,food:0,planks:0,iron:0,clay:0,coal:0,wheat:0,meat:0,fish:0,bricks:0,flour:0,tools:0,weapons:0},
                        isConstructing: bData.isConstructing,
                        buildProgress: bData.buildProgress,
                        baseY: bData.y,
                        shipState: bData.shipState || null,
                        nextVoyageTick: bData.nextVoyageTick || 0,
                    };
                    root.bData = realB; root.getChildMeshes().forEach(c => c.bData = realB);
                    GameState.buildings.push(realB);
                    if(bData.type === 'townhall') GameState.centerTile = realB;
                });

                // Bevölkerung wiederherstellen (mit Job-Hints)
                const jobHints = (data.population || []).map(p => p.job);
                const popCount = data.population ? data.population.length : (data.popCount || 0);
                for(let i = 0; i < popCount; i++) this.spawnCitizen();
                // Jobs nach Möglichkeit re-assignen
                setTimeout(() => {
                    GameState.buildings.filter(b => b.role && !b.isConstructing).forEach(b => {
                        const needed = b.maxWorkers - b.workers.length;
                        for(let i=0; i<needed; i++) {
                            const free = GameState.population.find(c => c.job === 'UNEMPLOYED');
                            if(free) free.assignJob(b);
                        }
                    });
                    this.uiNeedsUpdate = true;
                }, 500);

                if(this.buildingGrid) this.buildingGrid.rebuild(GameState.buildings);
                // Caches nach Laden invalidieren
                this._infraCache = null; this._towerCache = null; this._buffCache = null;
                if(this._lightPool) this._lightPool.forEach(p => { p.inUse = false; p.light.intensity = 0; });
                this.uiNeedsUpdate = true;
            },

            // Lokaler Auto-Save (localStorage)
            saveLocal(slot = 0) {
                try {
                    const data = this._buildSaveData();
                    localStorage.setItem(`ash_empire_save_${slot}`, JSON.stringify(data));
                    const ts = new Date().toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'});
                    localStorage.setItem(`ash_empire_save_${slot}_ts`, ts);
                    return true;
                } catch(e) { console.warn('LocalSave failed:', e); return false; }
            },

            loadLocal(slot = 0) {
                try {
                    const raw = localStorage.getItem(`ash_empire_save_${slot}`);
                    if(!raw) return false;
                    this._applySaveData(JSON.parse(raw));
                    return true;
                } catch(e) { console.warn('LocalLoad failed:', e); return false; }
            },

            getLocalSaveInfo(slot = 0) {
                const ts = localStorage.getItem(`ash_empire_save_${slot}_ts`);
                const raw = localStorage.getItem(`ash_empire_save_${slot}`);
                if(!raw) return null;
                try {
                    const d = JSON.parse(raw);
                    return { ts, epoch: d.epoch, pop: d.population?.length ?? d.popCount ?? 0, buildings: d.buildings?.length ?? 0 };
                } catch(e) { return null; }
            },

            // Cloud Save (verbessert)
            async saveGameCloud() {
                window.Sfx.click();
                // Immer zuerst lokal speichern als Backup
                this.saveLocal(0);
                if(!_fb().auth || !_fb().auth.currentUser) {
                    this.showMsg("💾 Lokal gespeichert (kein Cloud-Login)");
                    this.notify("💾 Spiel lokal gespeichert!", 'success');
                    return;
                }
                this.showMsg("☁️ Speichere in der Cloud...");
                try {
                    const data = this._buildSaveData();
                    const docRef = _fb().doc(_fb().db, 'artifacts', _fb().appId, 'users', _fb().auth.currentUser.uid, 'saves', 'slot1');
                    await _fb().setDoc(docRef, data);
                    this.showMsg("☁️ Cloud-Save erfolgreich!");
                    this.notify("☁️ Spiel in der Cloud gesichert!", 'success');
                } catch(e) { window.Sfx.error(); this.showMsg("Fehler beim Cloud-Save!"); }
            },

            async loadGameCloud() {
                window.Sfx.click();
                if(!_fb().auth || !_fb().auth.currentUser) {
                    // Fallback: lokal laden
                    if(this.loadLocal(0)) {
                        this.closeSettings();
                        this.showMsg("💾 Lokaler Speicherstand geladen!");
                        this.notify("💾 Lokaler Speicherstand geladen!", 'success');
                    } else {
                        window.Sfx.error(); this.showMsg("Kein Speicherstand gefunden.");
                    }
                    return;
                }
                this.showMsg("☁️ Lade aus der Cloud...");
                try {
                    const docRef = _fb().doc(_fb().db, 'artifacts', _fb().appId, 'users', _fb().auth.currentUser.uid, 'saves', 'slot1');
                    const docSnap = await _fb().getDoc(docRef);
                    if(docSnap.exists()) {
                        this._applySaveData(docSnap.data());
                        this.closeSettings();
                        this.showMsg("☁️ Cloud-Speicherstand geladen!");
                        this.notify("☁️ Spiel aus der Cloud geladen!", 'success');
                    } else {
                        // Fallback: lokal
                        if(this.loadLocal(0)) {
                            this.closeSettings();
                            this.showMsg("💾 Lokaler Speicherstand geladen (kein Cloud-Save).");
                        } else {
                            window.Sfx.error(); this.showMsg("Kein Speicherstand gefunden.");
                        }
                    }
                } catch(e) { window.Sfx.error(); this.showMsg("Fehler beim Laden!"); }
            },

            refreshSaveInfo() {
                const info = this.getLocalSaveInfo(0);
                const el = document.getElementById('local-save-info');
                if(!el) return;
                if(info) {
                    el.textContent = `Zuletzt: ${info.ts || '?'} · Epoche ${info.epoch || 1} · ${info.pop || 0} Bürger · ${info.buildings || 0} Gebäude`;
                } else {
                    el.textContent = 'Kein lokaler Speicherstand vorhanden';
                }
            },

            setBuildCategory(cat) {
                this.buildCategory = cat;
                document.querySelectorAll('.build-tab').forEach(b => b.classList.remove('active', 'text-cyan-400'));
                let act = document.querySelector(`.build-tab[data-cat="${cat}"]`);
                if(act) act.classList.add('active', 'text-cyan-400');

                document.querySelectorAll('.btn-build').forEach(btn => {
                    if(btn.dataset.cat === cat) btn.style.display = 'flex';
                    else btn.style.display = 'none';
                });
                this.uiNeedsUpdate = true;
            },

            toggleBuildMenu() {
                let wrapper = document.getElementById('build-menu-wrapper');
                if(!wrapper) return;
                wrapper.classList.toggle('hidden');
                // Beim Öffnen: aktive Kategorie anwenden damit nur der richtige Tab sichtbar ist
                if(!wrapper.classList.contains('hidden')) {
                    this.setBuildCategory(this.buildCategory || 'infra');
                }
                this.uiNeedsUpdate = true;
            },

            togglePause() {
                GameState.isPaused = !GameState.isPaused;
                let overlay = document.getElementById('pause-overlay');
                if(overlay) overlay.style.display = GameState.isPaused ? 'flex' : 'none';
                if(GameState.isPaused) document.querySelectorAll('.btn-speed').forEach(b => b.classList.remove('bg-purple-600'));
                else this.setSpeed(this.timeSpeed);
            },

            setSpeed(s) {
                if(GameState.isPaused) this.togglePause();
                this.timeSpeed = s;
                [1,2,3].forEach(x => {
                    let b = document.getElementById(`btn-speed-${x}`);
                    if(b) { if(x===s) b.classList.add('bg-purple-600'); else b.classList.remove('bg-purple-600'); }
                });
            },

            skipNight() {
                if(!GameState.isNight) return;
                // Springe direkt zu Tagesbeginn (timeOfDay = 0.25 = Mittag)
                GameState.timeOfDay = 0.26;
                window.Sfx.click();
                this.notify("☀️ Nacht übersprungen!", 'info');
            },

            _tutorialSteps: [
                {
                    icon: '🏛️',
                    title: 'Schritt 1 — Zentrum platzieren',
                    text: 'Drücke <b class="text-cyan-400 text-sm">B</b> → Tab <b class="text-cyan-400">🏠 Siedlung</b> → <b class="text-cyan-400">Zentrum</b> wählen → auf die Karte klicken.<br><span class="text-yellow-400 text-[10px]">⚠️ Das Tutorial geht erst weiter wenn du das Zentrum gebaut hast.</span>',
                    check: () => !!GameState.centerTile,
                    highlight: 'btn-build-townhall',
                    arrow: 'btn-build-townhall',
                    action: () => { if(!document.getElementById('build-menu-wrapper')?.classList.contains('hidden') === false) window.Game.toggleBuildMenu(); window.Game.setBuildCategory('infra'); }
                },
                {
                    icon: '🪵',
                    title: 'Schritt 2 — Holzfäller bauen',
                    text: 'Drücke <b class="text-cyan-400">B</b> → Tab <b class="text-cyan-400">🌾 Nahrung</b> → <b class="text-cyan-400">Holzfäller</b> bauen.<br>Dann Holzfäller anklicken und mit <b class="text-cyan-400 text-lg">+</b> einen Arbeiter zuweisen.',
                    check: () => GameState.buildings.some(b => b.type === 'lumbercamp' && b.workers.length > 0),
                    highlight: 'btn-build-lumbercamp',
                    arrow: 'btn-build-lumbercamp',
                    action: () => { const w = document.getElementById('build-menu-wrapper'); if(w?.classList.contains('hidden')) window.Game.toggleBuildMenu(); window.Game.setBuildCategory('res'); }
                },
                {
                    icon: '🪨',
                    title: 'Schritt 3 — Mine bauen',
                    text: 'Drücke <b class="text-cyan-400">B</b> → Tab <b class="text-cyan-400">🌾 Nahrung</b> → <b class="text-cyan-400">Mine</b> bauen.<br>Sofort Arbeiter zuweisen — du brauchst Stein für alles.',
                    check: () => GameState.buildings.some(b => b.type === 'quarry' && b.workers.length > 0),
                    highlight: 'btn-build-quarry',
                    arrow: 'btn-build-quarry',
                    action: () => { const w = document.getElementById('build-menu-wrapper'); if(w?.classList.contains('hidden')) window.Game.toggleBuildMenu(); window.Game.setBuildCategory('res'); }
                },
                {
                    icon: '🍖',
                    title: 'Schritt 4 — Nahrung sichern',
                    text: 'Drücke <b class="text-cyan-400">B</b> → Tab <b class="text-cyan-400">🌾 Nahrung</b> → <b class="text-cyan-400">Sammler</b> oder <b class="text-cyan-400">Jäger</b> bauen + Arbeiter zuweisen.<br><span class="text-red-400 text-[10px]">Ohne Nahrung verhungert deine Bevölkerung!</span>',
                    check: () => GameState.buildings.some(b => (b.type === 'gatherer' || b.type === 'hunter') && b.workers.length > 0),
                    highlight: 'btn-build-gatherer',
                    arrow: 'btn-build-gatherer',
                    action: () => { const w = document.getElementById('build-menu-wrapper'); if(w?.classList.contains('hidden')) window.Game.toggleBuildMenu(); window.Game.setBuildCategory('res'); }
                },
                {
                    icon: '⚙️',
                    title: 'Schritt 5 — Sägewerk bauen',
                    text: 'Drücke <b class="text-cyan-400">B</b> → Tab <b class="text-cyan-400">⚙️ Industrie</b> → <b class="text-cyan-400">Sägewerk</b> bauen (kostet 100 Holz + 50 Stein) + Arbeiter zuweisen.<br>Das Sägewerk produziert <b class="text-orange-300">Bretter</b> — ohne die kein Haus.',
                    check: () => GameState.buildings.some(b => b.type === 'sawmill' && b.workers.length > 0),
                    highlight: 'btn-build-sawmill',
                    arrow: 'btn-build-sawmill',
                    action: () => { const w = document.getElementById('build-menu-wrapper'); if(w?.classList.contains('hidden')) window.Game.toggleBuildMenu(); window.Game.setBuildCategory('ind'); }
                },
                {
                    icon: '🏠',
                    title: 'Schritt 6 — Haus bauen',
                    text: 'Jetzt wo das Sägewerk Bretter produziert: <b class="text-cyan-400">B</b> → Tab <b class="text-cyan-400">🏠 Siedlung</b> → <b class="text-cyan-400">Haus</b> bauen (kostet 20 Stein + 20 Bretter).<br>Jedes Haus gibt +4 maximale Bevölkerung.',
                    check: () => GameState.buildings.some(b => b.type === 'house' && !b.isConstructing),
                    highlight: 'btn-build-house',
                    arrow: 'btn-build-house',
                    action: () => { const w = document.getElementById('build-menu-wrapper'); if(w?.classList.contains('hidden')) window.Game.toggleBuildMenu(); window.Game.setBuildCategory('infra'); }
                },
                {
                    icon: '🔬',
                    title: 'Schritt 7 — Erste Forschung',
                    text: 'Klicke den <b class="text-cyan-400">🔬 Button</b> oben rechts und erforsche <b class="text-cyan-400">Bessere Werkzeuge</b>.<br>Das gibt allen Arbeitern +20% Geschwindigkeit — lohnt sich immer als erstes.',
                    check: () => Object.values(GameState.research).some(v => v === true),
                    highlight: null,
                    arrow: null,
                    arrowFixed: { right: '98px', top: '14px', text: '👇' },
                    action: () => { const w = document.getElementById('build-menu-wrapper'); if(!w?.classList.contains('hidden')) window.Game.toggleBuildMenu(); }
                },
                {
                    icon: '⚔️',
                    title: 'Schritt 8 — Epoche II',
                    text: 'Klicke dein <b class="text-cyan-400">Zentrum</b> an und upgrade auf <b class="text-cyan-400">Epoche II</b>.<br>Das schaltet Industrie, Mauern, Kaserne und Militär frei.',
                    check: () => GameState.currentEpoch >= 2,
                    highlight: null,
                    arrow: null,
                    arrowFixed: null,
                    action: () => { const w = document.getElementById('build-menu-wrapper'); if(!w?.classList.contains('hidden')) window.Game.toggleBuildMenu(); }
                },
                {
                    icon: '✅',
                    title: 'Bereit!',
                    text: 'Du kennst die Grundlagen. Jetzt liegt es an dir — baue dein Imperium, erforsche Technologien und verteidige dich gegen Feindwellen.<br><b class="text-green-400">Viel Erfolg!</b>',
                    check: () => true,
                    highlight: null, arrow: null, arrowFixed: null, action: null
                }
            ],

            initTutorial() {
                // Nur beim allerersten Start anzeigen
                if(localStorage.getItem('ash_empire_tutorial_done') === '1') {
                    this.tutorialActive = false;
                    const panel = document.getElementById('tutorial-panel');
                    if(panel) panel.classList.add('hidden');
                    return;
                }
                this.tutorialStep = 0;
                this.tutorialActive = true;
                const panel = document.getElementById('tutorial-panel');
                if(panel) panel.classList.remove('hidden');
                this.updateTutorialUI();
            },

            showTutorial() {
                // Manuell aus Einstellungen — setzt Flag zurück
                localStorage.removeItem('ash_empire_tutorial_done');
                this.tutorialStep = 0;
                this.tutorialActive = true;
                const panel = document.getElementById('tutorial-panel');
                if(panel) panel.classList.remove('hidden');
                this.updateTutorialUI();
                window.Sfx.click();
            },

            skipTutorial() {
                this.tutorialActive = false;
                localStorage.setItem('ash_empire_tutorial_done', '1');
                document.querySelectorAll('.tut-highlight').forEach(e => e.classList.remove('tut-highlight'));
                const arrow = document.getElementById('tutorial-arrow');
                if(arrow) arrow.classList.add('hidden');
                const panel = document.getElementById('tutorial-panel');
                if(panel) panel.classList.add('hidden');
                window.Sfx.click();
            },

            tutorialNext() {
                const step = this._tutorialSteps[this.tutorialStep];
                const isLast = this.tutorialStep >= this._tutorialSteps.length - 1;
                // ERZWUNGEN: Weiter nur wenn check() erfüllt
                if(!isLast && step && step.check && !step.check()) {
                    // Button schütteln
                    const btn = document.getElementById('btn-tut-next');
                    if(btn) {
                        btn.style.transition = 'none';
                        btn.style.transform = 'translateX(-6px)';
                        setTimeout(() => { btn.style.transition = 'transform 0.05s'; btn.style.transform = 'translateX(6px)'; }, 60);
                        setTimeout(() => { btn.style.transform = 'translateX(-4px)'; }, 120);
                        setTimeout(() => { btn.style.transform = 'translateX(4px)'; }, 180);
                        setTimeout(() => { btn.style.transform = 'translateX(0)'; }, 240);
                    }
                    this.showMsg('⚠️ Erst die Aufgabe erledigen!');
                    window.Sfx.error ? window.Sfx.error() : window.Sfx.click();
                    return;
                }
                window.Sfx.click();
                if(isLast) { this.skipTutorial(); return; }
                this.tutorialStep++;
                this.updateTutorialUI();
            },

            tutorialPrev() {
                window.Sfx.click();
                if(this.tutorialStep > 0) { this.tutorialStep--; this.updateTutorialUI(); }
            },

            updateTutorialUI() {
                if(!this.tutorialActive) return;
                const step = this._tutorialSteps[this.tutorialStep];
                const total = this._tutorialSteps.length;
                const el = id => document.getElementById(id);
                if(!step || !el('tutorial-panel')) return;

                // Inhalt
                if(el('tutorial-icon')) el('tutorial-icon').innerText = step.icon;
                if(el('tutorial-title')) el('tutorial-title').innerText = step.title;
                if(el('tutorial-text')) el('tutorial-text').innerHTML = step.text;
                if(el('tutorial-step-count')) el('tutorial-step-count').innerText = (this.tutorialStep + 1) + ' / ' + total;

                // Highlight auf Ziel-Button
                document.querySelectorAll('.tut-highlight').forEach(e => e.classList.remove('tut-highlight'));
                if(step.highlight) {
                    const target = document.getElementById(step.highlight);
                    if(target) target.classList.add('tut-highlight');
                }

                // Action ausführen (Menü öffnen, Tab wechseln)
                if(step.action) setTimeout(() => step.action(), 50);

                // Pfeil positionieren
                this._tutorialUpdateArrow(step);

                // Prev
                const prevBtn = el('btn-tut-prev');
                if(prevBtn) prevBtn.classList.toggle('hidden', this.tutorialStep === 0);

                // Weiter-Button: gesperrt bis check() true
                const done = step.check && step.check();
                const isLast = this.tutorialStep >= total - 1;
                const nextBtn = el('btn-tut-next');
                if(nextBtn) {
                    if(isLast) {
                        nextBtn.innerText = '🎉 Los gehts!';
                        nextBtn.disabled = false;
                        nextBtn.className = 'flex-1 py-2 rounded-lg text-[11px] font-black uppercase cursor-pointer bg-green-600 hover:bg-green-500 text-white tracking-wider';
                    } else if(done) {
                        nextBtn.innerText = '✅ Weiter →';
                        nextBtn.disabled = false;
                        nextBtn.className = 'flex-1 py-2 rounded-lg text-[11px] font-black uppercase cursor-pointer bg-green-700 hover:bg-green-600 text-green-100 tracking-wider';
                    } else {
                        nextBtn.innerText = '⏳ Erst Aufgabe erledigen';
                        nextBtn.disabled = true;
                        nextBtn.className = 'flex-1 py-2 rounded-lg text-[11px] font-bold uppercase bg-slate-800 text-slate-600 cursor-not-allowed tracking-wider';
                    }
                }

                // Fortschritts-Punkte
                const dots = el('tutorial-dots');
                if(dots) {
                    dots.innerHTML = '';
                    for(let i = 0; i < total; i++) {
                        const d = document.createElement('div');
                        d.className = 'rounded-full ' + (i === this.tutorialStep ? 'w-3 h-2 bg-cyan-400' : (i < this.tutorialStep ? 'w-2 h-2 bg-cyan-700' : 'w-2 h-2 bg-slate-700'));
                        dots.appendChild(d);
                    }
                }
            },

            checkTutorialProgress() {
                if(!this.tutorialActive) return;
                const step = this._tutorialSteps[this.tutorialStep];
                if(step && step.check && step.check()) {
                    // Schritt erledigt: Highlight + Pfeil entfernen, Button grün
                    document.querySelectorAll('.tut-highlight').forEach(e => e.classList.remove('tut-highlight'));
                    const arrow = document.getElementById('tutorial-arrow');
                    if(arrow) arrow.classList.add('hidden');
                    this.updateTutorialUI();
                }
            },

            _tutorialUpdateArrow(step) {
                const arrow = document.getElementById('tutorial-arrow');
                if(!arrow) return;

                // Kein Pfeil für diesen Schritt
                if(!step.arrow && !step.arrowFixed) {
                    arrow.classList.add('hidden');
                    return;
                }

                // Fester Pfeil (legacy — nur wenn kein Element-Ziel vorhanden)
                if(step.arrowFixed && !step.arrow) {
                    arrow.innerText = step.arrowFixed.text || '👇';
                    arrow.style.position = 'fixed';
                    arrow.style.right = step.arrowFixed.right || 'auto';
                    arrow.style.left = step.arrowFixed.left || 'auto';
                    arrow.style.top = step.arrowFixed.top || 'auto';
                    arrow.style.bottom = step.arrowFixed.bottom || 'auto';
                    arrow.classList.remove('hidden');
                    return;
                }

                // Element-basierter Pfeil — RAF für genaue Position nach Layout
                if(step.arrow) {
                    const positionArrow = () => {
                        const target = document.getElementById(step.arrow);
                        if(!target) { arrow.classList.add('hidden'); return; }
                        const rect = target.getBoundingClientRect();
                        if(rect.width === 0) {
                            // Element noch nicht sichtbar — nochmal versuchen
                            requestAnimationFrame(positionArrow);
                            return;
                        }
                        arrow.innerText = '👇';
                        arrow.style.position = 'fixed';
                        // Horizontal: Mitte des Elements
                        arrow.style.left = Math.round(rect.left + rect.width / 2 - 14) + 'px';
                        // Vertikal: direkt über dem Element (Emoji-Höhe ~28px + 4px Luft)
                        arrow.style.top = Math.round(rect.top - 34) + 'px';
                        arrow.style.right = 'auto';
                        arrow.style.bottom = 'auto';
                        arrow.classList.remove('hidden');
                    };
                    // Zwei Frames warten damit das Layout fertig ist
                    requestAnimationFrame(() => requestAnimationFrame(positionArrow));
                }
            },

            // Pfeil-Position regelmäßig aktualisieren (alle 30 Ticks)
            _tutorialRefreshArrow() {
                if(!this.tutorialActive) return;
                const step = this._tutorialSteps[this.tutorialStep];
                if(step) this._tutorialUpdateArrow(step);
            },

            start() {
                if (!this.scene) this.init(); 
                document.getElementById('start-screen').style.display = 'none';
                
                setTimeout(() => {
                    this.generateLandscape();
                    this.setupInteraction();
                    this.initMinimapBg();
                    setTimeout(() => this.applySeasonVisuals(GameState.season), 300);

                    let animRadius = new BABYLON.Animation("camRad", "radius", 30, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
                    animRadius.setKeys([{frame: 0, value: 300}, {frame: 90, value: 120}]);
                    let ease = new BABYLON.CubicEase(); ease.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEOUT);
                    animRadius.setEasingFunction(ease);
                    this.camera.animations.push(animRadius);
                    this.scene.beginAnimation(this.camera, 0, 90, false);

                    this.scene.onBeforeRenderObservable.add(() => this.updateLogic());
                    this.engine.runRenderLoop(() => this.scene.render());
                    window.addEventListener("resize", () => this.engine.resize());

                    document.getElementById('game-ui').style.display = 'block';
                    this.engine.resize(); 
                    this.uiNeedsUpdate = true;
                    this.updateResearchUI();
                    this.initTutorial();
                    this.showMsg("Platziere das Zentrum!");
                }, 100);
            },

            getHeightAt(x, z) {
                let dist = Math.sqrt(x*x + z*z);
                let nx = x / 70, nz = z / 70;
                let e = 1 * Noise.perlin2(nx, nz) + 0.5 * Noise.perlin2(2*nx, 2*nz) + 0.25 * Noise.perlin2(4*nx, 4*nz);
                let y = (e / 1.75) * 30; 
                
                if (dist < 40) {
                    let safe = this.waterLevel + 1.5; 
                    if (dist < 20) return safe;
                    let blend = (dist - 20) / 20; 
                    y = (safe * (1 - blend)) + (y * blend);
                }

                let mapRadius = this.mapSize / 2;
                let edgeStart = mapRadius * 0.8;
                if (dist > edgeStart) {
                    let fadeOut = (dist - edgeStart) / (mapRadius - edgeStart);
                    fadeOut = fadeOut * fadeOut * (3 - 2 * fadeOut);
                    y = BABYLON.Scalar.Lerp(y, this.waterLevel - 10, fadeOut);
                }
                return y;
            },

            // PERF: O(1) Set-Cache statt O(n) buildings.some() — invalidiert bei Bauen/Abreißen
            hasInfra(x, z, type) {
                if (!this._infraCache) this._rebuildInfraCache();
                return this._infraCache.has(`${Math.round(x)},${Math.round(z)},${type}`);
            },
            _rebuildInfraCache() {
                this._infraCache = new Set();
                GameState.buildings.forEach(b => {
                    for (let dx = -2; dx <= 2; dx++)
                        for (let dz = -2; dz <= 2; dz++)
                            this._infraCache.add(`${Math.round(b.x)+dx},${Math.round(b.z)+dz},${b.type}`);
                });
            },
            // PERF: Buff-Flags gecacht, alle 60 Ticks neu geprüft
            getBuffFlags() {
                const bucket = Math.floor(this.tickCounter / 60);
                if (this._buffCache !== null && this._buffCacheTick === bucket) return this._buffCache;
                this._buffCacheTick = bucket;
                this._buffCache = {
                    monument: GameState.buildings.some(b => b.type === 'monument' && !b.isConstructing),
                    school:   GameState.buildings.some(b => b.type === 'school'   && !b.isConstructing),
                };
                return this._buffCache;
            },

            createMaterials() {
                // Auto-Limit: jedes neue Material bekommt maxSimultaneousLights=8 gesetzt
                this._matObserver = this.scene.onNewMaterialAddedObservable?.add(mat => {
                    if(mat && mat.maxSimultaneousLights !== undefined) mat.maxSimultaneousLights = 8;
                });
                this.mats = {
                    wood: new BABYLON.StandardMaterial("mW", this.scene), stone: new BABYLON.StandardMaterial("mS", this.scene),
                    iron: new BABYLON.StandardMaterial("mIr", this.scene), coal: new BABYLON.StandardMaterial("mCo", this.scene),
                    brick: new BABYLON.StandardMaterial("mBrick", this.scene), roof: new BABYLON.StandardMaterial("mRoof", this.scene),
                    tent: new BABYLON.StandardMaterial("mTent", this.scene), road: new BABYLON.StandardMaterial("mRoad", this.scene),
                    path: new BABYLON.StandardMaterial("mPath", this.scene), gold: new BABYLON.StandardMaterial("mGold", this.scene), 
                    citizen: new BABYLON.StandardMaterial("mC", this.scene), enemy: new BABYLON.StandardMaterial("mE", this.scene), 
                    bush: new BABYLON.StandardMaterial("mB", this.scene), water: new BABYLON.StandardMaterial("wMat", this.scene), 
                    ghost: new BABYLON.StandardMaterial("mGh", this.scene), skin: new BABYLON.StandardMaterial("mSk", this.scene), 
                    neon: new BABYLON.StandardMaterial("mNeon", this.scene), dirt: new BABYLON.StandardMaterial("mDirt", this.scene), 
                    wheat: new BABYLON.StandardMaterial("mWheat", this.scene), deer: new BABYLON.StandardMaterial("mDeer", this.scene),
                    treeTrunk: new BABYLON.StandardMaterial("mTT", this.scene),
                    ork: new BABYLON.StandardMaterial("mOrk", this.scene),
                    nomad: new BABYLON.StandardMaterial("mNomad", this.scene),
                    boss: new BABYLON.StandardMaterial("mBoss", this.scene),
                };
                
                this.mats.wood.diffuseTexture = TextureGen.createWood(this.scene);
                this.mats.stone.diffuseTexture = TextureGen.createStone(this.scene);
                this.mats.brick.diffuseTexture = TextureGen.createBrick(this.scene);
                this.mats.roof.diffuseTexture = TextureGen.createRoof(this.scene);
                this.mats.tent.diffuseTexture = TextureGen.createTent(this.scene);
                this.mats.road.diffuseTexture = TextureGen.createRoad(this.scene);
                this.mats.path.diffuseTexture = TextureGen.createPath(this.scene);
                this.mats.path.useAlphaFromDiffuseTexture = true; this.mats.path.backFaceCulling = false;
                this.mats.deer.diffuseTexture = TextureGen.createDeer(this.scene);
                
                this.mats.gold.diffuseColor = new BABYLON.Color3(1, 0.8, 0); this.mats.gold.specularPower = 32;
                this.mats.citizen.diffuseColor = new BABYLON.Color3(0.2, 0.8, 1.0); 
                this.mats.enemy.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.1); this.mats.enemy.emissiveColor = new BABYLON.Color3(0.2, 0, 0); 
                this.mats.ork.diffuseColor = new BABYLON.Color3(0.15, 0.35, 0.1); this.mats.ork.emissiveColor = new BABYLON.Color3(0.05, 0.1, 0);
                this.mats.nomad.diffuseColor = new BABYLON.Color3(0.5, 0.35, 0.1); this.mats.nomad.emissiveColor = new BABYLON.Color3(0.1, 0.05, 0);
                this.mats.boss.diffuseColor = new BABYLON.Color3(0.4, 0.0, 0.4); 
                this.mats.boss.emissiveColor = new BABYLON.Color3(0.3, 0, 0.3);
                this.mats.boss.specularColor = new BABYLON.Color3(1, 0, 1);
                this.mats.boss.specularPower = 8;
                this.mats.bush.diffuseColor = new BABYLON.Color3(0.15, 0.55, 0.15);
                this.mats.skin.diffuseColor = new BABYLON.Color3(0.9, 0.7, 0.6);
                this.mats.dirt.diffuseColor = new BABYLON.Color3(0.3, 0.2, 0.1);
                this.mats.wheat.diffuseColor = new BABYLON.Color3(0.8, 0.7, 0.2);
                this.mats.iron.diffuseColor = new BABYLON.Color3(0.5, 0.3, 0.3);
                this.mats.coal.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.1);
                this.mats.treeTrunk.diffuseColor = new BABYLON.Color3(0.35, 0.22, 0.12);
                
                this.mats.water.diffuseColor = new BABYLON.Color3(0.1, 0.4, 0.8); this.mats.water.alpha = 0.7; this.mats.water.specularPower = 128;
                this.mats.ghost.emissiveColor = new BABYLON.Color3(0.2, 1, 0.2); this.mats.ghost.alpha = 0.5; this.mats.ghost.disableLighting = true;
                this.mats.neon.emissiveColor = new BABYLON.Color3(0.6, 0.1, 1.0); this.mats.neon.diffuseColor = new BABYLON.Color3(0,0,0);
                
                this.particleTex = TextureGen.createParticleBase(this.scene);
                this.rainDropTex = TextureGen.createRainDrop(this.scene);

                let groundMat = new BABYLON.StandardMaterial("gMat", this.scene);
                groundMat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05); groundMat.specularPower = 64; groundMat.useVertexColors = true; groundMat.maxSimultaneousLights = 8; 
                this.mats.ground = groundMat;

                // Alle geteilten Materialien auf 8 Lichter begrenzen — verhindert GL_MAX_VERTEX_UNIFORM_BUFFERS-Overflow
                Object.values(this.mats).forEach(m => { if(m && m.maxSimultaneousLights !== undefined) m.maxSimultaneousLights = 8; });
            },

            createRainSystem() {
                this.rainPS = new BABYLON.ParticleSystem("rain", 5000, this.scene);
                this.rainPS.particleTexture = this.rainDropTex;
                this.rainPS.emitter = this.camera;
                this.rainPS.minEmitBox = new BABYLON.Vector3(-80, 50, -80);
                this.rainPS.maxEmitBox = new BABYLON.Vector3(80, 80, 80);
                this.rainPS.color1 = new BABYLON.Color4(0.7, 0.8, 1.0, 0.6);
                this.rainPS.color2 = new BABYLON.Color4(0.5, 0.6, 0.8, 0.4);
                this.rainPS.colorDead = new BABYLON.Color4(0, 0, 0, 0);
                this.rainPS.minSize = 0.2; this.rainPS.maxSize = 0.5;
                this.rainPS.minLifeTime = 1; this.rainPS.maxLifeTime = 2;
                this.rainPS.emitRate = 0; 
                this.rainPS.blendMode = BABYLON.ParticleSystem.BLENDMODE_ALPHA;
                this.rainPS.gravity = new BABYLON.Vector3(0, -30, 0);
                this.rainPS.direction1 = new BABYLON.Vector3(0, -1, 0);
                this.rainPS.direction2 = new BABYLON.Vector3(2, -1, 2);
                this.rainPS.start();
            },

            createSnowSystem() {
                this.snowPS = new BABYLON.ParticleSystem("snow", 3000, this.scene);
                this.snowPS.particleTexture = this.particleTex;
                this.snowPS.emitter = this.camera;
                this.snowPS.minEmitBox = new BABYLON.Vector3(-100, 30, -100);
                this.snowPS.maxEmitBox = new BABYLON.Vector3(100, 60, 100);
                this.snowPS.color1 = new BABYLON.Color4(1.0, 1.0, 1.0, 0.9);
                this.snowPS.color2 = new BABYLON.Color4(0.8, 0.9, 1.0, 0.7);
                this.snowPS.colorDead = new BABYLON.Color4(1, 1, 1, 0);
                this.snowPS.minSize = 0.3; this.snowPS.maxSize = 0.8;
                this.snowPS.minLifeTime = 4; this.snowPS.maxLifeTime = 8;
                this.snowPS.emitRate = 0;
                this.snowPS.blendMode = BABYLON.ParticleSystem.BLENDMODE_ALPHA;
                this.snowPS.gravity = new BABYLON.Vector3(0, -2, 0);
                this.snowPS.direction1 = new BABYLON.Vector3(-0.5, -1, -0.5);
                this.snowPS.direction2 = new BABYLON.Vector3(0.5, -1, 0.5);
                this.snowPS.minAngularSpeed = -1; this.snowPS.maxAngularSpeed = 1;
                this.snowPS.start();
            },

            spawnSmoke(parent, offset) {
                const ps = new BABYLON.ParticleSystem("smoke", 30, this.scene);
                ps.particleTexture = this.particleTex; ps.emitter = parent;
                ps.minEmitBox = new BABYLON.Vector3(offset.x-0.1, offset.y, offset.z-0.1); ps.maxEmitBox = new BABYLON.Vector3(offset.x+0.1, offset.y, offset.z+0.1);
                ps.color1 = new BABYLON.Color4(0.4, 0.4, 0.4, 0.4); ps.color2 = new BABYLON.Color4(0.6, 0.6, 0.6, 0.1); ps.colorDead = new BABYLON.Color4(1, 1, 1, 0);
                ps.minSize = 0.5; ps.maxSize = 1.2; ps.minLifeTime = 1.5; ps.maxLifeTime = 3; ps.emitRate = 4;
                ps.blendMode = BABYLON.ParticleSystem.BLENDMODE_ALPHA; ps.gravity = new BABYLON.Vector3(0, 1.0, 0);
                ps.start(); return ps;
            },

            createFireflies() {
                this.fireflies = new BABYLON.ParticleSystem("fireflies", 300, this.scene);
                this.fireflies.particleTexture = this.particleTex;
                this.fireflies.emitter = new BABYLON.Vector3(0, 0, 0);
                this.fireflies.minEmitBox = new BABYLON.Vector3(-120, 1, -120);
                this.fireflies.maxEmitBox = new BABYLON.Vector3(120, 5, 120);
                this.fireflies.color1 = new BABYLON.Color4(0.5, 1.0, 0.5, 0.8);
                this.fireflies.color2 = new BABYLON.Color4(0.2, 0.8, 0.2, 0.4);
                this.fireflies.colorDead = new BABYLON.Color4(0, 0, 0, 0);
                this.fireflies.minSize = 0.1; this.fireflies.maxSize = 0.3;
                this.fireflies.minLifeTime = 1.5; this.fireflies.maxLifeTime = 3;
                this.fireflies.emitRate = 0; 
                this.fireflies.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
                this.fireflies.gravity = new BABYLON.Vector3(0, 0.2, 0);
                this.fireflies.direction1 = new BABYLON.Vector3(-0.5, -0.2, -0.5);
                this.fireflies.direction2 = new BABYLON.Vector3(0.5, 0.2, 0.5);
                this.fireflies.start();
            },

            spawnResParticles(pos, colorHex) {
                const ps = new BABYLON.ParticleSystem("res", 15, this.scene);
                ps.particleTexture = this.particleTex; ps.emitter = pos;
                ps.minEmitBox = new BABYLON.Vector3(-0.2, 0, -0.2); ps.maxEmitBox = new BABYLON.Vector3(0.2, 0.5, 0.2);
                let col = BABYLON.Color3.FromHexString(colorHex);
                ps.color1 = new BABYLON.Color4(col.r, col.g, col.b, 1.0); ps.color2 = new BABYLON.Color4(col.r, col.g, col.b, 0.5); ps.colorDead = new BABYLON.Color4(0, 0, 0, 0);
                ps.minSize = 0.2; ps.maxSize = 0.5; ps.minLifeTime = 0.5; ps.maxLifeTime = 1; ps.emitRate = 100;
                ps.gravity = new BABYLON.Vector3(0, -2, 0); ps.direction1 = new BABYLON.Vector3(-1, 3, -1); ps.direction2 = new BABYLON.Vector3(1, 5, 1);
                ps.targetStopDuration = 0.2; ps.disposeOnStop = true;
                ps.start();
            },

            generateLandscape() {
                this.groundMesh = BABYLON.MeshBuilder.CreateGround("ground", {width: this.mapSize, height: this.mapSize, subdivisions: 250, updatable: true}, this.scene);
                this.groundMesh.receiveShadows = true;
                let positions = this.groundMesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
                let colors = [];
                
                for(let p = 0; p < positions.length; p+=3) {
                    let x = positions[p], z = positions[p+2], y = this.getHeightAt(x, z);
                    positions[p+1] = y;
                    
                    let col;
                    if (y < this.waterLevel + 0.6) col = [0.8, 0.7, 0.4, 1]; 
                    else if (y < 6) col = [0.15, 0.35, 0.15, 1]; 
                    else if (y < 14) col = [0.3, 0.3, 0.35, 1]; 
                    else col = [0.8, 0.8, 0.85, 1]; 
                    let r = (Math.random() * 0.08) - 0.04; colors.push(col[0]+r, col[1]+r, col[2]+r, 1);
                }
                this.groundMesh.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
                this.groundMesh.setVerticesData(BABYLON.VertexBuffer.ColorKind, new Float32Array(colors));
                this.groundMesh.material = this.mats.ground;

                this.waterMesh = BABYLON.MeshBuilder.CreateGround("water", {width: this.mapSize, height: this.mapSize}, this.scene);
                this.waterMesh.position = new BABYLON.Vector3(0, this.waterLevel, 0); 
                this.waterMesh.material = this.mats.water; 
                this.waterMesh.isPickable = false;
                setTimeout(() => this.spawnFish(), 500);

                // Gestaffeltes Laden — 24 Batches à 500 = 12000, ein Batch pro Frame
                let spawnBatch = 0;
                const totalBatches = 24;
                const batchSize = 500;
                const spawnInterval = setInterval(() => {
                    for(let i = 0; i < batchSize; i++) {
                        let x = (Math.random() - 0.5) * (this.mapSize - 10);
                        let z = (Math.random() - 0.5) * (this.mapSize - 10);
                        if(Math.abs(x) < 25 && Math.abs(z) < 25) continue;

                        let y = this.getHeightAt(x, z);
                        if(y < this.waterLevel + 0.6) continue;

                        let forestNoise = Noise.perlin2(x / 15 + 100, z / 15 + 100);

                        if(y < 6) {
                            if(forestNoise > 0.15) {
                                let rNode = new BABYLON.TransformNode("tr", this.scene);
                                rNode.position = new BABYLON.Vector3(x, y, z);
                                let tr = BABYLON.MeshBuilder.CreateCylinder("t", {diameter: 0.6, height: 1.5}, this.scene);
                                tr.position.y = 0.75; tr.parent = rNode; tr.material = this.mats.treeTrunk;
                                let cr = BABYLON.MeshBuilder.CreateCylinder("c", {diameterTop:0, diameterBottom:3.5, height:4.5, tessellation:4}, this.scene);
                                cr.position.y = 3.5; cr.parent = rNode; cr.material = this.mats.bush;
                                GameState.mapProps.trees.push({x, z, mesh: rNode, health: 50});
                                if(this.chunkGrid) this.chunkGrid.addTree(GameState.mapProps.trees[GameState.mapProps.trees.length-1]);
                            } else if(forestNoise < -0.05 && Math.random() < 0.5) {
                                let rNode = new BABYLON.TransformNode("br", this.scene);
                                rNode.position = new BABYLON.Vector3(x, y + 0.2, z);
                                let b1 = BABYLON.MeshBuilder.CreateSphere("b1", {diameter: 1.5, segments: 8}, this.scene);
                                b1.position = new BABYLON.Vector3(0, 0.6, 0); b1.parent = rNode; b1.material = this.mats.bush;
                                let b2 = BABYLON.MeshBuilder.CreateSphere("b2", {diameter: 1.2, segments: 8}, this.scene);
                                b2.position = new BABYLON.Vector3(0.5, 0.4, 0.4); b2.parent = rNode; b2.material = this.mats.bush;
                                GameState.mapProps.bushes.push({x, z, mesh: rNode, health: 30});
                                if(this.chunkGrid) this.chunkGrid.addBush(GameState.mapProps.bushes[GameState.mapProps.bushes.length-1]);
                            }
                        } else if(y >= 6 && y < 14 && Math.random() < 0.25) {
                            let rockType = 'stone';
                            if(Math.random() < 0.2) rockType = 'iron';
                            else if(Math.random() < 0.2) rockType = 'coal';
                            this.spawnRock(x, y, z, rockType);
                        }
                    }
                    spawnBatch++;
                    if(spawnBatch >= totalBatches) clearInterval(spawnInterval);
                }, 16);

                for(let i=0; i<80; i++) this.spawnAnimal();
            },

            spawnRock(x, y, z, type) {
                let mesh = BABYLON.MeshBuilder.CreateIcoSphere("rock", { radius: 1.0, subdivisions: 1 }, this.scene);
                mesh.rotation = new BABYLON.Vector3(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
                mesh.position = new BABYLON.Vector3(x, y + 0.5, z); 
                mesh.material = type === 'iron' ? this.mats.iron : (type === 'coal' ? this.mats.coal : this.mats.stone);
                
                GameState.mapProps.rocks.push({x, z, mesh, health: 100, rockType: type});
                if(this.chunkGrid) this.chunkGrid.addRock(GameState.mapProps.rocks[GameState.mapProps.rocks.length-1]);
            },

            spawnAnimal() {
                let angle = Math.random() * Math.PI * 2;
                let radius = 50 + Math.random() * 200;
                let px = Math.cos(angle) * radius, pz = Math.sin(angle) * radius;
                let py = this.getHeightAt(px, pz);
                if (py <= this.waterLevel + 0.5) return;

                let root = new BABYLON.TransformNode("a_root", this.scene);
                let body = BABYLON.MeshBuilder.CreateBox("a_body", {width:0.4, height:0.5, depth:0.8}, this.scene); body.position.y = 0.5; body.parent = root;
                let head = BABYLON.MeshBuilder.CreateBox("a_head", {width:0.3, height:0.3, depth:0.4}, this.scene); head.position.set(0, 0.8, 0.4); head.parent = root;
                let legL = BABYLON.MeshBuilder.CreateBox("a_legL", {width:0.1, height:0.4, depth:0.1}, this.scene); legL.position.set(-0.15, 0.2, 0.2); legL.parent = root;
                let legR = BABYLON.MeshBuilder.CreateBox("a_legR", {width:0.1, height:0.4, depth:0.1}, this.scene); legR.position.set(0.15, 0.2, -0.2); legR.parent = root;
                
                body.material = this.mats.deer; head.material = this.mats.deer; legL.material = this.mats.stone; legR.material = this.mats.stone;
                

                root.position = new BABYLON.Vector3(px, py, pz);
                let animal = new Animal(root, this.scene);
                animal.legL = legL; animal.legR = legR;
                GameState.animals.push(animal);
            },

            spawnFish() {
                this.fishObjects = [];
                const fishMat = new BABYLON.StandardMaterial("fishMat", this.scene);
                fishMat.diffuseColor = new BABYLON.Color3(0.1, 0.4, 0.8);
                fishMat.emissiveColor = new BABYLON.Color3(0.0, 0.08, 0.15);
                fishMat.backFaceCulling = false;

                const tailMat = new BABYLON.StandardMaterial("tailMat", this.scene);
                tailMat.diffuseColor = new BABYLON.Color3(0.05, 0.25, 0.55);
                tailMat.emissiveColor = new BABYLON.Color3(0.0, 0.05, 0.1);

                for(let i = 0; i < 20; i++) {
                    let angle = Math.random() * Math.PI * 2;
                    let r = 15 + Math.random() * 80;
                    let fx = Math.cos(angle) * r, fz = Math.sin(angle) * r;
                    if(this.getHeightAt(fx, fz) > this.waterLevel + 0.3) continue;

                    let root = new BABYLON.TransformNode("fish_root", this.scene);
                    root.position = new BABYLON.Vector3(fx, this.waterLevel - 0.05, fz);

                    // Körper
                    let body = BABYLON.MeshBuilder.CreateBox("fb", {width:0.7, height:0.18, depth:0.25}, this.scene);
                    body.parent = root; body.material = fishMat; body.isPickable = false;
                    // Schwanzflosse
                    let tail = BABYLON.MeshBuilder.CreateBox("ft", {width:0.25, height:0.12, depth:0.08}, this.scene);
                    tail.position.x = -0.45; tail.parent = root; tail.material = tailMat; tail.isPickable = false;

                    root._fishDir = Math.random() * Math.PI * 2;
                    root._fishSpd = 0.012 + Math.random() * 0.018;
                    root._fishTailAnim = 0;
                    root._tailMesh = tail;
                    this.fishObjects.push(root);
                }

                // Fisch-Bewegung im Render-Loop
                this._fishAnimHandle = this.scene.onBeforeRenderObservable.add(() => {
                    if(!this.fishObjects) return;
                    this.fishObjects.forEach(f => {
                        if(!f || f.isDisposed()) return;
                        // Richtungsänderung
                        f._fishDir += (Math.random() - 0.5) * 0.04;
                        f.position.x += Math.cos(f._fishDir) * f._fishSpd;
                        f.position.z += Math.sin(f._fishDir) * f._fishSpd;
                        f.position.y = this.waterLevel - 0.05;
                        f.rotation.y = -f._fishDir;
                        // Umkehren wenn zu weit draußen
                        if(Math.hypot(f.position.x, f.position.z) > 120) f._fishDir += Math.PI;
                        // Schwanzflosse animieren
                        if(f._tailMesh) {
                            f._fishTailAnim += 0.15;
                            f._tailMesh.rotation.y = Math.sin(f._fishTailAnim) * 0.4;
                        }
                    });
                });
            },

            initMinimapBg() {
                const c = document.createElement('canvas'); c.width = 160; c.height = 160;
                const ctx = c.getContext('2d');
                ctx.fillStyle = '#1e3a8a'; ctx.fillRect(0,0,160,160); 
                ctx.fillStyle = '#14532d'; 
                for(let x=0; x<160; x+=2) {
                    for(let y=0; y<160; y+=2) {
                        let wx = ((x-80)/160)*this.mapSize;
                        let wz = ((y-80)/160)*this.mapSize;
                        if(this.getHeightAt(wx, wz) > this.waterLevel + 0.2) ctx.fillRect(x,y,2,2);
                    }
                }
                this.minimapBg = c;
            },

            setupInteraction() {
                // Drag-State für Straßen/Brücken
                this._isDraggingRoad = false;
                this._lastDragX = null;
                this._lastDragZ = null;

                this.scene.onPointerMove = (evt, pickResult) => {
                    if(GameState.buildMode && this.ghostRoot) {
                        if(evt.target.tagName !== 'CANVAS') { this.ghostRoot.isVisible = false; return; }

                        let hit = this.scene.pick(this.scene.pointerX, this.scene.pointerY, (mesh) => mesh.name === "ground");
                        if(hit.hit && hit.pickedPoint) {
                            this.ghostRoot.isVisible = true;
                            // Straßen auf 2er-Raster snappen damit Kacheln bündig aneinanderliegen
                            const isRoadMode = GameState.buildMode === 'road' || GameState.buildMode === 'path' || GameState.buildMode === 'bridge';
                            let x = isRoadMode 
                                ? Math.round(hit.pickedPoint.x / 2) * 2
                                : Math.round(hit.pickedPoint.x);
                            let z = isRoadMode
                                ? Math.round(hit.pickedPoint.z / 2) * 2
                                : Math.round(hit.pickedPoint.z);
                            let yCenter = this.getHeightAt(x, z); 
                            
                            if(GameState.buildMode === 'bridge' || GameState.buildMode === 'port' || GameState.buildMode === 'wharf') yCenter = this.waterLevel;
                            else if(GameState.buildMode === 'road' || GameState.buildMode === 'path') yCenter = 0;
                            this.ghostRoot.position = new BABYLON.Vector3(x, yCenter, z);
                            this.snapGroundMeshToTerrain(this.ghostRoot, GameState.buildMode, x, yCenter, z, true);

                            let canPlace = true;
                            if (GameState.buildMode === 'bridge' || GameState.buildMode === 'port' || GameState.buildMode === 'wharf') { 
                                if(this.getHeightAt(x,z) > this.waterLevel + 0.6) canPlace = false; 
                            } else { 
                                if(this.getHeightAt(x,z) <= this.waterLevel + 0.5) canPlace = false;
                            }
                            if(canPlace && GameState.buildMode !== 'road' && GameState.buildMode !== 'path' && GameState.buildMode !== 'bridge') {
                                const bSize = (BUILDINGS[GameState.buildMode]?.size || 3) / 2 + 1;
                                const nearby = window.getNearbyBuildings(x, z, bSize + 5);
                                const collision = nearby.find(b =>
                                    b.type !== 'road' && b.type !== 'path' &&
                                    Math.hypot(b.x - x, b.z - z) < bSize + (BUILDINGS[b.type]?.size || 3) / 2
                                );
                                if(collision) canPlace = false;
                            }
                            if(canPlace && (GameState.buildMode === 'port' || GameState.buildMode === 'wharf')) {
                                if(this.getHeightAt(x,z) > this.waterLevel + 0.6) canPlace = false;
                            }
                            let color = canPlace ? new BABYLON.Color3(0.2, 1, 0.2) : new BABYLON.Color3(1, 0, 0);
                            const isRoadGhost = GameState.buildMode === 'road' || GameState.buildMode === 'path' || GameState.buildMode === 'bridge';
                            this.ghostRoot.getChildMeshes().forEach(m => { 
                                if(m.material) {
                                    m.material.emissiveColor = color;
                                    // Straßen-Ghost sehr transparent damit gebaute Straßen darunter sichtbar bleiben
                                    m.material.alpha = isRoadGhost ? 0.35 : 0.5;
                                }
                            });

                            // Drag-to-build: Straße/Brücke beim Ziehen platzieren
                            if(this._isDraggingRoad && canPlace && (GameState.buildMode === 'road' || GameState.buildMode === 'bridge')) {
                                if(x !== this._lastDragX || z !== this._lastDragZ) {
                                    // Diagonale Lücken füllen: Zwischenpunkte platzieren
                                    if(this._lastDragX !== null && this._lastDragZ !== null) {
                                        const dx = x - this._lastDragX;
                                        const dz = z - this._lastDragZ;
                                        if(Math.abs(dx) > 2 || Math.abs(dz) > 2) {
                                            // Großer Sprung — Linie interpolieren
                                            const steps = Math.max(Math.abs(dx), Math.abs(dz)) / 2;
                                            for(let s = 1; s < steps; s++) {
                                                const ix = Math.round((this._lastDragX + dx * (s/steps)) / 2) * 2;
                                                const iz = Math.round((this._lastDragZ + dz * (s/steps)) / 2) * 2;
                                                this.placeBuilding(GameState.buildMode, ix, iz);
                                            }
                                        } else if(dx !== 0 && dz !== 0) {
                                            // Diagonaler Schritt — Füllkachel auf der Achse mit mehr Bewegung
                                            if(Math.abs(dx) >= Math.abs(dz)) {
                                                this.placeBuilding(GameState.buildMode, x, this._lastDragZ);
                                            } else {
                                                this.placeBuilding(GameState.buildMode, this._lastDragX, z);
                                            }
                                        }
                                    }
                                    this._lastDragX = x; this._lastDragZ = z;
                                    this.placeBuilding(GameState.buildMode, x, z);
                                }
                            }
                        } else this.ghostRoot.isVisible = false;
                    }
                };

                this.scene.onPointerDown = (evt, pickResult) => {
                    if(evt.target.tagName !== 'CANVAS') return;

                    if(evt.button === 2) { 
                        if(GameState.buildMode) this.setBuildMode(null); 
                        else if(this.selectedTroop) { 
                            if(this.selectedTroop.bodyMesh) this.hl.removeMesh(this.selectedTroop.bodyMesh);
                            this.selectedTroop = null; 
                        } else this.closeInspector(); 
                        return; 
                    }
                    if(evt.button !== 0) return; 
                    
                    if(GameState.buildMode) {
                        const isRoadType = GameState.buildMode === 'road' || GameState.buildMode === 'bridge';
                        // Drag starten für Straßen/Brücken
                        if(isRoadType) this._isDraggingRoad = true;

                        let hit = this.scene.pick(this.scene.pointerX, this.scene.pointerY, (mesh) => mesh.name === "ground");
                        if (hit.hit && hit.pickedPoint) {
                            const isRoadSnap = GameState.buildMode === 'road' || GameState.buildMode === 'path' || GameState.buildMode === 'bridge';
                            let x = isRoadSnap ? Math.round(hit.pickedPoint.x / 2) * 2 : Math.round(hit.pickedPoint.x);
                            let z = isRoadSnap ? Math.round(hit.pickedPoint.z / 2) * 2 : Math.round(hit.pickedPoint.z);

                            let canPlace = true;
                            if (GameState.buildMode === 'bridge' || GameState.buildMode === 'port' || GameState.buildMode === 'wharf') { 
                                if(this.getHeightAt(x,z) > this.waterLevel + 0.6) canPlace = false; 
                            } else { 
                                if(this.getHeightAt(x,z) <= this.waterLevel + 0.5) canPlace = false; 
                            }
                            if(canPlace && GameState.buildMode !== 'road' && GameState.buildMode !== 'path' && GameState.buildMode !== 'bridge') {
                                const minDist = (BUILDINGS[GameState.buildMode]?.size || 3) / 2 + 1;
                                const nearby = window.getNearbyBuildings(x, z, minDist + 5);
                                const collision = nearby.find(b =>
                                    b.type !== 'road' && b.type !== 'path' &&
                                    Math.hypot(b.x - x, b.z - z) < minDist + (BUILDINGS[b.type]?.size || 3) / 2
                                );
                                if(collision) { canPlace = false; this.showMsg(`Zu nah an ${BUILDINGS[collision.type]?.name || collision.type}!`); }
                            }
                            if(canPlace) {
                                this._lastDragX = x; this._lastDragZ = z;
                                this.placeBuilding(GameState.buildMode, x, z); 
                                if(!isRoadType) this.setBuildMode(null); 
                            } else {
                                window.Sfx.error();
                            }
                        }
                    } else {
                        let hit = this.scene.pick(this.scene.pointerX, this.scene.pointerY);
                        if(hit.hit && hit.pickedMesh && hit.pickedMesh.bData) { window.Sfx.click(); this.selectBuilding(hit.pickedMesh.bData); }
                        else if(hit.hit && hit.pickedMesh) {
                            // Truppe angeklickt?
                            const troop = GameState.population.find(c =>
                                ['SOLDIER','KNIGHT','ARCHER','GUARD'].includes(c.job) &&
                                c.mesh.getChildMeshes().includes(hit.pickedMesh)
                            );
                            if(troop) {
                                // Truppe auswählen
                                if(this.selectedTroop) this.hl.removeMesh(this.selectedTroop.bodyMesh);
                                this.selectedTroop = troop;
                                if(troop.bodyMesh) this.hl.addMesh(troop.bodyMesh, BABYLON.Color3.Yellow());
                                window.Sfx.click();
                                this.showMsg(`${troop.job === 'KNIGHT' ? '🛡️ Ritter' : troop.job === 'ARCHER' ? '🏹 Bogenschütze' : '⚔️ Soldat'} ausgewählt — Rechtsklick zum Bewegen`);
                            } else if(this.selectedTroop) {
                                // Ausgewählte Truppe bleibt — auf Boden klicken zum Bewegen
                                if(hit.pickedMesh.name === 'ground' && hit.pickedPoint) {
                                    this.selectedTroop.patrolTarget = new BABYLON.Vector3(hit.pickedPoint.x, 0, hit.pickedPoint.z);
                                    this.selectedTroop.state = 'IDLE';
                                    this.spawnResParticles(hit.pickedPoint, "#facc15");
                                    window.Sfx.click();
                                }
                            } else if(hit.pickedMesh.name === 'ground') {
                                this.closeInspector();
                            }
                        } else if(hit.hit && hit.pickedMesh && hit.pickedMesh.name === "ground") {
                            if(this.selectedTroop && hit.pickedPoint) {
                                this.selectedTroop.patrolTarget = new BABYLON.Vector3(hit.pickedPoint.x, 0, hit.pickedPoint.z);
                                this.selectedTroop.state = 'IDLE';
                                this.spawnResParticles(hit.pickedPoint, "#facc15");
                                window.Sfx.click();
                            } else {
                                this.closeInspector();
                            }
                        }
                    }
                };

                // Drag-Ende: Straßen-Ziehen stoppen
                this.scene.onPointerUp = (evt) => {
                    if(evt.button === 0) {
                        this._isDraggingRoad = false;
                        this._lastDragX = null;
                        this._lastDragZ = null;
                    }
                };
            },

            // NEU: Robuste Terrain-Anpassung via WorldMatrix Transformation
            snapGroundMeshToTerrain(root, type, x, y, z, isGhost = false) {
                if (type === 'road' || type === 'path') {
                    let groundObj = root.getChildMeshes().find(m => m.name === "b");
                    if(!groundObj) return;

                    root.position.y = 0;

                    const positions = groundObj.getVerticesData(BABYLON.VertexBuffer.PositionKind);
                    if(!positions) return;

                    // Für jeden Vertex: Terrain-Höhe aus mehreren umliegenden Punkten nehmen
                    // und den HÖCHSTEN verwenden — so versinkt die Straße nie im Hang
                    const sampleRadius = 0.5; // Abtastradius um jeden Vertex
                    const offsets = [
                        [0, 0],
                        [sampleRadius, 0], [-sampleRadius, 0],
                        [0, sampleRadius], [0, -sampleRadius],
                        [sampleRadius, sampleRadius], [-sampleRadius, sampleRadius],
                        [sampleRadius, -sampleRadius], [-sampleRadius, -sampleRadius]
                    ];

                    for(let i = 0; i < positions.length; i += 3) {
                        const wx = x + positions[i];
                        const wz = z + positions[i + 2];

                        // Höchsten Terrain-Punkt in der Umgebung dieses Vertex nehmen
                        let maxH = -Infinity;
                        for(const [ox, oz] of offsets) {
                            const h = this.getHeightAt(wx + ox, wz + oz);
                            if(h > maxH) maxH = h;
                        }

                        positions[i + 1] = maxH + (isGhost ? 0.15 : 0.02);
                    }

                    groundObj.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);

                    const normals = [];
                    BABYLON.VertexData.ComputeNormals(positions, groundObj.getIndices(), normals);
                    groundObj.updateVerticesData(BABYLON.VertexBuffer.NormalKind, normals);
                    groundObj.refreshBoundingInfo();

                    if(!isGhost && groundObj.material) {
                        groundObj.material.zOffset = -2;
                    }
                }
            },

            setBuildMode(type) {
                setTimeout(() => {
                    document.querySelectorAll('.btn-build').forEach(b => b.classList.remove('active'));
                    if(this.ghostRoot) { this.ghostRoot.dispose(); this.ghostRoot = null; }

                    if(type && BUILDINGS[type]) {
                        GameState.buildMode = type; GameState.buildRotation = 0;
                        let btn = document.getElementById(`btn-build-${type}`); if(btn) btn.classList.add('active');
                        this.ghostRoot = BABYLON.MeshBuilder.CreateBox("ghostRoot", {size: 0.1}, this.scene);
                        MeshFactory.createBuildingGeometry(type, this.ghostRoot, this.scene, this.mats, true);
                        this.ghostRoot.getChildMeshes().forEach(m => { m.material = this.mats.ghost; m.isPickable = false; });
                    } else {
                        GameState.buildMode = null;
                    }
                }, 50);
            },

            placeBuilding(type, x, z) {
                const cfg = BUILDINGS[type]; 
                let costW = cfg.cost.w||0, costS = cfg.cost.s||0, costG = cfg.cost.g||0, costP = cfg.cost.p||0, costB = cfg.cost.b||0, costI = cfg.cost.i||0;
                
                if(GameState.resources.wood < costW || GameState.resources.stone < costS || GameState.resources.gold < costG || GameState.resources.planks < costP || GameState.resources.bricks < costB || GameState.resources.iron < costI) { 
                    window.Sfx.error(); this.showMsg("Ressourcen fehlen!"); return; 
                }
                
                window.Sfx.build();
                GameState.resources.wood -= costW; GameState.resources.stone -= costS; GameState.resources.gold -= costG; GameState.resources.planks -= costP; GameState.resources.bricks -= costB; GameState.resources.iron -= costI;
                let y = (type === 'bridge' || type === 'port' || type === 'wharf') ? this.waterLevel 
                       : (type === 'road' || type === 'path') ? 0 
                       : this.getHeightAt(x, z);
                
                let root = BABYLON.MeshBuilder.CreateBox("r_" + type, {size: 0.1}, this.scene);
                root.position = new BABYLON.Vector3(x, y, z); root.rotation.y = GameState.buildRotation;
                MeshFactory.createBuildingGeometry(type, root, this.scene, this.mats, false);
                root.getChildMeshes().forEach(m => this.shadows.addShadowCaster(m));
                this.snapGroundMeshToTerrain(root, type, x, y, z);

                let needsBuild = (type !== 'road' && type !== 'bridge' && type !== 'path');
                if (type === 'townhall' && !GameState.centerTile) needsBuild = false; 

                const bData = { 
                    id: Math.random().toString(36).substr(2, 9), type: type, x: x, y: y, z: z, 
                    mesh: root, workers: [], maxWorkers: cfg.maxWorkers, role: cfg.role,
                    localInv: { wood: 0, stone: 0, food: 0, clay: 0, coal: 0, wheat: 0, meat: 0, fish: 0, planks: 0, bricks: 0, flour: 0, iron: 0, tools: 0, weapons: 0 },
                    isConstructing: needsBuild, buildProgress: needsBuild ? 0 : 100, baseY: y
                };
                
                if (needsBuild) { root.position.y = y - 3; root.getChildMeshes().forEach(m => { if(m.material) m.material.alpha = 0.5; }); }
                
                root.bData = bData; root.getChildMeshes().forEach(c => c.bData = bData);
                GameState.buildings.push(bData);
                if(this.buildingGrid) this.buildingGrid.insert(bData);
                // PERF: Caches invalidieren
                this._infraCache = null;
                this._towerCache = null;
                this._buffCache  = null;
                
                if(type === 'townhall' && !GameState.centerTile) { GameState.centerTile = bData; for(let i=0; i<5; i++) this.spawnCitizen(); } 
                else if(type === 'storage') GameState.maxStorage += 500;
                
                this.uiNeedsUpdate = true; if(needsBuild) this.showMsg(`Baustelle platziert.`);
            },

            selectBuilding(bData) {
                if(bData.type === 'road' || bData.type === 'bridge' || bData.type === 'path') return; 
                this.hl.removeAllMeshes(); bData.mesh.getChildMeshes().forEach(m => this.hl.addMesh(m, BABYLON.Color3.Teal()));
                GameState.selectedBuilding = bData;
                
                document.getElementById('inspector').classList.remove('hidden');
                document.getElementById('insp-title').innerText = BUILDINGS[bData.type].name;
                document.getElementById('insp-desc').innerText = BUILDINGS[bData.type].desc;
                
                // Lagerinhalt anzeigen (für Ressourcen- und Lager-Gebäude)
                let invDiv = document.getElementById('insp-localinv');
                let invContent = document.getElementById('insp-localinv-content');
                const showInvFor = ['lumbercamp','quarry','claypit','gatherer','hunter','farm','port','wharf','storage',
                                    'orchard','vegetable','cowpasture','sheeppasture','pigpen','kitchen','cheesery',
                                    'sawmill','brickyard','mill','bakery','smelter','toolmaker','weaponsmith'];
                if(showInvFor.includes(bData.type) && bData.localInv) {
                    invDiv.classList.remove('hidden');
                    const labels = {wood:'🪵Holz',stone:'🪨Stein',clay:'🟤Lehm',coal:'⬛Kohle',wheat:'🌾Weizen',
                                    meat:'🥩Fleisch',fish:'🐟Fisch',planks:'🪵Bretter',bricks:'🧱Ziegel',
                                    flour:'🥣Mehl',iron:'🔗Eisen',tools:'🛠️Tools',weapons:'⚔️Waffen',
                                    food:'🍖Essen',fruits:'🍎Obst',vegetables:'🥕Gemüse',milk:'🥛Milch',
                                    wool:'🧶Wolle',cheese:'🧀Käse'};
                    invContent.innerHTML = Object.entries(bData.localInv)
                        .filter(([k,v]) => v > 0)
                        .map(([k,v]) => `<span class="text-slate-400">${labels[k]||k}:</span><span class="text-cyan-300">${v}</span>`)
                        .join('') || '<span class="col-span-2 text-slate-500 italic">leer</span>';
                } else {
                    invDiv.classList.add('hidden');
                }

                let sDiv = document.getElementById('insp-status');
                if(bData.isConstructing) { sDiv.classList.remove('hidden'); sDiv.innerText = `Bauphase: ${bData.buildProgress}%`; } else sDiv.classList.add('hidden');

                if(bData.type === 'townhall') {
                    let upBtn = document.getElementById('btn-upgrade');
                    if (GameState.currentEpoch === 1) { upBtn.classList.remove('hidden'); upBtn.innerText = "Epoche II (200H, 150S, 80B)"; }
                    else if (GameState.currentEpoch === 2) { upBtn.classList.remove('hidden'); upBtn.innerText = "Epoche III (350S, 150Z, 80Ei)"; }
                    else if (GameState.currentEpoch === 3) { upBtn.classList.remove('hidden'); upBtn.innerText = "Epoche IV (800G, 300Z, 300Ei)"; }
                    else upBtn.classList.add('hidden');
                } else document.getElementById('btn-upgrade').classList.add('hidden');

                if(BUILDINGS[bData.type].maxWorkers > 0 && !bData.isConstructing) { document.getElementById('worker-controls').style.display = 'block'; this.updateInspectorWorkers(); } 
                else document.getElementById('worker-controls').style.display = 'none';
                document.getElementById('btn-demolish').style.display = (bData.type === 'townhall') ? 'none' : 'block';

                // Einheitentyp-Controls für Kaserne
                const unitControls = document.getElementById('unit-type-controls');
                if(unitControls) {
                    if(bData.type === 'barracks') {
                        unitControls.classList.remove('hidden');
                        // Aktuellen Typ setzen
                        const curType = bData.unitType || 'soldier';
                        this.setUnitType(curType);
                    } else {
                        unitControls.classList.add('hidden');
                    }
                }
            },

            closeInspector() { if(this.hl) this.hl.removeAllMeshes(); GameState.selectedBuilding = null; document.getElementById('inspector').classList.add('hidden'); },

            upgradeTownhall() {
                if (GameState.currentEpoch === 1) {
                    if (GameState.resources.wood >= 200 && GameState.resources.stone >= 150 && GameState.resources.planks >= 80) {
                        GameState.resources.wood -= 200; GameState.resources.stone -= 150; GameState.resources.planks -= 80;
                        GameState.currentEpoch = 2; window.Sfx.epoch && window.Sfx.epoch();
                        this.notify("🏛️ Epoche II — Mittelalter erreicht!", 'success');
                        if(GameState.centerTile) this.createFloatingText('⬆️ EPOCHE II!', GameState.centerTile.mesh, '#facc15');
                    } else { window.Sfx.error(); this.showMsg("Ressourcen fehlen!"); return; }
                } else if (GameState.currentEpoch === 2) {
                    if (GameState.resources.stone >= 350 && GameState.resources.bricks >= 150 && GameState.resources.iron >= 80) {
                        GameState.resources.stone -= 350; GameState.resources.bricks -= 150; GameState.resources.iron -= 80;
                        GameState.currentEpoch = 3; window.Sfx.epoch && window.Sfx.epoch();
                        this.notify("🏛️ Epoche III — Hochmittelalter erreicht!", 'success');
                        if(GameState.centerTile) this.createFloatingText('⬆️ EPOCHE III!', GameState.centerTile.mesh, '#facc15');
                    } else { window.Sfx.error(); this.showMsg("Ressourcen fehlen!"); return; }
                } else if (GameState.currentEpoch === 3) {
                    if (GameState.resources.gold >= 800 && GameState.resources.bricks >= 300 && GameState.resources.iron >= 300) {
                        GameState.resources.gold -= 800; GameState.resources.bricks -= 300; GameState.resources.iron -= 300;
                        GameState.currentEpoch = 4; window.Sfx.epoch && window.Sfx.epoch();
                        this.notify("🏛️ Epoche IV — Imperium erreicht!", 'success');
                        if(GameState.centerTile) this.createFloatingText('⬆️ IMPERIUM!', GameState.centerTile.mesh, '#facc15');
                    } else { window.Sfx.error(); this.showMsg("Ressourcen fehlen!"); return; }
                }
                GameState.buildings.forEach(b => {
                    if(!b.isConstructing && b.mesh) {
                        b.mesh.getChildMeshes().forEach(m => {
                            if(m.material) m.material.alpha = 1.0;
                        });
                    }
                });
                document.getElementById('epoch-status').innerText = `🏛️ Epoche: ${['I', 'II', 'III', 'IV'][GameState.currentEpoch-1]}`;
                this.closeInspector(); this.uiNeedsUpdate = true;
            },

            assignWorker(delta) {
                const b = GameState.selectedBuilding; if(!b || b.isConstructing) return;
                let warn = document.getElementById('insp-warn'); warn.classList.add('hidden');
                
                if(delta > 0) {
                    if(b.workers.length >= b.maxWorkers) return;
                    // Waffenkosten je Einheitentyp
                    if(b.type === 'barracks') {
                        const unitType = b.unitType || 'soldier';
                        const weaponCost = unitType === 'knight' ? 20 : 10;
                        const ironCost = unitType === 'knight' ? 10 : 0;
                        if(GameState.resources.weapons < weaponCost) { window.Sfx.error(); warn.innerText = `${weaponCost} Waffen benötigt!`; warn.classList.remove('hidden'); return; }
                        if(ironCost > 0 && GameState.resources.iron < ironCost) { window.Sfx.error(); warn.innerText = `${ironCost} Eisen benötigt!`; warn.classList.remove('hidden'); return; }
                        let free = GameState.population.find(c => c.job === 'UNEMPLOYED');
                        if(free) { GameState.resources.weapons -= weaponCost; if(ironCost) GameState.resources.iron -= ironCost; free.assignJob(b); b.workers.push(free); }
                        else { window.Sfx.error(); warn.innerText = "Keine freien Siedler!"; warn.classList.remove('hidden'); }
                    } else if(b.type === 'archery') {
                        if(GameState.resources.weapons < 5) { window.Sfx.error(); warn.innerText = "5 Waffen benötigt!"; warn.classList.remove('hidden'); return; }
                        let free = GameState.population.find(c => c.job === 'UNEMPLOYED');
                        if(free) { GameState.resources.weapons -= 5; free.assignJob(b); b.workers.push(free); }
                        else { window.Sfx.error(); warn.innerText = "Keine freien Siedler!"; warn.classList.remove('hidden'); }
                    } else {
                        let free = GameState.population.find(c => c.job === 'UNEMPLOYED');
                        if(free) { free.assignJob(b); b.workers.push(free); window.Sfx.workerAssign && window.Sfx.workerAssign(); }
                        else { window.Sfx.error(); warn.innerText = "Keine freien Siedler!"; warn.classList.remove('hidden'); }
                    }
                } else {
                    if(b.workers.length <= 0) return;
                    b.workers.pop().assignJob(null);
                    window.Sfx.workerRemove && window.Sfx.workerRemove();
                }
                this.updateInspectorWorkers(); this.uiNeedsUpdate = true;
            },

            updateInspectorWorkers() { if(GameState.selectedBuilding) document.getElementById('insp-workers').innerText = `${GameState.selectedBuilding.workers.length}/${GameState.selectedBuilding.maxWorkers}`; },

            setUnitType(type) {
                const b = GameState.selectedBuilding;
                if(!b || b.type !== 'barracks') return;
                b.unitType = type;
                window.Sfx.click();
                // Button-Styling aktualisieren
                ['soldier','knight'].forEach(t => {
                    const btn = document.getElementById('btn-unit-' + t);
                    if(!btn) return;
                    if(t === type) {
                        btn.className = 'flex-1 py-1 rounded text-[10px] font-bold border cursor-pointer ' +
                            (type === 'knight' ? 'bg-purple-900/60 border-purple-500/60 text-purple-300' : 'bg-red-900/60 border-red-500/60 text-red-300');
                    } else {
                        btn.className = 'flex-1 py-1 rounded text-[10px] font-bold bg-slate-700/50 border border-slate-500/50 text-slate-400 cursor-pointer hover:bg-slate-600/50';
                    }
                });
                const costHint = document.getElementById('unit-cost-hint');
                if(costHint) costHint.innerText = type === 'knight' ? '20 Waffen + 10 Eisen' : '10 Waffen';
            },

            demolishSelected() {
                const b = GameState.selectedBuilding; if(!b || b.type === 'townhall') return;
                b.workers.forEach(w => w.assignJob(null));
                GameState.nightLights = GameState.nightLights.filter(nl => nl.parent !== b.mesh);
                if(this.buildingGrid) this.buildingGrid.remove(b);
                window.Sfx.demolish && window.Sfx.demolish();
                b.mesh.dispose(); GameState.buildings = GameState.buildings.filter(x => x.id !== b.id);
                // PERF: Caches invalidieren
                this._infraCache = null;
                this._towerCache = null;
                this._buffCache  = null;
                if(b.type === 'storage' && !b.isConstructing) GameState.maxStorage = Math.max(500, GameState.maxStorage - 500);
                
                const cfg = BUILDINGS[b.type];
                GameState.resources.wood += Math.floor((cfg.cost.w||0) * 0.5); GameState.resources.stone += Math.floor((cfg.cost.s||0) * 0.5);
                GameState.resources.planks += Math.floor((cfg.cost.p||0) * 0.5); GameState.resources.bricks += Math.floor((cfg.cost.b||0) * 0.5); GameState.resources.iron += Math.floor((cfg.cost.i||0) * 0.5);
                this.closeInspector(); this.uiNeedsUpdate = true;
            },

            spawnCitizen() {
                if (!GameState.centerTile) return; 
                let root = new BABYLON.TransformNode("c_root", this.scene);
                let body = BABYLON.MeshBuilder.CreateBox("c_body", {width:0.4, height:0.5, depth:0.3}, this.scene); body.position.y = 0.55; body.parent = root;
                let head = BABYLON.MeshBuilder.CreateBox("c_head", {size:0.3}, this.scene); head.position.y = 0.95; head.parent = root;
                let legL = BABYLON.MeshBuilder.CreateBox("c_legL", {width:0.15, height:0.3, depth:0.15}, this.scene); legL.position.set(-0.1, 0.15, 0); legL.parent = root;
                let legR = BABYLON.MeshBuilder.CreateBox("c_legR", {width:0.15, height:0.3, depth:0.15}, this.scene); legR.position.set(0.1, 0.15, 0); legR.parent = root;
                
                body.material = this.mats.citizen; head.material = this.mats.skin; legL.material = this.mats.stone; legR.material = this.mats.stone;
                [body, head, legL, legR].forEach(m => this.shadows.addShadowCaster(m));
                
                let px = GameState.centerTile.x + (Math.random()-0.5)*8, pz = GameState.centerTile.z + (Math.random()-0.5)*8;
                root.position = new BABYLON.Vector3(px, this.getHeightAt(px, pz), pz);
                
                let cit = new Citizen(root, this.scene);
                cit.bodyMesh = body; cit.legL = legL; cit.legR = legR;
                GameState.population.push(cit); this.uiNeedsUpdate = true;
                window.Sfx.citizenBorn && window.Sfx.citizenBorn();
                root.setEnabled(true);
            },
            
            spawnEnemy(type = 'bandit') {
                this.spawnEnemyAt(type, Math.random() * Math.PI * 2);
            },

            spawnEnemyAt(type, angle) {
                let root = new BABYLON.TransformNode("e_root", this.scene);
                let body = BABYLON.MeshBuilder.CreateBox("e_body", {width:0.5, height:0.6, depth:0.4}, this.scene); 
                body.position.y = 0.6; body.parent = root;
                let head = BABYLON.MeshBuilder.CreateBox("e_head", {size:0.35}, this.scene); 
                head.position.y = 1.05; head.parent = root;
                let legL = BABYLON.MeshBuilder.CreateBox("e_legL", {width:0.15, height:0.3, depth:0.15}, this.scene); 
                legL.position.set(-0.12, 0.15, 0); legL.parent = root;
                let legR = BABYLON.MeshBuilder.CreateBox("e_legR", {width:0.15, height:0.3, depth:0.15}, this.scene); 
                legR.position.set(0.12, 0.15, 0); legR.parent = root;

                const matMap = { bandit: this.mats.enemy, ork: this.mats.ork, nomad: this.mats.nomad };
                body.material = matMap[type] || this.mats.enemy; 
                head.material = this.mats.skin; 
                legL.material = this.mats.coal; legR.material = this.mats.coal;

                if(type === 'ork')   root.scaling.setAll(1.3);
                if(type === 'nomad') root.scaling = new BABYLON.Vector3(0.85, 1.1, 0.85);

                let radius = 120 + Math.random() * 40;
                let px = Math.cos(angle) * radius, pz = Math.sin(angle) * radius;
                // Sicherstellen dass der Spawn auf trockenem Boden ist
                // Falls der Punkt im Wasser liegt, spiralförmig nach innen suchen
                let spawnY = this.getHeightAt(px, pz);
                if(spawnY <= this.waterLevel + 0.5) {
                    for(let r = radius; r > 40; r -= 8) {
                        px = Math.cos(angle) * r; pz = Math.sin(angle) * r;
                        spawnY = this.getHeightAt(px, pz);
                        if(spawnY > this.waterLevel + 0.5) break;
                    }
                }
                root.position = new BABYLON.Vector3(px, spawnY, pz);

                let enemy = new Enemy(root, this.scene);
                enemy.legL = legL; enemy.legR = legR;
                enemy.type = type;
                if(type === 'ork')   { enemy.health = 80;  enemy.speed = 0.07; enemy.damage = 2; }
                if(type === 'nomad') { enemy.health = 25;  enemy.speed = 0.10; enemy.damage = 0; enemy.steals = true; }
                if(type === 'bandit'){ enemy.health = 40;  enemy.speed = 0.05; enemy.damage = 1; }
                if(window.GameMod?.enemyStrength && window.GameMod.enemyStrength !== 1) { const m=window.GameMod.enemyStrength; enemy.health=Math.round(enemy.health*m); enemy.damage=Math.round((enemy.damage||1)*m); }
                if(window.GameMod?.godMode) { enemy.damage = 0; }
                // MOD: enemy strength multiplier
                if(window.GameMod?.enemyStrength && window.GameMod.enemyStrength !== 1) {
                    const m = window.GameMod.enemyStrength;
                    enemy.health *= m; enemy.damage = Math.round((enemy.damage || 1) * m);
                }

                GameState.enemies.push(enemy);
            },

            spawnBoss(epoch) {
                const angle = Math.random() * Math.PI * 2;
                const radius = 130;
                let px = Math.cos(angle) * radius;
                let pz = Math.sin(angle) * radius;
                let bossY = this.getHeightAt(px, pz);
                if(bossY <= this.waterLevel + 0.5) {
                    for(let r = radius; r > 40; r -= 8) {
                        px = Math.cos(angle) * r; pz = Math.sin(angle) * r;
                        bossY = this.getHeightAt(px, pz);
                        if(bossY > this.waterLevel + 0.5) break;
                    }
                }

                let root = new BABYLON.TransformNode("boss_root", this.scene);
                root.position = new BABYLON.Vector3(px, bossY, pz);

                // Boss-Körper — massiv
                let body = BABYLON.MeshBuilder.CreateBox("e_body", {width:1.0, height:1.2, depth:0.8}, this.scene);
                body.position.y = 1.0; body.parent = root; body.material = this.mats.boss;
                let head = BABYLON.MeshBuilder.CreateBox("e_head", {size:0.7}, this.scene);
                head.position.y = 2.0; head.parent = root; head.material = this.mats.boss;
                let legL = BABYLON.MeshBuilder.CreateBox("e_legL", {width:0.3, height:0.6, depth:0.3}, this.scene);
                legL.position.set(-0.3, 0.3, 0); legL.parent = root; legL.material = this.mats.coal;
                let legR = BABYLON.MeshBuilder.CreateBox("e_legR", {width:0.3, height:0.6, depth:0.3}, this.scene);
                legR.position.set(0.3, 0.3, 0); legR.parent = root; legR.material = this.mats.coal;
                // Schulterplatten
                let sL = BABYLON.MeshBuilder.CreateBox("sL", {width:0.6, height:0.3, depth:0.6}, this.scene);
                sL.position.set(-0.7, 1.6, 0); sL.parent = root; sL.material = this.mats.stone;
                let sR = BABYLON.MeshBuilder.CreateBox("sR", {width:0.6, height:0.3, depth:0.6}, this.scene);
                sR.position.set(0.7, 1.6, 0); sR.parent = root; sR.material = this.mats.stone;
                // Krone/Helm je nach Epoche
                if(epoch >= 3) {
                    let crown = BABYLON.MeshBuilder.CreateCylinder("crown", {diameterTop:0.4, diameterBottom:0.8, height:0.5, tessellation:6}, this.scene);
                    crown.position.y = 2.6; crown.parent = root;
                    crown.material = epoch >= 4 ? this.mats.gold : this.mats.iron;
                }

                // Skalierung je nach Epoche
                const scale = epoch === 2 ? 2.0 : epoch === 3 ? 2.8 : 3.5;
                root.scaling.setAll(scale);

                [body, head, legL, legR, sL, sR].forEach(m => this.shadows.addShadowCaster(m));

                // Lila Aura-Licht
                // Boss-Aura: kein extra PointLight (würde Limit überschreiten) — GlowLayer übernimmt den visuellen Effekt
                // Wir setzen stattdessen emissiveColor auf dem Mesh für den lila Schein
                root.getChildMeshes().forEach(m => {
                    if(m.material) {
                        m.material = m.material.clone("bossMat_" + Math.random());
                        m.material.emissiveColor = new BABYLON.Color3(0.4, 0, 0.4);
                    }
                });
                const auraLight = null; // kein PointLight — ersetzt durch emissive + GlowLayer

                let enemy = new Enemy(root, this.scene);
                enemy.legL = legL; enemy.legR = legR;
                enemy.type = 'boss';
                enemy.isBoss = true;
                enemy.bossEpoch = epoch;
                enemy._auraLight = auraLight;

                // Stats je nach Epoche
                if(epoch === 2) { enemy.health = 300; enemy.speed = 0.04; enemy.damage = 5; }
                if(epoch === 3) { enemy.health = 500; enemy.speed = 0.035; enemy.damage = 10; }
                if(epoch === 4) { enemy.health = 800; enemy.speed = 0.03;  enemy.damage = 15; }
                if(window.GameMod?.godMode) { enemy.damage = 0; }
                if(window.GameMod?.enemyStrength && window.GameMod.enemyStrength !== 1) { const m=window.GameMod.enemyStrength; enemy.health=Math.round(enemy.health*m); enemy.damage=Math.round(enemy.damage*m); }
                // MOD: god mode / enemy strength on bosses too
                if(window.GameMod?.godMode) { enemy.damage = 0; }
                if(window.GameMod?.enemyStrength && window.GameMod.enemyStrength !== 1) {
                    enemy.health = Math.round(enemy.health * window.GameMod.enemyStrength);
                    enemy.damage = Math.round(enemy.damage * window.GameMod.enemyStrength);
                }

                GameState.enemies.push(enemy);

                const bossNames = { 2: '💀 DER PLÜNDERER', 3: '🪓 DER MAUERBRECHER', 4: '👑 DER KRIEGSHERR' };
                const bossName = bossNames[epoch] || '👹 BOSS';
                const alert = document.getElementById('enemy-alert');
                if(alert) {
                    alert.innerText = `☠️ ${bossName} GREIFT AN! ☠️`;
                    alert.style.borderColor = '#a855f7';
                    alert.style.color = '#a855f7';
                    alert.classList.remove('hidden');
                    setTimeout(() => { alert.classList.add('hidden'); alert.style.borderColor = ''; alert.style.color = ''; }, 8000);
                }
                this.notify(`☠️ ${bossName} erscheint! Bereite dich vor!`, 'danger');
                window.Sfx.play && window.Sfx.play(60, 'sawtooth', 2.0, 0.4);
                this.spawnResParticles(root.position, '#a855f7');
            },

            spawnWave() {
                if(window.GameMod?.noEnemies) { this.notify('🕊️ Mod: Keine Feinde aktiv', 'info'); return; }
                if(GameState.currentEpoch < 3) return;
                GameState.waveNumber++;
                const wave = GameState.waveNumber;

                // Boss alle 5 Wellen — erscheint 3 Sekunden nach der normalen Welle
                if(wave % 5 === 0) {
                    setTimeout(() => this.spawnBoss(GameState.currentEpoch), 3000);
                }

                let count = 2 + Math.floor(wave * 0.8);
                let type = 'bandit';

                if(GameState.currentEpoch >= 2 && wave > 2) type = Math.random() < 0.5 ? 'ork' : 'bandit';
                if(GameState.currentEpoch >= 3 && wave > 4) {
                    const types = ['bandit','bandit','ork','nomad'];
                    type = types[Math.floor(Math.random() * types.length)];
                }

                // Ab Welle 5: von mehreren Seiten gleichzeitig
                const sides = wave >= 5 ? Math.min(3, Math.floor(wave / 3)) : 1;
                const baseAngle = Math.random() * Math.PI * 2;
                for(let side = 0; side < sides; side++) {
                    const sideAngle = baseAngle + (side * (Math.PI * 2 / sides));
                    const perSide = Math.ceil(count / sides);
                    for(let i = 0; i < perSide; i++) {
                        setTimeout(() => this.spawnEnemyAt(type, sideAngle + (Math.random()-0.5) * 0.5), (side * 400) + (i * 600));
                    }
                }

                const names = { bandit:'Banditen', ork:'Orks', nomad:'Nomaden' };
                const sideText = sides > 1 ? ` von ${sides} Seiten` : '';
                const alert = document.getElementById('enemy-alert');
                alert.innerText = `⚠️ WELLE ${wave}: ${count} ${names[type]}${sideText}! ⚠️`;
                alert.classList.remove('hidden'); 
                setTimeout(() => alert.classList.add('hidden'), 5000);
                window.Sfx.waveStart && window.Sfx.waveStart();
                this.notify(`⚔️ Welle ${wave}! ${count} ${names[type]}${sideText}!`, 'danger');
            },

            // ── KATASTROPHEN-SYSTEM ──────────────────────────────────────
            triggerDisaster() {
                if(GameState.currentEpoch < 2) return;
                if(GameState.activeDisaster) return; // Nur eine gleichzeitig

                const options = ['fire', 'plague'];
                if(GameState.currentEpoch >= 3) options.push('earthquake');

                const type = options[Math.floor(Math.random() * options.length)];

                if(type === 'fire')       this.startFire();
                else if(type === 'plague') this.startPlague();
                else if(type === 'earthquake') this.startEarthquake();
            },

            startFire() {
                // Zufälliges Nicht-Straßen-Gebäude auswählen
                const candidates = GameState.buildings.filter(b =>
                    !b.isConstructing && b.type !== 'road' && b.type !== 'path' &&
                    b.type !== 'bridge' && b.type !== 'townhall'
                );
                if(candidates.length === 0) return;
                const target = candidates[Math.floor(Math.random() * candidates.length)];

                GameState.activeDisaster = 'fire';
                GameState.disasterTimer = 600; // ~10 Sekunden bei 60fps
                target._onFire = true;

                // Feuer-Partikel am Gebäude
                const firePS = new BABYLON.ParticleSystem("fire_" + target.id, 200, this.scene);
                firePS.particleTexture = this.particleTex;
                firePS.emitter = target.mesh;
                firePS.minEmitBox = new BABYLON.Vector3(-1, 0, -1);
                firePS.maxEmitBox = new BABYLON.Vector3(1, 2, 1);
                firePS.color1 = new BABYLON.Color4(1, 0.5, 0, 1);
                firePS.color2 = new BABYLON.Color4(1, 0.1, 0, 0.8);
                firePS.colorDead = new BABYLON.Color4(0.2, 0.2, 0.2, 0);
                firePS.minSize = 0.3; firePS.maxSize = 0.8;
                firePS.minLifeTime = 0.3; firePS.maxLifeTime = 0.8;
                firePS.emitRate = 80;
                firePS.gravity = new BABYLON.Vector3(0, 3, 0);
                firePS.direction1 = new BABYLON.Vector3(-1, 2, -1);
                firePS.direction2 = new BABYLON.Vector3(1, 4, 1);
                firePS.start();
                target._firePS = firePS;

                // Schaden über Zeit
                target._fireDmgInterval = setInterval(() => {
                    if(!target._onFire) { clearInterval(target._fireDmgInterval); return; }
                    if(target.hp !== undefined) {
                        target.hp -= 10;
                        this.createFloatingText('-10 🔥', target.mesh, '#ef4444');
                        if(target.hp <= 0) this.extinguishFire(target, true);
                    }
                }, 1000);

                const bName = BUILDINGS[target.type]?.name || target.type;
                this.notify(`🔥 FEUER! ${bName} brennt! Baue schnell eine Feuerwehr oder verliere das Gebäude!`, 'danger');
                window.Sfx.play && window.Sfx.play(200, 'sawtooth', 1.0, 0.3);
                this.showDisasterAlert('🔥 FEUER AUSGEBROCHEN!', '#ef4444');

                // Nach disasterTimer automatisch löschen
                setTimeout(() => this.extinguishFire(target, false), GameState.disasterTimer * 16);
            },

            extinguishFire(target, destroyed) {
                target._onFire = false;
                if(target._firePS) { target._firePS.stop(); setTimeout(() => target._firePS?.dispose(), 2000); target._firePS = null; }
                if(target._fireDmgInterval) { clearInterval(target._fireDmgInterval); target._fireDmgInterval = null; }
                GameState.activeDisaster = null;
                if(destroyed) {
                    this.notify('🔥 Gebäude niedergebrannt!', 'danger');
                    GameState.selectedBuilding = target;
                    this.demolishSelected();
                } else {
                    this.notify('✅ Feuer erloschen.', 'info');
                }
            },

            startPlague() {
                GameState.activeDisaster = 'plague';
                // Heilstätte reduziert Seuchen-Dauer und Tote um 50%
                let hasHealhouse = GameState.buildings.some(b => b.type === 'healhouse' && !b.isConstructing && b.workers.length > 0);
                GameState.plagueTimer = hasHealhouse ? 450 : 900;
                const killRate = hasHealhouse ? 0.1 : 0.2;
                const killed = Math.floor(GameState.population.length * killRate);
                for(let i = 0; i < killed; i++) {
                    const victim = GameState.population[Math.floor(Math.random() * GameState.population.length)];
                    if(victim && !['SOLDIER','KNIGHT','ARCHER','GUARD'].includes(victim.job)) {
                        victim.assignJob(null);
                        victim.mesh.dispose();
                        GameState.population = GameState.population.filter(c => c !== victim);
                        break;
                    }
                }

                this.notify(`🤒 SEUCHE! ${killed} Bewohner gestorben. Zufriedenheit sinkt für eine Weile.`, 'danger');
                window.Sfx.play && window.Sfx.play(150, 'sawtooth', 0.8, 0.2);
                this.showDisasterAlert('🤒 SEUCHE IN DER STADT!', '#a855f7');
                this.uiNeedsUpdate = true;
            },

            startEarthquake() {
                GameState.activeDisaster = 'earthquake';

                // Zufällige Gebäude beschädigen
                const affected = GameState.buildings.filter(b =>
                    !b.isConstructing && b.type !== 'road' && b.type !== 'path'
                );
                const count = Math.min(affected.length, 2 + Math.floor(Math.random() * 3));
                for(let i = 0; i < count; i++) {
                    const b = affected[Math.floor(Math.random() * affected.length)];
                    if(b.hp !== undefined) {
                        b.hp = Math.floor(b.hp * 0.5);
                        this.createFloatingText('💥 ERDBEBEN', b.mesh, '#f97316');
                    }
                }

                // Kamera wackeln
                const origTarget = this.camera.target.clone();
                let shakeCount = 0;
                const shakeInterval = setInterval(() => {
                    this.camera.target.x = origTarget.x + (Math.random() - 0.5) * 3;
                    this.camera.target.z = origTarget.z + (Math.random() - 0.5) * 3;
                    if(++shakeCount > 20) {
                        clearInterval(shakeInterval);
                        this.camera.target.copyFrom(origTarget);
                        GameState.activeDisaster = null;
                    }
                }, 80);

                this.notify(`🌋 ERDBEBEN! ${count} Gebäude beschädigt!`, 'danger');
                window.Sfx.noise && window.Sfx.noise(1.5, 0.5, 200);
                this.showDisasterAlert('🌋 ERDBEBEN!', '#f97316');
            },

            showDisasterAlert(text, color) {
                const alert = document.getElementById('enemy-alert');
                if(!alert) return;
                const prev = alert.style.borderColor;
                alert.style.borderColor = color;
                alert.style.color = color;
                alert.innerText = `⚠️ ${text} ⚠️`;
                alert.classList.remove('hidden');
                setTimeout(() => {
                    alert.classList.add('hidden');
                    alert.style.borderColor = prev;
                    alert.style.color = '';
                }, 6000);
            },

            // ── DIPLOMATIESYSTEM ─────────────────────────────────────────
            toggleDiplomacy() {
                GameState.diplomacyOpen = !GameState.diplomacyOpen;
                const panel = document.getElementById('diplomacy-panel');
                if(!panel) return;
                if(GameState.diplomacyOpen) {
                    // Stats/Research schließen
                    document.getElementById('stats-panel')?.classList.add('hidden');
                    document.getElementById('research-panel')?.classList.add('hidden');
                    this.statsOpen = false; this.researchOpen = false;
                    panel.classList.remove('hidden');
                    this.updateDiplomacyUI();
                } else {
                    panel.classList.add('hidden');
                }
                window.Sfx.click();
            },

            updateDiplomacyUI() {
                const el = id => document.getElementById(id);

                // Fraktionen
                const factions = GameState.diplomacy.factions;
                Object.entries(factions).forEach(([key, f]) => {
                    const btn = el(`diplo-ally-${key}`);
                    if(!btn) return;
                    if(f.allied) {
                        const wavesLeft = Math.ceil(f.allyTimer / 600);
                        btn.innerText = `✅ Verbündet (${wavesLeft} Wellen)`;
                        btn.disabled = true;
                        btn.className = 'w-full py-1.5 rounded text-[10px] font-bold bg-green-900/50 border border-green-600/50 text-green-400 cursor-not-allowed';
                    } else {
                        btn.innerText = `🤝 Bündnis (${f.tributeCost}G)`;
                        btn.disabled = false;
                        btn.className = 'w-full py-1.5 rounded text-[10px] font-bold bg-slate-700 hover:bg-slate-600 border border-slate-500 text-white cursor-pointer transition-colors';
                    }
                });

                // Tribut-Button (nur wenn Feinde aktiv)
                const tributeSection = el('diplo-tribute-section');
                const hasEnemies = GameState.enemies.length > 0;
                if(tributeSection) tributeSection.classList.toggle('hidden', !hasEnemies);

                // Handelsrouten-Einkommen
                const tradeEl = el('diplo-trade-income');
                const markets = GameState.buildings.filter(b => b.type === 'market' && !b.isConstructing && b.workers.length > 0).length;
                if(tradeEl) tradeEl.innerText = `+${markets * 15}/Runde`;

                // Händler-Angebote
                const offersEl = el('diplo-trader-offers');
                if(offersEl) {
                    if(GameState.diplomacy.activeTrader?.offer?.length > 0) {
                        offersEl.innerHTML = GameState.diplomacy.activeTrader.offer.map((o, i) =>
                            `<button onclick="window.Game.buyFromTrader(${i})" class="flex justify-between items-center w-full bg-yellow-900/40 hover:bg-yellow-800/60 border border-yellow-600/40 rounded px-3 py-1.5 cursor-pointer transition-colors">
                                <span class="text-[11px] font-bold text-yellow-200">${o.label}</span>
                                <span class="text-[10px] font-bold text-yellow-400">${o.cost}G kaufen</span>
                            </button>`
                        ).join('');
                    } else {
                        offersEl.innerHTML = '<div class="text-[9px] text-slate-500 italic">Keine Angebote verfügbar</div>';
                    }
                }
                if(traderEl) {
                    if(GameState.diplomacy.activeTrader) {
                        const t = Math.ceil(GameState.diplomacy.activeTrader.timer / 60);
                        traderEl.innerText = `🚶 Händler da! Noch ${t}s`;
                        traderEl.className = 'text-[10px] text-yellow-400 font-bold';
                    } else {
                        traderEl.innerText = 'Kein Händler in der Stadt';
                        traderEl.className = 'text-[10px] text-slate-500';
                    }
                }
            },

            formAlliance(factionKey) {
                const f = GameState.diplomacy.factions[factionKey];
                if(!f || f.allied) return;
                if(GameState.resources.gold < f.tributeCost) {
                    window.Sfx.error();
                    this.showMsg(`Nicht genug Gold! Benötigt: ${f.tributeCost}G`);
                    return;
                }
                GameState.resources.gold -= f.tributeCost;
                f.allied = true;
                f.allyTimer = 3000; // ~5 Wellen
                window.Sfx.research && window.Sfx.research();
                this.notify(`🤝 Bündnis mit den ${f.name} geschlossen! (5 Wellen Frieden)`, 'success');
                this.createFloatingText(`🤝 ${f.name} verbündet!`, GameState.centerTile.mesh, '#22d3ee');
                this.updateDiplomacyUI();
                this.uiNeedsUpdate = true;
            },

            payTribute() {
                const cost = 50 + GameState.waveNumber * 20;
                if(GameState.resources.gold < cost) {
                    window.Sfx.error();
                    this.showMsg(`Nicht genug Gold! Tribut: ${cost}G`);
                    return;
                }
                GameState.resources.gold -= cost;
                // Alle aktiven Feinde ziehen ab
                GameState.enemies.forEach(e => {
                    if(e.mesh) {
                        this.spawnResParticles(e.mesh.position, '#facc15');
                        e.health = 0;
                        e.mesh.dispose();
                    }
                });
                GameState.enemies = [];
                window.Sfx.epoch && window.Sfx.epoch();
                this.notify(`💸 Tribut gezahlt (-${cost}G) — Feinde ziehen ab!`, 'info');
                this.updateDiplomacyUI();
                this.uiNeedsUpdate = true;
            },

            // ── WERFT & SCHIFF-SYSTEM ──────────────────────────────────
            spawnShip(wharf) {
                if(!wharf) return;
                // Schiff-Mesh erstellen
                const root = new BABYLON.TransformNode("ship_root", this.scene);
                root.position = new BABYLON.Vector3(wharf.x, this.waterLevel + 0.1, wharf.z);

                // Rumpf
                const shipMat = new BABYLON.StandardMaterial("shipMat", this.scene);
                shipMat.diffuseColor = new BABYLON.Color3(0.5, 0.3, 0.1);
                shipMat.emissiveColor = new BABYLON.Color3(0.1, 0.05, 0);
                let hull = BABYLON.MeshBuilder.CreateBox("hull", {width:1.8, height:0.5, depth:0.9}, this.scene);
                hull.position.y = 0.0; hull.parent = root; hull.material = shipMat;
                // Bow (spitze vorne)
                let bow = BABYLON.MeshBuilder.CreateCylinder("bow", {diameterBottom:0.9, diameterTop:0.1, height:0.5, tessellation:6}, this.scene);
                bow.rotation.z = -Math.PI/2; bow.position = new BABYLON.Vector3(1.15, 0, 0); bow.parent = root; bow.material = shipMat;
                // Mast
                const mastMat = new BABYLON.StandardMaterial("mastMat", this.scene);
                mastMat.diffuseColor = new BABYLON.Color3(0.6, 0.4, 0.15);
                let mast = BABYLON.MeshBuilder.CreateCylinder("mast", {diameter:0.12, height:2.2}, this.scene);
                mast.position.y = 1.2; mast.parent = root; mast.material = mastMat;
                // Segel
                const sailMat = new BABYLON.StandardMaterial("sailMat", this.scene);
                sailMat.diffuseColor = new BABYLON.Color3(0.95, 0.9, 0.8);
                sailMat.backFaceCulling = false;
                let sail = BABYLON.MeshBuilder.CreatePlane("sail", {width:0.9, height:1.1}, this.scene);
                sail.position = new BABYLON.Vector3(0, 1.35, 0); sail.parent = root; sail.material = sailMat;
                // Kleines Licht: emissive auf Segel statt PointLight (Licht-Budget schonen)
                sailMat.emissiveColor = new BABYLON.Color3(0.3, 0.25, 0.1);
                const pl = null; // kein PointLight — emissive + GlowLayer reichen

                // Ziel: Karte-Rand in einer zufälligen Richtung
                const angle = Math.random() * Math.PI * 2;
                const edgeDist = 450;
                const target = { x: Math.cos(angle) * edgeDist, z: Math.sin(angle) * edgeDist };

                // Rückkehr-Payload (was das Schiff mitbringt)
                const payloads = [
                    { gold: 80,  wood: 60,  iron: 0,  planks: 0,  label: "🪵 Holz & Gold" },
                    { gold: 120, wood: 0,   iron: 40, planks: 0,  label: "⚙️ Eisen & Gold" },
                    { gold: 60,  wood: 0,   iron: 0,  planks: 50, label: "🪵 Bretter & Gold" },
                    { gold: 150, wood: 0,   iron: 0,  planks: 0,  label: "💰 Reiner Gewinn" },
                    { gold: 80,  wood: 0,   iron: 20, planks: 30, label: "⚓ Gemischte Waren" },
                ];
                const payload = payloads[Math.floor(Math.random() * payloads.length)];

                const shipObj = { mesh: root, wharf, state: 'OUTBOUND', timer: 0, target, payload, light: pl };
                GameState.ships.push(shipObj);

                this.notify(`⛵ Ein Handelsschiff legt ab! Erwartet: ${payload.label}`, 'info');
                this.uiNeedsUpdate = true;
                return shipObj;
            },

            updateShips() {
                if(!GameState.ships.length) return;
                const travelTicks = 900;    // ~15 Sek bei Normalspeed zum Rand
                const returnTicks = 900;    // ~15 Sek zurück
                const toRemove = [];

                GameState.ships.forEach(ship => {
                    if(!ship.mesh) return;
                    ship.timer++;

                    if(ship.state === 'OUTBOUND') {
                        // Schiff Richtung Kante bewegen
                        const dx = ship.target.x - ship.mesh.position.x;
                        const dz = ship.target.z - ship.mesh.position.z;
                        const dist = Math.sqrt(dx*dx + dz*dz);
                        // Drehen in Fahrtrichtung
                        ship.mesh.rotation.y = Math.atan2(dx, dz);
                        // Segel-Wackeln
                        const sailMesh = ship.mesh.getChildMeshes().find(m => m.name === 'sail');
                        if(sailMesh) sailMesh.rotation.y = Math.sin(ship.timer * 0.05) * 0.15;
                        // Wellen-Bob
                        ship.mesh.position.y = this.waterLevel + 0.1 + Math.sin(ship.timer * 0.08) * 0.04;

                        const spd = 0.8;
                        if(dist > spd) {
                            ship.mesh.position.x += (dx/dist) * spd;
                            ship.mesh.position.z += (dz/dist) * spd;
                        } else {
                            // Am Rand angekommen — Piratencheck
                            const pirateChance = GameState.buildings.some(b => b.type === 'wharf' && !b.isConstructing) ? 0.12 : 0.18;
                            if(Math.random() < pirateChance) {
                                // Piratenangriff! Schiff verloren
                                this.notify(`🏴‍☠️ PIRATEN! Das Handelsschiff wurde angegriffen und versenkt!`, 'danger');
                                this.showDisasterAlert('🏴‍☠️ PIRATENANGRIFF!', '#ef4444');
                                window.Sfx.play && window.Sfx.play(80, 'sawtooth', 1.0, 0.3);
                                if(ship.wharf) ship.wharf.shipState = null;
                                ship.mesh.getChildMeshes().forEach(m => m.dispose());
                                ship.mesh.dispose();
                                if(ship.light) ship.light.dispose();
                                toRemove.push(ship);
                            } else {
                                // Erfolgreich → zurück
                                ship.state = 'RETURN';
                                ship.timer = 0;
                                // Ziel: zurück zur Werft
                                ship.target = { x: ship.wharf.x, z: ship.wharf.z };
                                this.notify(`⛵ Das Schiff ist auf dem Rückweg mit Waren!`, 'info');
                            }
                        }
                    } else if(ship.state === 'RETURN') {
                        // Zurück zur Werft
                        const dx = ship.target.x - ship.mesh.position.x;
                        const dz = ship.target.z - ship.mesh.position.z;
                        const dist = Math.sqrt(dx*dx + dz*dz);
                        ship.mesh.rotation.y = Math.atan2(dx, dz);
                        ship.mesh.position.y = this.waterLevel + 0.1 + Math.sin(ship.timer * 0.08) * 0.04;

                        const spd = 0.7;
                        if(dist > spd + 2) {
                            ship.mesh.position.x += (dx/dist) * spd;
                            ship.mesh.position.z += (dz/dist) * spd;
                        } else {
                            // Angekommen — Waren ausladen
                            const p = ship.payload;
                            if(p.gold)   GameState.resources.gold   += p.gold;
                            if(p.wood)   GameState.resources.wood   += p.wood;
                            if(p.iron)   GameState.resources.iron   += p.iron;
                            if(p.planks) GameState.resources.planks += p.planks;

                            let gainText = `+${p.gold} Gold`;
                            if(p.wood)   gainText += `, +${p.wood} Holz`;
                            if(p.iron)   gainText += `, +${p.iron} Eisen`;
                            if(p.planks) gainText += `, +${p.planks} Bretter`;

                            this.notify(`⚓ Schiff zurück! ${gainText}`, 'success');
                            if(ship.wharf && ship.wharf.mesh) {
                                this.createFloatingText(`⚓ ${gainText}`, ship.wharf.mesh, "#facc15");
                            }
                            window.Sfx.build && window.Sfx.build();

                            // Werft wieder freigeben
                            if(ship.wharf) {
                                ship.wharf.shipState = null;
                                ship.wharf.nextVoyageTick = this.tickCounter + 1200; // 1200 Ticks Abkühlzeit
                            }
                            // Mesh entfernen
                            ship.mesh.getChildMeshes().forEach(m => m.dispose());
                            ship.mesh.dispose();
                            if(ship.light) ship.light.dispose();
                            toRemove.push(ship);
                            this.uiNeedsUpdate = true;
                        }
                    }
                });

                toRemove.forEach(s => { GameState.ships = GameState.ships.filter(x => x !== s); });
            },

                        spawnTrader() {
                if(GameState.diplomacy.activeTrader) return;
                if(!GameState.centerTile) return;

                // Händler-Mesh (kleiner grüner Bürger)
                const root = new BABYLON.TransformNode("trader_root", this.scene);
                const angle = Math.random() * Math.PI * 2;
                const radius = 110;
                root.position = new BABYLON.Vector3(Math.cos(angle)*radius, 0, Math.sin(angle)*radius);

                let body = BABYLON.MeshBuilder.CreateBox("t_body", {width:0.4, height:0.5, depth:0.3}, this.scene);
                body.position.y = 0.55; body.parent = root;
                let head = BABYLON.MeshBuilder.CreateBox("t_head", {size:0.3}, this.scene);
                head.position.y = 0.95; head.parent = root;

                // Grünes Gewand
                const traderMat = new BABYLON.StandardMaterial("traderMat", this.scene);
                traderMat.diffuseColor = new BABYLON.Color3(0.1, 0.6, 0.1);
                traderMat.emissiveColor = new BABYLON.Color3(0, 0.2, 0);
                body.material = traderMat; head.material = this.mats.skin;

                // Zufälliges Warenangebot
                const allOffers = [
                    { label: '100 Holz',  cost: 30,  give: () => GameState.resources.wood += 100 },
                    { label: '100 Stein', cost: 35,  give: () => GameState.resources.stone += 100 },
                    { label: '50 Eisen',  cost: 60,  give: () => GameState.resources.iron += 50 },
                    { label: '50 Bretter',cost: 50,  give: () => GameState.resources.planks += 50 },
                    { label: '50 Ziegel', cost: 55,  give: () => GameState.resources.bricks += 50 },
                    { label: '200 Nahrung',cost:40,  give: () => GameState.resources.food += 200 },
                    { label: '30 Waffen', cost: 80,  give: () => GameState.resources.weapons += 30 },
                    { label: '20 Werkzeuge',cost:70, give: () => GameState.resources.tools += 20 },
                ];
                const shuffled = allOffers.sort(() => Math.random()-0.5).slice(0, 3);

                GameState.diplomacy.activeTrader = {
                    mesh: root, timer: 600, offer: shuffled,
                    target: { x: GameState.centerTile.x + (Math.random()-0.5)*10, z: GameState.centerTile.z + (Math.random()-0.5)*10 }
                };

                this.notify('🚶 Ein Händler nähert sich! Öffne das 🤝 Panel um Waren zu kaufen.', 'info');
                if(GameState.diplomacyOpen) this.updateDiplomacyUI();
            },

            buyFromTrader(idx) {
                const trader = GameState.diplomacy.activeTrader;
                if(!trader) return;
                const offer = trader.offer[idx];
                if(!offer) return;
                if(GameState.resources.gold < offer.cost) {
                    window.Sfx.error(); this.showMsg(`Nicht genug Gold! Preis: ${offer.cost}G`); return;
                }
                GameState.resources.gold -= offer.cost;
                offer.give();
                window.Sfx.research && window.Sfx.research();
                this.notify(`🛒 Gekauft: ${offer.label} für ${offer.cost}G`, 'success');
                // Angebot entfernen
                trader.offer.splice(idx, 1);
                this.updateDiplomacyUI();
                this.uiNeedsUpdate = true;
            },

            updateDiplomacyTick() {
                const dip = GameState.diplomacy;

                // Bündnis-Timer runterticken
                Object.values(dip.factions).forEach(f => {
                    if(f.allied) {
                        f.allyTimer--;
                        if(f.allyTimer <= 0) {
                            f.allied = false;
                            this.notify(`⚠️ Bündnis mit den ${f.name} abgelaufen!`, 'warning');
                        }
                    }
                });

                // Verbündete Feinde aus aktiver Welle entfernen
                if(GameState.enemies.length > 0) {
                    const toRemove = GameState.enemies.filter(e => {
                        const faction = e.type === 'bandit' ? 'bandits' : e.type === 'ork' ? 'orks' : e.type === 'nomad' ? 'nomads' : null;
                        return faction && dip.factions[faction]?.allied;
                    });
                    toRemove.forEach(e => { e.health = 0; e.mesh.dispose(); });
                    if(toRemove.length > 0) GameState.enemies = GameState.enemies.filter(e => e.health > 0);
                }

                // Händler bewegen + Timer
                if(dip.activeTrader) {
                    const t = dip.activeTrader;
                    t.timer--;
                    // Händler auf Ziel zubewegen
                    if(t.mesh) {
                        const dx = t.target.x - t.mesh.position.x;
                        const dz = t.target.z - t.mesh.position.z;
                        const d = Math.hypot(dx, dz);
                        if(d > 1) {
                            t.mesh.position.x += (dx/d) * 0.08;
                            t.mesh.position.z += (dz/d) * 0.08;
                            t.mesh.position.y = this.getHeightAt(t.mesh.position.x, t.mesh.position.z);
                            t.mesh.rotation.y = Math.atan2(dx, dz);
                        }
                    }
                    if(t.timer <= 0 || t.offer.length === 0) {
                        if(t.mesh) t.mesh.dispose();
                        dip.activeTrader = null;
                        this.notify('🚶 Händler hat die Stadt verlassen.', 'info');
                    }
                    if(GameState.diplomacyOpen) this.updateDiplomacyUI();
                }

                // Nächsten Händler planen
                if(!dip.activeTrader && GameState.currentEpoch >= 2) {
                    // Marktplatz halbiert Händler-Intervall
                    let hasMarketplace = GameState.buildings.some(b => b.type === 'marketplace' && !b.isConstructing && b.workers.length > 0);
                    let traderInterval = hasMarketplace ? 600 : 1200;
                    if(dip.nextTraderTick === 0) dip.nextTraderTick = this.tickCounter + traderInterval;
                    else if(this.tickCounter >= dip.nextTraderTick) {
                        dip.nextTraderTick = this.tickCounter + traderInterval + Math.floor(Math.random() * 400);
                        this.spawnTrader();
                    }
                }
            },

            createFloatingText(text, pos, color) {
                let r = new BABYLON.GUI.Rectangle(); r.width="150px"; r.height="30px"; r.thickness=0;
                let l = new BABYLON.GUI.TextBlock(); l.text=text; l.color=color; l.fontSize=18; l.fontWeight="bold"; l.shadowColor="black"; l.shadowBlur=4; r.addControl(l);
                this.gui.addControl(r); if(pos instanceof BABYLON.Vector3) r.moveToVector3(pos, this.scene); else r.linkWithMesh(pos);
                r.linkOffsetY = -30; let f = 0;
                let anim = this.scene.onBeforeRenderObservable.add(() => { f++; r.linkOffsetY-=1; r.alpha-=0.02; if(f>50){ this.gui.removeControl(r); this.scene.onBeforeRenderObservable.remove(anim); }});
            },

            spawnProjectile(startPos, targetEnemy) {
                let p = BABYLON.MeshBuilder.CreateCylinder("proj", {diameterTop: 0, diameterBottom: 0.15, height: 1.5}, this.scene);
                p.position = startPos.clone();
                let mat = new BABYLON.StandardMaterial("pMat", this.scene);
                mat.emissiveColor = new BABYLON.Color3(0.2, 0.8, 1.0); // Neon Cyan leuchtender Pfeil
                mat.disableLighting = true;
                p.material = mat;
                GameState.projectiles.push({ mesh: p, target: targetEnemy, speed: 0.8 });
                window.Sfx.play(900, 'triangle', 0.1, 0.05); // Schuss-Sound
            },

            drawMinimap() {
                if (!this.minimapCtx) { const c = document.getElementById('minimapCanvas'); if(c) this.minimapCtx = c.getContext('2d'); }
                if(!this.minimapCtx) return;
                const ctx = this.minimapCtx; 
                if(this.minimapBg) ctx.drawImage(this.minimapBg, 0, 0); else ctx.clearRect(0, 0, 160, 160);
                
                const toMM = (v) => (v / this.mapSize) * 160 + 80;
                GameState.buildings.forEach(b => { 
                    if(b.type==='road' || b.type==='path') return;
                    ctx.fillStyle = BUILDINGS[b.type].color; let s = b.type==='townhall'?6:4; ctx.fillRect(toMM(b.x)-s/2, toMM(b.z)-s/2, s, s); 
                });
                ctx.fillStyle = '#22d3ee'; GameState.population.forEach(c => { if(c.mesh.isEnabled() && !['SOLDIER','KNIGHT','ARCHER','GUARD'].includes(c.job)) ctx.fillRect(toMM(c.mesh.position.x), toMM(c.mesh.position.z), 2, 2); });
                // Eigene Truppen in Blau
                GameState.population.filter(c => ['SOLDIER','KNIGHT','ARCHER','GUARD'].includes(c.job)).forEach(c => {
                    if(!c.mesh.isEnabled()) return;
                    ctx.fillStyle = c.job === 'KNIGHT' ? '#a855f7' : (c.job === 'ARCHER' ? '#b45309' : '#3b82f6');
                    ctx.fillRect(toMM(c.mesh.position.x)-1, toMM(c.mesh.position.z)-1, 3, 3);
                });
                GameState.enemies.forEach(e => {
                    if(e.isBoss) { ctx.fillStyle = '#a855f7'; ctx.fillRect(toMM(e.mesh.position.x)-2, toMM(e.mesh.position.z)-2, 6, 6); }
                    else { ctx.fillStyle = '#ef4444'; ctx.fillRect(toMM(e.mesh.position.x), toMM(e.mesh.position.z), 3, 3); }
                });
            },

            updateWaveCountdown() {
                const panel = document.getElementById('wave-countdown-panel');
                const val   = document.getElementById('wave-countdown-val');
                const num   = document.getElementById('wave-countdown-num');
                if(!panel || !val) return;

                const show = GameState.currentEpoch >= 3 && GameState.centerTile && GameState.isNight;
                panel.classList.toggle('hidden', !show);
                if(!show) return;

                if(GameState.enemies.length > 0) {
                    val.textContent = 'JETZT';
                    val.style.color = '#fca5a5';
                    if(num) num.textContent = `Welle ${GameState.waveNumber}`;
                    return;
                }
                const ticksLeft = Math.max(0, GameState.nextWaveTick - this.tickCounter);
                const secsLeft  = Math.ceil(ticksLeft / 60);
                const m = Math.floor(secsLeft / 60);
                const s = secsLeft % 60;
                val.textContent = m > 0 ? `${m}:${String(s).padStart(2,'0')}` : `${s}s`;
                val.style.color = secsLeft < 30 ? '#fca5a5' : '#fda4af';
                if(num) num.textContent = `Welle ${GameState.waveNumber + 1} kommt`;
            },

            // Licht-Pool: max _lightPoolSize PointLights, die immer zu den nächsten
            // Gebäuden zur Kamera zugewiesen werden. Kein GL_MAX_VERTEX_UNIFORM_BUFFERS-Overflow.
            updateNightLights() {
                if(!this._lightPool || !this.camera) return;

                const targetIntensity = GameState.isNight ? 1 : 0;
                const camX = this.camera.target.x;
                const camZ = this.camera.target.z;

                // Pool komplett zurücksetzen
                this._lightPool.forEach(p => { p.inUse = false; p.light.intensity = 0; });

                if(GameState.nightLights.length === 0 || targetIntensity === 0) return;

                // Die N nächsten Gebäude-Lichter zur Kamera auswählen
                const candidates = GameState.nightLights
                    .filter(nl => nl.parent && !nl.parent.isDisposed())
                    .map(nl => {
                        const pos = nl.parent.position;
                        return { nl, dist: Math.hypot(pos.x - camX, pos.z - camZ) };
                    })
                    .sort((a, b) => a.dist - b.dist)
                    .slice(0, this._lightPoolSize);

                candidates.forEach(({ nl }, i) => {
                    const slot = this._lightPool[i];
                    const pos = nl.parent.position;
                    slot.light.position.set(pos.x, pos.y + (nl.offsetY || 2), pos.z);
                    slot.light.diffuse = BABYLON.Color3.FromHexString(nl.color || '#fde68a');
                    slot.light.intensity = nl.max * targetIntensity;
                    slot.light.range = 28;
                    slot.inUse = true;
                });
            },

            updateLOD() {
                if(!this.camera) return;
                const camX = this.camera.target.x;
                const camZ = this.camera.target.z;

                // ── Stufe 1: Chunk-Visibility (grob, on/off pro Chunk) ──
                if(this.chunkGrid) {
                    this.chunkGrid.updateVisibility(camX, camZ, 280);
                }

                // ── Stufe 2: Feines LOD nur für aktivierte Objekte ──
                // Bäume — 4 Skalierungs-Stufen
                GameState.mapProps.trees.forEach(t => {
                    if(!t.mesh || !t.mesh.isEnabled()) return;
                    const dist = Math.hypot(t.x - camX, t.z - camZ);
                    if(dist > 240)      t.mesh.getChildMeshes().forEach(m => m.scaling?.setAll(0.4));
                    else if(dist > 120) t.mesh.getChildMeshes().forEach(m => m.scaling?.setAll(0.7));
                    else                t.mesh.getChildMeshes().forEach(m => m.scaling?.setAll(1.0));
                });

                // Büsche — nur zeigen wenn sehr nah (bereits per Chunk grob gesteuert)
                GameState.mapProps.bushes.forEach(b => {
                    if(!b.mesh || !b.mesh.isEnabled()) return;
                    const dist = Math.hypot(b.x - camX, b.z - camZ);
                    b.mesh.getChildMeshes().forEach(m => { if(m.setEnabled) m.setEnabled(dist < 180); });
                });

                // Tiere — nur in Nähe updaten
                GameState.animals.forEach(a => {
                    if(!a.mesh) return;
                    const dist = Math.hypot(a.mesh.position.x - camX, a.mesh.position.z - camZ);
                    a.mesh.setEnabled(dist < 180);
                });
            },

            updateLogic() {
                if(this.uiNeedsUpdate) { this.updateUI(); this.uiNeedsUpdate = false; }

                let moveZ = (this.keys["w"] ? 1 : 0) + (this.keys["s"] ? -1 : 0);
                let moveX = (this.keys["d"] ? 1 : 0) + (this.keys["a"] ? -1 : 0);
                let px = this.scene.pointerX, py = this.scene.pointerY;
                let cw = this.canvas.clientWidth, ch = this.canvas.clientHeight;
                
                if (px > 0 && py > 0 && px < cw && py < ch) {
                    let edge = 40, edgeSpeed = 0.5; 
                    if (px < edge) moveX -= edgeSpeed;
                    if (px > cw - edge) moveX += edgeSpeed;
                    if (py < edge) moveZ += edgeSpeed;
                    if (py > ch - edge) moveZ -= edgeSpeed;
                }

                if(moveZ !== 0 || moveX !== 0) {
                    let fwd = new BABYLON.Vector3(-Math.cos(this.camera.alpha), 0, -Math.sin(this.camera.alpha));
                    let rgt = new BABYLON.Vector3(-Math.sin(this.camera.alpha), 0, Math.cos(this.camera.alpha));
                    this.camera.target.x += (fwd.x * moveZ + rgt.x * moveX) * 1.5;
                    this.camera.target.z += (fwd.z * moveZ + rgt.z * moveX) * 1.5;
                }

                this.tickCounter++; if (this.tickCounter % 10 === 0) this.drawMinimap();
                // Auto-Save alle 1800 Ticks (lokal)
                if(this.tickCounter % 1800 === 0 && GameState.centerTile) {
                    this.saveLocal(0);
                    const ind = document.getElementById('autosave-indicator');
                    if(ind) { ind.style.opacity='1'; setTimeout(()=>ind.style.opacity='0', 2000); }
                }
                if(this.tickCounter % 30 === 0) { this.updateLOD(); this.checkTutorialProgress(); this._tutorialRefreshArrow(); }
                // Wellen-Countdown (alle 30 Ticks aktualisieren)
                if(this.tickCounter % 30 === 0) this.updateWaveCountdown();
                if(GameState.isPaused) return; 

                for(let step = 0; step < this.timeSpeed; step++) {
                    // Nacht läuft 2x schneller als der Tag
                    const nightMult = GameState.isNight ? 2.0 : 1.0;
                    GameState.timeOfDay += 0.00005 * GameState.daySpeed * nightMult;
                    if(GameState.timeOfDay > 1) GameState.timeOfDay = 0;
                    let timeCycle = Math.sin(GameState.timeOfDay * Math.PI * 2);
                    let wasNight = GameState.isNight; 
                    GameState.isNight = timeCycle < -0.2;

                    let sunIntensity = Math.max(0, timeCycle);
                    
                    
                    const skyColors = [
                        new BABYLON.Color3(0.35, 0.55, 0.65),
                        new BABYLON.Color3(0.25, 0.45, 0.75),
                        new BABYLON.Color3(0.45, 0.35, 0.25),
                        new BABYLON.Color3(0.55, 0.58, 0.65),
                    ];
                    let cSky = BABYLON.Color3.Lerp(new BABYLON.Color3(0.02, 0.02, 0.04), skyColors[GameState.season], sunIntensity);

                    let isRaining = false;
                    let isSnowing = GameState.season === 3;

                    if(GameState.weatherTimer > 0) {
                        GameState.weatherTimer--;
                        if(GameState.season === 3) {
                            isSnowing = true;
                        } else {
                            isRaining = true;
                            if(GameState.weatherTimer <= 0) window.Sfx.toggleRain(false);
                        }
                    } else {
                        const rainChance = [0.00012, 0.00005, 0.00020, 0.00003][GameState.season];
                        if(Math.random() < rainChance && GameState.season !== 3) {
                            GameState.weatherTimer = 2000;
                            window.Sfx.toggleRain(true);
                        }
                        if(GameState.season === 3 && Math.random() < 0.00008) {
                            GameState.weatherTimer = 1500;
                        }
                    }

                    // Dürre (Sommer)
                    if(GameState.isDrought) {
                        GameState.droughtTimer--;
                        if(GameState.droughtTimer <= 0) {
                            GameState.isDrought = false;
                            this.notify("🌧️ Die Dürre ist vorbei!", 'success');
                            this.uiNeedsUpdate = true;
                        }
                    } else if(GameState.season === 1 && Math.random() < 0.000015) {
                        GameState.isDrought = true;
                        GameState.droughtTimer = 3000 + Math.floor(Math.random() * 2000);
                        this.notify("☀️ Dürre! Nahrungsproduktion stark reduziert!", 'danger');
                        this.uiNeedsUpdate = true;
                    }

                    if(isRaining) {
                        if(Math.random() < 0.005) window.Sfx.thunder();
                        this.scene.clearColor = new BABYLON.Color4(0.4, 0.5, 0.6, 1);
                        this.hemiLight.intensity = Math.max(0.1, sunIntensity * 0.2);
                        this.mats.ground.specularPower = BABYLON.Scalar.Lerp(this.mats.ground.specularPower, 10, 0.01);
                        this.mats.ground.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
                        document.getElementById('weather-status').innerText = "🌧️ Wetter: Regen";
                        if(this.rainPS) this.rainPS.emitRate = 2000;
                        if(this.snowPS) this.snowPS.emitRate = 0;
                    } else if(isSnowing && GameState.weatherTimer > 0) {
                        this.scene.clearColor = new BABYLON.Color4(0.7, 0.75, 0.85, 1);
                        this.hemiLight.intensity = Math.max(0.15, sunIntensity * 0.3);
                        this.mats.ground.specularColor = new BABYLON.Color3(0.8, 0.85, 0.9);
                        document.getElementById('weather-status').innerText = "🌨️ Wetter: Schneesturm";
                        if(this.rainPS) this.rainPS.emitRate = 0;
                        if(this.snowPS) this.snowPS.emitRate = 1500;
                    } else if(GameState.isDrought) {
                        this.scene.clearColor = new BABYLON.Color4(0.55, 0.45, 0.25, 1);
                        this.hemiLight.intensity = Math.max(0.4, sunIntensity * 0.6);
                        this.mats.ground.specularColor = new BABYLON.Color3(0.4, 0.3, 0.1);
                        document.getElementById('weather-status').innerText = "🔥 Wetter: Dürre";
                        if(this.rainPS) this.rainPS.emitRate = 0;
                        if(this.snowPS) this.snowPS.emitRate = 0;
                    } else {
                        this.scene.clearColor = new BABYLON.Color4(cSky.r, cSky.g, cSky.b, 1);
                        this.hemiLight.intensity = Math.max(0.2, sunIntensity * 0.4);
                        this.mats.ground.specularPower = BABYLON.Scalar.Lerp(this.mats.ground.specularPower, 64, 0.01);
                        this.mats.ground.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
                        if(GameState.season === 3) {
                            document.getElementById('weather-status').innerText = "❄️ Wetter: Bedeckt";
                            if(this.snowPS) this.snowPS.emitRate = 200;
                            if(this.rainPS) this.rainPS.emitRate = 0;
                        } else {
                            document.getElementById('weather-status').innerText = GameState.isNight ? "🌌 Wetter: Sternenklar" : "🌤️ Wetter: Klar";
                            if(this.rainPS) this.rainPS.emitRate = 0;
                            if(this.snowPS) this.snowPS.emitRate = 0;
                        }
                    }
                    
                    this.scene.fogColor = this.scene.clearColor;
                    this.sunLight.direction = new BABYLON.Vector3(-Math.cos(GameState.timeOfDay * Math.PI * 2), -Math.max(0.1, timeCycle), -0.5);
                    this.sunLight.intensity = Math.max(0.05, sunIntensity * 1.0);

                    if(this.waterMesh) this.waterMesh.position.y = this.waterLevel + Math.sin(this.tickCounter * 0.05) * 0.08;
                    this.updateNightLights();

                    if(this.fireflies) {
                        this.fireflies.emitRate = (GameState.isNight && !isRaining) ? 100 : 0;
                        if(GameState.centerTile) this.fireflies.emitter = new BABYLON.Vector3(GameState.centerTile.x, 0, GameState.centerTile.z);
                    }

                    for(let i = GameState.mapProps.growingTrees.length - 1; i >= 0; i--) {
                        let gt = GameState.mapProps.growingTrees[i];
                        gt.scale += GameState.research.forestry ? 0.0002 : 0.0001; gt.mesh.scaling.setAll(gt.scale);
                        if(gt.scale >= 1.0) { 
                            const treeObj = {x: gt.x, z: gt.z, mesh: gt.mesh, health: 50};
                            GameState.mapProps.trees.push(treeObj);
                            if(this.chunkGrid) this.chunkGrid.addTree(treeObj);
                            GameState.mapProps.growingTrees.splice(i, 1);
                        }
                    }

                    if(step === 0) { 
                        document.getElementById('ui-time').innerText = GameState.isNight ? "NACHT" : "TAG";
                        document.getElementById('ui-time').className = GameState.isNight ? "text-xl font-black neon-text-purple leading-none tracking-widest" : "text-xl font-black neon-text-cyan leading-none tracking-widest";
                        document.getElementById('ui-time-bar').style.width = `${Math.max(0, sunIntensity)*100}%`;
                        if(GameState.isNight) { 
                            document.getElementById('ui-time-bar').style.backgroundColor = '#a855f7';
                            const skipBtn = document.getElementById('btn-skip-night');
                            if(skipBtn) skipBtn.classList.remove('hidden');
                        } else { 
                            document.getElementById('ui-time-bar').style.backgroundColor = '#22d3ee';
                            const skipBtn = document.getElementById('btn-skip-night');
                            if(skipBtn) skipBtn.classList.add('hidden');
                        }
                        
                        if(wasNight !== GameState.isNight) {
                            if(GameState.isNight) {
                                this.notify("🌙 Die Nacht bricht an — Feinde könnten angreifen!", 'night');
                            } else {
                                this.notify("☀️ Ein neuer Tag beginnt", 'info');
                                
                                // Tages-Counter für Jahreszeiten
                                GameState.seasonDay++;
                                if(GameState.seasonDay >= GameState.seasonLength) {
                                    GameState.seasonDay = 0;
                                    GameState.season = (GameState.season + 1) % 4;
                                    this.applySeasonVisuals(GameState.season);
                                    const names = ['🌸 Frühling', '☀️ Sommer', '🍂 Herbst', '❄️ Winter'];
                                    this.notify(`${names[GameState.season]} beginnt!`, 'info');
                                    const parts = names[GameState.season].split(' ');
                                    document.getElementById('season-status').innerText = `${parts[0]} Jahreszeit: ${parts[1]}`;
                                    
                                    // Dürre beenden wenn Sommer vorbei
                                    if(GameState.season !== 1 && GameState.isDrought) {
                                        GameState.isDrought = false;
                                        GameState.droughtTimer = 0;
                                        this.notify("🌧️ Die Dürre ist mit dem Sommer vorbei!", 'success');
                                    }
                                    // Schnee stoppen wenn Winter vorbei
                                    if(GameState.season !== 3 && this.snowPS) {
                                        this.snowPS.emitRate = 0;
                                    }
                                }
                            }
                        }
                    
                }

                    if (this.tickCounter % 300 === 0) {
                        // === MOD: Infinite Resources ===
                        if(window.GameMod?.infiniteResources) {
                            Object.keys(GameState.resources).forEach(k => { if(GameState.resources[k] < 9999) GameState.resources[k] = 9999; });
                        }

                    
                    // === MOD: Infinite Resources ===
                        if(window.GameMod?.infiniteResources) {
                            Object.keys(GameState.resources).forEach(k => { if(GameState.resources[k] < 9999) GameState.resources[k] = 9999; });
                        }
// Markt: passives Gold
                        let markets = GameState.buildings.filter(b => b.type === 'market' && !b.isConstructing && b.workers.length > 0);
                        if(markets.length > 0) {
                            let goldGain = Math.floor(GameState.population.length * (GameState.research.tradeRoutes ? 0.4 : 0.2) * markets.length);
                            if(goldGain > 0) {
                                GameState.resources.gold += goldGain;
                                markets.forEach(m => this.createFloatingText(`+${Math.floor(goldGain/markets.length)} Gold`, m.mesh, "#facc15"));
                                this.uiNeedsUpdate = true;
                            }
                        }

                        // Marktplatz: Gold +5/Runde — ein einziger FloatingText für alle
                        const _mpActive = GameState.buildings.filter(b => b.type === 'marketplace' && !b.isConstructing && b.workers.length > 0);
                        if(_mpActive.length > 0) {
                            const mpGold = _mpActive.length * 5;
                            GameState.resources.gold += mpGold;
                            this.createFloatingText(`+${mpGold} Gold`, _mpActive[0].mesh, "#fde68a");
                            this.uiNeedsUpdate = true;
                        }

                        // Theater: Gold +10/Runde — ein einziger FloatingText für alle
                        const _thActive = GameState.buildings.filter(b => b.type === 'theater' && !b.isConstructing && b.workers.length > 0);
                        if(_thActive.length > 0) {
                            const thGold = _thActive.length * 10;
                            GameState.resources.gold += thGold;
                            this.createFloatingText(`+${thGold} Gold`, _thActive[0].mesh, "#f0abfc");
                            this.uiNeedsUpdate = true;
                        }

                        // Steuern (Rathaus boosted +20%)
                        if(GameState.taxLevel > 0) {
                            let rathausBonus = GameState.buildings.some(b => b.type === 'townhall2' && !b.isConstructing) ? 1.2 : 1.0;
                            let taxGain = Math.floor(GameState.population.length * (GameState.taxLevel === 1 ? 0.5 : 1.5) * rathausBonus);
                            if(taxGain > 0) {
                                GameState.resources.gold += taxGain;
                                if(GameState.centerTile) this.createFloatingText(`+${taxGain} Steuern`, GameState.centerTile.mesh, "#fde047");
                                this.uiNeedsUpdate = true;
                            }
                        }
                    }

                    // Nach Zeile 1868 (dem schließenden } des tickCounter % 300 Blocks) einfügen:
                    if(this.tickCounter % 600 === 0 && GameState.centerTile) {
                        let nearEnemy = GameState.enemies.find(e => 
                            Math.hypot(e.mesh.position.x - GameState.centerTile.x, 
                                    e.mesh.position.z - GameState.centerTile.z) < 40
                        );
                    if(nearEnemy && !this._lastEnemyAlert) {
                        this.notify("⚔️ Feinde nähern sich dem Zentrum!", 'danger');
                        this._lastEnemyAlert = true;
                    }
                    if(!nearEnemy) this._lastEnemyAlert = false;
                }

                    // Lager-Inspector live aktualisieren
                        if(GameState.selectedBuilding && GameState.selectedBuilding.localInv) {
                            let invContent = document.getElementById('insp-localinv-content');
                            if(invContent && !document.getElementById('insp-localinv').classList.contains('hidden')) {
                                const labels = {wood:'🪵Holz',stone:'🪨Stein',clay:'🟤Lehm',coal:'⬛Kohle',wheat:'🌾Weizen',
                                                meat:'🥩Fleisch',fish:'🐟Fisch',planks:'🪵Bretter',bricks:'🧱Ziegel',
                                                flour:'🥣Mehl',iron:'🔗Eisen',tools:'🛠️Tools',weapons:'⚔️Waffen',
                                                food:'🍖Essen',fruits:'🍎Obst',vegetables:'🥕Gemüse',milk:'🥛Milch',
                                                wool:'🧶Wolle',cheese:'🧀Käse'};
                                invContent.innerHTML = Object.entries(GameState.selectedBuilding.localInv)
                                    .filter(([k,v]) => v > 0)
                                    .map(([k,v]) => `<span class="text-slate-400">${labels[k]||k}:</span><span class="text-cyan-300">${v}</span>`)
                                    .join('') || '<span class="col-span-2 text-slate-500 italic">leer</span>';
                            }
                        }


                    if (this.tickCounter % 600 === 0) {
                        if (GameState.mapProps.rocks.length < 1000) {
                            let rx = (Math.random() - 0.5) * (this.mapSize - 10); 
                            let rz = (Math.random() - 0.5) * (this.mapSize - 10);
                            let ry = this.getHeightAt(rx, rz);
                            if (ry >= 6 && ry < 14) {
                                let type = 'stone'; 
                                if(Math.random()<0.2) type = 'iron'; 
                                else if(Math.random()<0.2) type='coal';
                                this.spawnRock(rx, ry, rz, type);
                            }
                        }
                        // PERF: Einmaliger Pass statt 3× filter()
                        const _rc = { stone: 0, iron: 0, coal: 0 };
                        GameState.mapProps.rocks.forEach(r => { if(r.rockType in _rc) _rc[r.rockType]++; });
                        const stoneCount = _rc.stone, ironCount = _rc.iron, coalCount = _rc.coal;
                        const emergencySpawn = (type, minCount) => {
                            if(minCount < 5) {
                                for(let s=0; s<3; s++) {
                                    let rx = (Math.random()-0.5)*(this.mapSize-10);
                                    let rz = (Math.random()-0.5)*(this.mapSize-10);
                                    let ry = this.getHeightAt(rx, rz);
                                    if(ry >= 6 && ry < 14) this.spawnRock(rx, ry, rz, type);
                                }
                            }
                        };
                        emergencySpawn('stone', stoneCount);
                        emergencySpawn('iron',  ironCount);
                        emergencySpawn('coal',  coalCount);
                        if (GameState.animals.length < 100) this.spawnAnimal();
                    }

                    if (this.tickCounter % 300 === 0 && GameState.centerTile) { 
                        let cons = GameState.population.length;
                        
                        // ALLE Nahrungsarten zählen (muss identisch mit UI-Anzeige sein)
                        let totalFood = (GameState.resources.food    || 0)
                                      + (GameState.resources.meat    || 0)
                                      + (GameState.resources.fish    || 0)
                                      + (GameState.resources.fruits  || 0)
                                      + (GameState.resources.cheese  || 0)
                                      + (GameState.resources.vegetables || 0);

                        // Winter: Nahrung verdirbt (außer Vorratshaltung erforscht)
                        if(GameState.season === 3 && !GameState.research.foodStorage && this.tickCounter % 600 === 0 && GameState.resources.food > 0) {
                            let spoil = Math.floor(GameState.resources.food * 0.05);
                            GameState.resources.food = Math.max(0, GameState.resources.food - spoil);
                            if(spoil > 0 && GameState.centerTile) this.createFloatingText(`-${spoil} (Winter)`, GameState.centerTile.mesh, "#94a3b8");
                        }
                        if(totalFood >= cons) {
                            // Nahrung verbrauchen — reihum aus allen verfügbaren Quellen
                            let remaining = cons;
                            const sources = ['fish','meat','food','fruits','cheese','vegetables'];
                            for(const src of sources) {
                                if(remaining <= 0) break;
                                const avail = GameState.resources[src] || 0;
                                const take = Math.min(avail, remaining);
                                GameState.resources[src] -= take;
                                remaining -= take;
                            }
                            if(GameState.isStarving) {
                                this.notify("✅ Nahrungsversorgung gesichert — Arbeiter nehmen die Arbeit wieder auf!", 'success');
                            }
                            GameState.isStarving = false;  
                        } else { 
                            // Alle Nahrung auf 0 setzen
                            ['food','meat','fish','fruits','cheese','vegetables'].forEach(k => GameState.resources[k] = 0);
                            if(!GameState.isStarving) {
                                this.notify("🍖 Hunger! Keine Nahrung — nur Nahrungsjobs arbeiten weiter!", 'danger');
                                window.Sfx.hunger && window.Sfx.hunger();
                                // Nicht-Nahrungsarbeiter stoppen (UNEMPLOYED läuft immer weiter)
                                const foodJobs = ['GATHERER','HUNTER','FISHER','FARMER','ORCHARDIST','VEGFARMER',
                                                  'COWHERD','SHEPHERD','PIGFARMER','COOK','UNEMPLOYED'];
                                GameState.population.forEach(c => {
                                    if(!foodJobs.includes(c.job) && c.state !== 'IDLE' && 
                                       c.state !== 'GO_SLEEP' && c.state !== 'SLEEPING') {
                                        c.state = 'IDLE';
                                    }
                                });
                            }
                            GameState.isStarving = true;
                        }

                        // PERF: Einmaliger Pass für alle Happiness-relevanten Counts
                        const _hC = { house:0, tavern:0, market:0, chapel:0, temple:0, healhouse:0, park:0, theater:0, marketplace:0, townhall2:0 };
                        const _hNeedsWorkers = new Set(['tavern','market','theater','marketplace']);
                        GameState.buildings.forEach(b => {
                            if(b.isConstructing || !(b.type in _hC)) return;
                            if(!_hNeedsWorkers.has(b.type) || b.workers.length > 0) _hC[b.type]++;
                        });

                        const hBonus = GameState.research.cityPlanning ? 2 : 0;
                        let houseCapacity = 5 + (_hC.house * (4 + hBonus));
                        let targetHappiness = 60; // Basis

                        // === POSITIVE FAKTOREN ===
                        if(totalFood > GameState.population.length * 1.5) targetHappiness += 10;
                        if(totalFood > GameState.population.length * 3)   targetHappiness += 10;
                        targetHappiness += _hC.tavern      * 15;
                        targetHappiness += _hC.market      * 5;
                        if(GameState.taxLevel === 0) targetHappiness += 15;

                        // === GESELLSCHAFTS-GEBÄUDE ===
                        targetHappiness += _hC.chapel      * 10;
                        targetHappiness += _hC.temple      * 20;
                        targetHappiness += _hC.healhouse   * 8;
                        targetHappiness += _hC.park        * 6;
                        targetHappiness += _hC.theater     * 25;
                        targetHappiness += _hC.marketplace * 4;
                        targetHappiness -= _hC.townhall2   * 5;

                        // === NEGATIVE FAKTOREN ===
                        if(GameState.isStarving)                                    targetHappiness -= 35;
                        if(GameState.activeDisaster === 'plague')                   targetHappiness -= 30;
                        if(GameState.population.length > houseCapacity)             targetHappiness -= 15;
                        if(GameState.population.length > houseCapacity * 1.5)       targetHappiness -= 15;
                        if(GameState.taxLevel === 2)                                targetHappiness -= 20;

                        targetHappiness = Math.max(0, Math.min(100, targetHappiness));
                        let delta = targetHappiness - GameState.happiness;
                        GameState.happiness += Math.sign(delta) * Math.min(2, Math.abs(delta));
                        GameState.happiness = Math.max(0, Math.min(100, GameState.happiness));
                        
                        document.getElementById('happiness-status').innerText = `❤️ ${GameState.happiness}%`;
                        document.getElementById('happiness-status').className = GameState.happiness > 70 ? "text-[10px] font-bold text-green-400 uppercase tracking-widest mt-0.5" : (GameState.happiness < 40 ? "text-[10px] font-bold text-red-400 uppercase tracking-widest mt-0.5" : "text-[10px] font-bold text-yellow-400 uppercase tracking-widest mt-0.5");

                        // Bevölkerungswachstum: Kapelle boostet +20%
                        let growthChance = (_hC.chapel > 0) ? 1.2 : 1.0;
                        if (!GameState.isNight && !GameState.isStarving && GameState.population.length < houseCapacity && totalFood >= 20 && GameState.happiness > 50 && Math.random() < growthChance) {
                            if(GameState.resources.fish >= 20) GameState.resources.fish -= 20; else if(GameState.resources.meat >= 20) GameState.resources.meat -= 20; else GameState.resources.food -= 20; 
                            this.spawnCitizen();
                            this.notify(`👥 Neuer Bewohner! (${GameState.population.length} gesamt)`, 'info');
                        }
                        

                        this.uiNeedsUpdate = true;
                        let storedRes = (GameState.resources.wood||0) + (GameState.resources.stone||0) + 
                                        (GameState.resources.planks||0) + (GameState.resources.bricks||0) + 
                                        (GameState.resources.iron||0) + (GameState.resources.coal||0) + 
                                        (GameState.resources.clay||0);
                        if(storedRes > GameState.maxStorage * 0.85 && this.tickCounter % 1800 === 0) {
                            this.notify("📦 Lager fast voll! Neues Lager bauen.", 'warning');
                        }
                        if(GameState.selectedBuilding && GameState.selectedBuilding.isConstructing) {
                            let sDiv = document.getElementById('insp-status');
                            if(sDiv) sDiv.innerText = `Bauphase: ${GameState.selectedBuilding.buildProgress}%`;
                        }
                        // Statistiken aufzeichnen (alle 300 Ticks = ein Datenpunkt)
                        this.recordStats();
                        if(this.statsOpen) this.updateStats();
                        this.checkTutorialProgress();
                    }

                    // --- WELLEN-SYSTEM ---
                    if(GameState.isNight && GameState.centerTile && 
                       this.tickCounter >= GameState.nextWaveTick && 
                       GameState.enemies.length === 0) {
                        let interval = window.GameMod?.waveInterval ?? Math.max(800, 2400 - GameState.waveNumber * 60);
                        if(GameState.research.warfare) interval = Math.floor(interval * 1.5);
                        GameState.nextWaveTick = this.tickCounter + interval;
                        this.spawnWave();
                    }

                    // --- KATASTROPHEN-SYSTEM ---
                    if(GameState.centerTile && GameState.currentEpoch >= 2 && !GameState.activeDisaster) {
                        // Nächste Katastrophe planen (erste nach 3000 Ticks, dann alle 2400-4800 Ticks)
                        if(GameState.nextDisasterTick === 0) {
                            GameState.nextDisasterTick = this.tickCounter + 3000;
                        } else if(this.tickCounter >= GameState.nextDisasterTick) {
                            GameState.nextDisasterTick = this.tickCounter + 2400 + Math.floor(Math.random() * 2400);
                            // Nur auslösen wenn genügend Gebäude vorhanden
                            if(GameState.buildings.filter(b => !b.isConstructing && b.type !== 'road' && b.type !== 'path').length >= 3) {
                                this.triggerDisaster();
                            }
                        }
                    }
                    // Seuchen-Timer runterticken
                    if(GameState.activeDisaster === 'plague') {
                        GameState.plagueTimer--;
                        if(GameState.plagueTimer <= 0) {
                            GameState.activeDisaster = null;
                            this.notify('✅ Seuche überstanden.', 'success');
                        }
                    }

                    // --- ACTIVE DEFENSE: TOWERS SHOOTING ---
                    if (this.tickCounter % 60 === 0) {
                        // PERF: Tower-Liste gecacht, nur invalidiert bei Bauen/Abreißen
                        if (!this._towerCache) {
                            this._towerCache = GameState.buildings.filter(b => b.type === 'tower' && !b.isConstructing);
                        }
                        this._towerCache.forEach(t => {
                            let target = GameState.enemies.find(e => Math.hypot(e.mesh.position.x - t.x, e.mesh.position.z - t.z) < 40);
                            if (target) this.spawnProjectile(new BABYLON.Vector3(t.x, t.baseY + 4.5, t.z), target);
                        });
                    }

                    // --- DIPLOMATIESYSTEM ---
                    if(GameState.centerTile) this.updateDiplomacyTick();

                    // --- WERFT & SCHIFFE ---
                    this.updateShips();
                    // Werft: Automatische Voyage starten wenn bereit
                    if(this.tickCounter % 60 === 0) {
                        GameState.buildings
                            .filter(b => b.type === 'wharf' && !b.isConstructing && b.workers && b.workers.length > 0)
                            .forEach(wharf => {
                                const alreadySailing = GameState.ships.some(s => s.wharf === wharf);
                                const cooldownOk = !wharf.nextVoyageTick || this.tickCounter >= wharf.nextVoyageTick;
                                if(!alreadySailing && cooldownOk && !wharf.shipState) {
                                    wharf.shipState = 'sailing';
                                    this.spawnShip(wharf);
                                }
                            });
                    }

                    // --- PROJECTILES UPDATE ---
                    for(let i = GameState.projectiles.length - 1; i >= 0; i--) {
                        let p = GameState.projectiles[i];
                        if (!p.target || p.target.health <= 0) { p.mesh.dispose(); GameState.projectiles.splice(i, 1); continue; }
                        
                        let tPos = p.target.mesh.position.add(new BABYLON.Vector3(0, 0.5, 0));
                        let dir = tPos.subtract(p.mesh.position);
                        
                        if (dir.length() < 1.0) { // Hit
                            p.target.health -= 20; 
                            window.Game.spawnResParticles(p.target.mesh.position, "#ef4444");
                            window.Sfx.play(100, 'square', 0.1, 0.1); // Treffer Sound
                            p.mesh.dispose(); GameState.projectiles.splice(i, 1);
                        } else { // Move
                            dir.normalize();
                            p.mesh.position.addInPlace(dir.scale(p.speed));
                            p.mesh.lookAt(tPos);
                            p.mesh.rotate(BABYLON.Axis.X, Math.PI/2, BABYLON.Space.LOCAL);
                        }
                    }

                    GameState.population.forEach((c, idx) => {
                        if((this.tickCounter + idx) % 2 === 0) c.update();
                    });
                    GameState.enemies.forEach(e => e.update());
                    GameState.animals.forEach(a => { if(a.mesh && a.mesh.isEnabled()) a.update(); });
                    const deadEnemies = GameState.enemies.filter(e => e.health <= 0);
                    if(deadEnemies.length > 0) {
                        window.Sfx.enemyDie && window.Sfx.enemyDie();
                        deadEnemies.forEach(e => {
                            if(e.isBoss) {
                                if(e._auraLight) { e._auraLight.dispose(); e._auraLight = null; }
                                const reward = e.bossEpoch * 100;
                                GameState.resources.gold += reward;
                                this.notify(`☠️ Boss besiegt! +${reward} Gold!`, 'success');
                                this.spawnResParticles(e.mesh.position, '#facc15');
                            }
                        });
                    }
                    GameState.enemies = GameState.enemies.filter(e => e.health > 0);
                    GameState.animals = GameState.animals.filter(a => a.health > 0);
                }
            },

            updateUI() {

                // Kosten-Labels dynamisch aktualisieren
                Object.keys(BUILDINGS).forEach(id => {
                    let btn = document.getElementById('btn-build-' + id);
                    if(btn) {
                        let costSpan = btn.querySelector('span span');
                        if(costSpan) costSpan.innerText = this.getCostLabel(id);
                    }
                });

                const el = (id) => document.getElementById(id);

                // Ressourcen-Trend berechnen (+/-)
                const trend = (key, current) => {
                    const prev = this.prevResources[key];
                    if(prev === undefined) return '';
                    const diff = current - prev;
                    if(diff > 0) return ` <span style="color:#4ade80;font-size:9px">+${diff}</span>`;
                    if(diff < 0) return ` <span style="color:#f87171;font-size:9px">${diff}</span>`;
                    return '';
                };
                const setRes = (id, key, val) => {
                    const e = el(id); if(!e) return;
                    e.innerHTML = val + trend(key, val);
                };

                setRes('res-wood',  'wood',  GameState.resources.wood);
                setRes('res-stone', 'stone', GameState.resources.stone);
                const totalFood = GameState.resources.food + GameState.resources.meat + GameState.resources.fish + GameState.resources.fruits + GameState.resources.cheese;
                if(el('res-food')) el('res-food').innerHTML = totalFood + trend('food', totalFood);
                if(el('res-gold')) el('res-gold').innerHTML = GameState.resources.gold + trend('gold', GameState.resources.gold);
                setRes('res-clay',       'clay',       GameState.resources.clay);
                setRes('res-fruits',     'fruits',     GameState.resources.fruits);
                setRes('res-vegetables', 'vegetables', GameState.resources.vegetables);
                setRes('res-milk',       'milk',       GameState.resources.milk);
                setRes('res-wool',       'wool',       GameState.resources.wool);
                setRes('res-cheese',     'cheese',     GameState.resources.cheese);
                setRes('res-wheat',      'wheat',      GameState.resources.wheat);
                setRes('res-coal',       'coal',       GameState.resources.coal);
                setRes('res-meat',       'meat',       GameState.resources.meat);
                setRes('res-fish',       'fish',       GameState.resources.fish);
                setRes('res-planks',     'planks',     GameState.resources.planks);
                setRes('res-bricks',     'bricks',     GameState.resources.bricks);
                setRes('res-flour',      'flour',      GameState.resources.flour);
                setRes('res-iron',       'iron',       GameState.resources.iron);
                setRes('res-tools',      'tools',      GameState.resources.tools);
                setRes('res-weapons',    'weapons',    GameState.resources.weapons);

                // Snapshot für nächsten Trend-Vergleich (alle 300 Ticks)
                if(this.tickCounter % 300 === 0) {
                    this.prevResources = Object.assign({}, GameState.resources, { food: totalFood });
                }
                
                let foodContainer = el('res-food-container');
                if (foodContainer) {
                    if(GameState.isStarving) foodContainer.classList.add("text-red-400"); 
                    else foodContainer.classList.remove("text-red-400");
                }
                
                if(el('res-pop')) { const hBonus = GameState.research.cityPlanning ? 2 : 0; el('res-pop').innerText = (GameState.centerTile?5:0) + (GameState.buildings.filter(b=>b.type==='house' && !b.isConstructing).length * (4 + hBonus)); }
                if(el('res-free')) el('res-free').innerText = GameState.population.length;
                
                let wrapper = el('build-menu-wrapper');
                if(wrapper && !wrapper.classList.contains('hidden')) {
                    Object.keys(BUILDINGS).forEach(id => {
                        let btn = el(`btn-build-${id}`);
                        if(btn && !BUILDINGS[id].hidden && btn.dataset.cat === this.buildCategory) {
                            const cfg = BUILDINGS[id];
                            let w = cfg.cost.w||0, s = cfg.cost.s||0, g = cfg.cost.g||0, p = cfg.cost.p||0, b = cfg.cost.b||0, i = cfg.cost.i||0;
                            if (id === 'townhall') btn.disabled = (GameState.centerTile !== null); 
                            else btn.disabled = (GameState.centerTile === null) || (GameState.currentEpoch < cfg.epoch) || (GameState.resources.wood < w || GameState.resources.stone < s || GameState.resources.gold < g || GameState.resources.planks < p || GameState.resources.bricks < b || GameState.resources.iron < i);
                        }
                    });
                }
            },
            showMsg(txt) { let m = document.getElementById('sys-msg'); if(m) { m.innerText = txt; m.style.opacity = 1; setTimeout(() => m.style.opacity = 0, 3000); } },

            notify(text, type = 'info') {
                const colors = {
                    info:    'bg-slate-800/90 border-cyan-500/60 text-cyan-300',
                    warning: 'bg-yellow-950/90 border-yellow-500/60 text-yellow-300',
                    danger:  'bg-red-950/90 border-red-500/60 text-red-300',
                    success: 'bg-green-950/90 border-green-500/60 text-green-300',
                    night:   'bg-indigo-950/90 border-purple-500/60 text-purple-300',
                };
                const stack = document.getElementById('notif-stack');
                if(!stack) return;

                // Max 4 gleichzeitig — älteste entfernen
                while(stack.children.length >= 4) stack.removeChild(stack.firstChild);

                const el = document.createElement('div');
                el.className = `notif glass-panel px-5 py-2 rounded-lg border font-bold text-sm tracking-widest uppercase ${colors[type] || colors.info}`;
                el.innerText = text;
                stack.appendChild(el);

                // Nach 4 Sekunden ausblenden, nach 4.4 Sekunden entfernen
                setTimeout(() => el.classList.add('hide'), 4000);
                setTimeout(() => { if(el.parentNode) el.parentNode.removeChild(el); }, 4400);
            },

            toggleStats() {
                this.statsOpen = !this.statsOpen;
                const panel = document.getElementById('stats-panel');
                if(!panel) return;
                if(this.statsOpen) {
                    panel.classList.remove('hidden');
                    // Forschungs-Panel schließen wenn Stats öffnet
                    document.getElementById('research-panel')?.classList.add('hidden');
                    this.researchOpen = false;
                    this.updateStats();
                } else {
                    panel.classList.add('hidden');
                }
            },

            toggleResearch() {
                this.researchOpen = !this.researchOpen;
                const panel = document.getElementById('research-panel');
                if(!panel) return;
                if(this.researchOpen) {
                    panel.classList.remove('hidden');
                    // Stats-Panel schließen wenn Forschung öffnet
                    document.getElementById('stats-panel')?.classList.add('hidden');
                    this.statsOpen = false;
                    this.updateResearchUI();
                } else {
                    panel.classList.add('hidden');
                }
                window.Sfx.click();
            },

            setStatTab(tab) {
                this.statTab = tab;
                ['pop','gold','food','happiness'].forEach(t => {
                    const btn = document.getElementById('stab-' + t);
                    if(btn) {
                        if(t === tab) {
                            btn.className = 'px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 cursor-pointer';
                        } else {
                            btn.className = 'px-3 py-1 rounded-full bg-slate-700/50 text-slate-400 cursor-pointer';
                        }
                    }
                });
                this.drawStatsGraph();
            },

            recordStats() {
                const maxPoints = 60;
                const totalFood = (GameState.resources.food||0) + (GameState.resources.meat||0) + (GameState.resources.fish||0);
                this.statsHistory.pop.push(GameState.population.length);
                this.statsHistory.gold.push(GameState.resources.gold||0);
                this.statsHistory.food.push(totalFood);
                this.statsHistory.happiness.push(GameState.happiness||0);
                // Nur die letzten 60 Punkte behalten
                for(const k of ['pop','gold','food','happiness']) {
                    if(this.statsHistory[k].length > maxPoints) this.statsHistory[k].shift();
                }
            },

            drawStatsGraph() {
                const canvas = document.getElementById('stats-canvas');
                if(!canvas) return;
                const ctx = canvas.getContext('2d');
                const data = this.statsHistory[this.statTab];
                const W = canvas.width, H = canvas.height;

                ctx.clearRect(0, 0, W, H);

                // Hintergrund-Raster
                ctx.strokeStyle = 'rgba(100,100,150,0.15)';
                ctx.lineWidth = 1;
                for(let i = 0; i <= 4; i++) {
                    const y = (H / 4) * i;
                    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
                }

                if(data.length < 2) {
                    ctx.fillStyle = 'rgba(100,150,200,0.4)';
                    ctx.font = '12px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('Noch keine Daten...', W/2, H/2);
                    return;
                }

                const max = Math.max(...data, 1);
                const min = Math.min(...data, 0);
                const range = max - min || 1;

                const colors = { pop: '#22d3ee', gold: '#fde047', food: '#4ade80', happiness: '#f472b6' };
                const color = colors[this.statTab] || '#22d3ee';

                // Fläche füllen
                ctx.beginPath();
                ctx.moveTo(0, H);
                data.forEach((v, i) => {
                    const x = (i / (data.length - 1)) * W;
                    const y = H - ((v - min) / range) * (H - 10) - 5;
                    if(i === 0) ctx.lineTo(x, y); else ctx.lineTo(x, y);
                });
                ctx.lineTo(W, H);
                ctx.closePath();
                ctx.fillStyle = color + '22';
                ctx.fill();

                // Linie
                ctx.beginPath();
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.lineJoin = 'round';
                data.forEach((v, i) => {
                    const x = (i / (data.length - 1)) * W;
                    const y = H - ((v - min) / range) * (H - 10) - 5;
                    if(i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                });
                ctx.stroke();

                // Aktueller Wert oben rechts
                ctx.fillStyle = color;
                ctx.font = 'bold 14px Rajdhani, sans-serif';
                ctx.textAlign = 'right';
                ctx.fillText(data[data.length-1], W - 4, 16);

                // Min/Max
                ctx.font = '10px sans-serif';
                ctx.fillStyle = 'rgba(150,150,200,0.6)';
                ctx.textAlign = 'left';
                ctx.fillText('max: ' + max, 4, 12);
                ctx.fillText('min: ' + min, 4, H - 4);
            },

            updateStats() {
                if(!this.statsOpen) return;
                const el = id => document.getElementById(id);
                const epochs = ['I','II','III','IV'];
                if(el('stat-epoch')) el('stat-epoch').innerText = epochs[(GameState.currentEpoch||1)-1] || 'I';
                if(el('stat-pop')) el('stat-pop').innerText = GameState.population.length;
                // Nur echte Gebäude zählen — keine Straßen/Pfade/Brücken
                const realBuildings = GameState.buildings.filter(b => !b.isConstructing && b.type !== 'road' && b.type !== 'path' && b.type !== 'bridge');
                if(el('stat-buildings')) el('stat-buildings').innerText = realBuildings.length;
                if(el('stat-waves')) el('stat-waves').innerText = GameState.waveNumber || 0;

                // Top Produzenten
                if(el('stat-producers')) {
                    const jobCount = {};
                    GameState.population.forEach(c => {
                        if(c.job && c.job !== 'UNEMPLOYED') jobCount[c.job] = (jobCount[c.job]||0) + 1;
                    });
                    const sorted = Object.entries(jobCount).sort((a,b) => b[1]-a[1]).slice(0,4);
                    const jobNames = { WOODCUTTER:'Holzfäller', MINER:'Bergmann', FARMER:'Bauer',
                        GATHERER:'Sammler', HUNTER:'Jäger', FISHER:'Fischer', SAWMILL:'Sägewerk',
                        BAKER:'Bäcker', MILLER:'Müller', SMELTER:'Schmelzer', ORCHARDIST:'Obstgärtner',
                        VEGFARMER:'Gemüsebauer', COWHERD:'Kuhhirte', PIGFARMER:'Schweinebauer',
                        SHEPHERD:'Schäfer', COOK:'Koch', CHEESEMAKER:'Käser', GUARD:'Wache',
                        MERCHANT:'Händler', INNKEEPER:'Wirt', TOOLMAKER:'Werkzeugmacher',
                        WEAPONSMITH:'Waffenschmied', FORESTER:'Förster', BRICKMAKER:'Ziegler' };
                    el('stat-producers').innerHTML = sorted.length > 0
                        ? sorted.map(([j,n]) => `<div>${jobNames[j]||j}: <span class="text-cyan-400">${n}</span></div>`).join('')
                        : '<div class="text-slate-500 italic">Keine Arbeiter</div>';
                }

                // Spielzeit
                if(el('stat-time')) {
                    const ticks = this.tickCounter || 0;
                    const secs = Math.floor(ticks / 60);
                    const mins = Math.floor(secs / 60);
                    const hrs = Math.floor(mins / 60);
                    const timeStr = hrs > 0 ? `${hrs}h ${mins%60}m` : `${mins}m ${secs%60}s`;
                    const season = ['🌸 Frühling','☀️ Sommer','🍂 Herbst','❄️ Winter'][GameState.season||0];
                    el('stat-time').innerHTML = `
                        <div>Spielzeit: <span class="text-cyan-400">${timeStr}</span></div>
                        <div>Jahreszeit: <span class="text-cyan-400">${season}</span></div>
                        <div>Tag ${(GameState.seasonDay||0)+1} / ${GameState.seasonLength||8}</div>
                        <div>Tiere: <span class="text-cyan-400">${GameState.animals.length}</span></div>
                    `;
                }

                this.drawStatsGraph();
            },
        };