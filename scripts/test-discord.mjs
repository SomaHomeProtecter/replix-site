// scripts/test-discord.mjs — 디스코드에서 같이 보기 소개(HP-497, 2026-10-05 조현빈 요청)의 소스 규칙 검사.
// 랜딩 #discord 섹션과 /discord/ 페이지는 같은 [디스코드에 추가] 주소를 쓴다 — 운영 봇 id 를 바꾸면 두 곳을 함께.
// 실행: node scripts/test-discord.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');

const landing = read('docs/index.html');
const page = read('docs/discord/index.html');
// 서버 DiscordBotRunner.INVITE_PERMISSIONS · 익스텐션 config.js DISCORD_PERMISSIONS 와 같은 값 —
// 채널 보기·메시지 보내기·링크 첨부(카드) + 채널 관리·음성 채널 상태 설정(채널 상태 글자).
const PERMISSIONS = '281474976730128';

const installLinks = (html) => [...html.matchAll(/<a\b[^>]*\bdata-discord-install\b[^>]*>/g)].map(([tag]) => tag);
const hrefOf = (tag) => (/\bhref="([^"]+)"/.exec(tag) || [])[1].replace(/&amp;/g, '&');

// ── 봇 추가 주소: 두 곳이 같고, 운영 공개 봇을 가리킨다
const links = [...installLinks(landing), ...installLinks(page)];
assert.equal(installLinks(landing).length, 1, '랜딩에는 [디스코드에 추가]가 하나');
assert.ok(installLinks(page).length >= 1, '/discord/ 에도 [디스코드에 추가]가 있다');
const hrefs = new Set(links.map(hrefOf));
assert.equal(hrefs.size, 1, '모든 [디스코드에 추가]가 같은 주소를 쓴다');
const url = new URL([...hrefs][0]);
assert.equal(url.origin + url.pathname, 'https://discord.com/oauth2/authorize');
assert.match(url.searchParams.get('client_id') || '', /^\d{17,20}$/,
  '운영 봇 id 자리표시가 남아 있다 — 운영 공개 봇을 만든 뒤 채운다');
assert.notEqual(url.searchParams.get('client_id'), '1556533399718592525', 'dev 봇(비공개)을 넣으면 일반 사용자는 추가할 수 없다');
assert.equal(url.searchParams.get('scope'), 'bot applications.commands');
assert.equal(url.searchParams.get('permissions'), PERMISSIONS);
for (const tag of links) {
  assert.match(tag, /target="_blank"/, '디스코드는 새 탭으로 연다');
  assert.match(tag, /rel="noopener"/, '새 탭에 이 페이지를 넘기지 않는다');
}

// ── 랜딩: 함께 보기(#rooms) 바로 뒤, '자세히 보기'는 /discord/
const rooms = landing.indexOf('id="rooms"');
const discord = landing.indexOf('id="discord"');
const scenes = landing.indexOf('id="scenes"');
assert.ok(rooms > 0 && discord > rooms && discord < scenes, '디스코드 섹션은 함께 보기와 인기 장면 사이');
assert.equal(landing.slice(rooms, discord).split('<section').length - 1, 1,
  '함께 보기와 디스코드 섹션 사이에 다른 섹션이 없다(잘라 낸 구간의 <section 은 디스코드 섹션 자신의 여는 태그 하나)');
assert.match(landing, /<link rel="stylesheet" href="css\/discord\.css">/);
assert.match(landing.slice(discord, scenes), /href="\/discord\/"/, "섹션의 '자세히 보기'");

// ── /discord/: 한 단계 아래 경로라 스타일·그림은 절대 경로로, 실제 화면 그림은 움직임 없이 보인다
for (const css of ['tokens', 'base', 'rooms', 'discord', 'discord-page']) {
  assert.match(page, new RegExp(`<link rel="stylesheet" href="/css/${css}\\.css">`), `/css/${css}.css`);
}
assert.doesNotMatch(page, /class="[^"]*\breveal\b/, '이 페이지는 등장 스크립트를 싣지 않는다 — reveal 을 달면 보이지 않는다');
assert.match(page, /href="\/privacy\.html"/, '보내는 정보는 처리방침으로 이어진다');

// ── 랜딩 섹션의 움직이는 디스코드 창(2026-10-05 조현빈 결정): 명령을 안내하고, 화면에 들어온 뒤에 움직이고,
//    움직임 줄이기에서는 누르기·Replix 창을 띄우지 않는다
const section = landing.slice(discord, scenes);
assert.match(landing, /<section class="[^"]*\bdx\b[^"]*" id="discord"/, '움직임은 .dx 섹션 안에서만 건다');
assert.match(section, /<figure class="dc-shot reveal"/, '그림은 .reveal — js/reveal.js 가 .in 을 붙여야 움직이기 시작한다');
assert.match(section, /class="dc-cmd">\/같이보기<\/span>/, '음성 채널에서 입력할 명령을 안내한다');
const dcss = read('docs/css/discord.css');
assert.match(dcss, /\.dx \.dc-shot:not\(\.in\)[^{]*\{ animation-play-state: paused; \}/, '화면에 들어오기 전에는 첫 장면에 멈춰 둔다');
assert.match(dcss, /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*\.dx-cursor, \.dx-scrim, \.dx-open \{ display: none; \}/,
  '움직임 줄이기에서는 누르기·Replix 창을 띄우지 않는다');

// ── 문구: 제품 호칭은 '익스텐션'(워크스페이스 CLAUDE.md §1), 봇이 보내지 않는 것을 밝힌다
const text = (html) => html.replace(/<!--[\s\S]*?-->/g, '').replace(/<style>[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ');
for (const [name, html] of [['랜딩 섹션', landing.slice(discord, scenes)], ['/discord/', page]]) {
  assert.doesNotMatch(text(html), /확장 ?프로그램/, `${name}: '익스텐션'으로 부른다`);
}
assert.match(text(page), /닉네임과 채팅은 보내지 않아요/);

console.log('scripts/test-discord.mjs: 통과');
