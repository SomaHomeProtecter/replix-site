// scripts/test-analytics.mjs — 계측 모듈의 순수 함수 + 소스 규칙 검사. 랜딩은 빌드가 없어 이 검사가 회귀망이다.
// 실행: node scripts/test-analytics.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
assert.match(a.bannerText(2), /화면 조작 기록/, '동의 문구가 녹화를 밝힌다');
assert.match(a.bannerText(2), /첫 화면/, '배너는 두 표면이 같이 쓴다 — 범위를 적는다');
assert.doesNotMatch(a.bannerText(1), /화면 조작/, '시행 전 문구에는 아직 없는 수집을 적지 않는다');
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
assert.match(a.bannerText(4), /Google Analytics/);
assert.match(a.bannerText(4), /작품 탐색/, '4 는 녹화 범위(작품 탐색)를 밝힌다');
assert.doesNotMatch(a.bannerText(3), /작품 탐색/, '3 은 랜딩 녹화만');
assert.doesNotMatch(a.noticeText(), /첫 화면에서의 화면 조작/, '안내 배너도 녹화 범위를 첫 화면으로 한정하지 않는다');
assert.match(a.bannerText(3), /Google Analytics/, '동의 문구가 받는 곳(Google)을 밝힌다');
assert.match(a.bannerText(3), /화면 조작 기록/, '3 은 2 의 범위를 그대로 포함한다');
assert.doesNotMatch(a.bannerText(2), /Google/, '시행 전 문구에는 아직 없는 수신자를 적지 않는다');
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
assert.match(a.noticeText(), /거부/, '안내 배너가 거부 방법을 밝힌다(사후 통제권)');
assert.match(a.noticeText(), /Amplitude와 Google Analytics/, '받는 곳을 밝힌다(투명성)');
assert.match(a.noticeText(), /허용하면[^.]*화면 조작 기록/, '리플레이는 허용해야만 — 안내가 그걸 밝힌다');

// 소스 규칙
const src = read('docs/js/analytics.js');
const index = read('docs/index.html');
assert.doesNotMatch(index, /cdn\.amplitude\.com/, 'SDK 는 동의 뒤 스크립트로만 로드한다(정적 태그 금지)');
assert.doesNotMatch(read('docs/invite/index.html'), /analytics\.js|amplitude/i, '/invite 는 계측하지 않는다(쿼리에 토큰)');
assert.match(src, /_banner\.style\.display = 'none'/, '[hidden] 은 display:flex 에 진다(docs/README) — style 로 끈다');
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
assert.match(src, /if \(_consent !== 'granted' \|\| !replayOn\(location\.hostname, location\.pathname, Date\.now\(\)\)\) \{ start\(\); return; \}/,
  '허용을 누르지 않았거나 랜딩·시행일 조건이 아니면 플러그인 스크립트를 받지도 않는다(옵트아웃 수집 중에도 녹화는 안 함)');
assert.match(src, /function attachReplay\(a\) \{\s*if \(_replay \|\| _consent !== 'granted'/, '리플레이는 명시적 허용에서만 붙는다');
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
assert.match(privacy, /화면 조작 기록은[^.]*명시적으로 동의한 경우에만/, '리플레이는 동의한 경우에만이라는 약속을 유지한다');
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

console.log('scripts/test-analytics.mjs: 통과');
