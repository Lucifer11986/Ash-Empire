// sfx.js — Sound System
        window.Sfx = {
            ctx: null, rainNode: null, rainGain: null, masterVolume: 0.5, enabled: true,
            init() { if(!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); },
            setVolume(val) { this.masterVolume = parseFloat(val); },
            toggleSound(active) { this.enabled = active; if(!active && this.rainNode) this.toggleRain(false); else if(active && GameState.weatherTimer > 0) this.toggleRain(true); },
            play(freq, type, dur, vol=0.1) {
                if(!this.ctx || !this.enabled) return;
                let osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
                osc.type = type; osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
                gain.gain.setValueAtTime(vol * this.masterVolume, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + dur);
                osc.connect(gain); gain.connect(this.ctx.destination);
                osc.start(); osc.stop(this.ctx.currentTime + dur);
            },
            noise(dur, vol=0.1, lpFreq=1000) {
                if(!this.ctx || !this.enabled) return;
                let buf = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
                let data = buf.getChannelData(0);
                for(let i=0; i<data.length; i++) data[i] = Math.random() * 2 - 1;
                let n = this.ctx.createBufferSource(); n.buffer = buf;
                let f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lpFreq;
                let g = this.ctx.createGain(); g.gain.setValueAtTime(vol * this.masterVolume, this.ctx.currentTime);
                g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + dur);
                n.connect(f); f.connect(g); g.connect(this.ctx.destination);
                n.start();
            },
            click() { this.play(800, 'sine', 0.1, 0.05); },
            error() { this.play(150, 'sawtooth', 0.3, 0.1); },
            build() { this.noise(0.2, 0.3, 500); this.play(100, 'square', 0.2, 0.2); },
            chop() { this.noise(0.1, 0.05, 800); },
            mine() { this.noise(0.1, 0.05, 300); this.play(200, 'triangle', 0.1, 0.05); },
            thunder() { this.noise(3.5, 0.8, 300); },
            toggleRain(active) {
                if(!this.ctx) return;
                if(active && !this.rainNode && this.enabled) {
                    let buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
                    let data = buf.getChannelData(0);
                    for(let i=0; i<data.length; i++) data[i] = Math.random() * 2 - 1;
                    this.rainNode = this.ctx.createBufferSource(); this.rainNode.buffer = buf; this.rainNode.loop = true;
                    let f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400;
                    this.rainGain = this.ctx.createGain(); this.rainGain.gain.value = 0.05 * this.masterVolume;
                    this.rainNode.connect(f); f.connect(this.rainGain); this.rainGain.connect(this.ctx.destination);
                    this.rainNode.start();
                } else if(!active && this.rainNode) {
                    this.rainNode.stop(); this.rainNode = null;
                }
            }
        };