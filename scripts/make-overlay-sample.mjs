// 랜딩 스트리머 섹션(#streamer, HP-876)이 띄우는 같이보기 타이머 예시 — docs/overlay/index.html 을 그대로 복사하고,
// 서버에 묻는 fetch 만 예시 값('밤의 정원' S1 E3, 재생 중)으로 바꾼 docs/overlay/sample.html 을 만든다.
// 운영 타이머(overlay/index.html)는 한 줄도 바꾸지 않는다 — OBS 에 걸린 페이지에 가짜 응답 코드를 싣지 않으려는 것이다.
// 위치는 이 페이지를 품은 랜딩의 시계(window.RX_STREAM_CLOCK, js/streamer.js)를 따르고, 없으면 32:56 에서 스스로 흐른다.
// 사용: node scripts/make-overlay-sample.mjs   (검사: scripts/test-overlay-sample.mjs — 원본이 바뀌었는데 다시 만들지 않으면 실패한다)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = ROOT + 'docs/overlay/index.html';
const OUT = ROOT + 'docs/overlay/sample.html';

const STUB = `  <!-- 예시 값 대역(scripts/make-overlay-sample.mjs 가 넣는다) — 서버 대신 예시 응답을 돌려준다 -->
  <script>
  (function () {
    var t0 = performance.now(), BASE = 1976, DUR = 2892;
    function pos() {
      try { if (parent !== window && typeof parent.RX_STREAM_CLOCK === 'function') { var v = parent.RX_STREAM_CLOCK(); if (typeof v === 'number' && isFinite(v)) return v; } } catch (e) {}
      return (BASE + (performance.now() - t0) / 1000) % DUR;
    }
    window.fetch = function () {
      var body = { platform: 'netflix', contentTitle: '밤의 정원', seasonNumber: 1, episodeNumber: 3, contentType: 'SERIES', hasEpisodeNumber: true,
        state: 'PLAYING', rate: 1, positionSec: pos(), durationSec: DUR };
      return Promise.resolve(new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } }));
    };
  })();
  </script>
`;

export function build(src) {
  const i = src.indexOf('  <script>');
  if (i < 0) throw new Error('overlay/index.html 에서 첫 <script> 를 찾지 못했다');
  const head = '<!doctype html>\n<!-- ⚠️ 만든 파일 — 고치지 말고 docs/overlay/index.html 을 고친 뒤 node scripts/make-overlay-sample.mjs 를 다시 돌린다.\n     랜딩 스트리머 섹션(#streamer)의 같이보기 타이머 예시(HP-876). 서버에 묻지 않고 예시 값으로 그린다. -->\n';
  return head + src.slice(src.indexOf('\n') + 1, i) + STUB + src.slice(i);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  writeFileSync(OUT, build(readFileSync(SRC, 'utf8')));
  console.log('docs/overlay/sample.html 을 만들었다');
}
