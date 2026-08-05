/* 반응이 몰린 구간 — 히트맵 재생·구간 이동·회차에 쌓인 반응 목록. */
import { reduce, EP_LEN, mmss, av, msgHtml, density, buildHeat } from './common.js';

/* ═══ 반응이 몰린 구간 ══════════════════════════════════════
   히트맵은 회차 전체가 처음부터 그려져 있고, 위치를 옮기면 그 지점에
   남겨진 말이 바뀐다. 붙은 시각이 며칠 전부터 방금까지 섞여 있는 것이
   이 서비스의 정체성이라 목록에 그대로 노출한다. */
/* 회차에 쌓인 반응. 손으로 나열하는 대신 히트맵과 같은 밀도 함수로
   생성한다 - 그래야 파형이 높은 구간에서 실제로 채팅이 쏟아지고,
   낮은 구간에서도 끊기지 않을 만큼은 나온다. 난수는 시드를 고정해
   새로 고쳐도 같은 회차가 되게 한다. */
var CHAT_POOL = [
  "이 장면 진짜", "소름", "음악 미쳤다", "여기서 멈췄다", "표정 봐라", "숨 참고 봄",
  "세 번째 보는데도 놀람", "왜 뒤를 안 돌아봐", "손에 땀 남", "이거 복선이었네",
  "심장 떨어짐", "조명 미쳤네", "다시 돌려봄", "정주행 시작", "이 대사 좋다",
  "여기 좋아", "화질 좋다", "오프닝 음악 뭐임", "잠깐 조는 중", "슬슬 마무리 되나",
  "끝나고 한참 앉아 있었다", "2화부터 복선이었네", "이 사람 등장할 때마다 긴장됨",
  "다들 여기서 멈추네", "나만 놀란 거 아니지", "오늘 처음 봄", "몇 번째 보는지 모르겠다",
  "여기 진짜 미쳤다", "이 배우 처음 보는데 좋다", "배경음 뭐죠", "다시 봐도 무섭다",
  "울었다", "이 부분 저장했다", "왜 이걸 이제 봤지", "친구랑 같이 봐야 함",
  "소리 켜고 봐야 함", "혼자 보기 아깝다", "이 연출 뭔데", "여기 편집 좋다",
  "쟤 표정이 다 말해줌", "말이 안 나온다", "긴장돼서 멈췄다", "심호흡 중",
  "이 장면만 세 번 봄", "여기부터 못 멈춤", "결국 밤새 봤다", "다음 화 바로 간다",
  "기대 이상이다", "괜히 유명한 게 아니네", "이 색감 좋다", "카메라 움직임 봐라",
  "대사 한 줄이 다 했다", "여기 왜 이렇게 조용하지", "숨소리까지 들린다",
  "방금 뭐였지", "다시 봐야 알겠다", "복선 회수 미쳤다", "여기서 반전",
  "예상 못 했다", "이래서 다들 봤구나"
];
var WHO = [
  { n: "은재", c: "#3f6bd6" }, { n: "도현", c: "#b45309" }, { n: "하람", c: "#7c3aed" },
  { n: "민서", c: "#0f766e" }, { n: "태오", c: "#3f6bd6" }, { n: "유나", c: "#15803d" },
  { n: "지우", c: "#be123c" }, { n: "세연", c: "#a21caf" }
];
var AGO = ["방금", "3분 전", "22분 전", "1시간 전", "4시간 전", "8시간 전",
           "어제", "이틀 전", "3일 전", "5일 전", "일주일 전"];

var ARCHIVE = (function () {
  var seed = 20260730;
  function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
  var out = [], t = 6, k = 0;
  while (t < EP_LEN - 4) {
    var d = density(t / EP_LEN);
    /* 밀도가 낮아도 최소한은 나오고(약 40초 간격), 봉우리에서는 8초까지 촘촘해진다.
       재생이 1초에 약 50초를 나아가므로 조용한 구간에서도 1초에 한 줄은 도착한다. */
    var gap = 17 / (0.28 + d * 1.7);
    t += gap * (0.72 + rnd() * 0.56);
    if (t >= EP_LEN - 4) break;
    var w = WHO[Math.floor(rnd() * WHO.length)];
    var m = {
      s: Math.round(t),
      n: w.n, c: w.c,
      t: CHAT_POOL[(k * 7 + Math.floor(rnd() * 5)) % CHAT_POOL.length],
      tail: AGO[Math.floor(rnd() * AGO.length)]
    };
    if (rnd() < 0.22) m.likes = 1 + Math.floor(rnd() * 12);
    out.push(m);
    k++;
  }
  return out;
})();

var SEGS = [
  { s: 771,  label: "첫 등장" },
  { s: 1878, label: "복도 끝에서" },
  { s: 2641, label: "마지막 통화" }
];

var hm = document.getElementById("hm");
var hmPlot = document.getElementById("hmPlot"), hmBars = document.getElementById("hmBars");
var hmCursor = document.getElementById("hmCursor"), hmBadge = document.getElementById("hmBadge");
var hmMarks = document.getElementById("hmMarks"), hmList = document.getElementById("hmList");
var hmSideT = document.getElementById("hmSideT"), hmSideN = document.getElementById("hmSideN");
var hmGo = document.getElementById("hmGo");
var hmSpans = hmBars ? buildHeat(hmBars, 88) : null;
var hmLive = document.getElementById("hmLive");

/* 지금 이 회차를 보고 있는 사람들의 구간별 분포. 확장에서는 presence 가
   모은 재생 위치를 구간으로 묶어 준다(HP-164 → HP-192). 붉은 파형이
   '쌓인 반응'이라면 이 줄은 '지금 이 순간'이라 색으로 갈라 둔다.
   인원은 항상 4 이상이라 얼굴 3 + 나머지 배지 형태가 유지된다. */
var PODS = [
  { p: 0.112, n: 4 }, { p: 0.268, n: 8 }, { p: 0.44,  n: 5 },
  { p: 0.655, n: 11 }, { p: 0.788, n: 4 }, { p: 0.906, n: 6 }
];
var PODS_FACES = 3;

function renderPods() {
  if (!hmLive) return;
  PODS.forEach(function (g, i) {
    var el = document.createElement("span");
    el.className = "hm-live-pod";
    el.style.left = (g.p * 100) + "%";
    var html = "";
    for (var k = 0; k < PODS_FACES; k++) {
      var w = WHO[(i * 3 + k) % WHO.length];
      html += av(w.n, w.c);
    }
    html += '<span class="hm-live-n">+' + (g.n - PODS_FACES) + '</span>';
    el.innerHTML = html;
    hmLive.appendChild(el);
    g.el = el;
    g.badge = el.querySelector(".hm-live-n");
  });
}
/* 보고 있는 사람들도 재생 중이라 조금씩 앞으로 간다. 속도를 살짝 달리해
   한 덩어리로 움직이지 않게 한다. */
function stepPods() {
  for (var i = 0; i < PODS.length; i++) {
    var g = PODS[i];
    g.p += 0.0015 + (i % 3) * 0.0005;
    if (g.p > 1) g.p = 0;
    if (g.el) g.el.style.left = (g.p * 100) + "%";
  }
  if (Math.random() < 0.14) {
    var t = PODS[Math.floor(Math.random() * PODS.length)];
    t.n = Math.max(4, Math.min(15, t.n + (Math.random() < 0.5 ? -1 : 1)));
    if (t.badge) t.badge.textContent = "+" + (t.n - PODS_FACES);
  }
}
/* 커서 근처(약 100초)에 있는 사람들을 이 구간 시청자로 센다 */
function podsNear(sec) {
  var p = sec / EP_LEN, sum = 0;
  for (var i = 0; i < PODS.length; i++) if (Math.abs(PODS[i].p - p) < 0.035) sum += PODS[i].n;
  return sum;
}
renderPods();


if (hmMarks) {
  hmMarks.innerHTML = SEGS.map(function (g) {
    return '<button class="hm-mark" type="button" data-s="' + g.s + '" aria-label="' +
      mmss(g.s) + ' ' + g.label + ' 로 이동"><span>' + g.label + '</span></button>';
  }).join("");
  var mk = hmMarks.querySelectorAll(".hm-mark");
  for (var mi = 0; mi < mk.length; mi++) mk[mi].style.left = (SEGS[mi].s / EP_LEN * 100) + "%";
}

/* ── 재생 진행 ─────────────────────────────────────────────
   커서는 한 방향으로만 나아가고, 지나간 지점의 채팅이 목록에 하나씩
   쌓인다. 매 스텝 목록을 다시 그리면 같은 채팅이 반복 렌더되어
   새로고침처럼 보였다. 되감기는 '재생'이 아니라 seek이므로, 회차
   끝에 닿으면 처음으로 돌아가며 목록을 비운다. */
var PLAY_STEP = 13;        // 260ms마다 나아가는 재생 시간(초)
var LIST_CAP = 18;         // 아래 정렬이라 넘친 줄은 위로 잘린다. DOM 누적만 막는 값
var playing = true, autoTimer = null, autoPos = 640;
var loadTimers = [];
function clearLoad() {
  for (var i = 0; i < loadTimers.length; i++) clearTimeout(loadTimers[i]);
  loadTimers = [];
}

function paintCursor(sec) {
  var p = sec / EP_LEN, pc = (p * 100) + "%";
  if (hmCursor) hmCursor.style.left = pc;
  if (hmBadge) { hmBadge.style.left = pc; hmBadge.textContent = mmss(sec); }
  if (hmSideT) hmSideT.textContent = mmss(sec);
  if (hmSideN) hmSideN.textContent = podsNear(sec);
  if (hmPlot) {
    hmPlot.setAttribute("aria-valuenow", Math.round(sec));
    hmPlot.setAttribute("aria-valuetext", Math.floor(sec / 60) + "분 " + Math.floor(sec % 60) + "초");
  }
  /* 커서 근처 막대만 또렷하게 - 지금 어느 구간을 보고 있는지 드러난다 */
  if (hmSpans) {
    var near = Math.round(p * hmSpans.length);
    for (var i = 0; i < hmSpans.length; i++) {
      hmSpans[i].style.opacity = Math.abs(i - near) < 4 ? "1" : "0.42";
    }
  }
  if (hmMarks) {
    hmMarks.querySelectorAll(".hm-mark").forEach(function (b) {
      b.classList.toggle("on", Math.abs(parseFloat(b.dataset.s) - sec) <= 45);
    });
  }
}

function pushMsg(m) {
  if (!hmList) return;
  var empty = hmList.querySelector(".hm-empty");
  if (empty) empty.remove();
  hmList.insertAdjacentHTML("beforeend", msgHtml(m));
  while (hmList.children.length > LIST_CAP) hmList.removeChild(hmList.firstChild);
}
/* seek 은 그 지점 기준으로 목록을 다시 채운다 - 확장도 위치를 옮기면
   그 시점 히스토리를 새로 불러온다. */
function reloadList(sec) {
  if (!hmList) return;
  clearLoad();
  var hits = ARCHIVE.filter(function (m) { return m.s <= sec; }).slice(-5);
  if (!hits.length) {
    hmList.innerHTML = '<p class="hm-empty">이 지점에는 아직 아무 말도 없습니다</p>';
    return;
  }
  hmList.innerHTML = "";
  /* 한 번에 밀어 넣으면 다섯 줄이 동시에 튀어나와 부자연스럽다.
     도착 간격을 두어 흘러들어오게 한다. */
  hits.forEach(function (m, i) {
    loadTimers.push(setTimeout(function () { pushMsg(m); }, i * 135));
  });
}
function seekTo(sec) {
  autoPos = Math.max(0, Math.min(EP_LEN, sec));
  if (hm) hm.classList.add("touched");
  paintCursor(autoPos);
  reloadList(autoPos);
}

function autoStep() {
  var prev = autoPos;
  autoPos += PLAY_STEP;
  if (autoPos > EP_LEN) {          // 회차 끝 - 처음으로 돌아가며 목록을 비운다
    autoPos = 0; prev = -1;
    clearLoad();
    if (hmList) hmList.innerHTML = '<p class="hm-empty">이 지점에는 아직 아무 말도 없습니다</p>';
  }
  stepPods();
  paintCursor(autoPos);
  var due = [];
  for (var i = 0; i < ARCHIVE.length; i++) {
    if (ARCHIVE[i].s > prev && ARCHIVE[i].s <= autoPos) due.push(ARCHIVE[i]);
  }
  /* 한 스텝(260ms)에 여러 개가 걸리는 구간에서는 동시에 튀어나온다.
     스텝 안에 고르게 흘려보내 하나씩 도착하는 느낌을 만든다. */
  var slot = due.length > 1 ? 225 / due.length : 0;
  due.forEach(function (m, k) {
    if (!k) { pushMsg(m); return; }
    loadTimers.push(setTimeout(function () { pushMsg(m); }, k * slot));
  });
}
function startAuto() { if (!autoTimer && playing && !reduce) autoTimer = setInterval(autoStep, 260); }
function stopAuto()  { clearInterval(autoTimer); autoTimer = null; }

var ICON_PAUSE = '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
  '<rect x="6.5" y="5" width="4" height="14" rx="1.2"/><rect x="13.5" y="5" width="4" height="14" rx="1.2"/></svg>';
var ICON_PLAY = '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
  '<path d="M8 5.2v13.6L19 12z"/></svg>';
var hmPlay = document.getElementById("hmPlay");
function setPlaying(on) {
  playing = on;
  if (hmPlay) {
    hmPlay.innerHTML = on ? ICON_PAUSE : ICON_PLAY;
    hmPlay.setAttribute("aria-pressed", on ? "true" : "false");
    hmPlay.setAttribute("aria-label", on ? "일시정지" : "재생");
  }
  if (on) startAuto(); else stopAuto();
}
if (hmPlay) {
  hmPlay.innerHTML = ICON_PAUSE;
  hmPlay.addEventListener("click", function () { setPlaying(!playing); });
}

if (hmMarks) {
  hmMarks.addEventListener("click", function (ev) {
    var b = ev.target.closest(".hm-mark");
    if (b) seekTo(parseFloat(b.dataset.s));
  });
}

if (hmPlot) {
  var drag = false;
  function at(ev) {
    var r = hmPlot.getBoundingClientRect();
    var x = (ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left;
    return Math.max(0, Math.min(1, x / r.width)) * EP_LEN;
  }
  hmPlot.addEventListener("pointerdown", function (ev) {
    drag = true; hmPlot.setPointerCapture(ev.pointerId); seekTo(at(ev));
  });
  /* 끄는 동안에는 커서만 따라오고, 손을 떼는 순간 그 지점 목록을 받는다 */
  hmPlot.addEventListener("pointermove", function (ev) {
    if (!drag) return;
    autoPos = at(ev); paintCursor(autoPos);
  });
  hmPlot.addEventListener("pointerup", function () { if (drag) { drag = false; seekTo(autoPos); } });
  hmPlot.addEventListener("pointercancel", function () { drag = false; });
  hmPlot.addEventListener("keydown", function (ev) {
    var cur = parseFloat(hmPlot.getAttribute("aria-valuenow")) || 0, st = ev.shiftKey ? 120 : 30;
    if (ev.key === "ArrowRight") { seekTo(cur + st); ev.preventDefault(); }
    if (ev.key === "ArrowLeft")  { seekTo(cur - st); ev.preventDefault(); }
    if (ev.key === "Home") { seekTo(0); ev.preventDefault(); }
    if (ev.key === "End")  { seekTo(EP_LEN); ev.preventDefault(); }
    if (ev.key === " " || ev.key === "Enter") { setPlaying(!playing); ev.preventDefault(); }
  });
  paintCursor(autoPos);
  reloadList(autoPos);
}

/* '이 지점으로 이동'은 목업이라 옮길 실제 재생이 없다. 대신 그 지점의
   반응을 다시 받아, 눌렀다는 것이 보이게 한다. */
if (hmGo) {
  hmGo.addEventListener("click", function () {
    seekTo(parseFloat(hmPlot.getAttribute("aria-valuenow")) || 0);
  });
}

/* 화면에 들어오면 조립된다 - 막대가 왼쪽부터 차오른 뒤 재생이 시작된다.
   화면을 벗어나면 타이머만 멈추고 재생/정지 선택은 그대로 기억한다. */
var darkBand = document.querySelector(".band-dark");
if (darkBand) {
  if (reduce) {
    if (hmSpans) for (var q = 0; q < hmSpans.length; q++) hmSpans[q].style.height = hmSpans[q].dataset.h + "%";
  } else {
    var built = false;
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) {
          if (!built) {
            built = true;
            if (hmSpans) for (var i = 0; i < hmSpans.length; i++) {
              (function (k) {
                setTimeout(function () { hmSpans[k].style.height = hmSpans[k].dataset.h + "%"; }, k * 8);
              })(i);
            }
            setTimeout(startAuto, 1100);
          } else { startAuto(); }
        } else { stopAuto(); }
      });
    }, { threshold: .16 }).observe(darkBand);
  }
}
