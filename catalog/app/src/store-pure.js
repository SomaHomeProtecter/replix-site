// 크롬 웹 스토어 링크(HP-615). 어느 화면에서 넘어왔는지 utm_medium 으로 붙여 스토어 대시보드가 replix.tv 에서 온 방문을
// 위치별로 가르게 한다. medium 은 그 버튼의 install_cta_clicked location 과 같은 낱말이다(트래킹 플랜 §12 표).
// 랜딩·초대·디스코드 페이지는 정적 HTML 이라 같은 형식을 글자로 적는다 — 전부를 scripts/test-analytics.mjs 가 대조한다.
export const STORE_BASE = 'https://chromewebstore.google.com/detail/replix/lgfllmbombkdbebcepigebnbmeaacikp';

/** path 는 스토어 안 하위 페이지(평가 '/reviews' 등). */
export function storeUrl(medium, path = '') {
  return `${STORE_BASE}${path}?utm_source=replix.tv&utm_medium=${medium}`;
}
