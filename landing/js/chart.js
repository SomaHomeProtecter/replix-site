/* 인기 회차 — 지금 열려 있는 회차 방 카드. */
import { reduce, av } from './common.js';

/* ═══ 인기 회차 ═════════════════════════════════════════════
   포스터는 색면으로 그린다(HP-192 방식). */
/* 작품은 넷플릭스 한국 TV Top 10 (Tudum, 2026-07-20~26 주간) 실물이다:
   1위 동궁 · 2위 김부장 · 3위 아파트 · 4위 오싹한 연애 ·
   5위 모태솔로지만 연애는 하고 싶어 시즌2. 시청 인원·채팅·회차·반응은
   전부 예시(푸터 고지 참조)이고, 색은 각 작품의 분위기에서 딴 것이다. */
/* d = 작품 한 줄 소개(공식 소개 기반 요약). 큰 카드가 어떤 작품을
   비추든 쓸 수 있게 전 작품에 두고, "지금 N화의 한 장면에…" 꼬리는
   렌더러가 회차 번호로 만들어 붙인다. */
var TITLES = [
  { t: "동궁", ep: 3, pc: "#3a2a5e", n: 42, chats: 1180, peaks: [.2,.34,.68,.9],
    d: "귀신의 소리를 듣는 궁녀와 영혼을 넘나드는 구천이 동궁에 깃든 저주를 파헤치는 미스터리 오컬트 사극.",
    last: ["지우","#be123c","귀매 나올 때마다 소름 돋음","방금"],
    peek: [{n:"지우",c:"#be123c",t:"귀매 나올 때마다 소름 돋음",likes:5},
           {n:"태오",c:"#3f6bd6",t:"이 사극 왜 이렇게 무섭냐"},
           {n:"유나",c:"#15803d",t:"생강 연기 미쳤다",likes:12}] },
  { t: "김부장", ep: 9, pc: "#23425f", n: 31, chats: 864, peaks: [.12,.5,.72,.86],
    d: "평범한 가장으로 살던 김부장이 흔적도 없이 사라진 딸을 찾아 나서는 추적 액션.",
    last: ["민서","#0f766e","김부장 액션 미쳤다","2분 전"],
    peek: [{n:"민서",c:"#0f766e",t:"김부장 액션 미쳤다",likes:8},
           {n:"은재",c:"#3f6bd6",t:"딸 찾을 때까지 정주행"}] },
  { t: "아파트", ep: 5, pc: "#b8500f", n: 24, chats: 623, peaks: [.3,.46,.79,.94],
    d: "100억을 노리는 가짜 가족의 사기 프로젝트가 굴러가는 범죄 코미디.",
    last: ["도현","#b45309","가짜 가족 케미 뭔데 ㅋㅋ","4분 전"],
    peek: [{n:"도현",c:"#b45309",t:"가짜 가족 케미 뭔데 ㅋㅋ",likes:11},
           {n:"하람",c:"#7c3aed",t:"사기 설계 천재적이다"}] },
  { t: "오싹한 연애", ep: 4, pc: "#6b1e3f", n: 17, chats: 402, peaks: [.24,.4,.6,.88],
    d: "무서운데 자꾸 설레는 로맨틱 코미디 미스터리 호러.",
    last: ["유나","#15803d","무서운데 자꾸 설렘","7분 전"],
    peek: [{n:"유나",c:"#15803d",t:"무서운데 자꾸 설렘",likes:6},
           {n:"지우",c:"#be123c",t:"이 조합 왜 잘 어울리지"}] },
  { t: "모태솔로지만 연애는 하고 싶어", ep: 8, pc: "#8f3f5c", n: 9, chats: 148, peaks: [.18,.44,.66,.82],
    d: "생애 첫 연애에 도전하는 모태솔로들의 리얼 연애 예능.",
    last: ["태오","#3f6bd6","이번 기수 텐션 장난 아님","12분 전"],
    peek: [{n:"태오",c:"#3f6bd6",t:"이번 기수 텐션 장난 아님",likes:2}] },
  { t: "참교육", ep: 10, pc: "#1f5747", n: 21, chats: 512, peaks: [.22,.48,.7,.9],
    d: "무너진 교권을 바로 세우러 나서는 웹툰 원작 액션.",
    last: ["하람","#7c3aed","오늘도 사이다다 ㅋㅋ","6분 전"],
    peek: [{n:"하람",c:"#7c3aed",t:"오늘도 사이다다 ㅋㅋ",likes:4}] }
];
var chart = document.getElementById("chartList");
if (chart) {
  /* 첫 항목은 큰 카드(최근 말 두 줄), 나머지는 아랫줄 작은 카드(한 줄).
     카드 배경은 작품 고유색(--pc)이 CSS 그라디언트로 물든 익명의 장면이다. */
  function epiSpark(x) {
    var spark = "";
    for (var b = 0; b < 22; b++) {
      var v = 10;
      for (var q = 0; q < x.peaks.length; q++) {
        var d = b / 22 - x.peaks[q];
        v += 90 * Math.exp(-(d * d) / 0.0035);
      }
      spark += '<i style="height:' + Math.min(100, Math.round(v)) + '%"></i>';
    }
    return '<span class="epi-spark" aria-hidden="true">' + spark + '</span>';
  }
  function epiMsg(n, c, t, tail) {
    return '<span class="epi-msg">' + av(n, c) + '<i>' + t + '</i>' +
      (tail ? '<em>' + tail + '</em>' : '') + '</span>';
  }
  /* 라이브 틱이 올린 채팅 수를 큰 카드 재핑 후에도 이어 가도록 공유 */
  var counts = TITLES.map(function (x) { return x.chats; });
  function epiInner(x, i, big) {
    var msgs = big
      ? x.peek.slice(0, 2).map(function (m) {
          return epiMsg(m.n, m.c, m.t, m.likes ? "❤️ " + m.likes : "");
        }).join("")
      : epiMsg(x.last[0], x.last[1], x.last[2], x.last[3]);
    return epiSpark(x) +
      '<span class="epi-live">지금 대화 중</span>' +
      '<span class="epi-gap"></span>' +
      '<h3 class="epi-title">' + x.t + '<span class="epi-ep">' + x.ep + '화</span>' +
      (big ? '<span class="epi-rank">TOP ' + (i + 1) + '</span>' : '') + '</h3>' +
      '<p class="epi-stats"><span><b class="num" data-n="' + i + '">' + x.n + '</b>명 시청 중</span>' +
      '<span>채팅 <b class="num" data-c="' + i + '">' + counts[i].toLocaleString("ko-KR") + '</b></span></p>' +
      (big && x.d ? '<p class="epi-desc">' + x.d + " 지금 " + x.ep + "화의 한 장면에 말이 몰리고 있어요.</p>" : '') +
      '<div class="epi-msgs">' + msgs + '</div>';
  }
  function epiHtml(x, i, big) {
    return '<article class="epi' + (big ? " epi--big" : "") + '" data-epi="' + i + '"' +
      ' style="--pc:' + x.pc + '">' +
      (big ? '<span class="zap" aria-hidden="true"></span>' : '') +
      epiInner(x, i, big) +
    '</article>';
  }
  chart.innerHTML =
    epiHtml(TITLES[0], 0, true) +
    '<div class="epi-row"><div class="epi-track" id="epiTrack">' +
      TITLES.slice(1).map(function (x, j) { return epiHtml(x, j + 1, false); }).join("") +
    '</div></div>';

  /* ── 아랫줄 무한 캐러셀 - 3초마다 한 칸씩 왼쪽으로, 끝과 처음이
     잇닿는다. 앞쪽 카드 복제를 끝에 붙이고, 복제 구간에 도착하면
     전환 없이 0 으로 되감는다. 마우스가 올라가 있으면 멈춘다. */
  var epiTrack = document.getElementById("epiTrack");
  if (epiTrack) {
    var epiItems = [].slice.call(epiTrack.children);
    var epiN = epiItems.length, epiGap = 18, epiIdx = 0, epiHov = false;
    for (var ec = 0; ec < Math.min(4, epiN); ec++) {
      epiTrack.appendChild(epiItems[ec].cloneNode(true));
    }
    function epiPerView() {
      return innerWidth > 1100 ? 4 : innerWidth > 560 ? 2 : 1;
    }
    function epiSetX(anim) {
      var cw = epiTrack.children[0].getBoundingClientRect().width;
      epiTrack.style.transition = anim ? "transform .6s var(--ease)" : "none";
      epiTrack.style.transform = "translateX(" + (-epiIdx * (cw + epiGap)) + "px)";
    }
    function epiLayout() {
      var pv = epiPerView();
      epiGap = parseFloat(getComputedStyle(epiTrack).columnGap) || 18;
      var cw = (epiTrack.parentElement.clientWidth - (pv - 1) * epiGap) / pv;
      [].slice.call(epiTrack.children).forEach(function (el) {
        el.style.width = cw + "px";
      });
      epiSetX(false);
    }
    addEventListener("resize", epiLayout);
    epiLayout();
    epiTrack.parentElement.addEventListener("pointerenter", function () { epiHov = true; });
    epiTrack.parentElement.addEventListener("pointerleave", function () { epiHov = false; });
    if (!reduce) setInterval(function () {
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

  /* ── 큰 카드 '채널 재핑' 전환 - 아랫줄 슬라이드와 겹치지 않는 9초
     주기로, 화면이 잠깐 꺼지듯 어두워졌다(노이즈 스캔라인) 다음
     작품의 색으로 다시 켜진다. 내용은 배지 → 제목 → 수치 → 소개 →
     채팅 순으로 스태거 등장. 마우스가 올라가 있으면 멈춘다. */
  var bigCard = chart.querySelector(".epi--big");
  if (bigCard && !reduce) {
    var bigIdx = 0, bigHov = false;
    bigCard.addEventListener("pointerenter", function () { bigHov = true; });
    bigCard.addEventListener("pointerleave", function () { bigHov = false; });
    setInterval(function () {
      if (bigHov || document.hidden) return;
      bigIdx = (bigIdx + 1) % TITLES.length;
      var x = TITLES[bigIdx];
      bigCard.classList.remove("zapped");
      bigCard.classList.add("zapping");
      setTimeout(function () {
        bigCard.style.setProperty("--pc", x.pc);
        bigCard.setAttribute("data-epi", String(bigIdx));
        bigCard.innerHTML = '<span class="zap" aria-hidden="true"></span>' +
          epiInner(x, bigIdx, true);
        void bigCard.offsetWidth;   // 리플로 강제 - 등장 애니메이션 재시동
        bigCard.classList.remove("zapping");
        bigCard.classList.add("zapped");
      }, 200);
    }, 9000);
  }

  /* '실시간' 이 정말 움직인다 - 인원이 오가고 채팅 수가 쌓이고
     스파크라인의 끝 막대가 반응한다. */
  if (!reduce) {
    /* 캐러셀 복제 카드까지 같은 숫자로 - 원본만 고치면 복제가 낡는다 */
    setInterval(function () {
      var i = Math.floor(Math.random() * TITLES.length);
      var nEls = chart.querySelectorAll('b[data-n="' + i + '"]');
      if (nEls.length) {
        var nv = Math.max(3, parseInt(nEls[0].textContent, 10) + (Math.random() < .5 ? -1 : 1));
        nEls.forEach(function (el) { el.textContent = nv; });
      }
      var cEls = chart.querySelectorAll('b[data-c="' + i + '"]');
      if (cEls.length) {
        counts[i] += 1 + Math.floor(Math.random() * 3);
        var cv = counts[i].toLocaleString("ko-KR");
        cEls.forEach(function (el) { el.textContent = cv; });
      }
      var hv = Math.min(100, 20 + Math.random() * 70) + "%";
      chart.querySelectorAll('.epi[data-epi="' + i + '"]').forEach(function (card) {
        var bars = card.querySelectorAll(".epi-spark i");
        if (bars.length) bars[bars.length - 1].style.height = hv;
      });
    }, 1600);
  }
}
