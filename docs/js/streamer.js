/* 스트리머와 같이 보기(#streamer, HP-876) — 방송 화면의 같이보기 타이머와 '내 화면' 플레이어의 시각을 하나의 시계로 흘린다.
   시계는 32:56 에서 시작해 회차 길이(48:12)에 닿으면 처음으로 돌아간다. 타이머 사본(overlay/sample.html)은 window.RX_STREAM_CLOCK 을 위치로 쓰고,
   섹션 안 [data-sx-now] 글자(배지·내 화면)에는 같은 값을 적는다. 두 페이지가 같은 출처라 iframe 안을 읽을 수 있다.
   그 아래는 두 시각을 빨간 테두리·연결선·'같은 장면' 배지로 잇는 배치 계산이다. */
var sec = document.getElementById('streamer');
if (sec) {
  var BASE = 1976, t0 = performance.now();
  var outs = sec.querySelectorAll('[data-sx-now]');

  var mmss = function (s) { s = Math.max(0, Math.floor(s)); var m = Math.floor(s / 60), x = s % 60; return m + ':' + (x < 10 ? '0' : '') + x; };
  var parse = function (t) { var m = /^(\d+):(\d{2})$/.exec((t || '').trim()); return m ? +m[1] * 60 + +m[2] : null; };
  var DUR = 2892;   // 48:12
  var now = function () { return (BASE + (performance.now() - t0) / 1000) % DUR; };
  // 타이머 페이지는 0.25초마다만 다시 그려서, 같은 시계를 주면 평균 0.1초 넘게 늦게 바뀐다(v9 실측: 5초 중 13~18% 동안 두 숫자가 달랐다).
  // 타이머에 주는 값만 0.12초 앞당겨 두 숫자가 바뀌는 순간을 가운데로 맞춘다. 섹션 안 글자([data-sx-now])는 now() 그대로 쓴다.
  window.RX_STREAM_CLOCK = function () { return now() + 0.12; };

  var shown = '';
  var paint = function () {
    var t = mmss(now());
    if (t === shown) return;
    shown = t;
    Array.prototype.forEach.call(outs, function (el) { el.textContent = t; });
    var up = sec.querySelector('[data-sx-up]');   // 방송 경과 시간(예시) — 작품 시각과 함께 흐른다
    if (up) { var u = Math.floor(4360 + (performance.now() - t0) / 1000), h = Math.floor(u / 3600), m = Math.floor(u / 60) % 60, x = u % 60;
      up.textContent = h + ':' + (m < 10 ? '0' : '') + m + ':' + (x < 10 ? '0' : '') + x; }
    tick();
  };

  /* ── '같은 장면' 이음 ─────────────────────────────────────────
     방송 타이머(overlay iframe 안 .v-corner-card .now)와 내 화면 플레이어의 시각([data-sx-ring="mine"])을 같은 빨간 테두리(.sx-ring)로 감싸고,
     PC·태블릿에서는 두 테두리를 SVG 연결선(.sx-wire)으로 잇는다. 길: 방송 숫자 왼쪽 → 방송 화면 왼쪽 바깥 여백 → '같은 장면' 배지 높이 →
     내 화면의 플레이어·패널 경계 → 내 화면 숫자 오른쪽. 그림 위를 가로지르지 않게 여백과 경계선을 따라간다.
     자리는 창 크기·등장 애니메이션에 따라 바뀌므로 섹션이 화면 근처에 있는 동안 0.2초마다, 그리고 창 크기가 바뀔 때 다시 잰다. */
  var wrap = sec.querySelector('.sx-stagewrap');
  var ringC = sec.querySelector('.sx-ring[data-ring="cast"]'), ringM = sec.querySelector('.sx-ring[data-ring="mine"]');
  var mineNum = sec.querySelector('[data-sx-ring="mine"]');
  var badge = sec.querySelector('.sx-same'), wire = sec.querySelector('.sx-wire');
  var ovf = sec.querySelector('.sx-timer iframe');
  var castEl = sec.querySelector('.sx-cast'), mineEl = sec.querySelector('.sx-mine'), playerEl = sec.querySelector('.sx-player');
  var near = true;
  if (window.IntersectionObserver) new IntersectionObserver(function (e) { near = e[0].isIntersecting; if (near) layout(); }, { rootMargin: '200px' }).observe(sec);

  var castNumRect = function () {
    var d; try { d = ovf && ovf.contentDocument; } catch (e) { return null; }
    var el = d && d.querySelector('.v-corner-card:not([hidden]) .now');
    if (!el || !el.textContent) return null;
    var r = el.getBoundingClientRect(), f = ovf.getBoundingClientRect();
    if (!r.width) return null;
    // iframe 안 좌표 × (무대 줄임 비율) + iframe 자리 = 바깥 좌표 — PC 는 줄임 비율이 1
    var s = f.width / (ovf.offsetWidth || f.width) || 1;
    return { left: f.left + r.left * s, top: f.top + r.top * s, width: r.width * s, height: r.height * s };
  };
  var K = 1;   // 무대 줄임 비율(v13) — 화면 좌표를 무대 안 좌표로 바꿀 때 나눈다
  var place = function (ring, r, o, pad) {
    var b = { x: (r.left - o.left) / K - pad, y: (r.top - o.top) / K - pad, w: r.width / K + pad * 2, h: r.height / K + pad * 2 };
    ring.style.transform = 'translate(' + b.x.toFixed(1) + 'px,' + b.y.toFixed(1) + 'px)';
    ring.style.width = b.w.toFixed(1) + 'px'; ring.style.height = b.h.toFixed(1) + 'px';
    return { l: b.x, r: b.x + b.w, t: b.y, b: b.y + b.h, cy: b.y + b.h / 2 };
  };
  // 꺾은선을 모서리마다 둥글게 — 반지름은 이웃한 두 변 길이의 절반을 넘지 않는다
  var rounded = function (pts, R) {
    var d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
    for (var i = 1; i < pts.length - 1; i++) {
      var p = pts[i - 1], c = pts[i], n = pts[i + 1];
      var l1 = Math.hypot(c[0] - p[0], c[1] - p[1]), l2 = Math.hypot(n[0] - c[0], n[1] - c[1]);
      var r = Math.min(R, l1 / 2, l2 / 2);
      if (r < 0.5) { d += ' L' + c[0].toFixed(1) + ' ' + c[1].toFixed(1); continue; }
      var a = [c[0] + (p[0] - c[0]) / l1 * r, c[1] + (p[1] - c[1]) / l1 * r], z = [c[0] + (n[0] - c[0]) / l2 * r, c[1] + (n[1] - c[1]) / l2 * r];
      d += ' L' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) + ' Q' + c[0].toFixed(1) + ' ' + c[1].toFixed(1) + ' ' + z[0].toFixed(1) + ' ' + z[1].toFixed(1);
    }
    var e = pts[pts.length - 1];
    return d + ' L' + e[0].toFixed(1) + ' ' + e[1].toFixed(1);
  };
  var layout = function () {
    if (!wrap || !ringC || !ringM || !mineNum) return;
    var cr = castNumRect();
    if (!cr) { wrap.classList.remove('sx-linked'); return; }
    fit();
    var o = wrap.getBoundingClientRect();
    K = o.width / (wrap.offsetWidth || o.width) || 1;
    var a = place(ringC, cr, o, 5);
    var b = place(ringM, mineNum.getBoundingClientRect(), o, 3);
    var ready = castEl.classList.contains('in') && mineEl.classList.contains('in');
    wrap.classList.toggle('sx-linked', ready);
    if (!wire || getComputedStyle(wire).display === 'none') return;
    var pl = playerEl.getBoundingClientRect(), mw = mineEl.getBoundingClientRect();
    // v23 — 내 화면 창이 방송 화면 오른쪽 아래에 겹친다. 선은 타이머 왼쪽으로 나와 오버레이 채팅 옆을 따라 내려오고,
    // 내 화면 창 위쪽 가장자리 바로 위를 지나 창 오른쪽 가장자리를 따라 내 화면 시각에 닿는다. '같은 장면' 배지는 그 꺾이는 자리에 둔다.
    var X = a.l - 16;
    var by = (mw.top - o.top) / K - 14;
    var dx = (mw.right - o.left) / K + 14;
    var pts = [[a.l, a.cy], [X, a.cy], [X, by], [dx, by], [dx, b.cy], [b.r, b.cy]];
    var op = badge.offsetParent && badge.offsetParent.getBoundingClientRect();
    if (op) {
      badge.style.left = ((o.left + X * K - op.left) / K).toFixed(1) + 'px';
      // 배지는 세로 선 위, 오버레이 채팅창 아래와 내 화면 창 위 사이 가운데에 둔다
      var oc = sec.querySelector('.sx-ovchat'), ocb = oc ? (oc.getBoundingClientRect().bottom - o.top) / K : a.b;
      var my = (ocb + by) / 2;
      badge.style.top = ((o.top + my * K - op.top) / K).toFixed(1) + 'px';
    }
    var dd = rounded(pts, 16);
    wire.querySelector('.sx-wire-line').setAttribute('d', dd);
    wire.querySelector('.sx-wire-halo').setAttribute('d', dd);
    var ends = wire.querySelectorAll('.sx-wire-end');
    ends[0].setAttribute('cx', pts[0][0].toFixed(1)); ends[0].setAttribute('cy', pts[0][1].toFixed(1));
    ends[1].setAttribute('cx', b.r.toFixed(1)); ends[1].setAttribute('cy', b.cy.toFixed(1));
  };
  // 초가 바뀔 때 두 테두리를 함께 살짝 빛나게(움직임 줄이기면 CSS 가 멈춘다)
  var tick = function () {
    [ringC, ringM].forEach(function (r) { if (!r) return; r.classList.remove('is-tick'); void r.offsetWidth; r.classList.add('is-tick'); });
  };
  // 태블릿·휴대폰: 1194px 로 그린 무대를 칸 폭에 맞춰 줄이고, 줄어든 높이만큼 칸 높이를 잡는다
  var fitEl = sec.querySelector('.sx-fit');
  var fit = function () {
    if (!fitEl || !wrap) return;
    if (getComputedStyle(wrap).width !== '1194px') { wrap.style.transform = ''; fitEl.style.height = ''; return; }
    // 왼쪽 30px 는 연결선이 지나가는 여백 — 함께 줄여 넣는다
    var k = Math.min(1, fitEl.clientWidth / 1254);
    wrap.style.transform = 'scale(' + k + ') translateX(30px)';
    fitEl.style.height = Math.ceil((wrap.offsetHeight + 40) * k) + 'px';
  };
  window.addEventListener('resize', layout);
  setInterval(function () { if (near) layout(); }, 200);

  setInterval(paint, 200);
  paint();
}
