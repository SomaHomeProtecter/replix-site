// scripts/test-route.mjs — 카탈로그 해시 라우터(route-pure.js)의 검사. 카탈로그 앱엔 테스트 러너가 없어
// 규칙을 `catalog/app/src/route-pure.js`(타입 없는 ESM)로 분리해 node 로 직접 돌린다.
// 실행: node scripts/test-route.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ME_HREF, isAuthReturn, noticeHref, pageKey, parseRoute, reviewHref, titleHref } from '../catalog/app/src/route-pure.js';

// 홈 — 빈 해시·'#/'·섹션 앵커(#/ranking 처럼 소문자만).
assert.deepEqual(parseRoute(''), { page: 'home', anchor: null });
assert.deepEqual(parseRoute('#/'), { page: 'home', anchor: null });
assert.deepEqual(parseRoute('#/ranking'), { page: 'home', anchor: 'ranking' });

// 공지 — 홈 앵커 규칙보다 먼저. 뒤에 슬래시·쿼리가 와도 같은 라우트, '#/notices' 는 공지가 아니다(App.tsx 의 종전 검증 케이스).
assert.deepEqual(parseRoute('#/notice'), { page: 'notice', noticeId: null });
assert.deepEqual(parseRoute('#/notice/12/'), { page: 'notice', noticeId: 12 });
assert.deepEqual(parseRoute('#/notice/12?utm=x'), { page: 'notice', noticeId: 12 });
assert.deepEqual(parseRoute('#/notices'), { page: 'home', anchor: 'notices' });

// 작품 — 회차 선택은 그대로, '/review' 가 붙으면 평가 칸으로(HP-443 · 익스텐션 HP-442 가 여는 링크).
assert.deepEqual(parseRoute('#/title/5'), { page: 'title', contentId: 5, episodeId: null, review: false });
assert.deepEqual(parseRoute('#/title/5/ep/7'), { page: 'title', contentId: 5, episodeId: 7, review: false });
assert.deepEqual(parseRoute('#/title/5/ep/7#moments'), { page: 'title', contentId: 5, episodeId: 7, review: false }); // 회차 카드가 붙이는 섹션 앵커
assert.deepEqual(parseRoute('#/title/5/review'), { page: 'title', contentId: 5, episodeId: null, review: true });
assert.deepEqual(parseRoute('#/title/5/ep/7/review'), { page: 'title', contentId: 5, episodeId: 7, review: true });
assert.equal(parseRoute('#/title/5/review/').review, true);
assert.equal(parseRoute('#/title/5/review?utm=x').review, true);
assert.equal(parseRoute('#/title/5/reviews').review, false); // 경계 — 다른 단어는 걸리지 않는다

// 내 활동 — '#/me' 는 홈 앵커 규칙(#/[a-z]+)에 걸리므로 그보다 먼저 판정. 슬래시·쿼리 허용, '#/menu' 는 아니다.
assert.deepEqual(parseRoute('#/me'), { page: 'me' });
assert.deepEqual(parseRoute('#/me/'), { page: 'me' });
assert.deepEqual(parseRoute('#/me?utm=x'), { page: 'me' });
assert.deepEqual(parseRoute('#/menu'), { page: 'home', anchor: 'menu' });

// 링크 생성 ↔ 해석 왕복 — 화면이 만드는 링크가 라우터와 어긋나지 않게.
assert.equal(titleHref(5), '#/title/5');
assert.equal(titleHref(5, 7), '#/title/5/ep/7');
assert.equal(titleHref(5, null), '#/title/5');
assert.equal(reviewHref(5), '#/title/5/review');
assert.equal(noticeHref(), '#/notice');
assert.equal(noticeHref(3), '#/notice/3');
assert.equal(ME_HREF, '#/me');
assert.deepEqual(parseRoute(reviewHref(5)), { page: 'title', contentId: 5, episodeId: null, review: true });
assert.deepEqual(parseRoute(titleHref(5, 7)), { page: 'title', contentId: 5, episodeId: 7, review: false });
assert.equal(parseRoute(ME_HREF).page, 'me');

// page_viewed 단위(HP-615) — 홈 안 앵커·공지 항목·회차·평가 칸은 같은 페이지다. 앵커를 누를 때마다 페이지뷰가 하나씩 더 나갔다.
const key = (hash) => pageKey(parseRoute(hash));
for (const h of ['', '#/', '#/ranking', '#/hot', '#/live']) assert.equal(key(h), 'home', `${h || '(빈 해시)'}: 홈 한 페이지`);
assert.equal(key('#/notice/12'), key('#/notice'), '공지 항목은 공지 페이지 안 스크롤');
assert.equal(key('#/title/5/ep/7'), key('#/title/5'), '회차 선택은 같은 작품 페이지');
assert.equal(key('#/title/5/review'), 'title-5');
assert.notEqual(key('#/title/6'), key('#/title/5'), '다른 작품은 다른 페이지');
assert.equal(key('#/me'), 'me');

// 로그인 왕복으로 돌아온 로드(HP-615) — Keycloak 응답 쿼리(state + code|error). 이 로드의 page_viewed 는 세지 않는다.
assert.equal(isAuthReturn('?state=a&session_state=b&iss=https%3A%2F%2Fauth.replix.tv&code=c'), true, 'IdP 로그인에서 돌아옴');
assert.equal(isAuthReturn('?error=login_required&state=a'), true, '조용한 세션 확인이 전체 리디렉트로 돌아옴(제3자 쿠키 차단)');
assert.equal(isAuthReturn('?utm_source=meta&state=a&code=c'), true, '광고로 들어와 로그인한 경우도');
assert.equal(isAuthReturn('?code=c'), false, 'state 없는 code 는 우리 왕복이 아니다');
assert.equal(isAuthReturn('?barcode=1&state=2'), false, '이름 경계');
assert.equal(isAuthReturn('?utm_source=meta&utm_medium=paid_social'), false);
assert.equal(isAuthReturn(''), false);

// 화면 연결 — App.tsx 가 위 두 규칙을 실제로 쓴다(앵커는 스크롤 effect 에만, 계측 effect 는 페이지 키에만 걸린다).
const app = readFileSync(new URL('../catalog/app/src/App.tsx', import.meta.url), 'utf8');
assert.match(app, /let authReturnLoad = isAuthReturn\(window\.location\.search\)/, '모듈을 읽는 순간(keycloak-js 가 주소를 지우기 전)에 본다');
assert.match(app, /const key = pageKey\(route\)/);
assert.match(app, /useEffect\(\(\) => \{\s*if \(authReturnLoad\) \{ authReturnLoad = false; return \}\s*page\(\{ route: route\.page \}\)\s*\}, \[key, route\.page\]\)/,
  'page_viewed effect 는 페이지 키에만 걸린다(anchor 를 넣으면 앵커 이동마다 다시 센다)');

console.log('scripts/test-route.mjs: 통과');
