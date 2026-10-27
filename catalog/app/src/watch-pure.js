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

// ── 재생 버튼 문구(HP-709) — 화면마다 '넷플릭스에서 …'를 박아 두면 라프텔 링크에 넷플릭스 문구가 붙는다. 이름과 문구를 여기 한 곳에서 만든다.
const PLATFORM_NAMES = { netflix: '넷플릭스', laftel: '라프텔', disney_plus: '디즈니+' }

/** 플랫폼 코드 → 화면 이름. 모르는 코드는 그대로 돌려준다(던지지 않는다 — 새 플랫폼이 와도 화면이 깨지지 않게). */
export function platformName(platform) {
  return Object.prototype.hasOwnProperty.call(PLATFORM_NAMES, platform) ? PLATFORM_NAMES[platform] : String(platform)
}

/** 재생 버튼 글자 — '넷플릭스에서 12:34부터 보기' · '라프텔에서 보기'. 라프텔 딥링크엔 시작 시각이 없어 "부터"를 약속하지 않는다(HP-709).
 *  watchUrl 이 시작 시각(`?t=`)을 싣는 플랫폼은 넷플릭스뿐이라 넷플릭스만 시각을 적는다. */
export function watchCta(platform, atText) {
  return `${platformName(platform)}에서 ${atText && platform === 'netflix' ? atText + '부터 ' : ''}보기`
}

/** 내 활동 툴팁 — 넷플릭스는 그 장면(+ 구간), 라프텔 등은 회차 처음에 닿으므로 '이 회차'라고만 한다(구간을 약속하지 않는다, HP-709). */
export function watchSceneTitle(platform, span) {
  if (platform === 'netflix') return '넷플릭스에서 이 장면 보기' + (span ? ` (${span})` : '')
  return `${platformName(platform)}에서 이 회차 보기`
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
