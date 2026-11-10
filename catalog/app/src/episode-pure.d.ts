// episode-pure.js 의 타입. 규칙 본체는 node 로 검사하려고 타입 없는 .js 로 두고(scripts/test-episode.mjs), 타입은 여기서 붙인다.
/** 회차 표기에 쓰는 원값. contentType·hasEpisodeNumber 는 HP-807 BE 부터 실린다 — 옛 서버엔 없다. */
export type EpisodeRef = {
  seasonNumber?: number | null
  episodeNumber?: number | null
  contentType?: string | null
  hasEpisodeNumber?: boolean | null
}
export function hasEpisodeNumber(e: EpisodeRef | null | undefined, contentType?: string | null): boolean
export function seasonLabel(seasonNumber: number | null | undefined): string
export function episodeLabel(e: EpisodeRef | null | undefined, contentType?: string | null): string
export function episodeTitle(title: string | null | undefined, e: EpisodeRef | null | undefined, work?: string | null, contentType?: string | null): string
export function joinParts(parts: (string | null | undefined)[], sep: string): string
export function episodeLine(e: EpisodeRef | null | undefined, title: string | null | undefined, work?: string | null, contentType?: string | null): string
export function episodeName(e: EpisodeRef | null | undefined, title: string | null | undefined, work?: string | null, contentType?: string | null): string
