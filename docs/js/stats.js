/* 히어로 아래 라이브 수치 띠(HP-87) — 실데이터가 하한선을 넘을 때만 보여준다.
   2026-08-05 결정: 숫자를 만들어내지 않는다. 데이터가 부족하면 숨긴다(대체 문구를 채우지 않는다
   — 그런 문구는 페이지 다른 곳에서 이미 전달되므로 이 자리에 새로 만들 이유가 없다는 판단). */
import { reduce } from './common.js';
import { publicStats } from './publicStats.js';

/* 시청자 1~2명은 대개 페이지를 보는 본인이다 — 그 상태로 "지금 보고 있는 사람"을 내세우면
   서비스가 비어 있다는 인상을 준다. 이 값을 넘어야 사회적 증거로서 의미가 있다. */
var MIN_VIEWERS = 5;

var strip = document.getElementById("strip");
var elViewers = document.getElementById("statViewers");
var elRooms = document.getElementById("statRooms");

function countUp(el, to) {
  if (reduce) { el.textContent = to.toLocaleString("ko-KR"); return; }
  var start = null, dur = 1100;
  function step(ts) {
    if (start === null) start = ts;
    var p = Math.min(1, (ts - start) / dur);
    var e = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(to * e).toLocaleString("ko-KR");
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

if (strip && elViewers && elRooms) {
  publicStats.then(function (stats) {
    if (stats.liveViewers < MIN_VIEWERS) return; // 기본 hidden 유지

    strip.hidden = false;
    var reveal = function () {
      countUp(elViewers, stats.liveViewers);
      countUp(elRooms, stats.liveRooms);
    };
    // 이미 화면에 보이는 위치(뷰포트 위)일 수 있으니 교차 관찰로 등장 시점을 잡는다 —
    // reveal.js 의 전역 관찰자는 hidden 이던 이 요소를 못 봤으므로 여기서 따로 잡는다.
    var wrap = strip.querySelector(".wrap");
    new IntersectionObserver(function (es, obs) {
      if (es[0].isIntersecting) { wrap.classList.add("in"); reveal(); obs.disconnect(); }
    }, { threshold: 0, rootMargin: "0px 0px -11% 0px" }).observe(wrap);
  });
}
