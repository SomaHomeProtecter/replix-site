import { useEffect, useState } from 'react'
import { Footer, Nav } from './components/Chrome'
import Home from './pages/Home'
import Title from './pages/Title'

/* 해시 라우터. 서버 없이 file:// 로 열려야 하고 GitHub Pages 정적 배포라 history API 대신 해시를 쓴다.
   #/                 홈
   #/title/{contentId}[/ep/{episodeId}]   작품 상세(회차 선택 포함) */
export type Route =
  | { page: 'home' }
  | { page: 'title'; contentId: number; episodeId: number | null }

export function parseRoute(hash: string): Route {
  const m = hash.match(/^#\/title\/(\d+)(?:\/ep\/(\d+))?/)
  if (m) return { page: 'title', contentId: Number(m[1]), episodeId: m[2] ? Number(m[2]) : null }
  return { page: 'home' }
}

export function titleHref(contentId: number, episodeId?: number | null) {
  return `#/title/${contentId}${episodeId ? `/ep/${episodeId}` : ''}`
}

function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash)
  useEffect(() => {
    const on = () => setHash(window.location.hash)
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return parseRoute(hash)
}

export default function App() {
  const route = useHashRoute()
  const key = route.page === 'title' ? `title-${route.contentId}` : 'home'
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [key])

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-btn focus:bg-ink focus:px-4 focus:py-2 focus:text-white"
      >
        본문으로 건너뛰기
      </a>
      <Nav current={route.page} />
      <main id="main">
        {route.page === 'title' ? (
          <Title key={key} contentId={route.contentId} episodeId={route.episodeId} />
        ) : (
          <Home />
        )}
      </main>
      <Footer />
    </>
  )
}
