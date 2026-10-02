// scripts/test-catalog-mobile.mjs — 작품 탐색 휴대폰 대응(HP-474)의 순수 함수 + 소스 규칙 검사.
// 카탈로그 앱엔 테스트 러너가 없어 규칙을 grid-pure.js(타입 없는 ESM)로 빼고, 화면 규칙은 소스로 고정한다.
// 실행: node scripts/test-catalog-mobile.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { RAIL_QUERY, columnsFor, visibleLimit } from '../catalog/app/src/grid-pure.js';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');

// ── 격자 상한(2026-09-07 조현빈)과 휴대폰 레일 예외(2026-10-02 김지호) ──
// 열 수 = 컨테이너 폭에서 최소 칸 폭·간격으로(종전 useFillCount 와 같은 식).
assert.equal(columnsFor(324, 150, 16), 2, '360px 휴대폰 순위 = 2열');
assert.equal(columnsFor(1344, 150, 16), 8, '1440px 순위 = 8열');
assert.equal(columnsFor(100, 150, 16), 1, '폭이 칸보다 좁아도 1열');
// 격자는 열 × 줄 밖을 숨기고(i >= 상한), 휴대폰 레일은 하나도 숨기지 않는다 — 옆으로 밀어 다 본다.
assert.equal(visibleLimit(2, 2, false), 4, '2열 × 2줄 = 4개');
assert.equal(visibleLimit(8, 2, false), 16, '1440px 순위 = 16칸');
assert.ok(!(13 >= visibleLimit(2, 2, true)), '레일은 14위(0부터 13)까지 다 싣는다');
assert.equal(RAIL_QUERY, '(max-width: 760px)', '레일 경계 = 헤더와 같은 760px');

const css = read('catalog/app/src/index.css');
const chrome = read('catalog/app/src/components/Chrome.tsx');
const hooks = read('catalog/app/src/hooks.ts');
const home = read('catalog/app/src/pages/Home.tsx');
const title = read('catalog/app/src/pages/Title.tsx');

// ① .btn 은 components 레이어 — 레이어 밖이면 Tailwind hidden(utilities 레이어)을 이겨 '홈으로'가 휴대폰에서 안 숨었다.
assert.match(css, /@layer components \{[^@]*\n\s*\.btn \{/, '.btn 계열을 @layer components 안에 둔다');
assert.doesNotMatch(css.replace(/@layer components \{[\s\S]*?\n\}/, ''), /^\.btn/m, '레이어 밖에 .btn 규칙이 남지 않는다');

// ① 헤더 — 휴대폰(760px 이하) = 로고·작품·돋보기·로그인(닉네임 메뉴). 설치 버튼·홈으로는 761px 부터.
const tag = (re) => (chrome.match(re) || [''])[0];
const install = tag(/<a href=\{STORE\}[^>]*data-cta="catalog_nav"[^>]*>/);
assert.match(install, /\bhidden\b/, '헤더 설치 버튼은 휴대폰에서 숨긴다');
assert.match(install, /min-\[761px\]:inline-flex/, '헤더 설치 버튼은 761px 부터 보인다');
const home761 = tag(/<a href="\/" className="btn btn--ghost[^"]*">/);
assert.match(home761, /\bhidden\b.*min-\[761px\]:inline-flex/, "'홈으로'는 761px 부터");
assert.match(chrome, /<nav className="[^"]*\bhidden\b[^"]*min-\[1100px\]:flex/, '섹션 링크는 1,100px 부터(태블릿 폭 넘침)');
const loginBtn = tag(/<button type="button" onClick=\{login\}[^>]*>/);
assert.ok(loginBtn && !/\bhidden\b/.test(loginBtn), '로그인 버튼은 휴대폰에서도 보인다(HP-274 결정 12 재개)');
const accountBox = tag(/<div ref=\{box\} className="amp-mask[^"]*"/);
assert.ok(accountBox && !/\bhidden\b/.test(accountBox), '닉네임 메뉴는 휴대폰에서도 보인다');
assert.match(accountBox, /\bmin-w-0\b/, '닉네임 메뉴는 줄어들 수 있다(말줄임으로 한 줄 유지)');
assert.match(chrome, /<span className="[^"]*\bmin-w-0\b[^"]*\btruncate\b[^"]*">\{name\}<\/span>/, '닉네임은 말줄임');

// ③ 바깥 탭으로 닫기 — iOS 사파리는 누를 수 없는 요소를 탭하면 마우스 이벤트를 만들지 않는다.
assert.doesNotMatch(chrome, /addEventListener\('mousedown'/, '바깥 닫기는 mousedown 이 아니라');
assert.ok((chrome.match(/addEventListener\('pointerdown'/g) || []).length >= 2, 'pointerdown 으로(계정 메뉴·검색)');

// ② 검색 — 좁은 폭엔 돋보기 버튼, 누르면 헤더 폭 검색 줄. 펼친 입력은 16px(iOS 사파리 확대 방지).
assert.match(chrome, /aria-label="작품 검색"[\s\S]{0,200}min-\[1100px\]:hidden|min-\[1100px\]:hidden[\s\S]{0,400}aria-label="작품 검색"/, '좁은 폭 돋보기 버튼');
assert.match(chrome, /expanded \? 'text-\[16px\]'/, '펼친 검색 입력은 16px');
assert.match(chrome, /engaged\('search', 'open'\)/, '계측 search/open 그대로(포커스당 1회)');

// ④ 격자 → 휴대폰 레일. 항목을 숨기는 격자 넷(순위·지금 보는 중·이번 주 인기 순간·함께 본 작품)이 모두 레일을 쓴다.
assert.match(css, /@media \(max-width: 760px\) \{[\s\S]*?\.fill-grid\.rail-sm \{[^}]*overflow-x: auto/, '760px 이하 레일 CSS');
assert.match(css, /\.fill-grid\.rail-sm > \* \{[^}]*scroll-snap-align: start/, '카드마다 스냅');
assert.match(hooks, /matchMedia\(RAIL_QUERY\)/, '레일 판정은 RAIL_QUERY 한 곳');
const gridUse = (src) => (src.match(/className="fill-grid rail-sm"/g) || []).length;
assert.equal(gridUse(home) + gridUse(title), 4, '항목을 숨기는 격자 넷이 레일을 쓴다');
for (const [name, src] of [['Home.tsx', home], ['Title.tsx', title]]) {
  assert.doesNotMatch(src, /hidden=\{i >= fill\.count\}/, `${name}: 숨김은 fill.limit 으로(레일이면 무한대라 안 숨긴다)`);
  assert.match(src, /hidden=\{i >= fill\.limit\}/, `${name}: 숨김은 fill.limit 기준`);
}

console.log('scripts/test-catalog-mobile.mjs: 통과');
