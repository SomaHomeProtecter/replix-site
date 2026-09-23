/* 카탈로그 로그인(HP-124). 읽기는 전부 공개이고, 로그인은 작품 댓글·별점을 쓸 때만 필요하다.
   확장과 같은 Keycloak(realm replix, 클라이언트 replix-web)에 브라우저 SPA 방식(Authorization Code + PKCE)으로
   붙는다. 정적 사이트라 서버 세션이 없고, 토큰은 메모리에만 둔다(keycloak-js 가 갱신한다).

   해시 라우터(#/title/…)와 부딪히지 않도록 응답은 query 로 받는다(responseMode). 세션 확인은 사용자가 한 번이라도
   로그인한 적이 있을 때만(localStorage 표시) 조용히(iframe) 시도한다 — 처음 온 방문자에게 Keycloak 왕복을 시키지 않는다. */
import Keycloak, { type KeycloakInitOptions } from 'keycloak-js'
import { useEffect, useState } from 'react'

const FLAG = 'replix_catalog_signed_in'

function meta(name: string): string | null {
  return typeof document !== 'undefined'
    ? document.querySelector(`meta[name="${name}"]`)?.getAttribute('content')?.trim() || null
    : null
}

export type AuthUser = { name: string; sub: string }
type Listener = () => void

const listeners = new Set<Listener>()
let kc: Keycloak | null = null
let ready = false
let user: AuthUser | null = null
let initPromise: Promise<void> | null = null

function emit() { listeners.forEach((l) => l()) }

function instance(): Keycloak | null {
  if (kc) return kc
  const url = meta('auth-base')
  const realm = meta('auth-realm')
  const clientId = meta('auth-client')
  if (!url || !realm || !clientId) return null
  kc = new Keycloak({ url, realm, clientId })
  kc.onAuthSuccess = kc.onAuthRefreshSuccess = () => { readUser(); emit() }
  kc.onAuthLogout = kc.onAuthRefreshError = () => { user = null; emit() }
  return kc
}

function readUser() {
  const t = kc?.tokenParsed as { preferred_username?: string; name?: string; sub?: string } | undefined
  user = kc?.authenticated && t?.sub ? { name: t.name || t.preferred_username || '사용자', sub: t.sub } : null
  /* 로그인이 끝났으면 제공자 선택은 더 물을 게 없다 — 재방문자는 조용한 세션 확인 중에도 (ready 를 기다리지 않는)
     좋아요로 모달을 열 수 있다. closeLogin 이 세대도 올리므로 그 사이 고른 제공자로의 이동도 거둔다. */
  if (user) closeLogin()
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
  if (!k) { ready = true; initPromise = Promise.resolve(); emit(); return initPromise }
  const returning = typeof location !== 'undefined' && /[?&](code|error)=/.test(location.search)
  const options: KeycloakInitOptions = { pkceMethod: 'S256', responseMode: 'query', checkLoginIframe: false }
  if (returning || hasFlag()) {
    options.onLoad = 'check-sso'
    options.silentCheckSsoRedirectUri = new URL('silent-check-sso.html', location.href.split('#')[0]).href
  }
  initPromise = k
    .init(options)
    .then((ok) => { setFlag(!!ok); readUser() }, () => { setFlag(false); user = null })
    .finally(() => { ready = true; emit() })
  return initPromise
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

/** 유효한 액세스 토큰(필요하면 갱신). 비로그인이면 null. */
export async function accessToken(): Promise<string | null> {
  if (!kc?.authenticated) return null
  try { await kc.updateToken(30) } catch { return null }
  return kc.token ?? null
}

export function useAuth(): { ready: boolean; user: AuthUser | null } {
  const [, tick] = useState(0)
  useEffect(() => {
    const l = () => tick((n) => n + 1)
    listeners.add(l)
    initAuth()
    return () => { listeners.delete(l) }
  }, [])
  return { ready, user }
}
