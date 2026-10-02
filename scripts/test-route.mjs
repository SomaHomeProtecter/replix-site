// scripts/test-route.mjs — 카탈로그 해시 라우터(route-pure.js)의 검사. 카탈로그 앱엔 테스트 러너가 없어
// 규칙을 `catalog/app/src/route-pure.js`(타입 없는 ESM)로 분리해 node 로 직접 돌린다.
// 실행: node scripts/test-route.mjs
import assert from 'node:assert/strict';
import { ME_HREF, noticeHref, parseRoute, reviewHref, titleHref } from '../catalog/app/src/route-pure.js';

// 홈 — 빈 해시·'#/'·섹션 앵커(#/ranking 처럼 소문자만).
assert.deepEqual(parseRoute(''), { page: 'home', anchor: null });
assert.deepEqual(parseRoute('#/'), { page: 'home', anchor: null });
assert.deepEqual(parseRoute('#/ranking'), { page: 'home', anchor: 'ranking' });

// 공지 — 홈 앵커 규칙보다 먼저. 뒤에 슬래시·쿼리가 와도 같은 라우트, '#/notices' 는 공지가 아니다(App.tsx 의 종전 검증 케이스).
assert.deepEqual(parseRoute('#/notice'), { page: 'notice', noticeId: null });
assert.deepEqual(parseRoute('#/notice/12/'), { page: 'notice', noticeId: 12 });
assert.deepEqual(parseRoute('#/notice/12?utm=x'), { page: 'notice', noticeId: 12 });
assert.deepEqual(parseRoute('#/notices'), { page: 'home', anchor: 'notices' });

// 작품 — 회차 선택은 그대로, '/review' 가 붙으면 평가 칸으로(HP-443 · 확장 HP-442 가 여는 링크).
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

console.log('scripts/test-route.mjs: 통과');
