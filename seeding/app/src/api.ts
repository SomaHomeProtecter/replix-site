/* 시딩 1단계 API(HP-434) — /api/v1/admin/seeding/**. 전부 관리자 롤 JWT 필요. */
import { accessToken } from './auth'
import { API_BASE } from './env'

export type SourceKind = 'DCINSIDE' | 'THEQOO'
export type WorkSource = { id: number; kind: SourceKind; boardId: string; enabled: boolean }
export type Work = {
  id: number; code: string; title: string; airWeekday: number | null; airTime: string | null
  defaultRuntimeSec: number | null; enabled: boolean; sources: WorkSource[]
}
export type Episode = {
  id: number; workId: number; airDate: string; label: string | null; airStartAt: string
  airEndAt: string | null; runtimeSec: number | null; episodeId: number | null
}
export type CollectionStatus = 'QUEUED' | 'RUNNING' | 'DONE' | 'FAILED' | 'CANCELLED'
export type Collection = {
  id: number; seedEpisodeId: number; status: CollectionStatus; windowStartAt: string; windowEndAt: string
  progress: string | null; error: string | null; postCount: number; requestedBy: string | null
  startedAt: string | null; finishedAt: string | null; createdAt: string
}
export type Post = {
  id: number; source: SourceKind; sourcePostId: string; postedAt: string; precision: 'SECOND' | 'MINUTE'
  title: string; body: string | null; authorToken: string; sourceUrl: string | null
}
export type SceneNote = { id: number; seedEpisodeId: number; minuteAt: string; note: string; confidence: string | null; tag: string | null }
export type NewSceneNote = { minuteAt: string; note: string; confidence: string | null; tag: string | null }
export type DensityBucket = { at: string; count: number }
export type Density = { from: string; to: string; bucketMinutes: number; buckets: DensityBucket[]; suggestedStartAt: string | null; suggestedEndAt: string | null; note: string }
export type PostsPage = { items: Post[]; nextCursor: number | null; countBySource: Partial<Record<SourceKind, number>> }

export class ApiError extends Error {
  status: number
  code: string | null
  constructor(status: number, code: string | null, message: string) { super(message); this.status = status; this.code = code }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const t = await accessToken()
  if (!t) throw new ApiError(401, 'NO_TOKEN', '로그인이 필요합니다')
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { Accept: 'application/json', Authorization: `Bearer ${t}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 204) return undefined as T
  const text = await res.text()
  let json: unknown = null
  try { json = text ? JSON.parse(text) : null } catch { /* 본문이 JSON 이 아니면 아래 상태 처리로 */ }
  if (!res.ok) {
    const e = json as { code?: string; message?: string } | null
    throw new ApiError(res.status, e?.code ?? null, e?.message ?? `${res.status} ${res.statusText}`)
  }
  return json as T
}

export const api = {
  works: () => call<Work[]>('GET', '/api/v1/admin/seeding/works'),
  episodes: (workId: number) => call<Episode[]>('GET', `/api/v1/admin/seeding/works/${workId}/episodes`),
  createEpisode: (workId: number, body: { airDate: string; label?: string; airStartAt?: string; airEndAt?: string; runtimeSec?: number }) =>
    call<Episode>('POST', `/api/v1/admin/seeding/works/${workId}/episodes`, body),
  sceneNotes: (id: number) => call<SceneNote[]>('GET', `/api/v1/admin/seeding/episodes/${id}/scene-notes`),
  putSceneNotes: (id: number, notes: NewSceneNote[]) => call<SceneNote[]>('PUT', `/api/v1/admin/seeding/episodes/${id}/scene-notes`, { notes }),
  updateEpisode: (id: number, body: { label: string | null; airStartAt: string; airEndAt: string | null; runtimeSec: number | null; episodeId: number | null }) =>
    call<Episode>('PATCH', `/api/v1/admin/seeding/episodes/${id}`, body),
  collections: (episodeId: number) => call<Collection[]>('GET', `/api/v1/admin/seeding/episodes/${episodeId}/collections`),
  startCollection: (episodeId: number) => call<Collection>('POST', `/api/v1/admin/seeding/episodes/${episodeId}/collections`),
  collection: (id: number) => call<Collection>('GET', `/api/v1/admin/seeding/collections/${id}`),
  posts: (id: number, opts: { source?: SourceKind; cursor?: number | null; from?: string | null; order?: 'asc' | 'desc'; size?: number } = {}) => {
    const q = new URLSearchParams()
    if (opts.source) q.set('source', opts.source)
    if (opts.cursor) q.set('cursor', String(opts.cursor))
    else if (opts.from) q.set('from', opts.from)
    if (opts.order) q.set('order', opts.order)
    q.set('size', String(opts.size ?? 100))
    return call<PostsPage>('GET', `/api/v1/admin/seeding/collections/${id}/posts?${q}`)
  },
  density: (id: number) => call<Density>('GET', `/api/v1/admin/seeding/collections/${id}/density`),
  cancel: (id: number) => call<Collection>('POST', `/api/v1/admin/seeding/collections/${id}/cancel`),
  remove: (id: number) => call<void>('DELETE', `/api/v1/admin/seeding/collections/${id}`),
  /* 내보내기는 Authorization 이 필요해 <a href> 로 못 연다 — 받아서 blob 링크로 저장한다. */
  async download(id: number): Promise<void> {
    const t = await accessToken()
    if (!t) throw new ApiError(401, 'NO_TOKEN', '로그인이 필요합니다')
    const res = await fetch(`${API_BASE}/api/v1/admin/seeding/collections/${id}/export`, { headers: { Authorization: `Bearer ${t}` } })
    if (!res.ok) throw new ApiError(res.status, null, `${res.status} ${res.statusText}`)
    const name = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '')?.[1] ?? `seed-collection-${id}.json`
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  },
}
