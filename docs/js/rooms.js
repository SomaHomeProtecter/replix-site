/* 함께 보는 방식 — 공개 에피소드방·그룹방 두 화면의 말풍선 교체. */
import { reduce } from './common.js';

/* ═══ 함께 보는 방식 (다크) ══════════════════════════════════
   공개방은 말이 빨리 갈리고 반응 수가 오르며, 그룹방은 느리고
   조용하다 - 두 방의 차이를 문장 대신 리듬으로 보여 준다. */
var CIN_POOL = {
  pub: ["여기서 다 같이 비명", "심장 떨어짐", "오늘 처음 봄 <i>👀</i>",
        "괜히 유명한 게 아니네", "숨 참고 봄", "이 대사 저장했다 <i>👍</i>",
        "왜 뒤를 안 돌아봐", "다 같이 보는 느낌 좋네 <i>🔥</i>"],
  grp: ["야 잠깐 멈춰봐 <i>❤️</i>", "우리끼리 보니까 낫다 <i>❤️</i>",
        "나 아직 못 봤어", "이제 틀어 <i>❤️</i>",
        "방금 그거 봤어? <i>❤️</i>", "이 장면 저장 <i>❤️</i>"]
};
/* 자리(좌표)는 고정하고 그 안의 말만 하나씩 갈아 끼운다. 전부 지웠다
   다시 채우면 그 사이 열이 텅 비어 무너진 것처럼 보인다. */
function runChats(kind, ms) {
  var els = [].slice.call(document.querySelectorAll(".cin-side--" + kind + " .cin-msg"));
  if (!els.length) return null;
  var pool = CIN_POOL[kind], k = 0, i = 0;
  els.forEach(function (el, n) {
    setTimeout(function () { el.classList.add("on"); }, 90 + n * 160);
  });
  if (ms > 100000) return null;
  return setInterval(function () {
    var el = els[i++ % els.length];
    el.classList.remove("on");
    setTimeout(function () {
      el.innerHTML = pool[k++ % pool.length];
      el.classList.add("on");
    }, 440);
  }, ms);
}

/* 떠오르는 이모지. 확장에 실제로 있는 반응이라 여기서도 같은 모양으로 쓴다 */
var CIN_EMO = ["🔥", "😂", "😭", "👏", "😱"];
function spawnEmoji(host) {
  if (!host) return;
  var s = document.createElement("span");
  s.className = "floater";
  s.textContent = CIN_EMO[Math.floor(Math.random() * CIN_EMO.length)];
  s.style.left = (6 + Math.random() * 66) + "%";
  host.appendChild(s);
  setTimeout(function () { s.remove(); }, 2700);
}

var cinEl = document.getElementById("rooms");
if (cinEl) {
  var cinPubT = null, cinGrpT = null, cinEmoT = null, cinReactT = null;
  function cinStart() {
    if (cinPubT) return;
    cinPubT = runChats("pub", reduce ? 99999999 : 1700);
    cinGrpT = runChats("grp", reduce ? 99999999 : 3900);
    if (reduce) return;
    cinEmoT = setInterval(function () {
      if (Math.random() < .65) spawnEmoji(document.getElementById("cinFloaters"));
    }, 1400);
    /* 반응 수는 올라가기만 한다 - 누른 걸 되돌리는 화면은 없다.
       시청자 수는 드나드는 사람이 있어 오르내린다. */
    var rs = cinEl.querySelectorAll("[data-react]");
    cinReactT = setInterval(function () {
      var el = rs[Math.floor(Math.random() * rs.length)];
      if (el) el.textContent = parseInt(el.textContent, 10) + 1;
      var v = document.getElementById("cinViewers");
      if (v && Math.random() < .5)
        v.textContent = Math.max(2, parseInt(v.textContent, 10) + (Math.random() < .6 ? 1 : -1));
    }, 2400);
  }
  function cinStop() {
    [cinPubT, cinGrpT, cinEmoT, cinReactT].forEach(clearInterval);
    cinPubT = cinGrpT = cinEmoT = cinReactT = null;
  }
  if (reduce) { cinStart(); }
  else {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { e.isIntersecting ? cinStart() : cinStop(); });
    }, { threshold: .12 }).observe(cinEl);
  }
}
