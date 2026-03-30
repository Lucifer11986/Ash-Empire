// entities.js — Enemy, Animal, Citizen classes
        class Enemy {
            constructor(mesh) { 
                this.mesh = mesh; this.health = 40; this.speed = 0.05; 
                this.walkAnim = 0; this.type = 'bandit'; this.damage = 1;
                this.steals = false; this.stealTimer = 0;
            }

            update() {
                if(!GameState.centerTile) return;

                // Separation: Feinde halten Abstand zueinander
                if(window.Game.tickCounter % 10 === 0) {
                    GameState.enemies.forEach(other => {
                        if(other === this || !other.mesh) return;
                        const dx = this.mesh.position.x - other.mesh.position.x;
                        const dz = this.mesh.position.z - other.mesh.position.z;
                        const d = Math.hypot(dx, dz);
                        if(d < 2.5 && d > 0) {
                            this.mesh.position.x += (dx/d) * 0.3;
                            this.mesh.position.z += (dz/d) * 0.3;
                        }
                    });
                }

                if(this.type === 'ork') { this.orkBehavior(); return; }
                if(this.steals)        { this.nomadBehavior(); return; }
                this.banditBehavior();
            }

            banditBehavior() {
                // Schwarm: jeder nähert sich aus leicht anderem Winkel
                if(!this.approachAngle) this.approachAngle = Math.random() * Math.PI * 2;
                const cx = GameState.centerTile.x, cz = GameState.centerTile.z;
                const distToCenter = Math.hypot(cx - this.mesh.position.x, cz - this.mesh.position.z);
                let tx = distToCenter < 10 ? cx : cx + Math.cos(this.approachAngle) * 2;
                let tz = distToCenter < 10 ? cz : cz + Math.sin(this.approachAngle) * 2;
                this.moveToward(tx, tz);
            }

            orkBehavior() {
                // Mauerbrecher: sucht und zerstört Mauern koordiniert
                const walls = GameState.buildings.filter(b => b.type === 'wall' && !b.isConstructing);
                if(walls.length > 0) {
                    if(!this.siegeTarget || !GameState.buildings.includes(this.siegeTarget) || window.Game.tickCounter % 180 === 0) {
                        this.siegeTarget = walls.reduce((a, b) =>
                            Math.hypot(b.x - this.mesh.position.x, b.z - this.mesh.position.z) <
                            Math.hypot(a.x - this.mesh.position.x, a.z - this.mesh.position.z) ? b : a);
                    }
                    if(this.siegeTarget && GameState.buildings.includes(this.siegeTarget)) {
                        const dist = Math.hypot(this.siegeTarget.x - this.mesh.position.x, this.siegeTarget.z - this.mesh.position.z);
                        if(dist < 3) {
                            // Mauerangriff — 3x Schaden
                            const basHp = GameState.research.fortification ? 1200 : 400;
                            this.siegeTarget.hp = (this.siegeTarget.hp ?? basHp) - (this.damage * 3);
                            if(window.Game.tickCounter % 15 === 0) {
                                window.Game.spawnResParticles(this.siegeTarget.mesh.position, "#ef4444");
                                window.Sfx.mine();
                            }
                            this.mesh.rotation.y = Math.atan2(this.siegeTarget.x - this.mesh.position.x, this.siegeTarget.z - this.mesh.position.z);
                            if(this.legL && this.legR) { this.walkAnim += 0.4; this.legL.rotation.x = Math.sin(this.walkAnim)*0.8; this.legR.rotation.x = -Math.sin(this.walkAnim)*0.8; }
                            if(this.siegeTarget.hp <= 0) {
                                window.Game.createFloatingText("💥 Mauer gefallen!", this.siegeTarget.mesh, "#ef4444");
                                window.Game.spawnResParticles(this.siegeTarget.mesh.position, "#ef4444");
                                this.siegeTarget.mesh.dispose();
                                GameState.buildings = GameState.buildings.filter(b => b.id !== this.siegeTarget.id);
                                this.siegeTarget.workers.forEach(w => w.assignJob(null));
                                window.Game.notify("🏰 Eine Mauer wurde durchbrochen!", 'danger');
                                window.Game.uiNeedsUpdate = true;
                                this.siegeTarget = null;
                            }
                            return;
                        }
                        this.moveToward(this.siegeTarget.x, this.siegeTarget.z);
                        return;
                    }
                }
                // Keine Mauern mehr — direkt aufs Zentrum
                this.moveToward(GameState.centerTile.x, GameState.centerTile.z);
            }

            nomadBehavior() {
                // Infiltration: umgeht Mauern, stiehlt dann verschwindet
                let tx = GameState.centerTile.x, tz = GameState.centerTile.z;
                const storages = GameState.buildings.filter(b => (b.type === 'storage' || b.type === 'townhall') && !b.isConstructing);
                if(storages.length > 0) {
                    const nearest = storages.reduce((a, b) =>
                        Math.hypot(b.x - this.mesh.position.x, b.z - this.mesh.position.z) <
                        Math.hypot(a.x - this.mesh.position.x, a.z - this.mesh.position.z) ? b : a);
                    tx = nearest.x; tz = nearest.z;
                }
                const len = Math.hypot(tx - this.mesh.position.x, tz - this.mesh.position.z);
                if(len < 3) {
                    let stolen = Math.min(40, GameState.resources.gold);
                    GameState.resources.gold -= stolen;
                    if(stolen > 0) window.Game.createFloatingText(`-${stolen} Gold gestohlen!`, this.mesh, "#eab308");
                    window.Game.uiNeedsUpdate = true;
                    this.health = 0; this.mesh.dispose(); return;
                }
                let dirX = (tx - this.mesh.position.x) / len;
                let dirZ = (tz - this.mesh.position.z) / len;
                // Mauern seitlich umgehen
                const walls = GameState.buildings.filter(b => b.type === 'wall' && !b.isConstructing);
                const nearWall = walls.find(b => Math.hypot(b.x - this.mesh.position.x, b.z - this.mesh.position.z) < 6);
                if(nearWall) {
                    const side = (Math.sin(this.mesh.position.x * 0.1 + this.mesh.position.z * 0.07) > 0) ? 1 : -1;
                    dirX += -dirZ * side * 1.5;
                    dirZ +=  dirX * side * 1.5;
                    const l2 = Math.hypot(dirX, dirZ);
                    dirX /= l2; dirZ /= l2;
                }
                this.moveRaw(dirX, dirZ);
            }

            moveToward(tx, tz) {
                const dx = tx - this.mesh.position.x;
                const dz = tz - this.mesh.position.z;
                const dist = Math.hypot(dx, dz);
                if(dist < 0.5) return;
                const dirX = dx/dist, dirZ = dz/dist;
                const nextX = this.mesh.position.x + dirX * this.speed;
                const nextZ = this.mesh.position.z + dirZ * this.speed;

                // Gebäude im Weg angreifen
                const hitBuilding = GameState.buildings.find(b =>
                    !b.isConstructing && b.type !== 'road' && b.type !== 'path' && b.type !== 'townhall' &&
                    Math.hypot(b.x - nextX, b.z - nextZ) < (BUILDINGS[b.type].size/2 + 0.5));
                if(hitBuilding) {
                    const basHp = hitBuilding.type === 'wall' ? (GameState.research.fortification ? 1200 : 400) : 100;
                    hitBuilding.hp = (hitBuilding.hp ?? basHp) - (this.damage || 1);
                    if(window.Game.tickCounter % 20 === 0) { window.Game.spawnResParticles(hitBuilding.mesh.position, "#facc15"); window.Sfx.mine(); }
                    if(hitBuilding.hp <= 0) {
                        window.Game.createFloatingText("Zerstört!", hitBuilding.mesh, "#ef4444");
                        window.Game.spawnResParticles(hitBuilding.mesh.position, "#ef4444");
                        hitBuilding.mesh.dispose();
                        GameState.buildings = GameState.buildings.filter(b => b.id !== hitBuilding.id);
                        hitBuilding.workers.forEach(w => w.assignJob(null));
                        window.Game.uiNeedsUpdate = true;
                    }
                    this.mesh.rotation.y = Math.atan2(hitBuilding.x - this.mesh.position.x, hitBuilding.z - this.mesh.position.z);
                    if(this.legL && this.legR) { this.walkAnim += 0.4; this.legL.rotation.x = Math.sin(this.walkAnim)*0.8; this.legR.rotation.x = -Math.sin(this.walkAnim)*0.8; }
                    return;
                }

                // Zentrum erreicht
                if(Math.hypot(GameState.centerTile.x - this.mesh.position.x, GameState.centerTile.z - this.mesh.position.z) < 3) {
                    const goldLoss = 15 * (this.damage || 1);
                    if(GameState.resources.gold > 0) {
                        GameState.resources.gold = Math.max(0, GameState.resources.gold - goldLoss);
                        window.Game.createFloatingText(`-${goldLoss} Gold!`, this.mesh, "#ef4444");
                    }
                    window.Game.uiNeedsUpdate = true;
                    this.health = 0; this.mesh.dispose(); return;
                }

                this.moveRaw(dirX, dirZ);
            }

            moveRaw(dirX, dirZ) {
                let nextX = this.mesh.position.x + dirX * this.speed;
                let nextZ = this.mesh.position.z + dirZ * this.speed;
                let nextY = window.Game.getHeightAt(nextX, nextZ);
                if(nextY <= window.Game.waterLevel + 0.3 && !window.Game.hasInfra(Math.round(nextX), Math.round(nextZ), 'bridge')) {
                    nextX = this.mesh.position.x + (-dirZ) * this.speed;
                    nextZ = this.mesh.position.z + dirX * this.speed;
                    nextY = window.Game.getHeightAt(nextX, nextZ);
                    if(nextY <= window.Game.waterLevel + 0.3) return;
                }
                this.mesh.position.x = nextX; this.mesh.position.z = nextZ; this.mesh.position.y = nextY;
                this.mesh.rotation.y = Math.atan2(dirX, dirZ);
                if(this.legL && this.legR) { this.walkAnim += 0.2; this.legL.rotation.x = Math.sin(this.walkAnim)*0.6; this.legR.rotation.x = -Math.sin(this.walkAnim)*0.6; }
            }
        }

        class Animal {
            constructor(mesh) { this.mesh = mesh; this.health = 10; this.speed = 0.03; this.walkAnim = 0; this.target = null; this.state = 'WANDER'; }
            update() {
                let currentY = window.Game.getHeightAt(this.mesh.position.x, this.mesh.position.z);
                this.mesh.position.y = currentY;

                let nearCit = GameState.population.find(c => Math.hypot(c.mesh.position.x - this.mesh.position.x, c.mesh.position.z - this.mesh.position.z) < 15);
                if(nearCit) {
                    this.state = 'FLEE'; this.speed = 0.08;
                    let dir = this.mesh.position.subtract(nearCit.mesh.position); dir.y=0; dir.normalize();
                    this.target = this.mesh.position.add(dir.scale(10));
                } else if(this.state === 'FLEE') { this.state = 'WANDER'; this.speed = 0.03; this.target = null; }

                if(!this.target || Math.random() < 0.01) this.target = new BABYLON.Vector3(this.mesh.position.x + (Math.random()-0.5)*20, 0, this.mesh.position.z + (Math.random()-0.5)*20);
                
                let dir = this.target.subtract(this.mesh.position); dir.y = 0;
                if(dir.length() > 1) {
                    dir.normalize();
                    let nextX = this.mesh.position.x + dir.x * this.speed; let nextZ = this.mesh.position.z + dir.z * this.speed;
                    if(window.Game.getHeightAt(nextX, nextZ) > window.Game.waterLevel + 0.5) {
                        this.mesh.position.x = nextX; this.mesh.position.z = nextZ;
                        this.mesh.rotation.y = BABYLON.Scalar.LerpAngle(this.mesh.rotation.y, Math.atan2(dir.x, dir.z), 0.1);
                        if(this.legL && this.legR) { this.walkAnim += (this.speed*5); this.legL.rotation.x = Math.sin(this.walkAnim)*0.4; this.legR.rotation.x = -Math.sin(this.walkAnim)*0.4; }
                    } else this.target = null;
                }
            }
        }

        class Citizen {
            constructor(mesh) {
                this.mesh = mesh; this.job = 'UNEMPLOYED'; this.workplace = null; this.state = 'IDLE'; 
                this.target = null; this.targetProp = null; this.inv = { type: null, amount: 0 }; this.timer = 0; this.baseSpd = 0.08; this.spd = this.baseSpd;
                this.carryMesh = BABYLON.MeshBuilder.CreateBox("ca", {size: 0.3}, window.Game.scene); this.carryMesh.parent = this.mesh; this.carryMesh.position = new BABYLON.Vector3(0, 0.6, -0.35); this.carryMesh.isVisible = false;
            }
            
            assignJob(b) {
                this.carryMesh.isVisible = false;
                if(b) { 
                    this.workplace = b; this.job = b.role; 
                    if(this.bodyMesh) { this.bodyMesh.material = new BABYLON.StandardMaterial("w", window.Game.scene); this.bodyMesh.material.diffuseColor = BABYLON.Color3.FromHexString(BUILDINGS[b.type].color); }

                    if(b.type === 'barracks') {
                        this.unitType = b.unitType || 'soldier';
                        this.job = this.unitType === 'knight' ? 'KNIGHT' : 'SOLDIER';
                        this.guardHP = this.unitType === 'knight' ? 
                            (GameState.research.armor ? 80 : 40) : 
                            (GameState.research.armor ? 30 : 15);
                        // Farbe + Größe je Typ
                        const unitColors = { soldier: '#dc2626', knight: '#7c3aed' };
                        if(this.bodyMesh) {
                            this.bodyMesh.material = new BABYLON.StandardMaterial("wu", window.Game.scene);
                            this.bodyMesh.material.diffuseColor = BABYLON.Color3.FromHexString(unitColors[this.unitType] || '#dc2626');
                        }
                        if(this.unitType === 'knight') this.mesh.scaling.setAll(1.3);
                        else this.mesh.scaling.setAll(1.0);
                        this.state = 'TRAINING'; this.timer = 500;
                        this.target = new BABYLON.Vector3(b.x, 0, b.z); return;
                    }
                    if(b.type === 'archery') {
                        this.unitType = 'archer';
                        this.job = 'ARCHER';
                        this.guardHP = GameState.research.armor ? 20 : 10;
                        if(this.bodyMesh) {
                            this.bodyMesh.material = new BABYLON.StandardMaterial("wa", window.Game.scene);
                            this.bodyMesh.material.diffuseColor = BABYLON.Color3.FromHexString('#b45309');
                        }
                        this.mesh.scaling.setAll(0.9);
                        this.state = 'TRAINING'; this.timer = 300;
                        this.target = new BABYLON.Vector3(b.x, 0, b.z); return;
                    }
                } else { 
                    this.workplace = null; this.job = 'UNEMPLOYED';
                    this.unitType = null;
                    this.mesh.scaling.setAll(1.0);
                    if(this.bodyMesh) this.bodyMesh.material = window.Game.mats.citizen; 
                }
                
                if(!this.mesh.isEnabled()) this.mesh.setEnabled(true);
                this.state = 'IDLE'; this.target = null; this.targetProp = null; this.inv = { type: null, amount: 0 };
            }

            update() {
                let y = window.Game.getHeightAt(this.mesh.position.x, this.mesh.position.z);
                
                if (window.Game.tickCounter % 30 === 0) {
                    this.spd = this.baseSpd * ((GameState.happiness / 100) * 0.5 + 0.5); 
                    let buff = false;
                    if(GameState.buildings.some(b => b.type === 'monument' && !b.isConstructing)) { this.spd *= 1.2; buff = true; }
                    if(GameState.resources.tools > 0) { this.spd *= 1.3; buff = true; }
                    if(GameState.research.betterTools) { this.spd *= 1.2; buff = true; }
                    
                    if(GameState.weatherTimer > 0) {
                        if (this.job === 'FARMER' || this.job === 'FISHER') this.spd *= 1.5; else this.spd *= 0.8; 
                    }
                    if(buff && this.bodyMesh && this.bodyMesh.material) this.bodyMesh.material.emissiveColor = new BABYLON.Color3(0.1, 0.3, 0.1); else if (this.bodyMesh && this.bodyMesh.material) this.bodyMesh.material.emissiveColor = new BABYLON.Color3(0,0,0);
                }

                if(this.job === 'INNKEEPER' || this.job === 'MERCHANT') { this.mesh.position.y = y; this.mesh.rotation.y += 0.05; return; }
                if(this.job === 'FISHER') { this.mesh.position.y = y; this.fisherLogic(); return; }

                if(this.state === 'TRAINING') {
                    this.mesh.position.y = y;
                    if(this.moveTo(this.target, y)) {
                        this.timer--;
                        if(this.timer <= 0) { this.state = 'IDLE'; window.Game.createFloatingText("Bereit!", this.mesh, "#ef4444"); } 
                        else if (window.Game.tickCounter % 30 === 0) { this.mesh.rotation.y += Math.PI; }
                    } return; 
                }

                if(['GUARD','SOLDIER','KNIGHT','ARCHER'].includes(this.job)) { this.mesh.position.y = y; this.guardLogic(); return; }
                if(this.job === 'HUNTER') { this.mesh.position.y = y; this.hunterLogic(y); return; }
                
                if(GameState.isNight && !['GO_SLEEP','MOVING_SLEEP','SLEEPING'].includes(this.state)) {
                    this.state = 'GO_SLEEP';
                } else if (!GameState.isNight && ['GO_SLEEP','MOVING_SLEEP','SLEEPING'].includes(this.state)) {
                    if(!this.mesh.isEnabled()) this.mesh.setEnabled(true); 
                    this.state = 'IDLE';
                }
                const foodJobs = ['FARMER','GATHERER','HUNTER','FISHER','ORCHARDIST','VEGFARMER','COWHERD','PIGFARMER','COOK','BAKER','MILLER'];
                if(GameState.isStarving && !foodJobs.includes(this.job) && !['IDLE','GO_SLEEP','MOVING_SLEEP','SLEEPING'].includes(this.state)) this.state = 'IDLE';

                switch(this.state) {
                    case 'GO_SLEEP':
                        let houses = GameState.buildings.filter(b => (b.type === 'house' || b.type === 'townhall') && !b.isConstructing);
                        let targetHouse = houses.length > 0 ? houses[Math.floor(Math.random() * houses.length)] : null;
                        if(targetHouse) { this.target = new BABYLON.Vector3(targetHouse.x, 0, targetHouse.z); this.state = 'MOVING_SLEEP'; } else { this.state = 'SLEEPING'; }
                        break;
                    case 'MOVING_SLEEP': if(this.moveTo(this.target, y)) { this.mesh.setEnabled(false); this.state = 'SLEEPING'; } break;
                    case 'SLEEPING': if(this.mesh.isEnabled() && Math.random() < 0.005) window.Game.createFloatingText("Zzz...", this.mesh, "#94a3b8"); else if (!this.mesh.isEnabled() && Math.random() < 0.001 && this.target) window.Game.createFloatingText("Zzz...", this.target, "#94a3b8"); break;
                    
                    case 'IDLE': 
                        this.mesh.position.y = y; this.carryMesh.isVisible = false; 
                        if(this.job === 'UNEMPLOYED') {
                            // Bei Hunger: Nahrungsgebäude suchen und dort helfen
                            if(GameState.isStarving) {
                                const foodBuildings = GameState.buildings.filter(b => 
                                    !b.isConstructing && b.workers.length < b.maxWorkers &&
                                    ['gatherer','hunter','farm','port','orchard','vegetable','pigpen','cowpasture','kitchen','bakery'].includes(b.type)
                                );
                                if(foodBuildings.length > 0) {
                                    let fb = foodBuildings[0];
                                    this.target = new BABYLON.Vector3(fb.x, 0, fb.z);
                                    this.state = 'MOVING_IDLE';
                                    return;
                                }
                            }
                            this.findUnemployedTask();
                        }
                        else if((!GameState.isStarving || foodJobs.includes(this.job)) && this.workplace) {
                            if (['SAWMILL', 'SMELTER', 'BAKER', 'BRICKMAKER', 'MILLER', 'TOOLMAKER', 'WEAPONSMITH', 'ORCHARDIST', 'VEGFARMER', 'COWHERD', 'SHEPHERD', 'PIGFARMER', 'COOK', 'CHEESEMAKER'].includes(this.job)) this.state = 'PROCESS';
                            else this.findRes();
                        }
                        else if(Math.random() < 0.01 && GameState.centerTile) { this.target = new BABYLON.Vector3(GameState.centerTile.x+(Math.random()-0.5)*15, 0, GameState.centerTile.z+(Math.random()-0.5)*15); this.state = 'MOVING_IDLE'; } 
                        break;

                    case 'MOVING_IDLE': if(this.job !== 'UNEMPLOYED') this.state = 'IDLE'; else if(this.moveTo(this.target, y)) this.state = 'IDLE'; break;
                    case 'MOVING_WORK': if(this.targetProp && this.targetProp.health <= 0 && !['FARMER','FORESTER','CLAYMINER'].includes(this.job)) { this.state = 'IDLE'; } else if(this.moveTo(this.target, y)) { this.state = 'WORK'; this.timer = 250; } break;
                    case 'WORK':
                        this.timer--; this.mesh.rotation.z = Math.sin(this.timer * 0.3) * 0.2; 
                        if(this.timer % 50 === 0) { if(this.job === 'WOODCUTTER') window.Sfx.chop(); else if(['MINER','CLAYMINER'].includes(this.job)) window.Sfx.mine(); }
                        if (this.timer <= 0) {
                            this.mesh.rotation.z = 0;
                            if(this.job === 'FORESTER') {
                                let ty = window.Game.getHeightAt(this.mesh.position.x, this.mesh.position.z);
                                if (ty > window.Game.waterLevel + 0.5 && ty < 6) {
                                    let rn = new BABYLON.TransformNode("tr", window.Game.scene); rn.position = new BABYLON.Vector3(this.mesh.position.x, ty, this.mesh.position.z);
                                    let t = BABYLON.MeshBuilder.CreateCylinder("t", {diameter: 0.6, height: 1.5}, window.Game.scene); t.position.y=0.75; t.parent=rn; t.material=window.Game.mats.wood;
                                    let c = BABYLON.MeshBuilder.CreateCylinder("c", {diameterTop:0, diameterBottom:3.5, height:4.5, tessellation:6}, window.Game.scene); c.position.y=3.5; c.parent=rn; c.material=window.Game.mats.bush;
                                    window.Game.shadows.addShadowCaster(t); window.Game.shadows.addShadowCaster(c); rn.scaling.setAll(0.05);
                                    GameState.mapProps.growingTrees.push({x: this.mesh.position.x, z: this.mesh.position.z, mesh: rn, scale: 0.05});
                                }
                                this.state = 'IDLE'; return;
                            }
                            
                            this.inv.amount = 10;
                            if(this.job === 'WOODCUTTER') this.inv.type = 'wood'; 
                            else if (this.job === 'MINER') this.inv.type = this.targetProp ? this.targetProp.rockType : 'stone'; 
                            else if (this.job === 'CLAYMINER') this.inv.type = 'clay';
                            else if (this.job === 'FARMER') this.inv.type = 'wheat';
                            else this.inv.type = 'food'; 
                            
                            if(this.targetProp && !['FARMER','CLAYMINER'].includes(this.job)) { 
                                this.targetProp.health -= 10;
                                if(this.targetProp.health <= 0) { 
                                    window.Game.spawnResParticles(this.targetProp.mesh.position, this.job === 'WOODCUTTER' ? "#8b4513" : "#cbd5e1");
                                    this.targetProp.mesh.dispose(); 
                                    if(this.job==='WOODCUTTER') GameState.mapProps.trees=GameState.mapProps.trees.filter(t=>t!==this.targetProp); if(this.job==='MINER') GameState.mapProps.rocks=GameState.mapProps.rocks.filter(r=>r!==this.targetProp); if(this.job==='GATHERER') GameState.mapProps.bushes=GameState.mapProps.bushes.filter(b=>b!==this.targetProp); 
                                }
                            }
                            this.showCarryMesh(this.inv.type);
                            this.target = new BABYLON.Vector3(this.workplace.x, 0, this.workplace.z); this.state = 'RETURN_WORKPLACE';
                        } break;
                    case 'RETURN_WORKPLACE':
                        if(this.moveTo(this.target, y)) {
                            this.workplace.localInv[this.inv.type] = (this.workplace.localInv[this.inv.type] || 0) + this.inv.amount;
                            window.Game.createFloatingText("+" + this.inv.amount + " in lokales Lager", this.workplace.mesh, "#cbd5e1");
                            this.inv.amount = 0; this.carryMesh.isVisible = false; this.state = 'IDLE';
                        } break;

                    case 'PROCESS':
                        if(this.moveTo(new BABYLON.Vector3(this.workplace.x, 0, this.workplace.z), y)) {
                            this.timer--;
                            if(this.timer % 80 === 0) { if(['SAWMILL','MILLER'].includes(this.job)) window.Sfx.chop(); else window.Sfx.mine(); }
                            if(this.timer <= 0) {
                                let processed = false;
                                const farmBonus = GameState.research.farming ? 1.5 : 1.0;
                                const droughtMalus = GameState.isDrought ? 0.3 : 1.0;
                                const farmMult = Math.round(farmBonus * droughtMalus * 8);
                                if(this.job === 'SAWMILL') {
                                    if(GameState.resources.wood >= 10) { GameState.resources.wood -= 10; this.workplace.localInv.planks += 10; window.Game.createFloatingText("+10 Bretter", this.workplace.mesh, "#fdba74"); window.Game.uiNeedsUpdate = true; processed = true; }
                                } else if (this.job === 'SMELTER') {
                                    if(GameState.resources.iron >= 5 && GameState.resources.coal >= 5) { GameState.resources.iron -= 5; GameState.resources.coal -= 5; this.workplace.localInv.iron += 5; window.Game.createFloatingText("+5 Eisen", this.workplace.mesh, "#94a3b8"); window.Game.uiNeedsUpdate = true; processed = true; }
                                } else if (this.job === 'BRICKMAKER') {
                                    if(GameState.resources.clay >= 10 && GameState.resources.wood >= 5) { GameState.resources.clay -= 10; GameState.resources.wood -= 5; this.workplace.localInv.bricks += 10; window.Game.createFloatingText("+10 Ziegel", this.workplace.mesh, "#b91c1c"); window.Game.uiNeedsUpdate = true; processed = true; }
                                } else if (this.job === 'MILLER') {
                                    if(GameState.resources.wheat >= 10) { GameState.resources.wheat -= 10; this.workplace.localInv.flour += 10; window.Game.createFloatingText("+10 Mehl", this.workplace.mesh, "#fef08a"); window.Game.uiNeedsUpdate = true; processed = true; }
                                } else if (this.job === 'BAKER') {
                                    if(GameState.resources.flour >= 10 && GameState.resources.wood >= 5) { GameState.resources.flour -= 10; GameState.resources.wood -= 5; GameState.resources.food += 30; window.Game.createFloatingText("+30 Essen", this.workplace.mesh, "#fcd34d"); window.Game.uiNeedsUpdate = true; processed = true; }
                                } else if (this.job === 'TOOLMAKER') {
                                    if(GameState.resources.iron >= 5 && GameState.resources.coal >= 5) { GameState.resources.iron -= 5; GameState.resources.coal -= 5; this.workplace.localInv.tools += 5; window.Game.createFloatingText("+5 Tools", this.workplace.mesh, "#4ade80"); window.Game.uiNeedsUpdate = true; processed = true; }
                                } else if (this.job === 'WEAPONSMITH') {
                                    if(GameState.resources.iron >= 10 && GameState.resources.wood >= 10) { GameState.resources.iron -= 10; GameState.resources.wood -= 10; this.workplace.localInv.weapons += 5; window.Game.createFloatingText("+5 Waffen", this.workplace.mesh, "#fca5a5"); window.Game.uiNeedsUpdate = true; processed = true; }
                                } else if (this.job === 'COOK') {
                                    if(GameState.resources.vegetables >= 10) { GameState.resources.vegetables -= 10; GameState.resources.food += Math.round(25 * farmBonus); window.Game.createFloatingText(`+${Math.round(25*farmBonus)} Essen`, this.workplace.mesh, "#fb923c"); window.Game.uiNeedsUpdate = true; processed = true; }
                                } else if (this.job === 'CHEESEMAKER') {
                                    if(GameState.resources.milk >= 10) { GameState.resources.milk -= 10; this.workplace.localInv.cheese = (this.workplace.localInv.cheese||0) + 8; window.Game.createFloatingText("+8 Käse", this.workplace.mesh, "#fef08a"); window.Game.uiNeedsUpdate = true; processed = true; }
                                } else if (this.job === 'ORCHARDIST') {
                                    this.workplace.localInv.fruits = (this.workplace.localInv.fruits||0) + farmMult;
                                    window.Game.createFloatingText(`+${farmMult} Obst`, this.workplace.mesh, "#f97316");
                                    window.Game.uiNeedsUpdate = true; processed = true;
                                } else if (this.job === 'VEGFARMER') {
                                    this.workplace.localInv.vegetables = (this.workplace.localInv.vegetables||0) + farmMult;
                                    window.Game.createFloatingText(`+${farmMult} Gemüse`, this.workplace.mesh, "#4ade80");
                                    window.Game.uiNeedsUpdate = true; processed = true;
                                } else if (this.job === 'COWHERD') {
                                    this.workplace.localInv.milk = (this.workplace.localInv.milk||0) + Math.round(10 * droughtMalus);
                                    window.Game.createFloatingText(`+${Math.round(10*droughtMalus)} Milch`, this.workplace.mesh, "#fde68a");
                                    window.Game.uiNeedsUpdate = true; processed = true;
                                } else if (this.job === 'SHEPHERD') {
                                    this.workplace.localInv.wool = (this.workplace.localInv.wool||0) + 6;
                                    window.Game.createFloatingText("+6 Wolle", this.workplace.mesh, "#f1f5f9");
                                    window.Game.uiNeedsUpdate = true; processed = true;
                                } else if (this.job === 'PIGFARMER') {
                                    this.workplace.localInv.meat = (this.workplace.localInv.meat||0) + farmMult;
                                    window.Game.createFloatingText(`+${farmMult} Fleisch`, this.workplace.mesh, "#fda4af");
                                    window.Game.uiNeedsUpdate = true; processed = true;
                                } else {
                                    processed = true;
                                }
                                this.timer = processed ? (GameState.research.smelting && ['SMELTER','BRICKMAKER'].includes(this.job) ? 100 : 200) : 30;
                            }
                        } break;

                    case 'MOVING_FETCH':
                        if(this.moveTo(this.target, y)) {
                            if(this.targetProp && this.targetProp.localInv) {
                                let tType = Object.keys(this.targetProp.localInv).find(k => this.targetProp.localInv[k] > 0);
                                if(tType) {
                                    let grab = Math.min(20, this.targetProp.localInv[tType]);
                                    this.targetProp.localInv[tType] -= grab;
                                    this.inv = { type: tType, amount: grab };
                                    this.showCarryMesh(tType);
                                    let drop = this.findGlobalStorage(this.mesh.position.x, this.mesh.position.z);
                                    this.targetProp = drop;
                                    this.target = drop ? new BABYLON.Vector3(drop.x, 0, drop.z) : new BABYLON.Vector3(GameState.centerTile.x, 0, GameState.centerTile.z);
                                    this.state = 'MOVING_DELIVER';
                                } else this.state = 'IDLE';
                            } else this.state = 'IDLE';
                        } break;
                    case 'MOVING_DELIVER':
                        if(this.moveTo(this.target, y)) {
                            if(this.inv.amount > 0) {
                                GameState.resources[this.inv.type] += this.inv.amount;
                                window.Game.createFloatingText("+" + this.inv.amount, this.targetProp ? this.targetProp.mesh : this.mesh, "#22c55e");
                                this.inv.amount = 0; this.carryMesh.isVisible = false; window.Game.uiNeedsUpdate = true;
                            }
                            this.state = 'IDLE';
                        } break;
                    case 'MOVING_BUILD': if(this.moveTo(this.target, y)) { this.state = 'BUILDING'; this.timer = 60; } break;
                    case 'BUILDING':
                        this.timer--; this.mesh.rotation.z = Math.sin(this.timer * 0.5) * 0.2;
                        if(this.timer % 20 === 0) window.Sfx.click();
                        if(this.timer <= 0 && this.targetProp && this.targetProp.isConstructing) {
                            this.mesh.rotation.z = 0;
                            this.targetProp.buildProgress += 10;
                            this.targetProp.mesh.position.y = this.targetProp.baseY - 3 + (this.targetProp.buildProgress / 100) * 3;
                            if(this.targetProp.buildProgress >= 100) {
                                this.targetProp.isConstructing = false;
                                const bName = BUILDINGS[this.targetProp.type] ? BUILDINGS[this.targetProp.type].name : this.targetProp.type;
                                window.Game.notify(`🏗️ ${bName} fertiggestellt!`, 'success');
                                this.targetProp.mesh.getChildMeshes().forEach(m => { if(m.material) m.material.alpha = 1.0; });
                                window.Game.createFloatingText("Gebaut!", this.targetProp.mesh, "#22c55e");
                                window.Game.spawnResParticles(this.targetProp.mesh.position, "#cbd5e1");
                                window.Sfx.build();
                            }
                            this.state = 'IDLE';
                        } else if (!this.targetProp || !this.targetProp.isConstructing) this.state = 'IDLE';
                        break;
                }
            }
            
            showCarryMesh(type) {
                this.carryMesh.isVisible = true; 
                let cm = new BABYLON.StandardMaterial("cm", window.Game.scene); 
                if(type === 'wood') cm.diffuseColor = new BABYLON.Color3(0.5,0.3,0.1); else if(type === 'stone') cm.diffuseColor = new BABYLON.Color3(0.6,0.6,0.6); else if(type === 'coal') cm.diffuseColor = new BABYLON.Color3(0.1,0.1,0.1); else if(type === 'planks') cm.diffuseColor = new BABYLON.Color3(0.9,0.6,0.2); else if(type === 'iron') cm.diffuseColor = new BABYLON.Color3(0.4,0.3,0.3); else if(type === 'clay') cm.diffuseColor = new BABYLON.Color3(0.6,0.3,0.1); else if(type === 'bricks') cm.diffuseColor = new BABYLON.Color3(0.8,0.2,0.2); else if(type === 'wheat') cm.diffuseColor = new BABYLON.Color3(0.9,0.8,0.2); else if(type === 'flour') cm.diffuseColor = new BABYLON.Color3(0.9,0.9,0.8); else if(type === 'meat') cm.diffuseColor = new BABYLON.Color3(0.9,0.2,0.2); else if(type === 'fish') cm.diffuseColor = new BABYLON.Color3(0.2,0.5,0.9); else if(type === 'weapons') cm.diffuseColor = new BABYLON.Color3(0.8,0.1,0.1); else if(type === 'tools') cm.diffuseColor = new BABYLON.Color3(0.2,0.8,0.2); else cm.diffuseColor = new BABYLON.Color3(0.2,0.8,0.2); 
                this.carryMesh.material = cm;
            }

            findGlobalStorage(x, z) {
                let storages = GameState.buildings.filter(b => (b.type === 'storage' || b.type === 'townhall') && !b.isConstructing);
                if(storages.length === 0) return GameState.centerTile;
                let best = storages[0], minDist = Infinity;
                storages.forEach(s => { let d = Math.hypot(s.x - x, s.z - z); if(d < minDist) { minDist = d; best = s; } });
                return best;
            }

            findUnemployedTask() {
                let sites = GameState.buildings.filter(b => b.isConstructing);
                if(sites.length > 0) {
                    this.targetProp = sites[Math.floor(Math.random()*sites.length)];
                    this.target = new BABYLON.Vector3(this.targetProp.x, 0, this.targetProp.z);
                    this.state = 'MOVING_BUILD'; return;
                }
                let logs = GameState.buildings.filter(b => !b.isConstructing && b.localInv && Object.keys(b.localInv).some(k => b.localInv[k] > 0));
                if(logs.length > 0) {
                    this.targetProp = logs[Math.floor(Math.random()*logs.length)];
                    this.target = new BABYLON.Vector3(this.targetProp.x, 0, this.targetProp.z);
                    this.state = 'MOVING_FETCH'; return;
                }
                if(Math.random() < 0.02 && GameState.centerTile) { this.target = new BABYLON.Vector3(GameState.centerTile.x+(Math.random()-0.5)*15, 0, GameState.centerTile.z+(Math.random()-0.5)*15); this.state = 'MOVING_IDLE'; }
            }

            findRes() {
                if(['FARMER','FORESTER','CLAYMINER'].includes(this.job)) {
                    let r = this.job==='FORESTER'?20:2; let tx = this.workplace.x+(Math.random()-0.5)*r, tz = this.workplace.z+(Math.random()-0.5)*r;
                    this.target = new BABYLON.Vector3(tx, 0, tz); this.state = 'MOVING_WORK'; return;
                }
                let p = this.job==='WOODCUTTER'?GameState.mapProps.trees : (this.job==='MINER'?GameState.mapProps.rocks:GameState.mapProps.bushes);
                if(p.length === 0) { this.timer = (this.timer||0) + 1; if(this.timer > 60) { this.timer = 0; } this.state = 'IDLE'; return; }
                let c = null, md = Infinity; p.forEach(x => { let d = Math.hypot(this.workplace.x - x.x, this.workplace.z - x.z); if(d < md) { md = d; c = x; } });
                if(md > 80) { this.timer = (this.timer||0) + 1; if(this.timer > 300) { this.timer = 0; window.Game.createFloatingText("Zu weit!", this.mesh, "#f87171"); } this.state = 'IDLE'; return; }
                this.targetProp = c; this.target = new BABYLON.Vector3(c.x, 0, c.z); this.state = 'MOVING_WORK';
            }

            fisherLogic() {
                this.timer--;
                if(this.timer <= 0) {
                    this.timer = 150;
                    this.workplace.localInv['fish'] += 5;
                    window.Game.createFloatingText("+5 Fisch", this.workplace.mesh, "#3b82f6");
                }
            }

            guardLogic() {
                const y = window.Game.getHeightAt(this.mesh.position.x, this.mesh.position.z);
                if(!this.guardHP) this.guardHP = 15;

                const findNearest = () => {
                    if(GameState.enemies.length === 0) return null;
                    return GameState.enemies.reduce((a, b) => {
                        const da = Math.hypot(a.mesh.position.x - this.mesh.position.x, a.mesh.position.z - this.mesh.position.z);
                        const db = Math.hypot(b.mesh.position.x - this.mesh.position.x, b.mesh.position.z - this.mesh.position.z);
                        return db < da ? b : a;
                    });
                };

                // --- BOGENSCHÜTZE ---
                if(this.unitType === 'archer' || this.job === 'ARCHER') {
                    const nearest = findNearest();
                    if(nearest) {
                        const dist = Math.hypot(nearest.mesh.position.x - this.mesh.position.x, nearest.mesh.position.z - this.mesh.position.z);
                        if(dist < 22) {
                            this.mesh.rotation.y = Math.atan2(
                                nearest.mesh.position.x - this.mesh.position.x,
                                nearest.mesh.position.z - this.mesh.position.z
                            );
                            if(window.Game.tickCounter % 60 === 0) {
                                nearest.health -= 10;
                                window.Game.spawnResParticles(nearest.mesh.position, "#b45309");
                                window.Sfx.play(600, 'triangle', 0.1, 0.05);
                                if(nearest.health <= 0) { nearest.mesh.dispose(); window.Game.createFloatingText("💀", this.mesh, "#b45309"); }
                            }
                            return; // Bogenschütze bleibt stehen
                        }
                    }
                    // Kein Feind in Reichweite — beim Schießstand bleiben
                    if(this.workplace) {
                        const dist = Math.hypot(this.mesh.position.x - this.workplace.x, this.mesh.position.z - this.workplace.z);
                        if(dist > 6) this.moveTo(new BABYLON.Vector3(this.workplace.x, 0, this.workplace.z), y);
                    }
                    return;
                }

                // --- RITTER ---
                if(this.unitType === 'knight' || this.job === 'KNIGHT') {
                    const nearest = findNearest();
                    if(nearest) {
                        if(this.moveTo(new BABYLON.Vector3(nearest.mesh.position.x, 0, nearest.mesh.position.z), y)) {
                            nearest.health -= 25;
                            this.guardHP -= nearest.damage || 1;
                            window.Sfx.mine();
                            window.Game.spawnResParticles(nearest.mesh.position, "#7c3aed");
                            if(nearest.health <= 0) { nearest.mesh.dispose(); window.Game.createFloatingText("💀", this.mesh, "#7c3aed"); }
                        }
                    } else {
                        // Patrouille vor Mauern
                        let walls = GameState.buildings.filter(b => b.type === 'wall' && !b.isConstructing);
                        if(walls.length > 0 && (!this.patrolTarget || Math.random() < 0.005)) {
                            let w = walls[Math.floor(Math.random() * walls.length)];
                            this.patrolTarget = new BABYLON.Vector3(w.x + (Math.random()-0.5)*4, 0, w.z + (Math.random()-0.5)*4);
                        } else if(!this.patrolTarget && GameState.centerTile) {
                            this.patrolTarget = new BABYLON.Vector3(GameState.centerTile.x + (Math.random()-0.5)*15, 0, GameState.centerTile.z + (Math.random()-0.5)*15);
                        }
                        if(this.patrolTarget) this.moveTo(this.patrolTarget, y);
                    }
                    if(this.guardHP <= 0) {
                        window.Game.createFloatingText("⚔️ Gefallen!", this.mesh, "#7c3aed");
                        this.mesh.dispose(); 
                        if(this.workplace) this.workplace.workers = this.workplace.workers.filter(w => w !== this);
                        this.health = 0;
                    }
                    return;
                }

                // --- SOLDAT (Standard + alter GUARD) ---
                const nearest = findNearest();
                if(nearest) {
                    if(this.moveTo(new BABYLON.Vector3(nearest.mesh.position.x, 0, nearest.mesh.position.z), y)) {
                        nearest.health -= 15;
                        this.guardHP -= nearest.damage || 1;
                        window.Sfx.click();
                        window.Game.spawnResParticles(nearest.mesh.position, "#ef4444");
                        if(nearest.health <= 0) { nearest.mesh.dispose(); window.Game.createFloatingText("💀", this.mesh, "#ef4444"); }
                    }
                } else {
                    // Patrouille zwischen Kaserne und Zentrum
                    if(!this.patrolTarget || Math.random() < 0.005) {
                        if(Math.random() < 0.5 && this.workplace) {
                            this.patrolTarget = new BABYLON.Vector3(
                                this.workplace.x + (Math.random()-0.5)*12, 0,
                                this.workplace.z + (Math.random()-0.5)*12
                            );
                        } else if(GameState.centerTile) {
                            this.patrolTarget = new BABYLON.Vector3(
                                GameState.centerTile.x + (Math.random()-0.5)*20, 0,
                                GameState.centerTile.z + (Math.random()-0.5)*20
                            );
                        }
                    }
                    if(this.patrolTarget) this.moveTo(this.patrolTarget, y);
                }
                if(this.guardHP <= 0) {
                    window.Game.createFloatingText("⚔️ Gefallen!", this.mesh, "#ef4444");
                    this.mesh.dispose();
                    if(this.workplace) this.workplace.workers = this.workplace.workers.filter(w => w !== this);
                    this.health = 0;
                }
            }

            hunterLogic(y) {
                if(this.state === 'RETURN_WORKPLACE') {
                    if(this.moveTo(this.target, y)) {
                        this.workplace.localInv['meat'] += this.inv.amount;
                        window.Game.createFloatingText("+" + this.inv.amount + " Fleisch", this.workplace.mesh, "#ef4444");
                        this.inv.amount = 0; this.carryMesh.isVisible = false; this.state = 'IDLE';
                    }
                    return;
                }
                
                if(!this.targetProp || this.targetProp.health <= 0) {
                    let md = Infinity; GameState.animals.forEach(a => { let d = Math.hypot(this.workplace.x - a.mesh.position.x, this.workplace.z - a.mesh.position.z); if(d < md) { md = d; this.targetProp = a; } });
                    if(!this.targetProp) { this.state = 'IDLE'; return; }
                }

                this.target = new BABYLON.Vector3(this.targetProp.mesh.position.x, 0, this.targetProp.mesh.position.z);
                if(this.moveTo(this.target, y)) {
                    this.targetProp.health = 0; this.targetProp.mesh.dispose();
                    this.inv = { type: 'meat', amount: 15 }; this.showCarryMesh('meat');
                    window.Game.spawnResParticles(this.targetProp.mesh.position, "#ef4444");
                    this.targetProp = null; this.target = new BABYLON.Vector3(this.workplace.x, 0, this.workplace.z); this.state = 'RETURN_WORKPLACE';
                }
            }

            moveTo(vecTarget, currentY) {
                if(!vecTarget) { if(this.legL) { this.legL.rotation.x = 0; this.legR.rotation.x = 0; } return true; }
                let dir = vecTarget.subtract(this.mesh.position); dir.y = 0; 
                if(dir.length() < 1.5) { if(this.legL) { this.legL.rotation.x = 0; this.legR.rotation.x = 0; } return true; }
                dir.normalize(); 
                
                let rx = Math.round(this.mesh.position.x), rz = Math.round(this.mesh.position.z);
                let onRoad = window.Game.hasInfra(rx, rz, 'road');
                let onPath = window.Game.hasInfra(rx, rz, 'path');
                let s = this.spd * (onRoad ? 2.0 : (onPath ? 1.3 : 1.0));
                
                if(!onRoad && !onPath && window.Game.tickCounter % 20 === 0) {
                    let k = rx+","+rz; GameState.footTraffic[k] = (GameState.footTraffic[k]||0)+1;
                    if(GameState.footTraffic[k] > 15 && !GameState.paths.has(k)) {
                        GameState.paths.add(k); window.Game.placeBuilding('path', rx, rz);
                    }
                }
                
                let nextPos = this.mesh.position.add(dir.scale(s));
                let nextY = window.Game.getHeightAt(nextPos.x, nextPos.z);
                let onBridge = window.Game.hasInfra(Math.round(nextPos.x), Math.round(nextPos.z), 'bridge');
                
                if (nextY <= window.Game.waterLevel + 0.5 && !onBridge && this.job !== 'FISHER') { if(this.legL) { this.legL.rotation.x = 0; this.legR.rotation.x = 0; } return true; }

                this.mesh.position = nextPos;
                this.mesh.position.y = onBridge ? window.Game.waterLevel + 0.1 : nextY; 
                this.mesh.rotation.y = BABYLON.Scalar.LerpAngle(this.mesh.rotation.y, Math.atan2(dir.x, dir.z), 0.15); 
                
                if (this.legL && this.legR) { this.walkAnim = (this.walkAnim || 0) + 0.3; this.legL.rotation.x = Math.sin(this.walkAnim) * 0.6; this.legR.rotation.x = -Math.sin(this.walkAnim) * 0.6; }
                return false;
            }
        }