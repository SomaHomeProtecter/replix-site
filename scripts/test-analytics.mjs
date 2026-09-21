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

// 환경 판정 — 운영 도메인만 prod, 미리보기·로컬·file 은 dev(확장 config.js 와 같은 두 프로젝트).
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

assert.equal(a.parseConsent(JSON.stringify({ decision: 'granted', version: 1 })), 'granted');
assert.equal(a.parseConsent(JSON.stringify({ decision: 'denied', version: 1 })), 'denied');
assert.equal(a.parseConsent(JSON.stringify({ decision: 'granted', version: 0 })), null, '버전이 다르면 다시 묻는다');
assert.equal(a.parseConsent(JSON.stringify({ decision: 'maybe', version: 1 })), null);
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

// 소스 규칙
const src = read('docs/js/analytics.js');
const index = read('docs/index.html');
assert.doesNotMatch(index, /cdn\.amplitude\.com/, 'SDK 는 동의 뒤 스크립트로만 로드한다(정적 태그 금지)');
assert.doesNotMatch(read('docs/invite/index.html'), /analytics\.js|amplitude/i, '/invite 는 계측하지 않는다(쿼리에 토큰)');
assert.match(src, /_banner\.style\.display = 'none'/, '[hidden] 은 display:flex 에 진다(docs/README) — style 로 끈다');
assert.doesNotMatch(src, /\.hidden = true/, '배너를 [hidden] 으로 숨기면 display:flex 가 이긴다');
assert.match(src, /a\.setOptOut\(false\); a\.reset\(\);/, '같은 페이지에서 거부→허용이면 optOut 해제 + 새 device_id (검증에서 잡힌 버그)');
assert.match(src, /a\.setOptOut\(true\)/, '거부·철회 시 SDK optOut');
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
].sort(), '랜딩 링크 13곳 — 바꾸면 tracking-plan.md §6 의 표도 같이');
assert.match(read('docs/js/faq.js'), /track\('faq_opened', \{ question_index:/);
assert.match(read('docs/js/hero.js'), /track\('demo_interacted', \{ demo: 'hero_toggle', action: 'toggle' \}\)/);
assert.match(read('docs/js/reveal.js'), /track\('section_viewed', \{ section: e\.target\.id \}\)/);
assert.match(read('docs/js/reveal.js'), /rootMargin: '0px 0px -40% 0px'/, '뷰포트보다 큰 섹션도 발화하게 threshold 0 + rootMargin');

console.log('scripts/test-analytics.mjs: 통과');
