// 격자 상한 규칙 — 순수 함수. React·DOM 없이 node 로 검사한다(scripts/test-catalog-mobile.mjs). 타입은 grid-pure.d.ts.
// · 데스크톱: 화면 폭이 상한을 정한다 — 열 수는 폭에서, 보일 항목은 열 × 줄까지(2026-09-07 조현빈).
// · 휴대폰 폭(760px 이하): 한 줄 가로 레일로 전부 싣는다 — 2열 × 2줄이면 순위가 4개만 보이고 더 볼 길이 없었다
//   (HP-474, 2026-10-02 김지호 휴대폰 예외 — 데스크톱 규칙은 그대로).

/** 레일로 바꾸는 폭 — 작품 탐색 헤더가 휴대폰 구성으로 바뀌는 경계(Chrome.tsx 의 min-[761px])와 같다. */
export const RAIL_QUERY = '(max-width: 760px)';

/** 열 수 — 컨테이너 폭에서 최소 칸 폭과 간격으로 센다. 폭이 칸보다 좁아도 1열. */
export function columnsFor(width, minPx, gapPx) {
  return Math.max(1, Math.floor((width + gapPx) / (minPx + gapPx)));
}

/** 보일 항목 수의 상한 — 격자는 열 × 줄, 레일은 무한대(하나도 숨기지 않는다). 항목은 i >= 상한이면 숨긴다. */
export function visibleLimit(cols, rows, rail) {
  return rail ? Infinity : cols * rows;
}
