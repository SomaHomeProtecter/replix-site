import { useEffect, useState } from 'react'
import { Footer, Nav, NoticeBand } from './components/Chrome'
import { ConsentModal } from './components/ConsentModal'
import { LoginModal } from './components/LoginModal'
import Home from './pages/Home'
import Me from './pages/Me'
import Notice from './pages/Notice'
import Title from './pages/Title'
import { page } from './analytics'
import { fetchNotices } from './notices'
import { isAuthReturn, pageKey, parseRoute } from './route-pure.js'

/* 로그인 왕복으로 돌아온 로드인지는 모듈을 읽는 순간에 본다 — keycloak-js 가 init 에서 응답 쿼리를 주소창에서 지우기 전이다.
   이 로드의 첫 page_viewed 하나만 건너뛴다(route-pure.js isAuthReturn). */
let authReturnLoad = isAuthReturn(window.location.search)

/* 해시 라우터. 규칙 본체·링크 생성은 route-pure.js(노드로 검사, scripts/test-route.mjs) — 여기는 해시 구독과 화면 교체만.
   #/                                              홈
   #/title/{contentId}[/ep/{episodeId}][/review]   작품 상세(회차 선택 · /review = 평가 칸으로, HP-443)
   #/notice[/{noticeId}]                           공지(HP-425, 사이트 수준 페이지)
   #/me                                            내 활동(HP-443, 로그인 전용) */
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
  /* key 는 라우트가 바뀔 때 화면을 갈아 끼우고 아래 스크롤·계측 effect 를 다시 돌리는 용도다.
     공지·내 활동은 id 별로 나눌 필요가 없다 — 페이지 이름이 곧 key 다(공지의 id 는 anchor 가 담는다). */
  const key = pageKey(route)
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
  /* 첫 fetch 가 실패하면 notices.ts 가 공유 캐시를 비워 다음 호출이 재시도하지만, Nav·NoticeBand 는
     라우트가 바뀌어도 재마운트되지 않아 그 '다음 호출'이 세션 내내 오지 않는다. 그래서 라우트 전환마다
     여기서 한 번 부른다(성공해 캐시가 있으면 no-op 이다). */
  useEffect(() => { void fetchNotices() }, [route.page, anchor])
  /* 계측: 페이지(key)가 바뀔 때만 page_viewed — 홈 안 앵커·공지 항목은 스크롤 이동이라 세지 않는다(HP-615 전에는 누를 때마다
     하나씩 더 나갔다). 로그인 왕복으로 다시 열린 로드도 건너뛴다(위 authReturnLoad). page_path 는 analytics.js 가 해시에서
     라우트 이름까지만 남긴다(작품·회차 ID 제거). */
  useEffect(() => {
    if (authReturnLoad) { authReturnLoad = false; return }
    page({ route: route.page })
  }, [key, route.page])

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-btn focus:bg-ink focus:px-4 focus:py-2 focus:text-white"
      >
        본문으로 건너뛰기
      </a>
      <Nav current={route.page} />
      {/* 공지 페이지에서는 띠를 띄우지 않는다 — 목록이 곧 띠와 같은 내용이고, 페이지 진입의 markSeen 으로
          '새 공지' 띠가 스스로 사라지며 레이아웃이 위로 밀린다(읽는 중에 항목이 튄다). */}
      {route.page !== 'notice' && <NoticeBand />}
      <main id="main">
        {route.page === 'notice' ? (
          <Notice noticeId={route.noticeId} />
        ) : route.page === 'title' ? (
          <Title key={key} contentId={route.contentId} episodeId={route.episodeId} review={route.review} />
        ) : route.page === 'me' ? (
          <Me />
        ) : (
          <Home />
        )}
      </main>
      <Footer />
      {/* 로그인 진입점(헤더·댓글 쓰기·좋아요)이 모두 여는 제공자 선택 모달 — 한 곳에만 둔다(HP-447). */}
      <LoginModal />
      {/* 로그인 뒤 약관·처리방침 동의 — 동의해야 Replix 계정이 생긴다(HP-449). */}
      <ConsentModal />
    </>
  )
}
