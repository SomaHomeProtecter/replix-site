/* 공지(HP-425) — 목록 가져오기 + 읽음/띠 닫힘 상태.
   표시 규칙(안 읽은 수·띠 고르기)은 타입 없는 notices-pure.js 에 두고 node 로 검사한다(scripts/test-notices.mjs).
   저장 키: 읽음 = localStorage(기기에 남는다) · 띠 닫힘 = sessionStorage(탭을 닫으면 다시 보여준다). */
import { useEffect, useSyncExternalStore } from 'react'
import { api, type Notice } from './api'
import { applyLoadFailure, pickBand, unreadCount } from './notices-pure.js'

export { applyLoadFailure, pickBand, unreadCount }
export type { Band, BandTone } from './notices-pure.js'

const SEEN_KEY = 'replix_notice_seen_id'
const BAND_KEY = 'replix_notice_band_dismissed'

/** `failed` = 마지막 로드가 실패했는지(빈 목록과 구분해 C2 가 안내 문구를 고를 수 있게). */
export type NoticeState = { items: Notice[] | null; seenId: number; dismissed: number[]; failed: boolean }

let shared: Promise<Notice[]> | null = null // 헤더 링크·띠·공지 페이지가 한 번의 응답을 나눠 쓴다
let loaded: Notice[] | null = null
let failed = false
let snapshot: NoticeState | null = null
const listeners = new Set<() => void>()

/* useSyncExternalStore 는 렌더마다 같은 객체를 돌려받아야 한다(매번 새 배열을 만들면 무한 루프) —
   그래서 스냅샷을 한 번 만들어 두고, 목록·읽음·닫힘이 바뀔 때만 새로 만든다. */
function getSnapshot(): NoticeState {
  if (!snapshot) snapshot = { items: loaded, seenId: readSeenId(), dismissed: dismissedBands(), failed }
  return snapshot
}
function notify() {
  snapshot = { items: loaded, seenId: readSeenId(), dismissed: dismissedBands(), failed }
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
 *  (SPA 라 실패를 그대로 캐시하면 새로고침 전까지 공지가 영영 안 뜬다.) */
export function fetchNotices(): Promise<Notice[]> {
  if (!shared) {
    shared = api
      .notices(20)
      .then((r) => {
        loaded = r
        failed = false
        notify()
        return r
      })
      .catch(() => {
        // 실패해도 마운트된 화면을 '불러오는 중'에 가두지 않는다 — 이전 캐시가 있으면 유지, 없으면 빈 목록.
        const items = applyLoadFailure(loaded)
        loaded = items
        failed = true
        shared = null // 캐시는 비워 다음 fetchNotices()(새 마운트·라우트 전환)가 재시도한다
        notify()
        return items
      })
  }
  return shared
}

export function readSeenId(): number {
  try {
    return Number(localStorage.getItem(SEEN_KEY)) || 0
  } catch {
    return 0 // 사설 창·저장 차단
  }
}

/** 목록에서 가장 큰 id 를 읽음으로 기록한다(공지함을 열었을 때). */
export function markSeen(items: Notice[]) {
  const max = items.reduce((m, n) => Math.max(m, Number(n.id) || 0), 0)
  if (max > readSeenId()) {
    try {
      localStorage.setItem(SEEN_KEY, String(max))
    } catch {
      /* 사설 창 */
    }
    notify()
  }
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
