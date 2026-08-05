/* 리플릭스에서 많이 본 작품 — 누적 감상 시간 기준 실데이터(HP-87, 2026-08-05 결정).
   /api/v1/public-stats 의 mostWatched(최대 5개, 서버가 이미 랭킹까지 매겨 준다)를 그대로
   그린다. 5개보다 적으면 남는 칸은 "데이터 없음" 자리로 채운다 — 대체 콘텐츠로 메우지 않는다.
   서버가 죽거나 응답이 늦어도 fetchJson 이 빈 배열을 주므로 전부 "데이터 없음"으로 안전하게
   떨어진다(빈 화면이 스치는 구간이 없다). */
import { reduce } from './common.js';
import { publicStats } from './publicStats.js';

var SLOTS = 5;

var chart = document.getElementById("chartList");

if (chart) {
  publicStats.then(function (stats) { render(stats.mostWatched || []); });
}

function render(items) {
  function epiInner(x, i, big) {
    var quote = (x.quoteText)
      ? '<p class="epi-quote">' + x.quoteText + (x.quoteAuthor ? ' <span class="epi-quote-by">— ' + x.quoteAuthor + '</span>' : '') + '</p>'
      : '';
    var rank = big ? '<span class="epi-rank">TOP ' + (i + 1) + '</span>' : '';
    return '<h3 class="epi-title">' + x.show + rank + '</h3>' + quote;
  }
  function emptyInner() {
    return '<h3 class="epi-title epi-title--empty">데이터 없음</h3>' +
      '<p class="epi-quote epi-quote--empty">더 많은 사람이 감상하면 여기에 나타납니다.</p>';
  }
  function epiHtml(x, i, big) {
    if (!x) {
      return '<article class="epi epi--empty' + (big ? " epi--big" : "") + '">' + emptyInner() + '</article>';
    }
    return '<article class="epi' + (big ? " epi--big" : "") + '" style="--pc:' + x.color + '">' +
      (big ? '<span class="zap" aria-hidden="true"></span>' : '') +
      epiInner(x, i, big) +
    '</article>';
  }

  var slots = [];
  for (var s = 0; s < SLOTS; s++) slots.push(items[s] || null);

  chart.innerHTML =
    epiHtml(slots[0], 0, true) +
    '<div class="epi-row"><div class="epi-track" id="epiTrack">' +
      slots.slice(1).map(function (x, j) { return epiHtml(x, j + 1, false); }).join("") +
    '</div></div>';

  /* ── 아랫줄 무한 캐러셀 - 3초마다 한 칸씩, 끝과 처음이 잇닿는다. 실데이터가 하나도 없으면
     (4칸 전부 "데이터 없음") 굴릴 이유가 없어 건너뛴다. */
  var epiTrack = document.getElementById("epiTrack");
  if (epiTrack) {
    var epiItems = [].slice.call(epiTrack.children);
    var epiN = epiItems.length, epiGap = 18, epiIdx = 0, epiHov = false;
    for (var ec = 0; ec < Math.min(4, epiN); ec++) {
      epiTrack.appendChild(epiItems[ec].cloneNode(true));
    }
    function epiSetX(anim) {
      var cw = epiTrack.children[0].getBoundingClientRect().width;
      epiTrack.style.transition = anim ? "transform .6s var(--ease)" : "none";
      epiTrack.style.transform = "translateX(" + (-epiIdx * (cw + epiGap)) + "px)";
    }
    function epiPerView() { return innerWidth > 1100 ? 4 : innerWidth > 560 ? 2 : 1; }
    function epiLayout() {
      var pv = epiPerView();
      epiGap = parseFloat(getComputedStyle(epiTrack).columnGap) || 18;
      var cw = (epiTrack.parentElement.clientWidth - (pv - 1) * epiGap) / pv;
      [].slice.call(epiTrack.children).forEach(function (el) { el.style.width = cw + "px"; });
      epiSetX(false);
    }
    addEventListener("resize", epiLayout);
    epiLayout();
    epiTrack.parentElement.addEventListener("pointerenter", function () { epiHov = true; });
    epiTrack.parentElement.addEventListener("pointerleave", function () { epiHov = false; });
    if (!reduce && items.length > 1) setInterval(function () {
      if (epiHov || document.hidden) return;
      epiIdx++;
      epiSetX(true);
      if (epiIdx >= epiN) {
        epiTrack.addEventListener("transitionend", function h() {
          epiTrack.removeEventListener("transitionend", h);
          epiIdx = 0; epiSetX(false);
        });
      }
    }, 3000);
  }

  /* ── 큰 카드 '채널 재핑' 전환 - 실제 데이터가 2개 이상일 때만, 받아 온 것들을 9초마다 순환한다
     ("데이터 없음" 칸은 순환 대상에서 뺀다 — 실제 항목 사이만 오간다). */
  var real = items.slice(0, SLOTS);
  var bigCard = chart.querySelector(".epi--big");
  if (bigCard && !reduce && real.length > 1) {
    var bigIdx = 0, bigHov = false;
    bigCard.addEventListener("pointerenter", function () { bigHov = true; });
    bigCard.addEventListener("pointerleave", function () { bigHov = false; });
    setInterval(function () {
      if (bigHov || document.hidden) return;
      bigIdx = (bigIdx + 1) % real.length;
      var x = real[bigIdx];
      bigCard.classList.remove("zapped");
      bigCard.classList.add("zapping");
      setTimeout(function () {
        bigCard.classList.remove("epi--empty");
        bigCard.style.setProperty("--pc", x.color);
        bigCard.innerHTML = '<span class="zap" aria-hidden="true"></span>' + epiInner(x, bigIdx, true);
        void bigCard.offsetWidth;
        bigCard.classList.remove("zapping");
        bigCard.classList.add("zapped");
      }, 200);
    }, 9000);
  }
}
