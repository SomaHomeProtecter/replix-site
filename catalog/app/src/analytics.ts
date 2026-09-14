/* Amplitude 계측 shim — 실제 구현은 랜딩과 공유하는 /js/analytics.js(동의 배너·SDK 지연 로드·공통 속성).
   이 앱은 그 파일을 런타임에 붙이고 window.ReplixAnalytics 로만 부른다. 정본: docs/analytics/tracking-plan.md.
   Vite dev·file:// 시안 검토에서는 그 파일이 없어 no-op 이다(fail-open — 계측이 화면을 막지 않는다).
   ⚠️ 작품·회차 ID·검색어는 어떤 속성에도 싣지 않는다(트래킹 플랜 §2). */
type Props = Record<string, string | number | boolean>
type Bridge = { track(name: string, props?: Props): void; page(props?: Props): void }
declare global { interface Window { ReplixAnalytics?: Bridge } }

const pending: Array<(b: Bridge) => void> = []
let injected = false

/* 모듈 스크립트가 아직 안 붙었으면 큐에 두고, 'replix-analytics-ready' 에서 비운다 — 첫 page_viewed 가 유실되지 않게. */
function call(fn: (b: Bridge) => void) {
  if (window.ReplixAnalytics) fn(window.ReplixAnalytics)
  else pending.push(fn)
}

export function loadAnalytics() {
  if (injected || typeof document === 'undefined') return
  injected = true
  if (!/^https?:$/.test(location.protocol)) return
  window.addEventListener('replix-analytics-ready', () => {
    const b = window.ReplixAnalytics
    if (b) pending.splice(0).forEach((f) => f(b))
  }, { once: true })
  const s = document.createElement('script')
  s.type = 'module'
  s.src = '/js/analytics.js'
  document.head.appendChild(s)
}

export function track(name: string, props?: Props) { call((b) => b.track(name, props)) }
export function page(props?: Props) { call((b) => b.page(props)) }

export type WatchFrom = 'title_hero' | 'moment' | 'home_billboard' | 'home_hot' | 'home_live'
/** 재생 딥링크 클릭(W5 전환). watchUrl 은 넷플릭스만 만들므로 platform 은 그 사실을 그대로 적는다. */
export function trackWatch(url: string | null, from: WatchFrom) {
  if (!url) return
  track('watch_link_clicked', { platform: 'netflix', from, has_timestamp: /[?&]t=\d/.test(url) })
}
/** catalog_engaged{feature, action} — 기능 사용을 잘게 쪼개지 않고 하나로 묶는다(확장 feature_engaged 와 같은 이유). */
export function engaged(feature: string, action: string, extra?: Props) {
  track('catalog_engaged', { feature, action, ...(extra ?? {}) })
}
