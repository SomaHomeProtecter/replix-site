/* 큐레이션 페이지가 쓰는 Replix 공개 API (전부 비로그인 읽기, HP-77).
   기본 대상은 개발 서버다. 빌드 시 VITE_API_BASE 로 바꾼다(운영 = https://api.replix.tv).
   HP-390(함께 본 작품)·HP-391(작품 상세·순간·검색)은 develop 머지·dev 롤아웃 뒤에 응답한다 —
   그 전에는 404 가 오고, 화면은 그 섹션을 비운다(지어내지 않는다). */

/* 대상 서버는 랜딩과 같은 규칙으로 정한다 — HTML 의 <meta name="api-base"> 한 곳(index.html).
   메타가 없으면 VITE_API_BASE, 그것도 없으면 개발 서버. */
function resolveApiBase(): string {
  const meta = typeof document !== 'undefined' ? document.querySelector('meta[name="api-base"]') : null
  const fromMeta = meta?.getAttribute('content')?.trim()
  const fromEnv = (import.meta.env.VITE_API_BASE as string | undefined)?.trim()
  return (fromMeta || fromEnv || 'https://api.replix-dev.site').replace(/\/$/, '')
}
export const API_BASE: string = resolveApiBase()

/* ── 응답 타입 (BE DTO 와 1:1) ─────────────────────────────── */

export type MostWatched = {
  show: string
  color: string
  quoteAuthor: string | null
  quoteText: string | null
  episodeTitle: string | null
  synopsis: string | null
  thumbnailUrl: string | null
  contentId?: number | null   // HP-391 이후
  episodeId?: number | null
}
export type PublicStats = { liveViewers: number; liveRooms: number; mostWatched: MostWatched[] }

export type LiveSegment = { at: number; viewers: number; quote: string }
export type LiveShow = {
  showId: string           // 내부 회차 id(문자열)
  platform: string
  watchId: string
  titleId: string | null
  firstWatchId: string | null
  show: string
  seasonNumber: number | null
  episodeNumber: number | null
  episodeTitle: string | null
  posterUrl: string | null
  color: string
  segments: LiveSegment[]
}
export type LiveScenes = { shows: LiveShow[] }

export type Heatmap = { bucketSeconds: number; buckets: Record<string, number>; reactionBuckets: Record<string, number> }

export type ChatMessage = {
  id: string
  userId: number | null
  displayName: string | null
  message: string
  playbackTime: number
  createdAt: string
  moderationStatus: string
  parentId: string | null
  likeCount: number
  spoilerScore: number | null
}
export type MessagePage = { items: ChatMessage[]; nextFrom: number | null; total: number | null }

export type EpisodeSummary = {
  episodeId: number
  platformEpisodeId: string
  seasonNumber: number
  episodeNumber: number
  title: string | null
  heatShare: number
}
export type ContentDetail = {
  contentId: number
  platform: string
  platformContentId: string
  title: string
  contentType: 'MOVIE' | 'SERIES'
  posterUrl: string | null
  episodes: EpisodeSummary[]
}
export type ContentSearchItem = { contentId: number; title: string; contentType: string; posterUrl: string | null }

export type Moment = { at: number; strength: number; quote: string | null; quoteAuthor: string | null }
export type Moments = { episodeId: number; bucketSeconds: number; moments: Moment[] }

export type AlsoWatchedItem = { contentId: number; title: string; posterUrl: string | null }
export type AlsoWatched = { contentId: number; items: AlsoWatchedItem[] }

/* ── 호출 ─────────────────────────────────────────────────── */

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new ApiError(res.status, path)
  return (await res.json()) as T
}

export class ApiError extends Error {
  status: number
  constructor(status: number, path: string) {
    super(`${status} ${path}`)
    this.status = status
  }
}

export const api = {
  publicStats: () => get<PublicStats>('/api/v1/public-stats'),
  liveScenes: () => get<LiveScenes>('/api/v1/live-scenes'),
  heatmap: (episodeId: number) => get<Heatmap>(`/api/v1/episodes/${episodeId}/heatmap`),
  messages: (episodeId: number, from: number, to: number, limit = 40) =>
    get<MessagePage>(`/api/v1/episodes/${episodeId}/messages?from=${from}&to=${to}&limit=${limit}`),
  content: (contentId: number) => get<ContentDetail>(`/api/v1/contents/${contentId}`),
  search: (q: string) => get<ContentSearchItem[]>(`/api/v1/contents?q=${encodeURIComponent(q)}`),
  moments: (episodeId: number, limit = 5) => get<Moments>(`/api/v1/episodes/${episodeId}/moments?limit=${limit}`),
  alsoWatched: (contentId: number) => get<AlsoWatched>(`/api/v1/contents/${contentId}/also-watched`),
}

/* ── 화면 공용 계산 ────────────────────────────────────────── */

/** 넷플릭스 재생 딥링크. `t` 는 초. 프로필 관문·URL 재작성 함정은 memory/실행-함정.md 참조. */
export function watchUrl(platform: string, platformEpisodeId: string | null | undefined, sec?: number): string | null {
  if (!platformEpisodeId) return null
  if (platform !== 'netflix') return null
  return `https://www.netflix.com/watch/${platformEpisodeId}${sec !== undefined ? `?t=${Math.max(0, Math.floor(sec))}` : ''}`
}

/** 히트맵(채팅+반응 1:1)을 막대 N개로 다시 샘플링한다. 회차 길이를 모르므로 마지막 채팅 버킷 끝을 길이로 본다. */
export function heatToBars(h: Heatmap | null, bars: number): { values: number[]; duration: number } {
  if (!h) return { values: Array(bars).fill(0.04), duration: 0 }
  const merged = new Map<number, number>()
  for (const [k, v] of Object.entries(h.buckets)) merged.set(Number(k), (merged.get(Number(k)) ?? 0) + v)
  for (const [k, v] of Object.entries(h.reactionBuckets ?? {})) merged.set(Number(k), (merged.get(Number(k)) ?? 0) + v)
  if (merged.size === 0) return { values: Array(bars).fill(0.04), duration: 0 }
  const lastStart = Math.max(...merged.keys())
  const duration = lastStart + h.bucketSeconds
  const values = Array(bars).fill(0) as number[]
  for (const [start, v] of merged) {
    const i = Math.min(bars - 1, Math.floor((start / duration) * bars))
    values[i] += v
  }
  const max = Math.max(...values, 1)
  return { values: values.map((v) => Math.max(0.04, v / max)), duration }
}

/** 채팅 본문에는 `&quot;` 같은 HTML 엔티티가 저장돼 있다(dev 실측). 화면에 찍기 전에 문자로 되돌린다. */
export function decodeEntities(text: string | null | undefined): string {
  if (!text) return ''
  if (!text.includes('&')) return text
  const el = document.createElement('textarea')
  el.innerHTML = text
  return el.value
}

export function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function episodeLabel(e: { seasonNumber: number | null; episodeNumber: number | null }, contentType?: string): string {
  if (contentType === 'MOVIE') return '영화'
  const s = e.seasonNumber ?? 0
  const n = e.episodeNumber ?? 0
  if (!n) return ''
  return s > 1 ? `시즌${s} ${n}화` : `${n}화`
}
