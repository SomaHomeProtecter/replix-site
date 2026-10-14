// scripts/test-analytics.mjs — 계측 모듈의 순수 함수 + 소스 규칙 검사. 랜딩은 빌드가 없어 이 검사가 회귀망이다.
// 실행: node scripts/test-analytics.mjs
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');

// node 에는 window 가 없다 → 모듈이 부트(배너·SDK)하지 않아야 import 자체가 성공한다.
const a = await import('../docs/js/analytics.js');

// 환경 판정 — 운영 도메인만 prod, 미리보기·로컬·file 은 dev(익스텐션 config.js 와 같은 두 프로젝트).
assert.equal(a.envOf('replix.tv'), 'prod');
assert.equal(a.envOf('www.replix.tv'), 'prod');
assert.equal(a.envOf('localhost'), 'dev');
assert.equal(a.envOf('localhost'), 'dev');
assert.equal(a.envOf(''), 'dev');

assert.equal(a.surfaceOf('/'), 'web_landing');
assert.equal(a.surfaceOf('/index.html'), 'web_landing');
assert.equal(a.surfaceOf('/catalog/'), 'web_catalog');
assert.equal(a.surfaceOf('/catalog'), 'web_catalog');

// page_path — 쿼리는 아예 받지 않고, 카탈로그 해시는 라우트 이름까지만(작품·회차 ID 제거).
assert.equal(a.cleanPath('/index.html', ''), '/');
assert.equal(a.cleanPath('/', '#faq'), '/');
assert.equal(a.cleanPath('/catalog/', '#/title/123/ep/4'), '/catalog/#/title');
assert.equal(a.cleanPath('/catalog/', '#/ranking'), '/catalog/#/ranking');
assert.equal(a.cleanPath('/catalog/', '#/'), '/catalog/');
assert.equal(a.cleanPath('/catalog/', ''), '/catalog/');

assert.equal(a.deviceClass(390), 'mobile');
assert.equal(a.deviceClass(800), 'tablet');
assert.equal(a.deviceClass(1440), 'desktop');

assert.equal(a.CONSENT_VERSION, 4, '2 = 랜딩 세션 리플레이(HP-457), 3 = Google Analytics(HP-465), 4 = 작품 탐색 리플레이(HP-457 확대)');
assert.equal(a.parseConsent(JSON.stringify({ decision: 'granted', version: 4 })), 'granted');
assert.equal(a.parseConsent(JSON.stringify({ decision: 'denied', version: 4 })), 'denied');
assert.equal(a.parseConsent(JSON.stringify({ decision: 'granted', version: 3 })), null, '녹화 범위가 작품 탐색으로 늘었다 — 3 으로 받은 허용은 다시 묻는다');
assert.equal(a.parseConsent(JSON.stringify({ decision: 'granted', version: 2 })), null, '받는 곳이 늘었다 — 2 로 받은 동의는 다시 묻는다');
assert.equal(a.parseConsent(JSON.stringify({ decision: 'granted', version: 1 })), null, '범위가 늘었다 — 1 로 받은 동의는 다시 묻는다');
assert.equal(a.parseConsent(JSON.stringify({ decision: 'granted', version: 1 }), 1), 'granted', '리플레이 시행일 전 운영에서는 1 이 유효하다');
assert.equal(a.parseConsent(JSON.stringify({ decision: 'granted', version: 2 }), 2), 'granted', 'GA 시행일 전 운영에서는 2 가 유효하다');
assert.equal(a.parseConsent(JSON.stringify({ decision: 'granted', version: 0 })), null, '버전이 다르면 다시 묻는다');
assert.equal(a.parseConsent(JSON.stringify({ decision: 'denied', version: 1 })), 'denied',
  '거부는 버전이 바뀌어도 계속 존중한다 — 옵트아웃에서 옛 거부가 풀리면 거부한 사람을 수집하게 된다(HP-466)');
assert.equal(a.parseConsent(JSON.stringify({ decision: 'maybe', version: 4 })), null);
assert.equal(a.parseConsent('garbage'), null);
assert.equal(a.parseConsent(null), null);

// SDK 설정 — 트래킹 플랜 §7 의 "끈 것"이 코드에서 되살아나지 않게 고정한다.
assert.equal(a.API_KEYS.prod, '6f7bcf8fc37e9f93d442f943c23b6861');
assert.equal(a.API_KEYS.dev, 'fa98652a9c62152eaab56eb423b707ab');
assert.equal(a.SDK_CONFIG.autocapture.pageViews, false, '자동 페이지뷰는 전체 URL을 싣는다 — 끈다');
assert.equal(a.SDK_CONFIG.autocapture.pageUrlEnrichment, false, '전 이벤트에 URL 을 붙인다 — 끈다');
assert.equal(a.SDK_CONFIG.autocapture.formInteractions, false);
assert.equal(a.SDK_CONFIG.autocapture.fileDownloads, false);
assert.equal(a.SDK_CONFIG.autocapture.elementInteractions, false);
assert.equal(a.SDK_CONFIG.autocapture.attribution, true, 'UTM·리퍼러(W2)는 SDK 가 맡는다');
assert.equal(a.SDK_CONFIG.trackingOptions.ipAddress, false, '처리방침 수집 항목에 IP 가 없다');
assert.equal(a.SDK_CONFIG.remoteConfig.fetchRemoteConfig, false, '대시보드 원격 설정이 autocapture 를 되살리지 못하게');
assert.match(a.SDK_URL, /^https:\/\/cdn\.amplitude\.com\/libs\/analytics-browser-2\.\d+\.\d+-min\.js\.gz$/);

// 세션 리플레이(HP-457) — 랜딩에서만, 운영은 시행일부터, 입력값은 가리고, 브라우저 저장소에 남기지 않는다.
const BEFORE = Date.parse('2026-09-30T23:59:59+09:00');
const AFTER = Date.parse('2026-10-01T00:00:00+09:00');
assert.equal(a.REPLAY_FROM, AFTER, '시행일 — 바꾸면 privacy.html 의 시행일도 같이(아래에서 대조한다)');
assert.equal(a.replayOn('replix.tv', '/', BEFORE), false, '시행일(2026-10-01 공고와 같은 날) 전에는 켜지 않는다');
assert.equal(a.replayOn('replix.tv', '/', AFTER), true);
assert.equal(a.replayOn('replix.tv', '/index.html', AFTER), true);
assert.equal(a.replayOn('replix.tv', '/catalog/', AFTER), true, '작품 탐색도 녹화(2026-10-01 고경우) — 입력·남의 글·닉네임·계정 이름은 가린다(아래 마스킹 검사)');
assert.equal(a.replayOn('localhost', '/', 0), true, '로컬은 검증할 수 있게 항상 켠다(dev 프로젝트)');
assert.equal(a.replayOn('localhost', '/catalog/', 0), true);
assert.equal(a.consentVersion('replix.tv', BEFORE), 1);
assert.equal(a.consentVersion('replix.tv', AFTER), 4, '시행일부터 새 문구로 다시 묻는다(리플레이·GA·작품 탐색 녹화 같은 날)');
assert.match(a.bannerDetail(2), /화면 조작 기록/, '동의 세부가 녹화를 밝힌다');
assert.match(a.bannerDetail(2), /첫 화면/, '배너는 두 표면이 같이 쓴다 — 범위를 적는다');
assert.doesNotMatch(a.bannerDetail(1), /화면 조작/, '시행 전 문구에는 아직 없는 수집을 적지 않는다');
assert.match(a.bannerText(2), /스크롤·클릭/, '동의 요약도 녹화를 밝힌다 — 허용은 동의라 무엇에 동의하는지 요약에서 보여야 한다(HP-585)');
assert.doesNotMatch(a.bannerText(1), /스크롤·클릭/, '시행 전 요약에는 아직 없는 수집을 적지 않는다');
assert.match(a.SR_URL, /^https:\/\/cdn\.amplitude\.com\/libs\/plugin-session-replay-browser-1\.\d+\.\d+-min\.js\.gz$/);
assert.equal(a.SR_CONFIG.sampleRate, 1);
assert.equal(a.SR_CONFIG.storeType, 'memory', '미전송 녹화 조각을 IndexedDB 에 남기지 않는다(철회 즉시 소멸)');
assert.equal(a.SR_CONFIG.privacyConfig.defaultMaskLevel, 'medium', '입력값은 전부 가린다');

// Google Analytics(HP-465) — Amplitude 와 같은 동의 뒤에서만, 운영은 처리방침 시행일부터, 두 표면 모두.
const GA_BEFORE = Date.parse('2026-09-30T23:59:59+09:00');
const GA_AFTER = Date.parse('2026-10-01T00:00:00+09:00');
assert.equal(a.GA_ID, 'G-MVDJ0Z60LJ');
assert.equal(a.GA_FROM, GA_AFTER, 'GA 시행일 — 바꾸면 privacy.html 의 시행일도 같이(아래에서 대조한다)');
assert.ok(a.GA_FROM >= a.REPLAY_FROM, '리플레이·GA·옵트아웃은 2026-10-01 공고와 동시에 시행(고경우 결정)');
assert.equal(a.gaOn('replix.tv', GA_BEFORE), false, '시행일(공고와 같은 날) 전에는 켜지 않는다');
assert.equal(a.gaOn('replix.tv', GA_AFTER), true);
assert.equal(a.gaOn('localhost', 0), true, '로컬은 검증할 수 있게 항상 켠다(내부 트래픽으로 표시)');
assert.equal(a.consentVersion('replix.tv', GA_BEFORE), 1, '시행 전에는 처음 문구(1)');
assert.equal(a.consentVersion('replix.tv', GA_AFTER), 4, 'GA·작품 탐색 녹화를 밝힌 문구로 다시 묻는다');
assert.equal(a.consentVersion('localhost', 0), 4);
assert.match(a.bannerDetail(4), /Google Analytics/);
assert.match(a.bannerDetail(4), /작품 탐색/, '4 는 녹화 범위(작품 탐색)를 밝힌다');
assert.doesNotMatch(a.bannerDetail(3), /작품 탐색/, '3 은 랜딩 녹화만');
assert.match(a.noticeDetail(false), /허용하면 첫 화면과 작품 탐색/, '리플레이 옵트아웃 시행 전 안내는 녹화를 첫 화면으로 한정하지 않고, 허용해야만 한다고 밝힌다');
assert.doesNotMatch(a.noticeText(false), /첫 화면/, '시행 전 요약은 첫 화면 녹화를 기본으로 말하지 않는다');
assert.match(a.bannerDetail(3), /Google Analytics/, '동의 세부가 받는 곳(Google)을 밝힌다');
assert.match(a.bannerDetail(3), /화면 조작 기록/, '3 은 2 의 범위를 그대로 포함한다');
assert.doesNotMatch(a.bannerDetail(2), /Google/, '시행 전 문구에는 아직 없는 수신자를 적지 않는다');
// 자동 수집을 끄고 우리가 정리한 값만 싣는다 — gtag 기본값은 전체 URL·문서 제목·전체 리퍼러를 보낸다(§2).
assert.equal(a.GA_CONFIG.send_page_view, false, '자동 page_view 는 전체 URL(작품 번호 해시)을 싣는다 — 끈다');
assert.equal(a.GA_CONFIG.allow_google_signals, false, 'Google 신호(광고 계정과 기기 연결) 끈다');
assert.equal(a.GA_CONFIG.allow_ad_personalization_signals, false, '광고 개인화에 쓰지 않는다');
assert.deepEqual(a.gaPage('https://replix.tv', '/catalog/', '#/title/123/ep/4', ''), {
  page_location: 'https://replix.tv/catalog/#/title', page_title: 'Replix 작품 탐색',
}, '작품·회차 번호를 뺀 경로, 제목은 표면 이름으로 고정(문서 제목에 작품명이 들어가도 새지 않게)');
assert.deepEqual(a.gaPage('https://replix.tv', '/index.html', '#faq', ''), {
  page_location: 'https://replix.tv/', page_title: 'Replix 랜딩',
});
assert.equal(a.gaPage('https://replix.tv', '/', '', 'https://www.google.com/search?q=replix').page_referrer,
  'https://www.google.com', '외부 리퍼러는 출처만 — 검색어·쿼리를 싣지 않는다');
assert.equal(a.gaPage('https://replix.tv', '/', '', 'https://replix.tv/catalog/#/title/123').page_referrer,
  'https://replix.tv/catalog/#/title', '같은 출처 리퍼러도 정리된 경로로');
assert.equal(a.gaPage('https://replix.tv', '/', '', 'https://replix.tv/invite?w=1&t=SECRET').page_referrer,
  'https://replix.tv/invite', '초대 토큰이 리퍼러로 새지 않는다');
assert.equal(a.gaPage('https://replix.tv', '/', '', 'not a url').page_referrer, undefined);

// 옵트아웃(HP-466) — 한국 시간대 방문자는 미선택 상태에서도 이벤트를 수집하고 거부할 수 있다.
// 개인정보위 2024-01-31 정책 방안: 특정 개인을 식별하지 않는 행태정보는 동의 없이 처리 가능(투명성·거부권 조건).
// 해외(EU GDPR·캘리포니아 CIPA)와 세션 리플레이는 동의를 유지한다.
assert.equal(a.OPTOUT_FROM, GA_AFTER, '처리방침 개정 시행일 — GA 와 같은 날(2026-10-01, 공고와 동시)');
assert.doesNotMatch(read('docs/privacy.html'), /최소 7일 전/, '11항의 7일 전 공지 약속은 2026-10-01 개정으로 고쳤다 — 되살리면 같은 날 시행이 방침 위반이 된다');
assert.equal(a.optOutOn('replix.tv', GA_BEFORE, 'Asia/Seoul', '/'), false, '시행일 전에는 지금처럼 옵트인');
assert.equal(a.optOutOn('replix.tv', GA_AFTER, 'Asia/Seoul', '/'), true);
assert.equal(a.optOutOn('replix.tv', GA_AFTER, 'Asia/Seoul', '/index.html'), true);
assert.equal(a.optOutOn('replix.tv', GA_AFTER, 'Asia/Seoul', '/catalog/'), true,
  '작품 탐색도 옵트아웃(2026-10-01 고경우) — 회원 식별값을 싣지 않으니 식별하지 않는다는 조건은 그대로');
assert.equal(a.optOutOn('replix.tv', GA_AFTER, 'America/Los_Angeles', '/'), false, '캘리포니아 — CIPA 소송 위험, 옵트인 유지');
assert.equal(a.optOutOn('replix.tv', GA_AFTER, 'Europe/Berlin', '/'), false, 'EU — 분석 쿠키 동의 필요, 옵트인 유지');
assert.equal(a.optOutOn('replix.tv', GA_AFTER, '', '/'), false, '시간대를 모르면 보수적으로 옵트인');
assert.equal(a.optOutOn('localhost', 0, 'Asia/Seoul', '/'), true, '로컬은 날짜와 무관하게 검증 가능');
assert.equal(a.optOutOn('localhost', 0, 'UTC', '/'), false);
assert.equal(a.collectingFor('granted', false), true);
assert.equal(a.collectingFor(null, false), false, '옵트인 지역 미선택 = 수집 안 함');
assert.equal(a.collectingFor(null, true), true, '옵트아웃 지역 미선택 = 수집');
assert.equal(a.collectingFor('denied', true), false, '거부하면 어디서든 수집 안 함');
assert.match(a.noticeDetail(false), /거부하면 바로 멈추고/, '안내 세부가 거부의 효과를 밝힌다(사후 통제권) — 거부 버튼이 늘 보이는 것은 아래 소스 규칙이 고정');
assert.match(a.noticeDetail(false), /Amplitude와 Google Analytics\(모두 미국\)/, '받는 곳·국가를 세부에 밝힌다(투명성)');
assert.match(a.noticeText(false), /허용하면[^.]*스크롤·클릭/, '랜딩 리플레이 옵트아웃 시행 전: 리플레이는 허용해야만 — 요약이 그걸 밝힌다');

// 랜딩 세션 리플레이 옵트아웃(HP-457 확대, 2026-10-10 고경우) — 한국 시간대 랜딩은 미선택이어도 녹화. 근거는 국내 관행 실측
// (29CM·당근·무신사·티빙·인프런·클래스101 이 첫 화면에서 동의 없이 녹화) + 랜딩은 로그인·남의 글이 없어 비식별에 가깝다.
// 작품 탐색(남의 평가·채팅·계정 이름)과 해외(CIPA·GDPR)는 [허용] 유지, 거부는 어디서든 끈다.
const RO_BEFORE = Date.parse('2026-10-09T23:59:59+09:00');
const RO_AFTER = Date.parse('2026-10-10T00:00:00+09:00');
assert.equal(a.REPLAY_OPTOUT_FROM, RO_AFTER, '시행일 — 바꾸면 privacy.html 의 시행일도 같이(아래에서 대조한다)');
assert.ok(a.REPLAY_OPTOUT_FROM > a.OPTOUT_FROM, '이벤트 옵트아웃(10-01) 뒤에 리플레이 옵트아웃(10-10)이 따로 시행됐다');
assert.equal(a.replayOptOutOn('replix.tv', RO_BEFORE), false, '시행일 전 운영은 허용 뒤에만');
assert.equal(a.replayOptOutOn('replix.tv', RO_AFTER), true);
assert.equal(a.replayOptOutOn('localhost', 0), true, '로컬은 검증할 수 있게 항상');
assert.equal(a.replayFor('granted', false, 'web_catalog', false), true, '허용하면 어디서나');
assert.equal(a.replayFor('denied', true, 'web_landing', true), false, '거부하면 어디서도 아니다');
assert.equal(a.replayFor(null, true, 'web_landing', true), true, '한국 시간대 랜딩 미선택 = 녹화(옵트아웃)');
assert.equal(a.replayFor(null, true, 'web_catalog', true), false, '작품 탐색 미선택 = 녹화 안 함(남의 글이 뜨는 화면)');
assert.equal(a.replayFor(null, false, 'web_landing', true), false, '해외(옵트인 지역) 미선택 = 녹화 안 함');
assert.equal(a.replayFor(null, true, 'web_landing', false), false, '시행 전에는 미선택 녹화 없음');
assert.match(a.noticeText(true), /첫 화면의 스크롤·클릭 기록/, '시행 뒤 요약은 첫 화면 녹화가 미선택에서도 된다고 밝힌다(투명성)');
assert.match(a.noticeText(true), /허용하면 작품 탐색에서도 기록/, '작품 탐색 녹화는 여전히 허용해야만 — 허용이 더하는 것을 요약에서 밝힌다');
assert.match(a.noticeDetail(true), /첫 화면의 스크롤·클릭 기록은 Amplitude/, '세부가 녹화를 받는 곳을 밝힌다');
assert.match(a.noticeDetail(true), /거부하면 바로 멈추고/, '거부의 효과(사후 통제권)');
assert.match(a.noticeDetail(true), /다른 이용자의 글·닉네임은 기록하지 않/, '가림을 밝힌다');

// 배너 두 층(HP-585, 2026-10-12 조현빈 — 2026-10-02 HP-478 '문구를 줄이거나 접지 않는다'를 대체). 요약은 짧게 두어 첫 화면을
// 덮지 않게 하고, 무엇(스크롤·클릭)과 어디로(미국)는 요약에 남긴다 — 수집 단계 고지가 예측 가능성을 뒷받침한다(개인정보위
// 통합 안내서 2025.7. p.129). 받는 곳 이름·가리는 것·거부의 효과는 [자세히]로 펼치는 세부에 둔다(작성지침 2026.4. p.93).
for (const s of [a.noticeText(true), a.noticeText(false), a.bannerText(1), a.bannerText(2), a.bannerText(3), a.bannerText(4)]) {
  assert.ok(s.length <= 70, `요약은 70자 이하 — 길어지면 배너가 다시 첫 화면을 덮는다(${s.length}자: ${s})`);
  assert.match(s, /미국/, '요약에 어디로(미국)를 남긴다');
}
for (const d of [a.noticeDetail(true), a.noticeDetail(false), a.bannerDetail(4)]) {
  assert.match(d, /Amplitude와 Google Analytics\(모두 미국\)/, '세부가 받는 곳 이름과 국가를 밝힌다');
}

// 소스 규칙
const src = read('docs/js/analytics.js');
const index = read('docs/index.html');
assert.doesNotMatch(index, /cdn\.amplitude\.com/, 'SDK 는 동의 뒤 스크립트로만 로드한다(정적 태그 금지)');
assert.doesNotMatch(read('docs/invite/index.html'), /analytics\.js|amplitude/i, '/invite 는 계측하지 않는다(쿼리에 토큰)');
assert.match(src, /_banner\.style\.display = 'none'/, '[hidden] 은 display:flex 에 진다(notes/docs.md) — style 로 끈다');
assert.doesNotMatch(src, /\.hidden = true/, '배너를 [hidden] 으로 숨기면 display:flex 가 이긴다');
assert.match(src, /a\.setOptOut\(false\); a\.reset\(\);/, '같은 페이지에서 거부→허용이면 optOut 해제 + 새 device_id (검증에서 잡힌 버그)');
assert.match(src, /a\.setOptOut\(true\)/, '거부·철회 시 SDK optOut');
assert.doesNotMatch(index, /plugin-session-replay/, '리플레이 플러그인도 동의 뒤 스크립트로만 로드한다(정적 태그 금지)');
assert.doesNotMatch(read('docs/catalog/index.html'), /plugin-session-replay/, '카탈로그 산출물에 정적 리플레이 태그 금지(동의 뒤 analytics.js 가 붙인다)');
// 작품 탐색 녹화의 가림(HP-457 확대) — 남의 글·닉네임·프로필 사진·계정 이름은 녹화에 찍히면 안 된다. 입력값은 medium 이 가린다.
const cmt = read('catalog/app/src/components/Comments.tsx');
assert.match(cmt, /<li className="amp-mask /, '평가 한 건(닉네임·본문·날짜)을 통째로 글자 가림');
assert.match(cmt, /<img src=\{c\.profileImageUrl\} alt="" className="amp-block /, '평가 작성자 프로필 사진은 블록');
assert.match(read('catalog/app/src/pages/Title.tsx'), /<ol className="amp-mask /, '순간 화면의 채팅 목록(남의 채팅·닉네임) 글자 가림');
assert.match(read('catalog/app/src/components/Chrome.tsx'), /<div ref=\{box\} className="amp-mask /, '로그인 계정 이름(닉네임) 메뉴 글자 가림');
const me = read('catalog/app/src/pages/Me.tsx');
assert.match(me, /<ol className="amp-mask /, '내 활동(#/me)의 채팅 목록 — 답글 원문(남의 글·닉네임)이 섞이므로 통째로 글자 가림(HP-443)');
assert.match(me, /<div className="amp-mask /, '내 활동의 내 평가 한 건 — 작품 페이지의 평가와 같은 가림');
assert.equal(a.SR_CONFIG.privacyConfig.defaultMaskLevel, 'medium', '검색창·평가 입력란·피드백 입력란은 medium 이 가린다');
assert.match(src, /if \(!replaying\(\)\) \{ start\(\); return; \}/,
  '리플레이를 붙일 상태(허용 / 랜딩·한국 시간대 미선택·시행 뒤)가 아니면 플러그인 스크립트를 받지도 않는다 — 작품 탐색의 옵트아웃 수집 중에도 녹화는 안 함');
assert.match(src, /function attachReplay\(a\) \{\s*if \(_replay \|\| !replaying\(\)\)/, '리플레이는 replaying()(replayFor)이 허락할 때만 붙는다');
assert.match(src, /if \(_revoked\) \{ try \{ a\.setOptOut\(false\); a\.reset\(\);/,
  '옵트아웃 수집 중 허용을 눌러도 device_id 를 새로 만들지 않는다 — 새로 만드는 건 거부 뒤 재허용뿐');
assert.match(src, /function send\(fn\) \{\s*if \(!collecting\(\)\) return;/, '전송 게이트는 collecting() 하나');
assert.match(src, /r\.onerror = start;/, '플러그인이 막혀도 이벤트 계측은 간다');
assert.match(src, /function revoke\(\) \{[\s\S]{0,120}detachReplay\(a\);/, '철회하면 녹화부터 뗀다');
assert.match(src, /a\.setOptOut\(false\); a\.reset\(\);[\s\S]{0,160}loadReplay\(a\);/, '재허용하면 새 식별자로 다시 붙인다');
assert.match(src, /indexedDB\.deleteDatabase\(d\.name\)/, '철회 시 SDK 가 만든 IndexedDB 도 지운다');
// 처리방침과 코드의 시행일이 갈라지면 방침이 거짓말이 된다 — 한쪽만 고치면 여기서 깨진다.
const privacy = read('docs/privacy.html');
const effective = new Date(a.REPLAY_FROM + 9 * 3600 * 1000).toISOString().slice(0, 10);
assert.ok(privacy.includes('시행일 ' + effective), `privacy.html 시행일이 ${effective} 여야 한다`);
assert.match(privacy, /화면 조작 기록/, '처리방침이 리플레이 수집을 밝힌다');
assert.match(privacy, /30일/, '리플레이 보유 기간');
const gaEffective = new Date(a.GA_FROM + 9 * 3600 * 1000).toISOString().slice(0, 10);
assert.ok(privacy.includes('시행일 ' + gaEffective), `privacy.html 에 GA 시행일 ${gaEffective} 가 있어야 한다`);
assert.match(privacy, /Google Analytics/, '처리방침이 GA 수신을 밝힌다(위탁·국외 이전)');
assert.match(privacy, /_ga/, '처리방침이 GA 쿠키를 밝힌다(자동 수집 장치)');
assert.match(privacy, /14개월/, 'GA 보유 기간 — GA 관리의 데이터 보관 설정과 같아야 한다');
assert.match(privacy, /한국 시간대/, '처리방침이 옵트아웃 범위(한국 시간대 접속)를 밝힌다(HP-466)');
assert.match(privacy, /작품 탐색의 로그인\s+정보와도 결합하지 않습니다/, '작품 탐색까지 옵트아웃 — 로그인과 결합하지 않는다는 조건을 밝힌다');
assert.match(src, /function track\(name, props\) \{\s*send\(function \(a\) \{ a\.track\(name, Object\.assign\(commonProps\(\), props \|\| \{\}\)\); \}\);/,
  '웹 이벤트에 회원 식별값을 붙이지 않는다(setUserId 금지) — 붙이는 순간 옵트아웃 근거가 무너진다');
assert.doesNotMatch(src, /setUserId|identify\(/, '웹 계측은 사람을 식별하지 않는다(옵트아웃의 전제)');
assert.match(privacy, /화면 조작 기록은 첫 화면에 한국 시간대에서 접속한 경우 별도\s+동의 없이\(거부하지 않은 경우\) 이루어지며/,
  '6항 — 랜딩·한국 시간대 리플레이 옵트아웃(2026-10-10)을 밝힌다');
assert.match(privacy, /작품 탐색과 그 밖의 지역에서는 명시적으로 동의한\s+경우에만 이루어집니다/, '6항 — 작품 탐색·해외 리플레이는 동의 유지');
assert.match(privacy, /첫 화면에 한국 시간대에서 접속한 경우\(거부하지 않은 경우\), 그리고\s+첫 화면·작품 탐색에서 화면 조작 기록을 허용한 경우/,
  '1항 — 수집 항목이 랜딩 옵트아웃 녹화를 밝힌다');
const roEffective = new Date(a.REPLAY_OPTOUT_FROM + 9 * 3600 * 1000).toISOString().slice(0, 10);
assert.ok(privacy.includes('시행일 ' + roEffective), `privacy.html 에 랜딩 리플레이 옵트아웃 시행일 ${roEffective} 가 있어야 한다`);
assert.doesNotMatch(src, /_consent !== 'granted' \|\| !replayOn/, '리플레이 게이트는 replaying()(replayFor) 하나로 — 허용 전용 게이트가 되살아나면 옵트아웃이 조용히 죽는다');
assert.match(src, /function replaying\(\) \{[\s\S]*?replayFor\(_consent, optOutNow\(\), surfaceOf\(location\.pathname\), replayOptOutNow\(\)\)/,
  '런타임 게이트가 순수 함수 replayFor 를 쓴다(위 표가 곧 동작)');
assert.match(src, /noticeText\(replayOptOutNow\(\)\)/, '배너 안내 문구가 시행 여부를 따른다');
// 두 층 배너의 마크업(HP-585) — 세부는 처음엔 접혀 있고, 처리방침 링크는 세부 끝에, 거부 버튼은 접힌 상태에서도 늘 보인다.
assert.match(src, /class="rx-more" aria-expanded="false" aria-controls="rx-consent-detail">자세히</, '[자세히]는 펼침 상태를 보조 기술에 알린다');
assert.match(src, /<p class="rx-consent-detail" id="rx-consent-detail" hidden>/, '세부는 처음엔 접혀 있다');
assert.match(src, /noticeDetail\(replayOptOutNow\(\)\) : bannerDetail\(nowVersion\(\)\)\) \+ ' <a href="\/privacy">개인정보처리방침<\/a>/,
  '세부가 시행 여부·동의 버전을 따르고, 끝에 처리방침 링크가 있다');
assert.match(src, /<div class="rx-consent-actions"><button type="button" class="rx-deny">거부<\/button>/, '거부 버튼은 요약 옆에 늘 보인다(사후 통제권)');
const bannerCss = /var BANNER_CSS = ([\s\S]*?);\n/.exec(src)[1];
assert.match(bannerCss, /\.rx-deny\{background:rgba\(255,255,255,\.14\)/, '거부도 허용처럼 채운 버튼 — 테두리만 남겨 덜 보이게 하지 않는다(눈속임 설계 유형⑨)');
assert.doesNotMatch(bannerCss, /\.rx-consent-detail\{[^}]*display/, '세부에 display 를 선언하면 [hidden] 이 져서 늘 펼쳐진다');
assert.match(privacy, /다른 이용자가 쓴 평가·채팅과\s+닉네임/, '처리방침이 작품 탐색 녹화에서 가리는 것을 밝힌다');
// 옛 문구는 '확장 프로그램'이라 불렀다(2026-10-04부터 '익스텐션') — 어느 표기로 되살아나도 잡는다.
assert.doesNotMatch(privacy, /작품 탐색 화면과 (?:확장\s+프로그램|익스텐션)에서는 기록하지 않습니다/, '작품 탐색도 녹화한다 — 옛 문구가 남으면 방침이 거짓말');
assert.match(privacy, /익스텐션의 이용 분석[^.]*명시적으로 동의한 경우에만/, '익스텐션은 동의 유지(웹스토어 정책·회원 식별값 결합)');
// GA 도 동의 뒤 동적 로드만, 철회하면 전송을 막고 쿠키를 지운다.
assert.doesNotMatch(index, /googletagmanager|gtag\(/, 'GA 도 동의 뒤 스크립트로만 로드한다(정적 태그 금지)');
assert.doesNotMatch(read('docs/catalog/index.html'), /googletagmanager/, '카탈로그 산출물에도 정적 GA 태그 금지');
assert.match(src, /function revoke\(\) \{[\s\S]*?\['ga-disable-' \+ GA_ID\] = true/, '철회 시 GA 전송 차단');
assert.match(src, /\^_ga/, '철회 시 _ga* 쿠키 삭제');
assert.match(src, /_gaBlocked = true/, '같은 페이지 재허용에 옛 client id 가 이어지지 않게 — 다음 로드부터 새로');
assert.match(src, /typeof window !== 'undefined' && typeof document !== 'undefined'\) boot\(\)/, 'node import 가 부트하면 안 된다');
assert.match(read('docs/js/main.js'), /import \{ page \} from '\.\/analytics\.js'/);
assert.match(read('docs/js/main.js'), /^page\(\);/m, '랜딩 page_viewed 는 main.js 가 1회 부른다');
for (const loc of ['data-cta="nav"', 'data-cta="hero"', 'data-cta="close"', 'data-analytics-settings']) {
  assert.ok(index.includes(loc), `index.html 에 ${loc}`);
}
assert.equal((index.match(/data-cta="/g) || []).length, 3, '랜딩 설치 CTA 는 세 곳');

// 랜딩 링크(HP-437) — 설치 CTA 가 아닌 버튼·링크는 nav_link_clicked{target, location} 로 버튼마다 구분해 센다.
// 열거값 밖은 보내지 않는다: 마크업 오타가 새 값으로 쌓이면 차트가 조용히 갈라진다.
assert.deepEqual(a.linkProps('catalog', 'nav'), { target: 'catalog', location: 'nav' });
assert.deepEqual(a.linkProps('tmdb', 'footer'), { target: 'tmdb', location: 'footer' });
assert.equal(a.linkProps('catalog', 'hero'), null, 'location 은 nav | footer 뿐');
assert.equal(a.linkProps('https://replix.tv/catalog/', 'nav'), null, 'URL 은 값이 아니다(§2 전체 URL 금지)');
assert.equal(a.linkProps('analytics_settings', 'footer'), null, "'분석 설정'은 세지 않는다 — 동의를 철회하러 가는 클릭이다");
assert.equal(a.linkProps(null, null), null);
assert.match(src, /track\('nav_link_clicked', /, '문서 위임 클릭 핸들러가 data-link 를 처리한다');
// 같은 탭으로 나가는 링크는 1초 배치 flush 전에 페이지가 사라진다 — pagehide 에서 beacon 으로 비우지 않으면
// SDK 가 없는 /privacy·/terms 로 간 클릭이 다음 방문까지 밀린다(2026-09-21 실측).
assert.match(src, /addEventListener\('pagehide'[\s\S]{0,200}a\.setTransport\('beacon'\); a\.flush\(\);/, '떠날 때 beacon flush');
assert.match(src, /addEventListener\('pageshow'[\s\S]{0,200}ev\.persisted[\s\S]{0,80}a\.setTransport\('fetch'\)/, 'bfcache 복귀 시 fetch 로 되돌린다(beacon 은 재시도가 없다)');

// 랜딩의 모든 <a> 는 계측 속성 셋(data-cta | data-link | data-analytics-settings) 중 **정확히 하나**를 가진다 —
// 새 버튼을 붙이고 계측을 잊으면 여기서 깨진다. (location, target) 쌍이 겹치면 두 버튼을 구분할 수 없다.
const anchors = index.match(/<a\s[^>]*>/g) || [];
const linkPairs = [];
for (const tag of anchors) {
  const kinds = [/\sdata-cta="/, /\sdata-link="/, /\sdata-analytics-settings/].filter((re) => re.test(tag)).length;
  assert.equal(kinds, 1, `계측 속성이 정확히 하나여야 한다: ${tag}`);
  const m = /\sdata-link="([^"]+)"/.exec(tag);
  if (!m) continue;
  const loc = (/\sdata-link-loc="([^"]+)"/.exec(tag) || [])[1];
  assert.ok(a.linkProps(m[1], loc), `열거값 밖의 data-link / data-link-loc: ${tag}`);
  linkPairs.push(`${loc}:${m[1]}`);
}
assert.equal(new Set(linkPairs).size, linkPairs.length, '같은 (location, target) 이 두 번 나오면 버튼을 구분할 수 없다');
assert.deepEqual(linkPairs.slice().sort(), [
  'nav:top', 'nav:scenes', 'nav:rooms', 'nav:faq', 'nav:catalog',
  'footer:top', 'footer:contact_email', 'footer:scenes', 'footer:catalog', 'footer:faq',
  'footer:privacy', 'footer:terms', 'footer:tmdb',
  'discord:discord_install', 'discord:discord',
].sort(), '랜딩 링크 15곳 — 바꾸면 tracking-plan.md §6 의 표도 같이');
assert.match(read('docs/js/faq.js'), /track\('faq_opened', \{ question_index:/);
assert.match(read('docs/js/hero.js'), /track\('demo_interacted', \{ demo: 'hero_toggle', action: 'scroll_complete' \}\)/);
assert.doesNotMatch(read('docs/js/hero.js'), /addEventListener\("click"/, '제품 화면 전환은 클릭이 아니라 스크롤이다(HP-467)');
assert.doesNotMatch(index, /<button[^>]*id="heroToggle"/, '토글 알약은 누르는 버튼이 아니라 진행 표시다(HP-467)');
assert.ok(index.indexOf('id="intro"') < index.indexOf('id="rooms"') && index.indexOf('id="rooms"') < index.indexOf('id="scenes"')
  && index.indexOf('id="works"') < index.indexOf('id="how"') && index.indexOf('id="how"') < index.indexOf('id="faq"'),
  '섹션 순서: 제품 화면 → 함께 보기 → 인기 장면 … 작품 → 설명 카드 → 설치 → FAQ (HP-467, 2026-09-12 멘토링)');
assert.match(read('docs/js/reveal.js'), /track\('section_viewed', \{ section: e\.target\.id \}\)/);
assert.match(read('docs/js/reveal.js'), /rootMargin: '0px 0px -40% 0px'/, '뷰포트보다 큰 섹션도 발화하게 threshold 0 + rootMargin');

// ═══ HP-615 계측 정확도 (2026-10-13 광고 성과 분석) ═══════════════════════════════
// ① GA page_location 은 광고 캠페인 쿼리(UTM)만 남긴다. GA 는 세션 첫 page_view 의 주소에서 캠페인을 읽는데, 쿼리를 통째로 지우던
//    때는 유료 광고 세션(약 3,130)이 리퍼러만 보고 'Organic Social'(instagram.com·m.facebook.com)로 잡혔다.
//    광고 클릭 식별값(gclid·gbraid·wbraid·fbclid)은 처리방침의 GA 수집 항목('방문한 페이지') 밖이라 남기지 않는다.
const AD = '?utm_source=meta&utm_medium=paid_social&utm_campaign=test&utm_content=a&gclid=TEST&foo=bar';
const AD_KEPT = '?utm_source=meta&utm_medium=paid_social&utm_campaign=test&utm_content=a';
assert.deepEqual(a.GA_CAMPAIGN_PARAMS, ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'],
  'UTM 다섯만 — 늘리면 처리방침의 GA 수집 항목과 트래킹 플랜 §10 도');
assert.equal(a.campaignQuery(AD), AD_KEPT, '캠페인 값은 남기고 그 밖(광고 클릭 식별값 gclid, foo)은 지운다');
assert.equal(a.gaPage('https://replix.tv', '/', '', '', AD).page_location, 'https://replix.tv/' + AD_KEPT);
assert.equal(a.gaPage('https://replix.tv', '/catalog/', '#/title/123/ep/4', '', '?utm_source=youtube&gbraid=G1&wbraid=W1&utm_term=k').page_location,
  'https://replix.tv/catalog/?utm_source=youtube&utm_term=k#/title', '쿼리는 해시 앞에 붙고, 광고 클릭 식별값·작품·회차 번호는 빠진다');
assert.equal(a.gaPage('https://replix.tv', '/', '', '').page_location, 'https://replix.tv/', '쿼리를 주지 않으면 종전과 같다');
assert.equal(a.campaignQuery('?w=81234567&t=SECRET&p=netflix'), '', '초대 토큰·회차 번호는 남지 않는다');
assert.equal(a.campaignQuery('?state=s&session_state=x&code=c&iss=https%3A%2F%2Fauth.replix.tv'), '', '로그인 왕복 값은 남지 않는다');
assert.equal(a.campaignQuery('?replix_internal=1&replix_analytics_debug=1'), '', '팀·디버그 표시 쿼리는 남지 않는다');
assert.equal(a.campaignQuery('?utm_source=a&utm_source=b&utm_medium='), '?utm_source=a', '같은 키는 첫 값만, 빈 값은 뺀다');
assert.equal(a.campaignQuery('?utm_campaign=fall%20sale&fbclid=F&gclid=G'), '?utm_campaign=fall%20sale', '광고 클릭 식별값은 목록 밖 — 값은 원래 글자 그대로(%20 이 + 로 바뀌지 않게)');
assert.equal(a.campaignQuery('?utm_campaign=%EA%B0%80%EC%9D%84+%ED%8A%B9%EA%B0%80&utm_source'), '?utm_campaign=%EA%B0%80%EC%9D%84+%ED%8A%B9%EA%B0%80', '한글·+ 도 그대로, 값 없는 키는 뺀다');
assert.equal(a.campaignQuery('?xutm_source=a&utm_source2=b'), '', '키는 정확히 같아야 한다');
assert.equal(a.campaignQuery(''), '');
assert.equal(a.campaignQuery(undefined), '');
assert.match(src, /gaPage\(location\.origin, location\.pathname, location\.hash, document\.referrer, location\.search\)/,
  '로드 때 config 의 page_location 에 캠페인 쿼리 — 세션 첫 hit 부터 실린다');
assert.match(src, /gaPage\(location\.origin, location\.pathname, location\.hash, '', location\.search\)/, 'page_view 마다 같은 주소');

// ② GA 는 이벤트 파라미터 source·medium·campaign·term·content 를 세션 유입 경로로 해석한다 — catalog_engaged{source: 'nav'} 가
//    세션 소스 'nav' 로 잡혔다(실측 22세션). GA 로 보낼 때만 이름을 바꾸고, Amplitude 는 기존 차트를 깨지 않게 그대로 둔다.
assert.deepEqual(a.gaParams({ feature: 'notice', action: 'opened', source: 'nav' }), { feature: 'notice', action: 'opened', click_source: 'nav' });
assert.deepEqual(a.gaParams({ medium: 'x', campaign: 'y', term: 'z', content: 'w', kind: 'NOTICE' }), { kind: 'NOTICE' },
  'GA 쪽 이름을 정하지 않은 예약어는 GA 에 싣지 않는다 — 새 이벤트가 실수로 써도 세션이 끊기지 않게');
assert.deepEqual(a.gaParams(undefined), {});
assert.match(src, /var p = Object\.assign\(\{ surface: surfaceOf\(location\.pathname\) \}, gaParams\(props\)\);/, 'GA 로 가는 속성은 gaParams 를 거친다');
assert.match(read('catalog/app/src/components/Chrome.tsx'), /engaged\('notice', 'opened', \{ source: 'nav' \}\)/, 'Amplitude 쪽 이름(source)은 그대로');

// ③ 수집 범위 — 옵트아웃·리플레이·배너는 처리방침이 밝힌 두 표면(첫 화면·작품 탐색)에서만. 그 밖(/discord/)은 허용한 방문자의 클릭만.
for (const p of ['/', '/index.html', '/catalog/', '/catalog', '']) assert.equal(a.fullSurface(p), true, `${p}: 처리방침이 밝힌 표면`);
for (const p of ['/discord/', '/discord/index.html', '/invite/', '/together/', '/bye/', '/privacy', '/terms.html']) {
  assert.equal(a.fullSurface(p), false, `${p}: 미선택 수집 범위 밖`);
}
assert.equal(a.optOutOn('replix.tv', GA_AFTER, 'Asia/Seoul', '/discord/'), false, '/discord/ 는 한국 시간대여도 옵트아웃이 아니다 — 허용한 방문자만');
assert.equal(a.replayOn('replix.tv', '/discord/', AFTER), false, '/discord/ 는 녹화 범위 밖 — 허용해도 찍지 않는다');
assert.equal(a.replayOn('localhost', '/discord/', 0), false);
assert.match(src, /var full = fullSurface\(location\.pathname\);\s*if \(full && collecting\(\)\) \{ loadSdk\(\); ensureGa\(\); \}[^\n]*\n\s*if \(full && _consent === null\) showBanner\(\);/,
  '그 밖의 페이지는 로드 때 SDK·GA·배너가 없다');
assert.match(src, /function optOutNow\(\) \{ return optOutOn\(location\.hostname, Date\.now\(\), timeZone\(\), location\.pathname\); \}/, '옵트아웃 판정에 경로를 넘긴다');
assert.match(src, /export function track\(name, props\) \{[\s\S]{0,200}ensureGa\(\);[\s\S]{0,260}gaTrack\(name, props\);/,
  '그 밖의 페이지는 허용한 방문자의 첫 클릭에서 GA 를 붙인다(첫 화면·작품 탐색은 no-op)');

const discordPage = read('docs/discord/index.html');
assert.match(discordPage, /<a class="btn btn--ghost btn--sm" href="https:\/\/chromewebstore\.google\.com\/[^"]*" target="_blank" rel="noopener" data-cta="discord">/,
  '/discord/ 위 띠의 설치 버튼 = install_cta_clicked{location: discord}');
assert.match(discordPage, /<script type="module" src="\/js\/analytics\.js"><\/script>/, '/discord/ 는 analytics.js 로 센다(허용한 방문자만)');
assert.doesNotMatch(discordPage, /data-analytics-settings|googletagmanager|cdn\.amplitude/, '/discord/ 에 배너 입구·정적 태그를 두지 않는다');
assert.doesNotMatch(read('docs/together/index.html'), /analytics\.js|amplitude|gtag/i, '/together 도 계측하지 않는다(연결 토큰, README 계약)');

// ③ 웹 스토어 링크 — 전부 utm_source=replix.tv 와 위치(utm_medium)를 단다. 값은 그 버튼의 install_cta_clicked location 과 같은 낱말.
const STORE_BASE = 'https://chromewebstore.google.com/detail/replix/lgfllmbombkdbebcepigebnbmeaacikp';
const storeHrefs = (html) => [...html.matchAll(/href="(https:\/\/chromewebstore\.google\.com\/[^"]*)"/g)].map((m) => m[1].replace(/&amp;/g, '&'));
const htmlFiles = (dir) => readdirSync(resolve(root, dir), { withFileTypes: true }).flatMap((d) =>
  d.isDirectory() ? htmlFiles(`${dir}/${d.name}`) : d.name.endsWith('.html') ? [`${dir}/${d.name}`] : []);
const EXPECTED_MEDIUMS = {
  'docs/index.html': ['nav', 'hero', 'close'],
  'docs/invite/index.html': ['invite'],
  'docs/together/index.html': ['together'],
  'docs/discord/index.html': ['discord'],
  'docs/bye/index.html': ['bye'],
};
for (const file of htmlFiles('docs').filter((f) => f !== 'docs/catalog/index.html')) {
  const hrefs = storeHrefs(read(file));
  assert.deepEqual(hrefs.map((h) => new URL(h).searchParams.get('utm_medium')), EXPECTED_MEDIUMS[file] || [],
    `${file}: 스토어 링크의 utm_medium — 새 링크를 붙이면 이 표와 트래킹 플랜 §12 를 같이`);
  for (const h of hrefs) {
    const u = new URL(h);
    assert.equal(u.origin + u.pathname, STORE_BASE, `${file}: Replix 스토어 페이지`);
    assert.equal(u.searchParams.get('utm_source'), 'replix.tv', `${file}: utm_source`);
  }
}
for (const tag of [index, discordPage].flatMap((html) => html.match(/<a\s[^>]*chromewebstore[^>]*>/g))) {
  assert.match(tag, new RegExp(`utm_medium=${/data-cta="([^"]+)"/.exec(tag)[1]}"`), `utm_medium 이 data-cta 와 같다 — ${tag}`);
}
const { storeUrl, STORE_BASE: CATALOG_STORE } = await import('../catalog/app/src/store-pure.js');
assert.equal(CATALOG_STORE, STORE_BASE);
assert.equal(storeUrl('catalog_nav'), `${STORE_BASE}?utm_source=replix.tv&utm_medium=catalog_nav`);
assert.equal(storeUrl('catalog_feedback', '/reviews'), `${STORE_BASE}/reviews?utm_source=replix.tv&utm_medium=catalog_feedback`);
// 작품 탐색 소스 전체를 훑는다 — 설치 링크가 다른 화면에 새로 생겨도 같은 검사를 받는다.
const catalogSources = readdirSync(resolve(root, 'catalog/app/src'), { recursive: true })
  .filter((f) => /\.(tsx?|jsx?)$/.test(f) && !/\.test\./.test(f))
  .map((f) => `catalog/app/src/${f}`);
const catalogStoreUses = [];
for (const f of catalogSources) {
  const s = read(f);
  // store-pure.js 는 스토어 주소의 정본이라 뺀다.
  if (!/\/store-pure\./.test(f)) assert.doesNotMatch(s, /chromewebstore\.google\.com/, `${f}: 스토어 주소는 storeUrl 로만(위치 utm 이 빠지지 않게)`);
  // 스토어 링크와 설치 문구를 단 링크는 모두 href={storeUrl(…)} 와 같은 이름의 data-cta 를 함께 단다 — 작품 화면 첫 화면 버튼이
  // '#/'(작품 탐색 홈)로 가고 data-cta 가 없어 계측·휴대폰 안내 시트를 타지 않던 결함(HP-636)이 다시 생기지 않게.
  // 속성 순서·onClick 화살표와 무관하게 <a …>…</a> 한 덩어리 안에서 본다.
  for (const [link] of s.matchAll(/<a\b(?:(?!<\/a>)[\s\S])*?<\/a>/g)) {
    const medium = /href=\{storeUrl\('(\w+)'\)\}/.exec(link);
    if (!medium && !/익스텐션 설치/.test(link)) continue;
    const cta = /data-cta="(\w+)"/.exec(link);
    assert.ok(medium && cta, `${f}: 설치 링크는 href={storeUrl(…)} 와 data-cta 를 함께 단다 — ${link.slice(0, 90)}`);
    assert.equal(medium[1], cta[1], `${f}: utm_medium 이 data-cta 와 같다`);
    catalogStoreUses.push(medium[1]);
  }
}
assert.deepEqual(catalogStoreUses.sort(), ['catalog_footer', 'catalog_nav', 'catalog_title', 'catalog_title_hero'], '작품 탐색 설치 링크 네 곳');
assert.ok(read('docs/catalog/index.html').includes('utm_source=replix.tv&utm_medium='), '작품 탐색 산출물을 다시 빌드했다(커밋된 산출물이 곧 배포물)');

// ⑤ 로컬·팀 트래픽 — 로컬은 디버그 표시 없이는 보내지 않고, 팀 브라우저는 버리지 않고 traffic_type=internal 로 표시만 한다.
for (const h of ['localhost', '127.0.0.1', '127.1.2.3', '[::1]', '::1', '0.0.0.0', '192.168.0.10', '10.0.0.5', '172.16.0.1', '172.31.255.255', 'mac.local', 'site.localhost', '']) {
  assert.equal(a.isLocalHost(h), true, `${h || '(빈 호스트 = file://)'}: 로컬`);
}
for (const h of ['replix.tv', 'www.replix.tv', '172.32.0.1', '8.8.8.8', 'example.com', 'localhost.example.com']) {
  assert.equal(a.isLocalHost(h), false, `${h}: 로컬이 아니다`);
}
assert.equal(a.sendAllowed('localhost', false), false, 'localhost 에서는 GA·Amplitude 로 보내지 않는다(GA 에 localhost 14세션이 섞였다)');
assert.equal(a.sendAllowed('127.0.0.1', false), false);
assert.equal(a.sendAllowed('localhost', true), true, '명시적 디버그 표시가 있을 때만');
assert.equal(a.sendAllowed('replix.tv', false), true);
assert.equal(a.flagParam('1'), true);
assert.equal(a.flagParam('0'), false);
assert.equal(a.flagParam(null), null, '쿼리가 없으면 저장된 표시 그대로');
assert.equal(a.flagParam('yes'), null);
// 표시 쿼리 읽기 — 켜기·끄기·그대로와, 주소창에 남길 나머지 쿼리(원래 글자 그대로). 표시 키는 값이 틀려도 주소에서 뺀다
// (표시된 주소가 공유되면 밖의 방문자까지 팀으로 표시된다).
const NO_FLAGS = { internal: null, debug: null, rest: '', found: false };
assert.deepEqual(a.readFlags('?replix_internal=1'), { internal: true, debug: null, rest: '', found: true });
assert.deepEqual(a.readFlags('?utm_campaign=fall%20sale&replix_internal=0&replix_analytics_debug=1&x=a+b'),
  { internal: false, debug: true, rest: '?utm_campaign=fall%20sale&x=a+b', found: true }, '표시만 빼고 나머지는 원래 글자 그대로(%20·+ 그대로)');
assert.deepEqual(a.readFlags('?replix_internal=yes&replix_internal=1&utm_source=a'), { internal: null, debug: null, rest: '?utm_source=a', found: true },
  '첫 값만 본다(URLSearchParams.get 과 같다) — 값이 틀려도 표시 키는 모두 주소에서 뺀다');
assert.deepEqual(a.readFlags('?replix_analytics_debug'), { internal: null, debug: null, rest: '', found: true }, '값 없는 표시 키도 뺀다');
assert.deepEqual(a.readFlags('?utm_source=a&xreplix_internal=1&replix_internal2=1'),
  { internal: null, debug: null, rest: '?utm_source=a&xreplix_internal=1&replix_internal2=1', found: false }, '키는 정확히 같아야 한다');
assert.deepEqual(a.readFlags('?state=s&code=c&iss=https%3A%2F%2Fauth.replix.tv&replix_internal=1'),
  { internal: true, debug: null, rest: '?state=s&code=c&iss=https%3A%2F%2Fauth.replix.tv', found: true }, '로그인 왕복 값은 건드리지 않는다');
assert.deepEqual(a.readFlags(''), NO_FLAGS);
assert.deepEqual(a.readFlags(undefined), NO_FLAGS);
assert.equal(a.INTERNAL_KEY, 'replix_internal');
assert.equal(a.DEBUG_KEY, 'replix_analytics_debug');
assert.equal(a.internalTraffic('replix.tv', false), false, '운영 + 표시 없음 = 실사용자');
assert.equal(a.internalTraffic('replix.tv', true), true, '팀 브라우저 표시');
assert.equal(a.internalTraffic('localhost', false), true, '운영이 아닌 곳(디버그로 보낸 로컬)은 늘 내부');
assert.match(src, /function collecting\(\) \{ return sendAllowed\(location\.hostname, _debug\) && collectingFor\(_consent, optOutNow\(\)\); \}/,
  '수집 게이트가 호스트를 본다 — SDK·GA·리플레이가 모두 이 뒤에 있다');
assert.match(src, /function loadSdk\(\) \{[\s\S]{0,200}if \(_sdk !== 'idle' \|\| !collecting\(\)\) return;/,
  '허용 버튼이 바로 부르는 loadSdk 도 같은 게이트 — SDK 는 init 만으로 세션 이벤트를 보낸다');
assert.match(src, /if \(internalNow\(\)\) p\.traffic_type = 'internal';/, 'Amplitude 공통 속성에 팀 표시(값은 상수 — 사람을 가리키지 않는다)');
assert.match(src, /internalNow\(\) \? \{ traffic_type: 'internal' \} : \{\}/, 'GA config 에 팀 표시 — 수집 요청의 tt=internal');
assert.match(src, /function boot\(\) \{\s*syncFlags\(\);/, '표시 쿼리는 부트에서 가장 먼저 읽는다(동의·SDK 보다 앞)');
assert.match(src, /function syncFlags\(\) \{\s*var f = readFlags\(location\.search\);/, '부트의 표시 읽기는 readFlags 로(위 검사가 지키는 규칙)');
assert.match(src, /var c = stripClickIds\(f\.rest\);\s*if \(f\.found \|\| c\.found\) \{\s*try \{ history\.replaceState\(history\.state, '', location\.pathname \+ c\.rest \+ location\.hash\); \}/,
  '표시 쿼리·광고 클릭 식별값은 읽은 뒤 주소창에서 지운다 — 표시된 주소가 공유되면 밖의 방문자까지 팀으로 표시되고, 식별값은 SDK·GA·리플레이가 읽는다');

// ── 광고 클릭 식별값(HP-628) — 처리방침 수집 항목에 없어 부트 때 주소에서 지운다 ──
assert.deepEqual([...a.CLICK_ID_PARAMS].sort(),
  ['dclid', 'fbclid', 'gbraid', 'gclid', 'ko_click_id', 'li_fat_id', 'msclkid', 'rdt_cid', 'ttclid', 'twclid', 'wbraid'],
  'Amplitude 웹 귀속이 주소에서 읽는 11종(analytics-browser 2.45.8)과 같다');
assert.deepEqual(a.stripClickIds('?utm_source=meta&fbclid=PAZXh0bgNhZW0&utm_content=a_all'),
  { rest: '?utm_source=meta&utm_content=a_all', found: true }, '인스타그램 광고 착지 주소 — fbclid 만 빠지고 utm 은 남는다');
assert.deepEqual(a.stripClickIds('?gclid=1&gbraid=2&wbraid=3&dclid=4&msclkid=5&ttclid=6&twclid=7&li_fat_id=8&rdt_cid=9&ko_click_id=10'),
  { rest: '', found: true });
assert.deepEqual(a.stripClickIds('?utm_campaign=fall%20sale&x=a+b'), { rest: '?utm_campaign=fall%20sale&x=a+b', found: false },
  '식별값이 없으면 그대로 — 나머지는 원래 글자 그대로');
assert.deepEqual(a.stripClickIds('?fbclid'), { rest: '', found: true }, '값 없는 키도 뺀다');
assert.deepEqual(a.stripClickIds('?xfbclid=1&gclid2=1'), { rest: '?xfbclid=1&gclid2=1', found: false }, '키는 정확히 같아야 한다');
assert.deepEqual(a.stripClickIds('?state=s&code=c&gclid=g'), { rest: '?state=s&code=c', found: true }, '로그인 왕복 값은 건드리지 않는다');
assert.deepEqual(a.stripClickIds(''), { rest: '', found: false });
assert.deepEqual(a.stripClickIds(undefined), { rest: '', found: false });

// ── 거부 뒤 전송 관문(HP-628) — 보내는 순간 수집 상태를 다시 본다 ──
{
  const sent = [];
  let allow = true;
  const config = { transportProvider: { send: async (url, payload, compress) => { sent.push(['fetch', url, compress]); return { status: 'success' }; } } };
  assert.equal(a.gateTransport(config, () => allow), config);
  assert.deepEqual(await config.transportProvider.send('u1', {}, true), { status: 'success' }, '허용 중에는 그대로 보낸다');
  allow = false;
  assert.equal(await config.transportProvider.send('u2', {}, false), null,
    '거부 뒤에는 보내지 않고 null — SDK 가 그 묶음을 다시 보내지 않고 버린다(처리방침 6항 "미전송 기록 즉시 삭제")');
  config.transportProvider = { send: async (url) => { sent.push(['beacon', url]); return { status: 'success' }; } };   // setTransport('beacon')
  assert.equal(await config.transportProvider.send('u3', {}, false), null, '떠날 때 전송 수단이 바뀌어도 관문은 남는다');
  allow = true;
  await config.transportProvider.send('u4', {}, false);
  assert.deepEqual(sent, [['fetch', 'u1', true], ['beacon', 'u4']], '바뀐 전송 수단으로 보내고, 막힌 묶음은 어디로도 나가지 않았다');
}
const loadSdkSrc = src.slice(src.indexOf('function loadSdk()'), src.indexOf('function ensureGa()'));
assert.ok(loadSdkSrc.indexOf('a.add(sendGatePlugin())') > 0 && loadSdkSrc.indexOf('a.add(sendGatePlugin())') < loadSdkSrc.indexOf('a.init('),
  '관문 플러그인은 init 앞에 붙인다 — init 뒤 첫 묶음 전송부터 관문을 지난다');
assert.match(src, /setup: function \(config\) \{ gateTransport\(config, function \(\) \{ return !config\.optOut && collecting\(\); \}\);/,
  '관문은 SDK 거부 상태(optOut)와 우리 수집 상태(collecting)를 함께 본다');

console.log('scripts/test-analytics.mjs: 통과');
