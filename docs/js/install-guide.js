/* 휴대폰 설치 안내(HP-477) — 랜딩·작품 탐색 공용. 익스텐션은 PC 크롬에만 깔린다. 휴대폰에서 설치 버튼([data-cta])을 누르면
   웹 스토어로 보내지 않고(휴대폰 웹 스토어는 설치 대신 '바탕화면에 추가'만 보여 준다) 'PC 크롬에서 써요' 안내 시트를
   띄워 이 링크를 PC로 보내게 한다.
   · **PC 는 그대로.** 익스텐션을 깔 수 있는 기기면 아무것도 하지 않는다 — 설치 버튼은 지금처럼 웹 스토어로 간다.
   · **판정은 화면 폭이 아니라 기기.** 좁은 창의 PC 는 설치할 수 있고 넓은 태블릿은 못 한다. 초대 페이지
     (docs/invite/index.html)와 디스코드 연결 페이지(docs/together/index.html)에 같은 판정의 사본이 있다 — 외부 리소스 0
     원칙의 단일 파일이라 import 하지 못한다. 고치면 셋 다 고친다(scripts/test-install-guide.mjs 가 같은 사례로 대조한다).
   · **계측은 analytics.js 를 거친다.** 설치 버튼 클릭은 analytics.js 의 문서 위임(capture)이 이미 install_cta_clicked 로
     센다. 여기서는 시트 안의 행동만 install_guide_action 으로 더한다(트래킹 플랜 v11). 시트의 웹 스토어 링크에는
     data-cta 를 달지 않는다 — 달면 같은 설치 의도를 두 번 센다. 계측 모듈이 막혀도(광고 차단기 등) 시트는 돈다.
   · 스타일을 JS 에 두는 이유는 동의 배너와 같다 — 랜딩(css/*.css)과 작품 탐색(Tailwind)이 다른 스타일 체계다.
   작품 탐색(React)은 이 파일을 /js/install-guide.js 로 런타임에 붙인다(catalog/app/src/installGuide.ts).
   node 에서 import 하면 부트하지 않는다(scripts/test-install-guide.mjs 가 순수 함수를 검사한다). */

/* ═══ 순수 함수 (node 테스트 대상) ═══════════════════════════════ */
/* 익스텐션을 설치할 수 없는 기기인가 — 안드로이드(휴대폰·태블릿)·iPhone·iPad·iPod.
   env = { ua, platform, maxTouchPoints, uaMobile, uaPlatform }(uaMobile·uaPlatform 은 UA-CH, 없으면 undefined).
   · UA 문자열을 먼저 본다 — UA-CH 의 mobile 은 안드로이드 태블릿에서 false 다.
   · iPadOS 사파리는 기본이 데스크톱 모드라 UA 가 Mac 과 같다 — 'MacIntel' 에 터치 지점이 있으면 iPad 다(Mac 은 터치가 없다).
   · 큰 안드로이드 태블릿 크롬도 기본이 '데스크톱 사이트'라 UA 가 'X11; Linux x86_64'(Android 없음)이고 UA-CH 도 PC 처럼
     보일 수 있다 — 리눅스인데 터치 지점이 있으면 안드로이드로 본다. 터치 화면 리눅스 PC 는 드물고, 잘못 잡혀도 시트에
     웹 스토어 링크가 있어 막히지 않는다(반대로 놓치면 휴대폰 웹 스토어·넷플릭스로 가 막힌다).
   · 크롬북(CrOS)·터치 화면 Windows 노트북은 익스텐션을 깔 수 있으니 PC 다. 모르면 PC(지금 동작 그대로). */
export function isMobileDevice(env) {
  var e = env || {};
  var ua = e.ua || '';
  if (/Android|iPhone|iPad|iPod/i.test(ua)) return true;
  if (e.uaPlatform === 'Android') return true;
  if (e.platform === 'MacIntel' && (e.maxTouchPoints || 0) > 1) return true;
  if (/Linux/.test(ua) && !/CrOS/.test(ua) && (e.maxTouchPoints || 0) > 0) return true;
  return e.uaMobile === true;
}
/* 앱 안 브라우저 — 인스타그램·페이스북·카카오톡·네이버·라인 같은 앱이 띄운 웹뷰(HP-638). 광고 방문의 대부분이 여기서 온다
   (2026-10 2차 광고 방문 99.4%가 휴대폰, 거의 인스타그램 앱 안). 여기엔 크롬 로그인이 없어 '웹 스토어에서 PC로 보내기'(휴대폰
   크롬에 구글 계정으로 로그인해 있어야 동작)가 막히고, 안드로이드 웹뷰엔 공유 기능(Web Share)도 없다. 값은 그 링크를 가르고
   계측(in_app)에 싣는 데만 쓴다. 모르면 null(앱 밖 브라우저로 본다 — 지금 동작 그대로). */
export var IN_APP = ['instagram', 'facebook', 'kakaotalk', 'naver', 'line', 'webview'];
export function inAppBrowser(ua) {
  var s = ua || '';
  if (/Instagram/i.test(s)) return 'instagram';
  if (/FBAN|FBAV|FB_IAB|FBIOS/.test(s)) return 'facebook';
  if (/KAKAOTALK/i.test(s)) return 'kakaotalk';
  if (/NAVER\(inapp/.test(s)) return 'naver';
  if (/\bLine\//.test(s)) return 'line';
  if (/; wv\)/.test(s)) return 'webview';   /* 그 밖의 안드로이드 웹뷰 */
  return null;
}
/* install_guide_action 의 action 열거값 — 트래킹 플랜 §6 과 같다. */
export var GUIDE_ACTIONS = ['opened', 'copy_link', 'share', 'mail', 'open_store', 'open_catalog'];

/* ═══ 런타임 ═════════════════════════════════════════════════════ */
var CSS = '#rx-install-guide{position:fixed;inset:0;z-index:10000;display:none;align-items:flex-end;justify-content:center;' +
  'background:rgba(16,16,24,.45);font:15px/1.55 system-ui,-apple-system,"Segoe UI","Apple SD Gothic Neo","Noto Sans KR",sans-serif;' +
  '-webkit-text-size-adjust:100%;text-align:left}' +
  '#rx-install-guide .rxg-panel{position:relative;box-sizing:border-box;width:100%;max-width:520px;background:#fff;color:#101016;' +
  'border-radius:18px 18px 0 0;padding:26px 20px calc(18px + env(safe-area-inset-bottom));box-shadow:0 -12px 40px rgba(16,16,24,.18)}' +
  '#rx-install-guide h2{margin:0 44px 6px 0;font-size:19px;line-height:1.35;font-weight:800;letter-spacing:-.02em;color:#101016}' +
  '#rx-install-guide p{margin:0}#rx-install-guide .rxg-desc{color:#40404c;font-size:14.5px}' +
  /* 주소는 브라우저 주소창 모양 안에 보통 주소 크기로 — 입력 칸처럼 보이거나 혼자 튀지 않게(2026-10-14 김지호) */
  '#rx-install-guide .rxg-omni{display:flex;align-items:center;gap:10px;margin-top:12px;height:44px;padding:0 16px;border-radius:999px;' +
  'background:#f1f1f4;border:1px solid rgba(16,16,24,.08);color:#101016}' +
  '#rx-install-guide .rxg-omni svg{flex:none;color:#6b6b78}' +
  '#rx-install-guide .rxg-omni-url{font-size:16px;font-weight:600;letter-spacing:-.01em;user-select:all;-webkit-user-select:all}' +
  '#rx-install-guide .rxg-or{display:flex;align-items:center;gap:10px;margin-top:18px;color:#9d9daa;font-size:12.5px}' +
  '#rx-install-guide .rxg-or::before,#rx-install-guide .rxg-or::after{content:"";flex:1;height:1px;background:rgba(16,16,24,.09)}' +
  '#rx-install-guide .rxg-sub{margin-top:12px;color:#40404c;font-size:14.5px}' +
  '#rx-install-guide .rxg-actions{display:flex;gap:8px;margin-top:10px}' +
  '#rx-install-guide .rxg-actions button,#rx-install-guide .rxg-actions a{box-sizing:border-box;flex:1 1 0;min-height:48px;display:flex;' +
  'align-items:center;justify-content:center;font:inherit;font-weight:700;border-radius:12px;padding:12px 14px;cursor:pointer;text-decoration:none}' +
  '#rx-install-guide .rxg-copy{background:#e50914;color:#fff;border:0}' +
  '#rx-install-guide .rxg-share,#rx-install-guide .rxg-mail{background:#fff;color:#101016;border:1px solid rgba(16,16,24,.16)}' +
  '#rx-install-guide .rxg-close{position:absolute;top:10px;right:10px;width:44px;height:44px;padding:0;border:0;border-radius:22px;' +
  'background:transparent;color:#6b6b78;font:400 26px/1 system-ui,sans-serif;cursor:pointer}' +
  '#rx-install-guide .rxg-url{display:none;box-sizing:border-box;width:100%;margin-top:12px;padding:10px 12px;border:1px solid rgba(16,16,24,.16);' +
  'border-radius:10px;background:#f6f6f8;color:#40404c;font:13px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace}' +
  '#rx-install-guide .rxg-status{min-height:20px;margin-top:10px;font-size:13px;color:#40404c}' +
  '#rx-install-guide .rxg-store{display:inline-block;padding:2px 0;font-size:13px;color:#6b6b78;text-decoration:underline;text-underline-offset:3px}' +
  /* 작품 탐색은 설치와 다른 갈래(휴대폰에서 지금 할 수 있는 일)라 맨 아래 한 줄로 떼어 둔다 */
  '#rx-install-guide .rxg-catalog{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:14px;padding-top:14px;' +
  'border-top:1px solid rgba(16,16,24,.09);color:#101016;font-size:14px;font-weight:600;text-decoration:none}' +
  '#rx-install-guide .rxg-catalog svg{flex:none;color:#9d9daa}' +
  '@media (min-width:600px){#rx-install-guide{align-items:center}#rx-install-guide .rxg-panel{border-radius:18px;padding-bottom:20px}}';

var _sheet = null;
var _trigger = null;       /* 시트를 연 설치 버튼 — 닫으면 포커스를 돌려준다 */
var _copiedTimer = 0;
var _historyPushed = false; /* 열 때 히스토리 한 칸을 쌓았는가 — 직접 닫을 때 되돌린다 */
var _inApp = null;          /* 앱 안 브라우저 이름(inAppBrowser) — 부트 때 한 번 정한다 */

function deviceEnv() {
  var n = navigator;
  return { ua: n.userAgent || '', platform: n.platform || '', maxTouchPoints: n.maxTouchPoints || 0,
    uaMobile: n.userAgentData ? n.userAgentData.mobile === true : undefined,
    uaPlatform: n.userAgentData ? n.userAgentData.platform : undefined };
}
function track(action) {
  try { if (window.ReplixAnalytics) window.ReplixAnalytics.track('install_guide_action', { action: action, in_app: _inApp || 'none' }); }
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
/* 메일로 나에게 보내기 — 공유 기능이 없는 브라우저(안드로이드 앱 안 등)의 두 번째 길. 받는 사람은 비워 두고 사용자가 고른다.
   우리 쪽으로 나가는 요청은 없다(메일 앱이 연다). */
function mailHref() {
  return 'mailto:?subject=' + encodeURIComponent('Replix PC에서 열기') +
    '&body=' + encodeURIComponent('PC 크롬에서 열어 Replix를 설치해 보세요.\n' + location.href);
}
/* 휴대폰에서는 작품 탐색으로 먼저 둘러보게 한다(랜딩에서 연 시트만 — 작품 탐색 안에서는 이미 거기 있다). 열 때 쌓은 히스토리 칸은
   그 자리를 바꿔 들어가 되돌린다 — 그냥 이동하면 뒤로 가기가 같은 랜딩을 한 번 더 지난다. */
function openCatalog(ev) {
  track('open_catalog');
  if (!_historyPushed) return;   /* 칸을 쌓지 못했으면 평소 링크 이동 */
  ev.preventDefault();
  _historyPushed = false;
  location.replace(ev.currentTarget.getAttribute('href'));
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
      '<p class="rxg-desc" id="rxg-desc">PC 크롬 주소창에 이렇게 입력하세요.</p>' +
      '<p class="rxg-omni"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/></svg><span class="rxg-omni-url">replix.tv</span></p>' +
      '<p class="rxg-or">또는</p>' +
      '<p class="rxg-sub">이 링크를 PC로 보내 두세요.</p>' +
      '<div class="rxg-actions">' +
        '<button type="button" class="rxg-copy">링크 복사</button>' +
        '<button type="button" class="rxg-share">공유하기</button>' +
        '<a class="rxg-mail">메일로 보내기</a>' +
      '</div>' +
      '<input class="rxg-url" type="text" readonly aria-label="이 페이지 주소">' +
      '<p class="rxg-status" role="status" aria-live="polite"></p>' +
      '<a class="rxg-store" target="_blank" rel="noopener">웹 스토어에서 PC로 보내기 →</a>' +
      '<a class="rxg-catalog" href="/catalog/">휴대폰으로는 작품 탐색부터 둘러보기<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></a>' +
    '</div>';
  document.body.appendChild(el);
  _sheet = el;
  /* [hidden] 은 CSS display 에 진다(docs/README '고칠 때 알아 둘 것') — 보이지 않을 것은 style 로 끈다.
     두 번째 버튼은 하나만: 공유 기능이 있으면 [공유하기](메일 앱도 그 안에 있다), 없으면 [메일로 보내기]. */
  var canShare = typeof navigator.share === 'function';
  if (!canShare) $('.rxg-share').style.display = 'none';
  if (canShare) $('.rxg-mail').style.display = 'none';
  /* 앱 안 브라우저엔 크롬 로그인이 없어 웹 스토어의 'PC로 보내기'가 막힌다 — 막히는 길은 보이지 않는다(inAppBrowser 주석). */
  if (_inApp) $('.rxg-store').style.display = 'none';
  if (location.pathname.indexOf('/catalog') === 0) $('.rxg-catalog').style.display = 'none';
  $('.rxg-copy').addEventListener('click', copyLink);
  $('.rxg-share').addEventListener('click', shareLink);
  $('.rxg-mail').addEventListener('click', function () { track('mail'); });
  $('.rxg-catalog').addEventListener('click', openCatalog);
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
  $('.rxg-mail').setAttribute('href', mailHref());   /* 작품 탐색은 해시 라우트라 열 때마다 지금 주소로 */
  $('.rxg-copy').textContent = '링크 복사';
  $('.rxg-url').style.display = 'none';
  status('');
  _sheet.style.display = 'flex';
  document.documentElement.style.overflow = 'hidden';   /* 시트 뒤 페이지가 같이 스크롤되지 않게 */
  /* 뒤로 가기가 페이지를 떠나지 않고 시트만 닫게 — 같은 주소로 히스토리 한 칸을 쌓는다(안드로이드는 뒤로 가기로 창을 닫는다).
     주소·해시가 그대로라 작품 탐색 라우터(hashchange 만 듣는다)와 계측에는 영향이 없다. */
  if (!_historyPushed) {
    try { history.pushState({ rxInstallGuide: true }, ''); _historyPushed = true; } catch (_) { _historyPushed = false; }
  }
  $('.rxg-copy').focus();
  track('opened');
}
/* 직접 닫으면(버튼·Esc·바깥) 열 때 쌓은 히스토리 칸을 되돌린다. 뒤로 가기·해시 이동으로 닫힐 때는 이미 그 칸을 지났거나
   다른 화면으로 갔으니 건드리지 않는다 — 되돌리면 한 번 더 뒤로 간다. */
function close(viaNavigation) {
  if (!_sheet || _sheet.style.display === 'none') return;
  _sheet.style.display = 'none';
  document.documentElement.style.overflow = '';
  if (_trigger && _trigger.focus) _trigger.focus();
  _trigger = null;
  if (_historyPushed) {
    _historyPushed = false;
    if (viaNavigation !== true) { try { history.back(); } catch (_) { /* 히스토리를 못 건드리는 환경 — 칸이 하나 남을 뿐이다 */ } }
  }
}
function onNavigate() { close(true); }

/* ═══ 부트 ═══════════════════════════════════════════════════════ */
function boot() {
  if (!isMobileDevice(deviceEnv())) return;   /* PC 는 그대로 — 설치 버튼은 웹 스토어로 */
  _inApp = inAppBrowser(navigator.userAgent);
  /* 'PC 크롬에서 설치할 수 있어요' 같은 휴대폰 전용 문구를 CSS 로 바꿔 끼우는 표식(css/tokens.css .rx-mobile-only). */
  document.documentElement.classList.add('rx-mobile-device');
  /* 버블 단계 — analytics.js 의 capture 단계 계측(install_cta_clicked)이 먼저 지나간 뒤 이동을 막는다. */
  document.addEventListener('click', function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest('a[data-cta]') : null;
    if (!a || ev.defaultPrevented) return;
    ev.preventDefault();
    open(a);
  });
  /* 뒤로 가기(열 때 쌓은 칸을 지남)·해시 이동이면 닫는다 — 작품 탐색은 해시 라우트라, 안 닫으면 화면만 바뀌고 시트가
     새 화면을 덮은 채 남는다. */
  window.addEventListener('popstate', onNavigate);
  window.addEventListener('hashchange', onNavigate);
}
if (typeof window !== 'undefined' && typeof document !== 'undefined') boot();
