// buildings.js — BUILDINGS definitions + MeshFactory geometry
        const BUILDINGS = {
            road: { name: "Straße", desc: "Speed +100%", cost: {w:0, s:5, g:0, p:0, b:0, i:0}, maxWorkers: 0, color: "#64748b", size: 2, epoch: 1 },
            path: { name: "Trampelpfad", desc: "Speed +30%", cost: {w:0, s:0, g:0, p:0, b:0, i:0}, maxWorkers: 0, color: "#8b5a2b", size: 2, epoch: 1, hidden: true },
            bridge: { name: "Brücke", desc: "Wasserwege", cost: {w:20, s:10, g:0, p:0, b:0, i:0}, maxWorkers: 0, color: "#8b4513", size: 2, epoch: 1 },
            townhall: { name: "Zentrum", desc: "Steuert Epochen.", cost: {w:0, s:0, g:0, p:0, b:0, i:0}, maxWorkers: 0, color: "#a855f7", size: 6, epoch: 1 },
            house: { name: "Haus", desc: "Max Pop +4", cost: {w:0, s:20, g:0, p:20, b:0, i:0}, maxWorkers: 0, color: "#d97706", size: 3, epoch: 1 },
            storage: { name: "Lager", desc: "Kapazität +500", cost: {w:0, s:50, g:0, p:50, b:0, i:0}, maxWorkers: 0, color: "#0ea5e9", size: 3, epoch: 1 },
            lumbercamp: { name: "Holzfäller", desc: "Fällt Bäume", cost: {w:50, s:0, g:0, p:0, b:0, i:0}, maxWorkers: 3, role: "WOODCUTTER", color: "#8b4513", size: 3, epoch: 1 },
            quarry: { name: "Mine", desc: "Stein, Erz, Kohle", cost: {w:80, s:0, g:0, p:0, b:0, i:0}, maxWorkers: 3, role: "MINER", color: "#64748b", size: 3, epoch: 1 },
            claypit: { name: "Lehmgrube", desc: "Fördert Lehm", cost: {w:40, s:10, g:0, p:0, b:0, i:0}, maxWorkers: 2, role: "CLAYMINER", color: "#b45309", size: 3, epoch: 1 },
            gatherer: { name: "Sammler", desc: "Beeren", cost: {w:40, s:0, g:0, p:0, b:0, i:0}, maxWorkers: 2, role: "GATHERER", color: "#22c55e", size: 3, epoch: 1 },
            hunter: { name: "Jäger", desc: "Fleisch", cost: {w:50, s:0, g:0, p:0, b:0, i:0}, maxWorkers: 2, role: "HUNTER", color: "#dc2626", size: 3, epoch: 1 },
            farm: { name: "Weizenfarm", desc: "Weizen", cost: {w:120, s:30, g:0, p:0, b:0, i:0}, maxWorkers: 3, role: "FARMER", color: "#facc15", size: 3, epoch: 2 },
            orchard:   { name: "Obstgarten",    desc: "Produziert Obst", cost: {w:80, s:20, g:0, p:0, b:0, i:0}, maxWorkers: 2, role: "ORCHARDIST", color: "#f97316", size: 3, epoch: 1 },
            vegetable: { name: "Gemüsegarten",  desc: "Produziert Gemüse",          cost: {w:60, s:15, g:0, p:0, b:0, i:0}, maxWorkers: 2, role: "VEGFARMER",  color: "#4ade80", size: 3, epoch: 1 },
            cowpasture:{ name: "Kuhherde",      desc: "Milch",            cost: {w:100, s:20, g:0, p:0, b:0, i:0}, maxWorkers: 2, role: "COWHERD",    color: "#fde68a", size: 3, epoch: 1 },
            sheeppasture:{ name: "Schafherde",  desc: "Wolle",     cost: {w:80,  s:10, g:0, p:0, b:0, i:0}, maxWorkers: 2, role: "SHEPHERD",   color: "#f1f5f9", size: 3, epoch: 2 },
            pigpen:    { name: "Schweinestall", desc: "Fleisch",           cost: {w:80, s:20, g:0, p:0, b:0, i:0}, maxWorkers: 2, role: "PIGFARMER",  color: "#fda4af", size: 3, epoch: 1 },
            kitchen:   { name: "Küche",         desc: "Gemüse -> Essen",              cost: {w:80, s:40, g:0, p:0, b:0, i:0}, maxWorkers: 2, role: "COOK",       color: "#fb923c", size: 3, epoch: 1 },
            cheesery:  { name: "Käserei",       desc: "Milch -> Käse",     cost: {w:100, s:30, g:0, p:0, b:0, i:0}, maxWorkers: 2, role: "CHEESEMAKER",color: "#fef08a", size: 3, epoch: 2 },
            port:  { name: "Hafen",  desc: "Fisch (Wasser)",       cost: {w:80,  s:0,  g:0, p:0, b:20, i:0  }, maxWorkers: 2, role: "FISHER",    color: "#3b82f6", size: 3, epoch: 1 },
            wharf: { name: "Werft",  desc: "Handelsschiffe, Gold+Waren",  cost: {w:150, s:0,  g:0, p:80, b:0,  i:30 }, maxWorkers: 2, role: "DOCKWORKER", color: "#1d4ed8", size: 3, epoch: 2 },
            
            sawmill: { name: "Sägewerk", desc: "8 Holz → 15 Bretter", cost: {w:80, s:40, g:0, p:0, b:0, i:0}, maxWorkers: 2, role: "SAWMILL", color: "#fdba74", size: 3, epoch: 1 },
            brickyard: { name: "Ziegelei", desc: "8 Lehm+3 Holz → 12 Ziegel", cost: {w:60, s:30, g:0, p:0, b:0, i:0}, maxWorkers: 2, role: "BRICKMAKER", color: "#b91c1c", size: 3, epoch: 1 },
            mill: { name: "Mühle", desc: "8 Weizen → 12 Mehl", cost: {w:100, s:0, g:0, p:0, b:20, i:0}, maxWorkers: 2, role: "MILLER", color: "#fef08a", size: 3, epoch: 1 },
            bakery: { name: "Bäckerei", desc: "8 Mehl+2 Holz → 40 Essen", cost: {w:0, s:50, g:0, p:0, b:20, i:0}, maxWorkers: 2, role: "BAKER", color: "#fcd34d", size: 3, epoch: 1 },
            
            smelter: { name: "Schmelze", desc: "4 Erz+4 Kohle → 6 Eisen", cost: {w:0, s:100, g:0, p:0, b:50, i:0}, maxWorkers: 2, role: "SMELTER", color: "#ef4444", size: 3, epoch: 2 },
            forester: { name: "Förster", desc: "Pflanzt Bäume", cost: {w:60, s:20, g:0, p:0, b:0, i:0}, maxWorkers: 2, role: "FORESTER", color: "#166534", size: 3, epoch: 2 },
            market: { name: "Markt", desc: "Passiv Gold", cost: {w:100, s:0, g:0, p:50, b:0, i:0}, maxWorkers: 2, role: "MERCHANT", color: "#eab308", size: 3, epoch: 2 },
            tavern: { name: "Taverne", desc: "Zufriedenheit +", cost: {w:150, s:0, g:0, p:0, b:50, i:0}, maxWorkers: 2, role: "INNKEEPER", color: "#d97706", size: 3, epoch: 2 },
            
            toolmaker: { name: "Werkzeugmacher", desc: "4 Eisen+4 Kohle → 8 Werkzeuge", cost: {w:0, s:150, g:0, p:50, b:50, i:20}, maxWorkers: 2, role: "TOOLMAKER", color: "#4ade80", size: 3, epoch: 3 },
            weaponsmith: { name: "Waffenschmiede", desc: "6 Eisen+6 Holz → 8 Waffen", cost: {w:0, s:200, g:0, p:50, b:100, i:50}, maxWorkers: 2, role: "WEAPONSMITH", color: "#fca5a5", size: 3, epoch: 3 },
            barracks: { name: "Kaserne", desc: "Soldaten & Ritter (Waffen!)", cost: {w:0, s:0, g:50, p:100, b:0, i:50}, maxWorkers: 4, role: "SOLDIER", color: "#dc2626", size: 3, epoch: 2 },
            archery:  { name: "Schießstand", desc: "Bogenschützen ausbilden", cost: {w:80, s:50, g:30, p:0, b:0, i:20}, maxWorkers: 3, role: "ARCHER", color: "#b45309", size: 3, epoch: 2 },
            
            wall: { name: "Steinmauer", desc: "Blockiert Feinde", cost: {w:0, s:20, g:0, p:0, b:10, i:0}, maxWorkers: 0, color: "#94a3b8", size: 2, epoch: 2 },
            tower: { name: "Wachturm", desc: "Feuert Pfeile auf Feinde", cost: {w:0, s:0, g:0, p:0, b:50, i:100}, maxWorkers: 0, color: "#94a3b8", size: 2, epoch: 4 },
            monument:    { name: "Monument",    desc: "Globaler Buff",                        cost: {w:0,   s:0,   g:500, p:0,   b:200, i:200}, maxWorkers: 0,                     color: "#c084fc", size: 4, epoch: 4 },

            // === GESELLSCHAFT ===
            chapel:      { name: "Kapelle",      desc: "Zufriedenheit +10, Wachstum +20%",    cost: {w:80,  s:60,  g:0,   p:0,   b:0,   i:0  }, maxWorkers: 1, role: "PRIEST",    color: "#f9a8d4", size: 2, epoch: 1 },
            temple:      { name: "Tempel",       desc: "Zufriedenheit +20",                    cost: {w:0,   s:100, g:50,  p:0,   b:80,  i:0  }, maxWorkers: 1, role: "PRIEST",    color: "#e9d5ff", size: 3, epoch: 2 },
            healhouse:   { name: "Heilstätte",   desc: "Seuchen-Resistenz, Zufriedenheit +8", cost: {w:100, s:50,  g:0,   p:30,  b:0,   i:0  }, maxWorkers: 2, role: "HEALER",    color: "#86efac", size: 3, epoch: 2 },
            marketplace: { name: "Marktplatz",   desc: "Händler häufiger, Gold +5/Runde",     cost: {w:120, s:0,   g:0,   p:40,  b:0,   i:0  }, maxWorkers: 2, role: "MERCHANT",  color: "#fde68a", size: 3, epoch: 2 },
            park:        { name: "Park",          desc: "Zufriedenheit +6",                    cost: {w:30,  s:0,   g:0,   p:0,   b:0,   i:0  }, maxWorkers: 0,                     color: "#4ade80", size: 2, epoch: 1 },
            school:      { name: "Schule",        desc: "Arbeiter +10% Speed",                 cost: {w:80,  s:80,  g:0,   p:0,   b:60,  i:0  }, maxWorkers: 1, role: "TEACHER",   color: "#93c5fd", size: 3, epoch: 2 },
            theater:     { name: "Theater",       desc: "Zufriedenheit +25, Gold +10/Runde",   cost: {w:0,   s:100, g:0,   p:100, b:50,  i:0  }, maxWorkers: 2, role: "PERFORMER", color: "#f0abfc", size: 3, epoch: 3 },
            townhall2:   { name: "Rathaus",       desc: "Steuern +20%, Zufriedenheit -5",      cost: {w:0,   s:200, g:100, p:0,   b:150, i:50 }, maxWorkers: 1, role: "OFFICIAL",  color: "#fbbf24", size: 3, epoch: 3 }
        };

        const MeshFactory = {
            createBuildingGeometry: function(type, root, scene, mats, isGhost = false) {
                // PERF/FIX: Kein echter PointLight pro Gebäude mehr — überschreitet GL_MAX_VERTEX_UNIFORM_BUFFERS.
                // Stattdessen Metadaten speichern; game.js verwaltet einen Pool von max 6 Lichtern.
                const addLight = (y, hex, maxI) => {
                    if(isGhost) return;
                    GameState.nightLights.push({
                        light: null,          // wird vom LightPool in game.js befüllt
                        max: maxI,
                        parent: root,
                        offsetY: y,
                        color: hex,
                        // Weltposition wird in updateNightLights() live berechnet
                    });
                };
                
                // Add robust foundations to prevent floating buildings
                const addFoundation = (w, d, offX=0, offZ=0) => {
                    let f = BABYLON.MeshBuilder.CreateBox("found", {width: w, height: 4, depth: d}, scene);
                    f.position = new BABYLON.Vector3(offX, -1.9, offZ); // Drop it down 2 units
                    f.parent = root; f.material = mats.stone;
                };

                if(type === 'road' || type === 'path') {
                    // Kacheln leicht größer als 2x2 damit keine Lücken entstehen
                    let b = BABYLON.MeshBuilder.CreateGround("b", {width: 2.4, height: 2.4, subdivisions: 16, updatable: true}, scene);
                    b.position.y = 0; b.parent = root;
                    b.material = type === 'road' ? mats.road : mats.path;
                    b.isPickable = type === 'road';
                    b.receiveShadows = true;
                } else if(type === 'bridge' || type === 'port' || type === 'wharf') {
                    let p = BABYLON.MeshBuilder.CreateBox("p", {width: 2, height: 0.2, depth: 2}, scene); p.position.y = 0.1; p.parent = root; p.material = mats.wood;
                    if(type === 'bridge') {
                        let r1 = BABYLON.MeshBuilder.CreateBox("r1", {width: 2, height: 0.5, depth: 0.1}, scene); r1.position=new BABYLON.Vector3(0,0.4,0.9); r1.parent=root; r1.material=mats.wood;
                        let r2 = BABYLON.MeshBuilder.CreateBox("r2", {width: 2, height: 0.5, depth: 0.1}, scene); r2.position=new BABYLON.Vector3(0,0.4,-0.9); r2.parent=root; r2.material=mats.wood;
                    } else if(type === 'port') {
                        let hut = BABYLON.MeshBuilder.CreateBox("hut", {width:1, height:1, depth:1}, scene); hut.position=new BABYLON.Vector3(0.3, 0.7, 0); hut.parent=root; hut.material=mats.wood;
                    } else if(type === 'wharf') {
                        // Werft: längeres Dock mit Kran und Lagerhaus
                        let dock = BABYLON.MeshBuilder.CreateBox("dock", {width:3.0, height:0.3, depth:1.4}, scene); dock.position.y=0.15; dock.parent=root; dock.material=mats.wood;
                        // Lagerhaus
                        let wh = BABYLON.MeshBuilder.CreateBox("wh", {width:1.2, height:1.4, depth:1.0}, scene); wh.position=new BABYLON.Vector3(-0.7,0.85,0); wh.parent=root; wh.material=mats.wood;
                        let whr = BABYLON.MeshBuilder.CreateCylinder("whr", {diameterTop:0, diameterBottom:1.8, height:0.8, tessellation:4}, scene); whr.rotation.y=Math.PI/4; whr.position=new BABYLON.Vector3(-0.7,1.65,0); whr.parent=root; whr.material=mats.roof;
                        // Kran
                        const craneMat = new BABYLON.StandardMaterial("crm", scene); craneMat.diffuseColor=new BABYLON.Color3(0.4,0.3,0.2);
                        let cranePost=BABYLON.MeshBuilder.CreateCylinder("cp",{diameter:0.2,height:2.2},scene); cranePost.position=new BABYLON.Vector3(0.8,1.1,0); cranePost.parent=root; cranePost.material=craneMat;
                        let craneArm=BABYLON.MeshBuilder.CreateBox("ca",{width:1.4,height:0.15,depth:0.15},scene); craneArm.position=new BABYLON.Vector3(0.8,2.3,0); craneArm.parent=root; craneArm.material=craneMat;
                        let hook=BABYLON.MeshBuilder.CreateCylinder("hk",{diameter:0.12,height:0.4},scene); hook.position=new BABYLON.Vector3(1.4,2.0,0); hook.parent=root; hook.material=craneMat;
                        // Poller (Bollards)
                        [[1.2,-0.5],[1.2,0.5],[-0.4,-0.5],[-0.4,0.5]].forEach((pos,i)=>{
                            let b=BABYLON.MeshBuilder.CreateCylinder("bol"+i,{diameter:0.18,height:0.5},scene); b.position=new BABYLON.Vector3(pos[0],0.35,pos[1]); b.parent=root; b.material=mats.stone;
                        });
                        if(!isGhost) addLight(1.5, "#1d4ed8", 2.0);
                    }
                } else if(type === 'townhall') {
                    addFoundation(3.8, 3.8);
                    let b = BABYLON.MeshBuilder.CreateBox("b", {width: 4, height: 1.5, depth: 4}, scene); b.position.y = 0.75; b.parent = root; b.material = mats.stone;
                    let m = BABYLON.MeshBuilder.CreateBox("m", {width: 3, height: 1.5, depth: 3}, scene); m.position.y = 2.25; m.parent = root; m.material = mats.brick;
                    let r = BABYLON.MeshBuilder.CreateCylinder("r", {diameterTop: 0, diameterBottom: 4.5, height: 2.5, tessellation: 4}, scene); r.rotation.y = Math.PI/4; r.position.y = 4.25; r.parent = root; r.material = mats.wood;
                    let c = BABYLON.MeshBuilder.CreateIcoSphere("c", {radius: 0.6, subdivisions: 2}, scene); c.position.y = 6.5; c.parent = root; c.material = mats.neon;
                    if(!isGhost) { scene.onBeforeRenderObservable.add(() => c.rotation.y += 0.02); addLight(4, "#a855f7", 3.0); window.Game.spawnSmoke(root, new BABYLON.Vector3(0,5,0)); }
                } else if(type === 'house') {
                    addFoundation(2.4, 2.4);
                    let b = BABYLON.MeshBuilder.CreateBox("b", {width: 2.5, height: 2, depth: 2.5}, scene); b.position.y = 1; b.parent = root; b.material = mats.brick;
                    let r = BABYLON.MeshBuilder.CreateCylinder("r", {diameterTop: 0, diameterBottom: 3.5, height: 1.5, tessellation: 4}, scene); r.rotation.y = Math.PI/4; r.position.y = 2.75; r.parent = root; r.material = mats.roof;
                    if(!isGhost) { window.Game.spawnSmoke(root, new BABYLON.Vector3(0.5, 3.5, 0)); addLight(1.2, "#fde68a", 1.2); }
                } else if(type === 'lumbercamp' || type === 'hunter') {
                    addFoundation(1.9, 1.9);
                    let h = BABYLON.MeshBuilder.CreateBox("h", {width: 2, height: 1.8, depth: 2}, scene); h.position.y = 0.9; h.parent = root; h.material = mats.wood;
                    if(type === 'hunter') { let p = BABYLON.MeshBuilder.CreateCylinder("p", {diameterTop: 0, diameterBottom: 2.5, height: 1.2, tessellation: 4}, scene); p.rotation.y = Math.PI/4; p.position.y = 2.4; p.parent = root; p.material = mats.roof; }
                    if(!isGhost) addLight(1.5, type === 'hunter' ? "#ef4444" : "#8b4513", 1.0);
                } else if(type === 'forester') {
                    addFoundation(1.9, 1.9);
                    let b = BABYLON.MeshBuilder.CreateBox("b", {width: 2, height: 1.5, depth: 2}, scene); b.position.y = 0.75; b.parent = root; b.material = mats.wood;
                    let r = BABYLON.MeshBuilder.CreateCylinder("r", {diameterTop: 0, diameterBottom: 2.8, height: 1.2, tessellation: 4}, scene); r.rotation.y = Math.PI/4; r.position.y = 2.1; r.parent = root; r.material = mats.bush;
                    if(!isGhost) addLight(1.5, "#22c55e", 1.2);
                } else if(type === 'quarry') {
                    addFoundation(2.8, 2.8);
                    let b = BABYLON.MeshBuilder.CreateBox("b", {width: 3, height: 0.4, depth: 3}, scene); b.position.y = 0.2; b.parent = root; b.material = mats.stone;
                    let p = BABYLON.MeshBuilder.CreateBox("p", {width: 0.2, height: 2.5, depth: 0.2}, scene); p.position=new BABYLON.Vector3(1,1.45,1); p.parent=root; p.material=mats.wood;
                    if(!isGhost) addLight(1.5, "#94a3b8", 1.0);
                } else if(type === 'claypit') {
                    let b = BABYLON.MeshBuilder.CreateBox("b", {width: 2.8, height: 0.2, depth: 2.8}, scene); b.position.y = 0.1; b.parent = root; b.material = mats.dirt;
                    let f1 = BABYLON.MeshBuilder.CreateBox("f1", {width: 3, height: 0.4, depth: 0.1}, scene); f1.position=new BABYLON.Vector3(0,0.2,1.4); f1.parent=root; f1.material=mats.wood;
                    let f2 = BABYLON.MeshBuilder.CreateBox("f2", {width: 3, height: 0.4, depth: 0.1}, scene); f2.position=new BABYLON.Vector3(0,0.2,-1.4); f2.parent=root; f2.material=mats.wood;
                    if(!isGhost) addLight(1.0, "#b45309", 0.8);
                } else if(type === 'gatherer') {
                    addFoundation(2.1, 2.1);
                    let b = BABYLON.MeshBuilder.CreateCylinder("b", {diameter: 2.2, height: 1.2}, scene); b.position.y = 0.6; b.parent = root; b.material = mats.wood;
                    let r = BABYLON.MeshBuilder.CreateCylinder("r", {diameterTop: 0, diameterBottom: 2.8, height: 1.5, tessellation: 6}, scene); r.position.y = 1.95; r.parent = root; r.material = mats.bush;
                    if(!isGhost) addLight(1.5, "#86efac", 1.2);
                } else if(type === 'farm') {
                    addFoundation(1.9, 1.4, 0, 1);
                    let b = BABYLON.MeshBuilder.CreateBox("b", {width: 2, height: 1.5, depth: 1.5}, scene); b.position=new BABYLON.Vector3(0,0.75,1); b.parent=root; b.material=mats.wood;
                    let f = BABYLON.MeshBuilder.CreateGround("f", {width: 3, height: 2}, scene); f.position=new BABYLON.Vector3(0,0.05,-0.5); f.parent=root; f.material = mats.wheat;
                    if(!isGhost) addLight(1.5, "#facc15", 1.0);
                } else if(type === 'sawmill') {
                    addFoundation(2.8, 1.9);
                    let b = BABYLON.MeshBuilder.CreateBox("b", {width: 3, height: 1.2, depth: 2}, scene); b.position.y = 0.6; b.parent = root; b.material = mats.wood;
                    let s1 = BABYLON.MeshBuilder.CreateCylinder("s1", {diameter: 1.5, height: 0.1, tessellation: 12}, scene); s1.rotation.z = Math.PI/2; s1.position=new BABYLON.Vector3(0, 1.4, 0); s1.parent=root; s1.material=mats.stone;
                    if(!isGhost) scene.onBeforeRenderObservable.add(() => s1.rotation.x += 0.1);
                } else if(type === 'brickyard') {
                    addFoundation(2.4, 2.4);
                    let b = BABYLON.MeshBuilder.CreateBox("b", {width: 2.5, height: 1.5, depth: 2.5}, scene); b.position.y = 0.75; b.parent = root; b.material = mats.brick;
                    let c = BABYLON.MeshBuilder.CreateCylinder("c", {diameter: 0.8, height: 2}, scene); c.position=new BABYLON.Vector3(0.5, 2, 0.5); c.parent=root; c.material=mats.brick;
                    if(!isGhost) { addLight(2, "#ef4444", 2.0); window.Game.spawnSmoke(root, new BABYLON.Vector3(0.5,3.5,0.5)); }
                } else if(type === 'mill') {
                    addFoundation(2.4, 2.4);
                    let b = BABYLON.MeshBuilder.CreateCylinder("b", {diameterBottom: 2.5, diameterTop: 2.0, height: 3, tessellation: 8}, scene); b.position.y = 1.5; b.parent = root; b.material = mats.wood;
                    let r = BABYLON.MeshBuilder.CreateCylinder("r", {diameterTop: 0, diameterBottom: 2.8, height: 1.5, tessellation: 8}, scene); r.position.y = 3.75; r.parent = root; r.material = mats.roof;
                    let sailRoot = new BABYLON.TransformNode("sail", scene); sailRoot.position=new BABYLON.Vector3(0, 2, 1.3); sailRoot.parent=root;
                    let s1 = BABYLON.MeshBuilder.CreateBox("s1", {width:0.2, height:4, depth:0.1}, scene); s1.parent=sailRoot; s1.material=mats.wood;
                    let s2 = BABYLON.MeshBuilder.CreateBox("s2", {width:4, height:0.2, depth:0.1}, scene); s2.parent=sailRoot; s2.material=mats.wood;
                    if(!isGhost) scene.onBeforeRenderObservable.add(() => sailRoot.rotation.z += 0.02);
                } else if(type === 'smelter' || type === 'bakery') {
                    addFoundation(2.4, 2.4);
                    let b = BABYLON.MeshBuilder.CreateCylinder("b", {diameterBottom: 2.5, diameterTop: 1.5, height: 3, tessellation: 8}, scene); b.position.y = 1.5; b.parent = root; b.material = type === 'bakery' ? mats.brick : mats.stone;
                    if(!isGhost) { addLight(2, type === 'bakery' ? "#facc15" : "#ef4444", 2.0); window.Game.spawnSmoke(root, new BABYLON.Vector3(0,3.5,0)); }
                } else if(type === 'toolmaker' || type === 'weaponsmith') {
                    addFoundation(2.4, 2.4);
                    let b = BABYLON.MeshBuilder.CreateBox("b", {width: 2.5, height: 1.5, depth: 2.5}, scene); b.position.y = 0.75; b.parent = root; b.material = mats.brick;
                    let a = BABYLON.MeshBuilder.CreateBox("a", {width: 1, height: 0.5, depth: 1}, scene); a.position=new BABYLON.Vector3(0, 1.75, 0); a.parent = root; a.material = mats.iron;
                    if(!isGhost) { addLight(2, type==='toolmaker'?"#4ade80":"#fca5a5", 2.0); window.Game.spawnSmoke(root, new BABYLON.Vector3(0,2.5,0)); }
                } else if(type === 'market') {
                    addFoundation(2.8, 2.8);
                    let b = BABYLON.MeshBuilder.CreateBox("b", {width: 3, height: 0.5, depth: 3}, scene); b.position.y = 0.25; b.parent = root; b.material = mats.stone;
                    let t = BABYLON.MeshBuilder.CreateCylinder("t", {diameterTop: 0.1, diameterBottom: 2.8, height: 2, tessellation: 4}, scene); t.rotation.y = Math.PI/4; t.position.y = 1.5; t.parent = root; t.material = mats.tent;
                } else if(type === 'tavern') {
                    addFoundation(2.8, 1.9);
                    let b = BABYLON.MeshBuilder.CreateBox("b", {width: 3, height: 1.5, depth: 2}, scene); b.position.y = 0.75; b.parent = root; b.material = mats.wood;
                    let r = BABYLON.MeshBuilder.CreateCylinder("r", {diameterTop: 0, diameterBottom: 3.5, height: 1.5, tessellation: 4}, scene); r.rotation.y = Math.PI/4; r.position.y = 2.25; r.parent = root; r.material = mats.roof;
                    let sign = BABYLON.MeshBuilder.CreateBox("s", {width:0.8, height:0.8, depth:0.1}, scene); sign.position = new BABYLON.Vector3(0, 1.5, 1.1); sign.parent = root; sign.material = mats.gold;
                    if(!isGhost) { addLight(1.5, "#facc15", 2.0); }
                } else if(type === 'storage') {
                    addFoundation(2.8, 2.8);
                    let b = BABYLON.MeshBuilder.CreateBox("b", {width: 3, height: 2, depth: 3}, scene); b.position.y = 1; b.parent = root; b.material = mats.wood;
                    let r = BABYLON.MeshBuilder.CreateCylinder("r", {diameterTop:0, diameterBottom: 4.5, height: 2, tessellation: 4}, scene); r.rotation.y = Math.PI/4; r.position.y = 3; r.parent = root; r.material = mats.roof;
                } else if(type === 'barracks') {
                    addFoundation(2.8, 2.8);
                    let b = BABYLON.MeshBuilder.CreateBox("b", {width: 3, height: 1.5, depth: 3}, scene); b.position.y = 0.75; b.parent = root; b.material = mats.stone;
                    let r = BABYLON.MeshBuilder.CreateCylinder("r", {diameterTop:0, diameterBottom: 4, height: 1.5, tessellation: 4}, scene); r.rotation.y = Math.PI/4; r.position.y = 2.25; r.parent = root; r.material = mats.tent;
                    if(!isGhost) addLight(2, "#ef4444", 2.0);
                } else if(type === 'archery') {
                    addFoundation(2.8, 2.8);
                    let b = BABYLON.MeshBuilder.CreateBox("b", {width: 2.5, height: 1.2, depth: 2.5}, scene); b.position.y = 0.6; b.parent = root; b.material = mats.wood;
                    let r = BABYLON.MeshBuilder.CreateCylinder("r", {diameterTop:0, diameterBottom:3.5, height:1.2, tessellation:4}, scene); r.rotation.y = Math.PI/4; r.position.y = 1.8; r.parent = root; r.material = mats.roof;
                    // Zielscheibe vorne
                    let t = BABYLON.MeshBuilder.CreateCylinder("t", {diameter:1.0, height:0.1, tessellation:16}, scene); t.position = new BABYLON.Vector3(0, 0.5, 1.6); t.rotation.x = Math.PI/2; t.parent = root; t.material = mats.dirt;
                    if(!isGhost) addLight(1.8, "#b45309", 1.5);
                } else if(type === 'wall') {
                    addFoundation(1.9, 1.9);
                    let b = BABYLON.MeshBuilder.CreateBox("b", {width: 2, height: 2, depth: 2}, scene); b.position.y = 1; b.parent = root; b.material = mats.stone;
                    for(let i=-0.6; i<=0.6; i+=1.2) {
                        for(let j=-0.6; j<=0.6; j+=1.2) {
                            let z = BABYLON.MeshBuilder.CreateBox("z", {width:0.6, height:0.5, depth:0.6}, scene);
                            z.position = new BABYLON.Vector3(i, 2.25, j); z.parent = root; z.material = mats.stone;
                        }
                    }
                } else if(type === 'tower') {
                    addFoundation(1.9, 1.9);
                    let b = BABYLON.MeshBuilder.CreateCylinder("b", {diameterTop: 1.5, diameterBottom: 2, height: 4, tessellation: 8}, scene); b.position.y = 2; b.parent = root; b.material = mats.stone;
                    let t = BABYLON.MeshBuilder.CreateCylinder("t", {diameter: 1.8, height: 1}, scene); t.position.y = 4.5; t.parent = root; t.material = mats.wood;
                    if(!isGhost) addLight(5, "#22d3ee", 4.0); 
                } else if(type === 'monument') {
                    addFoundation(2.8, 2.8);
                    let b = BABYLON.MeshBuilder.CreateBox("b", {width: 3, height: 1, depth: 3}, scene); b.position.y = 0.5; b.parent = root; b.material = mats.stone;
                    let p = BABYLON.MeshBuilder.CreateBox("p", {width: 1.5, height: 3, depth: 1.5}, scene); p.position.y = 2.5; p.parent = root; p.material = mats.stone;
                    let s = BABYLON.MeshBuilder.CreateIcoSphere("s", {radius: 1.2, subdivisions: 2}, scene); s.position.y = 4.5; s.parent = root; s.material = mats.gold;
                    if(!isGhost) { scene.onBeforeRenderObservable.add(() => s.rotation.y -= 0.01); addLight(4.5, "#a855f7", 4.0); }
                } else if(type === 'orchard') {
                    // Obstgarten: flacher Boden + 3 runde Baumkronen
                    addFoundation(2.8, 2.8);
                    let g = BABYLON.MeshBuilder.CreateGround("g", {width: 3, height: 3}, scene);
                    g.position.y = 0.05; g.parent = root; g.material = mats.dirt;
                    let positions = [[-0.8, 0], [0.8, 0], [0, 0.8]];
                    positions.forEach((p, i) => {
                        let trunk = BABYLON.MeshBuilder.CreateCylinder("tr"+i, {diameter: 0.25, height: 1.2}, scene);
                        trunk.position = new BABYLON.Vector3(p[0], 0.6, p[1]); trunk.parent = root; trunk.material = mats.wood;
                        let crown = BABYLON.MeshBuilder.CreateIcoSphere("cr"+i, {radius: 0.7, subdivisions: 2}, scene);
                        crown.position = new BABYLON.Vector3(p[0], 1.65, p[1]); crown.parent = root; crown.material = mats.bush;
                    });
                    if(!isGhost) addLight(1.5, "#f97316", 1.5);

                } else if(type === 'vegetable') {
                    // Gemüsegarten: Hütte + Beete mit kleinen Pflanzreihen
                    addFoundation(1.4, 1.4, -0.8, 0.8);
                    let hut = BABYLON.MeshBuilder.CreateBox("h", {width: 1.5, height: 1.2, depth: 1.5}, scene);
                    hut.position = new BABYLON.Vector3(-0.8, 0.6, 0.8); hut.parent = root; hut.material = mats.wood;
                    let roof = BABYLON.MeshBuilder.CreateCylinder("r", {diameterTop:0, diameterBottom:2.2, height:1, tessellation:4}, scene);
                    roof.rotation.y = Math.PI/4; roof.position = new BABYLON.Vector3(-0.8, 1.7, 0.8); roof.parent = root; roof.material = mats.roof;
                    // Beete
                    [-0.8, 0.2].forEach((xo, i) => {
                        let bed = BABYLON.MeshBuilder.CreateBox("bed"+i, {width: 0.8, height: 0.1, depth: 2.5}, scene);
                        bed.position = new BABYLON.Vector3(xo + 1.1, 0.1, -0.3); bed.parent = root; bed.material = mats.dirt;
                        let plant = BABYLON.MeshBuilder.CreateCylinder("pl"+i, {diameterTop:0, diameterBottom:0.7, height:0.5, tessellation:5}, scene);
                        plant.position = new BABYLON.Vector3(xo + 1.1, 0.35, -0.3); plant.parent = root; plant.material = mats.bush;
                    });

                } else if(type === 'cowpasture') {
                    // Kuhherde: Scheune + Zaun + kleine Kuh-Silhouette
                    addFoundation(2.4, 1.9, 0, 0.5);
                    let barn = BABYLON.MeshBuilder.CreateBox("b", {width: 2.5, height: 2, depth: 2}, scene);
                    barn.position = new BABYLON.Vector3(0, 1, 0.6); barn.parent = root; barn.material = mats.wood;
                    let roof = BABYLON.MeshBuilder.CreateCylinder("r", {diameterTop:0, diameterBottom:3.5, height:1.5, tessellation:4}, scene);
                    roof.rotation.y = Math.PI/4; roof.position = new BABYLON.Vector3(0, 2.75, 0.6); roof.parent = root; roof.material = mats.roof;
                    // Zaun-Pfosten
                    [-1.2, 0, 1.2].forEach((xo, i) => {
                        let post = BABYLON.MeshBuilder.CreateBox("p"+i, {width:0.15, height:0.8, depth:0.15}, scene);
                        post.position = new BABYLON.Vector3(xo, 0.4, -1.2); post.parent = root; post.material = mats.wood;
                    });
                    let fence = BABYLON.MeshBuilder.CreateBox("f", {width:2.5, height:0.1, depth:0.1}, scene);
                    fence.position = new BABYLON.Vector3(0, 0.6, -1.2); fence.parent = root; fence.material = mats.wood;
                    // Kuh-Körper (einfache Box-Silhouette)
                    let cow = BABYLON.MeshBuilder.CreateBox("cow", {width:0.8, height:0.5, depth:0.4}, scene);
                    cow.position = new BABYLON.Vector3(0, 0.35, -0.5); cow.parent = root; cow.material = mats.dirt;
                    let cowHead = BABYLON.MeshBuilder.CreateBox("cowh", {size:0.3}, scene);
                    cowHead.position = new BABYLON.Vector3(0.55, 0.55, -0.5); cowHead.parent = root; cowHead.material = mats.dirt;
                    if(!isGhost) addLight(2, "#fde68a", 1.5);

                } else if(type === 'sheeppasture') {
                    // Schafherde: kleiner Stall + flauschige Schaf-Kugeln
                    addFoundation(1.9, 1.4, 0.4, 0.6);
                    let stall = BABYLON.MeshBuilder.CreateBox("s", {width: 2, height: 1.5, depth: 1.5}, scene);
                    stall.position = new BABYLON.Vector3(0.4, 0.75, 0.6); stall.parent = root; stall.material = mats.wood;
                    let roof = BABYLON.MeshBuilder.CreateCylinder("r", {diameterTop:0, diameterBottom:3, height:1.2, tessellation:4}, scene);
                    roof.rotation.y = Math.PI/4; roof.position = new BABYLON.Vector3(0.4, 2.1, 0.6); roof.parent = root; roof.material = mats.stone;
                    // Schafe (weiße Kugeln mit Köpfen)
                    [[-1, -0.6], [-0.6, -1.1]].forEach((pos, i) => {
                        let body = BABYLON.MeshBuilder.CreateIcoSphere("sb"+i, {radius: 0.4, subdivisions: 2}, scene);
                        body.position = new BABYLON.Vector3(pos[0], 0.4, pos[1]); body.parent = root;
                        let woolMat = new BABYLON.StandardMaterial("wool"+i, scene); woolMat.diffuseColor = new BABYLON.Color3(0.9, 0.9, 0.85); body.material = woolMat;
                        let head = BABYLON.MeshBuilder.CreateBox("sh"+i, {size: 0.25}, scene);
                        head.position = new BABYLON.Vector3(pos[0]+0.35, 0.55, pos[1]); head.parent = root; head.material = mats.dirt;
                    });

                } else if(type === 'pigpen') {
                    // Schweinestall: Holzhütte + Schlamm-Gehege + Schwein
                    addFoundation(1.9, 1.9, -0.2, 0.3);
                    let hut = BABYLON.MeshBuilder.CreateBox("h", {width: 2, height: 1.5, depth: 2}, scene);
                    hut.position = new BABYLON.Vector3(-0.2, 0.75, 0.3); hut.parent = root; hut.material = mats.wood;
                    let roof = BABYLON.MeshBuilder.CreateCylinder("r", {diameterTop:0, diameterBottom:3, height:1.2, tessellation:4}, scene);
                    roof.rotation.y = Math.PI/4; roof.position = new BABYLON.Vector3(-0.2, 2.1, 0.3); roof.parent = root; roof.material = mats.roof;
                    // Schlamm-Fläche
                    let mud = BABYLON.MeshBuilder.CreateGround("mud", {width:2, height:1.5}, scene);
                    mud.position = new BABYLON.Vector3(0.9, 0.06, -0.4); mud.parent = root;
                    let mudMat = new BABYLON.StandardMaterial("mudm", scene); mudMat.diffuseColor = new BABYLON.Color3(0.35, 0.22, 0.12); mud.material = mudMat;
                    // Schwein
                    let pig = BABYLON.MeshBuilder.CreateBox("pig", {width:0.7, height:0.4, depth:0.5}, scene);
                    pig.position = new BABYLON.Vector3(0.9, 0.3, -0.4); pig.parent = root;
                    let pigMat = new BABYLON.StandardMaterial("pigm", scene); pigMat.diffuseColor = new BABYLON.Color3(1.0, 0.7, 0.7); pig.material = pigMat;
                    let pigSnout = BABYLON.MeshBuilder.CreateCylinder("ps", {diameter:0.2, height:0.1, tessellation:8}, scene);
                    pigSnout.rotation.x = Math.PI/2; pigSnout.position = new BABYLON.Vector3(0.9, 0.38, -0.71); pigSnout.parent = root; pigSnout.material = pigMat;

                } else if(type === 'kitchen') {
                    // Küche: Backsteingebäude mit Schornstein und Feuer-Licht
                    addFoundation(2.4, 2.4);
                    let b = BABYLON.MeshBuilder.CreateBox("b", {width: 2.5, height: 1.8, depth: 2.5}, scene);
                    b.position.y = 0.9; b.parent = root; b.material = mats.brick;
                    let r = BABYLON.MeshBuilder.CreateCylinder("r", {diameterTop:0, diameterBottom:3.5, height:1.5, tessellation:4}, scene);
                    r.rotation.y = Math.PI/4; r.position.y = 2.65; r.parent = root; r.material = mats.roof;
                    // Schornstein
                    let chimney = BABYLON.MeshBuilder.CreateCylinder("ch", {diameter:0.5, height:1.5}, scene);
                    chimney.position = new BABYLON.Vector3(0.6, 3.4, 0.6); chimney.parent = root; chimney.material = mats.brick;
                    if(!isGhost) { addLight(1.5, "#fb923c", 2.5); window.Game.spawnSmoke(root, new BABYLON.Vector3(0.6, 4.5, 0.6)); }

                } else if(type === 'cheesery') {
                    // Käserei: runder Turm-Stil mit gelbem Licht
                    addFoundation(2.4, 2.4);
                    let b = BABYLON.MeshBuilder.CreateCylinder("b", {diameterBottom:2.8, diameterTop:2.5, height:2.5, tessellation:8}, scene);
                    b.position.y = 1.25; b.parent = root; b.material = mats.stone;
                    let r = BABYLON.MeshBuilder.CreateCylinder("r", {diameterTop:0, diameterBottom:3.2, height:1.5, tessellation:8}, scene);
                    r.position.y = 3.25; r.parent = root; r.material = mats.roof;
                    // Käse-Symbol oben (gelbe Scheibe)
                    let cheese = BABYLON.MeshBuilder.CreateCylinder("cs", {diameter:1.0, height:0.3, tessellation:6}, scene);
                    cheese.position.y = 2.65; cheese.parent = root;
                    let cheeseMat = new BABYLON.StandardMaterial("chm", scene); cheeseMat.diffuseColor = new BABYLON.Color3(1.0, 0.9, 0.2); cheeseMat.emissiveColor = new BABYLON.Color3(0.3, 0.25, 0); cheese.material = cheeseMat;
                    if(!isGhost) addLight(2.5, "#fef08a", 2.0);

                } else if(type === 'chapel') {
                    // Kapelle: kleines weißes Gebäude mit Kreuz
                    addFoundation(1.8, 1.8);
                    let b = BABYLON.MeshBuilder.CreateBox("b", {width:1.8, height:2.2, depth:1.8}, scene); b.position.y=1.1; b.parent=root; b.material=mats.stone;
                    let r = BABYLON.MeshBuilder.CreateCylinder("r", {diameterTop:0, diameterBottom:2.6, height:1.2, tessellation:4}, scene); r.rotation.y=Math.PI/4; r.position.y=2.8; r.parent=root; r.material=mats.roof;
                    let cv = BABYLON.MeshBuilder.CreateBox("cv", {width:0.12, height:1.0, depth:0.12}, scene); cv.position.y=4.1; cv.parent=root; let crossMat=new BABYLON.StandardMaterial("cm",scene); crossMat.diffuseColor=new BABYLON.Color3(1,1,1); crossMat.emissiveColor=new BABYLON.Color3(0.6,0.6,0.6); cv.material=crossMat;
                    let ch = BABYLON.MeshBuilder.CreateBox("ch", {width:0.6, height:0.12, depth:0.12}, scene); ch.position.y=4.35; ch.parent=root; ch.material=crossMat;
                    if(!isGhost) addLight(1.5, "#f9a8d4", 2.0);

                } else if(type === 'temple') {
                    // Tempel: klassisch mit Säulen
                    addFoundation(3.0, 3.0);
                    let b = BABYLON.MeshBuilder.CreateBox("b", {width:3.0, height:2.5, depth:3.0}, scene); b.position.y=1.25; b.parent=root; b.material=mats.stone;
                    let roof = BABYLON.MeshBuilder.CreateCylinder("rf", {diameterTop:0, diameterBottom:4.0, height:1.5, tessellation:4}, scene); roof.rotation.y=Math.PI/4; roof.position.y=3.25; roof.parent=root; roof.material=mats.stone;
                    [[-1.2,-1.2],[1.2,-1.2],[-1.2,1.2],[1.2,1.2]].forEach((p,i)=>{
                        let col=BABYLON.MeshBuilder.CreateCylinder("col"+i,{diameter:0.35,height:2.8},scene); col.position=new BABYLON.Vector3(p[0],1.4,p[1]); col.parent=root; col.material=mats.stone;
                    });
                    let orb=BABYLON.MeshBuilder.CreateIcoSphere("orb",{radius:0.5,subdivisions:2},scene); orb.position.y=4.8; orb.parent=root; let orbMat=new BABYLON.StandardMaterial("om",scene); orbMat.diffuseColor=new BABYLON.Color3(0.9,0.8,1); orbMat.emissiveColor=new BABYLON.Color3(0.3,0.1,0.5); orb.material=orbMat;
                    if(!isGhost) { addLight(2.5, "#e9d5ff", 3.0); scene.onBeforeRenderObservable.add(()=>orb.rotation.y+=0.02); }

                } else if(type === 'healhouse') {
                    // Heilstätte: grünes Kreuz-Symbol, weißes Gebäude
                    addFoundation(2.4, 2.4);
                    let b = BABYLON.MeshBuilder.CreateBox("b", {width:2.5, height:2.2, depth:2.5}, scene); b.position.y=1.1; b.parent=root; b.material=mats.stone;
                    let r = BABYLON.MeshBuilder.CreateBox("r", {width:3.2, height:0.6, depth:3.2}, scene); r.position.y=2.5; r.parent=root; r.material=mats.stone;
                    let gv=BABYLON.MeshBuilder.CreateBox("gv",{width:0.3,height:1.2,depth:0.3},scene); gv.position.y=3.3; gv.parent=root; let gMat=new BABYLON.StandardMaterial("gm",scene); gMat.diffuseColor=new BABYLON.Color3(0.1,0.9,0.3); gMat.emissiveColor=new BABYLON.Color3(0,0.4,0.1); gv.material=gMat;
                    let gh=BABYLON.MeshBuilder.CreateBox("gh",{width:0.9,height:0.3,depth:0.3},scene); gh.position.y=3.55; gh.parent=root; gh.material=gMat;
                    if(!isGhost) addLight(1.8, "#86efac", 2.5);

                } else if(type === 'marketplace') {
                    // Marktplatz: offene Halle mit 4 Stützen und Dach
                    addFoundation(3.0, 3.0);
                    let g=BABYLON.MeshBuilder.CreateGround("g",{width:3.2,height:3.2},scene); g.position.y=0.05; g.parent=root; let gMat=new BABYLON.StandardMaterial("gm",scene); gMat.diffuseColor=new BABYLON.Color3(0.85,0.7,0.4); g.material=gMat;
                    [[-1.2,-1.2],[1.2,-1.2],[-1.2,1.2],[1.2,1.2]].forEach((p,i)=>{
                        let post=BABYLON.MeshBuilder.CreateCylinder("p"+i,{diameter:0.3,height:3.0},scene); post.position=new BABYLON.Vector3(p[0],1.5,p[1]); post.parent=root; post.material=mats.wood;
                    });
                    let roof=BABYLON.MeshBuilder.CreateCylinder("rf",{diameterTop:0,diameterBottom:3.8,height:1.4,tessellation:4},scene); roof.rotation.y=Math.PI/4; roof.position.y=3.7; roof.parent=root; roof.material=mats.roof;
                    let bell=BABYLON.MeshBuilder.CreateCylinder("bl",{diameter:0.4,height:0.5},scene); bell.position.y=0.5; bell.parent=root; let bellMat=new BABYLON.StandardMaterial("bm",scene); bellMat.diffuseColor=new BABYLON.Color3(1,0.85,0); bellMat.emissiveColor=new BABYLON.Color3(0.4,0.3,0); bell.material=bellMat;
                    if(!isGhost) addLight(1.5, "#fde68a", 2.5);

                } else if(type === 'park') {
                    // Park: Grünfläche mit Bäumchen und Bank
                    let g=BABYLON.MeshBuilder.CreateGround("g",{width:3.0,height:3.0},scene); g.position.y=0.05; g.parent=root; let gMat=new BABYLON.StandardMaterial("gm",scene); gMat.diffuseColor=new BABYLON.Color3(0.2,0.65,0.15); g.material=gMat;
                    [[-0.7,-0.6],[0.7,0.5]].forEach((p,i)=>{
                        let t=BABYLON.MeshBuilder.CreateCylinder("t"+i,{diameter:0.2,height:1.4},scene); t.position=new BABYLON.Vector3(p[0],0.7,p[1]); t.parent=root; t.material=mats.wood;
                        let c=BABYLON.MeshBuilder.CreateIcoSphere("c"+i,{radius:0.55,subdivisions:2},scene); c.position=new BABYLON.Vector3(p[0],1.8,p[1]); c.parent=root; c.material=mats.bush;
                    });
                    let bk=BABYLON.MeshBuilder.CreateBox("bk",{width:1.0,height:0.15,depth:0.3},scene); bk.position=new BABYLON.Vector3(0,0.15,0.2); bk.parent=root; bk.material=mats.wood;
                    let bkb=BABYLON.MeshBuilder.CreateBox("bkb",{width:1.0,height:0.5,depth:0.1},scene); bkb.position=new BABYLON.Vector3(0,0.4,0.35); bkb.parent=root; bkb.material=mats.wood;
                    if(!isGhost) addLight(0.8, "#4ade80", 1.5);

                } else if(type === 'school') {
                    // Schule: Gebäude mit Fensterreihe und Glockenturm
                    addFoundation(2.8, 2.8);
                    let b=BABYLON.MeshBuilder.CreateBox("b",{width:3.0,height:2.5,depth:2.5},scene); b.position.y=1.25; b.parent=root; b.material=mats.stone;
                    let r=BABYLON.MeshBuilder.CreateCylinder("r",{diameterTop:0,diameterBottom:3.8,height:1.2,tessellation:4},scene); r.rotation.y=Math.PI/4; r.position.y=3.1; r.parent=root; r.material=mats.roof;
                    let tower=BABYLON.MeshBuilder.CreateBox("tw",{width:0.9,height:3.5,depth:0.9},scene); tower.position=new BABYLON.Vector3(-1.2,1.75,0); tower.parent=root; tower.material=mats.stone;
                    let tr=BABYLON.MeshBuilder.CreateCylinder("tr",{diameterTop:0,diameterBottom:1.4,height:0.9,tessellation:4},scene); tr.rotation.y=Math.PI/4; tr.position=new BABYLON.Vector3(-1.2,3.95,0); tr.parent=root; tr.material=mats.roof;
                    let bellMat=new BABYLON.StandardMaterial("bm",scene); bellMat.diffuseColor=new BABYLON.Color3(1,0.9,0.2); bellMat.emissiveColor=new BABYLON.Color3(0.3,0.25,0);
                    let bell=BABYLON.MeshBuilder.CreateCylinder("bl",{diameter:0.35,height:0.35},scene); bell.position=new BABYLON.Vector3(-1.2,3.65,0); bell.parent=root; bell.material=bellMat;
                    if(!isGhost) addLight(2.0, "#93c5fd", 2.0);

                } else if(type === 'theater') {
                    // Theater: halbrundes Gebäude mit Bühne
                    addFoundation(3.0, 3.0);
                    let base=BABYLON.MeshBuilder.CreateCylinder("ba",{diameterBottom:3.5,diameterTop:3.5,height:2.5,tessellation:12},scene); base.position.y=1.25; base.parent=root; base.material=mats.stone;
                    let roof=BABYLON.MeshBuilder.CreateCylinder("r",{diameterTop:0,diameterBottom:4.0,height:2.0,tessellation:12},scene); roof.position.y=3.5; roof.parent=root; roof.material=mats.roof;
                    let stage=BABYLON.MeshBuilder.CreateBox("st",{width:2.0,height:0.3,depth:1.0},scene); stage.position=new BABYLON.Vector3(0,0.15,1.3); stage.parent=root; let stageMat=new BABYLON.StandardMaterial("sm",scene); stageMat.diffuseColor=new BABYLON.Color3(0.5,0.2,0.6); stageMat.emissiveColor=new BABYLON.Color3(0.2,0,0.3); stage.material=stageMat;
                    let starbMat=new BABYLON.StandardMaterial("strm",scene); starbMat.diffuseColor=new BABYLON.Color3(1,0.9,0.1); starbMat.emissiveColor=new BABYLON.Color3(0.5,0.4,0);
                    let star=BABYLON.MeshBuilder.CreateIcoSphere("str",{radius:0.3,subdivisions:1},scene); star.position.y=5.2; star.parent=root; star.material=starbMat;
                    if(!isGhost) { addLight(2.5, "#f0abfc", 3.5); scene.onBeforeRenderObservable.add(()=>star.rotation.y+=0.03); }

                } else if(type === 'townhall2') {
                    // Rathaus: imposantes Gebäude mit Turm und Fahne
                    addFoundation(3.0, 3.0);
                    let b=BABYLON.MeshBuilder.CreateBox("b",{width:3.2,height:3.0,depth:3.0},scene); b.position.y=1.5; b.parent=root; b.material=mats.stone;
                    let r=BABYLON.MeshBuilder.CreateCylinder("r",{diameterTop:0,diameterBottom:4.2,height:1.5,tessellation:4},scene); r.rotation.y=Math.PI/4; r.position.y=3.75; r.parent=root; r.material=mats.roof;
                    let tower=BABYLON.MeshBuilder.CreateBox("tw",{width:1.2,height:4.5,depth:1.2},scene); tower.position=new BABYLON.Vector3(0,2.25,0); tower.parent=root; tower.material=mats.brick;
                    let tcap=BABYLON.MeshBuilder.CreateCylinder("tc",{diameterTop:0,diameterBottom:1.8,height:1.2,tessellation:4},scene); tcap.rotation.y=Math.PI/4; tcap.position.y=5.1; tcap.parent=root; tcap.material=mats.roof;
                    let flagMat=new BABYLON.StandardMaterial("fm",scene); flagMat.diffuseColor=new BABYLON.Color3(0.95,0.75,0.1); flagMat.emissiveColor=new BABYLON.Color3(0.4,0.3,0);
                    let flag=BABYLON.MeshBuilder.CreateBox("fl",{width:0.7,height:0.45,depth:0.05},scene); flag.position=new BABYLON.Vector3(0.5,5.8,0); flag.parent=root; flag.material=flagMat;
                    if(!isGhost) { addLight(3.0, "#fbbf24", 3.5); scene.onBeforeRenderObservable.add(()=>{flag.rotation.y=Math.sin(Date.now()*0.002)*0.3;}); }
                }
            }
        };