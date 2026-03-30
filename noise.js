// noise.js — Perlin Noise + TextureGen
        const Noise = new (function() {
            this.p = new Uint8Array(512);
            this.seedOffsetX = Math.random() * 10000;
            this.seedOffsetY = Math.random() * 10000;
            let permutation = [151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190, 6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168, 68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54, 65,25,63,161, 1,216,80,73,209,76,132,187,208, 89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186, 3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152, 2,44,154,163, 70,221,153,101,155,167, 43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185, 112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241, 81,51,145,235,249,14,239,107,49,192,214, 31,181,199,106,157,184, 84,204,176,115,121,50,45,127, 4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
            for (let i=0; i<256; i++) this.p[i] = this.p[i+256] = permutation[i];
            this.perlin2 = function(x, y) {
                x += this.seedOffsetX; y += this.seedOffsetY;
                let X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
                x -= Math.floor(x); y -= Math.floor(y);
                let u = x * x * x * (x * (x * 6 - 15) + 10), v = y * y * y * (y * (y * 6 - 15) + 10);
                let A = this.p[X]+Y, B = this.p[X+1]+Y;
                let grad = (hash, x, y) => { let h = hash & 15; let u = h<8 ? x : y, v = h<4 ? y : h==12||h==14 ? x : 0; return ((h&1) == 0 ? u : -u) + ((h&2) == 0 ? v : -v); };
                return (u === 0 && v === 0) ? 0 : (grad(this.p[A], x, y) * (1-u) + grad(this.p[B], x-1, y) * u) * (1-v) + (grad(this.p[A+1], x, y-1) * (1-u) + grad(this.p[B+1], x-1, y-1) * u) * v;
            }
        })();

        const TextureGen = {
            createWood: function(scene) { let dt = new BABYLON.DynamicTexture("dt_w", {width:256,height:256}, scene, false); let ctx = dt.getContext(); ctx.fillStyle = "#3e2723"; ctx.fillRect(0,0,256,256); ctx.fillStyle = "#2d1a11"; for(let i=0; i<80; i++) ctx.fillRect(Math.random()*256,0,Math.random()*4+1,256); dt.update(); return dt; },
            createStone: function(scene) { let dt = new BABYLON.DynamicTexture("dt_s", {width:256,height:256}, scene, false); let ctx = dt.getContext(); ctx.fillStyle = "#475569"; ctx.fillRect(0,0,256,256); for(let i=0; i<800; i++) { let v=50+Math.random()*30; ctx.fillStyle=`rgb(${v},${v},${v+10})`; ctx.fillRect(Math.random()*256,Math.random()*256,Math.random()*8+2,Math.random()*8+2); } dt.update(); return dt; },
            createBrick: function(scene) { let dt = new BABYLON.DynamicTexture("dt_b", {width:256,height:256}, scene, false); let ctx = dt.getContext(); ctx.fillStyle = "#64748b"; ctx.fillRect(0,0,256,256); let bw=32,bh=16,p=2; for(let y=0;y<256;y+=bh){ let o=(y/bh)%2===0?0:bw/2; for(let x=-bw;x<256;x+=bw){ ctx.fillStyle=Math.random()>0.5?"#7f1d1d":"#991b1b"; ctx.fillRect(x+o+p,y+p,bw-p*2,bh-p*2); } } dt.update(); return dt; },
            createRoof: function(scene) { let dt = new BABYLON.DynamicTexture("dt_r", {width:256,height:256}, scene, false); let ctx = dt.getContext(); ctx.fillStyle = "#1e1b4b"; ctx.fillRect(0,0,256,256); ctx.fillStyle = "#312e81"; for(let y=0;y<256;y+=16){ ctx.fillRect(0,y+14,256,2); for(let x=0;x<256;x+=16) ctx.fillRect(x+7,y,2,16); } dt.update(); return dt; },
            createTent: function(scene) { let dt = new BABYLON.DynamicTexture("dt_t", {width:256,height:256}, scene, false); let ctx = dt.getContext(); ctx.fillStyle = "#7e22ce"; ctx.fillRect(0,0,256,256); ctx.fillStyle = "#22d3ee"; for(let x=0;x<256;x+=32) ctx.fillRect(x,0,16,256); dt.update(); return dt; },
            createRoad: function(scene) { let dt = new BABYLON.DynamicTexture("dt_ro", {width:256,height:256}, scene, false); let ctx = dt.getContext(); ctx.fillStyle = "#334155"; ctx.fillRect(0,0,256,256); for(let i=0; i<300; i++) { ctx.fillStyle=Math.random()>0.5?"#1e293b":"#475569"; ctx.fillRect(Math.random()*256,Math.random()*256,Math.random()*15+5,Math.random()*10+5); } dt.update(); return dt; },
            createPath: function(scene) { let dt = new BABYLON.DynamicTexture("dt_pa", {width:256,height:256}, scene, false); let ctx = dt.getContext(); ctx.fillStyle = "rgba(100, 70, 40, 0.8)"; ctx.fillRect(0,0,256,256); dt.update(); return dt; },
            createParticleBase: function(scene) { let dt = new BABYLON.DynamicTexture("dt_p", {width:16,height:16}, scene, false); let ctx = dt.getContext(); ctx.fillStyle="#ffffff"; ctx.beginPath(); ctx.arc(8,8,6,0,Math.PI*2); ctx.fill(); dt.update(); return dt; },
            createRainDrop: function(scene) { let dt = new BABYLON.DynamicTexture("dt_rd", {width:8,height:32}, scene, false); let ctx = dt.getContext(); ctx.fillStyle="#a5f3fc"; ctx.fillRect(2,0,4,32); dt.update(); return dt; },
            createDeer: function(scene) { let dt = new BABYLON.DynamicTexture("dt_d", {width:64,height:64}, scene, false); let ctx = dt.getContext(); ctx.fillStyle="#8b5a2b"; ctx.fillRect(0,0,64,64); ctx.fillStyle="#cd853f"; for(let i=0; i<20; i++) { ctx.beginPath(); ctx.arc(Math.random()*64, Math.random()*64, Math.random()*3+1, 0, Math.PI*2); ctx.fill(); } dt.update(); return dt; }
        };