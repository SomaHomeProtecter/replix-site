/* 대상 서버는 랜딩과 같은 규칙으로 정한다 — HTML 의 <meta name="api-base"> 한 곳(index.html).
   메타가 없으면 VITE_API_BASE, 그것도 없으면 개발 서버. api.ts(공개 API)와 auth.ts(동의·내 정보)가 함께 쓰므로
   둘 중 어느 쪽에도 두지 않는다 — api.ts 가 auth.ts 를 부르므로 거꾸로 부르면 순환한다. */
function resolveApiBase(): string {
  const meta = typeof document !== 'undefined' ? document.querySelector('meta[name="api-base"]') : null
  const fromMeta = meta?.getAttribute('content')?.trim()
  const fromEnv = (import.meta.env.VITE_API_BASE as string | undefined)?.trim()
  return (fromMeta || fromEnv || 'https://api.replix-dev.site').replace(/\/$/, '')
}
export const API_BASE: string = resolveApiBase()
