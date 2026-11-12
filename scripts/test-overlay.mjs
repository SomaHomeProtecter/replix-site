// scripts/test-overlay.mjs — 같이보기 타이머(/overlay, HP-757 → HP-791 버전 네 가지)의 순수 함수 + 소스 규칙 검사.
// 외부 리소스 0 원칙의 단일 파일이라 빌드도 import 도 없다 — 이 검사가 회귀망이다. 실행: node scripts/test-overlay.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');

const page = read('docs/overlay/index.html');
// 주석을 뺀 코드 — 없앤 것이 '없다'를 볼 때 쓴다(주석은 없앤 까닭을 적느라 옛 이름을 부른다)
const code = page.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'])\/\/.*$/gm, '$1');
const invite = read('docs/invite/index.html');

const block = /\/\* overlayView:start \*\/([\s\S]*?)\/\* overlayView:end \*\//.exec(page);
assert.ok(block, '오버레이 페이지에 순수 함수 구간(overlayView:start~end)이 있다');
const { formatEpisodeLabel, formatClock, overlayView: rawView, steadyPosition, formatRemain, timesFor, readHash, apiBase, PLATFORM_NAMES,
  episodeCode, chooseVersion, progressPct, VERSIONS, VERSION_SOURCE, CHIP_TEXT, MARK_TEXT, MARK_ICON, inkShiftEm, digitShape, shrinkFactor, FIT_MIN_K } = new Function(
  `${block[1]}; return { formatEpisodeLabel, formatClock, overlayView, steadyPosition, formatRemain, timesFor, readHash, apiBase, PLATFORM_NAMES,
    episodeCode, chooseVersion, progressPct, VERSIONS, VERSION_SOURCE, CHIP_TEXT, MARK_TEXT, MARK_ICON, inkShiftEm, digitShape, shrinkFactor, FIT_MIN_K };`)();
// 화면 글자만 견준다 — 카드 칸(work·ep·chip·mark …)과 pos(초)·key(흐름)·duration(길이)은 아래에서 따로 본다.
const overlayView = (d, e) => { const v = rawView(d, e); if (!v) return v; const { platform, title, time, state, wait } = v; return { platform, title, time, state, wait }; };

// ── 회차 표기 — 초대 페이지·작품 탐색(episode-pure.js)과 같은 규칙이어야 한다(HP-807, 세 곳 대조는 scripts/test-episode.mjs).
const inviteBlock = /\/\* inviteCopy:start \*\/([\s\S]*?)\/\* inviteCopy:end \*\//.exec(invite);
assert.ok(inviteBlock, '초대 페이지에 문구 구간(inviteCopy:start~end)이 있다 — 회차 표기를 견줄 원본');
const inviteLabel = new Function(`${inviteBlock[1]}; return formatEpisodeLabel;`)();
const KINDS = [undefined, { contentType: 'SERIES', hasEpisodeNumber: true }, { contentType: 'MOVIE', hasEpisodeNumber: false }, { hasEpisodeNumber: false }];
for (const [s, e] of [[8, 35], [1, 3], [null, 3], [8, null], [null, null], [2, 1], [0, 4], [1, 0]]) {
  for (const k of KINDS) assert.equal(formatEpisodeLabel(s, e, k), inviteLabel(s, e, k), `회차 표기가 초대 페이지와 같다 (${s}, ${e}, ${JSON.stringify(k)})`);
}
assert.equal(formatEpisodeLabel(1, 3), '시즌1 3화', '시즌 1도 붙인다(HP-807)');
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
  { platform: '넷플릭스', title: '밤의 정원 시즌1 3화', time: '12:26', state: '재생 중', wait: false });
assert.equal(overlayView({ ...base, state: 'PLAYING', positionSec: 746.2 }, 4).time, '12:30', '재생 중이면 받은 뒤 흐른 초를 더한다');
assert.equal(overlayView({ ...base, state: 'PLAYING', positionSec: 100, rate: 1.5 }, 4).time, '1:46', '재생 속도만큼 흐른다');
assert.equal(overlayView({ ...base, state: 'PLAYING', positionSec: 100, rate: 0 }, 4).time, '1:44', '속도가 이상하면 1배속');
assert.equal(overlayView({ ...base, state: 'PLAYING', positionSec: 100 }, -5).time, '1:40', '시간이 거꾸로 가지 않는다');
assert.deepEqual(overlayView({ ...base, state: 'PAUSED', positionSec: 300 }, 60),
  { platform: '넷플릭스', title: '밤의 정원 시즌1 3화', time: '5:00', state: '멈춤', wait: false }, '멈춰 있으면 그 자리');
assert.deepEqual(overlayView({ ...base, state: 'AD', positionSec: 300 }, 60),
  { platform: '넷플릭스', title: '밤의 정원 시즌1 3화', time: '5:00', state: '광고 대기', wait: true }, '방장 광고 중 — 강조');
assert.equal(overlayView({ ...base, state: 'EPISODE_END', positionSec: 3100 }, 9).state, '회차 끝');
assert.deepEqual(overlayView({ ...base, state: 'IDLE', positionSec: null }, 3),
  { platform: '넷플릭스', title: '밤의 정원 시즌1 3화', time: '', state: '시작 전', wait: false }, '재생 전이면 시각 없이');
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
  '<img src=x onerror=alert(1)> 시즌1 3화');

// ── pos·key 와 뒤로 가지 않는 표시
const playing = rawView({ ...base, state: 'PLAYING', positionSec: 100 }, 2);
assert.equal(playing.pos, 102);
assert.equal(playing.key, 'netflix|밤의 정원 시즌1 3화|PLAYING');
assert.equal(rawView({ ...base, state: 'IDLE', positionSec: null }, 2).pos, null);
assert.equal(steadyPosition(750.1, 'k', 749.9, 'k'), 750.1, '조금(1.5초 미만) 뒤면 보인 값을 둔다 — 초가 뒤로 튀지 않게');
assert.equal(steadyPosition(750.1, 'k', 750.6, 'k'), 750.6, '앞이면 따른다');
assert.equal(steadyPosition(750.1, 'k', 700, 'k'), 700, '크게 뒤로 갔으면(되감음) 따른다');
assert.equal(steadyPosition(750.1, 'k', 749.9, 'other'), 749.9, '흐름이 바뀌면 견주지 않는다');
assert.equal(steadyPosition(null, null, 10, 'k'), 10);
assert.equal(steadyPosition(750, 'k', null, 'k'), null);

// ── 남은 시간(2026-11-02 김지호 결정 — '-55:08') — 길이를 알 때만, 내린 초끼리 빼서
assert.equal(rawView({ ...base, state: 'PLAYING', positionSec: 746.2, durationSec: 4054.6 }, 0).duration, 4054.6);
assert.equal(rawView({ ...base, state: 'PLAYING', positionSec: 746.2 }, 0).duration, null, '길이가 없으면 null');
assert.equal(rawView({ ...base, state: 'PLAYING', positionSec: 746.2, durationSec: 0 }, 0).duration, null, '0 은 모르는 것');
assert.equal(rawView({ ...base, state: 'PLAYING', positionSec: 746.2, durationSec: Infinity }, 0).duration, null, '유한하지 않으면 모르는 것');
assert.equal(formatRemain(4054.6, 746.2), '-55:08', '내림(4054.6) − 내림(746.2) = 3308초');
for (const pos of [746.0, 746.2, 746.6, 746.99]) {
  assert.equal(formatClock(pos) + ' ' + formatRemain(4054.6, pos), '12:26 -55:08', '같은 초 안에서는 둘 다 그대로 — ' + pos);
}
assert.equal(formatClock(747) + ' ' + formatRemain(4054.6, 747), '12:27 -55:07', '초가 넘어가면 둘이 같은 순간에 한 칸씩');
assert.equal(formatRemain(4054.6, 4060), '-0:00', '넘어가도 음수가 아니다');
assert.equal(formatRemain(null, 746.2), '');
assert.equal(formatRemain(undefined, 10), '', '빈 칸에 - 하나만 남기지 않는다');
assert.equal(formatRemain(Infinity, 10), '');
assert.equal(formatRemain(4054.6, null), '', '재생 전이면 빈 글자');
// 재생 중에 흘린 위치는 회차 길이에서 멈춘다(HP-858) — 스트리머의 표본이 끊긴 채 재생 중으로 남으면 길이를 지나 계속 흘렀다('51:03 / 50:51')
const vOver = rawView({ ...base, state: 'PLAYING', positionSec: 3050, durationSec: 3051.5 }, 13);
assert.equal(vOver.pos, 3051.5, '받은 뒤 흘린 위치가 길이를 넘지 않는다');
assert.deepEqual(timesFor(vOver, null, null), { pos: 3051.5, time: '50:51', remain: '-0:00' });
assert.equal(rawView({ ...base, state: 'PLAYING', positionSec: 9000, durationSec: 3051.5 }, 0).pos, 3051.5, '서버가 이미 길이를 지난 위치를 실어도');
assert.equal(rawView({ ...base, state: 'PLAYING', positionSec: 3050 }, 13).pos, 3063, '길이를 모르면 그대로 흘린다');
assert.equal(rawView({ ...base, state: 'PLAYING', positionSec: 100, durationSec: 3051.5 }, 4).pos, 104, '길이 안에서는 그대로');
// 그릴 때 — 뒤로 가지 않는 위치로 세고, 회차 끝에서는 뺀다
const v1 = rawView({ ...base, state: 'PLAYING', positionSec: 746.2, durationSec: 4054.6 }, 0);
assert.deepEqual(timesFor(v1, null, null), { pos: 746.2, time: '12:26', remain: '-55:08' });
const vBack = rawView({ ...base, state: 'PLAYING', positionSec: 745.6, durationSec: 4054.6 }, 0); // 새 응답이 조금 뒤로
assert.deepEqual(timesFor(vBack, 746.2, vBack.key), { pos: 746.2, time: '12:26', remain: '-55:08' }, '남은 시간도 뒤로 가지 않는 위치로 센다');
const vEnd = rawView({ ...base, state: 'EPISODE_END', positionSec: 4054, durationSec: 4054.6 }, 0);
assert.equal(timesFor(vEnd, null, null).remain, '', "회차 끝에서는 빼낸다('-0:00'이 상태와 겹친다)");
assert.equal(timesFor(rawView({ ...base, state: 'AD', positionSec: 1312, durationSec: 4054.6 }, 0), null, null).remain, '-45:42',
  '광고 대기 중에도 콘텐츠 위치로 센다(정본이 광고 전 위치를 쥔다)');
assert.match(page, /var times = timesFor\(view, shownPos, shownKey\);/, '그리기는 timesFor 를 쓴다');

// ── 플랫폼 이름 — 초대 페이지의 이동 표(NAV)와 같아야 한다(플랫폼을 더하면 두 곳을 함께 고친다)
const navNames = Object.fromEntries([...invite.matchAll(/\n\s+(\w+): \{\n\s+name: '([^']+)'/g)].map((m) => [m[1], m[2]]));
assert.ok(Object.keys(navNames).length >= 3, '초대 페이지 NAV 표를 읽었다 — ' + JSON.stringify(navNames));
for (const [code, name] of Object.entries(navNames)) assert.equal(PLATFORM_NAMES[code], name, code + ' 이름이 초대 페이지와 같다');

// ── 해시·API 주소
assert.deepEqual(readHash('#t=abc_DEF-123'), { token: 'abc_DEF-123', env: '', v: 'corner', fit: false }, '버전이 없으면 코너 카드, 폭 모드가 없으면 크기 고정');
assert.deepEqual(readHash('#t=abc&env=dev'), { token: 'abc', env: 'dev', v: 'corner', fit: false });
assert.deepEqual(readHash('#t=abc&v=bar&env=dev'), { token: 'abc', env: 'dev', v: 'bar', fit: false });
// HP-869 — fit=1 이면 폭이 내용만큼. '1' 이 아니면(없음·0·true·빈 값) 크기 고정 — 그 전 익스텐션(1.6.0)이 만든 링크에는 fit 이 없다
assert.deepEqual(readHash('#t=abc&v=clock&fit=1&env=dev'), { token: 'abc', env: 'dev', v: 'clock', fit: true });
assert.equal(readHash('#t=abc&fit=1').fit, true);
for (const odd of ['', '0', 'true', 'yes', '2']) assert.equal(readHash('#t=abc&fit=' + odd).fit, false, "fit 은 '1' 일 때만 — " + JSON.stringify(odd));
for (const v of ['corner', 'bar', 'clock', 'chip']) assert.equal(readHash('#t=a&v=' + v).v, v);
assert.equal(readHash('#t=a&v=cam').v, 'corner', '모르는 버전(채택하지 않은 캠 하단 패널 등)은 코너 카드');
assert.equal(readHash('#t=a&v=').v, 'corner');
assert.deepEqual(readHash(''), { token: '', env: '', v: 'corner', fit: false });
assert.equal(chooseVersion('CHIP'), 'corner', '대소문자도 그대로 견준다');
assert.equal(apiBase('https://api.replix.tv', ''), 'https://api.replix.tv');
assert.equal(apiBase('https://api.replix.tv', 'dev'), 'https://api.replix-dev.site');
assert.equal(apiBase('https://api.replix.tv', 'https://evil.example'), 'https://api.replix.tv', '다른 값은 받지 않는다');

// ── 소스 규칙
assert.match(page, /<meta name="robots" content="noindex">/, '토큰이 실린 주소가 색인되지 않게');
assert.match(page, /<meta name="api-base" content="https:\/\/api\.replix\.tv">/, '기본은 운영 API');
assert.match(page, /readHash\(location\.hash\)/, '토큰은 해시에서만 읽는다');
assert.doesNotMatch(page, /location\.search/, '쿼리(서버로 가는 주소)에서 토큰을 읽지 않는다');
assert.match(page, /'\/api\/v1\/rooms\/stream-overlay\?t=' \+ encodeURIComponent\(token\)/, '묻는 곳은 공개 stream-overlay 하나');
assert.ok((page.match(/if \(token !== hash\.token\) return POLL_MS;/g) || []).length >= 2, '링크가 바뀐 뒤 온 옛 토큰의 답은 버린다');
assert.match(page, /if \(inflight\) inflight\.abort\(\);[\s\S]{0,80}clearTimeout\(timer\);\s*loop\(\);/, '해시가 바뀌면 옛 요청을 거두고 바로 다시 묻는다');
assert.match(page, /if \(mine === gen\) timer = setTimeout\(loop, next\);/, '옛 고리는 다음 차례를 잡지 않는다');
assert.match(page, /receivedAt = \(sentAt \+ performance\.now\(\)\) \/ 2;/, '응답이 오는 데 걸린 시간을 보정한다(보낸 때와 받은 때의 가운데)');
assert.match(page, /function paint\(el, prop, value\) \{[\s\S]{0,240}if \(painted\[i\]\[2\] === value\) return;/, '바뀐 칸만 쓴다');
assert.match(page, /cache: 'no-store', credentials: 'omit'/, '저장하지 않고 쿠키를 싣지 않는다');
assert.doesNotMatch(page, /innerHTML|insertAdjacentHTML|document\.write/, '서버 문자열은 textContent 로만');
assert.doesNotMatch(page, /<script[^>]+src=|<link[^>]+href=["']https?:|@import/, '외부 리소스 0');
assert.doesNotMatch(page, /gtag|analytics|googletagmanager/i, '계측 없음');
assert.doesNotMatch(page, /background:\s*#|body\s*\{[^}]*background(?!:\s*transparent)/, '페이지 배경을 칠하지 않는다(OBS 투명 합성)');
assert.match(page, /var POLL_MS = 2000, CLOSED_POLL_MS = 5000, TICK_MS = 250, STALE_MS = 30000/, '2초마다 묻고 30초 넘게 못 받으면 감춘다');


// ── HP-791 버전 네 가지 — 카드 칸·상태 글자·크기
assert.deepEqual([...VERSIONS], ['corner', 'bar', 'clock', 'chip']);
for (const v of VERSIONS) {
  const card = new RegExp('<div class="ov v-' + v + '-card" data-v="' + v + '" hidden>([\\s\\S]*?)\\n  </div>').exec(page);
  assert.ok(card, v + ' 카드가 있고 처음엔 감춰져 있다');
  for (const cls of ['now'].concat(v === 'chip' ? ['mark', 'ep'] : ['pf', 'ttl', 'ep', 'chip', 'dur', 'rem'])) {
    assert.match(card[1], new RegExp('class="[^"]*\\b' + cls + '\\b'), v + ' 카드에 ' + cls + ' 칸');
  }
  const [w, h] = VERSION_SOURCE[v];
  assert.match(page, new RegExp('html\\.v-' + v + ' \\{ font-size: min\\(calc\\(100vw / ' + w + '\\), calc\\(100vh / ' + h + '\\)\\); \\}'),
    v + ' 글자 크기 기준이 권장 소스 크기(' + w + '×' + h + ')와 같다 — 소스 크기에 맞춰 다시 그린다');
}
assert.doesNotMatch(page, /data-v="(cam|frame)"/, '채택하지 않은 캠 하단 패널·테마 액자는 없다');
assert.match(page, /<html lang="ko" class="v-corner">/, '처음 글자 크기 기준은 코너 카드');
assert.match(page, /useVersion\(hash\.v, hash\.fit\);/, '해시의 버전(과 폭 모드)으로 카드를 고른다');
assert.match(page, /useVersion\(hash\.v, hash\.fit\);\s*setInterval\(render, TICK_MS\);/, '해시의 폭 모드도 처음부터 쓴다');
assert.match(page, /if \(hash\.v !== before\.v \|\| hash\.fit !== before\.fit\) \{ useVersion\(hash\.v, hash\.fit\);/, '해시가 바뀌면 버전·폭 모드도 다시 고른다');
assert.match(page, /document\.documentElement\.className = 'v-' \+ v \+ \(fit \? ' fit' : ''\);/, 'fit=1 은 html.fit 로 건다');
// 치수는 rem 으로만 — px 로 쓰면 소스를 키울 때 같이 커지지 않는다(카드 스타일 구간)
const cardCss = page.slice(page.indexOf('.ov {'), page.indexOf('</style>'));
assert.doesNotMatch(cardCss, /\d+px/, '카드 치수는 rem(소스 크기 비례)으로만 쓴다');

// 상태 다섯 — 카드 data-st·칩·미니 칩 표
const at = (state, extra) => rawView({ ...base, state, positionSec: 1421, durationSec: 3130, ...extra }, 0);
assert.deepEqual(['PLAYING', 'PAUSED', 'AD', 'EPISODE_END', 'IDLE'].map((s) => at(s).st), ['play', 'pause', 'ad', 'end', 'idle']);
assert.deepEqual(['PLAYING', 'PAUSED', 'AD', 'EPISODE_END', 'IDLE'].map((s) => at(s).chip), ['', '멈춤', '광고', '회차 끝', '시작 전'],
  "재생 중에는 칩이 없다 — 멈춤의 ‖ 는 글자가 아니라 그림(HP-817). 광고는 '광고 대기'가 아니라 '광고'(HP-869 — 미니 칩과 같은 말)");
assert.deepEqual(['PLAYING', 'PAUSED', 'AD', 'EPISODE_END', 'IDLE'].map((s) => at(s).mark), ['', '', '광고', '끝', '대기']);
assert.deepEqual(['PLAYING', 'PAUSED', 'AD', 'EPISODE_END', 'IDLE'].map((s) => at(s).markIcon), ['play', 'pause', '', '', ''],
  '미니 칩의 재생 중 ●·멈춤 ‖ 는 그림(HP-817)');
for (const t of [...Object.values(CHIP_TEXT), ...Object.values(MARK_TEXT)]) assert.doesNotMatch(t, /[‖●]/, '상태 기호를 글자로 쓰지 않는다 — ' + t);
assert.deepEqual(MARK_ICON, { PLAYING: 'play', PAUSED: 'pause' });
// HP-869 — 카드 밑 안내 한 줄(광고가 끝나면…·다음 회차를 기다리는 중·스트리머가 재생하면 시작돼요)을 없앴다. 상태는 칩 글자가 말하고, 줄이 붙었다
// 떨어지며 카드 높이가 바뀌지 않는다.
assert.doesNotMatch(code, /noteFor|class="note"|\.note\b/, '안내 한 줄의 함수·칸·스타일이 없다');
assert.doesNotMatch(code, /광고가 끝나면|다음 회차를 기다리는 중|재생하면 시작돼요/, '안내 한 줄의 글이 없다');
for (const t of [...Object.values(CHIP_TEXT), ...Object.values(MARK_TEXT)]) {
  assert.doesNotMatch(t, /·/, '화면 글자에 중간점을 쓰지 않는다 — ' + t);
}
assert.match(page, /paint\(parts\.now, 'textContent', time \|\| '--:--'\);/, '재생 전에는 --:--');
// 회차 표기 — 카드는 S1 E3, 미니 칩은 E3
assert.equal(episodeCode(1, 3), 'S1 E3');
assert.equal(episodeCode(2, 14), 'S2 E14');
assert.equal(episodeCode(null, 3), 'E3', '시즌을 모르면 회차만');
assert.equal(episodeCode(1, null), '', '영화');
assert.equal(at('PLAYING').ep, 'S1 E3');
assert.equal(at('PLAYING').epShort, 'E3');
// 영화·잠정 회차(HP-807 BE 의 contentType·hasEpisodeNumber) — 서버가 자리 채움 회차(시즌 1·1화)를 실어도 회차 칸을 통째로 뺀다.
assert.equal(episodeCode(1, 1, { contentType: 'MOVIE', hasEpisodeNumber: false }), '', '영화는 S1 E1 을 적지 않는다');
assert.equal(episodeCode(1, 1, { contentType: 'MOVIE' }), '', 'contentType 만 와도');
assert.equal(episodeCode(1, 1, { contentType: 'SERIES', hasEpisodeNumber: false }), '', '잠정 회차의 자리 채움');
assert.equal(episodeCode(1, 3, { contentType: 'SERIES', hasEpisodeNumber: true }), 'S1 E3');
assert.equal(episodeCode(1, 3, {}), 'S1 E3', '필드가 없는 옛 서버면 번호만 본다');
const movie = at('PLAYING', { seasonNumber: 1, episodeNumber: 1, contentType: 'MOVIE', hasEpisodeNumber: false });
assert.equal(movie.ep, '');
assert.equal(movie.epShort, '', '미니 칩도 E1 을 적지 않는다');
assert.equal(movie.title, '밤의 정원', '흐름 key 의 제목도 작품명만');
const movieNull = at('PLAYING', { seasonNumber: null, episodeNumber: null, contentType: 'MOVIE', hasEpisodeNumber: false });
assert.equal(movieNull.ep + movieNull.epShort, '', '서버가 null 로 보내도 같다');
assert.equal(at('PLAYING').work, '밤의 정원', '카드의 작품 칸은 작품명만(회차는 옆 칸)');
assert.match(page, /paintText\(parts\.ep, box === cards\.chip \? view\.epShort : view\.ep\);/);
// 진행 막대 — 길이를 알 때만
assert.equal(progressPct(3130, 1565, false, false), 50);
assert.equal(progressPct(3130, 5000, false, false), 100, '넘어도 100');
assert.equal(progressPct(3130, 3000, true, false), 100, '회차 끝은 가득');
assert.equal(progressPct(3130, null, false, true), 0, '시작 전은 0');
assert.equal(progressPct(null, 100, false, false), null, '길이를 모르면 감춘다');
assert.equal(progressPct(0, 100, false, false), null);

// ── HP-817 상태 그림과 글자 획 가운데 맞춤
// 그림은 카드에 미리 두고 hidden 으로만 켠다(innerHTML 없이). 칩 셋은 멈춤 그림 + 글자, 미니 칩은 재생·멈춤 그림 + 글자.
assert.equal((page.match(/<span class="chip"><span class="ic ic-pause" hidden><svg /g) || []).length, 3, '코너·바·시계 칩에 멈춤 그림');
const chipCard = /<div class="ov v-chip-card" data-v="chip" hidden>([\s\S]*?)\n  <\/div>/.exec(page)[1];
assert.match(chipCard, /<span class="mark"><span class="ic ic-play" hidden><svg [\s\S]*?<span class="ic ic-pause" hidden><svg [\s\S]*?<span class="mark-t ink"><\/span><\/span>/);
assert.match(chipCard, /<span class="now ink" data-ink="0123456789"><\/span>/, '시각은 숫자 견본으로 잰다 — 초마다 들썩이지 않게');
assert.match(chipCard, /<span class="dim ep ink" data-ink="E0123456789"><\/span>/);
for (const svg of page.match(/<svg[\s\S]*?<\/svg>/g)) {
  assert.match(svg, /fill="currentColor"/, '그림 색은 글자색을 따른다 — 상태 색 규칙 그대로');
  assert.doesNotMatch(svg, /<image|href|url\(/, '그림은 도형뿐 — 이미지·외부 참조 없음');
}
assert.match(page, /paint\(parts\.chipIc, 'hidden', view\.st !== 'pause'\);/, '칩의 멈춤 그림은 멈춤일 때만');
// 가운데로 맞춘 줄과 작은 카드의 글자는 모두 획으로 맞춘다 — 기준선 줄(코너 카드 시각 줄)·세로로 쌓는 큰 시계 가운데는 빼고
const cardOf = (v) => new RegExp('<div class="ov v-' + v + '-card" data-v="' + v + '" hidden>([\\s\\S]*?)\\n  </div>').exec(page)[1];
for (const v of ['corner', 'bar', 'clock']) {
  assert.match(cardOf(v), /<span class="pf"><span class="pf-t ink"><\/span><\/span><span class="ttl ink"><\/span>/, v + ' 플랫폼 칩·작품명');
  assert.match(cardOf(v), /<span class="chip-t ink"><\/span>/, v + ' 상태 칩 글자');
}
assert.match(cardOf('corner'), /<span class="ep ink"><\/span><span class="chip">/);
assert.match(cardOf('corner'), /<div class="row"><span class="now"><\/span><span class="dim dur"><\/span><span class="dim rem"><\/span><\/div>/, '코너 카드 시각 줄은 기준선 정렬이라 옮기지 않는다');
assert.match(cardOf('bar'), /<span class="now ink" data-ink="0123456789"><\/span><span class="dim dur ink"><\/span><span class="dim rem ink" data-ink="0123456789"><\/span>/);
assert.match(cardOf('clock'), /<div class="foot"><span class="dim dur ink"><\/span><span class="dim rem ink"><\/span>/);
assert.match(page, /\.pf \{ flex: none; display: inline-flex; align-items: center;/, '플랫폼 칩 글자는 안쪽 칸이라 칩 가운데에서 옮긴다');
assert.match(page, /paint\(parts\.pf, 'hidden', !view\.platform\);\s*paintText\(parts\.pfT, view\.platform\);/);
assert.match(page, /paint\(parts\.mark, 'className', 'mark' \+ \(view\.markIcon \? ' has-ic' : ''\)\);/);
// HP-869 — 크기 고정에서는 그림이든 글자든 같은 폭(2.6em)이라 시각의 자리가 움직이지 않는다. fit=1 에서만 그림일 때 최소 폭을 푼다.
assert.match(page, /\.v-chip-card \.mark\.has-ic \{ display: inline-flex;/);
assert.doesNotMatch(page, /(^|\n)\s*\.v-chip-card \.mark\.has-ic \{[^}]*min-width: 0/, '크기 고정에서는 그림일 때도 최소 폭을 풀지 않는다');
assert.match(page, /html\.fit \.v-chip-card \.mark\.has-ic \{ min-width: 0; \}/, 'fit=1 에서는 그림 양옆이 비지 않게 푼다');
assert.match(page, /\.ink \{ transform: translateY\(var\(--ink, 0em\)\); \}/);
assert.match(page, /paint\(box, 'hidden', false\);\s*alignInk\(\);/, '보인 뒤에 잰다(감춘 칸은 상자가 없다)');
assert.match(page, /el\.style\.setProperty\('--ink', '0em'\);[\s\S]{0,800}inkShiftEm\(rect\.top, rect\.height, first\.top, inkCtx\.measureText\(sample\), parseFloat\(cs\.fontSize\)\)/,
  '옮긴 값을 지우고 다시 잰다(transform 이 상자 위치에 섞이지 않게)');
assert.doesNotMatch(page, /text-box(-trim)?\s*:/, 'text-box 는 쓰지 않는다 — OBS 32(Chromium 127)에 없다');
// 옮길 양 — 상자 중심과 획 중심의 차이(em). 숫자처럼 획이 위로 치우치면 양수(아래로)
const m = (fA, aA, aD) => ({ fontBoundingBoxAscent: fA, actualBoundingBoxAscent: aA, actualBoundingBoxDescent: aD });
// 상자 0~44, 글자 영역 윗변 -2, 기준선 = -2+42 = 40, 획 40-31..40+0 → 중심 24.5, 상자 중심 22 → -2.5px / 44px
assert.equal(inkShiftEm(0, 44, -2, m(42, 31, 0), 44), -0.0568);
assert.equal(inkShiftEm(10, 20, 8, m(14, 8, 4), 20), 0, '획이 상자 가운데면 0');
assert.equal(inkShiftEm(0, 0, 0, m(1, 1, 0), 10), 0, '상자가 없으면 옮기지 않는다');
assert.equal(inkShiftEm(0, 10, 0, null, 10), 0);
assert.equal(inkShiftEm(0, 10, 0, m(8, 6, 0), 0), 0);

// 미니 칩 상태 표 — 줄바꿈·잘림 없이(폭을 잡고 nowrap)
assert.match(page, /\.v-chip-card \.mark \{ flex: none; min-width: 2\.6em; text-align: center; white-space: nowrap; word-break: keep-all;/,
  '미니 칩 상태 글자는 폭을 잡고 줄바꿈하지 않는다');
assert.match(page, /\.ov \{[^}]*white-space: nowrap;/, '카드 글자는 줄바꿈하지 않는다');
// ── HP-869 크기 고정 — 카드 폭·줄 높이를 미리 잡는다(실제 크기가 일곱 상태에서 같은지는 headless 크롬으로 잰다 — PR 의 실측 표)
const rule = (sel) => { const m = new RegExp('(?:^|\\n)\\s*' + sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' \\{([^}]*)\\}').exec(page); assert.ok(m, sel + ' 규칙이 있다'); return m[1]; };
assert.match(rule('.v-chip-card'), /width: 296rem;[^}]*height: 64rem;[^}]*display: flex;/, '미니 칩은 폭 296 고정 — 상태·시각이 바뀌어도 칩이 늘지 않는다');
assert.doesNotMatch(rule('.v-chip-card'), /inline-flex/);
assert.match(rule('.v-chip-card .ep'), /margin-left: auto;/, '회차는 오른쪽 끝 — 빈자리가 가운데로 가 시각의 자리가 움직이지 않는다');
assert.match(rule('.v-chip-card .mark'), /min-width: 2\.6em;/);
assert.match(rule('.v-corner-card'), /width: 440rem;/);
assert.match(rule('.v-corner-card .top'), /height: 32rem;/);
assert.match(rule('.v-corner-card .row'), /height: 56rem;[^}]*align-items: baseline;/, '코너 카드 시각 줄은 높이를 잡고 글자 밑선으로 맞춘다');
assert.match(rule('.v-clock-card'), /width: 440rem;/, '큰 시계 폭 400 → 440');
assert.match(rule('.v-clock-card .top'), /height: 32rem;/);
// 큰 시계 회차는 윗줄의 작품명 바로 뒤(2026-11-12 조현빈 결정) — 따로 둔 회차 줄은 영화에서 빈 줄로 남았다. 작품명만 말줄임, 회차는 줄지 않는다
assert.match(cardOf('clock'), /<div class="top"><span class="pf"><span class="pf-t ink"><\/span><\/span><span class="ttl ink"><\/span><span class="ep ink"><\/span><\/div>/,
  '큰 시계 회차는 윗줄 작품명 뒤, 획 맞춤 대상');
assert.doesNotMatch(code, /class="epl"|\.epl\b/, '회차 줄(.epl)이 없다');
assert.match(page, /\.ttl \{ min-width: 0; overflow: hidden; text-overflow: ellipsis;/, '작품명만 말줄임으로 준다');
assert.match(page, /\.ep \{ flex: none;/, '회차는 줄지 않는다');
assert.match(page, /paintText\(parts\.ep, box === cards\.chip \? view\.epShort : view\.ep\);/, '영화면 회차 칸이 빈 글자로 숨는다(paintText)');
assert.match(rule('.v-clock-card .now'), /height: 112rem;[^}]*font-size: calc\(112rem \* var\(--k, 1\)\);/, '큰 숫자는 한 시간이 넘어도 112 그대로(안전장치만 줄인다)');
assert.match(rule('.v-clock-card .foot'), /height: 36rem;/, '아랫줄은 상태 표시가 있든 없든 같은 높이');
assert.deepEqual(VERSION_SOURCE.clock, [480, 360], '큰 시계 권장 소스 440×360 → 480×360');
// 1시간 넘는 회차에서 숫자를 줄이던 규칙(is-long)은 없다 — 카드 높이가 회차 길이에 따라 바뀌었다
assert.doesNotMatch(code, /is-long|var long =/, 'is-long 이 없다');
assert.doesNotMatch(page, /paint\(box, 'className'/, '카드 class 를 회차마다 바꾸지 않는다');
// fit=1 — 폭만 내용만큼, 플레이어 바는 그대로
assert.match(page, /html\.fit \.v-corner-card, html\.fit \.v-clock-card \{ width: max-content; max-width: 440rem; \}/);
assert.match(page, /html\.fit \.v-chip-card \{ width: max-content; max-width: 320rem; \}/, '미니 칩은 소스 폭(360) − 좌우 20 을 넘지 않는다');
assert.doesNotMatch(page, /html\.fit [^{]*\.v-bar-card/, '플레이어 바는 fit 을 보지 않는다');
assert.doesNotMatch(page, /html\.fit [^{]*\{[^}]*height/, 'fit 은 폭만 바꾼다 — 높이는 두 모드가 같다');

// ── HP-869 안전장치 — 넓은 글꼴로 한 줄이 넘칠 때만 그 줄의 글자를 줄인다(카드 크기는 그대로)
assert.equal(digitShape('1:01:07'), '0:00:00');
assert.equal(digitShape('12:34'), digitShape('59:59'), '자릿수가 같으면 같은 모양 — 초마다 다시 재지 않는다');
assert.notEqual(digitShape('59:59'), digitShape('1:00:00'), '자릿수가 바뀌면 다시 잰다');
assert.notEqual(digitShape('전체 58:02멈춤'), digitShape('전체 58:02광고'), '상태 글자가 바뀌면 다시 잰다');
assert.equal(digitShape(null), '');
assert.equal(shrinkFactor(392, 380, 1), 1, '들어가면 그대로');
assert.equal(shrinkFactor(392, 392.4, 1), 1, '반 px 안쪽 차이는 넘친 것으로 보지 않는다');
assert.equal(shrinkFactor(392, 420, 1), 0.924, '넘친 비율만큼 조금 더(1%) 줄인다 — floor(392/420*0.99*1000)/1000');
assert.equal(shrinkFactor(392, 400, 0.9), 0.873, '이미 줄인 배율에서 이어 줄인다');
assert.equal(shrinkFactor(100, 1000, 1), FIT_MIN_K, '0.5 아래로는 줄이지 않는다');
assert.equal(shrinkFactor(0, 10, 1), 1, '상자가 없으면 그대로');
assert.equal(shrinkFactor(NaN, 10, 0.8), 0.8);
const fitBody = /function fitLine\(line\) \{([\s\S]*?)\n    \}/.exec(page);
assert.ok(fitBody, 'fitLine 이 있다');
assert.match(fitBody[1], /var key = fontGen \+ '\|' \+ document\.documentElement\.className \+ '\|' \+ innerWidth \+ 'x' \+ innerHeight \+ '\|' \+ digitShape\(line\.textContent\) \+ '\|' \+ shown;/,
  '다시 재는 열쇠 — 글꼴·폭 모드·소스 크기·숫자를 0 으로 바꾼 글자·보이는 칸');
assert.match(fitBody[1], /if \(line\.getAttribute\('data-fit-key'\) === key\) return;/, '모양이 같으면 다시 재지 않는다(글자 크기가 떨리지 않게)');
assert.match(page, /var FIT_LINES = \{ corner: \['\.top', '\.row'\], clock: \['\.top', '\.now', '\.foot'\], chip: \[''\], bar: \[\] \};/,
  '재는 줄 — 큰 시계의 윗줄·큰 숫자·아랫줄, 코너 카드의 두 줄, 미니 칩 한 줄');
assert.match(page, /paint\(box, 'hidden', false\);\s*alignInk\(\);\s*fitText\(\);/, '보인 뒤에 잰다');
for (const [sel, base] of [['.v-corner-card .now', 56], ['.v-corner-card .dim', 24], ['.v-chip-card .now', 44]]) {
  assert.match(rule(sel), new RegExp('font-size: calc\\(' + base + 'rem \\* var\\(--k, 1\\)\\);'), sel + ' 글자 크기는 --k 를 따른다');
}
assert.doesNotMatch(rule('.v-chip-card'), /padding: calc/, '미니 칩 안쪽 여백은 카드 크기라 줄이지 않는다');
// 법적 게이트 — 포스터·스틸컷·플랫폼 로고(이미지) 없음
// 글꼴(HP-869)의 @font-face 만 url( 을 쓴다 — 그것을 빼고 본다(글꼴 검사는 아래)
const fontFaces = page.match(/@font-face \{[^}]*\}/g) || [];
assert.doesNotMatch(page.replace(/@font-face \{[^}]*\}/g, ''), /<img|<image|background-image|url\(/, '이미지를 싣지 않는다(포스터·로고 없음) — 상태 그림은 인라인 SVG 도형뿐(HP-817)');

// ── HP-869 글꼴 — 숫자·영문 Replix Timer Digits(Source Sans 3), 한글 Replix Timer KR(본고딕). 같은 출처의 파일만, 실은 글꼴이 준비된 뒤 그린다
assert.equal(fontFaces.length, 2, '@font-face 둘');
const faces = Object.fromEntries(fontFaces.map((f) => [/font-family: '([^']+)'/.exec(f)[1], f]));
assert.deepEqual(Object.keys(faces).sort(), ['Replix Timer Digits', 'Replix Timer KR'], "글꼴 이름은 우리 것 — 원본의 예약 이름 'Source' 를 쓰지 않는다(OFL 조건 3)");
for (const [fam, f] of Object.entries(faces)) {
  const src = /src: url\('([^']+)'\) format\('woff2'\)/.exec(f);
  assert.ok(src && /^\/overlay\/fonts\/[A-Za-z]+\.woff2$/.test(src[1]), fam + ' 은 같은 출처의 파일 — ' + (src && src[1]));
  assert.ok(readFileSync(resolve(root, 'docs' + src[1])).length > 1000, fam + ' 파일이 레포에 있다');
  assert.match(f, /font-weight: 600 800;/, fam + ' 굵기는 카드가 쓰는 600~800');
  assert.match(f, /font-display: block;/, fam + ' — 기기 글꼴로 그렸다가 바뀌며 깜빡이지 않게');
}
assert.match(faces['Replix Timer Digits'], /unicode-range: U\+0020-007E, U\+00A0;/, '숫자·영문·기호');
assert.match(faces['Replix Timer KR'], /unicode-range: U\+AC00-D7A3,/, '한글');
assert.doesNotMatch(fontFaces.join(''), /https?:|\/\/fonts\.g/, '구글 글꼴 서버를 부르지 않는다');
for (const lic of ['OFL-SourceSans3.txt', 'OFL-NotoSansKR.txt']) {
  assert.match(read('docs/overlay/fonts/' + lic), /SIL Open Font License, Version 1\.1/, lic + ' — 라이선스 전문을 글꼴 옆에');
}
assert.match(page, /body \{ overflow: hidden; font-family: 'Replix Timer Digits', 'Replix Timer KR', 'Pretendard',/, '실은 글꼴을 앞에, 기기 글꼴을 뒤에(못 받으면 기기 글꼴로)');
assert.match(page, /function render\(\) \{\s*if \(!fontsReady\) return;/, '글꼴이 준비되기 전에는 그리지 않는다');
assert.match(page, /var FONT_WAIT_MS = 3000, fontsReady = false;/, '3초 안에 못 받으면 기기 글꼴로 그린다');
assert.match(page, /setTimeout\(done, FONT_WAIT_MS\);/);
assert.match(page, /document\.fonts\.load\("800 100px 'Replix Timer Digits'", '0123456789:'\), document\.fonts\.load\("700 100px 'Replix Timer KR'", '가'\)\]\)\s*\.then\(done, done\);/,
  '두 글꼴을 부르고, 받지 못했다는 답에도 바로 그린다');
assert.match(page, /fontsReady = true; fontGen\+\+;/, '준비되면 획 맞춤·안전장치를 다시 잰다');

console.log('scripts/test-overlay.mjs: 통과');
