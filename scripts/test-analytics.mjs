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
assert.equal(a.envOf('landing.replix-dev.site'), 'dev');
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
assert.match(read('docs/js/faq.js'), /track\('faq_opened', \{ question_index:/);
assert.match(read('docs/js/hero.js'), /track\('demo_interacted', \{ demo: 'hero_toggle', action: 'toggle' \}\)/);
assert.match(read('docs/js/reveal.js'), /track\('section_viewed', \{ section: e\.target\.id \}\)/);
assert.match(read('docs/js/reveal.js'), /rootMargin: '0px 0px -40% 0px'/, '뷰포트보다 큰 섹션도 발화하게 threshold 0 + rootMargin');

console.log('scripts/test-analytics.mjs: 통과');
