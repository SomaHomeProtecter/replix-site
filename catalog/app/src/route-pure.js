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

/** 화면을 갈아 끼우고 page_viewed 를 세는 단위 — 페이지 이름, 작품은 작품마다. 홈 안 앵커(#/ranking·#/hot·#/live)·
 *  공지 항목(#/notice/{id})·회차 선택(/ep/{id})·평가 칸(/review)은 같은 페이지 안 이동이라 키가 같다 — 누를 때마다
 *  페이지뷰가 하나씩 더 나가던 것을 막는다(HP-615). */
export function pageKey(route) {
  return route.page === 'title' ? `title-${route.contentId}` : route.page;
}

/** 로그인 왕복으로 돌아온 로드인가 — Keycloak 이 응답을 쿼리로 붙인다(responseMode 'query': state + code 또는 error).
 *  IdP 로그인, 그리고 제3자 쿠키가 막힌 브라우저에서 조용한 세션 확인이 전체 리디렉트로 바뀐 경우(재방문 로그인 사용자의
 *  매 방문)가 여기 온다. 사용자가 페이지를 옮긴 게 아니므로 이 로드의 page_viewed 는 세지 않는다(HP-615). */
export function isAuthReturn(search) {
  return /[?&]state=/.test(search || '') && /[?&](code|error)=/.test(search || '');
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
