// scripts/test-hero.mjs — 랜딩 첫 화면(#top) 연출 안전장치(HP-666)의 소스 규칙 검사.
// 2026-10-17: 배포 직후 새로고침한 방문자에게 새 HTML + 캐시에 남은 옛 main.js(top.js 를 부르지 않던 판)가 섞여 연출이 돌지 않았고,
// 첫 화면에 Replix 패널·자막·재생 막대 없이 영상만 남았다(GitHub Pages 는 모든 파일에 max-age=600). 실행: node scripts/test-hero.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');

const index = read('docs/index.html');
const head = index.slice(0, index.indexOf('</head>'));
const top = read('docs/js/top.js');

// ① HTML 만 연출을 부른다 — main.js 가 옛 판으로 캐시돼 있어도 연출은 돌고, top.js 를 받지 못해도 main.js 묶음(섹션 등장·FAQ·계측)은
//    따로 돈다. main.js 가 import 하면 top.js 하나가 실패할 때 묶음 전체가 실행되지 않는다(2026-10-17 막아 보고 확인).
assert.match(head, /<script type="module" src="js\/top\.js"><\/script>/, '<head> 가 js/top.js 를 직접 부른다');
assert.doesNotMatch(read('docs/js/main.js'), /^import '\.\/top\.js';/m, 'main.js 는 top.js 를 부르지 않는다');

// ② 연출은 준비가 끝나면 시작 표식을 단다 — 움직임 줄이기(STILL) 갈래보다 앞에서
const live = top.indexOf("document.documentElement.classList.add('hx-live')");
assert.ok(live > 0, 'top.js 가 시작 표식(hx-live)을 단다');
assert.ok(live < top.indexOf('if (STILL) {'), '표식은 움직임 줄이기 갈래보다 앞 — 두 갈래 모두 표식을 단다');

// ③ 안전장치: 표식이 없으면 닫힘을 풀어 패널이 열린 정지 화면으로 — 첫 그림은 여전히 닫힘(is-shut)이다
assert.match(head, /setTimeout\(function \(\) \{\s*if \(document\.documentElement\.classList\.contains\('hx-live'\)\) return;[\s\S]{0,160}classList\.remove\('is-shut'\)/,
  '<head> 안전장치가 시작 표식이 없을 때 닫힘을 푼다');
assert.match(index, /<div class="hx-screen hx-enter ys is-shut"/, '첫 그림은 닫힌 넷플릭스 화면 — 연출이 0.35초에 연다');
assert.match(index, /<noscript><style>\.ys\.hx-screen\.is-shut \{ --open: 1; \}<\/style><\/noscript>/, '스크립트가 아예 없으면 noscript 가 연다');

console.log('scripts/test-hero.mjs: 통과');
