/* Amplitude 계측 — 랜딩·작품 탐색 공용. 정본은 docs/analytics/tracking-plan.md (이벤트를 바꾸려면 거기부터).
   설계 요지:
   ① 동의 방식은 지역으로 가른다(HP-466, 시행 OPTOUT_FROM). **한국 시간대** 방문자는 랜딩·작품 탐색 모두 옵트아웃 —
      미선택이어도 이벤트를 수집하고 배너는 '수집 안내 + 거부'다(개인정보위 2024-01-31: 특정 개인을 식별하지 않는 행태정보는
      동의 없이 처리 가능, 투명성·거부권 조건). **그 밖의 지역**(EU 쿠키 동의·캘리포니아 도청법)은 옵트인 — [허용] 뒤에만.
      **세션 리플레이**는 한국 시간대 **랜딩**에서만 2026-10-10 부터 옵트아웃(REPLAY_OPTOUT_FROM), 작품 탐색·해외는 [허용] 뒤에만.
   ② SDK 는 허용 뒤 동적으로 붙이고, 그 전 호출은 큐에 쌓아 로드 뒤 보낸다.
   ③ 자동수집(pageViews·pageUrlEnrichment·form)은 끈다 — 전체 URL 이 실리면 /catalog 해시의 작품 ID 나
      쿼리가 새 나간다. page_path 는 cleanPath 로 직접 정제한다(라우트 이름까지만).
   ④ IP 는 끈다 — 처리방침 수집 항목에 없다. 익스텐션(HTTP API, ip 미전송)과 같은 수준으로 맞춘다.
   ⑤ 세션 리플레이(HP-457)는 **랜딩·작품 탐색**, 시행일부터 — 랜딩·한국 시간대는 미선택이어도, 그 밖은 [허용] 뒤에만
      (replayFor). 아래 REPLAY_FROM·REPLAY_OPTOUT_FROM 참조.
   ⑥ Google Analytics(HP-465)도 **같은 동의 뒤에만**, 처리방침 시행일부터 붙인다 — 아래 GA_FROM 참조. 자동 수집 값
      (전체 URL·문서 제목·전체 리퍼러)을 정리된 값으로 덮어 Amplitude 와 같은 금지 목록(트래킹 플랜 §2)을 지킨다.
   ⑦ 수집 범위(HP-615): 옵트아웃·리플레이·배너는 처리방침이 이름을 들어 밝힌 두 표면(첫 화면 `/`·작품 탐색)에서만이다
      (fullSurface). 그 밖의 페이지(/discord/)는 이 파일을 실어도 이미 [허용]한 방문자의 클릭만 보낸다. 로컬 호스트는
      디버그 표시 없이는 보내지 않고(sendAllowed), 팀 브라우저는 버리지 않고 traffic_type=internal 로 표시만 한다.
   카탈로그(React)는 이 파일을 /js/analytics.js 로 따로 로드해 window.ReplixAnalytics 로만 부른다.
   node 에서 import 하면 부트하지 않는다(scripts/test-analytics.mjs 가 순수 함수를 검사한다). */
export var CONSENT_KEY = 'replix_web_analytics_consent_v1';
/* 동의 버전 — 수집 범위나 받는 곳이 바뀌면 올려 다시 묻는다. 2 = 랜딩 세션 리플레이(HP-457), 3 = Google Analytics(HP-465),
   4 = 작품 탐색까지 리플레이(2026-10-01 고경우). 운영에서는 각 시행일 전까지 앞 버전이 유효하다 — consentVersion() 이 가른다.
   거부는 버전과 무관하게 계속 존중한다(parseConsent). */
export var CONSENT_VERSION = 4;
export var SDK_URL = 'https://cdn.amplitude.com/libs/analytics-browser-2.45.8-min.js.gz';
/* 익스텐션 config.js 와 같은 두 프로젝트(쓰기 전용 클라이언트 키 — 읽기·삭제 불가). 표면은 surface 속성으로 가른다. */
export var API_KEYS = { prod: '6f7bcf8fc37e9f93d442f943c23b6861', dev: 'fa98652a9c62152eaab56eb423b707ab' };
/* ─── 세션 리플레이(HP-457) ───────────────────────────────────────
   화면 조작(스크롤·클릭·화면 구성 변화)을 재생 가능한 형태로 기록한다. 세 가지를 고정한다:
   · **랜딩·작품 탐색.** 처음엔 랜딩만이었다가 2026-10-01 고경우 결정으로 작품 탐색도 찍는다. 화면에 보이는 작품명·포스터는
     녹화에 담긴다 — [허용]으로 받는 동의 범위로 처리방침 1항이 밝힌다(이벤트 속성 금지 목록 §2 와는 별개). 대신 **남의 글·
     닉네임·프로필 사진·로그인 계정 이름은 마크업에서 가린다**: 평가 한 건 `amp-mask`·작성자 사진 `amp-block`(Comments.tsx),
     순간 채팅 목록 `amp-mask`(Title.tsx), 계정 메뉴 `amp-mask`(Chrome.tsx). 검색창·입력란은 아래 medium 이 가린다.
     ⚠️ 작품 탐색에 남의 글·이름을 보여 주는 새 화면을 붙이면 그 요소에 `amp-mask` 를 단다(테스트가 위 셋을 고정).
   · **시행일부터.** 2026-10-01 공고와 동시에 시행한다 — 법정 사전 공지 기간은 없고 개인정보위 작성지침도 "개정 전 또는
     개정 즉시 공지"다(고경우 결정, 처리방침 11항도 같이 고침). 운영(replix.tv)만 날짜를 본다. 그 밖은 날짜와 무관하게 켜되(dev 프로젝트로 간다), 로컬은 디버그 표시가 있을 때만 보낸다(HP-615).
     ⚠️ 공고(=이 변경의 배포·공지 게시)가 밀리면 이 날짜와 privacy.html 의 시행일을 함께 민다.
   · **입력값은 가린다**(medium). 랜딩에는 입력 필드·이용자 생성 콘텐츠가 없지만, 생겨도 새 나가지 않게.
   · **랜딩·한국 시간대는 옵트아웃**(2026-10-10 고경우 결정, REPLAY_OPTOUT_FROM). 국내 주요 사이트를 2026-10-10 실측한 결과
     29CM(Datadog)·당근·인프런·클래스101(Clarity)·무신사(Hotjar)·티빙(Amplitude) 모두 첫 화면에서 동의 배너 없이 녹화한다 —
     국내 관행에 맞추되, 랜딩은 로그인·남의 글이 없어 비식별에 가깝다는 점이 근거다. **작품 탐색은 [허용] 유지**(남의 평가·
     채팅·계정 이름이 뜨는 화면이라 가림에 기댄다), **해외는 [허용] 유지**(CIPA·GDPR). 거부는 어디서든 끈다. replayFor 가 가른다.
   플러그인은 자기 원격 설정(sr-client-cfg.amplitude.com)을 받는다 — 끌 수 없다. 대시보드의 Session Replay
   설정에서 마스킹을 낮추면 이 값보다 느슨해질 수 있으므로 거기는 건드리지 않는다(트래킹 플랜 §7). */
export var REPLAY_FROM = Date.parse('2026-10-01T00:00:00+09:00');
/* 랜딩·한국 시간대의 리플레이 옵트아웃 시행일(처리방침 1·6항 개정, 공고와 동시). ⚠️ 옮기면 privacy.html 시행일과 같이. */
export var REPLAY_OPTOUT_FROM = Date.parse('2026-10-10T00:00:00+09:00');
export var SR_URL = 'https://cdn.amplitude.com/libs/plugin-session-replay-browser-1.35.4-min.js.gz';
/* storeType 'memory' — 아직 안 보낸 녹화 조각을 브라우저 저장소(IndexedDB)에 남기지 않는다. 철회하면 그 즉시 사라져야
   한다는 약속(처리방침 6항)을 저장소 청소에 기대지 않고 지키려는 것이다.
   ⚠️ 전송은 플러그인의 **웹 워커**가 1~10초 간격으로 한다 — 페이지의 fetch 후킹·리소스 타이밍에는 안 보인다.
   확인은 SDK logLevel 을 Debug(4)로 올려 'Session replay event batch tracked successfully' 로그로 한다(2026-09-29 실측).
   떠나는 순간의 마지막 조각은 sendBeacon 으로 나가는데 크롬에서 CORS 로 막힌다(플러그인 1.35.4 의 동작) — 마지막
   몇 초가 빠질 수 있다. */
export var SR_CONFIG = { sampleRate: 1, storeType: 'memory', privacyConfig: { defaultMaskLevel: 'medium' } };
/* ─── Google Analytics(HP-465) ────────────────────────────────────
   · **같은 동의 뒤에만.** 처리방침 6항이 "동의한 경우에만 분석 도구로 보낸다"고 약속한다 — 배너 세부(bannerDetail 버전 3)가 Google 을 밝힌다.
   · **시행일부터.** 2026-10-01 공고와 동시에 시행(리플레이와 같은 개정, 위 주석 참조). 운영만 날짜를 본다. 로컬은 디버그 표시가 있을 때만
     보내고(sendAllowed), 운영이 아닌 곳의 수집은 traffic_type=internal 로 표시해 GA 의 'Internal Traffic' 데이터 필터로 걸러 낸다.
     ⚠️ 공고가 밀리면 이 날짜와 privacy.html 의 시행일을 함께 민다.
   · **자동 수집 값을 덮어쓴다.** gtag 는 기본으로 전체 URL(카탈로그 해시의 작품 번호)·문서 제목·전체 리퍼러(검색어·
     초대 토큰)를 싣는다 — gaPage() 가 정리한 값만 보낸다. 자동 page_view 는 끄고 page() 가 직접 보낸다.
     주소의 쿼리는 광고 캠페인 값(GA_CAMPAIGN_PARAMS)만 남긴다 — GA 는 세션 첫 page_view 의 주소에서 캠페인을 읽어서, 쿼리를
     통째로 지우던 때(HP-615 전)는 유료 광고 세션이 리퍼러(instagram.com 등)만 보고 'Organic Social' 로 잡혔다.
   · **이벤트 속성 이름 중 유입 경로 예약어는 GA 로 보낼 때 바꾼다**(gaParams). 작품 탐색의 catalog_engaged{source: 'nav'} 가
     세션 소스 'nav' 로 잡혔다(2026-10-13 GA 리포트 22세션) — gtag 는 ep.source 로 그대로 보내고 GA 서버가 유입 경로로 해석한다.
     같은 계열(medium·campaign·term·content)도 GA 쪽 이름을 정하기 전에는 싣지 않는다. Amplitude 는 기존 차트를 깨지 않게 그대로 둔다.
   · ⚠️ GA 관리 화면의 **향상된 측정은 꺼 둔다**(이탈 클릭이 넷플릭스 재생 주소를, 사이트 검색이 검색어를 싣는다).
     이건 코드로 막을 수 없는 원격 설정이다(트래킹 플랜 §7). */
export var GA_ID = 'G-MVDJ0Z60LJ';
export var GA_FROM = Date.parse('2026-10-01T00:00:00+09:00');
export var GA_URL = 'https://www.googletagmanager.com/gtag/js?id=';
export var GA_CONFIG = { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false };
/* page_location 에 남기는 쿼리 — UTM 다섯. 우리가 광고 주소에 붙이는 캠페인 단위 값이라 방문자를 가리키지 않는다.
   광고 클릭 식별값(gclid·gbraid·wbraid·fbclid — 광고 플랫폼이 클릭마다 붙이는 값)은 남기지 않는다. 처리방침이 밝힌 GA 수집 항목은
   '방문한 페이지(작품·회차 번호를 뺀 경로)'라 클릭 단위 식별값까지 덮지 않는다(HP-615 리뷰). 그래서 유튜브(Google Ads) 광고도
   최종 주소에 utm 을 직접 붙여야 GA 가 캠페인으로 가른다. 그 밖(작품·회차 번호, 초대·로그인 왕복 값, 팀 표시)은 지금처럼 지운다(§2). */
export var GA_CAMPAIGN_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
/* GA 쪽 이름을 따로 정한 이벤트 속성. 유입 경로 예약어 중 여기 없는 것은 GA 에 아예 싣지 않는다(gaParams). */
export var GA_PARAM_RENAME = { source: 'click_source' };
export var GA_TRAFFIC_PARAMS = ['source', 'medium', 'campaign', 'term', 'content'];
/* ─── 로컬·팀 트래픽(HP-615) ──────────────────────────────────────
   팀·개발 트래픽이 실데이터에 섞였다(2026-10-13: 작품 탐색 조회 268회 중 245회가 팀으로 보이는 18명, GA 에 localhost 14세션).
   · **로컬 호스트는 보내지 않는다** — 개발 중 확인이 필요하면 ?replix_analytics_debug=1 로 이 브라우저에 표시를 남긴다(=0 이면 해제).
     표시가 있으면 지금까지처럼 dev 프로젝트·traffic_type=internal 로 보낸다.
   · **팀 브라우저는 표시만 한다** — ?replix_internal=1 로 들어오면 이 브라우저에 표시를 남기고(=0 이면 해제), 표시가 있으면 GA 에
     traffic_type=internal(GA 'Internal Traffic' 데이터 필터가 보는 값), Amplitude 에 같은 이름의 이벤트 속성을 싣는다. 버리지 않는다 —
     거르는 것은 GA 관리 화면의 필터와 Amplitude 차트 조건이 한다. 모든 팀 브라우저가 같은 상수라 사람을 가리키지 않는다
     (회원 식별값·이메일·IP 와 무관 — 옵트아웃 근거 그대로). 동의 규칙도 그대로 따른다.
   · 두 쿼리는 읽은 뒤 주소창에서 지운다 — 표시된 주소가 그대로 공유되면 밖의 방문자까지 팀으로 표시된다. */
export var INTERNAL_KEY = 'replix_internal';
export var DEBUG_KEY = 'replix_analytics_debug';
/* ─── 옵트아웃(HP-466) ───────────────────────────────────────────
   · **두 표면 모두.** 처음엔 랜딩만이었다가 같은 날 고경우 결정으로 작품 탐색도 넣었다. 작품 탐색은 로그인(Keycloak)이
     있지만 웹 이벤트에 회원 식별값을 싣지 않으므로 '식별하지 않는다'는 조건이 그대로다 — 아래 넷째 항목이 이걸 지킨다.
   · **한국 시간대만.** 브라우저 시간대가 Asia/Seoul 이면 국내 방문자로 본다. EU 는 분석 쿠키에 사전 동의가 필요하고
     (GDPR·ePrivacy), 캘리포니아는 도청법(CIPA) 소송이 잦다 — 그 밖의 시간대·모름은 옵트인 그대로.
   · **리플레이는 랜딩만.** 화면 조작 녹화는 CIPA 세션 리플레이 소송의 주 대상이라 처음엔 [허용]에서만 붙였다가,
     2026-10-10 부터 한국 시간대 랜딩은 미선택이어도 붙인다(위 리플레이 주석). 작품 탐색·해외는 그대로 [허용] 뒤에만.
   · **식별하지 않는다는 조건을 지킨다.** 웹 계측은 IP 를 끄고, 로그인(작품 탐색 Keycloak)과 연결하지 않는다 — 회원
     식별값을 웹 이벤트에 싣는 순간 이 근거가 무너져 동의가 필요해진다(트래킹 플랜 §4).
   · **시행일부터.** 처리방침 1·6항 개정, 2026-10-01 공고와 동시에 시행. ⚠️ 날짜를 옮기면 privacy.html 시행일과 같이. */
export var OPTOUT_FROM = Date.parse('2026-10-01T00:00:00+09:00');
export var KR_TZ = 'Asia/Seoul';
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
/* 처리방침이 이름을 들어 밝힌 두 표면(첫 화면·작품 탐색)인가. 옵트아웃·리플레이·배너·첫 로드의 SDK 는 여기서만 —
   그 밖의 페이지(/discord/)는 처리방침의 미선택 수집 범위 밖이라 이미 [허용]한 방문자의 클릭만 보낸다(HP-615). */
export function fullSurface(pathname) { return /^\/(index\.html)?$/.test(pathname || '/') || surfaceOf(pathname) === 'web_catalog'; }
/* 로컬 개발 호스트인가 — 루프백·사설망·.local/.localhost·file://(빈 호스트). 휴대폰으로 같은 망의 개발 서버를 여는 경우까지. */
export function isLocalHost(hostname) {
  var h = String(hostname || '').toLowerCase().replace(/^\[|\]$/g, '');
  return h === '' || h === 'localhost' || h === '0.0.0.0' || h === '::1' || /\.(localhost|local)$/.test(h) ||
    /^(127|10)\.\d+\.\d+\.\d+$/.test(h) || /^192\.168\.\d+\.\d+$/.test(h) || /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(h);
}
/* 이 호스트에서 분석 도구로 보내도 되는가 — 로컬은 디버그 표시가 있을 때만. */
export function sendAllowed(hostname, debug) { return !isLocalHost(hostname) || debug === true; }
/* 팀·개발 트래픽 표시를 붙이는가 — 운영이 아닌 곳(디버그로 보낸 로컬)이거나 팀 브라우저 표시가 있을 때. */
export function internalTraffic(hostname, flag) { return envOf(hostname) !== 'prod' || flag === true; }
/* 표시 쿼리 값 → true(켜기) · false(끄기) · null(그대로). */
export function flagParam(value) { return value === '1' ? true : value === '0' ? false : null; }
/* GA page_location 에 남길 쿼리 — 광고 캠페인 값만, 처음 나온 순서·첫 값으로. 없으면 빈 문자열.
   값은 원래 주소의 글자 그대로 옮긴다 — 풀었다 다시 싸면 공백(%20)이 '+' 로 바뀌어 GA 의 캠페인 이름이 원래와 달라진다. */
export function campaignQuery(search) {
  var kept = [], seen = [];
  String(search || '').replace(/^\?/, '').split('&').forEach(function (part) {
    var eq = part.indexOf('='), key = eq < 0 ? part : part.slice(0, eq);
    if (eq < 0 || eq === part.length - 1 || GA_CAMPAIGN_PARAMS.indexOf(key) < 0 || seen.indexOf(key) >= 0) return;
    seen.push(key); kept.push(part);
  });
  return kept.length ? '?' + kept.join('&') : '';
}
/* GA 로 보내는 이벤트 속성 — 유입 경로 예약어는 GA_PARAM_RENAME 의 이름으로 바꾸고, 이름을 정하지 않은 예약어는 뺀다. */
export function gaParams(props) {
  var out = {};
  Object.keys(props || {}).forEach(function (k) {
    var name = GA_PARAM_RENAME[k] || k;
    if (GA_TRAFFIC_PARAMS.indexOf(name) < 0) out[name] = props[k];
  });
  return out;
}
/* 쿼리는 받지도 않고, 카탈로그 해시는 라우트 이름까지만 남긴다 — '#/title/123/ep/4' → '#/title'. */
export function cleanPath(pathname, hash) {
  var path = (pathname || '/').replace(/\/index\.html$/, '/') || '/';
  if (surfaceOf(path) !== 'web_catalog') return path;
  var m = /^#\/([a-z]+)/.exec(hash || '');
  return '/catalog/' + (m ? '#/' + m[1] : '');
}
export function deviceClass(width) { return width < 768 ? 'mobile' : (width < 1024 ? 'tablet' : 'desktop'); }
/* 리플레이 조항이 시행 중인가 — 운영은 시행일부터, 그 밖은 항상. */
export function replayInForce(hostname, nowMs) { return envOf(hostname) !== 'prod' || nowMs >= REPLAY_FROM; }
/* 랜딩·작품 탐색은 가리지 않는다. 그 밖의 페이지는 녹화 범위(처리방침 1항 '첫 화면과 작품 탐색') 밖이라 허용해도 찍지 않는다. */
export function replayOn(hostname, pathname, nowMs) {
  return fullSurface(pathname) && replayInForce(hostname, nowMs);
}
/* 랜딩·한국 시간대의 리플레이 옵트아웃 조항이 시행 중인가 — 운영은 시행일부터, 그 밖은 항상. */
export function replayOptOutOn(hostname, nowMs) { return envOf(hostname) !== 'prod' || nowMs >= REPLAY_OPTOUT_FROM; }
/* 리플레이를 붙이는가. 허용했으면 어디서나, 거부했으면 어디서도 아니다. 미선택은 **옵트아웃 지역(한국 시간대)의 랜딩**에서만,
   옵트아웃 조항 시행 뒤에(2026-10-10 고경우 결정 — 국내 관행 실측, 위 리플레이 주석). 작품 탐색은 남의 평가·채팅·계정
   이름이 뜨는 화면이라 가림에 기대므로 미선택에서는 붙이지 않는다. */
export function replayFor(consent, optOut, surface, replayOptOut) {
  if (consent === 'granted') return true;
  if (consent !== null) return false;
  return optOut && replayOptOut && surface === 'web_landing';
}
/* GA 조항이 시행 중인가 — 운영은 시행일부터, 그 밖은 항상. 표면은 가리지 않는다(작품 번호는 gaPage 가 뺀다). */
export function gaOn(hostname, nowMs) { return envOf(hostname) !== 'prod' || nowMs >= GA_FROM; }
/* 지금 유효한 동의 버전. 시행일마다 앞 버전으로 받은 동의는 무효가 되어 새 문구로 다시 묻는다. */
export function consentVersion(hostname, nowMs) {
  if (envOf(hostname) !== 'prod' || nowMs >= GA_FROM) return CONSENT_VERSION;
  return replayInForce(hostname, nowMs) ? 2 : 1;
}
/* GA 에 싣는 페이지 값 — 주소는 cleanPath(작품·회차 번호 없음) + 광고 캠페인 쿼리(campaignQuery), 제목은 표면 이름으로
   고정(문서 제목에 작품명이 들어가도 새지 않게), 리퍼러는 외부면 출처만·같은 출처면 정리된 경로(검색어·초대 토큰이 실리지 않게). */
export function gaPage(origin, pathname, hash, referrer, search) {
  var path = cleanPath(pathname, hash), cut = path.indexOf('#');
  var out = {
    page_location: origin + (cut < 0 ? path : path.slice(0, cut)) + campaignQuery(search) + (cut < 0 ? '' : path.slice(cut)),
    page_title: surfaceOf(pathname) === 'web_catalog' ? 'Replix 작품 탐색' : 'Replix 랜딩',
  };
  if (referrer) {
    try {
      var u = new URL(referrer);
      out.page_referrer = u.origin === origin ? origin + cleanPath(u.pathname, u.hash) : u.origin;
    } catch (_) { /* 주소가 아니면 싣지 않는다 */ }
  }
  return out;
}
/* 허용은 지금 버전으로 받은 것만 유효(범위·받는 곳이 늘면 다시 묻는다). 거부는 버전과 무관하게 계속 존중한다 —
   옵트아웃에서 옛 거부가 풀리면 거부한 사람을 수집하게 된다(HP-466). */
export function parseConsent(raw, version) {
  try {
    var v = JSON.parse(raw);
    if (!v) return null;
    if (v.decision === 'denied') return 'denied';
    return v.decision === 'granted' && v.version === (version || CONSENT_VERSION) ? 'granted' : null;
  } catch (_) { return null; }
}
/* 옵트아웃이 적용되는가 — 한국 시간대 + 첫 화면·작품 탐색(fullSurface — 처리방침이 밝힌 미선택 수집 범위) + (운영은) 시행일 이후.
   시간대를 모르면 보수적으로 옵트인. */
export function optOutOn(hostname, nowMs, timeZone, pathname) {
  return timeZone === KR_TZ && fullSurface(pathname) && (envOf(hostname) !== 'prod' || nowMs >= OPTOUT_FROM);
}
/* 이벤트(Amplitude·GA)를 보내는가. 리플레이는 이것과 별개로 replayFor 가 가른다. */
export function collectingFor(consent, optOut) {
  return consent === 'granted' || (consent === null && optOut);
}
/* ─── 배너 문구 — 두 층(HP-585) ─────────────────────────────────
   늘 보이는 요약(한두 문장) + [자세히]를 누르면 배너 안에서 펼쳐지는 세부와 처리방침 링크. 두 표면이 같은 배너를 쓴다.
   · **왜 줄였나.** 전문을 다 보이던 배너가 휴대폰 첫 화면의 30%(202/664px)를 덮고, PC 1366×640 에서는 히어로 설치 버튼을
     가렸다(2026-10-12 실측). 동의 없이 처리하는 분석 쿠키·이벤트·리플레이에 수집 시점 화면 고지 의무는 찾지 못했고, 법이
     정한 투명성 수단은 처리방침 공개다(개인정보 보호법 제30조 ①7호 — 처리방침 1·6항이 갖췄다). 개인정보위 처리방침
     작성지침(2026.4.) p.93 도 "핵심만 간결하게, 세부는 '링크' 또는 '더 알아보기'로"를 허용한다. 국내 서비스 18곳은 배너
     자체가 없었다(같은 날 실측). 조사 결과이며 법률 자문이 아니다 — 법률 검토는 HP-282. 2026-10-02 HP-478 의 '문구를
     줄이거나 접지 않는다'를 2026-10-12 조현빈 결정으로 대체했다.
   · **요약에 남기는 것.** 무엇(방문 통계·스크롤·클릭 기록)과 어디로(미국) — 수집 단계의 고지가 예측 가능성을 높여 동의 없이
     처리하는 근거를 뒷받침한다(개인정보위 통합 안내서 2025.7. p.129). 그리고 [허용]이 더하는 것 — 허용은 동의라, 무엇에
     동의하는지가 요약에서 보여야 한다. 받는 곳 이름·항목·가리는 것·거부의 효과는 세부로 내린다.
   · 요약은 짧게 유지한다(테스트가 70자 상한을 건다) — 길어지면 배너가 다시 첫 화면을 덮는다. */
/* 옵트아웃 지역(한국 시간대) 안내의 요약. 랜딩 리플레이 옵트아웃 시행 뒤(replayOptOut)에는 첫 화면 녹화가 미선택에서도
   이루어진다고 적는다. */
export function noticeText(replayOptOut) {
  return replayOptOut
    ? '방문 통계와 첫 화면의 스크롤·클릭 기록을 미국 분석 도구로 수집해요. 허용하면 작품 탐색에서도 기록해요.'
    : '방문 통계를 미국 분석 도구로 수집해요. 허용하면 스크롤·클릭 기록도 남겨요.';
}
/* 옵트아웃 지역 안내의 세부([자세히]로 펼침) — 받는 곳·항목·녹화 범위·가리는 것·거부의 효과. */
export function noticeDetail(replayOptOut) {
  return '방문 통계(기기 식별값과 사용 이벤트)는 개인을 알아볼 수 없는 형태로 Amplitude와 Google Analytics(모두 미국)로 보냅니다. ' +
    (replayOptOut
      ? '첫 화면의 스크롤·클릭 기록은 Amplitude에 기록하고, 허용하면 작품 탐색에서의 스크롤·클릭도 기록합니다. '
      : '허용하면 첫 화면과 작품 탐색에서의 스크롤·클릭 기록도 Amplitude에 기록합니다. ') +
    '입력한 내용과 다른 이용자의 글·닉네임은 기록하지 않으며, 거부하면 바로 멈추고 분석용 식별값을 지웁니다.';
}
/* 동의 요청(그 밖의 지역)의 요약 — 허용하면 무엇이 어디로 가는지. 범위는 아래 세부와 같은 버전 기준이다. */
export function bannerText(version) {
  return version >= 2
    ? '방문 통계와 스크롤·클릭 기록을 미국 분석 도구로 보내도 될까요?'
    : '방문 통계를 미국 분석 도구로 보내도 될까요?';
}
/* 동의 요청의 세부 — 동의가 덮는 범위를 그대로 적는다. 2·3 은 녹화가 랜딩뿐이라 '첫 화면에서'라고 적었고, 4 부터 작품 탐색까지.
   문구만 두 층으로 나눈 HP-585 는 범위·받는 곳이 그대로라 동의 버전을 올리지 않았다(이미 받은 동의 유지). */
export function bannerDetail(version) {
  if (version >= 4) {
    return 'Replix는 사이트 개선을 위해 방문 통계를 익명으로 수집합니다. 허용하면 기기 식별값과 사용 이벤트가 ' +
      'Amplitude와 Google Analytics(모두 미국)로, 첫 화면과 작품 탐색에서의 화면 조작 기록(스크롤·클릭)이 Amplitude로 ' +
      '전송됩니다. 입력한 내용과 다른 이용자의 글·닉네임은 기록하지 않습니다.';
  }
  if (version >= 3) {
    return 'Replix는 사이트 개선을 위해 방문 통계를 익명으로 수집합니다. 허용하면 기기 식별값과 사용 이벤트가 ' +
      'Amplitude와 Google Analytics(모두 미국)로, 첫 화면에서의 화면 조작 기록(스크롤·클릭)이 Amplitude로 전송됩니다. ' +
      '입력한 내용은 기록하지 않습니다.';
  }
  return version >= 2
    ? 'Replix는 사이트 개선을 위해 방문 통계를 익명으로 수집합니다. 허용하면 기기 식별값과 사용 이벤트, ' +
      '그리고 첫 화면에서의 화면 조작 기록(스크롤·클릭)이 Amplitude(미국)로 전송됩니다. 입력한 내용은 기록하지 않습니다.'
    : 'Replix는 사이트 개선을 위해 방문 통계를 익명으로 수집합니다. 허용하면 기기 식별값과 사용 이벤트가 ' +
      'Amplitude(미국)로 전송됩니다.';
}
/* 랜딩 링크(nav_link_clicked) 열거값 — 트래킹 플랜 §6 의 표와 같다. 목록 밖이면 보내지 않는다:
   마크업 오타가 새 값으로 쌓이면 차트가 조용히 갈라지고, href 를 그대로 넣는 실수는 §2(전체 URL 금지)를 깬다.
   '분석 설정'은 일부러 없다 — 동의를 철회하러 가는 클릭을 세지 않는다. */
export var LINK_TARGETS = ['top', 'scenes', 'rooms', 'faq', 'catalog', 'privacy', 'terms', 'contact_email', 'tmdb',
  'discord', 'discord_install'];
export var LINK_LOCATIONS = ['nav', 'footer', 'discord'];
export function linkProps(target, location) {
  return LINK_TARGETS.indexOf(target) >= 0 && LINK_LOCATIONS.indexOf(location) >= 0
    ? { target: target, location: location } : null;
}

/* ═══ 런타임 상태 ════════════════════════════════════════════════ */
var _consent = null;      /* 'granted' | 'denied' | null(미선택) */
var _sdk = 'idle';        /* 'idle' | 'loading' | 'ready' */
var _queue = [];          /* SDK 로드 전 호출 */
var _lastPage = null;     /* 마지막 page() 인자 — 허용 직후 현재 페이지의 page_viewed 를 1회 보내기 위해 */
var _banner = null;
var _replay = null;      /* 붙어 있는 세션 리플레이 플러그인 — 철회 때 떼어 내려고 쥐고 있는다 */
var _ga = 'idle';         /* 'idle' | 'loading' — gtag 는 dataLayer 가 큐라서 로드 완료를 기다릴 필요가 없다 */
var _gaBlocked = false;   /* 이 페이지에서 철회한 뒤면 true — gtag 가 메모리에 쥔 옛 client id 가 재허용 뒤 이어지지 않게
                             이 페이지에서는 다시 켜지 않는다. 다음 로드부터 새 쿠키로 시작한다. */
var _revoked = false;     /* 이 페이지에서 거부(철회)했는가 — 재허용 때만 새 device_id 를 받는다(옵트아웃 수집 → 허용은 그대로) */
var _debug = false;       /* 로컬 호스트에서도 보내는 디버그 표시(DEBUG_KEY) — 부트 때 읽는다 */
var _internal = false;    /* 팀 브라우저 표시(INTERNAL_KEY) — 부트 때 읽는다 */

function nowVersion() { return consentVersion(location.hostname, Date.now()); }
function timeZone() { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (_) { return ''; } }
function optOutNow() { return optOutOn(location.hostname, Date.now(), timeZone(), location.pathname); }
/* 보내는 상태인가 — 호스트(로컬은 디버그 표시가 있을 때만)와 동의. SDK·GA·리플레이는 모두 이 게이트 뒤에 있다. */
function collecting() { return sendAllowed(location.hostname, _debug) && collectingFor(_consent, optOutNow()); }
function internalNow() { return internalTraffic(location.hostname, _internal); }
/* 표시 쿼리(?replix_internal=1|0, ?replix_analytics_debug=1|0)를 이 브라우저에 반영하고 주소창에서 지운 뒤, 저장된 표시를 읽는다. */
function syncFlags() {
  var params = null, changed = false;
  try { params = new URLSearchParams(location.search); } catch (_) { /* 주소를 못 읽으면 저장된 표시만 본다 */ }
  [INTERNAL_KEY, DEBUG_KEY].forEach(function (k) {
    var on = params ? flagParam(params.get(k)) : null;
    if (on === null) return;
    try { if (on) localStorage.setItem(k, '1'); else localStorage.removeItem(k); } catch (_) { /* 저장 불가 — 이번 로드에만 */ }
    params.delete(k); changed = true;
    if (k === INTERNAL_KEY) _internal = on; else _debug = on;
  });
  try {
    if (localStorage.getItem(INTERNAL_KEY) === '1') _internal = true;
    if (localStorage.getItem(DEBUG_KEY) === '1') _debug = true;
  } catch (_) { /* 저장소를 못 읽으면 쿼리로 받은 값만 */ }
  if (changed) {
    var q = params.toString();
    try { history.replaceState(history.state, '', location.pathname + (q ? '?' + q : '') + location.hash); } catch (_) { /* 주소창은 그대로 둔다 */ }
  }
}
function replayOptOutNow() { return replayOptOutOn(location.hostname, Date.now()); }
/* 리플레이를 붙일 상태인가 — 조항 시행 중이고, replayFor(허용 / 랜딩·한국 시간대 미선택)가 허락할 때. */
function replaying() {
  return replayOn(location.hostname, location.pathname, Date.now()) &&
    replayFor(_consent, optOutNow(), surfaceOf(location.pathname), replayOptOutNow());
}
function readConsent() { try { return parseConsent(localStorage.getItem(CONSENT_KEY), nowVersion()); } catch (_) { return null; } }
function writeConsent(d) {
  try { localStorage.setItem(CONSENT_KEY, JSON.stringify({ decision: d, decidedAt: Date.now(), version: nowVersion() })); }
  catch (_) { /* 저장 불가(프라이빗 모드 등) — 이번 방문에만 적용된다 */ }
}
function amp() { return window.amplitude; }
function commonProps() {
  var p = {
    env: envOf(location.hostname),
    surface: surfaceOf(location.pathname),
    locale: navigator.language || 'unknown',
    page_path: cleanPath(location.pathname, location.hash),
    device_class: deviceClass(window.innerWidth),
  };
  if (internalNow()) p.traffic_type = 'internal';   /* 팀·개발 트래픽 표시 — 버리지 않고 차트 조건으로 거른다 */
  return p;
}
/* 리플레이 플러그인을 SDK 에 붙인다. 스크립트가 안 실렸으면(차단·랜딩 아님) 아무 일도 하지 않는다. */
function attachReplay(a) {
  if (_replay || !replaying()) return;
  try {
    var sr = window.sessionReplay;
    if (sr && sr.plugin) { _replay = sr.plugin(SR_CONFIG); a.add(_replay); }
  } catch (_) { _replay = null; /* fail-open — 이벤트 계측은 그대로 간다 */ }
}
/* SDK 가 이미 떠 있는 상태에서 [허용]을 받았을 때 — 플러그인 스크립트를 그제야 받아 붙인다(작품 탐색의 옵트아웃 수집 중에는
   안 받았다. 랜딩·한국 시간대는 loadSdk 가 처음부터 붙여 두므로 여기서는 _replay 가 이미 있어 그냥 돌아간다). */
function loadReplay(a) {
  if (_replay || !replaying()) return;
  if (window.sessionReplay && window.sessionReplay.plugin) { attachReplay(a); return; }
  var r = document.createElement('script');
  r.src = SR_URL; r.async = true;
  r.onload = function () { attachReplay(a); };
  document.head.appendChild(r);
}
function detachReplay(a) {
  if (!_replay) return;
  try { a.remove(_replay.name); } catch (_) { /* 이미 떨어졌거나 SDK 내부 오류 */ }
  _replay = null;
}
function loadSdk() {
  /* 수집 게이트를 여기서도 본다 — 허용 버튼(setConsent)은 send 를 거치지 않고 바로 부르는데, SDK 는 init 만으로 세션 이벤트를 보낸다. */
  if (_sdk !== 'idle' || !collecting()) return;
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
    var start = function () {
      a.init(API_KEYS[envOf(location.hostname)], cfg);
      a.setOptOut(false);
      _sdk = 'ready';
      _queue.splice(0).forEach(function (f) { f(a); });
    };
    if (!replaying()) { start(); return; }
    /* 리플레이 플러그인은 init **앞에** 붙여야 첫 화면부터 찍힌다. 막히거나 실패해도 이벤트 계측은 그대로 간다. */
    var r = document.createElement('script');
    r.src = SR_URL; r.async = true;
    r.onload = function () { attachReplay(a); start(); };
    r.onerror = start;
    document.head.appendChild(r);
  };
  /* 차단·오프라인 — 계측은 조용히 포기한다(fail-open). 다음 방문에 다시 시도한다. */
  s.onerror = function () { _sdk = 'idle'; _queue.length = 0; };
  document.head.appendChild(s);
}
function send(fn) {
  if (!collecting()) return;
  if (_sdk === 'ready' && amp()) fn(amp());
  else { _queue.push(fn); loadSdk(); }
}
/* GA 를 붙인다 — 수집 중(허용했거나 옵트아웃 대상의 미선택)·시행일·이 페이지에서 철회하지 않았을 때만.
   정적 태그 대신 여기서 스크립트를 주입한다. */
function ensureGa() {
  if (_ga !== 'idle' || _gaBlocked || !collecting() || !gaOn(location.hostname, Date.now())) return;
  _ga = 'loading';
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window['ga-disable-' + GA_ID] = false;
  var dev = envOf(location.hostname) !== 'prod';
  /* traffic_type 은 config 에 실어 이 페이지의 모든 수집 요청에 붙는다(수집 요청의 tt=internal — 2026-10-13 확인). */
  var cfg = Object.assign({}, GA_CONFIG,
    gaPage(location.origin, location.pathname, location.hash, document.referrer, location.search),
    { cookie_flags: 'SameSite=Lax' + (location.protocol === 'https:' ? ';Secure' : '') },
    internalNow() ? { traffic_type: 'internal' } : {},
    dev ? { debug_mode: true } : {});
  window.gtag('js', new Date());
  window.gtag('config', GA_ID, cfg);
  var s = document.createElement('script');
  s.src = GA_URL + encodeURIComponent(GA_ID); s.async = true;
  /* 차단(광고 차단기 등)이면 dataLayer 에만 쌓이고 나가지 않는다 — Amplitude 와 같이 fail-open. */
  document.head.appendChild(s);
}
function gaOk() { return _ga !== 'idle' && !_gaBlocked && collecting() && typeof window.gtag === 'function'; }
/* GA 에도 같은 이름·속성으로 보낸다(유입 경로 예약어만 gaParams 가 바꾼다). page_viewed 는 GA 의 표준 page_view 로 —
   페이지 값을 갱신한 뒤 보낸다(카탈로그 라우트 이동). */
function gaTrack(name, props) {
  if (!gaOk()) return;
  var p = Object.assign({ surface: surfaceOf(location.pathname) }, gaParams(props));
  if (name === 'page_viewed') {
    var pg = gaPage(location.origin, location.pathname, location.hash, '', location.search);
    window.gtag('set', { page_location: pg.page_location, page_title: pg.page_title });
    window.gtag('event', 'page_view', p);
  } else {
    window.gtag('event', name, p);
  }
}
/** 이벤트 1건. 이름·속성은 트래킹 플랜 §6 에 있는 것만 — 작품·회차 ID·검색어는 어떤 속성에도 싣지 않는다(§2). */
export function track(name, props) {
  send(function (a) { a.track(name, Object.assign(commonProps(), props || {})); });
  ensureGa();   /* 첫 화면·작품 탐색은 부트 때 이미 붙어 no-op 이다. 그 밖의 페이지(/discord/)는 허용한 방문자의 첫 클릭에서야 붙인다 */
  gaTrack(name, props);
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
  if (a) {
    detachReplay(a);   /* 녹화를 멈추고 메모리의 미전송 조각을 버린다 */
    try { a.setOptOut(true); } catch (_) { /* SDK 내부 오류는 무시 — 아래에서 직접 지운다 */ }
  }
  _queue.length = 0;
  _revoked = true;   /* 같은 페이지에서 다시 허용하면 새 device_id 로 시작한다(setConsent) */
  /* GA: 전송을 즉시 막고(gtag 공식 차단 스위치), 이 페이지에서는 다시 켜지 않는다(_gaBlocked 주석). */
  window['ga-disable-' + GA_ID] = true;
  if (_ga !== 'idle') _gaBlocked = true;
  document.cookie.split(';').forEach(function (c) {
    var n = c.split('=')[0].trim();
    if (/^AMP_/i.test(n) || /^_ga/.test(n)) expireCookie(n);
  });
  try { Object.keys(localStorage).forEach(function (k) { if (/^AMP_/i.test(k)) localStorage.removeItem(k); }); } catch (_) {}
  /* SDK·플러그인이 만든 IndexedDB(AMP_diagnostics_* 등)도 지운다. databases() 가 없는 브라우저는 건너뛴다. */
  try {
    if (window.indexedDB && indexedDB.databases) {
      indexedDB.databases().then(function (dbs) {
        dbs.forEach(function (d) { if (d && /^AMP_|amp_session_replay/i.test(d.name || '')) indexedDB.deleteDatabase(d.name); });
      }).catch(function () {});
    }
  } catch (_) {}
}
export function setConsent(decision) {
  if (decision !== 'granted' && decision !== 'denied') return;
  var wasCollecting = collecting();
  _consent = decision; writeConsent(decision); hideBanner();
  if (decision === 'granted') {
    var a = amp();
    if (_sdk === 'ready' && a) {
      /* 같은 페이지에서 거부 → 허용: revoke 가 걸어 둔 optOut 을 풀고, 지운 식별자 대신 **새** device_id 를 받는다 —
         옛 값을 다시 쓰면 철회 전후가 한 기기로 이어져 "철회하면 식별값을 지운다"는 약속이 빈말이 된다.
         (2026-09-13 검증에서 잡힌 버그: 재허용 뒤 optOut 이 남아 이벤트가 조용히 버려졌다.)
         옵트아웃 수집 중 허용(HP-466)은 철회가 아니었으니 식별값을 그대로 두고 녹화만 더한다. */
      if (_revoked) { try { a.setOptOut(false); a.reset(); } catch (_) { /* SDK 내부 오류 — fail-open */ } _revoked = false; }
      loadReplay(a);   /* 허용은 화면 조작 기록까지 — 필요하면 플러그인 스크립트를 이제 받는다 */
    } else {
      loadSdk();
    }
    ensureGa();   /* page_viewed 보다 먼저 — 허용 직후의 페이지뷰가 GA 에도 1회 간다 */
    /* 옵트아웃으로 이미 수집 중이었으면 이 페이지의 page_viewed 는 나갔다 — 두 번 세지 않는다 */
    if (_lastPage && !wasCollecting) track('page_viewed', _lastPage);
  } else {
    revoke();
  }
}

/* ═══ 동의 배너 ══════════════════════════════════════════════════
   스타일을 JS 에 두는 이유: 랜딩(css/*.css)과 카탈로그(Tailwind 인라인)가 다른 스타일 체계라 두 표면에서
   같은 배너를 보이려면 이 파일이 자기 스타일을 들고 다녀야 한다. 색은 tokens.css 의 --screen-2·--accent 값.
   두 층(HP-585, 위 '배너 문구' 주석): 요약과 [거부]·[허용]이 한 줄에 서고, [자세히]를 누르면 세부가 배너 아래쪽으로 펼쳐진다
   (flex-wrap, 세부는 flex-basis 100%). 접힌 높이 — 휴대폰 390×664 에서 70px(약 11%), PC 1366×640 에서 61px(2026-10-12 실측,
   종전 전문 배너는 202px·30%). 처리방침으로 떠나지 않고 배너 안에서 펼치는 이유: 광고로 들어온 방문자가 랜딩을 떠나지 않게.
   · [거부]는 [허용]과 같은 크기·같은 채움으로 둔다 — 거부를 테두리만 남겨 덜 보이게 하지 않는다(개인정보위 눈속임 설계 유형⑨).
   · ⚠️ 세부(.rx-consent-detail)에 display 를 선언하지 않는다 — [hidden] 이 display 선언에 지면(docs/README) 늘 펼쳐진다. */
var BANNER_CSS = '#rx-consent{position:fixed;left:12px;right:12px;bottom:12px;z-index:9999;max-width:640px;margin:0 auto;' +
  'padding:10px 10px 10px 16px;border-radius:12px;background:#15151b;color:#e8e8ec;box-shadow:0 8px 28px rgba(0,0,0,.28);' +
  'font:14px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center}' +
  '#rx-consent p{margin:0}#rx-consent .rx-consent-summary{flex:1 1 0;min-width:0}' +
  '#rx-consent .rx-more{background:none;border:0;padding:0;margin:0;font:inherit;color:#cfcfd6;text-decoration:underline;' +
  'text-underline-offset:2px;cursor:pointer;white-space:nowrap}' +
  '#rx-consent .rx-consent-actions{display:flex;gap:6px;flex:none}' +
  '#rx-consent .rx-consent-actions button{font:inherit;font-weight:700;border:0;border-radius:8px;padding:8px 14px;' +
  'min-height:36px;cursor:pointer}' +
  '#rx-consent .rx-consent-actions .rx-deny{background:rgba(255,255,255,.14);color:#fff}' +
  '#rx-consent .rx-consent-actions .rx-allow{background:#e50914;color:#fff}' +
  '#rx-consent .rx-consent-detail{flex:1 1 100%;font-size:12.5px;line-height:1.55;color:#cfcfd6}' +
  '#rx-consent .rx-consent-detail a{color:#fff;font-weight:700;text-decoration:underline}' +
  '@media (max-width:560px){#rx-consent{left:8px;right:8px;bottom:8px;padding:8px 8px 8px 12px;font-size:12.5px;line-height:1.45}' +
  '#rx-consent .rx-consent-actions button{padding:6px 11px;min-height:34px}}';
export function showBanner() {
  if (_banner) { _banner.style.display = 'flex'; return; }
  var st = document.createElement('style'); st.textContent = BANNER_CSS; document.head.appendChild(st);
  var el = document.createElement('div');
  var notice = optOutNow();   /* 옵트아웃 지역은 '수집 안내 + 거부', 그 밖은 '동의 요청' */
  el.id = 'rx-consent'; el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', notice ? '방문 통계 수집 안내' : '방문 통계 수집 동의');
  el.innerHTML = '<p class="rx-consent-summary">' + (notice ? noticeText(replayOptOutNow()) : bannerText(nowVersion())) +
    ' <button type="button" class="rx-more" aria-expanded="false" aria-controls="rx-consent-detail">자세히</button></p>' +
    '<div class="rx-consent-actions"><button type="button" class="rx-deny">거부</button>' +
    '<button type="button" class="rx-allow">허용</button></div>' +
    '<p class="rx-consent-detail" id="rx-consent-detail" hidden>' +
    (notice ? noticeDetail(replayOptOutNow()) : bannerDetail(nowVersion())) + ' <a href="/privacy">개인정보처리방침</a></p>';
  el.querySelector('.rx-allow').addEventListener('click', function () { setConsent('granted'); });
  el.querySelector('.rx-deny').addEventListener('click', function () { setConsent('denied'); });
  el.querySelector('.rx-more').addEventListener('click', function () {
    var detail = el.querySelector('.rx-consent-detail');
    detail.hidden = !detail.hidden;
    this.setAttribute('aria-expanded', String(!detail.hidden));
    this.textContent = detail.hidden ? '자세히' : '접기';
  });
  document.body.appendChild(el); _banner = el;
}
/* [hidden] 속성은 CSS display 선언에 진다(docs/README '고칠 때 알아 둘 것') — style 로 직접 끈다. */
function hideBanner() { if (_banner) _banner.style.display = 'none'; }

/* ═══ 부트 ═══════════════════════════════════════════════════════ */
function boot() {
  syncFlags();
  _consent = readConsent();
  /* 첫 화면·작품 탐색만 로드하자마자 붙이고 배너를 띄운다. 그 밖의 페이지(/discord/)는 동의를 묻지 않고, 이미 허용한
     방문자의 클릭이 생겨야 send·track 이 SDK·GA 를 붙인다 — 미선택 수집(옵트아웃)은 처리방침의 범위 밖이다(fullSurface). */
  var full = fullSurface(location.pathname);
  if (full && collecting()) { loadSdk(); ensureGa(); }   /* 허용했거나, 옵트아웃 지역의 미선택 */
  if (full && _consent === null) showBanner();
  /* 설치 CTA·랜딩 링크·분석 설정은 data 속성으로 전 표면 공통 계측 — 각 모듈이 버튼 위치를 알 필요가 없고,
     카탈로그(React)도 마크업에 속성만 붙이면 된다. capture 단계라 새 탭 이동 전에 잡힌다. */
  document.addEventListener('click', function (ev) {
    var hit = function (sel) { return ev.target && ev.target.closest ? ev.target.closest(sel) : null; };
    var t = hit('[data-cta]');
    if (t) track('install_cta_clicked', { location: t.getAttribute('data-cta') });
    var l = hit('[data-link]');
    var lp = l ? linkProps(l.getAttribute('data-link'), l.getAttribute('data-link-loc')) : null;
    if (lp) track('nav_link_clicked', lp);
    var s = hit('[data-analytics-settings]');
    if (s) { ev.preventDefault(); showBanner(); }
  }, true);
  /* 떠나는 순간의 이벤트(같은 탭 링크 클릭·직전 section_viewed)는 SDK 의 1초 배치 flush 보다 페이지가 먼저 사라진다.
     SDK 는 그것을 localStorage 큐에 남겨 다음 SDK 페이지가 보내게 하지만, /privacy·/terms 처럼 SDK 가 없는 곳으로 가면
     다음 방문까지 밀린다(2026-09-21 실측: /terms 이동 뒤 AMP_unsent 에 그대로 남음) — pagehide 에서 beacon 으로 비운다.
     beacon 은 응답을 못 받아 재시도가 없으므로 떠날 때만 쓰고, bfcache 로 되돌아오면 fetch 로 복귀한다.
     철회 상태면 optOut 이 걸려 있어 flush 가 아무것도 보내지 않는다. */
  window.addEventListener('pagehide', function () {
    var a = amp();
    if (_sdk === 'ready' && a && collecting()) { try { a.setTransport('beacon'); a.flush(); } catch (_) { /* fail-open */ } }
  });
  window.addEventListener('pageshow', function (ev) {
    var a = amp();
    if (ev.persisted && _sdk === 'ready' && a) { try { a.setTransport('fetch'); } catch (_) { /* fail-open */ } }
  });
  window.ReplixAnalytics = {
    track: track, page: page, setConsent: setConsent, showBanner: showBanner,
    getConsent: function () { return _consent; },
  };
  window.dispatchEvent(new CustomEvent('replix-analytics-ready'));
}
if (typeof window !== 'undefined' && typeof document !== 'undefined') boot();
