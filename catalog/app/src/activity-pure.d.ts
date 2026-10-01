/* activity-pure.js 의 타입. 규칙 본체는 node 로 검사하려고 타입 없는 .js 로 두고(scripts/test-activity.mjs),
   타입은 여기서 붙여 소비자(pages/Me.tsx·Title.tsx)가 인자·반환 모양을 컴파일 시점에 검사받게 한다. */
import type { MyActivityParent } from './api'

export const SPOILER_CUT: 3
export const LEAK_SCORE: 10
export const PREVIEW: 3
export const CHATS_CAP: 300

export const LEDE: string
export const GATE_LEDE: string
export const EMPTY_TITLE: string
export const EMPTY_BODY: string
export const EMPTY_ACTION: string
export const CHATS_HEAD: string
export const NO_CHATS: string
export const ASK_ACTION: string
export const SPOILER_TAG: string
export const HIDDEN_PARENT: string
export const REPLY_FALLBACK: string
export const TRUNCATED_NOTE: string
export const EXPIRED: string
export const FAILED: string
export const MORE_FAILED: string

export function hasSpoilerSignal(score: number | string | null | undefined): boolean
export function isLeakScore(score: number | string | null | undefined): boolean
/** null = 원문 없음('↳ 답글') · text null = 가려진 메시지(who 는 남는다) */
export type ParentView = { who: string; text: string | null }
export function parentView(parent: MyActivityParent | null | undefined): ParentView | null
export function snip(text: string | null | undefined, max?: number): string
export function relativeDay(iso: string | null | undefined, now?: number | Date): string
export function lastActivityLabel(iso: string | null | undefined, now?: number | Date): string

export type ActivityPageState = 'auth' | 'gate' | 'loading' | 'expired' | 'failed' | 'empty' | 'list'
export function activityPageState(input: {
  ready: boolean
  user: boolean
  loading: boolean
  data: { works: unknown[] } | null
  error: { status?: number } | null
}): ActivityPageState

export function moreLabel(chatCount: number, open: boolean): string | null
export function capNote(chatCount: number): string | null
export function averageLabel(avg: number | null | undefined): string
export function chatsCount(chatCount: number, episodeCount: number): string
export function askLine(chatCount: number): string
