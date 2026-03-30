// game.js — GameState + window.Game controller
        const GameState = {
            resources: { wood: 600, stone: 600, food: 600, gold: 200, clay: 0, coal: 0, wheat: 0, meat: 0, fish: 0, planks: 0, bricks: 0, flour: 0, iron: 0, tools: 0, weapons: 0, fruits: 0, vegetables: 0, milk: 0, wool: 0, cheese: 0 },
            maxStorage: 2000, population: [], buildings: [], enemies: [], animals: [],
            centerTile: null, selectedBuilding: null, buildMode: null, buildRotation: 0, 
            mapProps: { trees: [], rocks: [], bushes: [], growingTrees: [] },
            projectiles: [],
            timeOfDay: 0.25, isStarving: false, isNight: false, isPaused: false,
            weatherTimer: 0, happiness: 100, nightLights: [], daySpeed: 1, currentEpoch: 1,
            season: 0, seasonDay: 0, seasonLength: 8,
            isDrought: false, droughtTimer: 0,
            waveNumber: 0, nextWaveTick: 0,
            research: {
                betterTools: false, farming: false, cityPlanning: false,
                smelting: false, armor: false, forestry: false,
                warfare: false, fortification: false, tradeRoutes: false, foodStorage: false
            },
            footTraffic: {}, paths: new Set(), taxLevel: 1 
        };

        
        window.Game = {
            canvas: null, engine: null, scene: null, camera: null, hl: null, gui: null,
            waterLevel: 0.5, mapSize: 1000, keys: {}, timeSpeed: 1, minimapCtx: null, tickCounter: 0, ghostRoot: null, fireflies: null,
            uiNeedsUpdate: true, buildCategory: 'all', minimapBg: null, rainPS: null, leafPS: null,
            statsHistory: { pop: [], gold: [], food: [], happiness: [] },
            statTab: 'pop', statsOpen: false, statsTick: 0,
            
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

            openSettings() { document.getElementById('settings-modal').classList.remove('hidden'); },
            closeSettings() { document.getElementById('settings-modal').classList.add('hidden'); },
            switchTab(tabId) {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                event.target.classList.add('active');
                ['general', 'cloud', 'mod', 'feedback', 'research'].forEach(id => { 
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
                GameState.resources = { wood: 600, stone: 600, food: 600, gold: 200, clay: 0, coal: 0, wheat: 0, meat: 0, fish: 0, planks: 0, bricks: 0, flour: 0, iron: 0, tools: 0, weapons: 0 };
                GameState.buildings = []; GameState.population = []; GameState.enemies = [];
                GameState.animals = []; GameState.projectiles = []; GameState.nightLights = [];
                GameState.mapProps = { trees: [], rocks: [], bushes: [], growingTrees: [] };
                GameState.centerTile = null; GameState.selectedBuilding = null; GameState.buildMode = null;
                GameState.timeOfDay = 0.25; GameState.isStarving = false; GameState.isNight = false;
                GameState.happiness = 100; GameState.daySpeed = 1; GameState.currentEpoch = 1;
                GameState.footTraffic = {}; GameState.paths = new Set(); GameState.taxLevel = 1;
                GameState.maxStorage = 2000; GameState.weatherTimer = 0;
                GameState.season = 0; GameState.seasonDay = 0;
                if(this.leafPS) this.leafPS.emitRate = 0;
                setTimeout(() => this.applySeasonVisuals(0), 500);
                GameState.isDrought = false; GameState.droughtTimer = 0;
                GameState.waveNumber = 0; GameState.nextWaveTick = 0;
                this.statsHistory = { pop: [], gold: [], food: [], happiness: [] };
                this.statsOpen = false;
                const statsPanel = document.getElementById('stats-panel');
                if(statsPanel) statsPanel.classList.add('hidden');
                GameState.research = { betterTools: false, farming: false, cityPlanning: false,
                    smelting: false, armor: false, forestry: false,
                    warfare: false, fortification: false, tradeRoutes: false, foodStorage: false };
                if(this.snowPS) this.snowPS.emitRate = 0;
                
                // Neue Karte generieren
                Noise.seedOffsetX = Math.random() * 10000;
                Noise.seedOffsetY = Math.random() * 10000;
                this.generateLandscape();
                this.initMinimapBg();
                this.closeInspector();
                this.closeSettings();
                this.setBuildMode(null);
                
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
                this.notify(`🔬 ${names[tech] || tech} erforscht!`, 'success');
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

            applyMod() {
                try {
                    let modData = JSON.parse(document.getElementById('mod-input').value);
                    if(modData.resources) { Object.assign(GameState.resources, modData.resources); }
                    this.uiNeedsUpdate = true; window.Sfx.click(); this.showMsg("Mod erfolgreich geladen!");
                    this.closeSettings();
                } catch(e) { window.Sfx.error(); this.showMsg("Fehlerhafter Mod-Code (JSON)!"); }
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

            async saveGameCloud() {
                if(!_fb().auth || !_fb().auth.currentUser) { window.Sfx.error(); this.showMsg("Cloud nicht verbunden!"); return; }
                window.Sfx.click(); this.showMsg("Speichere in der Cloud...");
                try {
                    let serializedBuildings = GameState.buildings.map(b => ({ type: b.type, x: b.x, y: b.y, z: b.z, buildProgress: b.buildProgress, isConstructing: b.isConstructing, localInv: b.localInv, workersCount: b.workers.length }));
                    const saveData = { resources: GameState.resources, seedX: Noise.seedOffsetX, seedY: Noise.seedOffsetY, timeOfDay: GameState.timeOfDay, epoch: GameState.currentEpoch, popCount: GameState.population.length, buildings: serializedBuildings, timestamp: new Date().toISOString() };
                    const docRef = _fb().doc(_fb().db, 'artifacts', _fb().appId, 'users', _fb().auth.currentUser.uid, 'saves', 'slot1');
                    await _fb().setDoc(docRef, saveData);
                    this.showMsg("Spiel in Cloud gesichert!");
                } catch(e) { window.Sfx.error(); this.showMsg("Fehler beim Speichern!"); }
            },

            async loadGameCloud() {
                if(!_fb().auth || !_fb().auth.currentUser) { window.Sfx.error(); this.showMsg("Cloud nicht verbunden!"); return; }
                window.Sfx.click(); this.showMsg("Lade aus der Cloud...");
                try {
                    const docRef = _fb().doc(_fb().db, 'artifacts', _fb().appId, 'users', _fb().auth.currentUser.uid, 'saves', 'slot1');
                    const docSnap = await _fb().getDoc(docRef);
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        GameState.resources = Object.assign({wood:0, stone:0, food:0, gold:0, clay:0, coal:0, wheat:0, meat:0, fish:0, planks:0, bricks:0, flour:0, iron:0, tools:0, weapons:0}, data.resources);
                        GameState.timeOfDay = data.timeOfDay; Noise.seedOffsetX = data.seedX; Noise.seedOffsetY = data.seedY; GameState.currentEpoch = data.epoch || 1;
                        document.getElementById('epoch-status').innerText = `🏛️ Epoche: ${['I', 'II', 'III', 'IV'][GameState.currentEpoch-1]}`;
                        
                        GameState.buildings.forEach(b => { if(b.mesh) b.mesh.dispose(); }); GameState.buildings = [];
                        GameState.population.forEach(p => { if(p.mesh) p.mesh.dispose(); }); GameState.population = [];
                        GameState.enemies.forEach(e => { if(e.mesh) e.mesh.dispose(); }); GameState.enemies = [];
                        GameState.animals.forEach(a => { if(a.mesh) a.mesh.dispose(); }); GameState.animals = [];
                        GameState.projectiles.forEach(p => { if(p.mesh) p.mesh.dispose(); }); GameState.projectiles = [];
                        GameState.mapProps.trees.forEach(t => { if(t.mesh) t.mesh.dispose(); }); GameState.mapProps.rocks.forEach(r => { if(r.mesh) r.mesh.dispose(); }); GameState.mapProps.bushes.forEach(b => { if(b.mesh) b.mesh.dispose(); });
                        GameState.mapProps.trees = []; GameState.mapProps.rocks = []; GameState.mapProps.bushes = []; GameState.nightLights = [];
                        GameState.paths.clear(); GameState.footTraffic = {};
                        if(this.groundMesh) this.groundMesh.dispose(); if(this.waterMesh) this.waterMesh.dispose();
                        
                        this.generateLandscape(); GameState.centerTile = null;
                        this.initMinimapBg();
                        
                        data.buildings.forEach(bData => {
                            let dummyRoot = BABYLON.MeshBuilder.CreateBox("r_" + bData.type, {size: 0.1}, this.scene);
                            dummyRoot.position = new BABYLON.Vector3(bData.x, bData.y, bData.z);
                            MeshFactory.createBuildingGeometry(bData.type, dummyRoot, this.scene, this.mats, false);
                            dummyRoot.getChildMeshes().forEach(m => this.shadows.addShadowCaster(m));
                            this.snapGroundMeshToTerrain(dummyRoot, bData.type, bData.x, bData.y, bData.z);
                            
                            const realBData = { 
                                id: Math.random().toString(36).substr(2, 9), type: bData.type, x: bData.x, y: bData.y, z: bData.z, 
                                mesh: dummyRoot, workers: [], maxWorkers: BUILDINGS[bData.type].maxWorkers, role: BUILDINGS[bData.type].role,
                                localInv: bData.localInv || { wood: 0, stone: 0, food: 0, planks: 0, iron: 0, clay: 0, coal: 0, wheat: 0, meat: 0, fish: 0, bricks: 0, flour: 0 },
                                isConstructing: bData.isConstructing, buildProgress: bData.buildProgress, baseY: bData.y
                            };
                            dummyRoot.bData = realBData; dummyRoot.getChildMeshes().forEach(c => c.bData = realBData);
                            GameState.buildings.push(realBData);
                            if(bData.type === 'townhall') GameState.centerTile = realBData;
                        });
                        for(let i=0; i<data.popCount; i++) this.spawnCitizen();
                        this.uiNeedsUpdate = true; this.closeSettings(); this.showMsg("Spiel erfolgreich geladen!");
                    } else { window.Sfx.error(); this.showMsg("Kein Speicherstand gefunden."); }
                } catch(e) { window.Sfx.error(); this.showMsg("Fehler beim Laden!"); }
            },

            setBuildCategory(cat) {
                this.buildCategory = cat;
                document.querySelectorAll('.build-tab').forEach(b => b.classList.remove('active', 'text-cyan-400'));
                let act = document.querySelector(`.build-tab[data-cat="${cat}"]`);
                if(act) act.classList.add('active', 'text-cyan-400');

                document.querySelectorAll('.btn-build').forEach(btn => {
                    if (cat === 'all' || btn.dataset.cat === cat) btn.style.display = 'flex';
                    else btn.style.display = 'none';
                });
                
                document.querySelectorAll('.menu-separator').forEach(sep => {
                    sep.style.display = cat === 'all' ? 'block' : 'none';
                });
                this.uiNeedsUpdate = true;
            },

            toggleBuildMenu() {
                let wrapper = document.getElementById('build-menu-wrapper');
                if(wrapper) wrapper.classList.toggle('hidden');
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

            hasInfra(x, z, type) { return GameState.buildings.some(b => b.type === type && Math.abs(b.x - x) < 2 && Math.abs(b.z - z) < 2); },

            createMaterials() {
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
                    treeTrunk: new BABYLON.StandardMaterial("mTT", this.scene)
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
                groundMat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05); groundMat.specularPower = 64; groundMat.useVertexColors = true; groundMat.maxSimultaneousLights = 12; 
                this.mats.ground = groundMat;
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
                            } else if(forestNoise < -0.05 && Math.random() < 0.5) {
                                let rNode = new BABYLON.TransformNode("br", this.scene);
                                rNode.position = new BABYLON.Vector3(x, y + 0.2, z);
                                let b1 = BABYLON.MeshBuilder.CreateSphere("b1", {diameter: 1.5, segments: 8}, this.scene);
                                b1.position = new BABYLON.Vector3(0, 0.6, 0); b1.parent = rNode; b1.material = this.mats.bush;
                                let b2 = BABYLON.MeshBuilder.CreateSphere("b2", {diameter: 1.2, segments: 8}, this.scene);
                                b2.position = new BABYLON.Vector3(0.5, 0.4, 0.4); b2.parent = rNode; b2.material = this.mats.bush;
                                GameState.mapProps.bushes.push({x, z, mesh: rNode, health: 30});
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
                this.scene.onPointerMove = (evt, pickResult) => {
                    if(GameState.buildMode && this.ghostRoot) {
                        if(evt.target.tagName !== 'CANVAS') { this.ghostRoot.isVisible = false; return; }

                        let hit = this.scene.pick(this.scene.pointerX, this.scene.pointerY, (mesh) => mesh.name === "ground");
                        if(hit.hit && hit.pickedPoint) {
                            this.ghostRoot.isVisible = true;
                            let x = Math.round(hit.pickedPoint.x);
                            let z = Math.round(hit.pickedPoint.z);
                            let yCenter = this.getHeightAt(x, z); 
                            
                            if(GameState.buildMode === 'bridge' || GameState.buildMode === 'port') yCenter = this.waterLevel;
                            this.ghostRoot.position = new BABYLON.Vector3(x, yCenter, z);
                            this.snapGroundMeshToTerrain(this.ghostRoot, GameState.buildMode, x, yCenter, z);

                            let canPlace = true;
                            if (GameState.buildMode === 'bridge' || GameState.buildMode === 'port') { 
                                if(this.getHeightAt(x,z) > this.waterLevel + 0.6) canPlace = false; 
                            } else { 
                                if(this.getHeightAt(x,z) <= this.waterLevel + 0.5) canPlace = false; 
                            }
                            
                            let color = canPlace ? new BABYLON.Color3(0.2, 1, 0.2) : new BABYLON.Color3(1, 0, 0);
                            this.ghostRoot.getChildMeshes().forEach(m => { if(m.material) m.material.emissiveColor = color; });
                        } else this.ghostRoot.isVisible = false;
                    }
                };

                this.scene.onPointerDown = (evt, pickResult) => {
                    if(evt.target.tagName !== 'CANVAS') return;

                    if(evt.button === 2) { if(GameState.buildMode) this.setBuildMode(null); else this.closeInspector(); return; }
                    if(evt.button !== 0) return; 
                    
                    if(GameState.buildMode) {
                        let hit = this.scene.pick(this.scene.pointerX, this.scene.pointerY, (mesh) => mesh.name === "ground");
                        if (hit.hit && hit.pickedPoint) {
                            let bSize = BUILDINGS[GameState.buildMode].size;
                            let x = Math.round(hit.pickedPoint.x), z = Math.round(hit.pickedPoint.z);
                            let yCenter = this.getHeightAt(x, z);

                            let canPlace = true;
                            if (GameState.buildMode === 'bridge' || GameState.buildMode === 'port') { 
                                if(this.getHeightAt(x,z) > this.waterLevel + 0.6) canPlace = false; 
                            } else { 
                                if(this.getHeightAt(x,z) <= this.waterLevel + 0.5) canPlace = false; 
                            }

                            if (canPlace) { 
                                this.placeBuilding(GameState.buildMode, x, z); 
                                if(GameState.buildMode !== 'road' && GameState.buildMode !== 'bridge' && GameState.buildMode !== 'path') this.setBuildMode(null); 
                            } else {
                                window.Sfx.error();
                            }
                        }
                    } else {
                        let hit = this.scene.pick(this.scene.pointerX, this.scene.pointerY);
                        if(hit.hit && hit.pickedMesh && hit.pickedMesh.bData) { window.Sfx.click(); this.selectBuilding(hit.pickedMesh.bData); }
                        else if (hit.hit && hit.pickedMesh && hit.pickedMesh.name === "ground") this.closeInspector();
                    }
                };
            },

            // NEU: Robuste Terrain-Anpassung via WorldMatrix Transformation
            snapGroundMeshToTerrain(root, type, x, y, z) {
                if (type === 'road' || type === 'path') {
                    let groundObj = root.getChildMeshes().find(m => m.name === "b");
                    if(!groundObj) return;
                    
                    root.computeWorldMatrix(true);
                    let wm = root.getWorldMatrix();
                    let positions = groundObj.getVerticesData(BABYLON.VertexBuffer.PositionKind);
                    
                    for(let i=0; i<positions.length; i+=3) {
                        // Transformiere lokale Vertex-Koordinaten in globale Welt-Koordinaten
                        let local = new BABYLON.Vector3(positions[i], 0, positions[i+2]);
                        let world = BABYLON.Vector3.TransformCoordinates(local, wm);
                        
                        // Setze die Höhe exakt auf den Terrain-Wert an diesem Punkt
                        positions[i+1] = this.getHeightAt(world.x, world.z) - y + 0.03; 
                    }
                    groundObj.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
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
                let y = (type === 'bridge' || type === 'port') ? this.waterLevel : this.getHeightAt(x, z);
                
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
                const showInvFor = ['lumbercamp','quarry','claypit','gatherer','hunter','farm','port','storage',
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
                    if (GameState.currentEpoch === 1) { upBtn.classList.remove('hidden'); upBtn.innerText = "Epoche II (100H, 100S, 50B)"; }
                    else if (GameState.currentEpoch === 2) { upBtn.classList.remove('hidden'); upBtn.innerText = "Epoche III (200S, 100Z, 50Ei)"; }
                    else if (GameState.currentEpoch === 3) { upBtn.classList.remove('hidden'); upBtn.innerText = "Epoche IV (500G, 200Z, 200Ei)"; }
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
                    if (GameState.resources.wood >= 100 && GameState.resources.stone >= 100 && GameState.resources.planks >= 50) {
                        GameState.resources.wood -= 100; GameState.resources.stone -= 100; GameState.resources.planks -= 50;
                        GameState.currentEpoch = 2; window.Sfx.build(); this.showMsg("Epoche II erreicht!");
                    } else { window.Sfx.error(); this.showMsg("Ressourcen fehlen!"); return; }
                } else if (GameState.currentEpoch === 2) {
                    if (GameState.resources.stone >= 200 && GameState.resources.bricks >= 100 && GameState.resources.iron >= 50) {
                        GameState.resources.stone -= 200; GameState.resources.bricks -= 100; GameState.resources.iron -= 50;
                        GameState.currentEpoch = 3; window.Sfx.build(); this.showMsg("Epoche III erreicht!");
                    } else { window.Sfx.error(); this.showMsg("Ressourcen fehlen!"); return; }
                } else if (GameState.currentEpoch === 3) {
                    if (GameState.resources.gold >= 500 && GameState.resources.bricks >= 200 && GameState.resources.iron >= 200) {
                        GameState.resources.gold -= 500; GameState.resources.bricks -= 200; GameState.resources.iron -= 200;
                        GameState.currentEpoch = 4; window.Sfx.build(); this.showMsg("Epoche IV (Imperium) erreicht!");
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
                        if(free) { free.assignJob(b); b.workers.push(free); }
                        else { window.Sfx.error(); warn.innerText = "Keine freien Siedler!"; warn.classList.remove('hidden'); }
                    }
                } else {
                    if(b.workers.length <= 0) return;
                    b.workers.pop().assignJob(null);
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
                GameState.nightLights = GameState.nightLights.filter(nl => { if(nl.parent === b.mesh) { nl.light.dispose(); return false; } return true; });
                b.mesh.dispose(); GameState.buildings = GameState.buildings.filter(x => x.id !== b.id);
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
                root.position = new BABYLON.Vector3(px, this.getHeightAt(px, pz), pz);

                let enemy = new Enemy(root, this.scene);
                enemy.legL = legL; enemy.legR = legR;
                enemy.type = type;
                if(type === 'ork')   { enemy.health = 80;  enemy.speed = 0.07; enemy.damage = 2; }
                if(type === 'nomad') { enemy.health = 25;  enemy.speed = 0.10; enemy.damage = 0; enemy.steals = true; }
                if(type === 'bandit'){ enemy.health = 40;  enemy.speed = 0.05; enemy.damage = 1; }

                GameState.enemies.push(enemy);
            },

            spawnWave() {
                if(GameState.currentEpoch < 3) return;
                GameState.waveNumber++;
                const wave = GameState.waveNumber;
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
                this.notify(`⚔️ Welle ${wave}! ${count} ${names[type]}${sideText}!`, 'danger');
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
                ctx.fillStyle = '#ef4444'; GameState.enemies.forEach(e => ctx.fillRect(toMM(e.mesh.position.x), toMM(e.mesh.position.z), 3, 3));
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
                if(GameState.isPaused) return; 

                for(let step = 0; step < this.timeSpeed; step++) {
                    GameState.timeOfDay += 0.00005 * GameState.daySpeed; 
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
                    GameState.nightLights.forEach(nl => nl.light.intensity = BABYLON.Scalar.Lerp(nl.light.intensity, (GameState.isNight?1:0) * nl.max, 0.05));

                    if(this.fireflies) {
                        this.fireflies.emitRate = (GameState.isNight && !isRaining) ? 100 : 0;
                        if(GameState.centerTile) this.fireflies.emitter = new BABYLON.Vector3(GameState.centerTile.x, 0, GameState.centerTile.z);
                    }

                    for(let i = GameState.mapProps.growingTrees.length - 1; i >= 0; i--) {
                        let gt = GameState.mapProps.growingTrees[i];
                        gt.scale += GameState.research.forestry ? 0.0002 : 0.0001; gt.mesh.scaling.setAll(gt.scale);
                        if(gt.scale >= 1.0) { GameState.mapProps.trees.push({x: gt.x, z: gt.z, mesh: gt.mesh, health: 50}); GameState.mapProps.growingTrees.splice(i, 1); }
                    }

                    if(step === 0) { 
                        document.getElementById('ui-time').innerText = GameState.isNight ? "NACHT" : "TAG";
                        document.getElementById('ui-time').className = GameState.isNight ? "text-xl font-black neon-text-purple leading-none tracking-widest" : "text-xl font-black neon-text-cyan leading-none tracking-widest";
                        document.getElementById('ui-time-bar').style.width = `${Math.max(0, sunIntensity)*100}%`;
                        if(GameState.isNight) document.getElementById('ui-time-bar').style.backgroundColor = '#a855f7'; 
                        else document.getElementById('ui-time-bar').style.backgroundColor = '#22d3ee';
                        
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
                        let markets = GameState.buildings.filter(b => b.type === 'market' && !b.isConstructing && b.workers.length > 0);
                        if(markets.length > 0) {
                            let goldGain = Math.floor(GameState.population.length * (GameState.research.tradeRoutes ? 0.4 : 0.2) * markets.length);
                            if(goldGain > 0) {
                                GameState.resources.gold += goldGain;
                                markets.forEach(m => this.createFloatingText(`+${Math.floor(goldGain/markets.length)} Gold`, m.mesh, "#facc15"));
                                this.uiNeedsUpdate = true;
                            }
                        }
                        
                        if(GameState.taxLevel > 0) {
                            let taxGain = Math.floor(GameState.population.length * (GameState.taxLevel === 1 ? 0.5 : 1.5));
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
                        // Gezielter Nachschub wenn Erztyp komplett fehlt
                        const stoneCount = GameState.mapProps.rocks.filter(r => r.rockType === 'stone').length;
                        const ironCount  = GameState.mapProps.rocks.filter(r => r.rockType === 'iron').length;
                        const coalCount  = GameState.mapProps.rocks.filter(r => r.rockType === 'coal').length;
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
                        
                        let totalFood = GameState.resources.food + GameState.resources.meat + GameState.resources.fish;

                        // Winter: Nahrung verdirbt (außer Vorratshaltung erforscht)
                        if(GameState.season === 3 && !GameState.research.foodStorage && this.tickCounter % 600 === 0 && GameState.resources.food > 0) {
                            let spoil = Math.floor(GameState.resources.food * 0.05);
                            GameState.resources.food = Math.max(0, GameState.resources.food - spoil);
                            if(spoil > 0 && GameState.centerTile) this.createFloatingText(`-${spoil} (Winter)`, GameState.centerTile.mesh, "#94a3b8");
                        }
                        if(totalFood >= cons) {
                            if(GameState.resources.fish >= cons) GameState.resources.fish -= cons;
                            else if(GameState.resources.meat >= cons) GameState.resources.meat -= cons;
                            else GameState.resources.food -= cons;
                            if(GameState.isStarving) this.notify("✅ Nahrungsversorgung gesichert", 'success');
                            GameState.isStarving = false;  
                        } else { 
                            GameState.resources.food = 0; GameState.resources.meat = 0; GameState.resources.fish = 0;
                            if(!GameState.isStarving) this.notify("🍖 Hunger! Keine Nahrung mehr!", 'danger');
                            GameState.isStarving = true;
                        }

                        let houseCapacity = 4 + (GameState.buildings.filter(b=>b.type==='house' && !b.isConstructing).length * 4);
                        let targetHappiness = 60; // Basis: optimistischer Ausgangswert

                        // Positive Faktoren
                        if(totalFood > GameState.population.length * 1.5) targetHappiness += 10; // Genug Essen
                        if(totalFood > GameState.population.length * 3)   targetHappiness += 10; // Überfluss
                        let activeTaverns = GameState.buildings.filter(b => b.type === 'tavern' && !b.isConstructing && b.workers.length > 0).length;
                        targetHappiness += activeTaverns * 15;
                        let activeMarkets = GameState.buildings.filter(b => b.type === 'market' && !b.isConstructing && b.workers.length > 0).length;
                        targetHappiness += activeMarkets * 5;
                        if(GameState.taxLevel === 0) targetHappiness += 15; // Steuerbefreiung = sehr beliebt

                        // Negative Faktoren
                        if(GameState.isStarving)                                    targetHappiness -= 35;
                        if(GameState.population.length > houseCapacity)             targetHappiness -= 15; // Überbelegung
                        if(GameState.population.length > houseCapacity * 1.5)       targetHappiness -= 15; // Stark überfüllt
                        if(GameState.taxLevel === 2)                                targetHappiness -= 20; // Hohe Steuern

                        targetHappiness = Math.max(0, Math.min(100, targetHappiness));

                        // Langsame Annäherung: max 2 Punkte pro Tick (statt 1)
                        let delta = targetHappiness - GameState.happiness;
                        GameState.happiness += Math.sign(delta) * Math.min(2, Math.abs(delta));
                        GameState.happiness = Math.max(0, Math.min(100, GameState.happiness));
                        
                        document.getElementById('happiness-status').innerText = `❤️ ${GameState.happiness}%`;
                        document.getElementById('happiness-status').className = GameState.happiness > 70 ? "text-[10px] font-bold text-green-400 uppercase tracking-widest mt-0.5" : (GameState.happiness < 40 ? "text-[10px] font-bold text-red-400 uppercase tracking-widest mt-0.5" : "text-[10px] font-bold text-yellow-400 uppercase tracking-widest mt-0.5");

                        if (!GameState.isNight && !GameState.isStarving && GameState.population.length < houseCapacity && totalFood >= 20 && GameState.happiness > 50) {
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
                    }

                    // --- WELLEN-SYSTEM ---
                    if(GameState.isNight && GameState.centerTile && 
                       this.tickCounter >= GameState.nextWaveTick && 
                       GameState.enemies.length === 0) {
                        let interval = Math.max(600, 1800 - GameState.waveNumber * 80);
                        if(GameState.research.warfare) interval = Math.floor(interval * 1.5);
                        GameState.nextWaveTick = this.tickCounter + interval;
                        this.spawnWave();
                    }

                    // --- ACTIVE DEFENSE: TOWERS SHOOTING ---
                    if (this.tickCounter % 60 === 0) {
                        let towers = GameState.buildings.filter(b => b.type === 'tower' && !b.isConstructing);
                        towers.forEach(t => {
                            // Turm sucht nach Feinden im Radius von 40
                            let target = GameState.enemies.find(e => Math.hypot(e.mesh.position.x - t.x, e.mesh.position.z - t.z) < 40);
                            if (target) this.spawnProjectile(new BABYLON.Vector3(t.x, t.baseY + 4.5, t.z), target);
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
                    GameState.animals.forEach(a => a.update());
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
                
                if(el('res-wood')) el('res-wood').innerText = GameState.resources.wood; 
                if(el('res-stone')) el('res-stone').innerText = GameState.resources.stone; 
                if(el('res-food')) el('res-food').innerText = GameState.resources.food + GameState.resources.meat + GameState.resources.fish + GameState.resources.fruits + GameState.resources.cheese;                if(el('res-gold')) el('res-gold').innerText = GameState.resources.gold; 
                if(el('res-clay')) el('res-clay').innerText = GameState.resources.clay;
                if(el('res-fruits')) el('res-fruits').innerText = GameState.resources.fruits;
                if(el('res-vegetables')) el('res-vegetables').innerText = GameState.resources.vegetables;
                if(el('res-milk')) el('res-milk').innerText = GameState.resources.milk;
                if(el('res-wool')) el('res-wool').innerText = GameState.resources.wool;
                if(el('res-cheese')) el('res-cheese').innerText = GameState.resources.cheese; 
                if(el('res-wheat')) el('res-wheat').innerText = GameState.resources.wheat; 
                if(el('res-coal')) el('res-coal').innerText = GameState.resources.coal; 
                if(el('res-meat')) el('res-meat').innerText = GameState.resources.meat; 
                if(el('res-fish')) el('res-fish').innerText = GameState.resources.fish;
                if(el('res-planks')) el('res-planks').innerText = GameState.resources.planks; 
                if(el('res-bricks')) el('res-bricks').innerText = GameState.resources.bricks; 
                if(el('res-flour')) el('res-flour').innerText = GameState.resources.flour; 
                if(el('res-iron')) el('res-iron').innerText = GameState.resources.iron;
                if(el('res-tools')) el('res-tools').innerText = GameState.resources.tools; 
                if(el('res-weapons')) el('res-weapons').innerText = GameState.resources.weapons;
                
                let foodContainer = el('res-food-container');
                if (foodContainer) {
                    if(GameState.isStarving) foodContainer.classList.add("text-red-400"); 
                    else foodContainer.classList.remove("text-red-400");
                }
                
                if(el('res-pop')) { const hBonus = GameState.research.cityPlanning ? 2 : 0; el('res-pop').innerText = (GameState.centerTile?4:0) + (GameState.buildings.filter(b=>b.type==='house' && !b.isConstructing).length * (4 + hBonus)); }
                if(el('res-free')) el('res-free').innerText = GameState.population.filter(c => c.job === 'UNEMPLOYED').length;
                
                let wrapper = el('build-menu-wrapper');
                if(wrapper && !wrapper.classList.contains('hidden')) {
                    Object.keys(BUILDINGS).forEach(id => {
                        let btn = el(`btn-build-${id}`);
                        if(btn && !BUILDINGS[id].hidden && (this.buildCategory === 'all' || btn.dataset.cat === this.buildCategory)) {
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
                    this.updateStats();
                } else {
                    panel.classList.add('hidden');
                }
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
                if(el('stat-buildings')) el('stat-buildings').innerText = GameState.buildings.filter(b => !b.isConstructing).length;
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