/* 카탈로그 로그인(HP-124). 읽기는 전부 공개이고, 로그인은 작품 댓글·별점을 쓸 때만 필요하다.
   확장과 같은 Keycloak(realm replix, 클라이언트 replix-web)에 브라우저 SPA 방식(Authorization Code + PKCE)으로
   붙는다. 정적 사이트라 서버 세션이 없고, 토큰은 메모리에만 둔다(keycloak-js 가 갱신한다).

   해시 라우터(#/title/…)와 부딪히지 않도록 응답은 query 로 받는다(responseMode). 세션 확인은 사용자가 한 번이라도
   로그인한 적이 있을 때만(localStorage 표시) 조용히(iframe) 시도한다 — 처음 온 방문자에게 Keycloak 왕복을 시키지 않는다.

   로그인만으로는 Replix 회원이 아니다(HP-449). 확장과 같이 약관·처리방침에 동의해야 계정이 생긴다 — 로그인 뒤 동의
   여부를 조회만 하고(계정을 만들지 않는 API), 미동의면 동의 모달을 띄운다. 동의 저장이 곧 계정 생성이고, 그 전에는
   계정 API(내 평가·쓰기·좋아요·로그인 상태의 피드백)에 토큰을 싣지 않는다 — 실으면 BE findOrCreate 가 동의 없이 계정을
   만든다. 화면의 이름은 서버의 랜덤 닉네임(HP-236)이다 — 토큰의 이메일·실명을 쓰지 않는다. */
import Keycloak, { type KeycloakInitOptions } from 'keycloak-js'
import { useEffect, useState } from 'react'
import { track } from './analytics'
import { API_BASE } from './config'
import { consentBody, nicknameOf, versionsFrom, type ConsentCurrent, type ConsentVersions } from './consent-pure.js'

const FLAG = 'replix_catalog_signed_in'

function meta(name: string): string | null {
  return typeof document !== 'undefined'
    ? document.querySelector(`meta[name="${name}"]`)?.getAttribute('content')?.trim() || null
    : null
}

/** 화면이 보는 로그인 사용자 = 동의를 마친 Replix 회원. name 은 서버의 랜덤 닉네임이다. */
export type AuthUser = { name: string; sub: string }
type Listener = () => void

/* 계정 상태 — 로그인(Keycloak 토큰)과 계정(동의한 Replix 회원)을 가른다.
   none 비로그인 · checking 로그인됐고 동의 여부 확인 중 · consent 동의가 필요하다 · member 동의한 회원 */
type Account =
  | { kind: 'none' }
  | { kind: 'checking' }
  | { kind: 'consent'; versions: ConsentVersions }
  | { kind: 'member'; name: string | null }

const listeners = new Set<Listener>()
let kc: Keycloak | null = null
let initDone = false
let sub: string | null = null
let account: Account = { kind: 'none' }
let initPromise: Promise<void> | null = null
/* 계정 확인 세대. 확인하는 사이 로그아웃·동의 거부가 끼면 늦게 온 응답이 그 뒤의 상태를 덮지 않게 한다. */
let accountGen = 0

function emit() { listeners.forEach((l) => l()) }
function setAccount(next: Account) { account = next; emit() }

function instance(): Keycloak | null {
  if (kc) return kc
  const url = meta('auth-base')
  const realm = meta('auth-realm')
  const clientId = meta('auth-client')
  if (!url || !realm || !clientId) return null
  kc = new Keycloak({ url, realm, clientId })
  kc.onAuthSuccess = kc.onAuthRefreshSuccess = () => { readSub() }
  kc.onAuthLogout = kc.onAuthRefreshError = () => { sub = null; accountGen++; setAccount({ kind: 'none' }) }
  return kc
}

function readSub() {
  const t = kc?.tokenParsed as { sub?: string } | undefined
  sub = kc?.authenticated && t?.sub ? t.sub : null
  /* 로그인이 끝났으면 제공자 선택은 더 물을 게 없다 — 재방문자는 조용한 세션 확인 중에도 (ready 를 기다리지 않는)
     좋아요로 모달을 열 수 있다. closeLogin 이 세대도 올리므로 그 사이 고른 제공자로의 이동도 거둔다. */
  if (sub) closeLogin()
}

function hasFlag() { try { return localStorage.getItem(FLAG) === '1' } catch { return false } }
function setFlag(on: boolean) { try { on ? localStorage.setItem(FLAG, '1') : localStorage.removeItem(FLAG) } catch { /* 저장 불가 환경 */ } }

/** 앱 시작 시 한 번. Keycloak init() 자체는 누구에게나 한다 — url·realm 을 직접 주므로 onLoad 없는 init() 은 네트워크
 *  요청이 없고, login() 이 쓰는 어댑터를 여기서 만든다(처음 온 방문자에게 init 까지 건너뛰었더니 login() 이
 *  "Cannot read properties of undefined (reading 'login')" 로 터져 버튼이 먹통이었다 — HP-445, 2026-09-23).
 *  처음 온 방문자에게 아끼는 것은 조용한 세션 확인(check-sso, Keycloak iframe 왕복)뿐이므로 그것만 로그인
 *  리다이렉트로 돌아온 경우(?code=…)와 이전에 로그인한 적이 있는 경우로 한정한다. */
export function initAuth(): Promise<void> {
  if (initPromise) return initPromise
  const k = instance()
  if (!k) { initDone = true; initPromise = Promise.resolve(); emit(); return initPromise }
  const returning = typeof location !== 'undefined' && /[?&](code|error)=/.test(location.search)
  const options: KeycloakInitOptions = { pkceMethod: 'S256', responseMode: 'query', checkLoginIframe: false }
  if (returning || hasFlag()) {
    options.onLoad = 'check-sso'
    options.silentCheckSsoRedirectUri = new URL('silent-check-sso.html', location.href.split('#')[0]).href
  }
  initPromise = k
    .init(options)
    .then((ok) => {
      setFlag(!!ok); readSub()
      if (ok) void resolveAccount(returning) // 계정 확인이 끝나기 전에는 ready 가 서지 않는다
    }, () => { setFlag(false); sub = null })
    .finally(() => { initDone = true; emit() })
  return initPromise
}

async function freshToken(): Promise<string | null> {
  if (!kc?.authenticated) return null
  try { await kc.updateToken(30) } catch { return null }
  return kc.token ?? null
}

async function getJson<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`${path} ${res.status}`)
  return (await res.json()) as T
}

const CONSENT_PATH = '/api/v1/users/me/legal-consents'

/** 로그인 뒤 한 번 — 동의 여부를 조회만 하고(계정을 만들지 않는 API), 동의했으면 회원 정보를, 아니면 동의 모달을 연다.
 *  조회가 실패하면 미동의로 본다(확장과 같다) — 기능을 열지 않고 모달을 보이며, 이미 동의한 사람이면 저장이 멱등이다. */
async function resolveAccount(justLoggedIn: boolean) {
  const gen = ++accountGen
  setAccount({ kind: 'checking' })
  const token = await freshToken()
  if (gen !== accountGen) return
  if (!token) { setAccount({ kind: 'none' }); return }
  let current: ConsentCurrent | null = null
  try { current = await getJson<ConsentCurrent>(`${CONSENT_PATH}/current`, token) } catch { /* 미동의로 본다 */ }
  if (gen !== accountGen) return
  if (current?.accepted) await becomeMember(gen, token, justLoggedIn ? false : null)
  else setAccount({ kind: 'consent', versions: versionsFrom(current) })
}

/** 동의한 회원이 됐다 — 닉네임(/users/me displayName)을 읽는다. 이 API 는 계정을 만들므로 동의 뒤에만 부른다.
 *  닉네임을 못 읽어도 회원이다(이름 자리엔 '내 계정'). isNewUser 가 null 이면 새로고침으로 세션을 되살린 것이라 세지 않는다. */
async function becomeMember(gen: number, token: string, isNewUser: boolean | null) {
  let name: string | null = null
  try { name = nicknameOf(await getJson<{ displayName?: string | null }>('/api/v1/users/me', token)) } catch { /* 이름 없이 회원 */ }
  if (gen !== accountGen) return
  setAccount({ kind: 'member', name })
  if (isNewUser !== null) track('login_completed', { is_new_user: isNewUser }) // 트래킹 플랜 v4
}

/** 동의 저장 = 계정 생성. 실패하면 서버 오류 코드를 돌려준다 — 문서가 갱신됐으면(OUTDATED_LEGAL_DOCUMENTS) 서버의
 *  새 버전을 다시 읽어 두므로, 화면은 체크를 풀고 새 문서에 다시 동의받는다(확장과 같다). */
export async function acceptConsent(): Promise<{ ok: boolean; code?: string }> {
  if (account.kind !== 'consent') return { ok: false }
  const { versions } = account
  const gen = accountGen
  const token = await freshToken()
  if (!token || gen !== accountGen) return { ok: false }
  let res: Response
  try {
    res = await fetch(`${API_BASE}${CONSENT_PATH}`, {
      method: 'PUT',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(consentBody(versions)),
    })
  } catch { return { ok: false } }
  if (gen !== accountGen) return { ok: false }
  if (res.ok) { await becomeMember(gen, token, true); return { ok: true } }
  let code: string | undefined
  try { code = ((await res.json()) as { code?: string }).code } catch { /* 본문 없음 */ }
  if (code === 'OUTDATED_LEGAL_DOCUMENTS') {
    try {
      const current = await getJson<ConsentCurrent>(`${CONSENT_PATH}/current`, token)
      if (gen === accountGen) setAccount({ kind: 'consent', versions: versionsFrom(current) })
    } catch { /* 번들 버전 그대로 — 다시 거절되면 같은 안내가 뜬다 */ }
  }
  return { ok: false, code }
}

/** 동의하지 않으면 로그인 전으로 되돌린다 — 확장과 같이 OAuth 토큰만 폐기한다. 동의 전에는 계정 API 를 부르지 않으므로
 *  이 흐름으로 만들어진 계정은 없다. 로그인 표시도 지워 새로고침 때 조용한 세션 확인으로 되살아나지 않게 한다. */
export function declineConsent() {
  setFlag(false)
  sub = null
  accountGen++
  setAccount({ kind: 'none' })
  kc?.clearToken()
}

/* 로그인 제공자(HP-447). 순서·문구는 확장(HP-71, Replix-extension config.js PROVIDERS)과 같다. id 는 Keycloak
   IdP alias 와 **정확히** 같아야 한다 — kc_idp_hint 로 그대로 나가 그 IdP 로 직행한다. */
export type Provider = 'google' | 'kakao' | 'naver'
export const PROVIDERS: readonly { id: Provider; label: string }[] = [
  { id: 'google', label: 'Google' },
  { id: 'kakao', label: '카카오' },
  { id: 'naver', label: '네이버' },
]

/* 제공자 선택 모달의 열림. 인증 상태와 따로 알린다 — 모달을 여닫을 때마다 useAuth 소비자 전부를 다시 그리지 않게. */
const chooserListeners = new Set<Listener>()
let chooserOpen = false
function setChooser(open: boolean) {
  if (chooserOpen === open) return
  chooserOpen = open
  chooserListeners.forEach((l) => l())
}

/** 로그인 진입점(헤더 '로그인', 댓글 '로그인하고 남기기', 비로그인 좋아요)은 곧장 IdP 로 가지 않고 제공자 선택 모달을 연다. */
export function login() {
  if (instance()) setChooser(true)
}

/* 모달을 닫을 때마다 올라가는 세대. 재방문자는 조용한 세션 확인이 끝나야 init 이 끝나는데(최대 10초), 그 사이
   제공자를 고르고 닫으면 늦게 끝난 init 이 그래도 IdP 로 보내 버린다 — 고를 때의 세대가 그대로일 때만 간다. */
let chooserGen = 0

export function closeLogin() { chooserGen++; setChooser(false) }

/** 고른 제공자로 직행한다(keycloak-js idpHint = kc_idp_hint). 성공하면 페이지가 떠나므로 끝나지 않고,
 *  리다이렉트를 시작하지 못했을 때만(비보안 출처의 Web Crypto 부재 등) 거부된다. */
export function loginWith(provider: Provider): Promise<void> {
  const k = instance()
  if (!k) return Promise.reject(new Error('로그인 설정(auth-* 메타)이 없다'))
  const gen = chooserGen
  return initAuth().then(() => {
    if (gen !== chooserGen) return // 기다리는 사이 모달을 닫았다 — 가지 않는다
    return k.login({ redirectUri: location.href, idpHint: provider })
  })
}

export function useLoginChooser(): boolean {
  const [, tick] = useState(0)
  useEffect(() => {
    const l = () => tick((n) => n + 1)
    chooserListeners.add(l)
    return () => { chooserListeners.delete(l) }
  }, [])
  return chooserOpen
}

export function logout() {
  setFlag(false)
  kc?.logout({ redirectUri: location.href.split('?')[0] })
}

/** 계정 API 용 액세스 토큰(필요하면 갱신). 동의한 회원만 받는다 — 비로그인·동의 전이면 null 이라 호출부는
 *  비로그인처럼 동작하고(피드백은 익명으로 간다), BE 가 동의 없이 계정을 만들 길이 없다(HP-449). */
export async function accessToken(): Promise<string | null> {
  return account.kind === 'member' ? freshToken() : null
}

function snapshot(): { ready: boolean; user: AuthUser | null } {
  return {
    ready: initDone && account.kind !== 'checking',
    user: account.kind === 'member' && sub ? { name: account.name ?? '내 계정', sub } : null,
  }
}

export function useAuth(): { ready: boolean; user: AuthUser | null } {
  const [, tick] = useState(0)
  useEffect(() => {
    const l = () => tick((n) => n + 1)
    listeners.add(l)
    initAuth()
    return () => { listeners.delete(l) }
  }, [])
  return snapshot()
}

/** 동의 모달을 띄울 때인가 — 로그인했고 아직 동의 전. */
export function useConsentRequired(): boolean {
  const [, tick] = useState(0)
  useEffect(() => {
    const l = () => tick((n) => n + 1)
    listeners.add(l)
    return () => { listeners.delete(l) }
  }, [])
  return account.kind === 'consent'
}
