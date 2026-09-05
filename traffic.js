// traffic.js — pooled vehicles, obstacles, coins & power-ups with safe spawn logic
const SPAWN_Z = -145, KILL_Z = 22;

class Traffic {
  constructor(scene) {
    this.scene = scene;
    this.active = [];
    this.pools = {};
    this.geo = new THREE.BoxGeometry(1, 1, 1);
    this.coinGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.08, 10);
    this.coinMat = new THREE.MeshLambertMaterial({ color: 0xffd54f, emissive: 0x7a5c00 });
    this.powerMats = {
      chai:    new THREE.MeshLambertMaterial({ color: 0xb5651d, emissive: 0x3a2005 }),
      shield:  new THREE.MeshLambertMaterial({ color: 0x4dd0e1, emissive: 0x0a3a44 }),
      express: new THREE.MeshLambertMaterial({ color: 0xd63a6b, emissive: 0x440a1e }),
      monsoon: new THREE.MeshLambertMaterial({ color: 0x69f0ae, emissive: 0x0a4426 })
    };
    this.mats = {};
    this.headMat = new THREE.MeshBasicMaterial({ color: 0xfff6c8 });
    this.tailMat = new THREE.MeshBasicMaterial({ color: 0xff3524 });
    this.litMeshes = [];
    this.nightOn = false;
  }
  mat(col) {
    if (!this.mats[col]) this.mats[col] = new THREE.MeshLambertMaterial({ color: col });
    return this.mats[col];
  }

  // ---------- mesh factories ----------
  make(kind) {
    if (this.pools[kind] && this.pools[kind].length) {
      const m = this.pools[kind].pop(); m.visible = true; return m;
    }
    const g = new THREE.Group();
    const B = (w, h, d, col, x, y, z) => {
      const m = new THREE.Mesh(this.geo, this.mat(col));
      m.scale.set(w, h, d); m.position.set(x, y, z); g.add(m); return m;
    };
    let w = 1.7, h = 1.3, d = 3.4;
    switch (kind) {
      case 'taxi': // Kaali-Peeli: black body, yellow roof
        B(1.7, 0.55, 3.6, 0x141414, 0, 0.45, 0);
        B(1.6, 0.55, 2.2, 0xf2c21b, 0, 1.0, -0.1);
        B(0.5, 0.18, 0.4, 0xf2c21b, 0, 1.36, 0);
        h = 1.45; d = 3.6; break;
      case 'rickshaw':
        B(1.3, 0.5, 2.4, 0x141414, 0, 0.4, 0);
        B(1.25, 0.65, 2.0, 0xf2c21b, 0, 0.98, 0.1);
        B(1.1, 0.5, 0.06, 0x223, 0, 0.95, 1.16);
        h = 1.55; d = 2.5; w = 1.35; break;
      case 'bus':
        B(2.4, 2.1, 6.2, 0xb03030, 0, 1.35, 0);
        B(2.42, 0.5, 6.0, 0x20242c, 0, 1.9, 0);
        B(2.42, 0.4, 6.22, 0xe8e0c8, 0, 0.75, 0);
        h = 2.5; d = 6.2; w = 2.45; break;
      case 'car': {
        const col = [0x8a8f99, 0x3e5f8a, 0x7a3a3a, 0x3a6b4f][Math.floor(Math.random() * 4)];
        B(1.7, 0.55, 3.5, col, 0, 0.42, 0);
        B(1.55, 0.5, 1.9, col, 0, 0.93, -0.1);
        h = 1.35; d = 3.5; break;
      }
      case 'bike':
        B(0.55, 0.5, 2.1, 0x8a2020, 0, 0.65, 0);
        B(0.4, 0.55, 0.5, 0x22262e, 0, 1.15, -0.3);
        B(0.7, 0.08, 0.3, 0x444a55, 0, 1.05, 0.75);
        h = 1.35; d = 2.2; w = 0.9; break;
      case 'truck':
        B(2.3, 1.3, 1.8, 0x2a5a8a, 0, 1.0, 2.2);
        B(2.4, 2.1, 4.4, 0x4a7a3a, 0, 1.55, -1.0);
        h = 2.6; d = 6.0; w = 2.4; break;
      case 'barricade': // low striped barrier — jump over
        B(1.9, 0.35, 0.3, 0xf2f2f2, 0, 0.75, 0);
        B(1.9, 0.35, 0.32, 0xd84315, 0, 0.42, 0);
        B(0.15, 0.9, 0.15, 0x555a63, -0.8, 0.45, 0);
        B(0.15, 0.9, 0.15, 0x555a63, 0.8, 0.45, 0);
        h = 1.0; d = 0.5; w = 2.0; break;
      case 'barrier': // tall construction wall — lane change only
        B(2.1, 2.2, 0.4, 0xc98a2d, 0, 1.1, 0);
        B(2.12, 0.35, 0.42, 0x22262e, 0, 1.9, 0);
        h = 2.2; d = 0.5; w = 2.15; break;
      case 'overhead': // metro bar — slide under (clearance 1.05)
        B(0.18, 2.4, 0.18, 0x666c78, -1.05, 1.2, 0);
        B(0.18, 2.4, 0.18, 0x666c78, 1.05, 1.2, 0);
        B(2.3, 1.15, 0.35, 0x37474f, 0, 1.7, 0);
        B(2.32, 0.25, 0.37, 0xff5252, 0, 1.2, 0);
        h = 2.3; d = 0.5; w = 2.3; break;
      case 'coin': {
        const m = new THREE.Mesh(this.coinGeo, this.coinMat);
        m.rotation.x = Math.PI / 2;
        const grp = new THREE.Group(); grp.add(m);
        g.add = null; // not used; coin built separately
        return this.finishCoin(grp);
      }
    }
    // headlights & taillights (visible at night)
    if (['taxi', 'rickshaw', 'bus', 'car', 'bike', 'truck'].includes(kind)) {
      const fz = d / 2 - 0.04, bz = -d / 2 + 0.04, hy = Math.min(h * 0.5, 0.95), hw = w * 0.3;
      const mk = (m, x, y, z) => { const q = new THREE.Mesh(this.geo, m); q.scale.set(0.22, 0.13, 0.08); q.position.set(x, y, z); g.add(q); return q; };
      const lights = [mk(this.headMat, -hw, hy, fz), mk(this.headMat, hw, hy, fz),
                      mk(this.tailMat, -hw, hy, bz), mk(this.tailMat, hw, hy, bz)];
      lights.forEach(l => l.visible = this.nightOn); // respect night if created mid-night
      g.userData.lights = lights;
      this.litMeshes.push(g);
    }
    g.userData.w = w; g.userData.h = h; g.userData.d = d;
    this.scene.add(g);
    return g;
  }

  setNight(f) {
    const on = f > 0.35;
    if (on === this.nightOn) return;
    this.nightOn = on;
    for (const m of this.litMeshes) {
      if (m.userData.lights) m.userData.lights.forEach(l => l.visible = on);
    }
  }
  finishCoin(grp) { this.scene.add(grp); grp.userData = { w: 0.6, h: 0.6, d: 0.2 }; return grp; }
  makeCoin() {
    if (this.pools.coin && this.pools.coin.length) { const m = this.pools.coin.pop(); m.visible = true; return m; }
    const m = new THREE.Mesh(this.coinGeo, this.coinMat);
    m.rotation.x = Math.PI / 2;
    const grp = new THREE.Group(); grp.add(m);
    grp.userData = { w: 0.7, h: 0.7, d: 0.25 };
    this.scene.add(grp); return grp;
  }
  makePower(type) {
    const key = 'power_' + type;
    if (this.pools[key] && this.pools[key].length) { const m = this.pools[key].pop(); m.visible = true; return m; }
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 0), this.powerMats[type]);
    const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 0),
      new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.35 }));
    const grp = new THREE.Group(); grp.add(core, shell);
    grp.userData = { w: 0.9, h: 0.9, d: 0.9, shell };
    this.scene.add(grp); return grp;
  }

  release(e) {
    e.alive = false;
    e.mesh.visible = false;
    e.mesh.position.z = -999;
    (this.pools[e.kind] = this.pools[e.kind] || []).push(e.mesh);
  }
  clear() { this.active.slice().forEach(e => this.release(e)); this.active.length = 0; }

  spawnEntity(kind, lane, z, extraV, type) {
    const mesh = kind === 'coin' ? this.makeCoin() : kind === 'power' ? this.makePower(type) : this.make(kind);
    const u = mesh.userData;
    const e = {
      kind, type: type || null, lane, mesh,
      x: LANE_X[lane], z, prevZ: z,
      w: u.w, h: u.h, d: u.d,
      bottom: kind === 'overhead' ? 1.05 : 0,
      top: kind === 'overhead' ? 2.25 : u.h,
      extraV: extraV || 0, alive: true,
      spin: kind === 'coin' || kind === 'power', passed: false, counted: false
    };
    mesh.position.set(e.x, kind === 'coin' ? 0.9 : (kind === 'power' ? 1.1 : 0), z);
    this.active.push(e);
    return e;
  }

  // ---------- wave spawning (always leaves a path) ----------
  spawnWave(diff) {
    const r = Math.random();
    const z = SPAWN_Z;
    const lanes = [0, 1, 2].sort(() => Math.random() - 0.5);
    const free = lanes[0], l1 = lanes[1], l2 = lanes[2];
    const roll = Math.random();

    if (roll < 0.22) {
      // single obstacle, coins in free lane
      this.spawnEntity(Math.random() < 0.5 ? 'barricade' : 'barrier', l1, z);
      this.coinLine(free, z, 6);
    } else if (roll < 0.42) {
      // one vehicle (oncoming feel)
      this.spawnEntity(['taxi', 'rickshaw', 'car', 'bike'][Math.floor(Math.random() * 4)], l1, z, 2 + Math.random() * 4);
    } else if (roll < 0.58) {
      // two-lane block, reward lane
      const k1 = Math.random() < 0.5 ? 'barricade' : 'barrier';
      const k2 = ['taxi', 'rickshaw', 'car'][Math.floor(Math.random() * 3)];
      this.spawnEntity(k1, l1, z);
      this.spawnEntity(k2, l2, z, 1 + Math.random() * 3);
      this.coinLine(free, z, 7);
      if (Math.random() < 0.4) this.coinArc(free, z - 10);
    } else if (roll < 0.72) {
      // overhead bar — slide under, coins beyond
      this.spawnEntity('overhead', l1, z);
      this.coinLine(l1, z - 6, 5);
      if (Math.random() < 0.5) this.spawnEntity('rickshaw', l2, z, 3);
    } else if (roll < 0.86 && diff > 0.25) {
      // heavy traffic cluster: bus/truck + gap lane
      this.spawnEntity(Math.random() < 0.5 ? 'bus' : 'truck', l1, z, -1);
      this.spawnEntity(['taxi', 'car', 'bike'][Math.floor(Math.random() * 3)], l2, z + 8, 2 + Math.random() * 3);
      this.coinZigzag(free, z);
    } else {
      // jump barricade with coin arc over it
      this.spawnEntity('barricade', l1, z);
      this.coinArc(l1, z);
      if (Math.random() < 0.5) this.spawnEntity('car', free, z - 12, 2);
    }

    // occasional power-up far ahead in a random lane
    if (Math.random() < 0.12) {
      const types = ['chai', 'shield', 'express', 'monsoon'];
      this.spawnEntity('power', Math.floor(Math.random() * 3), z - 30, 0, types[Math.floor(Math.random() * types.length)]);
    }
  }

  coinLine(lane, zStart, n) {
    for (let i = 0; i < n; i++) this.spawnEntity('coin', lane, zStart - i * 2.2);
  }
  coinArc(lane, zCenter) {
    const ys = [0.5, 1.1, 1.6, 1.1, 0.5];
    for (let i = 0; i < 5; i++) {
      const e = this.spawnEntity('coin', lane, zCenter - 6 + i * 3);
      e.mesh.position.y = ys[i];
      e.floatY = ys[i];
    }
  }
  coinZigzag(lane, zStart) {
    const seq = [lane, (lane + 1) % 3, (lane + 2) % 3, (lane + 1) % 3, lane];
    for (let i = 0; i < 5; i++) this.spawnEntity('coin', seq[i], zStart - i * 3);
  }

  update(dt, speed, game) {
    const pz = PLAYER_Z;
    for (let i = this.active.length - 1; i >= 0; i--) {
      const e = this.active[i];
      e.prevZ = e.z;
      e.z += (speed + e.extraV) * dt;
      e.mesh.position.z = e.z;
      if (e.spin) {
        e.mesh.rotation.y += dt * 4;
        if (e.floatY) e.mesh.position.y = e.floatY + Math.sin(performance.now() / 300 + e.z) * 0.08;
        else if (e.kind === 'power') {
          e.mesh.position.y = 1.1 + Math.sin(performance.now() / 350 + e.z) * 0.15;
          if (e.mesh.userData.shell) e.mesh.userData.shell.rotation.y -= dt * 1.5;
        }
      }
      // near-miss: vehicle just passed player, close horizontally
      if (!e.passed && e.prevZ < pz && e.z >= pz) {
        e.passed = true;
        if ((e.kind === 'taxi' || e.kind === 'rickshaw' || e.kind === 'car' || e.kind === 'bike' ||
             e.kind === 'bus' || e.kind === 'truck') && Math.abs(e.x - game.player.x) < 2.6) {
          game.onNearMiss();
        }
      }
      if (e.z > KILL_Z) { this.active.splice(i, 1); this.release(e); }
    }
  }
}
