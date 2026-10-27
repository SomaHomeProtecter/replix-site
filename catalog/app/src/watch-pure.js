// 재생 딥링크 규칙(HP-709) — React·DOM 없이 node 로 검사한다(scripts/test-deeplink.mjs). 종전엔 api.ts 안의 넷플릭스 전용
// 함수였다. 플랫폼마다 URL 모양과 필요한 id 가 다르다: 넷플릭스는 회차 id 하나(+ 시작 시각 `t`), 라프텔은 작품 id 가 **필수**
// (`/player/<작품>/<회차>` — 작품 id 가 틀리면 404, 설계 §2.2)이고 시작 시각 파라미터가 없다. 디즈니+ 등은 만들지 않는다(종전과 같다).
// 조립 규칙의 정본은 익스텐션 replix-net.js PLATFORM_NAV 다 — 이 사이트는 익스텐션 코드에 닿지 못해 사본을 둔다(초대 스텁도 같다).
// 넷플릭스 프로필 관문·URL 재작성 함정은 memory/실행-함정.md 참조(종전 api.ts 주석에서 옮김).
export function watchUrl(platform, platformEpisodeId, sec, showId) {
  if (!platformEpisodeId) return null
  if (platform === 'netflix') {
    return `https://www.netflix.com/watch/${platformEpisodeId}${sec !== undefined ? `?t=${Math.max(0, Math.floor(sec))}` : ''}`
  }
  if (platform === 'laftel') {
    // 작품 id 가 없으면(잠정 작품 — 카탈로그·내 활동 응답이 null 로 준다) 링크를 만들지 않는다. 회차 id 를 작품 자리에 넣어 추측하지 않는다.
    if (showId === null || showId === undefined || String(showId) === '') return null
    return `https://laftel.net/player/${encodeURIComponent(String(showId))}/${encodeURIComponent(String(platformEpisodeId))}`
  }
  return null
}

/** 계측용 — 딥링크 URL 의 호스트로 플랫폼을 적는다(analytics.ts trackWatch). 모르는 호스트는 null. */
export function watchPlatformOf(url) {
  if (!url) return null
  let host
  try { host = new URL(url).hostname } catch { return null }
  if (host === 'www.netflix.com') return 'netflix'
  if (host === 'laftel.net') return 'laftel'
  return null
}
