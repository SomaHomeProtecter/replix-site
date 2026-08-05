/* 여러 구획이 함께 쓰는 값과 헬퍼. 반응 밀도 함수(density)를 히어로와
   히트맵이 공유하는 것이 핵심이다 — 두 곳의 그래프가 어긋나지 않는다. */
export var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* 실데이터 BE 주소 — <meta name="api-base"> 한 곳에서만 정한다(index.html 참조). */
var apiBaseTag = document.querySelector('meta[name="api-base"]');
export var API_BASE = apiBaseTag ? apiBaseTag.content : "";

/** 실데이터 fetch 공통 래퍼. 실패해도 던지지 않고 fallback 을 돌려준다 — BE 가 죽어도
 *  랜딩은 정적 대체 화면(fallback 계층)으로 정상 렌더돼야 한다(2026-08-05 결정). */
export function fetchJson(path, fallback) {
  return fetch(API_BASE + path)
    .then(function (r) { return r.ok ? r.json() : fallback; })
    .catch(function () { return fallback; });
}


export var EP_LEN = 2892;
export function mmss(s) {
  var m = Math.floor(s / 60), x = Math.floor(s % 60);
  return (m < 10 ? "0" : "") + m + ":" + (x < 10 ? "0" : "") + x;
}
export function av(n, c) { return '<span class="av" style="background:' + c + '">' + n.charAt(0) + '</span>'; }
function heart(k) {
  return '<span class="like"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
    '<path d="M12 20s-7-4.3-7-9.2A3.8 3.8 0 0 1 12 8.4 3.8 3.8 0 0 1 19 10.8C19 15.7 12 20 12 20Z"/>' +
    '</svg>' + k + '</span>';
}
export function msgHtml(m) {
  return '<div class="msg' + (m.reply ? " msg--reply" : "") + (m.big ? " msg--big" : "") + '">' +
    av(m.n, m.c) + '<span class="msg-body"><span class="msg-name">' + m.n + '</span>' +
    '<span class="msg-text">' + m.t + '</span>' +
    (m.likes ? heart(m.likes) : "") +
    (m.tail ? '<span class="msg-time">' + m.tail + '</span>' : "") + '</span></div>';
}

var PEAKS = [[0.13, 0.24], [0.26, 0.58], [0.65, 1.0], [0.91, 0.44]];
export function density(t) {
  var v = 0.05;
  for (var i = 0; i < PEAKS.length; i++) {
    var d = t - PEAKS[i][0];
    v += PEAKS[i][1] * Math.exp(-(d * d) / 0.0016);
  }
  return Math.min(1, v);
}
export function buildHeat(el, bars) {
  var h = "";
  for (var i = 0; i < bars; i++) h += "<span></span>";
  el.innerHTML = h;
  var sp = el.children;
  for (var j = 0; j < bars; j++) {
    var v = density(j / bars) + (Math.sin(j * 2.7) + 1) * 0.024;
    sp[j].dataset.h = Math.min(100, Math.round(v * 100));
  }
  return sp;
}
