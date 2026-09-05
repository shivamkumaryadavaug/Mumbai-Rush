// ui.js — DOM screens, HUD, popups, power-up indicators, menus
const UI = {
  el(id) { return document.getElementById(id); },
  screens: ['menu', 'hud', 'gameover', 'pause', 'settings', 'characters', 'missions', 'achievements'],

  show(name) {
    this.screens.forEach(s => this.el(s).classList.toggle('hidden', s !== name));
  },
  overlay(name, on) { this.el(name).classList.toggle('hidden', !on); },

  updateMenu() {
    this.el('mBest').textContent = Storage.high.toLocaleString();
    this.el('mCoins').textContent = Storage.totalCoins.toLocaleString();
  },

  hud(score, dist, coins, mult) {
    this.el('hScore').textContent = Math.floor(score).toLocaleString();
    this.el('hDist').textContent = Math.floor(dist) + 'm';
    this.el('hCoins').textContent = coins;
    const m = this.el('mult');
    if (mult > 1) { m.classList.remove('hidden'); m.textContent = 'x' + mult; }
    else m.classList.add('hidden');
  },

  setPower(id, frac) {
    let p = this.el('pw-' + id);
    if (!p) {
      p = document.createElement('div');
      p.id = 'pw-' + id; p.className = 'pw';
      this.el('powerups').appendChild(p);
    }
    p.style.setProperty('--f', Math.max(0, frac));
    if (frac <= 0) p.remove();
  },
  clearPowers() { this.el('powerups').innerHTML = ''; },

  popup(text, cls) {
    const d = document.createElement('div');
    d.className = 'popup ' + (cls || '');
    d.textContent = text;
    this.el('popups').appendChild(d);
    setTimeout(() => d.remove(), 1100);
  },

  flash(cls) {
    const fl = this.el('flash');
    fl.className = cls + ' show';
    setTimeout(() => { fl.className = ''; }, 220);
  },

  speedlines(on) { this.el('speedlines').classList.toggle('on', !!on); },

  gameOver(score, dist, coins, best) {
    this.el('goScore').textContent = Math.floor(score).toLocaleString();
    this.el('goDist').textContent = Math.floor(dist) + 'm';
    this.el('goCoins').textContent = coins;
    this.el('goBest').textContent = Math.floor(best).toLocaleString();
    this.el('goNew').classList.toggle('hidden', best > score);
    this.show('gameover');
  },

  buildCharacters() {
    const wrap = this.el('charList'); wrap.innerHTML = '';
    const coins = Storage.totalCoins, unlocked = Storage.unlocked, sel = Storage.selected;
    CHARACTERS.forEach(c => {
      const isUn = unlocked.includes(c.id), isSel = sel === c.id;
      const card = document.createElement('div');
      card.className = 'char-card' + (isSel ? ' sel' : '');
      card.innerHTML = `<div class="char-swatch" style="background:#${c.shirt.toString(16).padStart(6, '0')}"></div>
        <div class="char-info"><b>${c.name}</b><small>${c.desc}</small></div>
        <button class="btn small">${isSel ? 'SELECTED' : isUn ? 'SELECT' : c.cost + ' COINS'}</button>`;
      card.querySelector('button').addEventListener('click', () => {
        AudioSys.click();
        if (isUn) { Storage.selected = c.id; if (window.game) game.player.rebuild(); this.buildCharacters(); }
        else if (coins >= c.cost) {
          Storage.addCoins(-c.cost); Storage.unlock(c.id); Storage.selected = c.id;
          if (window.game) game.player.rebuild();
          this.buildCharacters(); this.updateMenu();
        } else this.popup('NOT ENOUGH COINS', 'warn');
      });
      // outfit color swatches for unlocked characters
      if (isUn) {
        const sw = document.createElement('div');
        sw.className = 'swatches';
        const cur = Storage.outfitOf(c.id);
        const none = document.createElement('i');
        none.className = 'sw' + (cur === -1 ? ' on' : '');
        none.style.background = '#' + c.shirt.toString(16).padStart(6, '0');
        none.title = 'Classic look';
        none.addEventListener('click', () => { Storage.setOutfit(c.id, -1); if (isSel && window.game) game.player.rebuild(); this.buildCharacters(); });
        sw.appendChild(none);
        OUTFIT_COLORS.forEach((col, i) => {
          const s = document.createElement('i');
          s.className = 'sw' + (cur === i ? ' on' : '');
          s.style.background = '#' + col.toString(16).padStart(6, '0');
          s.addEventListener('click', () => { AudioSys.click(); Storage.setOutfit(c.id, i); if (isSel && window.game) game.player.rebuild(); this.buildCharacters(); });
          sw.appendChild(s);
        });
        card.appendChild(sw);
      }
      wrap.appendChild(card);
    });
    this.el('charCoins').textContent = coins.toLocaleString();
  },

  buildMissions() {
    const wrap = this.el('missionList'); wrap.innerHTML = '';
    const m = Storage.missions;
    MISSIONS.forEach(mi => {
      const prog = Math.min(m[mi.id] || 0, mi.target);
      const claimed = !!(m.claimed && m.claimed[mi.id]);
      const ready = prog >= mi.target && !claimed;
      const card = document.createElement('div');
      card.className = 'mission-card' + (claimed ? ' done' : '') + (ready ? ' ready' : '');
      card.innerHTML = `<b>${mi.name}</b><small>${mi.desc}</small>
        <div class="bar"><i style="width:${(prog / mi.target) * 100}%"></i></div>
        <span class="mprog">${prog}/${mi.target}</span>`;
      if (ready) {
        const btn = document.createElement('button');
        btn.className = 'btn small claim';
        btn.textContent = 'CLAIM +' + mi.reward + ' 🪙';
        btn.addEventListener('click', () => {
          const reward = Storage.claimMission(mi.id);
          if (reward) { AudioSys.coin(); this.popup('+' + reward + ' COINS', 'pw'); this.buildMissions(); this.updateMenu(); }
        });
        card.appendChild(btn);
      } else if (claimed) {
        const d = document.createElement('span');
        d.className = 'mprog claimed'; d.textContent = '✓ CLAIMED';
        card.appendChild(d);
      }
      wrap.appendChild(card);
    });
  },

  buildAchievements() {
    const wrap = this.el('achList'); wrap.innerHTML = '';
    const unlocked = Storage.achievements;
    let count = 0;
    ACHIEVEMENTS.forEach(a => {
      const got = !!unlocked[a.id];
      if (got) count++;
      const card = document.createElement('div');
      card.className = 'ach-card' + (got ? ' got' : '');
      const cur = achMetricValue(a.metric[0]);
      const prog = got ? `✓ +${a.reward} 🪙 claimed`
        : `<span class="ach-prog">${Math.min(cur, a.metric[1])} / ${a.metric[1]}</span> 🔒`;
      card.innerHTML = `<span class="ach-icon">${a.icon}</span>
        <div class="ach-info"><b>${a.name}</b><small>${a.desc}</small></div>
        <span class="ach-state">${prog}</span>`;
      wrap.appendChild(card);
    });
    this.el('achCount').textContent = count + ' / ' + ACHIEVEMENTS.length;
  },

  syncSettings() {
    const s = Storage.settings;
    this.el('setMusic').textContent = 'MUSIC: ' + (s.music ? 'ON' : 'OFF');
    this.el('setSfx').textContent = 'SFX: ' + (s.sfx ? 'ON' : 'OFF');
    this.el('volMusic').value = s.musicVol !== undefined ? s.musicVol : 70;
    this.el('volSfx').value = s.sfxVol !== undefined ? s.sfxVol : 80;
  }
};
