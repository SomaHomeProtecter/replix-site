/* 공지(HP-425) — 목록 가져오기 + 읽음/띠 닫힘 상태.
   표시 규칙(안 읽은 수·띠 고르기)은 notices-pure.js 에 두고 node 로 검사한다(scripts/test-notices.mjs). 그 파일은 node 가
   그대로 읽는 .js 이고 타입은 JSDoc 이다 — tsc 가 본문까지 검사하므로 여기서 가져다 쓰는 함수의 타입도 그 JSDoc 이다(HP-670).
   저장 키: 읽음 = localStorage(기기에 남는다) · 띠 닫힘 = sessionStorage(탭을 닫으면 다시 보여준다).
   읽음 값은 공지 id 가 아니라 '본 목록의 가장 늦은 게시 시각'이다(HP-427) — 초안을 먼저 만들고 늦게 게시한 공지도
   새 공지로 잡으려는 것이다. 규칙과 옛 id 값을 옮기는 방법은 notices-pure.js 에 있다. */
import { useEffect, useSyncExternalStore } from 'react'
import { api, type Notice } from './api'
import { applyLoadFailure, isFresh, maxNoticeTime, migrateSeenAt, noticeDate, noticePageState, pickBand, unreadCount } from './notices-pure.js'

export { applyLoadFailure, isFresh, noticeDate, noticePageState, pickBand, unreadCount }
export type { Band, BandTone, NoticePageState } from './notices-pure.js'

const SEEN_AT_KEY = 'replix_notice_seen_at' // epoch ms
/** HP-427 이전의 읽음 값(공지 id). 첫 목록 로드 성공 뒤 SEEN_AT_KEY 로 옮기고 지운다(migrateLegacySeen). */
const LEGACY_SEEN_KEY = 'replix_notice_seen_id'
const BAND_KEY = 'replix_notice_band_dismissed'

/** `failed` = 마지막 로드가 실패했는지(빈 목록과 구분해 C2 가 안내 문구를 고를 수 있게).
 *  `loading` = 지금 요청이 떠 있는지(in-flight). 실패 뒤 재시도 동안 items 는 빈 목록·failed 는 false 라
 *  이 값이 없으면 화면이 "아직 공지가 없어요"를 거짓으로 보인다 — 그 구간을 구분하는 것이 이 필드의 목적이다. */
export type NoticeState = { items: Notice[] | null; seenAt: number; dismissed: number[]; failed: boolean; loading: boolean }

let shared: Promise<Notice[]> | null = null // 헤더 링크·띠·공지 페이지가 한 번의 응답을 나눠 쓴다
let loaded: Notice[] | null = null
let failed = false
let loading = false
let snapshot: NoticeState | null = null
const listeners = new Set<() => void>()

/* useSyncExternalStore 는 렌더마다 같은 객체를 돌려받아야 한다(매번 새 배열을 만들면 무한 루프) —
   그래서 스냅샷을 한 번 만들어 두고, 목록·읽음·닫힘이 바뀔 때만 새로 만든다. */
function getSnapshot(): NoticeState {
  if (!snapshot) snapshot = { items: loaded, seenAt: readSeenAt(), dismissed: dismissedBands(), failed, loading }
  return snapshot
}
function notify() {
  snapshot = { items: loaded, seenAt: readSeenAt(), dismissed: dismissedBands(), failed, loading }
  listeners.forEach((l) => l())
}
function subscribe(l: () => void) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

/** 모듈 전역 1회 fetch. 실패하면 이전 캐시(없으면 빈 목록)로 상태를 확정해 알리고, 공유 캐시는 비운다 —
 *  화면은 '공지 없음'으로 떨어지고(로딩에 갇히지 않고), 다음 호출(새 마운트·라우트 전환)은 다시 시도한다.
 *  (SPA 라 실패를 그대로 캐시하면 새로고침 전까지 공지가 영영 안 뜬다.)
 *  재시도가 시작되면 failed 를 내리고 loading 을 올린다 — failed 를 true 로 두면 응답 전까지
 *  "불러오지 못했어요"를 잠깐 보이고, loading 없이 내리기만 하면 그 사이 빈 목록이 '공지 0건'으로 읽힌다.
 *  둘 다 필요하다: failed=false 로 실패 문구를 끄고, loading=true 로 '불러오는 중'임을 알린다. */
export function fetchNotices(): Promise<Notice[]> {
  if (!shared) {
    failed = false
    loading = true
    shared = api
      .notices(20)
      .then((r) => {
        migrateLegacySeen(r) // 알리기 전에 옮긴다 — 첫 화면이 옛 값 없는 상태(전부 새 공지)로 한 번 깜빡이지 않게
        loaded = r
        failed = false
        loading = false
        notify()
        return r
      })
      .catch(() => {
        // 실패해도 마운트된 화면을 '불러오는 중'에 가두지 않는다 — 이전 캐시가 있으면 유지, 없으면 빈 목록.
        const items = applyLoadFailure(loaded)
        loaded = items
        failed = true
        loading = false
        shared = null // 캐시는 비워 다음 fetchNotices()(새 마운트·라우트 전환)가 재시도한다
        notify()
        return items
      })
    /* shared 를 먼저 채운 뒤 알린다 — 구독자가 다시 렌더되며 fetchNotices() 를 재진입해도 no-op 이 되게.
       loading 이 false→true 로 바뀌었으므로 (첫 로드든 재시도든) 항상 알린다. */
    notify()
  }
  return shared
}

export function readSeenAt(): number {
  try {
    const raw = localStorage.getItem(SEEN_AT_KEY)
    const v = Number(raw)
    // 값이 없으면 0 — 모든 공지가 새 공지다(HP-427 이전에 아무것도 안 본 사람과 같은 뜻).
    return raw !== null && Number.isFinite(v) ? v : 0
  } catch {
    return 0 // 사설 창·저장 차단
  }
}

/** 옛 id 읽음 값을 게시 시각 기준으로 한 번 옮긴다. 목록이 있어야 id 를 시각으로 바꿀 수 있어서 첫 로드 성공 뒤에 부른다.
 *  새 키가 이미 있으면(다른 탭이 먼저 옮겼거나 새로 읽은 적이 있으면) 아무것도 하지 않는다. */
function migrateLegacySeen(items: Notice[]) {
  try {
    if (localStorage.getItem(SEEN_AT_KEY) !== null) return
    const legacy = localStorage.getItem(LEGACY_SEEN_KEY)
    if (legacy === null) return
    localStorage.setItem(SEEN_AT_KEY, String(migrateSeenAt(items, Number(legacy) || 0)))
    localStorage.removeItem(LEGACY_SEEN_KEY)
  } catch {
    /* 사설 창 — 옮기지 못하면 다음 방문에 다시 시도한다 */
  }
}

/** 목록의 가장 늦은 게시 시각을 읽음 기준으로 기록한다(공지함을 열었을 때). 기준은 내려가지 않는다. */
export function markSeen(items: Notice[]) {
  const max = maxNoticeTime(items)
  if (max > readSeenAt()) {
    try {
      localStorage.setItem(SEEN_AT_KEY, String(max))
    } catch {
      /* 사설 창 */
    }
    notify()
  }
}

/* 다른 탭에서 공지 페이지를 열어 읽음 기준이 바뀌면 이 탭의 헤더 점·띠도 따라 꺼진다. storage 이벤트는
   값을 바꾼 탭이 아닌 다른 탭에만 오므로 이 탭의 markSeen 과 겹쳐 두 번 알리지 않는다. key 가 null 이면 저장소 전체 삭제다. */
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === SEEN_AT_KEY || e.key === null) notify()
  })
}

export function dismissedBands(): number[] {
  try {
    const raw: unknown = JSON.parse(sessionStorage.getItem(BAND_KEY) || '[]')
    return Array.isArray(raw) ? raw.map(Number).filter((n) => !Number.isNaN(n)) : []
  } catch {
    return []
  }
}

export function isBandDismissed(id: number): boolean {
  return dismissedBands().includes(Number(id))
}

export function dismissBand(id: number) {
  if (!isBandDismissed(id)) {
    try {
      sessionStorage.setItem(BAND_KEY, JSON.stringify([...dismissedBands(), Number(id)]))
    } catch {
      /* no-op */
    }
  }
  notify()
}

/** 목록 + 읽음/닫힘 상태를 함께 구독한다. 읽음·닫힘이 바뀌면 구독한 화면이 모두 다시 그려진다.
 *  반환 객체는 상태가 바뀔 때만 새로 만들어진다 — 그대로 useEffect 의존성에 넣어도 안전하다. */
export function useNotices(): NoticeState {
  useEffect(() => {
    void fetchNotices()
  }, [])
  return useSyncExternalStore(subscribe, getSnapshot)
}
