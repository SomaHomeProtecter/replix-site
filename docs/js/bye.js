/* 삭제 설문(HP-458) — 확장을 지우면 크롬이 여는 replix.tv/bye 의 규칙과 화면 연결.
   · 확장 background 가 chrome.runtime.setUninstallURL 로 이 주소를 건다. 붙이는 값은 비식별 둘뿐이다 —
     v = 확장 버전, d = 설치 후 경과일(일). 기기·계정 식별값은 싣지 않는다(익명 설문이라는 약속).
   · 서버 계약 = POST /api/v1/feedback, trigger=UNINSTALL(Replix-be HP-458 — Confluence [API] MVP API 명세 §8.2).
     사유만 골라도 접수하고, 후속 선택은 해당 사유가 있을 때만 받는다. 짜임새가 어긋나면 서버가 설문 전체를
     400으로 거절하므로, 보내기 전에 여기서 맞춘다(buildPayload).
   · 익명으로 보낸다 — 이 사이트에 로그인해 있어도 토큰·쿠키를 싣지 않는다(화면이 "익명으로 보내져요"라고 약속한다).
   · 계측(조회·제출)은 아직 싣지 않는다. 웹 분석은 동의(배너 [허용]) 뒤에만 도는데, 확장을 지운 직후 페이지에서
     동의를 어떻게 다룰지 정하지 않았다. 제출은 서버가 사유 코드와 함께 남기므로 집계는 운영 콘솔로 한다.
   node 에서 import 하면 부트하지 않는다(scripts/test-bye.mjs 가 순수 함수를 검사한다). */

/* 선택지 — 서버 enum(UninstallReason·CoveredElement·WantedService)과 값·순서가 같다. 순서가 곧 설문에 보이는
   순서이고, 서버도 이 순서로 정렬해 저장한다. 값을 늘리면 서버 enum·DB CHECK(새 migration)부터 늘린다. */
export var REASONS = [
  { code: 'FEW_CHATS', label: '볼 만한 채팅이 적어요' },
  { code: 'BLOCKS_SCREEN', label: '화면을 가려요' },
  { code: 'SLOW_OR_BUGGY', label: '느리거나 오류가 나요' },
  { code: 'SPOILER_WORRY', label: '스포일러가 걱정돼요' },
  { code: 'BAD_VIBE', label: '채팅 분위기가 별로예요' },
  { code: 'HARD_TO_USE', label: '쓰는 법이 어려워요' },
  { code: 'NO_MY_OTT', label: '쓰는 OTT가 없어요' },
  { code: 'PRIVACY_WORRY', label: '개인정보가 걱정돼요' },
  { code: 'JUST_TRYING', label: '잠깐 써 봤어요' },
];
/* "화면을 가려요"의 후속 — 무엇이 가렸는지. 이용자가 알아보게 화면에서 부르는 이름으로 적는다. */
export var COVERED = [
  { code: 'CHAT_PANEL', label: '오른쪽 채팅창' },
  { code: 'DANMAKU', label: '흐르는 채팅(탄막)' },
  { code: 'FULLSCREEN_CHAT', label: '전체화면 채팅 상자' },
  { code: 'REACTION', label: '반응 이모지' },
  { code: 'HEATMAP', label: '재생바 봉우리' },
];
/* "쓰는 OTT가 없어요"의 후속 — 원하는 서비스 */
export var SERVICES = [
  { code: 'TVING', label: '티빙' },
  { code: 'WAVVE', label: '웨이브' },
  { code: 'COUPANG_PLAY', label: '쿠팡플레이' },
  { code: 'WATCHA', label: '왓챠' },
  { code: 'YOUTUBE', label: '유튜브' },
  { code: 'OTHER', label: '그 밖에' },
];
/* 후속 질문이 달린 사유 → 그 답이 실리는 요청 칸 */
export var FOLLOW_UPS = { BLOCKS_SCREEN: 'coveredBy', NO_MY_OTT: 'wantedServices' };

/* 한마디 상한 — 서버 @Size(max = 1000)와 같다. 자바 String 길이처럼 UTF-16 단위로 센다. */
export var MAX_BODY = 1000;
/* 문구는 HP-426 웹 피드백과 같은 글자다(catalog/app/src/feedback-pure.js — scripts/test-bye.mjs 가 대조). */
export var THANKS = '의견 감사합니다. 리플릭스를 더 낫게 고쳐 볼게요.';

/* 서버 appVersion 형식과 같다 — 다르면 서버가 설문 전체를 400으로 거절한다. */
var VERSION_RE = /^[0-9A-Za-z.\-]{1,20}$/;
var MAX_DAYS = 3650;

/** 확장이 붙인 주소 값. 형식이 틀리면 null 로 버린다 — 고른 사유까지 잃게 두느니 그 값만 빼고 보낸다. */
export function parseParams(search) {
  var q = new URLSearchParams(search || '');
  var v = q.get('v');
  var d = q.get('d');
  return {
    appVersion: v !== null && VERSION_RE.test(v) ? v : null,
    installDays: d !== null && /^\d{1,4}$/.test(d) && Number(d) <= MAX_DAYS ? Number(d) : null,
  };
}

/** 목록에 있는 코드만, 목록 순서로, 한 번씩 남긴다. */
function pick(options, codes) {
  var chosen = codes || [];
  return options
    .filter(function (option) { return chosen.indexOf(option.code) >= 0; })
    .map(function (option) { return option.code; });
}

/** UTF-16 단위로 자르되 서로게이트 쌍을 가르지 않는다 — 반쪽 글자가 서버에 가면 저장이 깨진다. */
function clip(text, max) {
  if (text.length <= max) return text;
  var cut = text.slice(0, max);
  var last = cut.charCodeAt(cut.length - 1);
  return last >= 0xd800 && last <= 0xdbff ? cut.slice(0, -1) : cut;
}

/** 보내기 조건: 사유 하나 또는 공백 아닌 한마디 — 서버의 FEEDBACK_EMPTY 와 같은 조건이다. */
export function canSend(state) {
  return pick(REASONS, state.reasons).length > 0 || (state.body || '').trim().length > 0;
}

/**
 * 요청 본문. 후속 선택은 부모 사유가 있을 때만 싣는다 — 사유를 골랐다가 해제해도 화면은 고른 후속을 기억하지만
 * (다시 고르면 그대로 보이게), 부모 없이 실으면 서버가 400 FEEDBACK_INVALID_REASONS로 설문 전체를 거절한다.
 */
export function buildPayload(state, params) {
  var reasons = pick(REASONS, state.reasons);
  var body = clip((state.body || '').trim(), MAX_BODY).trim();
  return {
    surface: 'WEB',
    trigger: 'UNINSTALL',
    score: null,
    category: null,
    body: body || null,
    appVersion: params.appVersion,
    platform: null,
    contentId: null,
    episodeId: null,
    reasons: reasons,
    coveredBy: reasons.indexOf('BLOCKS_SCREEN') >= 0 ? pick(COVERED, state.covered) : [],
    wantedServices: reasons.indexOf('NO_MY_OTT') >= 0 ? pick(SERVICES, state.wanted) : [],
    installDays: params.installDays,
  };
}

/** 제출 실패 안내 — 상한 초과(429)만 따로, 나머지(네트워크 포함)는 일반 실패 문구. */
export function errorMessage(status) {
  return status === 429
    ? '지금은 더 받을 수 없어요. 조금 뒤에 다시 보내 주세요.'
    : '보내지 못했어요. 잠시 뒤 다시 시도해 주세요.';
}

/** 한마디 입력칸 안내 — 볼 만한 채팅이 적었다면 어떤 작품이었는지 묻는다(그 작품부터 채운다). */
export function placeholderFor(reasons) {
  return (reasons || []).indexOf('FEW_CHATS') >= 0
    ? '어떤 작품이었는지 적어 주시면 그 작품부터 채워 볼게요.'
    : '어떤 장면에서 무엇이 불편했는지 적어 주세요.';
}

/** 보낸 뒤 요약 — 고른 사유를 설문 순서로. 한마디만 보냈으면 그것을 받았다고만 한다. */
export function summaryOf(reasons) {
  var labels = REASONS
    .filter(function (reason) { return (reasons || []).indexOf(reason.code) >= 0; })
    .map(function (reason) { return reason.label; });
  return labels.length ? '보낸 이유: ' + labels.join(', ') : '적어 주신 내용을 잘 받았어요.';
}

/* ═══ 화면 연결 ═══════════════════════════════════════════════ */
var SEND_TIMEOUT_MS = 15000;

function boot() {
  var byId = function (id) { return document.getElementById(id); };
  var meta = document.querySelector('meta[name="api-base"]');
  var api = (meta && meta.content) || 'https://api.replix.tv';
  var params = parseParams(location.search);
  var state = { reasons: [], covered: [], wanted: [], body: '' };
  var sending = false;

  var form = byId('bye-form');
  var sendBtn = byId('bye-send');
  var sendLabel = byId('bye-send-label');
  var spinner = byId('bye-spin');
  var errorEl = byId('bye-error');
  var noteInput = byId('bye-body');
  var count = byId('bye-count');

  /* 고르는 칸은 목록(REASONS 등)에서 만든다 — 문구를 HTML·요약·요청이 한 곳에서 읽게. textContent 로만 넣는다. */
  function chips(container, options, selected, className) {
    options.forEach(function (option) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = className;
      btn.textContent = option.label;
      btn.setAttribute('aria-pressed', 'false');
      btn.addEventListener('click', function () {
        var at = selected.indexOf(option.code);
        if (at >= 0) selected.splice(at, 1);
        else selected.push(option.code);
        btn.setAttribute('aria-pressed', String(at < 0));
        render();
      });
      container.appendChild(btn);
    });
  }
  chips(byId('bye-reasons'), REASONS, state.reasons, 'by-chip');
  chips(byId('bye-covered-options'), COVERED, state.covered, 'by-pill');
  chips(byId('bye-services-options'), SERVICES, state.wanted, 'by-pill');

  function render() {
    byId('bye-covered').hidden = state.reasons.indexOf('BLOCKS_SCREEN') < 0;
    byId('bye-services').hidden = state.reasons.indexOf('NO_MY_OTT') < 0;
    noteInput.placeholder = placeholderFor(state.reasons);
    sendBtn.disabled = sending || !canSend(state);
  }

  byId('bye-note-toggle').addEventListener('click', function () {
    this.hidden = true;
    byId('bye-note').hidden = false;
    noteInput.focus();
  });
  noteInput.addEventListener('input', function () {
    state.body = noteInput.value;
    count.textContent = noteInput.value.length + ' / ' + MAX_BODY;
    count.classList.toggle('full', noteInput.value.length >= MAX_BODY);
    render();
  });

  function setSending(on) {
    sending = on;
    spinner.hidden = !on;
    sendBtn.setAttribute('aria-busy', String(on));
    if (on) sendLabel.textContent = '보내는 중…';
    render();
  }

  function fail(status) {
    setSending(false);
    errorEl.textContent = errorMessage(status);
    errorEl.hidden = false;
    sendLabel.textContent = '다시 보내기';
  }

  function done() {
    byId('bye-ask').hidden = true;
    byId('bye-summary').textContent = summaryOf(state.reasons);
    byId('bye-done').hidden = false;
    // 화면이 통째로 바뀌어 포커스가 body 로 떨어진다 — 결과 제목으로 옮겨 읽어 주게 한다.
    byId('bye-done-title').focus();
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (sending || !canSend(state)) return;
    errorEl.hidden = true;
    setSending(true);
    // 응답이 끝내 안 오면 버튼이 "보내는 중"에 갇힌다 — 시간을 넘기면 끊고 실패로 알린다.
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, SEND_TIMEOUT_MS);
    fetch(api + '/api/v1/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload(state, params)),
      signal: controller.signal,
    })
      .then(function (res) {
        if (res.ok) done();
        else fail(res.status);
      })
      .catch(function () { fail(0); })
      .finally(function () { clearTimeout(timer); });
  });

  render();
}

if (typeof document !== 'undefined') boot();
