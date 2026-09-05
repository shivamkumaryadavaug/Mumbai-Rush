// world.js — procedural Mumbai road segments, themed zones, day/night env, rain
const ZONE_LEN = 320;
const ZONES = [
  { name: 'CITY STREETS',  fog: 0x1a1c26, road: 0x30323a, ground: 0x3b3e46, bld: [0x8a5a3b, 0x6b7a8f, 0x9c6b4f, 0x5f6f86, 0x7d5a7a], accent: 0xffb300 },
  { name: 'FLYOVER',       fog: 0x22252e, road: 0x33363e, ground: 0x2e3038, bld: [0x555a66, 0x666c78, 0x4a4f5a, 0x707684], accent: 0x4dd0e1 },
  { name: 'MARKET',        fog: 0x261d18, road: 0x38322c, ground: 0x453b31, bld: [0xb0563a, 0xc98a2d, 0x7a4a8f, 0x3f7a52, 0xa03a50], accent: 0xff7043 },
  { name: 'COASTAL ROAD',  fog: 0x1a2733, road: 0x2e3a44, ground: 0x8a7f5a, bld: [0x9fb4c4, 0x7d95a8, 0xb8c9d6, 0x6f8ba0], accent: 0x40c4ff },
  { name: 'MONSOON CITY',  fog: 0x141a20, road: 0x262c33, ground: 0x30383f, bld: [0x4a5560, 0x3e4a55, 0x556270, 0x39434e], accent: 0x69f0ae },
  { name: 'MUMBAI NIGHT',  fog: 0x0d1020, road: 0x1e2129, ground: 0x272b34, bld: [0x2e3442, 0x38304a, 0x243040, 0x3a2e3e, 0x2a3a38], accent: 0xffd54f }
];
const SEG_LEN = 40, SEG_COUNT = 8;
const SIGNS = ['MUMBAI', 'DADAR', 'BANDRA', 'ANDHERI', 'BORIVALI', 'MARINE DRIVE'];

class World {
  constructor(scene) {
    this.scene = scene;
    this.signTex = {};
    this.signMats = {};
    this.mats = {};
    this.geoBox = new THREE.BoxGeometry(1, 1, 1);
    this.geoPlane = new THREE.PlaneGeometry(1, 1);
    this.geoCyl = new THREE.CylinderGeometry(1, 1, 1, 7);
    this.geoCone = new THREE.ConeGeometry(1, 1, 7);
    this.segments = [];
    this.zoneIdx = 0;
    this.night = 0; this.rain = 0;

    // shared night-reactive materials
    this.winMat = new THREE.MeshLambertMaterial({ color: 0x1c2230, emissive: 0xffd970, emissiveIntensity: 0 });
    this.bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
    this.headGlowMat = new THREE.MeshBasicMaterial({ color: 0xfff6c8 });
    this.winMats = []; // per-segment window meshes using winMat are shared automatically

    for (let i = 0; i < SEG_COUNT; i++) this.segments.push(this.makeSegment(i));
    this.buildSkyline();
    this.buildRain();
  }

  mat(col) {
    if (!this.mats[col]) this.mats[col] = new THREE.MeshLambertMaterial({ color: col });
    return this.mats[col];
  }
  signTexture(text) {
    if (this.signTex[text]) return this.signTex[text];
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128;
    const x = cv.getContext('2d');
    x.fillStyle = '#11131a'; x.fillRect(0, 0, 512, 128);
    x.strokeStyle = '#ffb300'; x.lineWidth = 10; x.strokeRect(8, 8, 496, 112);
    x.fillStyle = '#ffd54f'; x.font = 'bold 64px Arial';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(text, 256, 68);
    const t = new THREE.CanvasTexture(cv);
    this.signTex[text] = t;
    return t;
  }
  signMat(text) {
    if (!this.signMats[text]) this.signMats[text] = new THREE.MeshBasicMaterial({ map: this.signTexture(text) });
    return this.signMats[text];
  }

  makeSegment(idx) {
    const g = new THREE.Group();
    g.position.z = 20 - idx * SEG_LEN;
    this.scene.add(g);
    const seg = { group: g, idx };
    this.populate(seg);
    return seg;
  }

  populate(seg) {
    const g = seg.group;
    while (g.children.length) g.remove(g.children[0]);
    const zone = ZONES[this.zoneIdx % ZONES.length];
    const L = SEG_LEN, rnd = mulberry32(seg.idx * 7919 + this.zoneIdx * 131);

    const road = new THREE.Mesh(this.geoPlane, this.mat(zone.road));
    road.rotation.x = -Math.PI / 2; road.scale.set(11, L, 1);
    road.position.y = 0; g.add(road);
    for (const side of [-1, 1]) {
      const sw = new THREE.Mesh(this.geoBox, this.mat(zone.ground));
      sw.scale.set(5, 0.3, L); sw.position.set(side * 8, 0.15, 0); g.add(sw);
      const curb = new THREE.Mesh(this.geoBox, this.mat(0x4a4d55));
      curb.scale.set(0.4, 0.34, L); curb.position.set(side * 5.6, 0.17, 0); g.add(curb);
    }
    for (const dx of [-1.15, 1.15]) {
      for (let z = -L / 2 + 2; z < L / 2; z += 4.5) {
        const d = new THREE.Mesh(this.geoBox, this.mat(0xd8d8c8));
        d.scale.set(0.12, 0.02, 1.8); d.position.set(dx, 0.02, z); g.add(d);
      }
    }

    // buildings
    for (const side of [-1, 1]) {
      let z = -L / 2 + rnd() * 3;
      while (z < L / 2 - 4) {
        const w = 5 + rnd() * 6, h = 4 + rnd() * (this.zoneIdx === 0 ? 9 : 13), dep = 4 + rnd() * 4;
        const col = zone.bld[Math.floor(rnd() * zone.bld.length)];
        const b = new THREE.Mesh(this.geoBox, this.mat(col));
        b.scale.set(dep, h, w); b.position.set(side * (12.5 + dep / 2 + rnd() * 3), h / 2, z + w / 2);
        g.add(b);
        if (rnd() < 0.7) {
          const win = new THREE.Mesh(this.geoPlane, this.winMat);
          win.scale.set(w * 0.7, h * 0.55, 1);
          win.position.set(b.position.x - side * (dep / 2 + 0.02), h * 0.55, z + w / 2);
          win.rotation.y = -side * Math.PI / 2;
          g.add(win);
        }
        if (rnd() < 0.35) {
          const txt = SIGNS[Math.floor(rnd() * SIGNS.length)];
          const sm = new THREE.Mesh(this.geoPlane, this.signMat(txt));
          sm.scale.set(4.5, 1.1, 1);
          sm.position.set(b.position.x - side * (dep / 2 + 0.06), Math.min(h - 0.8, 3.2), z + w / 2);
          sm.rotation.y = -side * Math.PI / 2;
          g.add(sm);
        }
        z += w + 1 + rnd() * 3;
      }
    }

    // street lights
    for (let z = -L / 2 + 5; z < L / 2; z += 15) {
      const side = (Math.floor(z / 15) % 2 === 0) ? -1 : 1;
      const pole = new THREE.Mesh(this.geoCyl, this.mat(0x3a3f47));
      pole.scale.set(0.09, 4.6, 0.09); pole.position.set(side * 5.9, 2.3, z); g.add(pole);
      const arm = new THREE.Mesh(this.geoBox, this.mat(0x3a3f47));
      arm.scale.set(1.4, 0.08, 0.08); arm.position.set(side * 5.3, 4.55, z); g.add(arm);
      const bulb = new THREE.Mesh(this.geoBox, this.bulbMat);
      bulb.scale.set(0.3, 0.1, 0.22); bulb.position.set(side * 4.7, 4.48, z); g.add(bulb);
    }

    // zone flavour
    const zIdx = this.zoneIdx % ZONES.length;
    if (zIdx === 1 && seg.idx % 2 === 0) {
      const slab = new THREE.Mesh(this.geoBox, this.mat(0x4a4e58));
      slab.scale.set(14, 0.6, L); slab.position.set(0, 5.6, 0); g.add(slab);
      for (const px of [-4, 4]) {
        const pil = new THREE.Mesh(this.geoCyl, this.mat(0x545862));
        pil.scale.set(0.5, 5.6, 0.5); pil.position.set(px, 2.8, 0); g.add(pil);
      }
      const rail = new THREE.Mesh(this.geoBox, this.mat(0x666c78));
      rail.scale.set(14, 0.7, 0.2); rail.position.set(0, 6.25, -L / 2 + 1); g.add(rail);
    }
    if (zIdx === 2) {
      for (let z = -L / 2 + 4; z < L / 2 - 2; z += 6 + rnd() * 3) {
        const side = rnd() < 0.5 ? -1 : 1;
        const awn = new THREE.Mesh(this.geoBox, this.mat([0xd84315, 0xf9a825, 0x2e7d32, 0x8e24aa][Math.floor(rnd() * 4)]));
        awn.scale.set(2.2, 0.12, 2.6); awn.rotation.z = side * 0.28;
        awn.position.set(side * 7, 2.4, z); g.add(awn);
        const stall = new THREE.Mesh(this.geoBox, this.mat(0x5a4632));
        stall.scale.set(1.4, 1.1, 2.2); stall.position.set(side * 8.6, 0.85, z); g.add(stall);
      }
    }
    if (zIdx === 3) {
      const sea = new THREE.Mesh(this.geoPlane, this.mat(0x155a80));
      sea.rotation.x = -Math.PI / 2; sea.scale.set(30, L, 1);
      sea.position.set(22, 0.05, 0); g.add(sea);
      for (let z = -L / 2 + 3; z < L / 2; z += 9 + rnd() * 4) {
        const tr = new THREE.Mesh(this.geoCyl, this.mat(0x7a5a3a));
        tr.scale.set(0.14, 3, 0.14); tr.position.set(7.6, 1.5, z); g.add(tr);
        const top = new THREE.Mesh(this.geoCone, this.mat(0x2e8b57));
        top.scale.set(1.5, 1.1, 1.5); top.position.set(7.6, 3.5, z); g.add(top);
      }
    }
    if (zIdx === 4) {
      // monsoon: wet dark road + puddles
      for (let i = 0; i < 4; i++) {
        const p = new THREE.Mesh(this.geoPlane, this.mat(0x1c2a38));
        p.rotation.x = -Math.PI / 2;
        p.scale.set(1.5 + rnd() * 2, 2.5 + rnd() * 3, 1);
        p.position.set(-4 + rnd() * 8, 0.025, -L / 2 + rnd() * L); g.add(p);
      }
    }
    if (zIdx === 5) {
      // night: lit shopfront strips + neon glow signs
      for (let z = -L / 2 + 4; z < L / 2 - 2; z += 8 + rnd() * 4) {
        const side = rnd() < 0.5 ? -1 : 1;
        const strip = new THREE.Mesh(this.geoPlane, this.headGlowMat);
        strip.scale.set(2.4, 0.5, 1);
        strip.position.set(side * 11.9, 1.6 + rnd() * 1.5, z);
        strip.rotation.y = -side * Math.PI / 2;
        g.add(strip);
      }
    }
    // vegetation
    for (let z = -L / 2 + 4; z < L / 2; z += 10 + rnd() * 6) {
      const side = rnd() < 0.5 ? -1 : 1;
      const bush = new THREE.Mesh(this.geoCone, this.mat(0x2f7a3f));
      bush.scale.set(0.7 + rnd() * 0.6, 1 + rnd(), 0.7 + rnd() * 0.6);
      bush.position.set(side * (7 + rnd() * 1.5), 0.5, z); g.add(bush);
    }
  }

  buildSkyline() {
    this.skyline = new THREE.Group();
    const rnd = mulberry32(42);
    for (let i = 0; i < 34; i++) {
      const a = (i / 34) * Math.PI * 2;
      const r = 110 + rnd() * 60;
      const h = 12 + rnd() * 38;
      const b = new THREE.Mesh(this.geoBox, this.mat(0x22262f));
      b.scale.set(8 + rnd() * 10, h, 8 + rnd() * 10);
      b.position.set(Math.cos(a) * r, h / 2 - 2, Math.sin(a) * r - 40);
      this.skyline.add(b);
    }
    this.scene.add(this.skyline);
  }

  buildRain() {
    const N = 380;
    const pos = new Float32Array(N * 3);
    this.rainVel = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = -10 + Math.random() * 20;
      pos[i * 3 + 1] = Math.random() * 16;
      pos[i * 3 + 2] = -70 + Math.random() * 90;
      this.rainVel[i] = 16 + Math.random() * 8;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.rainPts = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0x9ab8d8, size: 0.14, transparent: true, opacity: 0.55, sizeAttenuation: true
    }));
    this.rainPts.visible = false;
    this.scene.add(this.rainPts);
  }

  zoneAt(dist) { return ZONES[Math.floor(dist / ZONE_LEN) % ZONES.length]; }

  update(dt, speed, dist, scene, env) {
    env = env || {};
    const zoneTarget = Math.floor(dist / ZONE_LEN);
    this.zoneIdx = zoneTarget;

    // smooth night / rain factors
    const nightT = (env.night !== undefined) ? env.night : 0;
    const rainT  = (env.rain  !== undefined) ? env.rain  : (this.zoneIdx % ZONES.length === 4 ? 1 : 0);
    this.night += (nightT - this.night) * Math.min(1, dt * 1.2);
    this.rain  += (rainT  - this.rain)  * Math.min(1, dt * 1.2);

    // night-reactive materials
    this.winMat.emissiveIntensity = this.night * 0.85;
    this.bulbMat.color.setHex(this.night > 0.4 ? 0xfff6c0 : 0xffe9a8);

    if (scene.fog) {
      const c = new THREE.Color(this.zoneAt(dist).fog);
      c.multiplyScalar(1 - this.night * 0.35);
      scene.fog.color.lerp(c, dt * 0.8);
    }

    // rain particles
    if (this.rain > 0.03) {
      this.rainPts.visible = true;
      this.rainPts.material.opacity = 0.55 * this.rain;
      const p = this.rainPts.geometry.attributes.position.array;
      const n = p.length / 3;
      for (let i = 0; i < n; i++) {
        p[i * 3 + 1] -= (this.rainVel[i] + speed * 0.4) * dt;
        if (p[i * 3 + 1] < 0) {
          p[i * 3 + 1] = 12 + Math.random() * 5;
          p[i * 3] = -10 + Math.random() * 20;
          p[i * 3 + 2] = -70 + Math.random() * 90;
        }
      }
      this.rainPts.geometry.attributes.position.needsUpdate = true;
    } else this.rainPts.visible = false;

    for (const seg of this.segments) {
      seg.group.position.z += speed * dt;
      if (seg.group.position.z > SEG_LEN + 20) {
        let minZ = Infinity;
        for (const s of this.segments) minZ = Math.min(minZ, s.group.position.z);
        seg.group.position.z = minZ - SEG_LEN;
        this.populate(seg);
      }
    }
  }

  reset() {
    this.zoneIdx = 0;
    this.night = 0; this.rain = 0;
    this.rainPts.visible = false;
    this.segments.forEach((seg, i) => {
      seg.group.position.z = 20 - i * SEG_LEN;
      this.populate(seg);
    });
  }
}

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
