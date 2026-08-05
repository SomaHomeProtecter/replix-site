/* 인기 회차 — 3단계 하한선(HP-87, 2026-08-05 결정).
   1단계 실시간: 시청자 2명 이상인 회차가 5개 이상 → 실제 인원·실제 반응 텍스트, LIVE 배지.
   2단계 누적:   반응이 쌓인 회차가 5개 이상       → 작품·회차만, 수치·미리보기 전부 숨김.
   3단계 대체:   위 둘 다 미달(배포 직후 등)        → 넷플릭스 한국 TV Top5(Tudum, 실물) + 출처 표기.
   BE가 죽거나 응답이 늦어도 fetchJson 이 빈 값을 돌려주므로 항상 3단계로 안전하게 떨어진다 —
   빈 화면이 스치는 구간이 없다. */
import { reduce, fetchJson } from './common.js';
import { publicStats } from './publicStats.js';

var MIN_LIVE_SHOWS = 5, MIN_LIVE_VIEWERS = 2;
var MIN_CUMULATIVE = 5;

/* 3단계 대체 — 넷플릭스 한국 TV Top5(Tudum, 2026-07-20~26 주간) 실물. 수치·미리보기 없음:
   Replix 실사용 반응이 아니라 그저 "지금 이 작품들이 인기"라는 사실만 전한다. */
var FALLBACK = [
  { show: "동궁", color: "#3a2a5e",
    desc: "귀신의 소리를 듣는 궁녀와 영혼을 넘나드는 구천이 동궁에 깃든 저주를 파헤치는 미스터리 오컬트 사극." },
  { show: "김부장", color: "#23425f",
    desc: "평범한 가장으로 살던 김부장이 흔적도 없이 사라진 딸을 찾아 나서는 추적 액션." },
  { show: "아파트", color: "#b8500f",
    desc: "100억을 노리는 가짜 가족의 사기 프로젝트가 굴러가는 범죄 코미디." },
  { show: "오싹한 연애", color: "#6b1e3f",
    desc: "무서운데 자꾸 설레는 로맨틱 코미디 미스터리 호러." },
  { show: "모태솔로지만 연애는 하고 싶어", color: "#8f3f5c",
    desc: "생애 첫 연애에 도전하는 모태솔로들의 리얼 연애 예능." }
];

var chart = document.getElementById("chartList");
var eyebrowEl = document.getElementById("chartEyebrow");
var titleEl = document.getElementById("chartTitle");
var noteEl = document.getElementById("chartNote");
var liveEl = document.getElementById("chartLive");
var sourceEl = document.getElementById("chartSource");

var COPY = {
  1: { eyebrow: "LIVE EPISODES", title: "지금 사람들이<br>보고 있는 회차",
       note: "회차마다 방이 하나씩 열려 있습니다. 사람이 많은 회차에는 그만큼 많은 말이 쌓여 있습니다.",
       live: true, source: null },
  2: { eyebrow: "누적 반응", title: "사람들이<br>많이 반응한 회차",
       note: "지금 순간이 아니라 지금까지 쌓인 반응 기준입니다. 숫자 대신 어떤 회차인지만 보여드립니다.",
       live: false, source: null },
  3: { eyebrow: "지금 인기 있는 작품", title: "넷플릭스에서<br>지금 인기 있는 작품",
       note: "Replix 는 아직 서비스 초기라 실사용 데이터가 충분하지 않습니다. 그동안은 넷플릭스에서 지금 인기 있는 작품을 보여드립니다.",
       live: false, source: "출처: 넷플릭스 한국 TV Top5 · Tudum 2026-07-20~26 주간" }
};

function applyCopy(tier) {
  var c = COPY[tier];
  if (eyebrowEl) eyebrowEl.textContent = c.eyebrow;
  if (titleEl) titleEl.innerHTML = c.title;
  if (noteEl) noteEl.textContent = c.note;
  // .chart-live·.chart-source 는 CSS가 display 를 직접 정해 둬(author stylesheet가 UA의
  // [hidden]{display:none} 과 동점 specificity라 뒤에 오는 쪽이 이긴다) hidden 속성이 안 먹는다
  // (2026-08-05 실측 — 3단계에서 "실시간" 배지가 그대로 보였다). style.display 로 직접 끈다.
  if (liveEl) liveEl.style.display = c.live ? "" : "none";
  if (sourceEl) {
    if (c.source) { sourceEl.textContent = c.source; sourceEl.style.display = ""; }
    else sourceEl.style.display = "none";
  }
}

/* LiveShow(HP-164 API) → 카드가 쓰는 모양. 시즌/회차·색은 그대로, 인원은 구간 합, 인용은
   인원이 가장 많은 구간의 실제 채팅(있으면)이다. */
function fromLiveShow(s) {
  var segs = s.segments || [];
  var viewers = segs.reduce(function (a, b) { return a + b.viewers; }, 0);
  var top = segs.slice().sort(function (a, b) { return b.viewers - a.viewers; })[0];
  return {
    show: s.show, epLabel: s.episodeNumber ? s.episodeNumber + "화" : "",
    color: s.color, viewers: viewers, quote: (top && top.quote) || ""
  };
}

/* TopEpisode(HP-87 API, 수치 없음) → 카드가 쓰는 모양. */
function fromTopEpisode(e) {
  return { show: e.show, epLabel: e.episodeNumber ? e.episodeNumber + "화" : "", color: e.color };
}

function decideTier(live, stats) {
  var liveCandidates = (live.shows || [])
      .filter(function (s) {
        return (s.segments || []).reduce(function (a, b) { return a + b.viewers; }, 0) >= MIN_LIVE_VIEWERS;
      })
      .slice(0, 5)
      .map(fromLiveShow);
  if (liveCandidates.length >= MIN_LIVE_SHOWS) return { tier: 1, items: liveCandidates };

  var cumulative = (stats.topEpisodes || []).slice(0, 5).map(fromTopEpisode);
  if (cumulative.length >= MIN_CUMULATIVE) return { tier: 2, items: cumulative };

  return { tier: 3, items: FALLBACK };
}

if (chart) {
  Promise.all([fetchJson('/api/v1/live-scenes', { shows: [] }), publicStats])
    .then(function (r) { return decideTier(r[0], r[1]); })
    .then(function (r) { applyCopy(r.tier); render(r.tier, r.items); });
}

function render(tier, items) {
  function epiInner(x, i, big) {
    var live = tier === 1;
    var epChip = x.epLabel ? '<span class="epi-ep">' + x.epLabel + '</span>' : '';
    var rank = big ? '<span class="epi-rank">TOP ' + (i + 1) + '</span>' : '';
    var stats = (live && big)
      ? '<p class="epi-stats"><span><b class="num">' + x.viewers + '</b>명 시청 중</span></p>' : '';
    var desc = (!live && big && x.desc) ? '<p class="epi-desc">' + x.desc + '</p>' : '';
    var quote = (live && x.quote) ? '<p class="epi-quote">' + x.quote + '</p>' : '';
    return (live ? '<span class="epi-live">지금 대화 중</span><span class="epi-gap"></span>' : '') +
      '<h3 class="epi-title">' + x.show + epChip + rank + '</h3>' +
      stats + desc + quote;
  }
  function epiHtml(x, i, big) {
    return '<article class="epi' + (big ? " epi--big" : "") + '" style="--pc:' + x.color + '">' +
      (big ? '<span class="zap" aria-hidden="true"></span>' : '') +
      epiInner(x, i, big) +
    '</article>';
  }
  chart.innerHTML =
    epiHtml(items[0], 0, true) +
    '<div class="epi-row"><div class="epi-track" id="epiTrack">' +
      items.slice(1).map(function (x, j) { return epiHtml(x, j + 1, false); }).join("") +
    '</div></div>';

  /* ── 아랫줄 무한 캐러셀 - 3초마다 한 칸씩, 끝과 처음이 잇닿는다. */
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
    if (!reduce && epiN > 1) setInterval(function () {
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

  /* ── 큰 카드 '채널 재핑' 전환 - 같은 목록을 9초마다 순환해 보여준다(새 데이터를
     만들지 않는다 — 이미 받아 온 items 를 도는 것뿐). */
  var bigCard = chart.querySelector(".epi--big");
  if (bigCard && !reduce && items.length > 1) {
    var bigIdx = 0, bigHov = false;
    bigCard.addEventListener("pointerenter", function () { bigHov = true; });
    bigCard.addEventListener("pointerleave", function () { bigHov = false; });
    setInterval(function () {
      if (bigHov || document.hidden) return;
      bigIdx = (bigIdx + 1) % items.length;
      var x = items[bigIdx];
      bigCard.classList.remove("zapped");
      bigCard.classList.add("zapping");
      setTimeout(function () {
        bigCard.style.setProperty("--pc", x.color);
        bigCard.innerHTML = '<span class="zap" aria-hidden="true"></span>' + epiInner(x, bigIdx, true);
        void bigCard.offsetWidth;
        bigCard.classList.remove("zapping");
        bigCard.classList.add("zapped");
      }, 200);
    }, 9000);
  }
}
