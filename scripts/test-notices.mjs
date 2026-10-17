// scripts/test-notices.mjs — 공지 표시 규칙(HP-425 · 읽음 기준 HP-427)의 순수 함수 검사. 카탈로그 앱엔 테스트 러너가 없어
// 규칙을 `catalog/app/src/notices-pure.js`(JSDoc 으로 타입을 적은 ESM — node 는 주석이라 그대로 읽는다)로 분리해 node 로 직접 돌린다.
// 실행: node scripts/test-notices.mjs
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import {
  applyLoadFailure,
  unreadCount,
  pickBand,
  noticePageState,
  isFresh,
  maxNoticeTime,
  migrateSeenAt,
  noticeDate,
  NOTICE_KINDS,
  kindTag,
  bandLook,
} from '../catalog/app/src/notices-pure.js';

// 기본 픽스처는 id 가 클수록 늦게 게시된다(게시일 = 9월 10+id 일). 어긋나는 경우는 startsAt 을 직접 준다.
const N = (id, kind, endedAt = null, startsAt = '2026-09-' + (10 + id) + 'T00:00:00Z') => ({
  id,
  kind,
  title: 't' + id,
  message: 'm',
  startsAt,
  endsAt: null,
  endedAt,
  linkUrl: null,
});
/** 픽스처 N(id) 의 게시 시각 = 'id 번까지 본 사람'의 읽음 기준. */
const T = (id) => Date.parse(N(id, 'NOTICE').startsAt);

// 안 읽은 수 = 읽음 기준(본 목록의 가장 늦은 게시 시각)보다 늦게 게시된 것들.
assert.equal(unreadCount([N(4, 'NOTICE'), N(3, 'MAINTENANCE')], T(3)), 1);
assert.equal(unreadCount([N(4, 'NOTICE'), N(3, 'MAINTENANCE')], 0), 2);
assert.equal(unreadCount([], 0), 0);
// 목록 순서와 무관하게 게시 시각으로만 센다(읽은 것 사이에 안 읽은 것이 끼어도).
assert.equal(unreadCount([N(2, 'NOTICE'), N(7, 'INCIDENT'), N(1, 'NOTICE'), N(5, 'MAINTENANCE')], T(4)), 2);
// 기준과 같은 시각에 게시된 공지는 이미 본 것이다(본 목록의 최대값을 저장하므로).
assert.equal(unreadCount([N(4, 'NOTICE')], T(4)), 0);

// HP-427 핵심 — 초안을 먼저 만들고 늦게 게시한 공지. id 11 을 본 뒤 id 10 이 게시되면 새 공지다.
// (id 기준이었을 때는 10 < 11 이라 읽은 것으로 묻혔다.)
const seen11 = Date.parse('2026-10-01T03:00:00Z');
const late10 = N(10, 'NOTICE', null, '2026-10-02T03:00:00Z');
const list = [late10, N(11, 'NOTICE', null, '2026-10-01T03:00:00Z')];
assert.equal(isFresh(late10, seen11), true);
assert.equal(unreadCount(list, seen11), 1);
assert.equal(pickBand(list, seen11, []).notice.id, 10);
assert.equal(pickBand(list, seen11, []).tone, 'notice');
// 공지 페이지를 열면 기준은 목록의 가장 늦은 게시 시각으로 오른다 — id 10 의 시각이다.
assert.equal(maxNoticeTime(list), Date.parse('2026-10-02T03:00:00Z'));
assert.equal(unreadCount(list, maxNoticeTime(list)), 0);

// 게시 시각을 읽을 수 없는 공지는 새 공지로 보지 않는다(빨간 점이 영영 켜지지 않게) · 최대값 계산에서도 빠진다.
const broken = N(12, 'NOTICE', null, 'not-a-date');
const nullAt = N(13, 'NOTICE', null, null);
assert.equal(isFresh(broken, 0), false);
assert.equal(isFresh(nullAt, 0), false);
assert.equal(unreadCount([broken, nullAt, N(4, 'NOTICE')], 0), 1);
assert.equal(pickBand([broken, nullAt], 0, []), null);
assert.equal(maxNoticeTime([broken, nullAt]), 0);
assert.equal(maxNoticeTime([broken, N(4, 'NOTICE')]), T(4));
assert.equal(maxNoticeTime([]), 0);

// 옛 읽음 값(id) 옮기기 — 세 갈래.
// ① 옛 seenId 와 같은 id 의 공지가 목록에 있으면 그 게시 시각. id ≤ seenId 중에 더 늦게 게시된 공지(초안 선행)가
//    있어도 그 시각으로 끌어올리지 않는다 — 그 사람이 본 것이 확실한 건 seenId 공지뿐이다.
const legacyList = [
  N(9, 'NOTICE', null, '2026-10-05T00:00:00Z'), // id 는 낮지만 가장 늦게 게시됨
  N(11, 'NOTICE', null, '2026-10-03T00:00:00Z'),
  N(10, 'NOTICE', null, '2026-10-01T00:00:00Z'),
];
assert.equal(migrateSeenAt(legacyList, 10), Date.parse('2026-10-01T00:00:00Z'));
assert.equal(unreadCount(legacyList, migrateSeenAt(legacyList, 10)), 2, '늦게 게시된 id 9 와 id 11 은 새 공지로 남는다');
// ② 그 공지가 목록에서 내려갔으면 id ≤ seenId 공지 중 가장 늦은 게시 시각.
assert.equal(migrateSeenAt(legacyList, 12), Date.parse('2026-10-05T00:00:00Z'));
assert.equal(migrateSeenAt([N(3, 'NOTICE'), N(5, 'NOTICE'), N(8, 'NOTICE')], 6), T(5));
// 같은 id 공지의 게시 시각이 깨졌으면 ②로 넘어간다.
assert.equal(migrateSeenAt([N(6, 'NOTICE', null, 'x'), N(5, 'NOTICE')], 6), T(5));
// ③ id ≤ seenId 공지도 없으면 0(목록의 모든 공지가 새 공지).
assert.equal(migrateSeenAt([N(8, 'NOTICE'), N(9, 'NOTICE')], 6), 0);
assert.equal(migrateSeenAt([], 6), 0);
assert.equal(migrateSeenAt([N(1, 'NOTICE')], 0), 0, '옛 값이 0·깨짐이면 아무것도 본 적 없는 것과 같다');

// 띠 — 종료되지 않은 점검·장애가 일반 공지보다 우선한다.
assert.equal(pickBand([N(4, 'NOTICE'), N(3, 'MAINTENANCE')], 0, []).notice.id, 3);
assert.equal(pickBand([N(4, 'NOTICE'), N(3, 'MAINTENANCE')], 0, []).tone, 'maint');
assert.equal(pickBand([N(4, 'NOTICE'), N(3, 'INCIDENT')], 0, []).tone, 'incident');

// 점검을 닫으면 그 다음은 안 읽은 일반 공지.
assert.equal(pickBand([N(4, 'NOTICE'), N(3, 'MAINTENANCE')], 0, [3]).notice.id, 4);
assert.equal(pickBand([N(4, 'NOTICE'), N(3, 'MAINTENANCE')], 0, [3]).tone, 'notice');

// 다 읽었으면 띠 없음 · 해결된(endedAt 있는) 장애도 띠가 아니다.
assert.equal(pickBand([N(4, 'NOTICE')], T(4), []), null);
assert.equal(pickBand([N(1, 'INCIDENT', '2026-09-09T01:00:00Z')], 0, []), null);

// 닫은 일반 공지는 다시 뜨지 않는다(같은 세션).
assert.equal(pickBand([N(4, 'NOTICE')], 0, [4]), null);

// 후보가 여럿이면 최신 1건 — 서버가 startsAt 내림차순으로 주므로 목록 앞쪽이 최신이다.
assert.equal(pickBand([N(5, 'MAINTENANCE'), N(3, 'MAINTENANCE')], 0, []).notice.id, 5);
assert.equal(pickBand([N(5, 'NOTICE'), N(4, 'NOTICE')], 0, []).notice.id, 5);

// 종류 이름과 색(HP-670) — 띠와 공지 페이지가 NOTICE_KINDS 한 곳에서 받는다. 두 화면이 보이는 이름·색을 한 표로 고정하므로
// 맵에서 한 종류의 이름이나 색을 바꾸면 띠와 목록의 기대값을 함께 고쳐야 통과한다. 어느 화면이 사본을 들고 있는지는 아래 '화면 배선'이 막는다.
const bandOf = (n) => bandLook(pickBand([n], 0, []));
const shown = (pick) => ({
  공지: { page: pick(kindTag('NOTICE')), band: pick(bandOf(N(4, 'NOTICE'))) },
  점검: { page: pick(kindTag('MAINTENANCE')), band: pick(bandOf(N(3, 'MAINTENANCE'))) },
  장애: { page: pick(kindTag('INCIDENT')), band: pick(bandOf(N(3, 'INCIDENT'))) },
});
assert.deepEqual(shown((v) => v.label), {
  공지: { page: '공지', band: '새 공지' }, // 일반 공지는 안 읽은 것만 띠에 오르므로 띠에서는 '새 공지'
  점검: { page: '점검', band: '점검' },
  장애: { page: '장애', band: '장애' },
});
assert.deepEqual(shown((v) => v.cls), {
  공지: { page: 'bg-sink text-muted', band: 'bg-soft text-ink2' },
  점검: { page: 'bg-warnw text-warnd', band: 'bg-warnw text-warnd' },
  장애: { page: 'bg-accentw text-accentd', band: 'bg-accentw text-accentd' },
});
// 점검·장애 띠는 목록 태그와 같은 항목을 그대로 쓴다(값만 같은 사본이 아니다).
assert.equal(bandOf(N(3, 'MAINTENANCE')), kindTag('MAINTENANCE'));
assert.equal(bandOf(N(3, 'INCIDENT')), kindTag('INCIDENT'));
// 이 화면이 아직 모르는 종류 — 목록은 일반 공지 모양으로 그리고 띠에는 올리지 않는다(바꾸기 전과 같다).
assert.equal(kindTag('EVENT'), NOTICE_KINDS.NOTICE);
assert.equal(pickBand([N(5, 'EVENT')], 0, []), null);
// 색은 index.css @theme 토큰이다 — 클래스 이름이 틀리면 Tailwind 가 아무 색도 만들지 않으므로 토큰이 있는지 본다.
// 점검색 값은 바꾸기 전 화면에 직접 적혀 있던 호박색(#fbf1df 바탕, #7a4a00 글자) 그대로다.
const kindClasses = Object.values(shown((v) => v.cls)).flatMap((v) => [v.page, v.band]);
const css = readFileSync(new URL('../catalog/app/src/index.css', import.meta.url), 'utf8');
for (const cls of kindClasses.join(' ').split(' ')) {
  assert.match(css, new RegExp(`--color-${cls.replace(/^(bg|text)-/, '')}:`), `${cls} 의 색 토큰`);
}
assert.match(css, /--color-warnw: #fbf1df;/);
assert.match(css, /--color-warnd: #7a4a00;/);

// 화면 배선 — TSX 는 node 로 못 돌려 소스로 고정한다(test-catalog-mobile.mjs 와 같은 방식).
// 띠(Chrome.tsx)는 bandLook, 공지 페이지(Notice.tsx)는 kindTag 로 이름과 색을 받아 그대로 그리고, 자기 사본을 두지 않는다.
const chromeSrc = readFileSync(new URL('../catalog/app/src/components/Chrome.tsx', import.meta.url), 'utf8');
const noticeSrc = readFileSync(new URL('../catalog/app/src/pages/Notice.tsx', import.meta.url), 'utf8');
assert.match(chromeSrc, /const \{ label, cls \} = bandLook\(pick\)/, '띠는 bandLook 으로 이름과 색을 받는다');
assert.match(chromeSrc, /<div role="status" className=\{`[^`]*\$\{cls\}`\}>/, '띠 바탕색 = bandLook 의 cls');
assert.match(chromeSrc, />\{label\}<\/span>/, '띠 머리표 = bandLook 의 label');
assert.match(noticeSrc, /const \{ label, cls \} = kindTag\(n\.kind\)/, '공지 페이지는 kindTag 로 이름과 색을 받는다');
assert.match(noticeSrc, /<span className=\{`[^`]*\$\{cls\}`\}>\{label\}<\/span>/, '태그 = kindTag 의 이름과 색');
// 사본 찾기는 주석을 걷어 낸 코드에서만 한다 — 주석이 '점검' 같은 낱말을 따옴표로 인용해도 걸리지 않게(https:// 의 // 는 남긴다).
const codeOnly = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
for (const [name, src] of [['Chrome.tsx', codeOnly(chromeSrc)], ['Notice.tsx', codeOnly(noticeSrc)]]) {
  // 따옴표로 감싼 종류 이름 사본이 없다(안내문 속 낱말은 따옴표가 없어 걸리지 않는다). '공지'와 '새 공지'는 헤더 링크와
  // 빨간 점의 이름으로도 쓰여 여기서 찾을 수 없다 — 그 둘은 바로 위의 bandLook·kindTag 배선 검사가 맡는다.
  for (const label of ['점검', '장애']) assert.doesNotMatch(src, new RegExp(`['"\`]${label}['"\`]`), `${name}: '${label}' 사본`);
  for (const cls of kindClasses) assert.ok(!src.includes(cls), `${name}: '${cls}' 사본`);
  assert.doesNotMatch(src, /#fbf1df|#7a4a00/i, `${name}: 점검색 하드코딩`);
}

// 날짜는 기기 시간대가 아니라 한국 시간 — 자정 근처 UTC 값이 한국 날짜로 넘어간다.
assert.equal(noticeDate('2026-09-30T15:00:00Z'), '2026-10-01', 'UTC 15:00 = 한국 다음 날 00:00');
assert.equal(noticeDate('2026-09-30T14:59:59Z'), '2026-09-30', 'UTC 14:59 = 한국 같은 날 23:59');
assert.equal(noticeDate('2026-12-31T16:30:00Z'), '2027-01-01', '해가 넘어가는 경우');
assert.equal(noticeDate('2026-10-01T00:00:00+09:00'), '2026-10-01');
assert.equal(noticeDate(null), '');
assert.equal(noticeDate(''), '');
assert.equal(noticeDate('not-a-date'), '');
// 실행 기기의 시간대와 무관해야 한다 — 다른 시간대로 띄운 node 에서도 같은 값인지 확인한다.
if (!process.env.NOTICE_TZ_CHILD) {
  const { execFileSync } = await import('node:child_process');
  const { fileURLToPath } = await import('node:url');
  // 파일 경로는 fileURLToPath 로 만든다 — URL 의 pathname 은 공백·한글이 %20·%ED… 로 남고 Windows 에서는 /C:/… 가 되어,
  // 그런 폴더에 레포를 둔 PC 에서는 자식 node 가 파일을 못 찾아 검사가 여기서 멈춘다(HP-670).
  for (const tz of ['America/Los_Angeles', 'UTC', 'Pacific/Kiritimati']) {
    execFileSync(process.execPath, [fileURLToPath(import.meta.url)], {
      env: { ...process.env, TZ: tz, NOTICE_TZ_CHILD: '1' },
      stdio: ['ignore', 'ignore', 'inherit'],
    });
  }
}

// 로드 실패 — 아직 한 번도 못 받았으면 빈 목록(화면이 '불러오는 중'에 갇히지 않게),
// 이전에 성공한 캐시가 있으면 그 캐시를 그대로 유지한다.
assert.deepEqual(applyLoadFailure(null), []);
const cached = [N(4, 'NOTICE')];
assert.equal(applyLoadFailure(cached), cached);

// 공지 페이지가 보일 안내 한 줄 — 특히 '첫 실패 뒤 재시도 중'을 '공지 0건'과 구분한다.
const page = (o) => noticePageState({ items: null, failed: false, loading: false, noticeId: null, ...o });
// 첫 로드(아직 목록 없음) · 재시도 중(실패로 빈 목록이 됐지만 요청이 떠 있음) 둘 다 '불러오는 중'.
assert.equal(page({ items: null, loading: true }), 'loading');
assert.equal(page({ items: [], failed: false, loading: true }), 'loading');
// 요청이 끝났을 때만 실패·0건을 구분해 말한다.
assert.equal(page({ items: [], failed: true, loading: false }), 'failed');
assert.equal(page({ items: [], failed: false, loading: false }), 'empty');
// 재시도 중이라도 이전 성공 목록이 있으면 목록만 보이고 문구는 없다.
assert.equal(page({ items: [N(4, 'NOTICE')], loading: true, noticeId: 9 }), 'list');
// #/notice/<id> 인데 그 공지가 목록에 없으면 안내 — 단 목록이 있을 때만(0건이면 'empty' 한 줄로 끝낸다).
assert.equal(page({ items: [N(4, 'NOTICE')], noticeId: 9 }), 'missing');
assert.equal(page({ items: [], noticeId: 9 }), 'empty');
assert.equal(page({ items: [N(4, 'NOTICE')], noticeId: 4 }), 'list');
// 다시 불러오기에 실패했는데 이전 목록이 있으면 실패를 숨기지 않는다 — 목록과 함께 '불러오지 못했어요'('stale').
assert.equal(page({ items: [N(4, 'NOTICE')], failed: true }), 'stale');
// 그때 목록이 부족한 것은 '내려가서'가 아니라 '못 불러와서'다 — 'missing' 대신 'stale'.
assert.equal(page({ items: [N(4, 'NOTICE')], failed: true, noticeId: 9 }), 'stale');
assert.equal(page({ items: [N(4, 'NOTICE')], failed: true, noticeId: 4 }), 'stale');

// 타입 배선(HP-670) — 타입은 notices-pure.js 의 JSDoc 한 곳뿐이고 tsc 가 그 본문까지 검사한다. 첫 줄 @ts-check 가 빠지면
// tsc 가 본문을 다시 보지 않아 적어 둔 타입과 함수가 어긋나도 통과하고, 손으로 쓴 .d.ts 가 돌아오면 가져오는 쪽이 그것을 먼저
// 읽어 이중 관리로 되돌아간다. 둘 다 tsc 로는 드러나지 않아 여기서 막는다.
const pureSrc = readFileSync(new URL('../catalog/app/src/notices-pure.js', import.meta.url), 'utf8');
assert.match(pureSrc, /^\/\/ @ts-check\n/, 'notices-pure.js 첫 줄은 // @ts-check');
assert.ok(!existsSync(new URL('../catalog/app/src/notices-pure.d.ts', import.meta.url)), '손으로 쓴 notices-pure.d.ts 를 다시 두지 않는다');

if (!process.env.NOTICE_TZ_CHILD) console.log('scripts/test-notices.mjs: 통과');
