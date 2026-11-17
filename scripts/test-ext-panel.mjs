// scripts/test-ext-panel.mjs — 랜딩의 익스텐션 화면(docs/ext, HP-677)의 소스 규칙 검사. 실행: node scripts/test-ext-panel.mjs
// 구운 파일(film-*.js · panel.css · fonts)은 scripts/ext-panel/bake.mjs 가 만든다 — 여기서는 랜딩·재생기·구운 파일이 서로 맞는지만 본다.
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');
const film = (name) => { const w = {}; new Function('window', read(`docs/ext/film-${name}.js`))(w); return w.RX_FILM; };

const index = read('docs/index.html');
const top = read('docs/js/top.js');
const fx = read('docs/js/friends-fx.js');
const panel = read('docs/ext/panel.html');
const harness = read('scripts/ext-panel/harness.html');

// ① 랜딩이 넣는 장면마다 구운 파일이 있다 — 주소는 data-src 에만 둔다(보이는 자리만 js/ext-panels.js 가 받는다 — 휴대폰은 숨은 자리를 받지 않는다)
//    친구랑 같이 보기 카드(fx-frame)는 js/friends-fx.js 가 섹션이 화면에 들어올 때 받는다(HP-885)
const scenes = [...index.matchAll(/<iframe class="(?:rxp|fx-frame)" data-src="ext\/panel\.html#([a-z]+)"/g)].map((m) => m[1]);
assert.deepEqual(scenes, ['hero', 'friends', 'discord', 'solo', 'live'], '랜딩의 익스텐션 화면은 다섯 자리다');
assert.doesNotMatch(index, /<iframe class="(?:rxp|fx-frame)"[^>]*\ssrc=/, 'iframe 에 src 를 바로 적지 않는다');
for (const name of scenes) {
  const f = film(name);
  assert.ok(f && f.frames.length >= 1, `${name}: 장면이 있다`);
  for (const fr of f.frames) {
    assert.match(fr.h, /^<div id="replix-panel"/, `${name}: 장면은 패널 하나다`);
    assert.doesNotMatch(fr.h, /<script|\son[a-z]+=|javascript:|https?:\/\//i, `${name}: 장면에 스크립트·바깥 주소가 없다`);
  }
}
assert.ok(film('live').loop > 0, 'live 는 스스로 되풀이한다');
assert.equal(film('friends').light, true); assert.equal(film('discord').light, true);

// ② 첫 화면: 패널은 구울 때의 시각표대로 스스로 넘어가고 바깥 커서는 top.js 의 시각에 움직인다 — 두 시각표가 같아야 누르는 순간과 화면이 맞는다.
//    하네스의 대본(SCRIPTS.hero)·구운 파일의 acts·top.js 의 steps 가 같은 시각을 쓴다.
const acts = film('hero').acts;
const scripted = [...harness.slice(harness.indexOf('hero: { len'), harness.indexOf('friends: { len')).matchAll(/\[(\d+), \(\) => RX\./g)].map((m) => Number(m[1]));
assert.deepEqual(acts, scripted, '구운 hero 장면의 시각표가 하네스 대본과 같다(대본을 고쳤으면 다시 굽는다)');
const steps = new Set([...top.matchAll(/^\s*\[(\d+), function/gm)].map((m) => Number(m[1])));
for (const t of acts) assert.ok(steps.has(t), `top.js 대본에 ${t}ms 사건이 있다`);
assert.match(top, /\[0, function \(\) \{ toLobby\(\); P\(function \(r\) \{ r\.play\(\); \}\);/, '한 바퀴의 처음에 패널을 처음부터 돌린다');
assert.match(top, /if \(STILL\) \{\s*whenPanel\(function \(\) \{ P\(function \(r\) \{ r\.still\(\); \}\); \}\);/, '움직임 줄이기면 패널도 마지막 장면에 멈춘다');
// 커서가 가리키는 단추가 구운 장면에 있다
const heroHtml = film('hero').frames.map((f) => f.h).join('');
for (const id of [...top.matchAll(/aimP\('#([\w-]+)'/g)].map((m) => m[1])) assert.ok(heroHtml.includes(`id="${id}"`), `구운 장면에 #${id} 가 있다`);

// ②-1 친구랑 같이 보기(HP-885): 패널은 friends-fx.js 가 한 바퀴의 처음에 play() 로 돌리고, 커서는 초대 복사 시각에 누른다.
//      하네스 대본(SCRIPTS.friends)·구운 acts 가 같고, 커서가 누르는 시각(tap)이 복사 사건과 같고, 그 단추가 구운 장면에 있다.
const fActs = film('friends').acts;
const fScripted = [...harness.slice(harness.indexOf('friends: { len'), harness.indexOf('discord: { len')).matchAll(/\[(\d+), \(\) => RX\./g)].map((m) => Number(m[1]));
assert.deepEqual(fActs, fScripted, '구운 friends 장면의 시각표가 하네스 대본과 같다(대본을 고쳤으면 다시 굽는다)');
assert.ok(film('friends').frames.length > 1 && !film('friends').loop, 'friends 는 여러 장면이고 바깥이 되풀이한다');
const copyAt = Number(harness.match(/\[(\d+), \(\) => RX\.click\('#rx-room-invite-copy'\)\]/g).at(-1).match(/\d+/)[0]);
assert.match(fx, new RegExp('\\[' + copyAt + ', function \\(\\) \\{ tap\\(\\); \\}\\]'), `friends-fx.js 커서가 ${copyAt}ms 에 누른다(초대 복사와 같은 시각)`);
assert.match(fx, /\[0, function \(\) \{[^\n]*P\(function \(r\) \{ r\.play\(\); \}\);/, '한 바퀴의 처음에 friends 패널을 처음부터 돌린다');
assert.match(fx, /r\.still\(\)/, '움직임 줄이기면 friends 패널도 마지막 장면에 멈춘다');
const friendsHtml = film('friends').frames.map((f) => f.h).join('');
for (const id of [...fx.matchAll(/aimP\('#([\w-]+)'/g)].map((m) => m[1])) assert.ok(friendsHtml.includes(`id="${id}"`), `구운 friends 장면에 #${id} 가 있다`);
assert.match(read('docs/ext/panel.js'), /scene === 'hero' \|\| scene === 'friends'\) show\(0\)/, 'friends 패널은 스스로 돌지 않고 바깥을 기다린다');

// ③ 패널 페이지: 색인하지 않고, 같은 폴더의 파일만 부르고, 어디로도 요청하지 않는다
assert.match(panel, /<meta name="robots" content="noindex">/, 'ext/panel.html 은 색인하지 않는다');
assert.doesNotMatch(panel + read('docs/ext/panel.js'), /https?:\/\/|fetch\(|XMLHttpRequest|sendBeacon/, '패널 페이지·재생기는 바깥으로 요청하지 않는다');
const css = read('docs/ext/panel.css');
assert.doesNotMatch(css, /chrome-extension:|https?:\/\//, 'panel.css 에 익스텐션 주소·바깥 주소가 없다');
assert.match(css, /url\("fonts\/ReplixSans-subset\.woff2"\)/, 'panel.css 가 추린 글꼴을 부른다');
assert.ok(existsSync(resolve(root, 'docs/ext/fonts/ReplixSans-subset.woff2')) && existsSync(resolve(root, 'docs/ext/fonts/OFL.txt')), '글꼴과 라이선스가 함께 있다');
// 무게 — 구운 것이 익스텐션 원본을 통째로 실은 것처럼 커지면(규칙·글자 추리기가 빠지면) 알린다
const kb = (p) => statSync(resolve(root, p)).size / 1024;
assert.ok(kb('docs/ext/panel.css') < 150, 'panel.css 는 150KB 미만');
assert.ok(kb('docs/ext/fonts/ReplixSans-subset.woff2') < 80, '글꼴은 80KB 미만');
assert.ok(kb('docs/ext/film-hero.js') < 300, 'film-hero.js 는 300KB 미만');
assert.ok(kb('docs/ext/film-friends.js') < 300, 'film-friends.js 는 300KB 미만');

// ④ 휴대폰 정리형 띠에는 익스텐션에서 없어진 것을 두지 않는다
assert.ok(!/\[활동 기록\]|<b>활동 기록<\/b>|yp-mark|목록에 남겨 두기/.test(index), '없어진 [활동 기록]·REPLIX 글자표·목록에 남겨 두기를 랜딩에 두지 않는다');

console.log('scripts/test-ext-panel.mjs: 통과');
