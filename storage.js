// storage.js — localStorage save system (corruption-safe)
const Storage = {
  key(k) { return 'mumbaiRush.' + k; },

  // parse safely; merge plain-object defaults so missing/corrupt fields heal
  get(k, d) {
    try {
      const v = localStorage.getItem(this.key(k));
      if (v === null) return d;
      const p = JSON.parse(v);
      if (p === null || p === undefined) return d;
      if (d && typeof d === 'object' && !Array.isArray(d) && typeof p === 'object' && !Array.isArray(p)) {
        return Object.assign({}, d, p);
      }
      if (Array.isArray(d) && !Array.isArray(p)) return d;
      return p;
    } catch (e) { return d; }
  },
  set(k, v) { try { localStorage.setItem(this.key(k), JSON.stringify(v)); } catch (e) {} },
  add(k, n) { this.set(k, this.get(k, 0) + n); },

  get high()      { return this.get('high', 0); },
  set high(v)     { this.set('high', Math.floor(v)); },
  get bestDist()  { return this.get('bestDist', 0); },
  set bestDist(v) { this.set('bestDist', Math.floor(v)); },
  get totalCoins(){ return this.get('totalCoins', 0); },
  addCoins(n)     { this.add('totalCoins', Math.floor(n)); },

  get settings()  { return this.get('settings', { music: true, sfx: true, musicVol: 70, sfxVol: 80 }); },
  set settings(s) { this.set('settings', s); },

  get unlocked()  { return this.get('unlocked', ['aarav']); },
  unlock(id)      { const u = this.unlocked; if (!u.includes(id)) u.push(id); this.set('unlocked', u); },
  get selected()  { return this.get('selected', 'aarav'); },
  set selected(v) { this.set('selected', v); },

  // outfit color index per character
  get outfits()   { return this.get('outfits', {}); },
  setOutfit(charId, idx) { const o = this.outfits; o[charId] = idx; this.set('outfits', o); },
  outfitOf(charId) { return (this.outfits[charId] !== undefined) ? this.outfits[charId] : -1; },

  // missions: progress counters + claimed flags
  get missions()  { return this.get('missions', { dist: 0, coins: 0, nearMiss: 0, time: 0, powerups: 0, claimed: {} }); },
  saveMissions(m) { this.set('missions', m); },
  claimMission(id) {
    const m = this.missions;
    if (m.claimed[id]) return 0;
    const def = MISSIONS.find(x => x.id === id);
    if (!def || (m[id] || 0) < def.target) return 0;
    m.claimed[id] = true; this.saveMissions(m);
    this.addCoins(def.reward);
    return def.reward;
  },

  // lifetime stats for achievements
  get stats() { return this.get('stats', { runs: 0, bestCoins: 0, bestNearMiss: 0, ranAtNight: false, powersUsed: 0 }); },
  saveStats(s) { this.set('stats', s); },

  get achievements() { return this.get('achievements', {}); },
  unlockAchievement(id) {
    const a = this.achievements;
    if (a[id]) return false;
    a[id] = Date.now(); this.set('achievements', a);
    return true;
  }
};

// ---------------- characters ----------------
const OUTFIT_COLORS = [0x2f6fd6, 0xd63a6b, 0x27a35c, 0xf2a81d, 0x8e24aa, 0x00acc1, 0xef6c00, 0xec407a];

const CHARACTERS = [
  { id: 'aarav',    name: 'AARAV',          desc: 'College sprinter from Dadar',      cost: 0,    shirt: 0x2f6fd6, pants: 0x333a45, skin: 0xc98d5f, hair: 0x1c1c22, accessory: 'none'  },
  { id: 'meera',    name: 'MEERA',          desc: 'Marathon queen of Marine Drive',   cost: 250,  shirt: 0xd63a6b, pants: 0x23272e, skin: 0xb87a4e, hair: 0x2a160c, accessory: 'none'  },
  { id: 'kabir',    name: 'KABIR',          desc: 'Bandra street cyclist',            cost: 500,  shirt: 0x27a35c, pants: 0x3a3f4a, skin: 0xa9713f, hair: 0x111111, accessory: 'cap'   },
  { id: 'zoya',     name: 'ZOYA',           desc: 'Night-shift dabbawala',            cost: 1000, shirt: 0xf2a81d, pants: 0x2b313c, skin: 0xd09b6c, hair: 0x241a12, accessory: 'none'  },
  { id: 'rider',    name: 'DELIVERY RIDER', desc: 'Fastest delivery in Andheri',      cost: 600,  shirt: 0xff7043, pants: 0x37474f, skin: 0xb98050, hair: 0x14100c, accessory: 'helmet'},
  { id: 'commuter', name: 'OFFICE COMMUTER',desc: 'Local train veteran',              cost: 400,  shirt: 0xeceff1, pants: 0x263238, skin: 0xc98d5f, hair: 0x201812, accessory: 'tie'   },
  { id:'cricketer',name: 'CRICKET PLAYER', desc: 'Gully cricket legend',             cost: 800,  shirt: 0x1b5e20, pants: 0xf5f5f5, skin: 0xa9713f, hair: 0x0c0c0c, accessory: 'cap'   },
  { id: 'cyclist',  name: 'CYCLIST',        desc: 'Coastal road racer',               cost: 900,  shirt: 0x00acc1, pants: 0x21262e, skin: 0xd09b6c, hair: 0x3a2a1a, accessory: 'cap'   },
  { id: 'artist',   name: 'STREET ARTIST',  desc: 'Paints the kala ghoda walls',      cost: 1500, shirt: 0x8e24aa, pants: 0x3e2723, skin: 0xb87a4e, hair: 0x502a16, accessory: 'beret' }
];

// ---------------- missions ----------------
const MISSIONS = [
  { id: 'dist',     name: 'LOCAL TRAVELLER', desc: 'Run 2,000m in total',          target: 2000,  reward: 150 },
  { id: 'coins',    name: 'COIN WALA',       desc: 'Collect 150 coins in total',   target: 150,   reward: 150 },
  { id: 'nearMiss', name: 'CLOSE SHAVE',     desc: 'Score 10 near misses total',   target: 10,    reward: 200 },
  { id: 'time',     name: 'TIME PASS',       desc: 'Survive 3 minutes in total',   target: 180,   reward: 250 },
  { id: 'powerups', name: 'POWER PLAYER',    desc: 'Use 5 power-ups in total',     target: 5,     reward: 250 }
];

// ---------------- achievements ----------------
const ACHIEVEMENTS = [
  { id: 'first',    name: 'FIRST RUN',       desc: 'Finish your first run',              icon: '🏃', reward: 100, metric: ['runs', 1] },
  { id: 'm1000',    name: '1000M RUNNER',    desc: 'Run 1,000m in a single run',         icon: '🏁', reward: 200, metric: ['bestDist', 1000] },
  { id: 'm2500',    name: 'MARATHON MAN',    desc: 'Run 2,500m in a single run',         icon: '🥇', reward: 400, metric: ['bestDist', 2500] },
  { id: 'coins100', name: 'COIN COLLECTOR',  desc: 'Collect 100 coins in a single run',  icon: '🪙', reward: 250, metric: ['bestCoins', 100] },
  { id: 'near5',    name: 'NEAR MISS KING',  desc: '5 near misses in a single run',      icon: '😱', reward: 150, metric: ['bestNearMiss', 5] },
  { id: 'traffic',  name: 'TRAFFIC MASTER',  desc: '20 near misses in a single run',     icon: '🚦', reward: 400, metric: ['bestNearMiss', 20] },
  { id: 'monsoon',  name: 'MONSOON SURVIVOR',desc: 'Reach the Monsoon zone',             icon: '🌧️', reward: 300, metric: ['bestDist', 1280] }, // = ZONE_LEN * 4 (zone 5)
  { id: 'night',    name: 'NIGHT RUNNER',    desc: 'Run through the Mumbai night',       icon: '🌙', reward: 250, metric: ['ranAtNight', 1] },
  { id: 'rich',     name: 'MILLIONAIRE',     desc: 'Bank 1,000 total coins',             icon: '💰', reward: 500, metric: ['totalCoins', 1000] }
];

// current progress value for an achievement metric
function achMetricValue(key) {
  if (key === 'bestDist') return Storage.bestDist;
  if (key === 'totalCoins') return Storage.totalCoins;
  return Storage.stats[key] || 0;
}

// returns list of newly unlocked achievement defs (coins granted at unlock)
function checkAchievements() {
  const got = [];
  for (const a of ACHIEVEMENTS) {
    if (achMetricValue(a.metric[0]) >= a.metric[1] && Storage.unlockAchievement(a.id)) {
      Storage.addCoins(a.reward); // grant reward exactly once
      got.push(a);
    }
  }
  return got;
}
