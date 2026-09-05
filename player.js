// player.js — Aarav & friends: stylized low-poly runner with procedural animation
const LANE_X = [-2.3, 0, 2.3];
const PLAYER_Z = 6;

class Player {
  constructor(scene, charId, outfitIdx) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.lane = 1;
    this.x = 0; this.y = 0; this.vy = 0;
    this.grounded = true;
    this.slideT = 0;
    this.runPhase = 0;
    this.agility = 1; // monsoon dash buff
    this.build(charId, outfitIdx);
  }

  rebuild() { this.build(Storage.selected, Storage.outfitOf(Storage.selected)); }

  build(charId, outfitIdx) {
    if (this.body) this.group.remove(this.body);
    const c = CHARACTERS.find(x => x.id === charId) || CHARACTERS[0];
    this.char = c;
    const shirtCol = (outfitIdx >= 0) ? OUTFIT_COLORS[outfitIdx % OUTFIT_COLORS.length] : c.shirt;
    const M = (col) => new THREE.MeshLambertMaterial({ color: col });
    const box = (w, h, d, col, x, y, z) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(col));
      m.position.set(x, y, z); return m;
    };
    const g = new THREE.Group(); // origin at feet
    this.legL = new THREE.Group(); this.legL.position.set(-0.13, 0.62, 0);
    this.legL.add(box(0.17, 0.6, 0.17, c.pants, 0, -0.3, 0));
    this.legL.add(box(0.19, 0.1, 0.28, 0xf0f0f0, 0, -0.58, 0.05));
    this.legR = this.legL.clone(); this.legR.position.x = 0.13;
    this.armL = new THREE.Group(); this.armL.position.set(-0.36, 1.16, 0);
    this.armL.add(box(0.13, 0.5, 0.13, c.shirt, 0, -0.22, 0));
    this.armL.add(box(0.12, 0.14, 0.12, c.skin, 0, -0.52, 0));
    this.armR = this.armL.clone(); this.armR.position.x = 0.36;
    const torso = box(0.58, 0.62, 0.34, shirtCol, 0, 0.94, 0);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.34), M(c.skin));
    head.position.set(0, 1.5, 0);
    const hair = box(0.38, 0.14, 0.36, c.hair, 0, 1.72, -0.01);
    const backpack = box(0.4, 0.44, 0.16, 0xf2a81d, 0, 0.98, -0.26);
    g.add(this.legL, this.legR, this.armL, this.armR, torso, head, hair, backpack);
    // accessory (cosmetic, per character)
    const acc = c.accessory || 'none';
    if (acc === 'cap') {
      g.add(box(0.4, 0.1, 0.38, 0xeceff1, 0, 1.74, 0));
      g.add(box(0.38, 0.05, 0.22, 0xeceff1, 0, 1.7, 0.28));
    } else if (acc === 'helmet') {
      const hm = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), M(0xd84315));
      hm.position.set(0, 1.52, 0); g.add(hm);
    } else if (acc === 'tie') {
      g.add(box(0.1, 0.42, 0.04, 0xb71c1c, 0, 1.02, 0.19));
    } else if (acc === 'beret') {
      const bm = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.09, 8), M(0x37474f));
      bm.position.set(0.04, 1.76, 0); bm.rotation.z = -0.15; g.add(bm);
    }
    this.body = g;
    this.group.add(g);
  }

  move(dir) {
    const nl = Math.min(2, Math.max(0, this.lane + dir));
    if (nl !== this.lane) { this.lane = nl; return true; }
    return false;
  }
  jump() {
    if (this.grounded) { this.vy = 10.8 * (this.agility > 1 ? 1.12 : 1); this.grounded = false; return true; }
    return false;
  }
  slide() {
    if (this.grounded) { this.slideT = 0.7; return true; }
    // fast-fall into slide when airborne
    this.vy = Math.min(this.vy, -14); return true;
  }
  get sliding() { return this.slideT > 0; }
  get height() { return this.sliding ? 0.95 : 1.78; }

  update(dt, speed) {
    // lane lerp
    const target = LANE_X[this.lane];
    this.x += (target - this.x) * Math.min(1, dt * 9 * this.agility);
    // vertical
    if (!this.grounded) {
      this.vy -= 30 * dt;
      this.y += this.vy * dt;
      if (this.y <= 0) { this.y = 0; this.vy = 0; this.grounded = true; }
    }
    if (this.slideT > 0) this.slideT -= dt;
    this.group.position.set(this.x, this.y, PLAYER_Z);

    // procedural animation
    this.runPhase += dt * speed * 1.05;
    const s = Math.sin(this.runPhase), c = Math.cos(this.runPhase);
    if (!this.grounded) {
      this.legL.rotation.x = -0.9; this.legR.rotation.x = 0.5;
      this.armL.rotation.x = -2.4; this.armR.rotation.x = -2.0;
      this.body.rotation.x = 0.15;
    } else if (this.sliding) {
      this.body.rotation.x = -1.15;
      this.body.position.y = -0.28;
      this.legL.rotation.x = 0.4; this.legR.rotation.x = 1.1;
      this.armL.rotation.x = -0.6; this.armR.rotation.x = -0.4;
    } else {
      this.body.rotation.x = 0.12;
      this.body.position.y = Math.abs(c) * 0.07;
      this.legL.rotation.x = s * 1.05;
      this.legR.rotation.x = -s * 1.05;
      this.armL.rotation.x = -s * 0.9;
      this.armR.rotation.x = s * 0.9;
    }
  }

  box() {
    return { x: this.x, z: PLAYER_Z, w: 0.85, d: 0.6, bottom: this.y, top: this.y + this.height };
  }

  reset() {
    this.lane = 1; this.x = 0; this.y = 0; this.vy = 0;
    this.grounded = true; this.slideT = 0; this.agility = 1;
  }
}
