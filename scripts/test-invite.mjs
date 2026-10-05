// scripts/test-invite.mjs — 초대 착지(/invite)와 디스코드 연결 착지(/together)의 순수 함수 + 소스 규칙 검사(HP-497).
// 두 페이지는 외부 리소스 0 원칙의 단일 파일이라 빌드도 import 도 없다 — 이 검사가 회귀망이다.
// 휴대폰 판정 사본의 대조는 test-install-guide.mjs 가 한다. 실행: node scripts/test-invite.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');

const invite = read('docs/invite/index.html');
const together = read('docs/together/index.html');
const STORE = 'https://chromewebstore.google.com/detail/replix/lgfllmbombkdbebcepigebnbmeaacikp';

// 화면 글자 — HTML 주석·<style>을 빼고, <script> 안에서는 주석을 뺀 문자열 리터럴만, 나머지는 태그를 뺀 본문.
function screenText(html) {
  const doc = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<style>[\s\S]*?<\/style>/g, '');
  const literals = [...doc.matchAll(/<script>([\s\S]*?)<\/script>/g)].flatMap(([, js]) =>
    js.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1').match(/'(?:[^'\\\n]|\\.)*'/g) || []);
  return doc.replace(/<script>[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ') + '\n' + literals.join('\n');
}

// ── 방 요약 → 문구: 초대 페이지의 inviteCopy:start~end 구간을 꺼내 돌린다.
const block = /\/\* inviteCopy:start \*\/([\s\S]*?)\/\* inviteCopy:end \*\//.exec(invite);
assert.ok(block, '초대 페이지에 문구 구간(inviteCopy:start~end)이 있다');
const { formatEpisodeLabel, inviteCopy } = new Function(`${block[1]}; return { formatEpisodeLabel, inviteCopy };`)();

// 회차 표기 — 익스텐션 replix-net.js formatEpisodeLabel 과 같은 규칙(사례도 익스텐션 replix-net.test.js 와 같다).
assert.equal(formatEpisodeLabel(8, 35), '시즌8 35화');
assert.equal(formatEpisodeLabel(1, 3), '3화', '시즌 1은 군더더기라 뺀다');
assert.equal(formatEpisodeLabel(null, 3), '3화', '시즌 미상도 회차만');
assert.equal(formatEpisodeLabel(8, null), '', '영화 — 회차 개념이 없다');
assert.equal(formatEpisodeLabel(null, null), '');

const INSTALL = '리플릭스 익스텐션을 설치하면 이 방으로 바로 들어가요.';
assert.deepEqual(inviteCopy({ platform: 'netflix', platformEpisodeId: '81234567', contentTitle: '흑백요리사',
  seasonNumber: 1, episodeNumber: 2, onlineCount: 3 }), { title: '『흑백요리사』 2화', desc: '3명이 함께 보고 있어요. ' + INSTALL },
'설계 §3.1 응답 예시 그대로');
assert.equal(inviteCopy({ contentTitle: '오징어 게임', seasonNumber: 2, episodeNumber: 3, onlineCount: 1 }).title,
  '『오징어 게임』 시즌2 3화');
assert.deepEqual(inviteCopy({ contentTitle: '헤어질 결심', seasonNumber: null, episodeNumber: null, onlineCount: 1 }),
  { title: '『헤어질 결심』', desc: '1명이 함께 보고 있어요. ' + INSTALL }, '영화는 회차 표기 없이 작품명만(뒤 공백 없음)');
assert.equal(inviteCopy({ contentTitle: '흑백요리사', episodeNumber: 2, onlineCount: 0 }).desc, INSTALL, '0명이면 인원 문장을 뺀다');
assert.equal(inviteCopy({ contentTitle: '흑백요리사', episodeNumber: 2 }).desc, INSTALL, '인원이 없어도 뺀다');
// 요약 실패(404·네트워크·시간 초과 = null)나 작품명이 빈 응답은 일반 제목으로.
const FALLBACK = { title: '리플릭스 그룹방 초대', desc: INSTALL };
assert.deepEqual(inviteCopy(null), FALLBACK);
assert.deepEqual(inviteCopy({}), FALLBACK);
assert.deepEqual(inviteCopy({ contentTitle: '  ', episodeNumber: 2 }), FALLBACK);
// 문구는 서버 문자열을 글자 그대로 담는다 — 막는 곳은 화면에 넣는 자리(textContent, 아래 소스 규칙).
assert.equal(inviteCopy({ contentTitle: '<img src=x onerror=alert(1)>' }).title, '『<img src=x onerror=alert(1)>』');

// ── 초대 페이지(PC 경로) 소스 규칙
assert.match(invite, /var WAIT_MS = 2500;/, 'PC 는 2.5초 동안 익스텐션 가로채기를 기다린다');
assert.match(invite, /setTimeout\(function \(\) \{ fetchPreview\(t, showInstall\); \}, WAIT_MS\)/,
  '기다린 뒤에야 방 요약을 묻는다 — 설치자의 탭은 그 전에 넘어간다');
assert.match(invite, /<main id="go" hidden>[\s\S]*?<p class="msg">리플릭스로 이동하고 있어요…<\/p>/, '기다리는 동안의 문구');
assert.match(invite, /<meta name="api-base" content="https:\/\/api\.replix\.tv">/, '방 요약은 운영 API 에 묻는다');
assert.match(invite, /'\/api\/v1\/rooms\/invite-preview\?t=' \+ encodeURIComponent\(token\)/, '공개 요약 API(설계 §3.1)');
assert.equal((invite.match(/fetch\(/g) || []).length, 1, '나가는 요청은 방 요약 하나뿐');
assert.match(invite, /credentials: 'omit'/, '공개 GET — 쿠키를 싣지 않는다');
assert.match(invite, /var PREVIEW_TIMEOUT_MS = \d+;/, '요약이 늦으면 요약 없이 안내한다');
assert.match(invite, /title\.textContent = copy\.title;/, '작품명은 textContent 로만 넣는다(HTML 주입 방지)');
assert.match(invite, /getElementById\('desc'\)\.textContent = copy\.desc;/);
assert.match(invite, new RegExp(`<a class="btn cta" href="${STORE}" target="_blank"`),
  '[크롬에 추가]는 웹 스토어를 새 탭으로 — 이 탭이 남아 있어야 설치 뒤 익스텐션이 이어 간다');
assert.match(invite, /<p class="sub">설치가 끝나면 이 페이지에서 자동으로 이어져요\.<\/p>/);
assert.match(invite, /openLink\.textContent = '이미 설치했어요\. ' \+ NAV\[pk\]\.name \+ '에서 열기';\s*openLink\.href = url;/,
  '보조 링크는 예전 이동 주소(해시 토큰 포함) 그대로');

// ── 디스코드 연결 페이지 소스 규칙
assert.match(together, /var WAIT_MS = 2500;/, '초대 페이지와 같은 대기 시간');
assert.match(together, /<main id="go" hidden>[\s\S]*?<p class="msg">리플릭스로 이동하고 있어요…<\/p>/);
assert.match(together, /if \(new URLSearchParams\(location\.search\)\.get\('p'\)\)/, '연결 토큰 p 가 있을 때만 안내한다');
assert.match(together, /<main id="bad" hidden>/, 'p 가 없으면 잘못된 링크 안내');
assert.match(together, /if \(isMobileDevice\(/, '휴대폰 판정으로 갈린다');
assert.match(together, /<main id="mobile" hidden>[\s\S]*?id="copy"/, '휴대폰은 PC 안내 + 링크 복사');
assert.match(together, /<h1 class="title" id="title" tabindex="-1">리플릭스 익스텐션이 설치된 PC 크롬에서 열어 주세요<\/h1>/);
assert.match(together, new RegExp(`<a class="btn cta" href="${STORE}" target="_blank"`));
assert.match(together, /<p class="sub">설치가 끝나면 이 페이지에서 자동으로 이어져요\.<\/p>/);
assert.doesNotMatch(together, /fetch\(|XMLHttpRequest|sendBeacon/, '연결 토큰을 어디로도 보내지 않는다(익스텐션만 읽는다)');

// ── 두 페이지 공통
for (const [label, html] of [['초대 페이지', invite], ['연결 페이지', together]]) {
  assert.match(html, /<meta name="robots" content="noindex">/, `${label}: 검색 제외(토큰이 실린 주소)`);
  assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+href=/, `${label}: 외부 리소스 0`);
  assert.doesNotMatch(html, /<img\b/, `${label}: 이미지를 싣지 않는다 — 작품 정보는 작품명과 회차 번호 글자만(CLAUDE.md §7 ⑥)`);
  assert.doesNotMatch(html, /analytics|amplitude|gtag/i, `${label}: 계측하지 않는다(토큰이 실린 페이지)`);
  assert.doesNotMatch(html, /innerHTML|insertAdjacentHTML|document\.write/, `${label}: HTML 문자열로 그리지 않는다`);
  assert.match(html, /target="_blank" rel="noopener" referrerpolicy="strict-origin"/,
    `${label}: 웹 스토어엔 출처만 — 토큰이 실린 주소를 리퍼러로 넘기지 않는다`);
  const text = screenText(html);
  assert.doesNotMatch(text, /·/, `${label}: 화면 글자에 중간점을 쓰지 않는다`);
  assert.doesNotMatch(text, /확장/, `${label}: 제품 호칭은 '익스텐션'`);
}

console.log('scripts/test-invite.mjs: 통과');
