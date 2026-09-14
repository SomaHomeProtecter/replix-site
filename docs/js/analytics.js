/* Amplitude 계측 — 랜딩·작품 탐색 공용. 정본은 docs/analytics/tracking-plan.md (이벤트를 바꾸려면 거기부터).
   설계 요지:
   ① 동의(옵트인) 전에는 SDK 스크립트도 쿠키도 만들지 않는다 — 배너의 [허용] 뒤에만 로드한다.
   ② SDK 는 허용 뒤 동적으로 붙이고, 그 전 호출은 큐에 쌓아 로드 뒤 보낸다.
   ③ 자동수집(pageViews·pageUrlEnrichment·form)은 끈다 — 전체 URL 이 실리면 /catalog 해시의 작품 ID 나
      쿼리가 새 나간다. page_path 는 cleanPath 로 직접 정제한다(라우트 이름까지만).
   ④ IP 는 끈다 — 처리방침 수집 항목에 없다. 확장(HTTP API, ip 미전송)과 같은 수준으로 맞춘다.
   카탈로그(React)는 이 파일을 /js/analytics.js 로 따로 로드해 window.ReplixAnalytics 로만 부른다.
   node 에서 import 하면 부트하지 않는다(scripts/test-analytics.mjs 가 순수 함수를 검사한다). */
export var CONSENT_KEY = 'replix_web_analytics_consent_v1';
export var CONSENT_VERSION = 1;
export var SDK_URL = 'https://cdn.amplitude.com/libs/analytics-browser-2.45.8-min.js.gz';
/* 확장 config.js 와 같은 두 프로젝트(쓰기 전용 클라이언트 키 — 읽기·삭제 불가). 표면은 surface 속성으로 가른다. */
export var API_KEYS = { prod: '6f7bcf8fc37e9f93d442f943c23b6861', dev: 'fa98652a9c62152eaab56eb423b707ab' };
export var SDK_CONFIG = {
  autocapture: { attribution: true, sessions: true, pageViews: false, formInteractions: false,
    fileDownloads: false, elementInteractions: false, pageUrlEnrichment: false },
  trackingOptions: { ipAddress: false },
  /* 원격 설정을 받지 않는다 — 켜 두면 Amplitude 대시보드의 Autocapture 설정이 위 autocapture 를 덮어
     pageViews(전체 URL)·elementInteractions(클릭 요소 텍스트=작품명)를 원격으로 되살릴 수 있다(§2 금지). */
  remoteConfig: { fetchRemoteConfig: false },
  identityStorage: 'cookie',
  cookieOptions: { sameSite: 'Lax' },
};

/* ═══ 순수 함수 (node 테스트 대상) ═══════════════════════════════ */
export function envOf(hostname) { return hostname === 'replix.tv' || hostname === 'www.replix.tv' ? 'prod' : 'dev'; }
export function surfaceOf(pathname) { return /^\/catalog(\/|$)/.test(pathname || '') ? 'web_catalog' : 'web_landing'; }
/* 쿼리는 받지도 않고, 카탈로그 해시는 라우트 이름까지만 남긴다 — '#/title/123/ep/4' → '#/title'. */
export function cleanPath(pathname, hash) {
  var path = (pathname || '/').replace(/\/index\.html$/, '/') || '/';
  if (surfaceOf(path) !== 'web_catalog') return path;
  var m = /^#\/([a-z]+)/.exec(hash || '');
  return '/catalog/' + (m ? '#/' + m[1] : '');
}
export function deviceClass(width) { return width < 768 ? 'mobile' : (width < 1024 ? 'tablet' : 'desktop'); }
export function parseConsent(raw) {
  try {
    var v = JSON.parse(raw);
    return v && v.version === CONSENT_VERSION && (v.decision === 'granted' || v.decision === 'denied') ? v.decision : null;
  } catch (_) { return null; }
}

/* ═══ 런타임 상태 ════════════════════════════════════════════════ */
var _consent = null;      /* 'granted' | 'denied' | null(미선택) */
var _sdk = 'idle';        /* 'idle' | 'loading' | 'ready' */
var _queue = [];          /* SDK 로드 전 호출 */
var _lastPage = null;     /* 마지막 page() 인자 — 허용 직후 현재 페이지의 page_viewed 를 1회 보내기 위해 */
var _banner = null;

function readConsent() { try { return parseConsent(localStorage.getItem(CONSENT_KEY)); } catch (_) { return null; } }
function writeConsent(d) {
  try { localStorage.setItem(CONSENT_KEY, JSON.stringify({ decision: d, decidedAt: Date.now(), version: CONSENT_VERSION })); }
  catch (_) { /* 저장 불가(프라이빗 모드 등) — 이번 방문에만 적용된다 */ }
}
function amp() { return window.amplitude; }
function commonProps() {
  return {
    env: envOf(location.hostname),
    surface: surfaceOf(location.pathname),
    locale: navigator.language || 'unknown',
    page_path: cleanPath(location.pathname, location.hash),
    device_class: deviceClass(window.innerWidth),
  };
}
function loadSdk() {
  if (_sdk !== 'idle') return;
  _sdk = 'loading';
  var s = document.createElement('script');
  s.src = SDK_URL; s.async = true;
  s.onload = function () {
    var a = amp();
    if (!a) { _sdk = 'idle'; return; }
    /* localhost(http)에서도 기기 쿠키가 남아야 검증이 된다 — secure 는 프로토콜을 따른다. */
    var cfg = Object.assign({}, SDK_CONFIG, {
      cookieOptions: Object.assign({}, SDK_CONFIG.cookieOptions, { secure: location.protocol === 'https:' }),
    });
    a.init(API_KEYS[envOf(location.hostname)], cfg);
    a.setOptOut(false);
    _sdk = 'ready';
    _queue.splice(0).forEach(function (f) { f(a); });
  };
  /* 차단·오프라인 — 계측은 조용히 포기한다(fail-open). 다음 방문에 다시 시도한다. */
  s.onerror = function () { _sdk = 'idle'; _queue.length = 0; };
  document.head.appendChild(s);
}
function send(fn) {
  if (_consent !== 'granted') return;
  if (_sdk === 'ready' && amp()) fn(amp());
  else { _queue.push(fn); loadSdk(); }
}
/** 이벤트 1건. 이름·속성은 트래킹 플랜 §6 에 있는 것만 — 작품·회차 ID·검색어는 어떤 속성에도 싣지 않는다(§2). */
export function track(name, props) {
  send(function (a) { a.track(name, Object.assign(commonProps(), props || {})); });
}
/** page_viewed. 동의 전이면 기억만 해 두고 허용 직후 1회 보낸다. */
export function page(props) { _lastPage = props || {}; track('page_viewed', _lastPage); }

/* ═══ 철회 ═══════════════════════════════════════════════════════ */
function expireCookie(name) {
  var host = location.hostname, parts = host.split('.');
  var domains = ['', host, '.' + host];
  if (parts.length > 2) domains.push(parts.slice(-2).join('.'), '.' + parts.slice(-2).join('.'));
  domains.forEach(function (d) { document.cookie = name + '=; Max-Age=0; path=/' + (d ? '; domain=' + d : ''); });
}
/* 철회 = "앞으로 안 보냄"이 아니라 "식별값도 없음". SDK 쿠키(AMP_*)와 미전송 큐(localStorage AMP_unsent_*)를 지운다 —
   처리방침 §6 "철회하면 아직 전송되지 않은 기록과 분석용 식별값이 즉시 삭제됩니다"가 이 코드다. */
function revoke() {
  var a = amp();
  if (a) { try { a.setOptOut(true); } catch (_) { /* SDK 내부 오류는 무시 — 아래에서 직접 지운다 */ } }
  _queue.length = 0;
  document.cookie.split(';').forEach(function (c) {
    var n = c.split('=')[0].trim();
    if (/^AMP_/i.test(n)) expireCookie(n);
  });
  try { Object.keys(localStorage).forEach(function (k) { if (/^AMP_/i.test(k)) localStorage.removeItem(k); }); } catch (_) {}
}
export function setConsent(decision) {
  if (decision !== 'granted' && decision !== 'denied') return;
  _consent = decision; writeConsent(decision); hideBanner();
  if (decision === 'granted') {
    var a = amp();
    if (_sdk === 'ready' && a) {
      /* 같은 페이지에서 거부 → 허용: revoke 가 걸어 둔 optOut 을 풀고, 지운 식별자 대신 **새** device_id 를 받는다 —
         옛 값을 다시 쓰면 철회 전후가 한 기기로 이어져 "철회하면 식별값을 지운다"는 약속이 빈말이 된다.
         (2026-09-13 검증에서 잡힌 버그: 재허용 뒤 optOut 이 남아 이벤트가 조용히 버려졌다.) */
      try { a.setOptOut(false); a.reset(); } catch (_) { /* SDK 내부 오류 — 아래 loadSdk 경로와 같이 fail-open */ }
    } else {
      loadSdk();
    }
    if (_lastPage) track('page_viewed', _lastPage);
  } else {
    revoke();
  }
}

/* ═══ 동의 배너 ══════════════════════════════════════════════════
   스타일을 JS 에 두는 이유: 랜딩(css/*.css)과 카탈로그(Tailwind 인라인)가 다른 스타일 체계라 두 표면에서
   같은 배너를 보이려면 이 파일이 자기 스타일을 들고 다녀야 한다. 색은 tokens.css 의 --screen-2·--accent 값. */
var BANNER_CSS = '#rx-consent{position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;max-width:680px;margin:0 auto;' +
  'padding:16px 18px;border-radius:14px;background:#15151b;color:#e8e8ec;box-shadow:0 12px 40px rgba(0,0,0,.35);' +
  'font:14px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif;display:flex;gap:16px;align-items:center;flex-wrap:wrap}' +
  '#rx-consent p{margin:0;flex:1 1 320px}#rx-consent a{color:#cfcfd6;text-decoration:underline}' +
  '#rx-consent .rx-consent-actions{display:flex;gap:8px;margin-left:auto}' +
  '#rx-consent button{font:inherit;font-weight:700;border:0;border-radius:9px;padding:9px 16px;cursor:pointer}' +
  '#rx-consent .rx-allow{background:#e50914;color:#fff}' +
  '#rx-consent .rx-deny{background:transparent;color:#cfcfd6;border:1px solid rgba(255,255,255,.22)}' +
  '@media (max-width:560px){#rx-consent{left:8px;right:8px;bottom:8px}}';
export function showBanner() {
  if (_banner) { _banner.style.display = 'flex'; return; }
  var st = document.createElement('style'); st.textContent = BANNER_CSS; document.head.appendChild(st);
  var el = document.createElement('div');
  el.id = 'rx-consent'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', '방문 통계 수집 동의');
  el.innerHTML = '<p>Replix는 사이트 개선을 위해 방문 통계를 익명으로 수집합니다. 허용하면 기기 식별값과 사용 이벤트가 ' +
    'Amplitude(미국)로 전송됩니다. <a href="/privacy">개인정보처리방침</a></p>' +
    '<div class="rx-consent-actions"><button type="button" class="rx-deny">거부</button>' +
    '<button type="button" class="rx-allow">허용</button></div>';
  el.querySelector('.rx-allow').addEventListener('click', function () { setConsent('granted'); });
  el.querySelector('.rx-deny').addEventListener('click', function () { setConsent('denied'); });
  document.body.appendChild(el); _banner = el;
}
/* [hidden] 속성은 CSS display 선언에 진다(docs/README '고칠 때 알아 둘 것') — style 로 직접 끈다. */
function hideBanner() { if (_banner) _banner.style.display = 'none'; }

/* ═══ 부트 ═══════════════════════════════════════════════════════ */
function boot() {
  _consent = readConsent();
  if (_consent === 'granted') loadSdk();
  else if (_consent === null) showBanner();
  /* 설치 CTA·분석 설정은 data 속성 하나로 전 표면 공통 계측 — 각 모듈이 CTA 위치를 알 필요가 없고,
     카탈로그(React)도 마크업에 속성만 붙이면 된다. capture 단계라 새 탭 이동 전에 잡힌다. */
  document.addEventListener('click', function (ev) {
    var t = ev.target && ev.target.closest ? ev.target.closest('[data-cta]') : null;
    if (t) track('install_cta_clicked', { location: t.getAttribute('data-cta') });
    var s = ev.target && ev.target.closest ? ev.target.closest('[data-analytics-settings]') : null;
    if (s) { ev.preventDefault(); showBanner(); }
  }, true);
  window.ReplixAnalytics = {
    track: track, page: page, setConsent: setConsent, showBanner: showBanner,
    getConsent: function () { return _consent; },
  };
  window.dispatchEvent(new CustomEvent('replix-analytics-ready'));
}
if (typeof window !== 'undefined' && typeof document !== 'undefined') boot();
