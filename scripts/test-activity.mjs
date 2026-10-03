// scripts/test-activity.mjs — 내 활동(HP-443) 화면 규칙의 검사. 카탈로그 앱엔 테스트 러너가 없어
// 규칙을 `catalog/app/src/activity-pure.js`(타입 없는 ESM)로 분리해 node 로 직접 돌린다.
// 실행: node scripts/test-activity.mjs
import assert from 'node:assert/strict';
import {
  SPOILER_CUT, LEAK_SCORE, PREVIEW, CHATS_CAP, LEDE, GATE_LEDE, EMPTY_TITLE, EMPTY_BODY, EMPTY_ACTION, CHATS_HEAD, NO_CHATS, ASK_ACTION,
  SPOILER_TAG, HIDDEN_PARENT, REPLY_FALLBACK, TRUNCATED_NOTE, EXPIRED, FAILED, MORE_FAILED, DELETE_FAILED,
  hasSpoilerSignal, isLeakScore, parentView, snip, relativeDay, lastActivityLabel, activityPageState, moreLabel, capNote, averageLabel, chatsCount, askLine,
  deleteErrorText, moreErrorText,
  SCENES_PREVIEW, LIKED_PREVIEW, SCENE_SLOT_SEC, SCENES_HEAD, LIKED_HEAD,
  phase2Of, summaryCells, cardSections, askText, scenesSummary, likedSummary, sceneEndSec, emojisOf, likedView,
} from '../catalog/app/src/activity-pure.js';

// 상수 — HP-441 과 짝(미리보기 3 · 한 작품 300), 스포일러 하한 3(Title.tsx 순간 인용과 같다).
assert.equal(PREVIEW, 3); assert.equal(CHATS_CAP, 300); assert.equal(SPOILER_CUT, 3); assert.equal(LEAK_SCORE, 10);

// 문구 — 프로토타입(2026-10-01 확정) 그대로. "반응"이 아니라 "채팅"(HP-274 결정 11), 꼬리표는 "스포일러"(HP-441).
assert.equal(LEDE, '내가 남긴 평가와 채팅, 반응한 장면과 좋아요한 채팅을 작품별로 모았습니다. 나만 볼 수 있어요.');
assert.equal(GATE_LEDE, '내가 남긴 평가와 채팅은 로그인하면 볼 수 있어요.');
assert.equal(EMPTY_TITLE, '아직 남긴 평가나 채팅이 없어요');
assert.match(EMPTY_BODY, /작품별로 모입니다/);
assert.equal(EMPTY_ACTION, '많이 본 작품 보기');
assert.equal(CHATS_HEAD, '이 작품에서 남긴 채팅');
assert.equal(NO_CHATS, '이 작품에서는 아직 채팅을 남기지 않았어요.');
assert.equal(ASK_ACTION, '이 작품 평가하기');
assert.equal(SPOILER_TAG, '스포일러');
assert.doesNotMatch(SPOILER_TAG, /표시/);
assert.equal(HIDDEN_PARENT, '가려진 메시지');
assert.equal(REPLY_FALLBACK, '↳ 답글');
// "반응"은 장면 반응(2차 섹션) 전용이다(HP-274 결정 11) — 1차 채팅 문구엔 여전히 쓰지 않는다.
for (const s of [GATE_LEDE, EMPTY_TITLE, EMPTY_BODY, CHATS_HEAD, NO_CHATS]) assert.doesNotMatch(s, /반응/);
assert.ok(TRUNCATED_NOTE && EXPIRED && FAILED && MORE_FAILED);

// 스포일러 신호 — 미채점(null)은 신호 아님(fail-open, 확장 HP-109 와 같다). 하한 3 이상, 문자열 숫자도 읽는다.
assert.equal(hasSpoilerSignal(null), false); assert.equal(hasSpoilerSignal(undefined), false);
assert.equal(hasSpoilerSignal(0), false); assert.equal(hasSpoilerSignal(2), false);
assert.equal(hasSpoilerSignal(3), true); assert.equal(hasSpoilerSignal(10), true); assert.equal(hasSpoilerSignal('7'), true);
assert.equal(hasSpoilerSignal('x'), false);

// 내 채팅 꼬리표 — 서버 누설 판정(10)만. 옛 연속 점수 3~9 는 확장 피드도 가리지 않으므로 꼬리표도 없다(두 화면이 같은 줄에 붙인다).
assert.equal(isLeakScore(null), false); assert.equal(isLeakScore(undefined), false);
assert.equal(isLeakScore(3), false); assert.equal(isLeakScore(9), false);
assert.equal(isLeakScore(10), true); assert.equal(isLeakScore('10'), true); assert.equal(isLeakScore('x'), false);

// 답글 원문 — 원문 없음 → null('↳ 답글'). 내 글이면 그대로. 남의 글은 운영 가림·클린봇·차단·스포일러 중 하나라도 있으면 text null(이름은 남긴다).
const P = (o) => ({ id: 'p', displayName: '졸린 수달', message: '이 장면 때문에 정주행함', moderationStatus: 'visible', spoilerScore: null, blockedByMe: false, mine: false, ...o });
assert.equal(parentView(null), null);
assert.equal(parentView(undefined), null);
assert.deepEqual(parentView(P()), { who: '졸린 수달', text: '이 장면 때문에 정주행함' });
assert.deepEqual(parentView(P({ message: null })), { who: '졸린 수달', text: null });                 // 운영 가림(blinded)
assert.deepEqual(parentView(P({ moderationStatus: 'blocked_profanity' })), { who: '졸린 수달', text: null });
assert.deepEqual(parentView(P({ moderationStatus: 'blocked_hate' })), { who: '졸린 수달', text: null });
assert.deepEqual(parentView(P({ blockedByMe: true })), { who: '졸린 수달', text: null });
assert.deepEqual(parentView(P({ spoilerScore: 3 })), { who: '졸린 수달', text: null });
// 공개(visible)가 아닌 상태는 이름과 무관하게 가린다(fail-closed — Title.tsx 순간 인용이 'visible' 만 싣는 것과 같다).
assert.deepEqual(parentView(P({ moderationStatus: 'hidden' })), { who: '졸린 수달', text: null });
assert.deepEqual(parentView(P({ moderationStatus: undefined })), { who: '졸린 수달', text: null });
assert.equal(parentView(P({ mine: true, moderationStatus: 'hidden' })).text, '이 장면 때문에 정주행함');
assert.equal(parentView(P({ spoilerScore: 2 })).text, '이 장면 때문에 정주행함');
assert.deepEqual(parentView(P({ mine: true, spoilerScore: 10, moderationStatus: 'blocked_profanity' })), { who: '졸린 수달', text: '이 장면 때문에 정주행함' });
// 내 원문이라도 운영 가림(blinded — 서버가 본문을 null 로 비운다)이면 '가려진 메시지'다. 빈 인용 줄("↳ 내 이름"만)로 두지 않는다.
assert.deepEqual(parentView(P({ mine: true, message: null })), { who: '졸린 수달', text: null });
assert.equal(parentView(P({ displayName: null })).who, '');

// 스니펫 — 확장 피드와 같은 24자.
assert.equal(snip('짧은 글'), '짧은 글');
assert.equal(snip('a'.repeat(24)), 'a'.repeat(24));
assert.equal(snip('a'.repeat(25)), 'a'.repeat(24) + '…');
assert.equal(snip(null), '');

// 상대 날짜 — 달력 날짜 차이(시각 무관). 지역 시간으로 만든 날짜를 넣어 시간대에 흔들리지 않게 한다.
const NOW = new Date(2026, 9, 1, 15, 0);                                 // 2026-10-01 15:00 local
const at = (y, m, d, h = 12) => new Date(y, m, d, h).toISOString();
assert.equal(relativeDay(at(2026, 9, 1, 0), NOW), '오늘');
assert.equal(relativeDay(at(2026, 8, 30, 23), NOW), '어제');             // 어제 23시 — 16시간 전이지만 '어제'
assert.equal(relativeDay(at(2026, 8, 28), NOW), '3일 전');
assert.equal(relativeDay(at(2026, 8, 2), NOW), '29일 전');
assert.equal(relativeDay(at(2026, 8, 1), NOW), '1개월 전');
assert.equal(relativeDay(at(2026, 3, 1), NOW), '6개월 전');
assert.equal(relativeDay(at(2025, 9, 7), NOW), '11개월 전');            // 359일
assert.equal(relativeDay(at(2025, 9, 6), NOW), '11개월 전');            // 360일 — 30일로 나누면 12 지만 1년이 안 됐다
assert.equal(relativeDay(at(2025, 9, 2), NOW), '11개월 전');            // 364일 — "12개월 전"을 거쳐 "1년 전"으로 가지 않는다
assert.equal(relativeDay(at(2025, 9, 1), NOW), '1년 전');
assert.equal(relativeDay(at(2026, 9, 2), NOW), '오늘');                  // 시계가 어긋나 미래면 '오늘'
assert.equal(relativeDay(null, NOW), '');
assert.equal(relativeDay('garbage', NOW), '');
assert.equal(lastActivityLabel(at(2026, 8, 28), NOW), '마지막 활동 3일 전');
assert.equal(lastActivityLabel(null, NOW), '');

// 페이지 상태 — 로그인 전/세션 확인 중/만료/실패/빈/목록. 목록이 있으면 재요청 중이라도 목록.
const st = (o) => activityPageState({ ready: true, user: true, loading: false, data: null, error: null, ...o });
assert.equal(st({ ready: false }), 'auth');
assert.equal(st({ ready: false, user: false }), 'auth');
assert.equal(st({ user: false }), 'gate');
assert.equal(st({ loading: true }), 'loading');
assert.equal(st({}), 'loading');
assert.equal(st({ error: { status: 401 } }), 'expired');
assert.equal(st({ error: { status: 403 } }), 'expired');                 // 약관 동의 전(CONSENT_REQUIRED) — 동의 모달이 처리한다
assert.equal(st({ error: { status: 500 } }), 'failed');
assert.equal(st({ error: {} }), 'failed');
assert.equal(st({ data: { works: [] } }), 'empty');
assert.equal(st({ data: { works: [{}] } }), 'list');
assert.equal(st({ data: { works: [{}] }, loading: true }), 'list');

// 더 보기 — 미리보기 3 기준, 펼치면 '접기'. 300 넘는 작품은 펼쳤을 때 안내.
assert.equal(moreLabel(3, false), null); assert.equal(moreLabel(0, false), null); assert.equal(moreLabel(2, true), null);
assert.equal(moreLabel(7, false), '4개 더 보기'); assert.equal(moreLabel(7, true), '접기');
assert.equal(capNote(300), null); assert.equal(capNote(301), '최근 회차부터 300개까지만 보여요.');

// 지우기·더 보기 실패 → 한 줄 문구. 401·403(세션 만료·약관 동의 전)은 로그인 안내(EXPIRED). 지우기의 404 는 이미 없는 것
// (다른 곳에서 지웠다)이라 문구 대신 전체 보기를 다시 받는다(null). 그 밖(5xx · 상태 없는 네트워크 오류)은 실패 한 줄.
assert.equal(DELETE_FAILED, '지우지 못했어요. 잠시 뒤 다시 시도해 주세요.');
assert.equal(deleteErrorText(401), EXPIRED); assert.equal(deleteErrorText(403), EXPIRED);
assert.equal(deleteErrorText(404), null);
assert.equal(deleteErrorText(500), DELETE_FAILED); assert.equal(deleteErrorText(undefined), DELETE_FAILED);
assert.equal(moreErrorText(401), EXPIRED); assert.equal(moreErrorText(403), EXPIRED);
assert.equal(moreErrorText(404), MORE_FAILED); assert.equal(moreErrorText(500), MORE_FAILED); assert.equal(moreErrorText(undefined), MORE_FAILED);

// 요약·카드 문구.
assert.equal(averageLabel(null), '—'); assert.equal(averageLabel(4.5), '4.5'); assert.equal(averageLabel(4), '4.0');
assert.equal(chatsCount(7, 2), '7개 · 2개 회차');
assert.equal(askLine(5), '채팅은 5개 남겼는데 별점은 아직이에요.');

// ── 2차(HP-471 · HP-191 결정 1~5) ──
// 상수 — HP-469 미리보기(장면 6 · 좋아요 3)·30초 구간과 짝. 섹션 이름은 프로토타입 그대로.
assert.equal(SCENES_PREVIEW, 6); assert.equal(LIKED_PREVIEW, 3); assert.equal(SCENE_SLOT_SEC, 30);
assert.equal(SCENES_HEAD, '반응한 장면'); assert.equal(LIKED_HEAD, '좋아요한 채팅');

// 2차 필드 — 1차 서버 응답(필드 없음)이면 0·빈 배열(릴리스 순서가 어긋나도 1차 카드 그대로). 음수·숫자 아님도 0.
assert.deepEqual(phase2Of({ chatCount: 2 }), { sceneCount: 0, reactionCount: 0, scenes: [], likedCount: 0, liked: [] });
assert.deepEqual(phase2Of(null), { sceneCount: 0, reactionCount: 0, scenes: [], likedCount: 0, liked: [] });
const SC = { episodeId: 7, seasonNumber: 1, episodeNumber: 1, platformEpisodeId: '81739046', slotStart: 300, emojis: [{ emoji: '❤️', count: 5 }] };
const LK = { id: 'm1', episodeId: 7, seasonNumber: 1, episodeNumber: 1, platformEpisodeId: '81739046', playbackTime: 312.4, createdAt: '2026-10-02T10:00:00Z',
  displayName: '졸린 수달', message: '이 장면 때문에 정주행함', moderationStatus: 'visible', spoilerScore: null, blockedByMe: false, mine: false };
assert.deepEqual(phase2Of({ sceneCount: 3, reactionCount: 9, scenes: [SC], likedCount: 1, liked: [LK] }),
  { sceneCount: 3, reactionCount: 9, scenes: [SC], likedCount: 1, liked: [LK] });
assert.deepEqual(phase2Of({ sceneCount: -1, reactionCount: 'x', scenes: 'no', likedCount: NaN, liked: null }),
  { sceneCount: 0, reactionCount: 0, scenes: [], likedCount: 0, liked: [] });

// 요약(결정 4) — 다섯 칸. 1차 서버(2차 칸 둘 다 없음)면 1차 세 칸만 — 없는 값을 0으로 그리면 "반응한 장면 0"이라는 다른 사실이 된다.
assert.deepEqual(summaryCells({ ratedWorks: 2, averageRating: 4.5, chatCount: 7, reactedScenes: 3, likedChats: 1 }),
  [['2', '평가한 작품'], ['4.5', '내 평균 별점'], ['7', '남긴 채팅'], ['3', '반응한 장면'], ['1', '좋아요한 채팅']]);
assert.deepEqual(summaryCells({ ratedWorks: 0, averageRating: null, chatCount: 7 }),
  [['0', '평가한 작품'], ['—', '내 평균 별점'], ['7', '남긴 채팅']]);
assert.deepEqual(summaryCells({ ratedWorks: 1, averageRating: 4, chatCount: 0, reactedScenes: 2 }),
  [['1', '평가한 작품'], ['4.0', '내 평균 별점'], ['0', '남긴 채팅'], ['2', '반응한 장면'], ['0', '좋아요한 채팅']]);

// 섹션 순서(결정 1) — 채팅 → 장면 → 좋아요, 0개 섹션은 뺀다. 빈 배열 = 1차 "아직 채팅을 남기지 않았어요" 한 줄(평가만 있는 작품).
assert.deepEqual(cardSections({ chatCount: 2, sceneCount: 3, likedCount: 1 }), ['chats', 'scenes', 'liked']);
assert.deepEqual(cardSections({ chatCount: 0, sceneCount: 3, likedCount: 0 }), ['scenes']);
assert.deepEqual(cardSections({ chatCount: 0, sceneCount: 0, likedCount: 2 }), ['liked']);
assert.deepEqual(cardSections({ chatCount: 0, sceneCount: 0, likedCount: 0 }), []);

// 평가 권유(결정 5) — 채팅이 있으면 1차 문구, 없으면 반응 이벤트 수, 그것도 없으면 좋아요 수. 근거가 없으면 null(빈 권유 없음).
assert.equal(askText({ chatCount: 5, reactionCount: 9, likedCount: 2 }), '채팅은 5개 남겼는데 별점은 아직이에요.');
assert.equal(askText({ chatCount: 0, reactionCount: 9, likedCount: 2 }), '장면에 반응을 9번 남겼는데 별점은 아직이에요.');
assert.equal(askText({ chatCount: 0, reactionCount: 0, likedCount: 2 }), '채팅에 좋아요를 2번 눌렀는데 별점은 아직이에요.');
assert.equal(askText({ chatCount: 0, reactionCount: 0, likedCount: 0 }), null);

// 섹션 머리 숫자(프로토타입) · 장면 끝 · 이모지(깨진 항목만 거른다 — 서버 순서·값 그대로).
assert.equal(scenesSummary(3, 9), '3개 장면 · 반응 9번');
assert.equal(likedSummary(4), '4개');
assert.equal(sceneEndSec(300), 330); assert.equal(sceneEndSec(0), 30);
assert.deepEqual(emojisOf({ emojis: [{ emoji: '❤️', count: 2 }, { emoji: '😂', count: 0 }, null, { emoji: '', count: 1 }, { emoji: '👍', count: 1 }] }),
  [{ emoji: '❤️', count: 2 }, { emoji: '👍', count: 1 }]);
assert.deepEqual(emojisOf({}), []); assert.deepEqual(emojisOf(null), []);

// 좋아요 가림(결정 3) — 답글 원문과 같은 판정(parentView). 작성자 이름은 가려도 남는다. 내 글에 누른 좋아요(mine)는 그대로.
const L = (o) => ({ ...LK, ...o });
assert.deepEqual(likedView(L()), { who: '졸린 수달', text: '이 장면 때문에 정주행함' });
assert.deepEqual(likedView(L({ message: null })), { who: '졸린 수달', text: null });                 // 운영 가림(blinded)
assert.deepEqual(likedView(L({ moderationStatus: 'blocked_profanity' })), { who: '졸린 수달', text: null });
assert.deepEqual(likedView(L({ moderationStatus: undefined })), { who: '졸린 수달', text: null });   // 모르는 상태 = 가림(fail-closed)
assert.deepEqual(likedView(L({ blockedByMe: true })), { who: '졸린 수달', text: null });
assert.deepEqual(likedView(L({ spoilerScore: 3 })), { who: '졸린 수달', text: null });
assert.equal(likedView(L({ spoilerScore: 2 })).text, '이 장면 때문에 정주행함');
assert.equal(likedView(L({ mine: true, spoilerScore: 10, moderationStatus: 'blocked_profanity' })).text, '이 장면 때문에 정주행함');
assert.deepEqual(likedView(L({ displayName: '탈퇴한 사용자' })), { who: '탈퇴한 사용자', text: '이 장면 때문에 정주행함' });
for (const o of [{}, { message: null }, { blockedByMe: true }, { spoilerScore: 3 }, { mine: true, message: null }]) {
  assert.deepEqual(likedView(L(o)), parentView(L(o)));                                              // 판정은 한 곳
}

// 더 보기 — 장면은 미리보기 6 기준(결정 2), 채팅·좋아요는 3(기본값 그대로).
assert.equal(moreLabel(6, false, SCENES_PREVIEW), null); assert.equal(moreLabel(9, false, SCENES_PREVIEW), '3개 더 보기');
assert.equal(moreLabel(9, true, SCENES_PREVIEW), '접기');
assert.equal(moreLabel(4, false, LIKED_PREVIEW), '1개 더 보기'); assert.equal(moreLabel(4, false), '1개 더 보기');
assert.equal(capNote(301), '최근 회차부터 300개까지만 보여요.');                                   // 장면·좋아요 펼침에도 같은 안내

console.log('scripts/test-activity.mjs: 통과');
