// watch-pure.js 의 타입. 규칙 본체는 node 로 검사하려고 타입 없는 .js 로 두고(scripts/test-deeplink.mjs), 타입은 여기서 붙인다.
export function watchUrl(platform: string, platformEpisodeId: string | null | undefined, sec?: number, showId?: string | number | null): string | null
export function watchPlatformOf(url: string | null | undefined): 'netflix' | 'laftel' | null
