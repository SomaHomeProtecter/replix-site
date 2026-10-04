// 내 활동(HP-443, #/me)의 화면 규칙 — 순수 함수. React·DOM 없이 node 로 검사한다(scripts/test-activity.mjs).
// 타입은 activity-pure.d.ts 에서 붙인다. 문구 정본은 HP-274 프로토타입(카탈로그 탭, 2026-10-01 확정) — 여기 상수가 그 값이다.

/** 웹이 남의 원문에서 '스포일러 신호'로 보는 점수 하한. Title.tsx 의 순간 채팅 인용이 같은 값으로 걸러 왔다(옛 SPOILER_CUT).
 *  지금 서버(v6.6 누설 이분)는 0 아니면 10 을 주지만 옛 연속 점수(v5, 1~9)가 남아 있어, 익스텐션이 가릴 수 있던 가장 민감한
 *  컷(3)을 하한으로 둔다 — 웹은 사용자의 익스텐션 가림 설정을 모르므로 남의 원문은 이 이상이면 가린다. */
export const SPOILER_CUT = 3;
/** 서버가 누설로 판정한 점수(BE LEAK_SCORE · 익스텐션 spoiler.js LEAK_CUT). 내 채팅의 "스포일러" 꼬리표는 이것만 본다 —
 *  익스텐션 내 활동(HP-442 isLeak)과 같은 줄에 붙어야 하기 때문이다(옛 3~9 는 익스텐션 피드도 가리지 않는다). */
export const LEAK_SCORE = 10;
/** 전체 보기가 작품마다 싣는 미리보기 수(HP-441 PREVIEW) — '더 보기' 기준. */
export const PREVIEW = 3;
/** 한 작품 보기 상한(HP-441 MAX_WORK_CHATS) — 커서가 없어 그 이상은 못 본다. */
export const CHATS_CAP = 300;

// ── 문구(프로토타입 그대로) ──
export const LEDE = '내가 남긴 평가와 채팅, 반응한 장면과 좋아요한 채팅을 작품별로 모았습니다. 나만 볼 수 있어요.';
export const GATE_LEDE = '내가 남긴 평가와 채팅은 로그인하면 볼 수 있어요.';
export const EMPTY_TITLE = '아직 남긴 평가나 채팅이 없어요';
export const EMPTY_BODY = '넷플릭스에서 Replix로 채팅을 남기거나, 작품 페이지에서 별점을 남기면 여기에 작품별로 모입니다.';
export const EMPTY_ACTION = '많이 본 작품 보기';
export const CHATS_HEAD = '이 작품에서 남긴 채팅';
export const NO_CHATS = '이 작품에서는 아직 채팅을 남기지 않았어요.';
export const ASK_ACTION = '이 작품 평가하기';
/** "내가 표시함"이라 쓰지 않는다 — 작성자 표시도 10점으로 저장돼 서버가 AI 판정과 구분하지 못한다(HP-441). */
export const SPOILER_TAG = '스포일러';
/** 익스텐션 피드 replyRefHtml(chat.js)과 같은 문구. */
export const HIDDEN_PARENT = '가려진 메시지';
/** 원문이 사라진 답글 — 익스텐션과 같은 문구. */
export const REPLY_FALLBACK = '↳ 답글';
export const TRUNCATED_NOTE = '활동이 많아 오래된 회차 일부는 세지 않았어요.';
/** Comments.tsx 의 401 문구와 같다. */
export const EXPIRED = '로그인이 만료됐습니다. 다시 로그인해 주세요.';
/** Notice.tsx 의 실패 문구와 같은 결 — 못 불러온 것과 활동이 없는 것은 다른 사실이다. */
export const FAILED = '내 활동을 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.';
export const MORE_FAILED = '더 불러오지 못했어요. 잠시 뒤 다시 눌러 주세요.';
export const DELETE_FAILED = '지우지 못했어요. 잠시 뒤 다시 시도해 주세요.';

/** 미채점(null)은 신호가 아니다(fail-open — 익스텐션 HP-109 정책과 같다). */
export function hasSpoilerSignal(score) {
  if (score == null) return false;
  const n = Number(score);
  return !Number.isNaN(n) && n >= SPOILER_CUT;
}

/** 내 채팅 꼬리표 — 서버 누설 판정만(미채점 null 은 아니다). */
export function isLeakScore(score) {
  if (score == null) return false;
  const n = Number(score);
  return !Number.isNaN(n) && n >= LEAK_SCORE;
}

/** 답글 원문 한 줄. null = 원문이 없다('↳ 답글'). text null = 가려진 메시지 — 작성자 이름은 남긴다(누구에게 단 답글인지는
 *  읽혀야 스레드가 보인다, 익스텐션과 같다). 내 글에 이어 단 답글(parent.mine)은 가리지 않는다(HP-274 결정 5). 남의 글은
 *  운영 가림(message null)·공개 아님(moderationStatus ≠ 'visible' — 클린봇 차단 등, 모르는 상태도 가린다: Title.tsx 순간
 *  인용과 같은 fail-closed)·내가 차단한 작성자·스포일러 신호 중 하나라도 있으면 가린다 — 웹은 익스텐션의 스포일러 민감도·클린봇
 *  설정을 모르므로 가장 보수적으로 판정한다. */
export function parentView(parent) {
  if (!parent) return null;
  const who = parent.displayName || '';
  // 내 원문은 스포일러·클린봇·차단으로 가리지 않는다. 다만 운영 가림(blinded)이면 서버가 본문을 null 로 비우므로
  // 그때는 남의 글과 같이 '가려진 메시지'(text null) — 빈 인용 줄("↳ 내 이름"만)로 두지 않는다.
  if (parent.mine) return { who, text: parent.message == null ? null : parent.message };
  const notVisible = parent.moderationStatus !== 'visible';
  const hidden = parent.message == null || notVisible || !!parent.blockedByMe || hasSpoilerSignal(parent.spoilerScore);
  return { who, text: hidden ? null : parent.message };
}

/** 원문 일부 — 익스텐션 피드의 참조 스니펫과 같은 길이(24자). */
export function snip(text, max = 24) {
  const t = text == null ? '' : String(text);
  return t.length > max ? t.slice(0, max) + '…' : t;
}

/** 상대 날짜 — 달력 날짜 차이로 센다(시각이 아니라). 오늘 · 어제 · N일 전(30일 미만) · N개월 전(1년 미만) · N년 전.
 *  못 읽으면 ''(화면은 그 자리를 비운다). Math.round 는 DST 로 23·25시간인 날을 하루로 세기 위한 것이다.
 *  개월은 11에서 멈춘다 — 30일로 나누면 360~364일이 "12개월 전"이 되어 "1년 전" 바로 앞에 어색하게 끼기 때문. */
export function relativeDay(iso, now = Date.now()) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(+d)) return '';
  const n = new Date(now);
  const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((day(n) - day(d)) / 86400000);
  if (days <= 0) return '오늘';
  if (days === 1) return '어제';
  if (days < 30) return days + '일 전';
  if (days < 365) return Math.min(11, Math.floor(days / 30)) + '개월 전';
  return Math.floor(days / 365) + '년 전';
}
export function lastActivityLabel(iso, now) {
  const r = relativeDay(iso, now);
  return r ? '마지막 활동 ' + r : '';
}

/** 페이지가 보일 상태 하나. 'auth' = 세션 확인 중(스켈레톤) · 'gate' = 로그인 전 · 'loading' · 'expired' = 401/403(로그인 안내)
 *  · 'failed' = 그 밖의 실패 · 'empty' = 활동 0 · 'list'. 목록이 있으면(지우기 뒤 재요청 중이라도) 목록을 유지한다 —
 *  재요청 동안 '불러오는 중'으로 떨어뜨리면 화면이 깜빡인다(notices-pure 의 재시도 규칙과 같은 이유). */
export function activityPageState({ ready, user, loading, data, error }) {
  if (!ready) return 'auth';
  if (!user) return 'gate';
  if (data) return Array.isArray(data.works) && data.works.length > 0 ? 'list' : 'empty';
  if (loading) return 'loading';
  if (error) return authLost(error.status) ? 'expired' : 'failed';
  return 'loading';
}

/** 401(세션 만료)·403(약관 동의 전, CONSENT_REQUIRED) — 다시 시도가 아니라 로그인으로 풀리는 실패. */
function authLost(status) {
  return status === 401 || status === 403;
}

/** 내 평가 지우기 실패 → 카드에 띄울 한 줄. null = 문구 대신 전체 보기를 다시 받는다 — 404 는 이미 없다는 뜻이다
 *  (작품 페이지·다른 탭에서 지웠다). status 가 없으면(네트워크 오류) 실패 한 줄. */
export function deleteErrorText(status) {
  if (status === 404) return null;
  return authLost(status) ? EXPIRED : DELETE_FAILED;
}

/** '더 보기' 실패 → 한 줄. 로그인으로 풀리는 실패에 "다시 눌러 주세요"라고 하지 않는다. */
export function moreErrorText(status) {
  return authLost(status) ? EXPIRED : MORE_FAILED;
}

/** '더 보기' 버튼 문구. 미리보기(채팅·좋아요 3 · 장면 6)로 다 보이면 null. 펼쳤으면 '접기'. */
export function moreLabel(count, open, preview = PREVIEW) {
  if (!(count > preview)) return null;
  return open ? '접기' : (count - preview) + '개 더 보기';
}
/** 한 작품 보기 상한을 넘는 작품을 펼쳤을 때의 안내(없으면 null). */
export function capNote(chatCount) {
  return chatCount > CHATS_CAP ? '최근 회차부터 ' + CHATS_CAP + '개까지만 보여요.' : null;
}
export function averageLabel(avg) {
  return avg == null ? '—' : Number(avg).toFixed(1);
}
export function chatsCount(chatCount, episodeCount) {
  return chatCount + '개 · ' + episodeCount + '개 회차';
}
export function askLine(chatCount) {
  return '채팅은 ' + chatCount + '개 남겼는데 별점은 아직이에요.';
}

// ── 2차(HP-471 · HP-191 결정 1~5) — 반응한 장면 · 좋아요한 채팅. 데이터 = HP-469(같은 두 API에 필드만 늘었다) ──
/** 전체 보기가 작품마다 싣는 장면 미리보기 수(HP-469) — 웹은 칩 6개 + 더 보기(결정 2). */
export const SCENES_PREVIEW = 6;
/** 좋아요한 채팅 미리보기 수(HP-469) — 채팅과 같은 3개(결정 3). */
export const LIKED_PREVIEW = 3;
/** 장면 = 30초 구간(HP-469 · 익스텐션 sceneSlotStart(t, 30) · HP-403 배지와 같은 정의). 칩은 시작만 싣고 끝은 툴팁에. */
export const SCENE_SLOT_SEC = 30;
export const SCENES_HEAD = '반응한 장면';
export const LIKED_HEAD = '좋아요한 채팅';

/** 2차 필드만 꺼낸다 — 1차 서버 응답(필드 없음)이면 0·빈 배열. 화면은 이것으로만 읽어 1차 서버에서도 깨지지 않는다
 *  (릴리스 순서 = BE 2차 → 이 웹이라 운영에선 늘 있지만, 순서가 어긋나도 1차 카드 그대로 보이게 하는 안전망). */
export function phase2Of(work) {
  const w = work || {};
  const count = (x) => (Number.isFinite(x) && x > 0 ? x : 0);
  const list = (x) => (Array.isArray(x) ? x : []);
  return { sceneCount: count(w.sceneCount), reactionCount: count(w.reactionCount), scenes: list(w.scenes),
    likedCount: count(w.likedCount), liked: list(w.liked) };
}

/** 요약 숫자 줄(결정 4) — [값, 이름] 다섯 칸. 1차 서버(2차 칸 둘 다 없음)면 1차 세 칸만 — 없는 값을 0으로 그리면
 *  "반응한 장면 0"이라는 다른 사실이 된다. 하나만 없으면 0(서버는 둘을 함께 싣는다). */
export function summaryCells(s) {
  const base = [[String(s.ratedWorks), '평가한 작품'], [averageLabel(s.averageRating), '내 평균 별점'], [String(s.chatCount), '남긴 채팅']];
  if (s.reactedScenes == null && s.likedChats == null) return base;
  return base.concat([[String(s.reactedScenes ?? 0), SCENES_HEAD], [String(s.likedChats ?? 0), LIKED_HEAD]]);
}

/** 카드의 섹션(결정 1 순서 — 평가 다음 내 채팅 → 반응한 장면 → 좋아요한 채팅), 0개 섹션은 뺀다.
 *  빈 배열 = 1차 NO_CHATS 한 줄(평가만 있는 작품 — 프로토타입 webCard 의 `body || me-none`). */
export function cardSections({ chatCount, sceneCount, likedCount }) {
  const out = [];
  if (chatCount > 0) out.push('chats');
  if (sceneCount > 0) out.push('scenes');
  if (likedCount > 0) out.push('liked');
  return out;
}

/** 평가가 없는 카드의 권유(결정 5) — 채팅이 있으면 1차 문구, 없으면 장면 반응 횟수, 그것도 없으면 좋아요 수.
 *  null = 권유할 근거가 없다(서버는 활동 없는 작품을 싣지 않아 평소엔 오지 않는다 — 와도 빈 권유를 그리지 않는다). */
export function askText({ chatCount, reactionCount, likedCount }) {
  if (chatCount > 0) return askLine(chatCount);
  if (reactionCount > 0) return '장면에 반응을 ' + reactionCount + '번 남겼는데 별점은 아직이에요.';
  if (likedCount > 0) return '채팅에 좋아요를 ' + likedCount + '번 눌렀는데 별점은 아직이에요.';
  return null;
}

/** 반응한 장면 섹션 머리 숫자 — "N개 장면 · 반응 M번"(프로토타입). */
export function scenesSummary(sceneCount, reactionCount) {
  return sceneCount + '개 장면 · 반응 ' + reactionCount + '번';
}
/** 좋아요한 채팅 섹션 머리 숫자 — "N개". */
export function likedSummary(likedCount) {
  return likedCount + '개';
}
/** 장면 끝(초) — 칩 툴팁의 "시작~끝". */
export function sceneEndSec(slotStart) {
  return (Number(slotStart) || 0) + SCENE_SLOT_SEC;
}
/** 칩에 그릴 이모지 — 서버가 ❤️ 😂 😮 😢 😡 👍 순서·횟수 > 0으로 싣는다. 모양이 깨진 항목만 거른다(빈 칩 조각 방지). */
export function emojisOf(scene) {
  const list = scene && Array.isArray(scene.emojis) ? scene.emojis : [];
  return list.filter((e) => e && typeof e.emoji === 'string' && e.emoji !== '' && Number(e.count) > 0);
}
/** 좋아요한 채팅 한 줄의 가림(결정 3) — 남의 글이라 답글 원문과 **같은 판정**(parentView: 운영 가림·공개 아님·차단·스포일러
 *  신호면 text null = "가려진 메시지", 작성자 이름은 남긴다, 내 글에 누른 좋아요(mine)는 그대로). 판정을 한 곳에 두려고 그대로 부른다. */
export function likedView(liked) {
  return parentView(liked);
}
