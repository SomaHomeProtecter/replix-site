/* 카탈로그 로그인(HP-124). 읽기는 전부 공개이고, 로그인은 작품 댓글·별점을 쓸 때만 필요하다.
   확장과 같은 Keycloak(realm replix, 클라이언트 replix-web)에 브라우저 SPA 방식(Authorization Code + PKCE)으로
   붙는다. 정적 사이트라 서버 세션이 없고, 토큰은 메모리에만 둔다(keycloak-js 가 갱신한다).

   해시 라우터(#/title/…)와 부딪히지 않도록 응답은 query 로 받는다(responseMode). 세션 확인은 사용자가 한 번이라도
   로그인한 적이 있을 때만(localStorage 표시) 조용히(iframe) 시도한다 — 처음 온 방문자에게 Keycloak 왕복을 시키지 않는다. */
import Keycloak from 'keycloak-js'
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
}

function hasFlag() { try { return localStorage.getItem(FLAG) === '1' } catch { return false } }
function setFlag(on: boolean) { try { on ? localStorage.setItem(FLAG, '1') : localStorage.removeItem(FLAG) } catch { /* 저장 불가 환경 */ } }

/** 앱 시작 시 한 번. 로그인 리다이렉트로 돌아온 경우(?code=…)와 이전에 로그인한 적이 있는 경우에만 Keycloak 을 초기화한다. */
export function initAuth(): Promise<void> {
  if (initPromise) return initPromise
  const k = instance()
  const returning = typeof location !== 'undefined' && /[?&](code|error)=/.test(location.search)
  if (!k || (!returning && !hasFlag())) { ready = true; initPromise = Promise.resolve(); emit(); return initPromise }
  initPromise = k
    .init({
      pkceMethod: 'S256',
      responseMode: 'query',
      onLoad: 'check-sso',
      silentCheckSsoRedirectUri: new URL('silent-check-sso.html', location.href.split('#')[0]).href,
      checkLoginIframe: false,
    })
    .then((ok) => { setFlag(!!ok); readUser() }, () => { setFlag(false); user = null })
    .finally(() => { ready = true; emit() })
  return initPromise
}

export function login() {
  const k = instance()
  if (!k) return
  const go = () => k.login({ redirectUri: location.href })
  if (initPromise) initPromise.then(go)
  else k.init({ pkceMethod: 'S256', responseMode: 'query', checkLoginIframe: false }).then(go, go)
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
