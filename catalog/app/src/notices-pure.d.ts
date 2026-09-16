/* notices-pure.js 의 타입. 규칙 본체는 node 로 검사하려고 타입 없는 .js 로 두고(scripts/test-notices.mjs),
   타입은 여기서 붙여 소비자(notices.ts·화면)가 tone·인자 순서를 컴파일 시점에 검사받게 한다. */
import type { Notice } from './api'

export type BandTone = 'maint' | 'incident' | 'notice'
export type Band = { notice: Notice; tone: BandTone }

export function unreadCount(items: Notice[], seenId: number): number
export function pickBand(items: Notice[], seenId: number, dismissed: number[]): Band | null
