import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const index = read('docs/index.html');
const main = read('docs/js/main.js');
const publicStats = read('docs/js/publicStats.js');

assert.match(index, /<meta name="api-base" content="https:\/\/api\.replix\.tv">/,
  '운영 공개 사이트는 PROD API를 사용해야 한다');
assert.match(index, /id="chart" style="display:none"/,
  '별도 재노출 결정 전 인기 작품 섹션은 숨김 상태여야 한다');
assert.doesNotMatch(main, /^import ['"]\.\/chart\.js['"];?$/m,
  '숨긴 chart 모듈을 정적으로 import하면 안 된다');
assert.match(main, /getComputedStyle\(chartSection\)\.display !== 'none'[\s\S]*import\('\.\/chart\.js'\)/,
  '실제로 노출한 배포에서만 chart 모듈을 동적으로 불러야 한다');
assert.match(publicStats, /mostWatched:\s*\[\]/,
  '공개 통계 요청 실패 시 풍부한 콘텐츠는 빈 배열로 안전하게 폴백해야 한다');

console.log('scripts/test-runtime-policy.mjs: 통과');
