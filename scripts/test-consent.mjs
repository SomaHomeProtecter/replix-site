// scripts/test-consent.mjs — 웹 약관 동의 순수 규칙(HP-449)의 검사. 카탈로그 앱엔 테스트 러너가 없어
// 규칙을 `catalog/app/src/consent-pure.js`(타입 없는 ESM)로 분리해 node 로 직접 돌린다.
// 실행: node scripts/test-consent.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CONSENT_SOURCE, TERMS_VERSION, PRIVACY_VERSION,
  versionsFrom, consentBody, canAccept, nicknameOf, acceptErrorMessage, loginKindOf,
} from '../catalog/app/src/consent-pure.js';

const authSource = readFileSync(new URL('../catalog/app/src/auth.ts', import.meta.url), 'utf8');

// 출처는 web — BE 가 허용하는 집합({extension, web}, HP-449)의 웹 값. 익스텐션 값을 흉내 내면 증적이 거짓이 된다.
assert.equal(CONSENT_SOURCE, 'web');

// versionsFrom — 서버가 요구하는 버전을 쓴다. 조회 실패(null)·빈 값이면 번들 상수(익스텐션과 같은 값).
assert.deepEqual(
  versionsFrom({ requiredTermsVersion: '2027-01-01', requiredPrivacyVersion: '2027-02-02' }),
  { termsVersion: '2027-01-01', privacyVersion: '2027-02-02' },
);
assert.deepEqual(versionsFrom(null), { termsVersion: TERMS_VERSION, privacyVersion: PRIVACY_VERSION });
assert.deepEqual(
  versionsFrom({ requiredTermsVersion: '', requiredPrivacyVersion: null }),
  { termsVersion: TERMS_VERSION, privacyVersion: PRIVACY_VERSION },
);

// consentBody — PUT /users/me/legal-consents 본문은 세 필드뿐이고 출처는 web.
assert.deepEqual(
  consentBody({ termsVersion: 'a', privacyVersion: 'b' }),
  { termsVersion: 'a', privacyVersion: 'b', source: 'web' },
);

// canAccept — 필수 두 항목을 모두 체크해야 저장할 수 있다.
assert.equal(canAccept({ terms: true, privacy: true }), true);
assert.equal(canAccept({ terms: true, privacy: false }), false);
assert.equal(canAccept({ terms: false, privacy: true }), false);
assert.equal(canAccept(null), false);

// nicknameOf — /users/me 의 displayName(랜덤 닉네임)만 쓴다. 비었으면 null — 이메일·실명으로 대신하지 않는다.
assert.equal(nicknameOf({ displayName: ' 용감한수달 ', email: 'a@b.c' }), '용감한수달');
assert.equal(nicknameOf({ displayName: '   ', email: 'a@b.c' }), null);
assert.equal(nicknameOf({ email: 'a@b.c' }), null);
assert.equal(nicknameOf(null), null);

// acceptErrorMessage — 문서가 갱신됐으면 다시 체크해 달라고, 그 밖은 연결 문제로(익스텐션과 같은 문구).
assert.match(acceptErrorMessage('OUTDATED_LEGAL_DOCUMENTS'), /약관이 갱신됐어요/);
assert.match(acceptErrorMessage(undefined), /저장하지 못했어요/);
assert.match(acceptErrorMessage('INVALID_CONSENT_SOURCE'), /저장하지 못했어요/);

// loginKindOf — 동의 저장(PUT) 응답의 newAccount(이번 저장이 계정을 만들었는가, HP-619)로 가입과 재동의를 가른다.
// 불리언이 아니면(배포 전 서버·본문 없음) consent — 모르는 것을 거짓으로 채우면 가입·재동의가 뒤바뀌어 세인다.
assert.equal(loginKindOf({ accepted: true, newAccount: true }), 'signup');
assert.equal(loginKindOf({ accepted: true, newAccount: false }), 'reconsent', '약관 개정 뒤 재동의한 기존 회원은 가입이 아니다');
assert.equal(loginKindOf({ accepted: true }), 'consent', '배포 전 서버');
assert.equal(loginKindOf({ newAccount: null }), 'consent');
assert.equal(loginKindOf({ newAccount: 'true' }), 'consent', '불리언이 아니면 모른다');
assert.equal(loginKindOf(null), 'consent', '본문을 못 읽었다');

// auth.ts 배선(카탈로그 앱엔 테스트 러너가 없어 소스 규칙으로 고정한다) — login_completed 는 한 곳에서만 찍고,
// is_new_user 의 뜻(동의 창을 거쳤는가)은 그대로 둔 채 login_kind 를 더한다(트래킹 플랜 §6, HP-619).
assert.equal((authSource.match(/track\('login_completed'/g) || []).length, 1, 'login_completed 발화 지점은 하나');
assert.match(authSource,
  /track\('login_completed', \{ is_new_user: completion\.isNewUser, login_kind: completion\.loginKind \}\)/,
  '속성은 is_new_user·login_kind 둘 — 표면(surface)은 공통 속성이 싣고, 계정 식별값(sub·이메일)은 싣지 않는다');
// 이미 동의한 회원으로 확인된 로그인 왕복은 login(is_new_user:false), 새로고침 복원은 세지 않는다(null)
assert.match(authSource,
  /current\?\.accepted\) await becomeMember\(gen, token, justLoggedIn \? \{ isNewUser: false, loginKind: 'login' \} : null\)/);
// 동의 저장이 성공하면 응답 본문의 newAccount 로 가른다 — 본문을 읽은 값을 loginKindOf 에 넘긴다
{
  const start = authSource.indexOf('export async function acceptConsent(');
  const body = authSource.slice(start, authSource.indexOf('\n}\n', start));
  assert.match(body, /if \(res\.ok\) \{[\s\S]*?saved = \(await res\.json\(\)\) as ConsentSaved[\s\S]*?becomeMember\(gen, token, \{ isNewUser: true, loginKind: loginKindOf\(saved\) \}\)/,
    '동의 창을 거친 완료는 is_new_user:true 그대로, login_kind 는 저장 응답으로');
}

console.log('scripts/test-consent.mjs: 통과');
