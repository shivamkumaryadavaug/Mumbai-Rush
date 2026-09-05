// game.js — core loop, scoring, difficulty, power-ups, camera, collisions
// time-of-day presets: day → evening → sunset → night (cycles with distance)
const DAY_CYCLE = [
  { hemi: 0x8fa3c8, hg: 0x3a3226, hi: 0.95, dir: 0xfff2d8, di: 0.75 }, // day
  { hemi: 0x9a8fb8, hg: 0x4a3a30, hi: 0.85, dir: 0xffd9a0, di: 0.62 }, // evening
  { hemi: 0x7a6a9a, hg: 0x3a2a30, hi: 0.70, dir: 0xff9a50, di: 0.52 }, // sunset
  { hemi: 0x2a3450, hg: 0x1a1626, hi: 0.50, dir: 0x8fa8ff, di: 0.30 }  // night
];

class Game {
  constructor() {
    this.state = 'boot';
    this.paused = false;
  }

  init() {
    const canvas = document.getElementById('c');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x1a1c26, 30, 120);
    this.camera = new THREE.PerspectiveCamera(74, window.innerWidth / window.innerHeight, 0.1, 260);
    this.baseFov = 74;

    this.hemi = new THREE.HemisphereLight(0x8fa3c8, 0x3a3226, 0.95);
    this.dir = new THREE.DirectionalLight(0xfff2d8, 0.75);
    this.dir.position.set(-6, 12, 4);
    this.scene.add(this.hemi, this.dir);
    this.cA = new THREE.Color(); this.cB = new THREE.Color();

    this.world = new World(this.scene);
    this.player = new Player(this.scene, Storage.selected, Storage.outfitOf(Storage.selected));
    this.traffic = new Traffic(this.scene);

    this.fov = this.baseFov;
    this.camX = 0; this.camY = 4.3;
    this.shakeT = 0;
    this.clock = new THREE.Clock();
    this.lastZone = -1;

    window.addEventListener('resize', () => this.onResize());
    this.onResize();

    this.reset();
    this.state = 'menu';
    UI.show('menu'); UI.updateMenu();
    this.loop();
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  reset() {
    this.player.reset();
    this.world.reset();
    this.traffic.clear();
    this.score = 0; this.dist = 0; this.coins = 0;
    this.nearMisses = 0; this.streak = 0; this.streakT = 0;
    this.mult = 1;
    this.gameTime = 0;
    this.pw = { chai: 0, express: 0, monsoon: 0 };
    this.pwMax = { chai: 6, express: 6, monsoon: 6 };
    this.shield = false;
    this.nextSpawn = 26;
    this.lastZone = -1;
    this.dead = false;
    this.powerupsUsed = 0;
    this.ranNight = false;
    this.lightningT = 0; this.boltT = 4;
    UI.clearPowers();
    document.getElementById('flash').className = '';
  }

  baseSpeed() { return 12 + Math.min(16, this.dist / 75); }
  diff() { return Math.min(1, this.dist / 1400); }
  effSpeed() {
    let s = this.baseSpeed();
    if (this.pw.chai > 0) s *= 0.55;
    if (this.pw.express > 0) s *= 1.22;
    return s;
  }
  scoreMult() { return this.mult * (this.pw.express > 0 ? 2 : 1); }

  start() {
    this.reset();
    this.state = 'playing';
    UI.show('hud');
    AudioSys.init(); AudioSys.resume(); AudioSys.applySettings(); AudioSys.startMusic(); AudioSys.startRunLoop();
    UI.popup('RUN!', 'go');
  }

  toMenu() {
    this.state = 'menu';
    AudioSys.stopRunLoop();
    this.reset();
    UI.show('menu'); UI.updateMenu();
  }

  togglePause() {
    if (this.state !== 'playing') return;
    this.paused = !this.paused;
    UI.overlay('pause', this.paused);
    if (this.paused) { AudioSys.stopMusic(); AudioSys.stopRunLoop(); }
    else { AudioSys.startMusic(); if (this.state === 'playing') AudioSys.startRunLoop(); }
  }

  gameOver() {
    if (this.dead) return;
    this.dead = true;
    this.state = 'over';
    AudioSys.crash();
    AudioSys.stopMusic();
    AudioSys.stopRunLoop();
    this.shakeT = 0.6;
    const fl = document.getElementById('flash');
    fl.className = 'red show';
    setTimeout(() => fl.className = '', 400);

    // save
    const isBest = this.score > Storage.high;
    if (isBest) Storage.high = Math.floor(this.score);
    if (this.dist > Storage.bestDist) Storage.bestDist = Math.floor(this.dist);
    Storage.addCoins(this.coins);
    const m = Storage.missions;
    m.dist = (m.dist || 0) + Math.floor(this.dist);
    m.coins = (m.coins || 0) + this.coins;
    m.nearMiss = (m.nearMiss || 0) + this.nearMisses;
    m.time = (m.time || 0) + Math.floor(this.gameTime);
    m.powerups = (m.powerups || 0) + this.powerupsUsed;
    Storage.saveMissions(m);
    const st = Storage.stats;
    st.runs++;
    st.bestCoins = Math.max(st.bestCoins, this.coins);
    st.bestNearMiss = Math.max(st.bestNearMiss, this.nearMisses);
    st.ranAtNight = st.ranAtNight || this.ranNight;
    st.powersUsed = (st.powersUsed || 0) + this.powerupsUsed;
    Storage.saveStats(st);
    checkAchievements().forEach((a, i) => {
      setTimeout(() => { UI.popup('🏆 ' + a.name + '  +' + a.reward + ' COINS', 'pw'); AudioSys.power(); }, 1200 + i * 900);
    });

    setTimeout(() => UI.gameOver(this.score, this.dist, this.coins, Storage.high), 700);
  }

  onNearMiss() {
    this.nearMisses++;
    this.streak++;
    this.streakT = 5;
    this.mult = Math.min(5, 1 + Math.floor(this.streak / 3));
    const bonus = 50 * this.scoreMult();
    this.score += bonus;
    this.shakeT = Math.max(this.shakeT, 0.15); // subtle near-miss shake
    AudioSys.nearMiss();
    UI.popup('NEAR MISS! +' + bonus, 'nm');
  }

  applyPower(type) {
    AudioSys.power();
    this.powerupsUsed++;
    const label = { chai: 'CUTTING CHAI ☕ SLOW-MO', shield: 'AUTO SHIELD 🛺 ARMED', express: 'LOCAL EXPRESS 🚆 x2 SCORE', monsoon: 'MONSOON DASH 🌧️ SPEED UP' }[type];
    UI.popup(label, 'pw');
    if (type === 'shield') { this.shield = true; UI.setPower('shield', 1); }
    else { this.pw[type] = this.pwMax[type]; if (type === 'monsoon') this.player.agility = 1.45; }
  }

  checkCollisions() {
    const pb = this.player.box();
    for (let i = this.traffic.active.length - 1; i >= 0; i--) {
      const e = this.traffic.active[i];
      if (!e.alive) continue;
      if (Math.abs(e.x - pb.x) >= (e.w + pb.w) / 2) continue;
      if (Math.abs(e.z - pb.z) >= (e.d + pb.d) / 2) continue;

      if (e.kind === 'coin') {
        this.coins++;
        this.score += 10 * this.scoreMult();
        AudioSys.coin();
        this.traffic.active.splice(i, 1); this.traffic.release(e);
        continue;
      }
      if (e.kind === 'power') {
        this.applyPower(e.type);
        this.traffic.active.splice(i, 1); this.traffic.release(e);
        continue;
      }
      // solid obstacle / vehicle — vertical overlap?
      if (pb.bottom >= e.top - 0.05 || pb.top <= e.bottom + 0.05) continue;

      if (this.shield) {
        this.shield = false;
        AudioSys.shieldPop();
        this.shakeT = 0.35;
        UI.popup('SHIELD SAVED YOU!', 'pw');
        const fl = document.getElementById('flash');
        fl.className = 'cyan show'; setTimeout(() => fl.className = '', 350);
        this.traffic.active.splice(i, 1); this.traffic.release(e);
        UI.setPower('shield', 0);
        continue;
      }
      return this.gameOver();
    }
  }

  dayPhase() { return (this.dist / 2400) % 4; } // 0 day → 1 evening → 2 sunset → 3 night
  nightFactor() {
    const p = this.dayPhase();
    if (p < 0.5) return 1 - p / 0.5;      // dawn: night fades out
    if (p < 2.6) return 0;                // day/evening/sunset
    if (p < 3.2) return (p - 2.6) / 0.6;  // dusk: night fades in
    return 1;
  }

  updateDayNight(dt) {
    const p = this.dayPhase();
    const i0 = Math.floor(p) % 4, i1 = (i0 + 1) % 4, f = p - Math.floor(p);
    const A = DAY_CYCLE[i0], B = DAY_CYCLE[i1];
    this.hemi.color.copy(this.cA.set(A.hemi)).lerp(this.cB.set(B.hemi), f);
    this.hemi.groundColor.copy(this.cA.set(A.hg)).lerp(this.cB.set(B.hg), f);
    this.hemi.intensity = A.hi + (B.hi - A.hi) * f;
    this.dir.color.copy(this.cA.set(A.dir)).lerp(this.cB.set(B.dir), f);
    let di = A.di + (B.di - A.di) * f;
    if (this.lightningT > 0) { this.lightningT -= dt; di *= 3.2; }
    this.dir.intensity = di;
  }

  updateCamera(dt) {
    const p = this.player;
    const tx = p.x * 0.55, ty = 4.3 + p.y * 0.35 - (p.sliding ? 0.35 : 0); // slide dip
    this.camX += (tx - this.camX) * Math.min(1, dt * 6);
    this.camY += (ty - this.camY) * Math.min(1, dt * 5);
    // FOV speed effect
    const speedRatio = (this.effSpeed() - 12) / 16;
    const targetFov = this.baseFov + Math.max(0, speedRatio) * 11 + (this.pw.express > 0 ? 4 : 0);
    this.fov += (targetFov - this.fov) * Math.min(1, dt * 3);
    this.camera.fov = this.fov;
    this.camera.updateProjectionMatrix();
    // shake
    let sx = 0, sy = 0;
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const m = this.shakeT * 0.5;
      sx = (Math.random() - 0.5) * m; sy = (Math.random() - 0.5) * m;
    }
    const bob = (p.grounded && !p.sliding) ? Math.sin(p.runPhase * 2) * 0.04 : 0; // running bob
    this.camera.position.set(this.camX + sx, this.camY + sy + bob, PLAYER_Z + 7.6);
    this.camera.lookAt(p.x * 0.7, 1.35 + p.y * 0.5, PLAYER_Z - 8);
  }

  update(dt) {
    if (this.state !== 'playing' || this.paused) return;
    this.gameTime += dt;
    const speed = this.effSpeed();
    this.dist += speed * dt;
    this.score += speed * dt * this.scoreMult() * 0.6;

    // streak decay
    if (this.streakT > 0) { this.streakT -= dt; if (this.streakT <= 0) { this.streak = 0; this.mult = 1; } }

    // power-up timers
    for (const k of ['chai', 'express', 'monsoon']) {
      if (this.pw[k] > 0) {
        this.pw[k] -= dt;
        if (this.pw[k] <= 0 && k === 'monsoon') this.player.agility = 1;
        UI.setPower(k, Math.max(0, this.pw[k] / this.pwMax[k]));
      }
    }

    // spawning
    this.nextSpawn -= speed * dt;
    if (this.nextSpawn <= 0) {
      this.traffic.spawnWave(this.diff());
      this.nextSpawn = 22 + Math.random() * 14 - this.diff() * 9;
    }

    this.player.update(dt, speed);
    this.updateDayNight(dt);

    // rain: monsoon zone or Monsoon Dash power-up
    const inMonsoon = Math.floor(this.dist / ZONE_LEN) % ZONES.length === 4 || this.pw.monsoon > 0;
    const night = this.nightFactor();
    if (night > 0.6) this.ranNight = true;

    // lightning during rain
    if (inMonsoon) {
      this.boltT -= dt;
      if (this.boltT <= 0) {
        this.boltT = 3 + Math.random() * 6;
        this.lightningT = 0.14;
        UI.flash('bolt');
      }
    }

    this.world.update(dt, speed, this.dist, this.scene, { night, rain: inMonsoon ? 1 : 0 });
    this.traffic.setNight(night);
    this.traffic.update(dt, speed, this);

    // run sound + speed lines
    const sr = (speed - 12) / 16;
    AudioSys.setRunIntensity(Math.max(0, Math.min(1, sr)));
    UI.speedlines(this.pw.express > 0 || sr > 0.55);
    this.checkCollisions();

    // zone banner
    const zi = Math.floor(this.dist / ZONE_LEN) % ZONES.length;
    if (zi !== this.lastZone) {
      this.lastZone = zi;
      const b = document.getElementById('banner');
      b.textContent = ZONES[zi].name;
      b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
    }

    UI.hud(this.score, this.dist, this.coins, this.scoreMult());
  }

  loop() {
    requestAnimationFrame(() => this.loop());
    const dt = Math.min(0.05, this.clock.getDelta());
    this.update(dt);
    this.updateCamera(dt);
    this.renderer.render(this.scene, this.camera);
  }
}
