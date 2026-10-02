/* 휴대폰 설치 안내(HP-477) — 랜딩·작품 탐색 공용. 확장은 PC 크롬에만 깔린다. 휴대폰에서 설치 버튼([data-cta])을 누르면
   웹 스토어로 보내지 않고(휴대폰 웹 스토어는 설치 대신 '바탕화면에 추가'만 보여 준다) 'PC 크롬에서 써요' 안내 시트를
   띄워 이 링크를 PC로 보내게 한다.
   · **PC 는 그대로.** 확장을 깔 수 있는 기기면 아무것도 하지 않는다 — 설치 버튼은 지금처럼 웹 스토어로 간다.
   · **판정은 화면 폭이 아니라 기기.** 좁은 창의 PC 는 설치할 수 있고 넓은 태블릿은 못 한다. 초대 페이지
     (docs/invite/index.html)에 같은 판정의 사본이 있다 — 외부 리소스 0 원칙의 단일 파일이라 import 하지 못한다.
     고치면 둘 다 고친다(scripts/test-install-guide.mjs 가 같은 사례로 대조한다).
   · **계측은 analytics.js 를 거친다.** 설치 버튼 클릭은 analytics.js 의 문서 위임(capture)이 이미 install_cta_clicked 로
     센다. 여기서는 시트 안의 행동만 install_guide_action 으로 더한다(트래킹 플랜 v11). 시트의 웹 스토어 링크에는
     data-cta 를 달지 않는다 — 달면 같은 설치 의도를 두 번 센다. 계측 모듈이 막혀도(광고 차단기 등) 시트는 돈다.
   · 스타일을 JS 에 두는 이유는 동의 배너와 같다 — 랜딩(css/*.css)과 작품 탐색(Tailwind)이 다른 스타일 체계다.
   작품 탐색(React)은 이 파일을 /js/install-guide.js 로 런타임에 붙인다(catalog/app/src/installGuide.ts).
   node 에서 import 하면 부트하지 않는다(scripts/test-install-guide.mjs 가 순수 함수를 검사한다). */

/* ═══ 순수 함수 (node 테스트 대상) ═══════════════════════════════ */
/* 확장을 설치할 수 없는 기기인가 — 안드로이드(휴대폰·태블릿)·iPhone·iPad·iPod. env = { ua, platform, maxTouchPoints, uaMobile }.
   · UA 문자열을 먼저 본다 — UA-CH 의 mobile 은 안드로이드 태블릿에서 false 다.
   · iPadOS 사파리는 기본이 데스크톱 모드라 UA 가 Mac 과 같다 — 'MacIntel' 에 터치 지점이 있으면 iPad 다(Mac 은 터치가 없다).
   · 터치 화면 Windows 노트북·크롬북은 확장을 깔 수 있으니 PC 다. 모르면 PC(지금 동작 그대로). */
export function isMobileDevice(env) {
  var e = env || {};
  if (/Android|iPhone|iPad|iPod/i.test(e.ua || '')) return true;
  if (e.platform === 'MacIntel' && (e.maxTouchPoints || 0) > 1) return true;
  return e.uaMobile === true;
}
/* install_guide_action 의 action 열거값 — 트래킹 플랜 §6 과 같다. */
export var GUIDE_ACTIONS = ['opened', 'copy_link', 'share', 'open_store'];

/* ═══ 런타임 ═════════════════════════════════════════════════════ */
var CSS = '#rx-install-guide{position:fixed;inset:0;z-index:10000;display:none;align-items:flex-end;justify-content:center;' +
  'background:rgba(16,16,24,.45);font:15px/1.55 system-ui,-apple-system,"Segoe UI","Apple SD Gothic Neo","Noto Sans KR",sans-serif;' +
  '-webkit-text-size-adjust:100%;text-align:left}' +
  '#rx-install-guide .rxg-panel{position:relative;box-sizing:border-box;width:100%;max-width:520px;background:#fff;color:#101016;' +
  'border-radius:18px 18px 0 0;padding:26px 20px calc(18px + env(safe-area-inset-bottom));box-shadow:0 -12px 40px rgba(16,16,24,.18)}' +
  '#rx-install-guide h2{margin:0 44px 6px 0;font-size:19px;line-height:1.35;font-weight:800;letter-spacing:-.02em;color:#101016}' +
  '#rx-install-guide p{margin:0}#rx-install-guide .rxg-desc{color:#40404c;font-size:14.5px}' +
  '#rx-install-guide .rxg-actions{display:flex;gap:8px;margin-top:18px}' +
  '#rx-install-guide .rxg-actions button{flex:1 1 0;min-height:48px;font:inherit;font-weight:700;border-radius:12px;padding:12px 14px;cursor:pointer}' +
  '#rx-install-guide .rxg-copy{background:#e50914;color:#fff;border:0}' +
  '#rx-install-guide .rxg-share{background:#fff;color:#101016;border:1px solid rgba(16,16,24,.16)}' +
  '#rx-install-guide .rxg-close{position:absolute;top:10px;right:10px;width:44px;height:44px;padding:0;border:0;border-radius:22px;' +
  'background:transparent;color:#6b6b78;font:400 26px/1 system-ui,sans-serif;cursor:pointer}' +
  '#rx-install-guide .rxg-url{display:none;box-sizing:border-box;width:100%;margin-top:12px;padding:10px 12px;border:1px solid rgba(16,16,24,.16);' +
  'border-radius:10px;background:#f6f6f8;color:#40404c;font:13px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace}' +
  '#rx-install-guide .rxg-status{min-height:20px;margin-top:10px;font-size:13px;color:#40404c}' +
  '#rx-install-guide .rxg-store{display:inline-block;padding:10px 0 4px;font-size:14px;color:#6b6b78;text-decoration:underline;text-underline-offset:3px}' +
  '@media (min-width:600px){#rx-install-guide{align-items:center}#rx-install-guide .rxg-panel{border-radius:18px;padding-bottom:20px}}';

var _sheet = null;
var _trigger = null;       /* 시트를 연 설치 버튼 — 닫으면 포커스를 돌려준다 */
var _copiedTimer = 0;

function deviceEnv() {
  var n = navigator;
  return { ua: n.userAgent || '', platform: n.platform || '', maxTouchPoints: n.maxTouchPoints || 0,
    uaMobile: n.userAgentData ? n.userAgentData.mobile === true : undefined };
}
function track(action) {
  try { if (window.ReplixAnalytics) window.ReplixAnalytics.track('install_guide_action', { action: action }); }
  catch (_) { /* 계측은 화면을 막지 않는다 */ }
}
function $(sel) { return _sheet.querySelector(sel); }
function status(text) { $('.rxg-status').textContent = text; }

/* 복사 — 클립보드 API 가 막힌 인앱 브라우저(카카오톡 등)면 주소 칸을 꺼내 선택해 두고, 옛 방식(execCommand)을 한 번 더 시도한다. */
function copyLink() {
  var url = location.href;
  var done = function () {
    var b = $('.rxg-copy');
    b.textContent = '복사했어요';
    status('PC에서 붙여 넣어 열어 주세요.');
    clearTimeout(_copiedTimer);
    _copiedTimer = setTimeout(function () { b.textContent = '링크 복사'; }, 2000);
  };
  var fallback = function () {
    var input = $('.rxg-url');
    input.value = url; input.style.display = 'block';
    input.focus(); input.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
    if (ok) done(); else status('주소를 길게 눌러 복사해 주세요.');
  };
  track('copy_link');
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, fallback);
  else fallback();
}
function shareLink() {
  track('share');
  navigator.share({ title: 'Replix', text: 'PC 크롬에서 Replix를 설치해 보세요.', url: location.href })
    .catch(function () { /* 사용자가 닫았거나 공유 대상이 없다 — 시트는 그대로 둔다 */ });
}

function build() {
  var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  var el = document.createElement('div');
  el.id = 'rx-install-guide';
  el.innerHTML =
    '<div class="rxg-panel" role="dialog" aria-modal="true" aria-labelledby="rxg-title" aria-describedby="rxg-desc">' +
      '<button type="button" class="rxg-close" aria-label="닫기">×</button>' +
      '<h2 id="rxg-title">Replix는 PC 크롬에서 써요</h2>' +
      '<p class="rxg-desc" id="rxg-desc">PC에서 replix.tv를 열거나 이 링크를 PC로 보내 주세요.</p>' +
      '<div class="rxg-actions">' +
        '<button type="button" class="rxg-copy">링크 복사</button>' +
        '<button type="button" class="rxg-share">공유하기</button>' +
      '</div>' +
      '<input class="rxg-url" type="text" readonly aria-label="이 페이지 주소">' +
      '<p class="rxg-status" role="status" aria-live="polite"></p>' +
      '<a class="rxg-store" target="_blank" rel="noopener">웹 스토어에서 PC로 보내기 →</a>' +
    '</div>';
  document.body.appendChild(el);
  _sheet = el;
  /* [hidden] 은 CSS display 에 진다(docs/README '고칠 때 알아 둘 것') — 공유가 없는 브라우저면 style 로 끈다. */
  if (typeof navigator.share !== 'function') $('.rxg-share').style.display = 'none';
  $('.rxg-copy').addEventListener('click', copyLink);
  $('.rxg-share').addEventListener('click', shareLink);
  $('.rxg-close').addEventListener('click', close);
  $('.rxg-store').addEventListener('click', function () { track('open_store'); });
  el.addEventListener('click', function (ev) { if (ev.target === el) close(); });   /* 바깥(어두운 곳)을 누르면 닫힌다 */
  el.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') { ev.preventDefault(); close(); return; }
    if (ev.key !== 'Tab') return;
    /* 포커스를 시트 안에 가둔다(aria-modal) — 보이는 조작 요소만 돈다. */
    var items = [].filter.call(el.querySelectorAll('button, a[href], input'), function (n) { return n.offsetParent !== null; });
    if (!items.length) return;
    var first = items[0], last = items[items.length - 1];
    if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
    else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
  });
}

function open(trigger) {
  if (!_sheet) build();
  _trigger = trigger;
  $('.rxg-store').setAttribute('href', trigger.getAttribute('href') || '');
  $('.rxg-copy').textContent = '링크 복사';
  $('.rxg-url').style.display = 'none';
  status('');
  _sheet.style.display = 'flex';
  document.documentElement.style.overflow = 'hidden';   /* 시트 뒤 페이지가 같이 스크롤되지 않게 */
  $('.rxg-copy').focus();
  track('opened');
}
function close() {
  if (!_sheet || _sheet.style.display === 'none') return;
  _sheet.style.display = 'none';
  document.documentElement.style.overflow = '';
  if (_trigger && _trigger.focus) _trigger.focus();
  _trigger = null;
}

/* ═══ 부트 ═══════════════════════════════════════════════════════ */
function boot() {
  if (!isMobileDevice(deviceEnv())) return;   /* PC 는 그대로 — 설치 버튼은 웹 스토어로 */
  /* 'PC 크롬에서 설치할 수 있어요' 같은 휴대폰 전용 문구를 CSS 로 바꿔 끼우는 표식(css/tokens.css .rx-mobile-only). */
  document.documentElement.classList.add('rx-mobile-device');
  /* 버블 단계 — analytics.js 의 capture 단계 계측(install_cta_clicked)이 먼저 지나간 뒤 이동을 막는다. */
  document.addEventListener('click', function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest('a[data-cta]') : null;
    if (!a || ev.defaultPrevented) return;
    ev.preventDefault();
    open(a);
  });
}
if (typeof window !== 'undefined' && typeof document !== 'undefined') boot();
