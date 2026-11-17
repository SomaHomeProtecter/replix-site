/* 친구랑 같이 보기(#friends) 그룹방 카드 연출 — HP-885(2026-11-17 조현빈 결정). 스타일 = css/friends.css(.fx).
   한 바퀴(13.4초): 재생 화면만 → 0.6초 패널 열림 → 2.2초 초대 링크 복사(커서) → 3.6초 수민 입장 → 4.7초 재생 화면이 접히고 패널만 커짐 →
   대화(5.6~10.9초) → 12.4초 사라졌다가 처음으로. 패널(ext/panel.html#friends)은 구울 때의 시각표대로 장면을 넘기므로 한 바퀴의 처음에 play() 만 부른다
   (시각을 옮기면 scripts/ext-panel/harness.html 의 SCRIPTS.friends 도 옮기고 다시 굽는다). 섹션이 화면에 들어올 때마다 처음부터 돈다.
   카드가 숨는 휴대폰(760px 이하)에서는 화면에 들어오지 않으므로 패널·영상을 받지 않는다. 움직임 줄이기면 친구 둘이 들어온 방(마지막 장면)을 멈춘 채 보인다. */
(function () {
  var fx = document.querySelector('#friends .fx'); if (!fx) return;
  var fr = fx.querySelector('.fx-frame'), vid = fx.querySelector('video'), cur = fx.querySelector('.fx-cur');
  var STILL = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function size() {
    var W = Math.min(fx.clientWidth, 640); if (!W) return;
    var k2 = Math.min(1, W / 360), k1 = (W * 9 / 16) / 560;
    fx.style.setProperty('--bw', W + 'px'); fx.style.setProperty('--k1', k1.toFixed(4)); fx.style.setProperty('--k2', k2.toFixed(4));
    fx.style.setProperty('--fh', Math.round(560 * k2) + 'px');
  }
  size(); addEventListener('resize', size);

  function rx() { try { return fr.contentWindow && fr.contentWindow.RX; } catch (_) { return null; } }
  function P(fn) { var r = rx(); if (r) try { fn(r); } catch (_) {} }
  function set(cls, on, instant) {
    if (instant) fx.classList.add('no-anim');
    fx.classList.toggle(cls, on);
    if (instant) { void fx.offsetWidth; fx.classList.remove('no-anim'); }
  }
  // 커서를 패널 안 단추 위로 — 패널이 '다 열린' 1단계 자리를 크기 값(--bw · --k1)으로 계산한다. 화면에서 iframe 자리를 재면
  // 여닫는 도중이나 대본이 다시 시작된 직후에 닫힌 자리(카드 오른쪽 밖)를 잡는다(2026-11-17 확인).
  function aimP(sel) {
    var r = rx(), b = r && r.rect(sel); if (!b) return;
    var cs = getComputedStyle(fx), bw = parseFloat(cs.getPropertyValue('--bw')), k = parseFloat(cs.getPropertyValue('--k1'));
    if (!bw || !k) return;
    var left = (fx.clientWidth - bw) / 2 + bw - 360 * k, top = (fx.clientHeight - 560 * k) / 2;
    cur.style.transform = 'translate(' + (left + (b.x + b.w * .5) * k) + 'px,' + (top + (b.y + b.h * .55) * k) + 'px)';
    cur.classList.add('on');
  }
  function tap() { cur.classList.remove('tap'); void cur.offsetWidth; cur.classList.add('tap'); }
  function vPlay() { if (!vid) return; try { vid.currentTime = 4.6; } catch (_) {} var p = vid.play(); if (p && p.catch) p.catch(function () {}); }

  // 처음 그림 — 패널이 닫힌 재생 화면. 커서는 영상 가운데쯤에 숨겨 두었다가 패널이 열린 뒤 단추로 간다
  function reset() {
    set('is-gone', false, true); set('is-solo', false, true); set('is-shut', true, true);
    cur.classList.remove('on'); cur.style.transform = 'translate(' + fx.clientWidth * .45 + 'px,' + fx.clientHeight * .55 + 'px)';
  }
  var steps = [
    [0, function () { reset(); vPlay(); P(function (r) { r.play(); }); }],
    [600, function () { set('is-shut', false); }],
    [1500, function () { aimP('#rx-room-invite-copy'); }],
    [2200, function () { tap(); }],
    [2800, function () { cur.classList.remove('on'); }],
    [4700, function () { set('is-solo', true); }],
    [5600, function () { if (vid) vid.pause(); }],
    [12400, function () { set('is-gone', true); }],
  ];
  var LOOP = 13400, timers = [];
  function stop() { timers.forEach(clearTimeout); timers = []; }
  function run() { stop(); steps.forEach(function (s) { timers.push(setTimeout(s[1], s[0])); }); timers.push(setTimeout(run, LOOP)); }

  var ready = false, want = false, fb = 0;
  function load() { if (!fr.getAttribute('src')) fr.setAttribute('src', fr.dataset.src); if (vid && vid.preload === 'none') vid.preload = 'auto'; }
  addEventListener('message', function (e) {
    if (e.origin !== location.origin || !e.data || e.data.rxPanelReady !== 'friends') return;
    ready = true; clearTimeout(fb);
    if (STILL) { P(function (r) { r.still(); }); return; }
    if (want) run();
  });
  if (STILL) { set('is-shut', false, true); set('is-solo', true, true); if (fx.offsetParent) load(); return; }
  new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      // 패널이 준비된 뒤에 돈다 — 먼저 돌면 패널이 대본의 중간부터 따라온다. 끝내 못 받아도 1.5초 뒤에는 돈다(첫 화면 top.js 와 같은 방식)
      if (e.isIntersecting) { load(); want = true; if (ready) run(); else { clearTimeout(fb); fb = setTimeout(function () { if (want) run(); }, 1500); } }
      else { want = false; clearTimeout(fb); stop(); if (vid) vid.pause(); }
    });
  }, { threshold: .45 }).observe(fx);
})();
