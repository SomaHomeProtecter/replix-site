// scripts/test-bye.mjs — 삭제 설문 페이지(HP-458, replix.tv/bye)의 순수 규칙 + 소스 규칙 검사.
// 빌드 없는 페이지라 이 검사가 회귀망이다. 실행: node scripts/test-bye.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');

// node 에는 document 가 없다 → 모듈이 부트(화면 연결)하지 않아야 import 자체가 성공한다.
const b = await import('../docs/js/bye.js');
const fp = await import('../catalog/app/src/feedback-pure.js');

// ── 선택지: 서버 enum(Replix-be UninstallReason·CoveredElement·WantedService)과 값·순서가 같아야 한다.
//    순서는 설문에 보이는 순서이고, 서버도 이 순서로 정렬해 저장한다.
assert.deepEqual(b.REASONS.map((r) => r.code), [
  'FEW_CHATS', 'BLOCKS_SCREEN', 'SLOW_OR_BUGGY', 'SPOILER_WORRY', 'BAD_VIBE',
  'HARD_TO_USE', 'NO_MY_OTT', 'PRIVACY_WORRY', 'JUST_TRYING',
]);
assert.deepEqual(b.REASONS.map((r) => r.label), [
  '볼 만한 채팅이 적어요', '화면을 가려요', '느리거나 오류가 나요', '스포일러가 걱정돼요', '채팅 분위기가 별로예요',
  '쓰는 법이 어려워요', '쓰는 OTT가 없어요', '개인정보가 걱정돼요', '잠깐 써 봤어요',
]);
assert.deepEqual(b.COVERED.map((o) => o.code), ['CHAT_PANEL', 'DANMAKU', 'FULLSCREEN_CHAT', 'REACTION', 'HEATMAP']);
assert.deepEqual(b.COVERED.map((o) => o.label),
  ['오른쪽 채팅창', '흐르는 채팅(탄막)', '전체화면 채팅 상자', '반응 이모지', '재생바 봉우리']);
assert.deepEqual(b.SERVICES.map((o) => o.code), ['TVING', 'WAVVE', 'COUPANG_PLAY', 'WATCHA', 'YOUTUBE', 'OTHER']);
assert.deepEqual(b.SERVICES.map((o) => o.label), ['티빙', '웨이브', '쿠팡플레이', '왓챠', '유튜브', '그 밖에']);
// 후속 질문을 보일지 — 화면(render)과 요청(buildPayload)이 같은 규칙을 쓴다
assert.deepEqual(b.followUpsShown(['BLOCKS_SCREEN']), { coveredBy: true, wantedServices: false });
assert.deepEqual(b.followUpsShown(['FEW_CHATS', 'NO_MY_OTT']), { coveredBy: false, wantedServices: true });
assert.deepEqual(b.followUpsShown([]), { coveredBy: false, wantedServices: false });

// ── 주소 값: 익스텐션이 삭제 주소에 붙인 버전(v)·설치 후 경과일(d). 형식이 틀리면 버린다 —
//    그대로 보내면 서버가 400 VALIDATION_FAILED로 설문 전체를 거절해, 고른 사유까지 잃는다.
const none = { appVersion: null, installDays: null };
assert.deepEqual(b.parseParams('?v=0.12.0&d=3'), { appVersion: '0.12.0', installDays: 3 });
assert.deepEqual(b.parseParams(''), none);
assert.deepEqual(b.parseParams('?d=0'), { appVersion: null, installDays: 0 }, '설치 당일 삭제');
assert.deepEqual(b.parseParams('?d=3650'), { appVersion: null, installDays: 3650 });
assert.deepEqual(b.parseParams('?v=0.12.0-beta.1'), { appVersion: '0.12.0-beta.1', installDays: null });
assert.deepEqual(b.parseParams('?v=0.12.0%20beta&d=-1'), none, '공백 섞인 버전·음수');
assert.deepEqual(b.parseParams('?v=' + 'a'.repeat(21) + '&d=3651'), none, '21자 버전·범위 밖 경과일');
assert.deepEqual(b.parseParams('?d=3.5'), none);
assert.deepEqual(b.parseParams('?d=1e3'), none);
assert.deepEqual(b.parseParams('?d='), none);

// ── 보내기 조건: 사유 하나 또는 공백 아닌 한마디(서버 FEEDBACK_EMPTY와 같은 조건)
assert.equal(b.canSend({ reasons: [], body: '' }), false);
assert.equal(b.canSend({ reasons: [], body: '  \n\t' }), false);
assert.equal(b.canSend({ reasons: ['JUST_TRYING'], body: '' }), true);
assert.equal(b.canSend({ reasons: [], body: '한마디' }), true);

// ── 요청 본문: 서버 계약(POST /api/v1/feedback, trigger=UNINSTALL — Confluence 1900547 §8.2)
assert.deepEqual(
  b.buildPayload(
    { reasons: ['NO_MY_OTT', 'BLOCKS_SCREEN'], covered: ['DANMAKU'], wanted: ['WAVVE', 'TVING'], body: '  탄막이 자막을 가려요 ' },
    { appVersion: '0.12.0', installDays: 3 },
  ),
  {
    surface: 'WEB', trigger: 'UNINSTALL', score: null, category: null, body: '탄막이 자막을 가려요',
    appVersion: '0.12.0', platform: null, contentId: null, episodeId: null,
    reasons: ['BLOCKS_SCREEN', 'NO_MY_OTT'], coveredBy: ['DANMAKU'], wantedServices: ['TVING', 'WAVVE'],
    installDays: 3,
  },
);
// 후속 선택은 부모 사유를 해제하면 함께 뺀다 — 남기면 서버가 400 FEEDBACK_INVALID_REASONS로 전체를 거절한다.
const orphan = b.buildPayload({ reasons: ['JUST_TRYING'], covered: ['DANMAKU'], wanted: ['TVING'], body: '   ' }, none);
assert.deepEqual([orphan.reasons, orphan.coveredBy, orphan.wantedServices, orphan.body],
  [['JUST_TRYING'], [], [], null]);
// 화면에 없는 코드·중복은 보내지 않는다
const dirty = b.buildPayload(
  { reasons: ['JUST_TRYING', 'HACKED', 'JUST_TRYING'], covered: [], wanted: [], body: '' }, none);
assert.deepEqual(dirty.reasons, ['JUST_TRYING']);
// 한마디는 1000자까지(서버 @Size(max=1000))
assert.equal(b.MAX_BODY, 1000);
assert.equal(b.buildPayload({ reasons: [], covered: [], wanted: [], body: '가'.repeat(1200) }, none).body.length, 1000);
// 상한에 걸린 이모지(서로게이트 쌍)는 반쪽만 남기지 않고 통째로 뺀다 — 반쪽 글자는 서버 저장을 깨뜨린다.
const cut = b.buildPayload({ reasons: [], covered: [], wanted: [], body: '가'.repeat(999) + '😀' }, none).body;
assert.equal(cut, '가'.repeat(999));

// ── 보내기: fetch 를 바꿔 끼워 요청 모양·결과·시간 초과를 검사한다
const payload = b.buildPayload({ reasons: ['JUST_TRYING'], covered: [], wanted: [], body: '' }, none);
let seen;
assert.deepEqual(
  await b.send('https://api.example', payload, async (url, init) => { seen = { url, init }; return { ok: true, status: 201 }; }, 1000),
  { ok: true, status: 201 });
assert.equal(seen.url, 'https://api.example/api/v1/feedback');
assert.equal(seen.init.method, 'POST');
assert.deepEqual(seen.init.headers, { 'Content-Type': 'application/json' }, '익명 — Authorization 없음');
assert.deepEqual(JSON.parse(seen.init.body), payload, '보낸 것 = 서버 계약 모양의 요청 본문');
assert.equal('credentials' in seen.init, false, '쿠키를 싣지 않는다(기본값 same-origin → 교차 출처에는 안 실림)');
assert.ok(seen.init.signal instanceof AbortSignal, '시간 초과로 끊을 수 있어야 한다');
assert.deepEqual(await b.send('https://api.example', payload, async () => ({ ok: false, status: 429 }), 1000),
  { ok: false, status: 429 });
assert.deepEqual(await b.send('https://api.example', payload, async () => { throw new TypeError('offline'); }, 1000),
  { ok: false, status: 0 }, '네트워크 실패');
// 응답이 끝내 오지 않으면 시간을 넘겨 끊고 실패로 알린다 — 버튼이 "보내는 중"에 갇히지 않게
const hang = (url, init) => new Promise((resolve, reject) => {
  init.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
});
assert.deepEqual(await b.send('https://api.example', payload, hang, 20), { ok: false, status: 0 }, '시간 초과');

// ── 문구: HP-426 웹 피드백과 같은 글자(catalog/app/src/feedback-pure.js가 정본)
assert.equal(b.errorMessage(429), fp.errorMessage(429));
assert.equal(b.errorMessage(500), fp.errorMessage(500));
assert.equal(b.errorMessage(0), fp.errorMessage(500), '네트워크 실패도 일반 실패 문구');
assert.equal(b.THANKS, fp.THANKS);
assert.equal(b.placeholderFor(['FEW_CHATS', 'JUST_TRYING']), '어떤 작품이었는지 적어 주시면 그 작품부터 채워 볼게요.');
assert.equal(b.placeholderFor(['JUST_TRYING']), '어떤 장면에서 무엇이 불편했는지 적어 주세요.');
assert.equal(b.placeholderFor([]), '어떤 장면에서 무엇이 불편했는지 적어 주세요.');
assert.equal(b.summaryOf(['NO_MY_OTT', 'BLOCKS_SCREEN']), '보낸 이유: 화면을 가려요, 쓰는 OTT가 없어요');
assert.equal(b.summaryOf([]), '적어 주신 내용을 잘 받았어요.');

// ── 소스 규칙
const html = read('docs/bye/index.html');
assert.match(html, /<meta name="robots" content="noindex">/, '검색에 잡힐 페이지가 아니다');
// 운영 DB로 보낸다 — 운영 콘솔(PROD)이 읽는 곳. 개발 서버로 보내면 실제 사용자의 삭제 사유가 시험 데이터에 섞인다.
assert.match(html, /<meta name="api-base" content="https:\/\/api\.replix\.tv">/);
assert.doesNotMatch(html, /analytics\.js|amplitude/i, '계측은 분석 동의 방식이 정해질 때까지 싣지 않는다');
assert.match(html, /https:\/\/chromewebstore\.google\.com\/detail\/replix\/lgfllmbombkdbebcepigebnbmeaacikp"/);
assert.doesNotMatch(html, /\/reviews/, '스토어 평가 링크는 두지 않는다(다시 설치하기만)');
assert.match(html, /<script type="module" src="\/js\/bye\.js"><\/script>/);
// 보낸 뒤 제목은 두 줄로 나눠 그리지만 글자는 HP-426 감사 문구 그대로여야 한다
const doneTitle = /<h2 id="bye-done-title"[^>]*>([\s\S]*?)<\/h2>/.exec(html);
assert.ok(doneTitle, '보낸 뒤 제목이 있어야 한다');
assert.equal(doneTitle[1].replace(/<[^>]+>/g, ''), b.THANKS);
assert.match(html, /<textarea id="bye-body"[^>]*maxlength="1000"/, '입력 상한 = 서버 상한');
const js = read('docs/js/bye.js');
assert.doesNotMatch(js, /Authorization|credentials:/, '익명 — 토큰·쿠키를 싣지 않는다');
assert.doesNotMatch(js, /innerHTML|insertAdjacentHTML/, '사용자 입력·문구를 HTML로 해석하지 않는다');
assert.doesNotMatch(js, /netflix\.com|disneyplus\.com/, '넷플릭스·디즈니+ 서버로 요청하지 않는다');
// 화면 연결(boot)은 DOM 이 없어 node 에서 돌릴 수 없다 — 깨지면 설문을 통째로 잃는 연결만 글자로 못박는다
assert.match(js, /var payload = buildPayload\(state, params\);\s*send\(api, payload,/, '보내는 것은 계약 모양의 요청 본문');
assert.match(js, /if \(result\.ok\) done\(payload\.reasons\);/, '요약은 실제로 보낸 사유로');
assert.match(js, /if \(sending \|\| !canSend\(state\)\) return;/, '두 번 보내지 않는다');
assert.match(js, /if \(sending\) return;/, '보내는 동안 고른 것을 바꾸지 않는다');
assert.match(js, /byId\('bye-covered'\)\.hidden = !shown\.coveredBy;/);
assert.match(js, /byId\('bye-services'\)\.hidden = !shown\.wantedServices;/);

console.log('scripts/test-bye.mjs: 통과');
