/* 랜딩의 익스텐션 화면 재생기(HP-677) — ext/panel.html 이 부른다.
   film-<장면>.js 가 구워 둔 장면 목록(RX_FILM.frames — { t: 시각 ms, c: 재생 위치 초, p: 재생 중 1/0, h: 패널 HTML })을 차례로 보인다.
   장면을 통째로 갈아 끼우지 않고 달라진 곳만 고친다(morph) — 그대로인 줄은 깜빡이지 않고, 새로 생긴 줄만 떠오른다.
   재생 위치 시계(그룹방 카드·커뮤니티 '지금' 줄)는 장면 사이에도 1초마다 흐른다.
   바깥(랜딩 js/top.js)이 쓰는 손잡이 = window.RX: play()(처음부터 재생) · still()(마지막 장면에 멈춤) · rect(선택자)(단추 자리 — 커서가 그 위로 간다). */
(function () {
  var scene = (location.hash || '#hero').slice(1).replace(/[^a-z]/g, '') || 'hero';
  var root = document.getElementById('replix-root');
  // 구울 때는 '멈춘 모양'을 기다렸다가 찍어서 장면 시각이 실제보다 늦다 — LAG 만큼 당겨 보이되, 그 장면을 일으킨 사건(film.acts — 단추를
  // 누른 시각)보다 앞서지는 않게 한다(바깥 커서가 누르기 전에 화면이 먼저 바뀌면 안 된다).
  var LAG = 300, AFTER = 120;
  var film = null, timers = [], cur = -1, base = null;

  function key(n) { return n.nodeType === 1 ? n.nodeName + '#' + (n.id || '') + '.' + (n.classList && n.classList[0] || '') : '' + n.nodeType; }
  function fresh(n) {
    var c = n.cloneNode(true);
    if (c.nodeType === 1 && cur >= 0) { c.setAttribute('data-rxb-new', ''); setTimeout(function () { c.removeAttribute('data-rxb-new'); }, 420); }
    return c;
  }
  function morph(a, b) {
    if (a.nodeType !== b.nodeType || a.nodeName !== b.nodeName) { a.replaceWith(fresh(b)); return; }
    if (a.nodeType !== 1) { if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue; return; }
    var i, at = a.attributes, bt = b.attributes;
    for (i = at.length - 1; i >= 0; i--) if (at[i].name !== 'data-rxb-new' && !b.hasAttribute(at[i].name)) a.removeAttribute(at[i].name);
    for (i = 0; i < bt.length; i++) if (a.getAttribute(bt[i].name) !== bt[i].value) a.setAttribute(bt[i].name, bt[i].value);
    var ac = Array.prototype.slice.call(a.childNodes), bc = b.childNodes, x = 0, y = 0, k;
    while (y < bc.length) {
      if (x >= ac.length) { a.appendChild(fresh(bc[y++])); continue; }
      if (key(ac[x]) === key(bc[y])) { morph(ac[x++], bc[y++]); continue; }
      for (k = x + 1; k < ac.length && k <= x + 3; k++) if (key(ac[k]) === key(bc[y])) break;
      if (k < ac.length && k <= x + 3) { while (x < k) ac[x++].remove(); continue; }   // 사이의 것이 사라졌다
      a.insertBefore(fresh(bc[y++]), ac[x]);                                         // 새로 끼어들었다
    }
    while (x < ac.length) ac[x++].remove();
  }

  function mmss(s) { s = Math.max(0, Math.floor(s)); var m = Math.floor(s / 60), x = s % 60; return (m < 10 ? '0' : '') + m + ':' + (x < 10 ? '0' : '') + x; }
  function tick() {
    if (!base) return;
    var now = base.c + (base.p ? (Date.now() - base.at) / 1000 : 0), txt = mmss(now);
    ['#rx-room-clock-now', '#rx-now-t'].forEach(function (sel) { var e = root.querySelector(sel); if (e && e.textContent !== txt) e.textContent = txt; });
  }
  function show(i) {
    var f = film.frames[i], tpl = document.createElement('template');
    tpl.innerHTML = f.h;
    var next = tpl.content.firstElementChild, live = root.firstElementChild;
    if (!live) root.appendChild(next); else morph(live, next);
    cur = i;
    // 굽는 쪽과 화면 읽는 시각이 달라 시계가 뒤로 가지 않게, 재생 중이면 구울 때의 '장면 시각'만큼만 맞춘다
    base = { c: f.c, p: f.p, at: Date.now() };
    tick();
    var feed = root.querySelector('#rx-feed'); if (feed) feed.scrollTop = feed.scrollHeight;
  }
  function stop() { timers.forEach(clearTimeout); timers = []; }
  function play() {
    if (!film) return;
    stop(); show(0);
    film.frames.forEach(function (f, i) {
      if (!i) return;
      var act = 0; (film.acts || []).forEach(function (a) { if (a <= f.t) act = a; });
      timers.push(setTimeout(function () { show(i); }, Math.max(act + AFTER, f.t - LAG)));
    });
    if (film.loop) timers.push(setTimeout(play, film.loop));
  }
  function still() { if (!film) return; stop(); show(film.frames.length - 1); }

  window.RX = {
    scene: scene, play: play, still: still,
    rect: function (sel) { var e = root.querySelector(sel); if (!e) return null; var b = e.getBoundingClientRect(); return b.width ? { x: b.x, y: b.y, w: b.width, h: b.height } : null; }
  };

  var s = document.createElement('script');
  s.src = 'film-' + scene + '.js';
  s.onload = function () {
    film = window.RX_FILM; if (!film) return;
    if (film.light) root.setAttribute('data-rx-theme', 'light');
    var calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    // 첫 화면(hero)은 바깥 대본이 play() 로 돌린다 — 그 전에는 첫 장면(시작 화면)을 보인다. 나머지는 스스로 돈다.
    if (scene === 'hero') show(0); else if (film.frames.length > 1 && !calm) play(); else still();
    setInterval(tick, 500);
    try { parent.postMessage({ rxPanelReady: scene }, location.origin); } catch (_) {}
  };
  document.head.appendChild(s);
})();
