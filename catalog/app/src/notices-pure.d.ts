/* notices-pure.js 의 타입. 규칙 본체는 node 로 검사하려고 타입 없는 .js 로 두고(scripts/test-notices.mjs),
   타입은 여기서 붙여 소비자(notices.ts·화면)가 tone·인자 순서를 컴파일 시점에 검사받게 한다. */
import type { Notice } from './api'

export type BandTone = 'maint' | 'incident' | 'notice'
export type Band = { notice: Notice; tone: BandTone }

export function applyLoadFailure(prev: Notice[] | null): Notice[]
/* seenAt = 읽음 기준. 본 목록의 가장 늦은 게시 시각(epoch ms, HP-427). */
export function noticeTime(n: Notice): number
export function isFresh(n: Notice, seenAt: number): boolean
export function maxNoticeTime(items: Notice[]): number
export function migrateSeenAt(items: Notice[], seenId: number): number
export function unreadCount(items: Notice[], seenAt: number): number
export function pickBand(items: Notice[], seenAt: number, dismissed: number[]): Band | null
export function noticeDate(iso: string | null): string

export type NoticePageState = 'loading' | 'failed' | 'empty' | 'missing' | 'stale' | 'list'
export function noticePageState(input: {
  items: Notice[] | null
  failed: boolean
  loading: boolean
  noticeId: number | null
}): NoticePageState
