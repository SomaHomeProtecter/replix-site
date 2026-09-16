// 피드백 순수 규칙(HP-426) — React·DOM 없이 node 로 검사한다(scripts/test-feedback.mjs).
// 서버 계약(POST /api/v1/feedback)·문구는 웹 쪽 것만 다룬다 — 확장 쪽 안내 문구·저장소 키는 다른 레포(Replix-extension).

const WEB_NOTE = '이메일은 받지 않고 답장은 따로 안 드려요. 답을 받고 싶으면 replix.contact@gmail.com으로 보내 주세요.'

/** 보내기 버튼 활성 조건: 별점을 눌렀거나(score>0) 본문에 공백 아닌 글자가 있으면. */
export function canSend({ score, body }) {
  return score > 0 || body.trim().length > 0
}

/** 서버 계약 그대로 body 를 만든다 — 본문은 trim 하고 공백만 남으면 null 로 보낸다(빈 문자열 대신 null 이 "안 씀"을 뜻한다).
 *  이 화면(웹, 카탈로그)은 특정 회차 위에서 뜨지 않으므로 contentId·episodeId·appVersion·platform 은 항상 null. */
export function buildPayload({ score, category, body }) {
  return {
    surface: 'WEB',
    score: score > 0 ? score : null,
    category: category || null,
    body: body.trim() || null,
    appVersion: null,
    platform: null,
    contentId: null,
    episodeId: null,
    trigger: 'MANUAL',
  }
}

/** 웹 작은 안내(Global Constraints 세트 A, 글자 그대로) — 로그인 상태면 계정 연결 문구를 앞에 붙인다. */
export function feedbackNote(loggedIn) {
  return loggedIn ? '로그인한 계정에 연결돼요. ' + WEB_NOTE : WEB_NOTE
}

/** 제출 실패 안내 — 레이트리밋(429)은 별도 문구, 그 외는 일반 실패 문구(글자 그대로). */
export function errorMessage(status) {
  return status === 429
    ? '지금은 더 받을 수 없어요. 조금 뒤에 다시 보내 주세요.'
    : '보내지 못했어요. 잠시 뒤 다시 시도해 주세요.'
}

export const STAR_LABELS = ['', '별로예요', '아쉬워요', '괜찮아요', '좋아요', '최고예요']

export const STORE_URL = 'https://chromewebstore.google.com/detail/replix/lgfllmbombkdbebcepigebnbmeaacikp/reviews'
