/* 히어로 시뮬레이션 — 라이브 채팅 도착·탄막·재생바. */
import { reduce, EP_LEN, mmss, msgHtml, density, buildHeat } from './common.js';
import { track } from './analytics.js';

/* ═══ 히어로 시뮬레이션 ═════════════════════════════════════
   빠르고 다채롭게. 일반 채팅·이모지만 있는 채팅·답글·좋아요가
   섞여 도착하고, 좋아요는 나중에 숫자가 올라간다. */
var SEED = [
  { n: "세연", c: "#a21caf", t: "이제 3화 시작", tail: "27:14" },
  { n: "은재", c: "#3f6bd6", t: "오늘 몰아본다", tail: "27:31" },
  { n: "민서", c: "#0f766e", t: "여기까지 왔네", tail: "27:48" }
];
var LIVE = [
  { at: 0.6,  n: "은재", c: "#3f6bd6", t: "둘 사이 공기 얼어붙음" },
  { at: 1.4,  n: "도현", c: "#b45309", t: "소리 켜고 봐야 함", e: ["🔥"] },
  { at: 2.1,  n: "하람", c: "#7c3aed", t: "😱😱", big: true },
  { at: 2.8,  n: "민서", c: "#0f766e", t: "여기서 심장 떨어짐", likes: 2, e: ["😱"] },
  { at: 3.6,  n: "태오", c: "#3f6bd6", t: "나도 방금 놀랐어", reply: true },
  { at: 4.3,  n: "유나", c: "#15803d", t: "수 하나에 숨 참게 되네" },
  { at: 5.0,  n: "지우", c: "#be123c", t: "조명 미쳤다", likes: 1, e: ["✨"] },
  { at: 5.8,  n: "세연", c: "#a21caf", t: "숨 참고 봄" },
  { at: 6.5,  n: "은재", c: "#3f6bd6", t: "😭", big: true, e: ["😭"] },
  { at: 7.2,  n: "도현", c: "#b45309", t: "이 장면 때문에 정주행함", likes: 5 },
  { at: 8.0,  n: "하람", c: "#7c3aed", t: "진짜 그래서 왔어", reply: true },
  { at: 8.7,  n: "민서", c: "#0f766e", t: "세 번째 보는데도 놀람", e: ["👀"] },
  { at: 9.4,  n: "태오", c: "#3f6bd6", t: "다들 여기서 멈추네" },
  { at: 10.2, n: "유나", c: "#15803d", t: "🔥🔥🔥", big: true, e: ["🔥", "🔥"] },
  { at: 10.9, n: "지우", c: "#be123c", t: "음악 뭔지 아는 사람", likes: 3 },
  { at: 11.6, n: "세연", c: "#a21caf", t: "엔딩곡이랑 같은 거", reply: true },
  { at: 12.4, n: "은재", c: "#3f6bd6", t: "소름", e: ["😱"] },
  { at: 13.1, n: "도현", c: "#b45309", t: "여기 진짜 미쳤다", likes: 2 },
  { at: 13.8, n: "하람", c: "#7c3aed", t: "손에 땀 남" },
  { at: 14.6, n: "민서", c: "#0f766e", t: "이거 몇 번째 보는지", likes: 1 },
  { at: 15.3, n: "유나", c: "#15803d", t: "저도요 ㅋㅋ", reply: true },
  { at: 16.0, n: "태오", c: "#3f6bd6", t: "다시 돌려봐야겠다", e: ["👀"] }
];
var DUR = 17.4;
var feed = document.getElementById("feed"), floaters = document.getElementById("floaters");
var hFill = document.getElementById("trackFill"), hKnob = document.getElementById("trackKnob");
var hTime = document.getElementById("playTime"), hotNow = document.getElementById("hotNow");
var heroViewers = document.getElementById("heroViewers");
var heatEl = document.getElementById("heat");
var heatSpans = heatEl ? buildHeat(heatEl, 66) : null;
/* 히트맵은 이미 쌓인 과거 반응의 밀도다. 재생하면서 만들어지는 것이
   아니라 회차 전체가 처음부터 그려져 있어야 한다(익스텐션의 실제 동작). */
if (heatSpans) for (var hb = 0; hb < heatSpans.length; hb++) {
  heatSpans[hb].style.height = heatSpans[hb].dataset.h + "%";
}

function seedFeed() { if (feed) feed.innerHTML = SEED.map(msgHtml).join(""); }
function addLive(m) {
  if (!feed) return;
  feed.insertAdjacentHTML("beforeend", msgHtml(m));
  /* 제거는 화면 밖에서만 일어나야 한다. 7개에서 지우면 보이는 행이
     사라지며 피드 전체가 위로 튀었다(버벅거림의 원인). 피드는 아래
     정렬 + overflow hidden 이라 넘친 행은 이미 위로 잘려 안 보이고,
     DOM 누적만 막으면 되므로 여유 있게 둔다. */
  while (feed.children.length > 16) feed.removeChild(feed.firstChild);
  /* 탄막은 패널에 노출된 행을 그대로 흘린다 - 익스텐션이 새 노출 정책을
     만들지 않고 채팅 패널의 기준을 상속하는 것과 같은 구조다. */
  dmFire(m.t);
  /* 좋아요는 도착 직후에 하나씩 더 붙는다 */
  if (m.likes && !reduce) {
    var lastLike = feed.lastElementChild.querySelector(".like");
    if (lastLike) {
      setTimeout(function () {
        if (!lastLike.isConnected) return;
        lastLike.classList.add("pop");
        lastLike.lastChild.textContent = m.likes + 1;
      }, 900 + Math.random() * 900);
    }
  }
}
function pop(e) {
  if (!floaters) return;
  var el = document.createElement("span");
  el.className = "floater"; el.textContent = e;
  el.style.left = (10 + Math.random() * 68) + "%";
  el.style.bottom = (78 + Math.random() * 34) + "px";
  floaters.appendChild(el);
  setTimeout(function () { el.remove(); }, 2700);
}
/* ── 탄막 (HP-123 · HP-240) ──────────────────────────────────
   익스텐션 features/danmaku.js 의 상수를 그대로 옮겼다. 레인 4개를 상단
   40% 안에 몰고(자막존·인물 시선권 회피), 탄막마다 기준 속도의
   0.6~1.6배로 흘려 컨베이어벨트 인상을 없애고, 진입을 0~0.4초 늦춰
   같은 순간 도착분이 한 줄로 몰리는 것을 흩는다. 목업 화면이 실제보다
   작아 글자 크기만 줄였다(20px → 13.5px). */
var DM_LANES = 4, DM_LANE_TOP = 5, DM_LANE_STEP = 8.8;
var DM_CROSS = 6.6, DM_SPEED_MIN = 0.6, DM_SPEED_MAX = 1.6;
var DM_DELAY_MAX = 0.4, DM_JITTER = 7, DM_CAP = 14, DM_GAP = 24;
var dmLayer = document.getElementById("dmLayer");
var dmOn = true, dmFreeAt = [0, 0, 0, 0];

function dmFire(text) {
  if (!dmOn || !dmLayer) return;
  if (dmLayer.children.length >= DM_CAP) return;

  var el = document.createElement("span");
  el.className = "dm";
  el.textContent = text;

  if (reduce) {                       // 모션을 끈 사용자에게는 멈춘 채로 보여준다
    el.style.setProperty("--top", (DM_LANE_TOP + (dmLayer.children.length % DM_LANES) * DM_LANE_STEP) + "%");
    el.style.left = (14 + Math.random() * 42) + "%";
    dmLayer.appendChild(el);
    return;
  }

  var now = performance.now(), free = [];
  for (var i = 0; i < DM_LANES; i++) if (dmFreeAt[i] <= now) free.push(i);
  if (!free.length) return;           // 전 레인이 붐비면 드롭한다(익스텐션도 같다)
  var lane = free[Math.floor(Math.random() * free.length)];
  var dur = DM_CROSS / (DM_SPEED_MIN + Math.random() * (DM_SPEED_MAX - DM_SPEED_MIN));
  var delay = Math.random() * DM_DELAY_MAX;
  var jit = (Math.random() * 2 - 1) * DM_JITTER;

  el.style.setProperty("--top", (DM_LANE_TOP + lane * DM_LANE_STEP) + "%");
  el.style.setProperty("--jit", jit.toFixed(1) + "px");
  el.style.setProperty("--dur", dur.toFixed(2) + "s");
  el.style.setProperty("--delay", delay.toFixed(2) + "s");
  dmLayer.appendChild(el);

  /* 폭을 재고 나서 비행을 건다 - 이동 거리를 화면 폭 + 글자 폭으로 잡아야
     긴 문장도 끝까지 빠져나간다. */
  var w = el.offsetWidth, span = dmLayer.clientWidth + w;
  el.style.setProperty("--shift", -(span + DM_GAP) + "px");
  el.classList.add("fly");

  /* 같은 레인을 다시 쓸 수 있는 시각 - 앞 탄막이 자기 폭만큼 지나간 뒤.
     이 상한이 뒤 탄막의 추월(겹침)을 막는다. */
  dmFreeAt[lane] = now + (delay + (w + DM_GAP) / (span / dur)) * 1000;

  el.addEventListener("animationend", function () { el.remove(); });
  setTimeout(function () { if (el.isConnected) el.remove(); }, (delay + dur) * 1000 + 500);
}

seedFeed();

/* 재생 위치는 회차를 완주하지 않는다. 48분짜리를 17초에 도는 것은
   히트맵이 이미 완성된 화면과 어긋나므로, 반응이 몰린 지점 근처를
   천천히 지나가게 둔다. */
var POS_FROM = 0.575, POS_SPAN = 0.095;

var t = 0, idx = 0, timer = null, viewers = 42, firstType = true;
function tick() {
  t += 0.2;
  if (t > DUR) {
    t = 0; idx = 0; seedFeed(); firstType = true;
  }
  var p = POS_FROM + (t / DUR) * POS_SPAN;
  if (hFill) hFill.style.width = (p * 100) + "%";
  if (hKnob) hKnob.style.left = (p * 100) + "%";
  if (hTime) hTime.textContent = mmss(EP_LEN * p) + " / 48:12";
  if (hotNow) hotNow.textContent = density(p) > 0.5 ? "반응 몰림" : "";
  while (idx < LIVE.length && LIVE[idx].at <= t) {
    var m = LIVE[idx];
    addLive(m);
    if (m.e) m.e.forEach(function (x, k) { setTimeout(function () { pop(x); }, k * 260); });
    idx++;
  }
  /* 사용자 타이핑 — 루프 한 바퀴에 한 번 */
  if (!typing && (firstType || Math.floor(t * 5) % 12 === 0)) { firstType = false; simulateType(); }
  /* 시청자 수가 미세하게 오간다 */
  if (heroViewers && Math.random() < 0.03) {
    viewers = Math.max(31, Math.min(58, viewers + (Math.random() < .5 ? -1 : 1)));
    heroViewers.textContent = viewers;
  }
}
/* 시작 상태: 히트맵은 이미 그려져 있고, 재생 위치도 그 지점에 있다 */
if (hFill) hFill.style.width = (POS_FROM * 100) + "%";
if (hKnob) hKnob.style.left = (POS_FROM * 100) + "%";
if (hTime) hTime.textContent = mmss(EP_LEN * POS_FROM) + " / 48:12";

if (reduce) {
  LIVE.slice(0, 7).forEach(addLive);
} else if (document.querySelector(".hero-screen")) {
  new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (e.isIntersecting) { if (!timer) timer = setInterval(tick, 200); }
      else { clearInterval(timer); timer = null; }
    });
  }, { threshold: .08 }).observe(document.querySelector(".hero-screen"));
}

var heroScreen = document.querySelector(".hero-screen");

/* ── 헤드라인의 OTT 이름 ──────────────────────────────────────
   이름을 순환시키는 장치. 2026-07-31 인수 판단으로 껐다 - 글자가
   바뀔 때마다 뒤의 '에서'가 함께 밀려 헤드라인이 안정적으로 읽히지
   않았다(폭을 미리 재서 전환해도 남는 문제). 다시 켜려면 아래 값을
   true 로 바꾸면 되지만, 그때는 전환 방식을 다시 설계하는 편이 낫다. */
var OTT_ROLL = false;
var OTTS = ["넷플릭스", "왓챠", "티빙", "웨이브", "디즈니+"];
var ottWord = document.getElementById("ottWord");

function ottWidth(text) {
  var probe = ottWord.cloneNode(false);
  probe.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap;width:auto;transition:none";
  probe.textContent = text;
  ottWord.parentNode.appendChild(probe);
  var w = probe.offsetWidth;
  probe.remove();
  return w;
}

if (ottWord && OTT_ROLL && OTTS.length > 1 && !reduce) {
  var oi = 0;
  ottWord.style.width = ottWidth(OTTS[0]) + "px";
  /* 폰트 크기가 뷰포트에 따라 변하므로 창이 바뀌면 폭을 다시 잡는다 */
  addEventListener("resize", function () { ottWord.style.width = ottWidth(OTTS[oi]) + "px"; });

  setInterval(function () {
    var next = (oi + 1) % OTTS.length;
    ottWord.classList.add("swap");
    ottWord.style.width = ottWidth(OTTS[next]) + "px";   // 사라지는 동안 폭이 이동
    setTimeout(function () {
      oi = next;
      ottWord.textContent = OTTS[oi];
      ottWord.classList.remove("swap");
    }, 280);
  }, 2500);
}

/* 탄막은 Replix 가 켜져 있으면 늘 흐른다. */
if (heroScreen) heroScreen.classList.add("dm-on");

/* ── 사용자 타이핑 시뮬레이션 ──────────────────────────────
   채팅 루프 중간에 사용자가 메시지를 치는 것처럼 입력창에 글자가
   한 자씩 나타나고, 완성되면 전송 버튼이 뜨고, 잠시 뒤 피드에
   올라간다. 루프마다 한 번(t ≈ 7초). */
var heroInputText = document.getElementById("heroInputText");
var heroSend = document.getElementById("heroSend");
var heroInput = document.getElementById("heroInput");
var USER_MSGS = ["나도 소름이야", "여기 진짜 미쳤다", "이 장면 때문에 왔어",
  "와 심장 떨린다", "다시 봐도 소름", "ㅋㅋㅋ 표정 미쳤다", "눈물 나올 뻔",
  "이거 실화냐", "같이 보니까 더 좋다"];
var userMsgIdx = 0, typing = false;

function simulateType() {
  if (!heroInputText || !heroSend || !heroInput || typing || reduce) return;
  typing = true;
  var msg = USER_MSGS[userMsgIdx % USER_MSGS.length];
  userMsgIdx++;
  heroInputText.textContent = "";
  heroInput.classList.add("input-active");
  var i = 0;
  var typeTimer = setInterval(function () {
    if (i < msg.length) {
      heroInputText.textContent = msg.slice(0, ++i);
    } else {
      clearInterval(typeTimer);
      heroSend.style.display = "";
      setTimeout(function () {
        addLive({ n: "나", c: "#10b981", t: msg });
        heroInputText.textContent = "지금 이 장면에 반응을 남겨보세요";
        heroInput.classList.remove("input-active");
        heroSend.style.display = "none";
        typing = false;
      }, 400);
    }
  }, 90);
}

/* ── 원본↔Replix 스크롤 전환 (HP-467 → HP-602) ─────────────────────
   2026-09-12 김찬수 기획 멘토링 반영(2026-09-23 김지호 반영안): 토글을 누르는 대신,
   페이지가 평소대로 흐르는 동안 제품 화면이 아래에서 올라와 경계를 넘으면 Replix 로,
   되올려 경계 아래로 내려가면 넷플릭스 원본으로 바뀐다. 값은 #intro 의 --rx(0 = 원본,
   1 = Replix) 하나로 흘리고, 0↔1 사이의 0.6초 애니메이션과 모양은 css/hero.css 가 맡는다.
   토글 알약은 누르는 버튼이 아니라 지금 어느 쪽인지 보여 주는 표시다.
   경계 방식은 HP-602(2026-10-13 조현빈 결정)다. 그 전엔 스크롤 위치에 비례해 조금씩 바꿨는데
   ('화면 가운데가 뷰포트 78% → 36%'), 다 바뀐 모습을 보려면 제목·알약이 화면 위로 사라질
   만큼 내려가야 했고 화면을 가운데 둔 채로는 74% 에서 멈춰 있었다.
   ⚠ 화면을 sticky 로 붙잡아 두고 바꾸는 방식은 쓰지 않는다 — 2026-09-23 "스크롤이
   거기서 멈추는 느낌" 피드백으로 기각됐다. */
var intro = document.getElementById("intro");
var heroToggle = document.getElementById("heroToggle");
var siteNav = document.getElementById("nav");
/* RX_EDGE = 경계에서 화면이 보이는 영역 가장자리와 띄울 여백(px). RX_BACK = 원본으로 되돌아가는
   경계를 그만큼 아래에 둔다(px) — 경계 하나로 오가면 그 근처에서 손을 멈춘 사람에게 한두 px
   흔들림마다 전환이 되풀이된다. */
var RX_EDGE = 24, RX_BACK = 80;
var rxOn = null, rxSawOrig = false, rxTracked = false;

/* 스크롤 이벤트는 브라우저가 이미 프레임당 한 번으로 묶어 보낸다. 읽기 → 경계를 넘었을 때만
   쓰기 한 번이라, 그 밖에서는 아무것도 다시 그리지 않는다. */
function scrub() {
  var r = heroScreen.getBoundingClientRect();
  /* 경계 = 화면 아래 끝까지 다 들어온 위치 — 전환 0.6초 동안 화면 전체가 보인다. 뷰포트가 낮아
     화면이 보이는 영역(위에 붙은 메뉴 막대 .nav 아래)보다 크면, 위 끝이 메뉴 막대 아래에 닿는 위치.
     화면이 75% 보일 때 넘기는 안도 시험했으나 다 들어온 뒤 넘기는 쪽으로 정했다(2026-10-13 조현빈). */
  var line = Math.max(innerHeight - RX_EDGE - r.height, (siteNav ? siteNav.offsetHeight : 0) + RX_EDGE);
  var on = rxOn ? r.top < line + RX_BACK : r.top <= line;
  if (on === rxOn) return;
  var first = rxOn === null;
  rxOn = on;
  intro.style.setProperty("--rx", on ? 1 : 0);
  if (heroToggle) heroToggle.classList.toggle("is-orig", !on);
  /* 첫 값은 애니메이션 없이 넣는다 — 값을 계산된 스타일로 한 번 확정한 뒤 transition 을 켠다. */
  if (first) { getComputedStyle(intro).getPropertyValue("--rx"); intro.classList.add("rx-anim"); }
  /* 계측(W4) — 원본에서 시작해 Replix 로 넘어가는 것을 본 페이지뷰당 1회. 앵커 이동·새로고침으로
     이미 지나친 위치에서 열린 경우(처음부터 Replix)는 전환을 본 게 아니므로 세지 않는다. */
  if (!on) rxSawOrig = true;
  if (on && rxSawOrig && !rxTracked) {
    rxTracked = true;
    track('demo_interacted', { demo: 'hero_toggle', action: 'scroll_complete' });
  }
}
if (intro && heroScreen) {
  addEventListener("scroll", scrub, { passive: true });
  addEventListener("resize", scrub);
  scrub();
}
