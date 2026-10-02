// scripts/test-mobile-polish.mjs — 휴대폰 다듬기(HP-478) 소스 규칙 검사. 실행: node scripts/test-mobile-polish.mjs
// ① 처리방침 표 가로 스크롤 ② 동의 배너 휴대폰 높이 ③ 작은 터치 대상 ④ 링크 미리보기(og)·아이콘.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');
const bytes = (p) => readFileSync(resolve(root, p));
/* PNG 크기 — IHDR 의 가로·세로(바이트 16~23). */
const pngSize = (p) => { const b = bytes(p); assert.equal(b.toString('ascii', 1, 4), 'PNG', `${p} 는 PNG`); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };

// ① 처리방침 — 표는 전부 가로 스크롤 상자 안에 있다. 넓은 표(국외 이전 6열)가 휴대폰에서 화면을 넘으면
//    body overflow-x:hidden 으로는 페이지 전체가 좌우로 흔들리는 것을 못 막는다(2026-10-02 실측 287px).
const privacy = read('docs/privacy.html');
const tables = (privacy.match(/<table class="doc-table">/g) || []).length;
const wrapped = (privacy.match(/<div class="doc-table-scroll">\s*<table class="doc-table">/g) || []).length;
assert.ok(tables >= 4, `처리방침 표가 있다(${tables})`);
assert.equal(wrapped, tables, '모든 표가 .doc-table-scroll 안에 있다');
assert.equal((privacy.match(/<div class="doc-table-scroll">/g) || []).length, (privacy.match(/<\/table>\s*<\/div>/g) || []).length, '상자는 표마다 닫힌다');
assert.match(privacy, /\.doc-table-scroll \{[^}]*overflow-x: auto/, '상자가 가로로 스크롤된다');

// ② 동의 배너 — 휴대폰 폭에서만 여백·글자·버튼을 줄인다. 문구는 그대로(HP-466 법적 근거 — test-analytics 가 문구를
//    검사한다), 접거나 말줄임하지 않는다.
const analytics = read('docs/js/analytics.js');
const css = /var BANNER_CSS = ([\s\S]*?);\n/.exec(analytics)[1];
const narrow = /@media \(max-width:560px\)\{(.*?)\}'/.exec(css.replace(/'\s*\+\s*'/g, ''));
assert.ok(narrow, '휴대폰 폭 규칙이 있다');
const fs = /#rx-consent\{[^}]*font-size:([\d.]+)px/.exec(narrow[1]);
assert.ok(fs && Number(fs[1]) >= 12 && Number(fs[1]) < 14, `휴대폰 글자는 12px 이상 14px 미만(${fs && fs[1]})`);
assert.doesNotMatch(css, /line-clamp|text-overflow|max-height/, '배너 문구를 자르거나 접지 않는다');

// ③ 터치 대상 — 보이는 점·숫자는 그대로 두고 누르는 영역을 24px 이상으로(WCAG 2.5.8).
const home = read('catalog/app/src/pages/Home.tsx');
const title = read('catalog/app/src/pages/Title.tsx');
const dots = /role="tablist" aria-label="빌보드 작품">([\s\S]*?)<\/div>\n  \) : null/.exec(home.slice(home.indexOf('const dots')));
assert.ok(dots, '빌보드 점 묶음');
// 버튼 태그 안 onClick 의 '=>' 때문에 [^>]* 로는 className 까지 못 간다 — 버튼의 className 문자열을 직접 본다.
const dotButton = /<button[\s\S]*?className="([^"]*)"/.exec(dots[1]);
assert.ok(dotButton, '빌보드 점 버튼의 className');
assert.match(dotButton[1], /\bh-6\b/, '빌보드 점 버튼은 높이 24px');
assert.match(dotButton[1], /\bpx-\[9px\]/, '빌보드 점 버튼은 점 양옆 9px — 폭 24px 이상, 이웃과 겹치지 않는다');
assert.match(dots[1], /<span[^>]*h-\[6px\] rounded-full/, '보이는 점(6px)은 안쪽 span 이 그대로 그린다');
assert.match(title, /className=\{`num min-w-0 flex-1 py-\[8px\] -my-\[8px\] /, '회차 번호는 위아래 8px 를 더해 24px 이상(9px 글자도 25px), 배치는 음수 여백으로 그대로');
assert.match(title, /className="absolute top-1\/2 size-6 -translate-x-1\/2 -translate-y-1\/2"/, '순간 점 버튼은 24px');

// ④ 링크 미리보기(og)·아이콘 — 두 표면 모두. 이미지는 Replix 로고 자산만(작품 포스터·스틸 금지, CLAUDE.md §7 ⑥).
for (const [path, url] of [['docs/index.html', 'https://replix.tv/'], ['catalog/app/index.html', 'https://replix.tv/catalog/']]) {
  const h = read(path);
  for (const p of ['og:title', 'og:description', 'og:image', 'og:url', 'og:type', 'og:site_name', 'og:locale']) {
    assert.match(h, new RegExp(`<meta property="${p}" content="[^"]+"`), `${path} ${p}`);
  }
  assert.match(h, new RegExp(`<meta property="og:url" content="${url.replace(/[/.]/g, '\\$&')}"`), `${path} og:url = ${url}`);
  assert.match(h, /<meta property="og:image" content="https:\/\/replix\.tv\/assets\/og\/replix-og\.png"/, `${path} og:image 는 절대 주소의 로고 이미지`);
  assert.match(h, /<meta name="twitter:card" content="summary_large_image"/, `${path} twitter:card`);
  assert.match(h, /<meta name="theme-color" content="#faf9f9"/, `${path} theme-color = 페이지 바탕색`);
  assert.match(h, /<link rel="icon" href="\/favicon\.ico" sizes="any"/, `${path} favicon`);
  assert.match(h, /<link rel="apple-touch-icon" href="\/apple-touch-icon\.png"/, `${path} apple-touch-icon`);
  assert.doesNotMatch(h, /og:image[^>]*(still|frame-hero|poster)/i, `${path} og 이미지에 작품 이미지를 쓰지 않는다`);
}
assert.deepEqual(pngSize('docs/assets/og/replix-og.png'), [1200, 630], 'og 이미지 1200×630');
assert.deepEqual(pngSize('docs/apple-touch-icon.png'), [180, 180], 'apple-touch-icon 180×180');
const ico = bytes('docs/favicon.ico');
assert.deepEqual([ico.readUInt16LE(0), ico.readUInt16LE(2)], [0, 1], 'favicon.ico 는 ICO');
assert.ok(ico.readUInt16LE(4) >= 2, 'favicon.ico 는 여러 크기(16·32·48)');
assert.ok(existsSync(resolve(root, 'docs/assets/og/README.md')), 'og 이미지의 출처(로고 자산)·만드는 법을 남긴다');

console.log('scripts/test-mobile-polish.mjs: 통과');
