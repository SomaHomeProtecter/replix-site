// feedback-pure.js 의 타입. 규칙 본체는 node 로 검사하려고 타입 없는 .js 로 두고(scripts/test-feedback.mjs),
// 타입은 여기서 붙여 소비자(화면)가 인자·반환 모양을 컴파일 시점에 검사받게 한다.
import type { FeedbackCategory, FeedbackCreate } from './api'

export function canSend(input: { score: number; body: string }): boolean
export function buildPayload(input: { score: number; category: FeedbackCategory | null | ''; body: string }): FeedbackCreate
export function feedbackNote(loggedIn: boolean): string
export function errorMessage(status: number): string
export const STAR_LABELS: string[]
export const STORE_URL: string
export const CHIPS: ReadonlyArray<{ value: FeedbackCategory; label: string }>
export const Q_SCORE: string
export const Q_CATEGORY: string
export const PLACEHOLDER: string
export const THANKS: string
export const STORE_TEXT: string
