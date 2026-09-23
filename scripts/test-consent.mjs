// scripts/test-consent.mjs — 웹 약관 동의 순수 규칙(HP-449)의 검사. 카탈로그 앱엔 테스트 러너가 없어
// 규칙을 `catalog/app/src/consent-pure.js`(타입 없는 ESM)로 분리해 node 로 직접 돌린다.
// 실행: node scripts/test-consent.mjs
import assert from 'node:assert/strict';
import {
  CONSENT_SOURCE, TERMS_VERSION, PRIVACY_VERSION,
  versionsFrom, consentBody, canAccept, nicknameOf, acceptErrorMessage,
} from '../catalog/app/src/consent-pure.js';

// 출처는 web — BE 가 허용하는 집합({extension, web}, HP-449)의 웹 값. 확장 값을 흉내 내면 증적이 거짓이 된다.
assert.equal(CONSENT_SOURCE, 'web');

// versionsFrom — 서버가 요구하는 버전을 쓴다. 조회 실패(null)·빈 값이면 번들 상수(확장과 같은 값).
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

// acceptErrorMessage — 문서가 갱신됐으면 다시 체크해 달라고, 그 밖은 연결 문제로(확장과 같은 문구).
assert.match(acceptErrorMessage('OUTDATED_LEGAL_DOCUMENTS'), /약관이 갱신됐어요/);
assert.match(acceptErrorMessage(undefined), /저장하지 못했어요/);
assert.match(acceptErrorMessage('INVALID_CONSENT_SOURCE'), /저장하지 못했어요/);

console.log('scripts/test-consent.mjs: 통과');
