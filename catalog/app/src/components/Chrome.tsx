import { useCallback, useEffect, useRef, useState } from 'react'
import { CaretDownIcon, MagnifyingGlassIcon } from '@phosphor-icons/react'
import { api, type ContentSearchItem } from '../api'
import logo from '../../../../docs/assets/logo/replix-horizontal-light.png'
import { noticeHref, titleHref } from '../App'
import { engaged } from '../analytics'
import { login, logout, useAuth } from '../auth'
import { dismissBand, pickBand, unreadCount, useNotices } from '../notices'
import { FeedbackModal } from './FeedbackModal'

/* 공개 카탈로그의 실제 목적지만 둔다. 같은 곳으로 가는 메뉴 두 개나 알림 같은 빈 약속은 두지 않는다.
   로그인은 2026-09-14부터 있다(작품 댓글·별점, HP-124) — 개인화가 아니라 쓰기 권한이다. 화면은 여전히 누구에게나 같다. */
const STORE = 'https://chromewebstore.google.com/detail/replix/lgfllmbombkdbebcepigebnbmeaacikp'

/* 메뉴바는 랜딩과 같은 치수지만 항목은 섞지 않는다(2026-09-05): 로고 옆 '인기 작품' 라벨이 지금
   어느 표면인지 말하고, 링크는 이 표면의 섹션뿐이다. 랜딩으로는 오른쪽 '홈으로'.
   사이트 수준 페이지(공지)는 섹션 묶음 밖 오른쪽 '홈으로'와 로그인 사이에 둔다(2026-09-16 김지호) — 섹션 링크가 아니라 규칙과 충돌하지 않는다. */
const NAV = [
  { href: '#/ranking', label: '많이 본 작품' },
  { href: '#/hot', label: '뜨거운 순간' },
  { href: '#/live', label: '지금 보는 중' },
]

/* 원 시안과 같은 60px 한 줄 바, 좌우 48px 거터. */
export function Nav({ current }: { current: 'home' | 'title' | 'notice' }) {
  /* 랜딩 .nav 와 같은 치수: sticky 66px, 같은 배경·블러, .wrap 안에 gap 26px, 로고 34px, 메뉴 14px gap 24px,
     오른쪽 끝 .btn--primary.btn--sm. 랜딩과 다른 것은 '홈으로' 버튼 하나뿐이다(작품 탐색에서 랜딩으로 돌아가는 길). */
  return (
    <header
      className="sticky top-0 z-40 flex h-[66px] items-center border-b border-line"
      style={{ background: 'rgba(250,249,249,.86)', backdropFilter: 'blur(16px) saturate(180%)', WebkitBackdropFilter: 'blur(16px) saturate(180%)' }}
    >
      <div className="wrap flex w-full items-center gap-[26px]">
        <a href="/" className="inline-flex shrink-0 items-center" aria-label="Replix 홈">
          <img src={logo} alt="Replix" height={34} style={{ height: 34, width: 'auto' }} />
        </a>
        {/* 표면 이름. 랜딩에는 없는 요소 — 이것이 두 바를 구분한다. */}
        <a href="#/" className="-ml-3 inline-flex shrink-0 items-center gap-3 text-[15px] font-bold text-ink">
          <span className="h-4 w-px bg-line2" aria-hidden />
          작품
        </a>

        <nav className="ml-3 hidden items-center gap-6 min-[761px]:flex">
          {NAV.map((n) => (
            <a key={n.label} href={n.href} className="whitespace-nowrap text-[14px] text-muted transition-colors hover:text-ink">
              {n.label}
            </a>
          ))}
        </nav>

        <Search />

        <a href="/" className="btn btn--ghost btn--sm hidden shrink-0 min-[761px]:inline-flex">
          홈으로
        </a>
        <NoticeLink current={current === 'notice'} />
        <AuthButton />
        <a href={STORE} target="_blank" rel="noopener" className="btn btn--primary btn--sm shrink-0" data-cta="catalog_nav">
          크롬 확장프로그램 설치하기
        </a>
      </div>
    </header>
  )
}

/** 헤더의 공지 진입(HP-425). 아이콘 버튼이 아니라 조용한 텍스트 링크다 — 섹션 링크 묶음에 섞지 않고
 *  '홈으로'와 로그인 사이에 둔다(위 주석의 2026-09-16 규칙). 안 읽은 **일반 공지**가 있을 때만 빨간 점이 붙는다:
 *  점검·장애는 아래 NoticeBand 가 이미 화면 맨 위에서 알리므로 여기서 두 번 세지 않는다. */
function NoticeLink({ current }: { current: boolean }) {
  const { items, seenId } = useNotices()
  const unread = items ? unreadCount(items.filter((n) => n.kind === 'NOTICE'), seenId) : 0
  return (
    <a
      href={noticeHref()}
      title={unread ? `새 공지 ${unread}건` : '공지'}
      onClick={() => engaged('notice', 'opened', { source: 'nav' })}
      className={`relative hidden shrink-0 text-[14px] transition-colors hover:text-ink min-[761px]:inline-flex ${current ? 'font-bold text-ink' : 'text-muted'}`}
    >
      공지
      {unread > 0 && <span aria-label="새 공지" className="absolute -right-2 top-1 size-[7px] rounded-full bg-accent" />}
    </a>
  )
}

/** 진행 중인 점검·장애, 또는 안 읽은 새 공지 한 건을 헤더 바로 아래 띠로 알린다. 무엇을 고를지는
 *  pickBand(notices-pure.js)가 정하고 node 로 검사한다. 닫으면 그 탭에서는 다시 뜨지 않는다(sessionStorage). */
export function NoticeBand() {
  const { items, seenId, dismissed } = useNotices()
  const pick = items ? pickBand(items, seenId, dismissed) : null
  if (!pick) return null
  const { notice, tone } = pick
  const cls = tone === 'maint' ? 'bg-[#fbf1df] text-[#7a4a00]' : tone === 'incident' ? 'bg-accentw text-accentd' : 'bg-soft text-ink2'
  const label = tone === 'maint' ? '점검' : tone === 'incident' ? '장애' : '새 공지'
  return (
    <div role="status" className={`border-b border-line text-[13px] ${cls}`}>
      <div className="wrap flex items-center gap-3 py-2">
        <span className="whitespace-nowrap rounded bg-black/5 px-1.5 font-mono text-[10.5px]">{label}</span>
        <span className="min-w-0 flex-1 truncate">
          <b>{notice.title}</b>
          {tone !== 'notice' && ` — ${notice.message}`}
        </span>
        <a
          href={noticeHref(notice.id)}
          onClick={() => engaged('notice', 'opened', { source: 'band' })}
          className="font-bold underline underline-offset-[3px]"
        >
          보기
        </a>
        <button
          type="button"
          onClick={() => {
            engaged('notice', 'band_dismissed', { kind: notice.kind })
            /* 닫기는 '이 띠만' 접는다 — 읽음은 올리지 않는다. 읽음 워터마크는 목록 최대 id 하나라서
               여기서 markSeen([notice]) 을 하면 그 공지보다 id 가 낮은 안 읽은 공지까지 읽음이 된다.
               읽음 처리는 공지 페이지를 실제로 열었을 때만 하고, 띠는 다음 안 읽은 공지로 넘어간다. */
            dismissBand(notice.id)
          }}
          className="opacity-70 hover:opacity-100"
        >
          닫기
        </button>
      </div>
    </div>
  )
}

/** 로그인 상태. 동의를 마친 회원은 닉네임(서버의 랜덤 닉네임)을 보이고, 누르면 작은 메뉴에서 로그아웃한다 —
 *  누르자마자 로그아웃되던 것(HP-421)은 실수 한 번에 확인 없이 로그아웃됐다(2026-09-24 김지호, HP-449).
 *  프로필·설정 화면은 두지 않는다(그건 확장의 몫). */
function AuthButton() {
  const { ready, user } = useAuth()
  if (!ready) return null
  if (!user) {
    return (
      <button type="button" onClick={login} className="hidden shrink-0 text-[14px] text-muted transition-colors hover:text-ink min-[761px]:inline-flex">
        로그인
      </button>
    )
  }
  return <AccountMenu name={user.name} />
}

function AccountMenu({ name }: { name: string }) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const item = useRef<HTMLButtonElement>(null)
  /* 열면 메뉴 항목에 포커스. 바깥을 누르거나 Esc 면 닫는다(Esc 는 포커스를 닉네임 버튼으로 돌려준다). */
  useEffect(() => {
    if (!open) return
    item.current?.focus()
    const onDown = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); btn.current?.focus() } }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])
  return (
    <div
      ref={box}
      // 포커스가 메뉴 밖으로 나가면(Tab) 닫는다 — 열린 채 남으면 다음 요소 위에 메뉴가 떠 있다.
      onBlur={(e) => { if (open && !box.current?.contains(e.relatedTarget as Node | null)) setOpen(false) }}
      className="relative hidden shrink-0 min-[761px]:block"
    >
      <button
        ref={btn}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex max-w-[160px] items-center gap-1 text-[14px] font-bold text-ink"
      >
        <span className="truncate">{name}</span>
        <CaretDownIcon size={12} weight="bold" aria-hidden className={`flex-none transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div role="menu" aria-label="내 계정" className="absolute right-0 top-[calc(100%+10px)] z-50 min-w-[132px] rounded-md border border-line bg-raise p-1 shadow-[0_12px_32px_rgba(16,16,24,0.14)]">
          <button ref={item} type="button" role="menuitem" onClick={logout} className="block w-full rounded-sm px-3 py-2 text-left text-[13.5px] text-ink hover:bg-soft">
            로그아웃
          </button>
        </div>
      )}
    </div>
  )
}

/** 작품 검색. 범위는 "리플릭스에 반응이 쌓인 작품"뿐이다(카탈로그가 크라우드소싱, HP-168) — 그 사실을 빈 결과에 적는다. */
function Search() {
  const [q, setQ] = useState('')
  const [items, setItems] = useState<ContentSearchItem[] | null>(null)
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const focused = useRef(false) // 계측 search/open 은 포커스당 1회 — 타이핑마다 세지 않는다

  useEffect(() => {
    const needle = q.trim()
    if (!needle) { setItems(null); return }
    let alive = true
    const t = setTimeout(() => {
      api.search(needle).then((r) => alive && setItems(r), () => alive && setItems([]))
    }, 220)
    return () => { alive = false; clearTimeout(t) }
  }, [q])

  useEffect(() => {
    const on = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', on)
    return () => document.removeEventListener('mousedown', on)
  }, [])

  return (
    <div ref={box} className="relative ml-auto w-9 md:w-[268px]">
      <label className="flex items-center gap-2 rounded-sm border border-line bg-raise px-3 py-[7px]">
        <MagnifyingGlassIcon size={14} className="shrink-0 text-faint" />
        <input
          type="search"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => { setOpen(true); if (!focused.current) { focused.current = true; engaged('search', 'open') } }}
          onBlur={() => { focused.current = false }}
          placeholder="작품 검색"
          aria-label="작품 검색"
          className="hidden w-full bg-transparent text-[12.5px] text-ink outline-none placeholder:text-faint md:block"
        />
      </label>
      {open && items && (
        <ul className="absolute right-0 top-full z-50 mt-1 w-[320px] overflow-hidden rounded-md border border-line bg-raise shadow-[0_12px_32px_rgba(16,16,24,0.12)]">
          {items.length === 0 && (
            <li className="px-3 py-3 text-[12.5px] text-muted">리플릭스에 반응이 쌓인 작품 중에는 없습니다</li>
          )}
          {items.slice(0, 8).map((it) => (
            <li key={it.contentId}>
              <a
                href={titleHref(it.contentId)}
                onClick={() => { setOpen(false); setQ(''); engaged('search', 'select', { has_results: true }) }}
                className="flex items-center gap-3 px-3 py-2 hover:bg-soft"
              >
                <span className="h-9 w-6 shrink-0 overflow-hidden rounded-[3px] bg-sink">
                  {it.posterUrl && <img src={it.posterUrl} alt="" className="size-full object-cover" />}
                </span>
                <span className="truncate text-[13px] font-bold text-ink">{it.title}</span>
                <span className="ml-auto shrink-0 text-[11px] text-muted">{it.contentType === 'MOVIE' ? '영화' : '시리즈'}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** 검토용 시안 띠. 푸터의 법률 고지와 섞이면 둘 다 읽히지 않는다. */
export function DraftBanner() {
  return (
    <p className="border-b border-line bg-sink px-5 py-1.5 text-center text-[11.5px] text-ink2 md:px-12">
      시안입니다. 개발 서버(api.replix-dev.site) 데이터로 그립니다. 데이터가 없는 자리는 비워 둡니다.
    </p>
  )
}

export function Footer() {
  /* 피드백(HP-426)은 헤더가 아니라 여기서만 연다 — 새 아이콘을 두지 않는다(HP-425 결정 3).
     열림 상태는 이 푸터의 지역 상태다(라우트·해시를 새로 만들지 않는다). 닫으면 포커스를 연 버튼으로 되돌린다. */
  const [feedback, setFeedback] = useState(false)
  const feedbackBtn = useRef<HTMLButtonElement>(null)
  const closeFeedback = useCallback(() => { setFeedback(false); feedbackBtn.current?.focus() }, [])
  return (
    <footer className="border-t border-line">
      <div className="wrap py-8">
        <div className="flex flex-wrap items-start justify-between gap-x-12 gap-y-6">
          <a href="/" className="inline-flex items-center" aria-label="Replix 홈">
            <img src={logo} alt="Replix" style={{ height: 28, width: 'auto', opacity: 0.9 }} />
          </a>
          <div className="flex gap-10 text-[12.5px]">
            <ul className="space-y-1.5 text-muted">
              <li><a href="#/ranking" className="hover:text-ink">많이 본 작품</a></li>
              <li><a href="#/hot" className="hover:text-ink">뜨거운 순간</a></li>
              <li><a href={noticeHref()} className="hover:text-ink" onClick={() => engaged('notice', 'opened', { source: 'footer' })}>공지</a></li>
              <li><button ref={feedbackBtn} type="button" onClick={() => setFeedback(true)} className="cursor-pointer hover:text-ink">피드백 보내기</button></li>
              <li><a href="/" className="hover:text-ink">Replix 홈</a></li>
            </ul>
            <ul className="space-y-1.5 text-muted">
              <li><a href="/privacy" className="hover:text-ink">개인정보처리방침</a></li>
              <li><a href="/terms" className="hover:text-ink">이용약관</a></li>
              <li><a href={STORE} target="_blank" rel="noopener" className="hover:text-ink" data-cta="catalog_footer">크롬 확장프로그램 설치</a></li>
              {/* 방문 통계 동의를 다시 묻는다 — /js/analytics.js 가 위임 처리. 처리방침 §6 이 약속한 철회 경로. */}
              <li><a href="#" data-analytics-settings className="hover:text-ink">분석 설정</a></li>
            </ul>
          </div>
        </div>
        {/* TMDB 약관 §3 이 요구하는 출처 표시. 문구는 약관에 지정된 원문이다. */}
        <p className="mt-6 text-[11.5px] leading-relaxed text-faint">
          포스터 이미지 출처: TMDB. This product uses TMDB and the TMDB APIs but is not
          endorsed, certified, or otherwise approved by TMDB.
        </p>
      </div>
      <FeedbackModal open={feedback} onClose={closeFeedback} />
    </footer>
  )
}
