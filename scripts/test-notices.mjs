// scripts/test-notices.mjs — 공지 표시 규칙(HP-425)의 순수 함수 검사. 카탈로그 앱엔 테스트 러너가 없어
// 규칙을 `catalog/app/src/notices-pure.js`(타입 없는 ESM)로 분리해 node 로 직접 돌린다.
// 실행: node scripts/test-notices.mjs
import assert from 'node:assert/strict';
import { unreadCount, pickBand } from '../catalog/app/src/notices-pure.js';

const N = (id, kind, endedAt = null) => ({
  id,
  kind,
  title: 't' + id,
  message: 'm',
  startsAt: '2026-09-' + (10 + id) + 'T00:00:00Z',
  endsAt: null,
  endedAt,
  linkUrl: null,
});

// 안 읽은 수 = id 가 마지막으로 읽은 id 보다 큰 것들.
assert.equal(unreadCount([N(4, 'NOTICE'), N(3, 'MAINTENANCE')], 3), 1);
assert.equal(unreadCount([N(4, 'NOTICE'), N(3, 'MAINTENANCE')], 0), 2);
assert.equal(unreadCount([], 0), 0);

// 띠 — 종료되지 않은 점검·장애가 일반 공지보다 우선한다.
assert.equal(pickBand([N(4, 'NOTICE'), N(3, 'MAINTENANCE')], 0, []).notice.id, 3);
assert.equal(pickBand([N(4, 'NOTICE'), N(3, 'MAINTENANCE')], 0, []).tone, 'maint');
assert.equal(pickBand([N(4, 'NOTICE'), N(3, 'INCIDENT')], 0, []).tone, 'incident');

// 점검을 닫으면 그 다음은 안 읽은 일반 공지.
assert.equal(pickBand([N(4, 'NOTICE'), N(3, 'MAINTENANCE')], 0, [3]).notice.id, 4);
assert.equal(pickBand([N(4, 'NOTICE'), N(3, 'MAINTENANCE')], 0, [3]).tone, 'notice');

// 다 읽었으면 띠 없음 · 해결된(endedAt 있는) 장애도 띠가 아니다.
assert.equal(pickBand([N(4, 'NOTICE')], 4, []), null);
assert.equal(pickBand([N(1, 'INCIDENT', '2026-09-09T01:00:00Z')], 0, []), null);

// 닫은 일반 공지는 다시 뜨지 않는다(같은 세션).
assert.equal(pickBand([N(4, 'NOTICE')], 0, [4]), null);

console.log('scripts/test-notices.mjs: 통과');
