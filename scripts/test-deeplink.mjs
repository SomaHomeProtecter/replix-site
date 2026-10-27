// 재생 딥링크 규칙(HP-709) — catalog/app/src/watch-pure.js 를 node 로 검사한다(React·DOM 없음).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { watchUrl, watchPlatformOf } from '../catalog/app/src/watch-pure.js';

// 넷플릭스 — 종전 그대로(시각은 초, 내림, 음수 금지)
assert.equal(watchUrl('netflix', '81234567'), 'https://www.netflix.com/watch/81234567');
assert.equal(watchUrl('netflix', '81234567', 61.9), 'https://www.netflix.com/watch/81234567?t=61');
assert.equal(watchUrl('netflix', '81234567', -3), 'https://www.netflix.com/watch/81234567?t=0');
assert.equal(watchUrl('netflix', '81234567', 61.9, '81000000'), 'https://www.netflix.com/watch/81234567?t=61', '넷플릭스는 작품 id 를 쓰지 않는다');
assert.equal(watchUrl('netflix', null), null);
// 라프텔(HP-709) — /player/<작품>/<회차>, 시작 시각 파라미터는 라프텔에 없다
assert.equal(watchUrl('laftel', '99909', 120, '47088'), 'https://laftel.net/player/47088/99909');
assert.equal(watchUrl('laftel', '99909', undefined, 47088), 'https://laftel.net/player/47088/99909', '숫자여도 같다');
assert.equal(watchUrl('laftel', '99909', 120, null), null, '작품 id 없음(잠정 작품) — /player/<회차>/<회차> 는 404 라 추측하지 않는다');
assert.equal(watchUrl('laftel', '99909', 120, ''), null);
assert.equal(watchUrl('laftel', '99909', 120), null);
assert.equal(watchUrl('laftel', null, 120, '47088'), null);
assert.equal(watchUrl('laftel', '9 9', 0, '4/7'), 'https://laftel.net/player/4%2F7/9%209', 'URL 조립 방어(encodeURIComponent)');
// 그 밖(디즈니+ 등)은 종전처럼 null — 사이트는 디즈니+ 딥링크를 만들지 않는다
assert.equal(watchUrl('disney_plus', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 0, 'entity-x'), null);
assert.equal(watchUrl('tving', '1', 0, '1'), null);
// 계측 — URL 호스트로 플랫폼을 적는다(trackWatch)
assert.equal(watchPlatformOf('https://www.netflix.com/watch/81234567?t=1'), 'netflix');
assert.equal(watchPlatformOf('https://laftel.net/player/47088/99909'), 'laftel');
assert.equal(watchPlatformOf('https://evil.com/laftel.net'), null);
assert.equal(watchPlatformOf(null), null);

// 호출부가 작품 id 를 넘기는지(정적) — 자리마다 출처가 다르다
const home = readFileSync(new URL('../catalog/app/src/pages/Home.tsx', import.meta.url), 'utf8');
const title = readFileSync(new URL('../catalog/app/src/pages/Title.tsx', import.meta.url), 'utf8');
const me = readFileSync(new URL('../catalog/app/src/pages/Me.tsx', import.meta.url), 'utf8');
const api = readFileSync(new URL('../catalog/app/src/api.ts', import.meta.url), 'utf8');
const analytics = readFileSync(new URL('../catalog/app/src/analytics.ts', import.meta.url), 'utf8');
assert.equal((home.match(/watchUrl\(top\.platform, top\.platformEpisodeId, [^,)]+, top\.titleId\)/g) || []).length, 2, '홈 순위·순간 행은 titleId');
assert.match(home, /watchUrl\(s\.platform, s\.watchId, hot\?\.at, s\.titleId\)/, '지금 보는 중은 titleId');
assert.match(title, /watchUrl\(c\.platform, ep\.platformEpisodeId, undefined, c\.platformContentId\)/, '작품 상세 — 시각 없는 재생');
assert.match(title, /watchUrl\(c\.platform, ep\.platformEpisodeId, m\.at, c\.platformContentId\)/, '작품 상세 — 순간');
assert.equal((me.match(/watchUrl\(w\.platform, \w+\.platformEpisodeId, \w+\.\w+, w\.platformContentId\)/g) || []).length, 3, '내 활동 세 줄은 Work.platformContentId');
assert.doesNotMatch(api, /function watchUrl\(/, 'watchUrl 본체는 watch-pure.js 로 옮겼다');
assert.match(api, /export \{ watchUrl \} from '\.\/watch-pure\.js'/);
assert.match(api, /titleId: string \| null/, 'RankItem 에 titleId');
assert.match(api, /platformContentId\?: string \| null/, 'MyActivityWork.platformContentId 는 1차 서버엔 없어 optional');
assert.match(analytics, /platform: watchPlatformOf\(url\)/, 'trackWatch 는 호스트로 플랫폼을 적는다');
assert.doesNotMatch(analytics, /platform: 'netflix'/);
console.log('scripts/test-deeplink.mjs: 통과');
