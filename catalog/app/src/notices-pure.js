// 공지 표시 규칙(HP-425) — 순수 함수. React·DOM 없이 node 로 검사한다(scripts/test-notices.mjs).
// 타입은 notices.ts 쪽에서 붙인다(여기는 타입 없는 ESM 이라 node 가 그대로 읽는다).
// 목록은 서버가 startsAt 내림차순으로 주므로 앞에서부터 찾으면 최신이다.

/** 목록 로드 실패 뒤의 목록: 이전에 성공한 캐시가 있으면 그대로 두고, 없으면 빈 목록으로 떨군다.
 *  (null 로 두면 화면이 영영 '불러오는 중'에 갇힌다 — 공지는 없어도 화면이 돌아야 한다.) */
export function applyLoadFailure(prev) {
  return prev ?? [];
}

/** 마지막으로 읽은 id 보다 큰 공지 수. */
export function unreadCount(items, seenId) {
  return items.filter((n) => Number(n.id) > seenId).length;
}

/** 띠 하나: 종료되지 않은 점검·장애 중 최신(닫은 것 제외) → 없으면 안 읽은 일반 공지 최신 1건(닫은 것 제외). */
export function pickBand(items, seenId, dismissed) {
  const d = new Set(dismissed.map(Number));
  const urgent = items.find(
    (n) => (n.kind === 'MAINTENANCE' || n.kind === 'INCIDENT') && !n.endedAt && !d.has(Number(n.id)),
  );
  if (urgent) return { notice: urgent, tone: urgent.kind === 'MAINTENANCE' ? 'maint' : 'incident' };
  const fresh = items.find((n) => n.kind === 'NOTICE' && Number(n.id) > seenId && !d.has(Number(n.id)));
  return fresh ? { notice: fresh, tone: 'notice' } : null;
}

/** 공지 페이지가 목록과 함께 보일 안내 한 줄을 고른다 — React 밖에서 검사하려고 순수 함수로 뺀다.
 *  'loading'  = 불러오는 중(아직 보여 줄 목록이 없다). 첫 로드(items===null)와 **재시도 중**을 함께 덮는다 —
 *               재시도 동안 items 는 실패로 떨어진 빈 목록이라, loading 을 안 보면 "아직 공지가 없어요"를 거짓말한다.
 *  'failed'   = 로드 실패로 보여 줄 게 없다 · 'empty' = 정말 공지가 0건이다(둘은 다른 사실이다).
 *  'missing'  = #/notice/<id> 로 왔는데 그 공지가 목록에 없다(목록은 함께 보여 준다).
 *  'list'     = 목록만 보여 주고 안내 문구는 없다(재시도 중이라도 이전 성공 목록이 있으면 여기).
 *  실패(failed)일 때 'missing' 을 내지 않는 이유: 그때 목록이 부족한 것은 '내려가서'가 아니라 '못 불러와서'다. */
export function noticePageState({ items, failed, loading, noticeId }) {
  const has = Array.isArray(items) && items.length > 0;
  if (items === null || (loading && !has)) return 'loading';
  if (loading) return 'list'; // 재시도 중이지만 이전 성공 목록이 있다 — 목록을 그대로 두고 문구는 붙이지 않는다
  if (!has) return failed ? 'failed' : 'empty';
  if (noticeId !== null && noticeId !== undefined && !failed && !items.some((n) => Number(n.id) === Number(noticeId)))
    return 'missing';
  return 'list';
}
