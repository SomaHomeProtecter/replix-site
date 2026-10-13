// consent-pure.js 의 타입. 규칙 본체는 node 로 검사하려고 타입 없는 .js 로 두고(scripts/test-consent.mjs),
// 타입은 여기서 붙여 소비자(auth.ts·화면)가 인자·반환 모양을 컴파일 시점에 검사받게 한다.
export type ConsentVersions = { termsVersion: string; privacyVersion: string }
export type ConsentCurrent = { accepted?: boolean; requiredTermsVersion?: string | null; requiredPrivacyVersion?: string | null }
/** 동의 저장(PUT) 응답 중 계측이 보는 값 — newAccount 는 HP-619 배포 전 서버엔 없다. */
export type ConsentSaved = { newAccount?: boolean | null }
/** login_completed.login_kind(트래킹 플랜 §6). */
export type LoginKind = 'signup' | 'reconsent' | 'login' | 'consent'

export const CONSENT_SOURCE: 'web'
export const TERMS_VERSION: string
export const PRIVACY_VERSION: string
export function versionsFrom(current: ConsentCurrent | null | undefined): ConsentVersions
export function consentBody(versions: ConsentVersions): ConsentVersions & { source: 'web' }
export function canAccept(checks: { terms: boolean; privacy: boolean } | null | undefined): boolean
export function nicknameOf(me: { displayName?: string | null } | null | undefined): string | null
export function loginKindOf(saved: ConsentSaved | null | undefined): Exclude<LoginKind, 'login'>
export function acceptErrorMessage(code: string | null | undefined): string
