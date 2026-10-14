/* store-pure.js 의 타입. 규칙 본체는 node 로 검사하려고 타입 없는 .js 로 둔다(scripts/test-analytics.mjs). */
export type StoreMedium = 'catalog_nav' | 'catalog_title' | 'catalog_title_hero' | 'catalog_footer' | 'catalog_feedback'
export const STORE_BASE: string
export function storeUrl(medium: StoreMedium, path?: string): string
