// @ts-check
// 공지 표시 규칙(HP-425) — 순수 함수. React·DOM 없이 node 로 검사한다(scripts/test-notices.mjs).
// node 가 그대로 읽게 .js 로 두고, 타입은 아래 JSDoc 에 적는다. 첫 줄 @ts-check 로 tsc 가 이 본문까지 검사하므로(tsconfig.app.json
// allowJs) 적어 둔 타입과 실제 함수가 어긋나면 빌드가 막힌다 — 손으로 쓴 notices-pure.d.ts 를 따로 두던 때는 본문을 고쳐도
// 선언과 대조하는 곳이 없었다(HP-670). 가져오는 쪽(notices.ts·화면)도 이 JSDoc 타입으로 검사받는다.
// 목록은 서버가 startsAt 내림차순으로 주므로 앞에서부터 찾으면 최신이다.

/** @import { Notice } from './api' */
/** @typedef {'maint' | 'incident' | 'notice'} BandTone */
/** @typedef {{ notice: Notice, tone: BandTone }} Band */
/** @typedef {'loading' | 'failed' | 'empty' | 'missing' | 'stale' | 'list'} NoticePageState */

/** 목록 로드 실패 뒤의 목록: 이전에 성공한 캐시가 있으면 그대로 두고, 없으면 빈 목록으로 떨군다.
 *  (null 로 두면 화면이 영영 '불러오는 중'에 갇힌다 — 공지는 없어도 화면이 돌아야 한다.)
 *  @param {Notice[] | null} prev
 *  @returns {Notice[]} */
export function applyLoadFailure(prev) {
  return prev ?? [];
}

/* 읽음 기준은 id 가 아니라 **게시 시각(startsAt)** 이다(HP-427). 운영자는 초안을 미리 만들어 두고 나중에 게시하므로
   id 순서와 게시 순서가 어긋난다 — id 11 을 본 사람에게 뒤늦게 게시된 id 10 은 새 공지인데, id 기준이면 읽은 것으로 묻힌다.
   그래서 '본 목록의 가장 늦은 게시 시각'(epoch ms)을 저장하고, 그보다 늦게 게시된 공지만 새 공지로 센다.
   아래 인자 seenAt 이 그 읽음 기준이다. */

/** 공지의 게시 시각(epoch ms). startsAt 이 없거나 깨졌으면 NaN.
 *  @param {Notice} n
 *  @returns {number} */
export function noticeTime(n) {
  return n && typeof n.startsAt === 'string' ? Date.parse(n.startsAt) : NaN;
}

/** 읽음 기준(seenAt)보다 늦게 게시된 공지인가. 게시 시각을 읽을 수 없는 공지는 새 공지로 보지 않는다 —
 *  깨진 값 하나가 빨간 점을 영영 켜 두지 않게 하려는 것이다(읽음 처리로도 끌 수 없으므로).
 *  @param {Notice} n
 *  @param {number} seenAt
 *  @returns {boolean} */
export function isFresh(n, seenAt) {
  const t = noticeTime(n);
  return !Number.isNaN(t) && t > seenAt;
}

/** 목록에서 가장 늦은 게시 시각. 읽을 수 있는 값이 하나도 없으면 0(= 기준을 올리지 않는다).
 *  읽음 처리에 Date.now() 가 아니라 이 값을 쓰는 이유: 기기 시계가 앞서 있으면 아직 받지도 않은 공지까지 읽음이 된다.
 *  @param {Notice[]} items
 *  @returns {number} */
export function maxNoticeTime(items) {
  return items.reduce((m, n) => {
    const t = noticeTime(n);
    return !Number.isNaN(t) && t > m ? t : m;
  }, 0);
}

/** 옛 읽음 값(id 워터마크)을 게시 시각 기준으로 옮긴다 — 첫 목록 로드 성공 뒤 한 번만 쓴다.
 *  ① 옛 seenId 와 id 가 같은 공지의 게시 시각 ② 없으면 id ≤ seenId 공지 중 가장 늦은 게시 시각 ③ 그것도 없으면 0.
 *  ②를 1순위로 쓰지 않는 이유: id 는 낮아도 늦게 게시된 공지(초안 선행 생성)가 끼어 있으면 그 시각이 기준을 끌어올려,
 *  그 사람이 실제로 본 적 없는 공지까지 읽음이 된다. 본 것이 확실한 건 seenId 그 공지뿐이다.
 *  @param {Notice[]} items
 *  @param {number} seenId
 *  @returns {number} */
export function migrateSeenAt(items, seenId) {
  const exact = items.find((n) => Number(n.id) === seenId && !Number.isNaN(noticeTime(n)));
  if (exact) return noticeTime(exact);
  return maxNoticeTime(items.filter((n) => Number(n.id) <= seenId));
}

/** 읽음 기준보다 늦게 게시된 공지 수.
 *  @param {Notice[]} items
 *  @param {number} seenAt
 *  @returns {number} */
export function unreadCount(items, seenAt) {
  return items.filter((n) => isFresh(n, seenAt)).length;
}

/** 띠 하나: 종료되지 않은 점검·장애 중 최신(닫은 것 제외) → 없으면 안 읽은 일반 공지 최신 1건(닫은 것 제외).
 *  @param {Notice[]} items
 *  @param {number} seenAt
 *  @param {number[]} dismissed 이 탭에서 닫은 띠의 공지 id
 *  @returns {Band | null} */
export function pickBand(items, seenAt, dismissed) {
  const d = new Set(dismissed.map(Number));
  const urgent = items.find(
    (n) => (n.kind === 'MAINTENANCE' || n.kind === 'INCIDENT') && !n.endedAt && !d.has(Number(n.id)),
  );
  if (urgent) return { notice: urgent, tone: urgent.kind === 'MAINTENANCE' ? 'maint' : 'incident' };
  const fresh = items.find((n) => n.kind === 'NOTICE' && isFresh(n, seenAt) && !d.has(Number(n.id)));
  return fresh ? { notice: fresh, tone: 'notice' } : null;
}

/* 날짜는 기기 시간대가 아니라 한국 시간으로 보인다. 공지는 한국 운영자가 한국 날짜로 쓰므로, 해외 기기에서
   자정 근처에 게시된 공지가 하루 앞뒤로 밀려 보이면 본문의 날짜와 어긋난다. */
const KST_DATE = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' });

/** ISO 시각 → 한국 날짜 'YYYY-MM-DD'. 비었거나 깨졌으면 빈 문자열.
 *  @param {string | null} iso
 *  @returns {string} */
export function noticeDate(iso) {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  // 로캘마다 순서·구분자가 달라 문자열을 그대로 쓰지 않고 조각을 골라 맞춘다.
  const part = Object.fromEntries(KST_DATE.formatToParts(t).map((p) => [p.type, p.value]));
  return `${part.year}-${part.month}-${part.day}`;
}

/** 공지 페이지가 목록과 함께 보일 안내 한 줄을 고른다 — React 밖에서 검사하려고 순수 함수로 뺀다.
 *  'loading'  = 불러오는 중(아직 보여 줄 목록이 없다). 첫 로드(items===null)와 **재시도 중**을 함께 덮는다 —
 *               재시도 동안 items 는 실패로 떨어진 빈 목록이라, loading 을 안 보면 "아직 공지가 없어요"를 거짓말한다.
 *  'failed'   = 로드 실패로 보여 줄 게 없다 · 'empty' = 정말 공지가 0건이다(둘은 다른 사실이다).
 *  'missing'  = #/notice/<id> 로 왔는데 그 공지가 목록에 없다(목록은 함께 보여 준다).
 *  'stale'    = 다시 불러오기에 실패했지만 이전에 받은 목록이 있다 — 목록은 보여 주되 실패도 알린다.
 *               목록만 두면 지금 받은 최신 목록처럼 읽혀, 그사이 올라온 점검·장애 공지가 없는 줄 안다.
 *  'list'     = 목록만 보여 주고 안내 문구는 없다(재시도 중이라도 이전 성공 목록이 있으면 여기).
 *  실패(failed)일 때 'missing' 을 내지 않는 이유: 그때 목록이 부족한 것은 '내려가서'가 아니라 '못 불러와서'다.
 *  @param {{ items: Notice[] | null, failed: boolean, loading: boolean, noticeId: number | null }} input
 *  @returns {NoticePageState} */
export function noticePageState({ items, failed, loading, noticeId }) {
  const has = Array.isArray(items) && items.length > 0;
  if (items === null || (loading && !has)) return 'loading';
  if (loading) return 'list'; // 재시도 중이지만 이전 성공 목록이 있다 — 목록을 그대로 두고 문구는 붙이지 않는다
  if (!has) return failed ? 'failed' : 'empty';
  if (failed) return 'stale';
  if (noticeId !== null && noticeId !== undefined && !failed && !items.some((n) => Number(n.id) === Number(noticeId)))
    return 'missing';
  return 'list';
}
