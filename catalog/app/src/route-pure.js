// 카탈로그 해시 라우터 — 순수 함수. React·DOM 없이 node 로 검사한다(scripts/test-route.mjs). 타입은 route-pure.d.ts.
// 서버 없이 file:// 로 열려야 하고 GitHub Pages 정적 배포라 history API 대신 해시를 쓴다.
//   #/                                              홈('#/ranking' 처럼 홈 섹션 앵커도 라우트로 받는다 — 해시 라우터라 일반 '#ranking' 을 쓸 수 없어서)
//   #/title/{contentId}[/ep/{episodeId}][/review]   작품 상세(회차 선택 포함). '/review' = 평가 칸으로 스크롤·포커스(HP-443 — 내 활동과 익스텐션 HP-442 가 여는 링크)
//   #/notice[/{noticeId}]                           공지(HP-425, 사이트 수준 페이지)
//   #/me                                            내 활동(HP-443, 로그인 전용)

/** 끝을 $ 로 못 박지 않고 (?=$|[/?#]) 로 본다 — 뒤에 슬래시나 쿼리(공유 링크에 붙는 utm 등)가 와도 같은 라우트이기
 *  때문. 다만 경계를 요구하므로 '#/notices'·'#/menu'·'#/title/5/reviews' 같은 다른 경로는 걸리지 않는다. */
export function parseRoute(hash) {
  // '#/notice'·'#/me' 는 홈 앵커 규칙(#/[a-z]+)과 겹치므로 그보다 먼저 판정한다.
  const n = hash.match(/^#\/notice(?:\/(\d+))?(?=$|[/?])/);
  if (n) return { page: 'notice', noticeId: n[1] ? Number(n[1]) : null };
  if (/^#\/me(?=$|[/?#])/.test(hash)) return { page: 'me' };
  // 회차 카드가 '#/title/5/ep/7#moments' 처럼 섹션 앵커를 뒤에 붙이므로 작품 규칙은 끝을 묶지 않는다(종전과 같다).
  const m = hash.match(/^#\/title\/(\d+)(?:\/ep\/(\d+))?(\/review(?=$|[/?#]))?/);
  if (m) return { page: 'title', contentId: Number(m[1]), episodeId: m[2] ? Number(m[2]) : null, review: !!m[3] };
  const a = hash.match(/^#\/([a-z]+)$/);
  return { page: 'home', anchor: a ? a[1] : null };
}

export function titleHref(contentId, episodeId) {
  return `#/title/${contentId}${episodeId ? `/ep/${episodeId}` : ''}`;
}

/** 작품 페이지의 평가 칸으로 — 내 활동의 '고치기'·'이 작품 평가하기'와 익스텐션(HP-442)의 '고치기 ↗'·'평가 남기기 ↗'가 같은 주소를 연다. */
export function reviewHref(contentId) {
  return `#/title/${contentId}/review`;
}

/** 공지 페이지 링크. id 를 주면 그 항목으로 스크롤·강조된다(헤더 링크·공지 띠가 쓰는 형식).
 *  익스텐션 공지함의 '전문 보기 ↗'는 이 형식이 아니라 운영자가 넣은 linkUrl 을 그대로 연다. */
export function noticeHref(id) {
  return `#/notice${id ? `/${id}` : ''}`;
}

export const ME_HREF = '#/me';
