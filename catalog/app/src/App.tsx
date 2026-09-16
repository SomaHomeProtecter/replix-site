import { useEffect, useState } from 'react'
import { Footer, Nav, NoticeBand } from './components/Chrome'
import Home from './pages/Home'
import Notice from './pages/Notice'
import Title from './pages/Title'
import { page } from './analytics'

/* 해시 라우터. 서버 없이 file:// 로 열려야 하고 GitHub Pages 정적 배포라 history API 대신 해시를 쓴다.
   #/                 홈
   #/title/{contentId}[/ep/{episodeId}]   작품 상세(회차 선택 포함)
   #/notice[/{noticeId}]                  공지(HP-425, 사이트 수준 페이지) */
export type Route =
  | { page: 'home'; anchor: string | null }
  | { page: 'title'; contentId: number; episodeId: number | null }
  | { page: 'notice'; noticeId: number | null }

/* '#/ranking' 처럼 홈 섹션 앵커도 라우트로 받는다 — 해시 라우터라 일반 '#ranking' 을 쓸 수 없어서다. */
export function parseRoute(hash: string): Route {
  /* '#/notice' 는 홈 앵커 규칙(#/[a-z]+)과 겹치므로 그보다 먼저 판정한다. */
  const n = hash.match(/^#\/notice(?:\/(\d+))?$/)
  if (n) return { page: 'notice', noticeId: n[1] ? Number(n[1]) : null }
  const m = hash.match(/^#\/title\/(\d+)(?:\/ep\/(\d+))?/)
  if (m) return { page: 'title', contentId: Number(m[1]), episodeId: m[2] ? Number(m[2]) : null }
  const a = hash.match(/^#\/([a-z]+)$/)
  return { page: 'home', anchor: a ? a[1] : null }
}

export function titleHref(contentId: number, episodeId?: number | null) {
  return `#/title/${contentId}${episodeId ? `/ep/${episodeId}` : ''}`
}

/** 공지 페이지 링크. id 를 주면 그 항목으로 스크롤·강조된다(확장 공지함의 '전문 보기 ↗'가 쓰는 형식). */
export function noticeHref(id?: number | null) {
  return `#/notice${id ? `/${id}` : ''}`
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
  const key = route.page === 'title' ? `title-${route.contentId}` : route.page === 'notice' ? `notice-${route.noticeId ?? ''}` : 'home'
  /* 공지 항목(#/notice/<id>)도 앵커로 다룬다 — 그러지 않으면 아래 effect 의 scrollTo(0,0) 가
     Notice 안에서 한 scrollIntoView 를 (자식 effect 가 먼저 돌므로) 곧바로 되돌린다. */
  const anchor = route.page === 'home' ? route.anchor : route.page === 'notice' && route.noticeId ? `n-${route.noticeId}` : null
  useEffect(() => {
    if (anchor) {
      const el = document.getElementById(anchor)
      if (el) { el.scrollIntoView({ block: 'start' }); return }
    }
    window.scrollTo(0, 0)
  }, [key, anchor])
  // 계측: 라우트마다 page_viewed. page_path 는 analytics.js 가 해시에서 라우트 이름까지만 남긴다(작품·회차 ID 제거).
  useEffect(() => { page({ route: route.page }) }, [key, anchor, route.page])

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-btn focus:bg-ink focus:px-4 focus:py-2 focus:text-white"
      >
        본문으로 건너뛰기
      </a>
      <Nav current={route.page} />
      <NoticeBand />
      <main id="main">
        {route.page === 'notice' ? (
          <Notice noticeId={route.noticeId} />
        ) : route.page === 'title' ? (
          <Title key={key} contentId={route.contentId} episodeId={route.episodeId} />
        ) : (
          <Home />
        )}
      </main>
      <Footer />
    </>
  )
}
