// 웹 약관 동의(HP-449)의 순수 규칙. 화면·네트워크와 떼어 node 로 검사한다(scripts/test-consent.mjs).
// 출처·문서 버전·저장 실패 안내는 BE(LegalConsentService)와 확장(features/consent.js)의 계약을 따른다.

/** 동의 증적의 출처 — BE 가 허용하는 값({extension, web}) 중 웹의 것. */
export const CONSENT_SOURCE = 'web';

/* 서버 조회가 실패했을 때 쓰는 문서 버전(확장 번들 상수와 같다). 서버가 더 새 버전을 요구하면 저장이
   OUTDATED_LEGAL_DOCUMENTS 로 거절되고, 그때 서버 값을 다시 읽어 사용자가 새 문서에 다시 체크한다. */
export const TERMS_VERSION = '2026-09-18';
export const PRIVACY_VERSION = '2026-09-18';

/** 조회 응답(GET /users/me/legal-consents/current)에서 동의할 문서 버전을 고른다. 응답이 없거나 비면 번들 상수. */
export function versionsFrom(current) {
  return {
    termsVersion: (current && current.requiredTermsVersion) || TERMS_VERSION,
    privacyVersion: (current && current.requiredPrivacyVersion) || PRIVACY_VERSION,
  };
}

/** PUT /users/me/legal-consents 본문. */
export function consentBody(versions) {
  return { termsVersion: versions.termsVersion, privacyVersion: versions.privacyVersion, source: CONSENT_SOURCE };
}

/** 필수 두 항목을 모두 체크했을 때만 저장할 수 있다. */
export function canAccept(checks) {
  return !!(checks && checks.terms && checks.privacy);
}

/** /users/me 의 displayName(랜덤 닉네임, HP-236). 비었으면 null — 이메일·실명으로 대신하지 않는다. */
export function nicknameOf(me) {
  const name = me && typeof me.displayName === 'string' ? me.displayName.trim() : '';
  return name || null;
}

/** 저장 실패 안내. 문서가 갱신됐으면 다시 체크해 달라고, 그 밖은 연결 문제로 안내한다(확장과 같은 문구). */
export function acceptErrorMessage(code) {
  return code === 'OUTDATED_LEGAL_DOCUMENTS'
    ? '약관이 갱신됐어요. 전문을 확인한 뒤 두 항목에 다시 동의해 주세요.'
    : '동의를 서버에 저장하지 못했어요. 연결을 확인한 뒤 다시 시도해 주세요.';
}
