// 공지 표시 규칙(HP-425) — 순수 함수. React·DOM 없이 node 로 검사한다(scripts/test-notices.mjs).
// 타입은 notices.ts 쪽에서 붙인다(여기는 타입 없는 ESM 이라 node 가 그대로 읽는다).
// 목록은 서버가 startsAt 내림차순으로 주므로 앞에서부터 찾으면 최신이다.

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
