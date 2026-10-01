/* route-pure.js 의 타입. 라우터 본체는 node 로 검사하려고 타입 없는 .js 로 두고(scripts/test-route.mjs),
   타입은 여기서 붙여 소비자(App.tsx·Chrome.tsx·화면)가 라우트 모양을 컴파일 시점에 검사받게 한다. */
export type Route =
  | { page: 'home'; anchor: string | null }
  | { page: 'title'; contentId: number; episodeId: number | null; review: boolean }
  | { page: 'notice'; noticeId: number | null }
  | { page: 'me' }

export function parseRoute(hash: string): Route
export function titleHref(contentId: number, episodeId?: number | null): string
export function reviewHref(contentId: number): string
export function noticeHref(id?: number | null): string
export const ME_HREF: '#/me'
