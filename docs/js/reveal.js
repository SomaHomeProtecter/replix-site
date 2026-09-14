/* 스크롤 조립·숫자 카운트업·내비 경계선·섹션 도달 계측. 페이지 전역 동작이다. */
import { reduce } from './common.js';
import { track } from './analytics.js';

/* ═══ 숫자 카운트업 ═════════════════════════════════════════ */
function countUp(el) {
  var to = parseFloat(el.dataset.count), suf = el.dataset.suffix || "";
  if (reduce) { el.textContent = to.toLocaleString("ko-KR") + suf; return; }
  var start = null, dur = 1100;
  function step(ts) {
    if (start === null) start = ts;
    var p = Math.min(1, (ts - start) / dur);
    var e = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(to * e).toLocaleString("ko-KR") + suf;
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ═══ 스크롤 조립 ═══════════════════════════════════════════ */
var io = new IntersectionObserver(function (es) {
  es.forEach(function (e) {
    if (!e.isIntersecting) return;
    e.target.classList.add("in");
    e.target.querySelectorAll("[data-count]").forEach(countUp);
    io.unobserve(e.target);
  });
  /* 요소가 조금 보일 때가 아니라 뷰포트에 들어서는 순간 발동해야
     스크롤과 함께 자연스럽게 이어진다. */
}, { threshold: 0, rootMargin: "0px 0px -11% 0px" });
document.querySelectorAll(".reveal, [data-stagger]").forEach(function (el) { io.observe(el); });

/* ── 내비 경계선 ─────────────────────────────────────────── */
var nav = document.getElementById("nav");
var sen = document.createElement("div");
sen.style.cssText = "position:absolute;top:0;height:1px;width:1px";
document.body.prepend(sen);
new IntersectionObserver(function (es) {
  nav.classList.toggle("stuck", !es[0].isIntersecting);
}).observe(sen);

/* ═══ 섹션 도달 계측 (docs/analytics/tracking-plan.md W3) ═══════════
   섹션 상단이 뷰포트 위 60% 안에 들어오면 페이지뷰당 1회. 50% 노출 threshold 를 쓰지 않는 이유:
   뷰포트보다 큰 섹션은 교차 비율이 0.5 에 영영 못 미쳐 절대 발화하지 않는다. */
var SECTIONS = ['intro', 'how', 'scenes', 'works', 'rooms', 'faq', 'install'];
var sio = new IntersectionObserver(function (es) {
  es.forEach(function (e) {
    if (!e.isIntersecting) return;
    track('section_viewed', { section: e.target.id });
    sio.unobserve(e.target);
  });
}, { threshold: 0, rootMargin: '0px 0px -40% 0px' });
SECTIONS.forEach(function (id) { var el = document.getElementById(id); if (el) sio.observe(el); });
