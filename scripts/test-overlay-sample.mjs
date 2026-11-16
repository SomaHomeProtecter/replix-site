// docs/overlay/sample.html 이 지금의 docs/overlay/index.html 로 만든 결과와 같은지 본다(HP-876).
// 다르면 운영 타이머를 고친 뒤 사본을 다시 만들지 않은 것이다 — node scripts/make-overlay-sample.mjs 를 돌린다.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from './make-overlay-sample.mjs';
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const want = build(readFileSync(ROOT + 'docs/overlay/index.html', 'utf8'));
const have = readFileSync(ROOT + 'docs/overlay/sample.html', 'utf8');
if (want !== have) { console.error('scripts/test-overlay-sample.mjs: 실패 — overlay/sample.html 이 낡았다. node scripts/make-overlay-sample.mjs 를 돌린다'); process.exit(1); }
if (!/name="robots" content="noindex"/.test(have)) { console.error('scripts/test-overlay-sample.mjs: 실패 — noindex 가 없다'); process.exit(1); }

// 휴대폰 줄이기(HP-876, 2026-11-17 아이폰 사파리에서 잘림) — 무대 줄이기(fit)는 타이머가 그려지기를 기다리지 않는다.
// 타이머 iframe 을 lazy 로 두면 사파리는 줄이기 전 무대(1194px)에서 화면 밖이라 받지 않았고, 그래서 줄이기도 영영 돌지 않았다.
const sj = readFileSync(ROOT + 'docs/js/streamer.js', 'utf8');
const lay = sj.slice(sj.indexOf('var layout = function'), sj.indexOf('var cr = castNumRect();'));
if (!/^\s+fit\(\);/m.test(lay)) { console.error('scripts/test-overlay-sample.mjs: 실패 — streamer.js 가 타이머를 읽기 전에 fit() 을 부르지 않는다'); process.exit(1); }
const ix = readFileSync(ROOT + 'docs/index.html', 'utf8');
const tag = (ix.match(/<iframe src="overlay\/sample\.html[^>]*>/) || [''])[0];
if (!tag || /loading="lazy"/.test(tag)) { console.error('scripts/test-overlay-sample.mjs: 실패 — 랜딩의 타이머 iframe 은 lazy 가 아니어야 한다'); process.exit(1); }
console.log('scripts/test-overlay-sample.mjs: 통과');
