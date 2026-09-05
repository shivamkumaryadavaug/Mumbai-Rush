// main.js — boot + input (keyboard & touch swipes) + menu wiring
(function () {
  const game = new Game();
  window.game = game;

  document.addEventListener('DOMContentLoaded', () => {
    game.init();
    wireUI();
    AudioSys.applySettings();
  });

  function wireUI() {
    const on = (id, fn) => document.getElementById(id).addEventListener('click', () => { AudioSys.init(); AudioSys.resume(); AudioSys.click(); fn(); });

    on('btnPlay',     () => game.start());
    on('btnChars',    () => { UI.buildCharacters(); UI.show('characters'); });
    on('btnMissions', () => { UI.buildMissions(); UI.show('missions'); });
    on('btnAch',      () => { UI.buildAchievements(); UI.show('achievements'); });
    on('btnSettings', () => { UI.syncSettings(); UI.show('settings'); });
    on('btnPause',    () => game.togglePause());
    on('btnResume',   () => game.togglePause());
    on('btnRestart',  () => game.start());
    on('btnGoMenu',   () => game.toMenu());
    on('btnPauseMenu',() => { game.paused = false; UI.overlay('pause', false); game.toMenu(); });
    document.querySelectorAll('.back').forEach(b => b.addEventListener('click', () => { AudioSys.click(); UI.show('menu'); UI.updateMenu(); }));

    on('setMusic', () => { AudioSys.setMusic(!Storage.settings.music); UI.syncSettings(); });
    on('setSfx',   () => { AudioSys.setSfx(!Storage.settings.sfx); UI.syncSettings(); });
    document.getElementById('volMusic').addEventListener('input', (e) => AudioSys.setMusicVol(+e.target.value));
    document.getElementById('volSfx').addEventListener('input', (e) => AudioSys.setSfxVol(+e.target.value));

    // hide pause overlay when restarting from pause
    document.getElementById('btnRestart').addEventListener('click', () => UI.overlay('pause', false));
  }

  // ---------- keyboard ----------
  document.addEventListener('keydown', (e) => {
    if (game.state !== 'playing' || game.paused) {
      if (e.key === 'Enter' && game.state === 'menu') game.start();
      return;
    }
    const k = e.key;
    if (k === 'ArrowLeft'  || k === 'a' || k === 'A') { if (game.player.move(-1)) AudioSys.slide(); }
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') { if (game.player.move(1)) AudioSys.slide(); }
    else if (k === 'ArrowUp' || k === 'w' || k === 'W' || k === ' ') { if (game.player.jump()) AudioSys.jump(); e.preventDefault(); }
    else if (k === 'ArrowDown' || k === 's' || k === 'S') { game.player.slide(); AudioSys.slide(); }
    else if (k === 'p' || k === 'P') game.togglePause();
    else if (k === 'r' || k === 'R') game.start();
  });

  // ---------- touch swipes ----------
  let tX = 0, tY = 0, tT = 0;
  document.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0];
    tX = t.clientX; tY = t.clientY; tT = performance.now();
    AudioSys.init(); AudioSys.resume();
  }, { passive: true });
  document.addEventListener('touchend', (e) => {
    if (game.state !== 'playing' || game.paused) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - tX, dy = t.clientY - tY;
    const adx = Math.abs(dx), ady = Math.abs(dy);
    if (Math.max(adx, ady) < 24 || performance.now() - tT > 600) return;
    if (adx > ady) {
      if (game.player.move(dx > 0 ? 1 : -1)) AudioSys.slide();
    } else {
      if (dy < 0) { if (game.player.jump()) AudioSys.jump(); }
      else { game.player.slide(); AudioSys.slide(); }
    }
  }, { passive: true });

  // pause when tab hidden
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && game.state === 'playing' && !game.paused) game.togglePause();
  });
})();
