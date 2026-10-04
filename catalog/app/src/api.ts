import { accessToken } from './auth'
import { API_BASE } from './config'

/* 작품 탐색(catalog) 페이지가 쓰는 Replix 공개 API (읽기는 전부 비로그인, HP-77; 댓글 쓰기만 JWT).
   기본 대상은 개발 서버다. 빌드 시 VITE_API_BASE 로 바꾼다(운영 = https://api.replix.tv) — 대상 결정은 config.ts.
   HP-390(함께 본 작품)·HP-391(작품 상세·순간·검색)은 develop 머지·dev 롤아웃 뒤에 응답한다 —
   그 전에는 404 가 오고, 화면은 그 섹션을 비운다(지어내지 않는다). */

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

/* ── 카탈로그 읽기 모델(HP-124, 2026-09-14) — worker 가 미리 계산한 표를 페이지당 한 번에 받는다 ── */
export type Window = 'all' | '7d'
export type RankItem = {
  rank: number
  contentId: number
  title: string
  contentType: 'MOVIE' | 'SERIES'
  platform: string
  posterUrl: string | null
  episodeId: number | null
  platformEpisodeId: string | null
  seasonNumber: number | null
  episodeNumber: number | null
  episodeTitle: string | null
  quoteText: string | null
  quoteAuthor: string | null
  moments: Moment[]           // 전부에 채워진다(순간 시각순)
  bars: number[]              // 빌보드(앞 billboardCount개)에만. 0~1, 120개
  durationSec: number | null  // 같은 조건. 마지막 채팅 버킷 끝 = 회차 길이 추정
}
export type CatalogHome = { window: Window; liveViewers: number; liveRooms: number; billboardCount: number; ranking: RankItem[] }
export type CatalogEpisode = {
  episodeId: number
  platformEpisodeId: string
  seasonNumber: number
  episodeNumber: number
  title: string | null
  heatShare: number
  heatShare7d: number
  moments: Moment[]   // 그 회차의 순간(시각순) — 회차 카드가 따로 요청하지 않게 작품 응답에 실린다
}
export type Rating = { average: number | null; count: number }
export type CatalogContent = {
  contentId: number
  platform: string
  platformContentId: string
  title: string
  contentType: 'MOVIE' | 'SERIES'
  posterUrl: string | null
  episodes: CatalogEpisode[]
  alsoWatched: AlsoWatchedItem[]
  rating: Rating
}
export type CatalogEpisodeDetail = { episodeId: number; bucketSeconds: number; durationSec: number; moments: Moment[]; bars: number[] }

/* ── 공지(HP-425) — 공개(비로그인), 최신순(startsAt desc). 종료된 점검·장애는 endedAt 이 채워진다.
   목록엔 진행 중인 것 + 끝난 지 90일 이내인 것만 실린다(BE). */
export type NoticeKind = 'NOTICE' | 'MAINTENANCE' | 'INCIDENT'
export type Notice = {
  id: number
  kind: NoticeKind
  title: string
  message: string
  startsAt: string | null
  endsAt: string | null
  endedAt: string | null
  linkUrl: string | null
}

/* ── 작품 댓글(별점) ── */
export type Comment = {
  id: number
  userId: number
  displayName: string
  profileImageUrl: string | null
  body: string
  rating: number
  spoiler: boolean
  likeCount: number
  likedByMe: boolean
  mine: boolean
  createdAt: string
  updatedAt: string
}
export type CommentPage = { items: Comment[]; hasMore: boolean; rating: Rating }
export type CommentSort = 'recent' | 'top'

/* ── 내 활동(HP-441 — 소비: 웹 #/me HP-443 · 익스텐션 HP-442). 로그인 필수(Cache-Control: private).
   서버는 가림을 판정하지 않는다 — 화면이 activity-pure.js 규칙으로 판정할 원값만 싣는다. 모양은 BE MyActivityDtos 와 1:1. */
/** 요약 숫자 줄. reactedScenes·likedChats 는 2차(HP-469) — 1차 서버엔 없어 optional(화면은 activity-pure summaryCells 로만 읽는다). */
export type MyActivitySummary = { ratedWorks: number; averageRating: number | null; chatCount: number; reactedScenes?: number; likedChats?: number }
/** 답글의 원문(남의 글). message 는 운영 가림이면 null. mine = 내 글에 이어 단 답글(가리지 않는다). */
export type MyActivityParent = {
  id: string
  displayName: string
  message: string | null
  moderationStatus: string
  spoilerScore: number | null
  blockedByMe: boolean
  mine: boolean
}
export type MyActivityChat = {
  id: string
  episodeId: number
  seasonNumber: number
  episodeNumber: number
  platformEpisodeId: string
  playbackTime: number
  message: string
  createdAt: string
  moderationStatus: string
  spoilerScore: number | null   // 작성자 표시도 10 — 꼬리표는 "스포일러"
  parentId: string | null       // 답글이면 원문 id
  parent: MyActivityParent | null   // 원문이 사라졌으면 null("↳ 답글")
}
/** 반응한 장면 하나(HP-469) = (회차, 30초 구간). slotStart = 구간 시작(초 — 누르면 여기로). emojis 는 ❤️ 😂 😮 😢 😡 👍 순서·횟수 > 0. */
export type MyActivityScene = {
  episodeId: number
  seasonNumber: number
  episodeNumber: number
  platformEpisodeId: string
  slotStart: number
  emojis: { emoji: string; count: number }[]
}
/** 내가 좋아요한 채팅 하나(HP-469). 남의 글이라 Parent 와 같은 원값 규칙 — message 는 운영 가림이면 null, displayName 은
 *  신원 현재값(탈퇴 = "탈퇴한 사용자"), 가림은 화면(activity-pure likedView). mine = 내 메시지에 누른 좋아요(가리지 않는다). */
export type MyActivityLiked = {
  id: string
  episodeId: number
  seasonNumber: number
  episodeNumber: number
  platformEpisodeId: string
  playbackTime: number
  createdAt: string
  displayName: string
  message: string | null
  moderationStatus: string
  spoilerScore: number | null
  blockedByMe: boolean
  mine: boolean
}
export type MyActivityWork = {
  contentId: number
  title: string
  contentType: 'MOVIE' | 'SERIES'
  platform: string
  posterUrl: string | null
  lastActivityAt: string | null   // 한 작품 보기에서 활동이 없으면 null
  review: Comment | null          // 작품 댓글 API 의 Item 그대로(mine=true)
  chatCount: number               // 잘리기 전 전량
  episodeCount: number
  chats: MyActivityChat[]         // 전체 보기 = 앞 3개 · 한 작품 보기 = ≤300
  /* 2차(HP-469) — 1차 서버엔 없다. 화면은 activity-pure phase2Of 로만 읽는다(optional 이라 직접 쓰면 tsc 가 막는다). */
  sceneCount?: number             // 반응한 장면 수(잘리기 전 전량)
  reactionCount?: number          // 반응 이벤트 수 — 평가 권유 문구
  scenes?: MyActivityScene[]      // 전체 보기 = 앞 6개 · 한 작품 보기 = ≤300
  likedCount?: number             // 좋아요한 채팅 수(유효한 것만)
  liked?: MyActivityLiked[]       // 전체 보기 = 앞 3개 · 한 작품 보기 = ≤300
}
export type MyActivity = { summary: MyActivitySummary; truncated: boolean; works: MyActivityWork[] }

/* ── 피드백(HP-426) — 세 레포(BE·익스텐션·웹) 공통 계약, 비로그인도 보낼 수 있다(Authorization 있으면 user_id 연결).
   이 화면(웹, 카탈로그)은 특정 회차 위에서 뜨지 않으므로 contentId·episodeId·appVersion·platform 은 항상 null(feedback-pure.js). */
export type FeedbackCategory = 'ANNOY' | 'BUG' | 'IDEA' | 'PRAISE'
export type FeedbackCreate = {
  surface: 'EXT' | 'WEB'
  score: number | null
  category: FeedbackCategory | null
  body: string | null
  appVersion: string | null
  platform: string | null
  contentId: number | null
  episodeId: number | null
  trigger: 'PROMPT' | 'MANUAL'
}

/* ── 호출 ─────────────────────────────────────────────────── */

async function get<T>(path: string, auth = false): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (auth) { const t = await accessToken(); if (t) headers.Authorization = `Bearer ${t}` }
  const res = await fetch(`${API_BASE}${path}`, { headers })
  if (!res.ok) throw new ApiError(res.status, path)
  return (await res.json()) as T
}

/** 로그인 필수 요청. 토큰이 없으면 401 로 취급해 호출자가 로그인 안내를 띄운다.
 *  `optionalAuth` 는 그 규칙을 끄는 요청용이다 — 피드백(HP-426)은 **비로그인도 보낼 수 있어야 하고**(서버 계약:
 *  Authorization 이 있으면 user_id 를 붙이고 없으면 NULL), 로그인 안내로 막으면 로그인 안 한 사람의 의견이 사라진다.
 *  이때는 토큰이 있으면 붙이고 없으면 그대로 보낸다. */
async function send<T>(method: 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown, opts: { optionalAuth?: boolean } = {}): Promise<T> {
  const t = await accessToken()
  if (!t && !opts.optionalAuth) throw new ApiError(401, path)
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!res.ok) {
    let code: string | undefined
    try { code = ((await res.json()) as { code?: string }).code } catch { /* 본문 없음 */ }
    throw new ApiError(res.status, path, code)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export class ApiError extends Error {
  status: number
  code?: string
  constructor(status: number, path: string, code?: string) {
    super(`${status} ${path}`)
    this.status = status
    this.code = code
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

  catalogHome: (window: Window) => get<CatalogHome>(`/api/v1/catalog/home?window=${window}`),
  catalogContent: (contentId: number) => get<CatalogContent>(`/api/v1/catalog/contents/${contentId}`),
  catalogEpisode: (episodeId: number) => get<CatalogEpisodeDetail>(`/api/v1/catalog/episodes/${episodeId}`),

  notices: (limit = 20) => get<Notice[]>(`/api/v1/notices?limit=${limit}`),

  comments: (contentId: number, sort: CommentSort, offset = 0, limit = 20) =>
    get<CommentPage>(`/api/v1/contents/${contentId}/comments?sort=${sort}&offset=${offset}&limit=${limit}`, true),
  myComment: async (contentId: number) => {
    const t = await accessToken()
    if (!t) return null
    const res = await fetch(`${API_BASE}/api/v1/contents/${contentId}/comments/mine`, { headers: { Accept: 'application/json', Authorization: `Bearer ${t}` } })
    if (res.status === 204) return null
    if (!res.ok) throw new ApiError(res.status, 'comments/mine')
    return (await res.json()) as Comment
  },
  writeComment: (contentId: number, body: { body: string; rating: number; spoiler: boolean }) =>
    send<Comment>('POST', `/api/v1/contents/${contentId}/comments`, body),
  deleteComment: (commentId: number) => send<void>('DELETE', `/api/v1/comments/${commentId}`),
  likeComment: (commentId: number, on: boolean) =>
    send<{ commentId: number; likeCount: number; liked: boolean }>(on ? 'PUT' : 'DELETE', `/api/v1/comments/${commentId}/like`),

  /* 내 활동(HP-443). 회원일 때만 부른다 — accessToken 이 null 이면 토큰 없이 나가 401 이 되고 화면은 로그인 안내로 간다. */
  myActivity: () => get<MyActivity>('/api/v1/users/me/activity', true),
  myActivityWork: (contentId: number, limit = 300) =>
    get<MyActivityWork>(`/api/v1/users/me/activity/contents/${contentId}?limit=${limit}`, true),

  sendFeedback: (body: FeedbackCreate) => send<{ id: number }>('POST', '/api/v1/feedback', body, { optionalAuth: true }),
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

/** 내 평가 지우기 — 확인 문구와 호출을 한 곳에 둔다(작품 페이지 Comments.tsx 와 내 활동 #/me 가 같이 쓴다, HP-443).
 *  지웠으면 true, 확인을 취소하면 false. 실패(401·403·404·5xx 는 ApiError, 네트워크 오류는 TypeError)는 그대로 던진다 —
 *  취소와 실패를 같은 false 로 접으면 호출부가 실패를 알릴 수 없다(내 활동은 카드에 한 줄, 작품 페이지는 종전처럼 조용히).
 *  컴포넌트 파일에 두지 않는 이유: Comments.tsx 가 컴포넌트 아닌 것을 export 하면 fast-refresh 린트가 는다. */
export async function deleteMyComment(c: Comment): Promise<boolean> {
  if (!confirm('내 평가를 지울까요?')) return false
  await api.deleteComment(c.id)
  return true
}

/** 영상 속 시점 — 60분 미만 `m:ss`, 이상 `h:mm:ss`(넷플릭스 재생바와 같은 꼴). `104:00` 처럼 분이 60을 넘으면 읽히지 않는다. */
export function fmtTime(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  const ss = String(s).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

/** 길이(러닝타임) — `1시간 44분`·`48분`. 시점(fmtTime)과 꼴이 같으면 길이인지 위치인지 구분되지 않는다. */
export function fmtDuration(sec: number): string {
  const total = Math.round(sec / 60)
  const h = Math.floor(total / 60)
  const m = total % 60
  return h ? (m ? `${h}시간 ${m}분` : `${h}시간`) : `${m}분`
}

export function episodeLabel(e: { seasonNumber: number | null; episodeNumber: number | null }, contentType?: string): string {
  if (contentType === 'MOVIE') return '영화'
  const s = e.seasonNumber ?? 0
  const n = e.episodeNumber ?? 0
  if (!n) return ''
  return s > 1 ? `시즌${s} ${n}화` : `${n}화`
}
