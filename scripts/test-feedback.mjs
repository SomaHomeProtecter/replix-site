// scripts/test-feedback.mjs — 피드백 순수 규칙(HP-426)의 검사. 카탈로그 앱엔 테스트 러너가 없어
// 규칙을 `catalog/app/src/feedback-pure.js`(타입 없는 ESM)로 분리해 node 로 직접 돌린다.
// 실행: node scripts/test-feedback.mjs
import assert from 'node:assert/strict';
import { canSend, buildPayload, feedbackNote, errorMessage, STAR_LABELS, STORE_URL } from '../catalog/app/src/feedback-pure.js';

// canSend — 별점>0 또는 본문 trim 길이>0 이면 보내기 활성.
assert.equal(canSend({ score: 5, body: '' }), true); // 별점만
assert.equal(canSend({ score: 0, body: '좋아요' }), true); // 본문만
assert.equal(canSend({ score: 0, body: '   ' }), false); // 공백만은 본문이 아니다
assert.equal(canSend({ score: 0, body: '' }), false); // 둘 다 없음

// buildPayload — 본문은 trim, 공백만 남으면 null. 별점 0·카테고리 미선택도 null.
assert.deepEqual(buildPayload({ score: 4, category: 'BUG', body: '  느려요  ' }), {
  surface: 'WEB',
  score: 4,
  category: 'BUG',
  body: '느려요',
  appVersion: null,
  platform: null,
  contentId: null,
  episodeId: null,
  trigger: 'MANUAL',
});
assert.deepEqual(buildPayload({ score: 0, category: null, body: '   ' }), {
  surface: 'WEB',
  score: null,
  category: null,
  body: null,
  appVersion: null,
  platform: null,
  contentId: null,
  episodeId: null,
  trigger: 'MANUAL',
});
assert.deepEqual(buildPayload({ score: 0, category: '', body: '' }).category, null);

// feedbackNote — Global Constraints 세트 A, 글자 그대로.
assert.equal(
  feedbackNote(false),
  '이메일은 받지 않고 답장은 따로 안 드려요. 답을 받고 싶으면 replix.contact@gmail.com으로 보내 주세요.',
);
assert.equal(
  feedbackNote(true),
  '로그인한 계정에 연결돼요. 이메일은 받지 않고 답장은 따로 안 드려요. 답을 받고 싶으면 replix.contact@gmail.com으로 보내 주세요.',
);

// errorMessage — 429 는 레이트리밋 전용 문구, 그 외(500 등)는 일반 실패 문구.
assert.equal(errorMessage(429), '지금은 더 받을 수 없어요. 조금 뒤에 다시 보내 주세요.');
assert.equal(errorMessage(500), '보내지 못했어요. 잠시 뒤 다시 시도해 주세요.');
assert.equal(errorMessage(400), '보내지 못했어요. 잠시 뒤 다시 시도해 주세요.');

// 상수 — 별점 라벨(인덱스 0은 미선택이라 빈 문자열)·스토어 리뷰 링크.
assert.deepEqual(STAR_LABELS, ['', '별로예요', '아쉬워요', '괜찮아요', '좋아요', '최고예요']);
assert.equal(STORE_URL, 'https://chromewebstore.google.com/detail/replix/lgfllmbombkdbebcepigebnbmeaacikp/reviews');

console.log('scripts/test-feedback.mjs: 통과');
