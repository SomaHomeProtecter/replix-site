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

/** 유형 칩 — 순서는 서버 열거값 순서(ANNOY·BUG·IDEA·PRAISE)와 같게 둔다. 화면이 지어내지 않도록 값·문구를 여기서 못박는다. */
export const CHIPS = [
  { value: 'ANNOY', label: '불편해요' },
  { value: 'BUG', label: '버그예요' },
  { value: 'IDEA', label: '이런 게 있으면' },
  { value: 'PRAISE', label: '잘 쓰고 있어요' },
]

/* 화면에 박히는 고정 문구(세트 A). TSX 에 흩어 두면 글자가 조용히 어긋나도 아무도 모른다 —
   여기 모아 두고 scripts/test-feedback.mjs 가 글자 그대로 검사한다. */
export const Q_SCORE = '전체적으로 어땠어요?'
export const Q_CATEGORY = '어떤 이야기예요? (선택)'
export const PLACEHOLDER = '좋았던 점이나 아쉬운 점을 적어 주세요.'
export const THANKS = '의견 감사합니다. 리플릭스를 더 낫게 고쳐 볼게요.'
export const STORE_TEXT = '스토어에도 평가를 남겨 주세요 ↗'

export const STORE_URL = 'https://chromewebstore.google.com/detail/replix/lgfllmbombkdbebcepigebnbmeaacikp/reviews'
