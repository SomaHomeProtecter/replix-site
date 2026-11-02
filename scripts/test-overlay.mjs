// scripts/test-overlay.mjs — 방송 화면 오버레이(/overlay, HP-757)의 순수 함수 + 소스 규칙 검사.
// 외부 리소스 0 원칙의 단일 파일이라 빌드도 import 도 없다 — 이 검사가 회귀망이다. 실행: node scripts/test-overlay.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');

const page = read('docs/overlay/index.html');
const invite = read('docs/invite/index.html');

const block = /\/\* overlayView:start \*\/([\s\S]*?)\/\* overlayView:end \*\//.exec(page);
assert.ok(block, '오버레이 페이지에 순수 함수 구간(overlayView:start~end)이 있다');
const { formatEpisodeLabel, formatClock, overlayView, readHash, apiBase } = new Function(
  `${block[1]}; return { formatEpisodeLabel, formatClock, overlayView, readHash, apiBase };`)();

// ── 회차 표기 — 초대 페이지(=익스텐션 replix-net.js)와 같은 규칙이어야 한다.
const inviteBlock = /\/\* inviteCopy:start \*\/([\s\S]*?)\/\* inviteCopy:end \*\//.exec(invite);
const inviteLabel = new Function(`${inviteBlock[1]}; return formatEpisodeLabel;`)();
for (const [s, e] of [[8, 35], [1, 3], [null, 3], [8, null], [null, null], [2, 1]]) {
  assert.equal(formatEpisodeLabel(s, e), inviteLabel(s, e), `회차 표기가 초대 페이지와 같다 (${s}, ${e})`);
}
assert.equal(formatEpisodeLabel(1, 3), '3화', '시즌 1은 붙이지 않는다');
assert.equal(formatEpisodeLabel(2, 4), '시즌2 4화');

// ── 시각 표기
assert.equal(formatClock(0), '0:00');
assert.equal(formatClock(65), '1:05');
assert.equal(formatClock(746.9), '12:26', '소수는 버린다');
assert.equal(formatClock(3600), '1:00:00');
assert.equal(formatClock(3725.4), '1:02:05');
assert.equal(formatClock(-3), '0:00', '음수는 0');
assert.equal(formatClock(NaN), '');
assert.equal(formatClock(null), '');

// ── 응답 → 화면
const base = { platform: 'netflix', contentTitle: '밤의 정원', seasonNumber: 1, episodeNumber: 3, rate: 1 };
assert.deepEqual(overlayView({ ...base, state: 'PLAYING', positionSec: 746.2 }, 0),
  { platform: '넷플릭스', title: '밤의 정원 3화', time: '12:26', state: '재생 중', wait: false });
assert.equal(overlayView({ ...base, state: 'PLAYING', positionSec: 746.2 }, 4).time, '12:30', '재생 중이면 받은 뒤 흐른 초를 더한다');
assert.equal(overlayView({ ...base, state: 'PLAYING', positionSec: 100, rate: 1.5 }, 4).time, '1:46', '재생 속도만큼 흐른다');
assert.equal(overlayView({ ...base, state: 'PLAYING', positionSec: 100, rate: 0 }, 4).time, '1:44', '속도가 이상하면 1배속');
assert.equal(overlayView({ ...base, state: 'PLAYING', positionSec: 100 }, -5).time, '1:40', '시간이 거꾸로 가지 않는다');
assert.deepEqual(overlayView({ ...base, state: 'PAUSED', positionSec: 300 }, 60),
  { platform: '넷플릭스', title: '밤의 정원 3화', time: '5:00', state: '멈춤', wait: false }, '멈춰 있으면 그 자리');
assert.deepEqual(overlayView({ ...base, state: 'AD', positionSec: 300 }, 60),
  { platform: '넷플릭스', title: '밤의 정원 3화', time: '5:00', state: '광고 대기', wait: true }, '방장 광고 중 — 강조');
assert.equal(overlayView({ ...base, state: 'EPISODE_END', positionSec: 3100 }, 9).state, '회차 끝');
assert.deepEqual(overlayView({ ...base, state: 'IDLE', positionSec: null }, 3),
  { platform: '넷플릭스', title: '밤의 정원 3화', time: '', state: '시작 전', wait: false }, '재생 전이면 시각 없이');
assert.equal(overlayView({ ...base, seasonNumber: null, episodeNumber: null, state: 'IDLE', positionSec: null }, 0).title,
  '밤의 정원', '영화는 작품명만');
assert.equal(overlayView({ ...base, seasonNumber: 2, episodeNumber: 4, state: 'IDLE', positionSec: null }, 0).title, '밤의 정원 시즌2 4화');
assert.equal(overlayView({ ...base, platform: 'disney_plus', state: 'IDLE', positionSec: null }, 0).platform, '디즈니+');
assert.equal(overlayView({ ...base, platform: 'laftel', state: 'IDLE', positionSec: null }, 0).platform, '라프텔');
assert.equal(overlayView({ ...base, platform: 'zzz', state: 'IDLE', positionSec: null }, 0).platform, '', '모르는 플랫폼은 비운다');
assert.equal(overlayView({ ...base, state: 'WHAT', positionSec: 1 }, 0).state, '', '모르는 상태는 글자 없이');
assert.equal(overlayView(null, 0), null);
assert.equal(overlayView({ ...base, contentTitle: '  ' }, 0), null, '작품명이 없으면 그리지 않는다');
// 서버 문자열은 글자 그대로 담는다 — 막는 곳은 화면에 넣는 자리(textContent, 아래 소스 규칙).
assert.equal(overlayView({ ...base, contentTitle: '<img src=x onerror=alert(1)>', state: 'IDLE' }, 0).title,
  '<img src=x onerror=alert(1)> 3화');

// ── 해시·API 주소
assert.deepEqual(readHash('#t=abc_DEF-123'), { token: 'abc_DEF-123', env: '' });
assert.deepEqual(readHash('#t=abc&env=dev'), { token: 'abc', env: 'dev' });
assert.deepEqual(readHash(''), { token: '', env: '' });
assert.equal(apiBase('https://api.replix.tv', ''), 'https://api.replix.tv');
assert.equal(apiBase('https://api.replix.tv', 'dev'), 'https://api.replix-dev.site');
assert.equal(apiBase('https://api.replix.tv', 'https://evil.example'), 'https://api.replix.tv', '다른 값은 받지 않는다');

// ── 소스 규칙
assert.match(page, /<meta name="robots" content="noindex">/, '토큰이 실린 주소가 색인되지 않게');
assert.match(page, /<meta name="api-base" content="https:\/\/api\.replix\.tv">/, '기본은 운영 API');
assert.match(page, /readHash\(location\.hash\)/, '토큰은 해시에서만 읽는다');
assert.doesNotMatch(page, /location\.search/, '쿼리(서버로 가는 주소)에서 토큰을 읽지 않는다');
assert.match(page, /'\/api\/v1\/rooms\/stream-overlay\?t=' \+ encodeURIComponent\(hash\.token\)/, '묻는 곳은 공개 stream-overlay 하나');
assert.match(page, /cache: 'no-store', credentials: 'omit'/, '저장하지 않고 쿠키를 싣지 않는다');
assert.doesNotMatch(page, /innerHTML|insertAdjacentHTML|document\.write/, '서버 문자열은 textContent 로만');
assert.doesNotMatch(page, /<script[^>]+src=|<link[^>]+href=["']https?:|@import/, '외부 리소스 0');
assert.doesNotMatch(page, /gtag|analytics|googletagmanager/i, '계측 없음');
assert.doesNotMatch(page, /background:\s*#|body\s*\{[^}]*background(?!:\s*transparent)/, '페이지 배경을 칠하지 않는다(OBS 투명 합성)');
assert.match(page, /var POLL_MS = 2000, CLOSED_POLL_MS = 5000, TICK_MS = 250, STALE_MS = 30000/, '2초마다 묻고 30초 넘게 못 받으면 감춘다');

console.log('test-overlay: ok');
