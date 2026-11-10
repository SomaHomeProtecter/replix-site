// scripts/test-episode.mjs — 회차 표기 규칙(HP-807, catalog/app/src/episode-pure.js)과 정적 페이지 사본 두 곳의 검사.
// 카탈로그 앱엔 테스트 러너가 없어 규칙을 타입 없는 ESM 으로 분리해 node 로 직접 돌린다. 실행: node scripts/test-episode.mjs
// 규칙(2026-11-10 조현빈 팀장 결정): 시즌은 플랫폼이 준 그대로(시즌 1 포함), 진짜 회차 번호가 없으면(영화·자리 채움) 회차 칸 없음,
// 회차 제목은 메타데이터(표기 뒤에 덧붙이는 정보).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { episodeLabel, episodeLine, episodeName, episodeTitle, hasEpisodeNumber, joinParts, seasonLabel } from '../catalog/app/src/episode-pure.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');

// ── 표기
assert.equal(episodeLabel({ seasonNumber: 1, episodeNumber: 3 }), '시즌1 3화', '시즌 1도 붙인다');
assert.equal(episodeLabel({ seasonNumber: 2, episodeNumber: 4 }), '시즌2 4화');
assert.equal(episodeLabel({ seasonNumber: 22, episodeNumber: 108 }), '시즌22 108화');
assert.equal(episodeLabel({ seasonNumber: null, episodeNumber: 5 }), '5화', '시즌을 모르면 회차만');
assert.equal(episodeLabel({ seasonNumber: 0, episodeNumber: 5 }), '5화', '시즌 0 은 모름으로');
assert.equal(episodeLabel({ episodeNumber: 5 }), '5화', '시즌 필드가 없어도');
// 영화 — 서버는 자리 채움 회차(시즌 1·1화)를 싣는다. 종전엔 '영화'를 돌려줬는데, 회차 칸에는 아무것도 쓰지 않는다.
assert.equal(episodeLabel({ seasonNumber: 1, episodeNumber: 1 }, 'MOVIE'), '', '넘긴 contentType 이 영화');
assert.equal(episodeLabel({ seasonNumber: 1, episodeNumber: 1, contentType: 'MOVIE' }), '', '행의 contentType 이 영화');
assert.equal(episodeLabel({ seasonNumber: 1, episodeNumber: 1, hasEpisodeNumber: false }), '', '잠정 회차의 자리 채움(HP-807 BE)');
assert.equal(episodeLabel({ seasonNumber: null, episodeNumber: null, hasEpisodeNumber: false }, 'SERIES'), '', '서버가 null 로 보내도');
assert.equal(episodeLabel({ seasonNumber: 1, episodeNumber: 3, hasEpisodeNumber: true, contentType: 'SERIES' }), '시즌1 3화');
// 필드가 없는 옛 서버 — 번호만 본다. 던지지 않고 'undefined'·'null'·'0화' 를 적지 않는다.
assert.equal(episodeLabel({ seasonNumber: 1, episodeNumber: 3 }, undefined), '시즌1 3화');
assert.equal(episodeLabel({ seasonNumber: 1, episodeNumber: null }), '');
assert.equal(episodeLabel({ seasonNumber: 1, episodeNumber: 0 }), '', '0 은 번호가 아니다');
assert.equal(episodeLabel({}), '');
assert.equal(episodeLabel(null), '');
assert.equal(episodeLabel(undefined, 'SERIES'), '');
assert.equal(episodeLabel({ seasonNumber: 'x', episodeNumber: '3' }), '', '숫자가 아니면 없는 것으로');
assert.equal(hasEpisodeNumber({ episodeNumber: 3 }), true);
assert.equal(hasEpisodeNumber({ episodeNumber: 3 }, 'MOVIE'), false);
assert.equal(seasonLabel(4), '시즌4');
assert.equal(seasonLabel(0), '');
assert.equal(seasonLabel(null), '');

// ── 회차 제목(메타데이터) — 중복을 걸러 낸다
const s1e7 = { seasonNumber: 1, episodeNumber: 7 };
assert.equal(episodeTitle('7화', s1e7, '나는 솔로'), '', "'7화' 제목은 표기와 겹친다 — '시즌1 7화 · 7화' 가 되지 않게");
assert.equal(episodeTitle('시즌1 7화', s1e7, '나는 솔로'), '', '표기와 같은 제목');
for (const t of ['제 7화', '제7화', 'Episode 7', 'Ep. 7', '에피소드 7']) assert.equal(episodeTitle(t, s1e7, 'x'), '', `번호만 적은 제목 '${t}'`);
assert.equal(episodeTitle('제 8화', s1e7, 'x'), '제 8화', '번호가 다르면 정보다 — 지우지 않는다');
assert.equal(episodeTitle('7화의 비밀', s1e7, 'x'), '7화의 비밀', '번호로 시작하는 진짜 제목은 둔다');
assert.equal(episodeTitle('  나는 솔로 ', s1e7, '나는 솔로'), '', '작품명과 같은 제목');
assert.equal(episodeTitle('헤어질 결심', { seasonNumber: 1, episodeNumber: 1 }, '헤어질 결심', 'MOVIE'), '', '영화 — 작품명을 두 번 적지 않는다');
assert.equal(episodeTitle(null, s1e7, 'x'), '');
assert.equal(episodeTitle('  ', s1e7, 'x'), '');
assert.equal(episodeTitle('결혼은 현실이다', s1e7, '나는 솔로'), '결혼은 현실이다');
assert.equal(episodeTitle('7화', { seasonNumber: 1, episodeNumber: 1, contentType: 'MOVIE' }, '어떤 영화'), '7화', '표기가 없으면 겹칠 것도 없다');

// ── 한 줄·이름·잇기
assert.equal(episodeLine(s1e7, '결혼은 현실이다', '나는 솔로'), '시즌1 7화 · 결혼은 현실이다');
assert.equal(episodeLine(s1e7, '7화', '나는 솔로'), '시즌1 7화', "'7화 7화' 가 되지 않는다");
assert.equal(episodeLine(s1e7, null, '나는 솔로'), '시즌1 7화');
assert.equal(episodeLine({ seasonNumber: 1, episodeNumber: 1 }, null, '헤어질 결심', 'MOVIE'), '', '영화는 회차 줄이 비어 있다(제목은 서버가 null)');
assert.equal(episodeLine({ seasonNumber: 1, episodeNumber: 1 }, '헤어질 결심', '헤어질 결심', 'MOVIE'), '', '영화 제목이 작품명이어도 비어 있다');
assert.equal(episodeLine({ seasonNumber: 1, episodeNumber: 1, hasEpisodeNumber: false }, '첫 시청', '잠정 작품'), '첫 시청', '잠정 회차는 제목만');
assert.equal(episodeName(s1e7, '결혼은 현실이다', '나는 솔로'), '시즌1 7화', '이름은 표기가 먼저');
assert.equal(episodeName({ episodeNumber: 1, hasEpisodeNumber: false }, '첫 시청', '잠정 작품'), '첫 시청', '표기가 없으면 제목');
assert.equal(episodeName({ episodeNumber: 1 }, '헤어질 결심', '헤어질 결심', 'MOVIE'), '', '영화는 비어 있다');
assert.equal(joinParts(['', '1:19:37 근처'], ', '), '1:19:37 근처', "영화 '지금 보는 중' — ', 1:19:37 근처' 가 되지 않게");
assert.equal(joinParts(['시즌1 3화', '1:19:37 근처'], ', '), '시즌1 3화, 1:19:37 근처');
assert.equal(joinParts([null, undefined, ' '], ', '), '');

// ── 정적 페이지 사본 두 곳(타이머·초대)이 같은 규칙인지 — 같은 입력에 같은 표기를 내야 한다.
const block = (file, name) => {
  const m = new RegExp(`/\\* ${name}:start \\*/([\\s\\S]*?)/\\* ${name}:end \\*/`).exec(read(file));
  assert.ok(m, `${file} 에 ${name} 구간이 있다`);
  return new Function(`${m[1]}; return formatEpisodeLabel;`)();
};
const copies = { overlay: block('docs/overlay/index.html', 'overlayView'), invite: block('docs/invite/index.html', 'inviteCopy') };
const SEASONS = [1, 2, 22, 0, null, undefined];
const EPISODES = [1, 3, 108, 0, null, undefined];
const KINDS = [{}, { contentType: 'SERIES', hasEpisodeNumber: true }, { contentType: 'MOVIE', hasEpisodeNumber: false }, { contentType: 'MOVIE' },
  { contentType: 'SERIES', hasEpisodeNumber: false }, { hasEpisodeNumber: false }];
for (const s of SEASONS) for (const n of EPISODES) for (const k of KINDS) {
  const want = episodeLabel({ seasonNumber: s, episodeNumber: n, ...k });
  for (const [name, f] of Object.entries(copies)) {
    assert.equal(f(s, n, { seasonNumber: s, episodeNumber: n, ...k }), want, `${name} 사본 = episode-pure (${s}, ${n}, ${JSON.stringify(k)})`);
  }
}
// 세 곳이 서로를 가리킨다 — 규칙을 바꿀 때 한 곳만 고치지 않게.
assert.match(read('catalog/app/src/episode-pure.js'), /docs\/overlay\/index\.html[\s\S]*docs\/invite\/index\.html/);
for (const f of ['docs/overlay/index.html', 'docs/invite/index.html']) assert.match(read(f), /episode-pure\.js/, `${f} 이 정본을 가리킨다`);

// ── 화면 소스 — 회차 표기는 episode-pure 로만 만든다(옛 api.ts episodeLabel 이 '영화'를 돌려주던 길이 남지 않게).
const api = read('catalog/app/src/api.ts');
assert.doesNotMatch(api, /export function episodeLabel/, 'api.ts 에 옛 표기 함수가 없다');
for (const p of ['Home', 'Title', 'Me']) {
  const src = read(`catalog/app/src/pages/${p}.tsx`);
  assert.match(src, /from '\.\.\/episode-pure\.js'/, `${p}.tsx 는 episode-pure 를 쓴다`);
  assert.doesNotMatch(src, /episodeTitle \?\? /, `${p}.tsx — 회차 제목이 표기를 대신하지 않는다(제목은 메타데이터)`);
}
const home = read('catalog/app/src/pages/Home.tsx');
assert.doesNotMatch(home, /\{episodeLabel\(s\)\}\{hot \? `, /, "지금 보는 중 — 빈 표기 앞에 ', ' 를 붙이지 않는다");

console.log('scripts/test-episode.mjs: 통과');
