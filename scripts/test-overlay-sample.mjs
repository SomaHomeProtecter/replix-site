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
console.log('scripts/test-overlay-sample.mjs: 통과');
