import { useEffect, useRef, useState } from 'react'
import { MagnifyingGlassIcon } from '@phosphor-icons/react'
import { api, type ContentSearchItem } from '../api'
import logo from '../../../../docs/assets/logo/replix-horizontal-light.png'
import { titleHref } from '../App'

/* 공개 카탈로그의 실제 목적지만 둔다. 같은 곳으로 가는 메뉴 두 개나
   로그인 상태를 전제하는 항목(아바타·알림)은 두지 않는다 — 개인화를 하지
   않기로 한 결정(2026-07-14)과 어긋나는 빈 약속이 된다. */
const STORE = 'https://chromewebstore.google.com/detail/replix/lgfllmbombkdbebcepigebnbmeaacikp'

/* 메뉴 한 벌을 랜딩(/)과 큐레이션(/curation/)이 같은 순서·이름으로 나눠 쓴다(2026-09-05).
   이 페이지가 '인기 작품'이고 나머지는 랜딩의 섹션이다. 바꾸면 docs/index.html 의 nav 도 같이. */
const NAV = [
  { href: '/#scenes', label: '인기 장면', here: false },
  { href: '#/', label: '인기 작품', here: true },
  { href: '/#rooms', label: '함께 보기', here: false },
  { href: '/#faq', label: '자주 묻는 질문', here: false },
]

/* 원 시안과 같은 60px 한 줄 바, 좌우 48px 거터. */
export function Nav({ current: _current }: { current: 'home' | 'title' }) {
  /* 랜딩 .nav 와 같은 치수: sticky 66px, 같은 배경·블러, .wrap 안에 gap 26px, 로고 34px, 메뉴 14px gap 24px,
     오른쪽 끝 .btn--primary.btn--sm. 랜딩과 다른 것은 '홈으로' 버튼 하나뿐이다(큐레이션에서 랜딩으로 돌아가는 길). */
  return (
    <header
      className="sticky top-0 z-40 flex h-[66px] items-center border-b border-line"
      style={{ background: 'rgba(250,249,249,.86)', backdropFilter: 'blur(16px) saturate(180%)', WebkitBackdropFilter: 'blur(16px) saturate(180%)' }}
    >
      <div className="wrap flex w-full items-center gap-[26px]">
        <a href="/" className="inline-flex shrink-0 items-center" aria-label="Replix 홈">
          <img src={logo} alt="Replix" height={34} style={{ height: 34, width: 'auto' }} />
        </a>

        <nav className="ml-3 hidden items-center gap-6 min-[761px]:flex">
          {NAV.map((n) => (
            <a
              key={n.label}
              href={n.href}
              className={`whitespace-nowrap text-[14px] transition-colors ${n.here ? 'font-bold text-ink' : 'text-muted hover:text-ink'}`}
            >
              {n.label}
            </a>
          ))}
        </nav>

        <Search />

        <a href="/" className="btn btn--ghost btn--sm hidden shrink-0 sm:inline-flex">
          홈으로
        </a>
        <a href={STORE} target="_blank" rel="noopener" className="btn btn--primary btn--sm shrink-0">
          크롬 확장프로그램 설치하기
        </a>
      </div>
    </header>
  )
}

/** 작품 검색. 범위는 "리플릭스에 반응이 쌓인 작품"뿐이다(카탈로그가 크라우드소싱, HP-168) — 그 사실을 빈 결과에 적는다. */
function Search() {
  const [q, setQ] = useState('')
  const [items, setItems] = useState<ContentSearchItem[] | null>(null)
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

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
          onFocus={() => setOpen(true)}
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
                onClick={() => { setOpen(false); setQ('') }}
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
  return (
    <footer className="border-t border-line">
      <div className="wrap py-8">
        <div className="flex flex-wrap items-start justify-between gap-x-12 gap-y-6">
          <a href="/" className="inline-flex items-center" aria-label="Replix 홈">
            <img src={logo} alt="Replix" style={{ height: 28, width: 'auto', opacity: 0.9 }} />
          </a>
          <div className="flex gap-10 text-[12.5px]">
            <ul className="space-y-1.5 text-muted">
              <li><a href="/#scenes" className="hover:text-ink">인기 장면</a></li>
              <li><a href="#/" className="hover:text-ink">인기 작품</a></li>
              <li><a href="/#faq" className="hover:text-ink">자주 묻는 질문</a></li>
            </ul>
            <ul className="space-y-1.5 text-muted">
              <li><a href="/privacy" className="hover:text-ink">개인정보처리방침</a></li>
              <li><a href="/terms" className="hover:text-ink">이용약관</a></li>
              <li><a href={STORE} target="_blank" rel="noopener" className="hover:text-ink">크롬 확장프로그램 설치</a></li>
            </ul>
          </div>
        </div>
        {/* TMDB 약관 §3 이 요구하는 출처 표시. 문구는 약관에 지정된 원문이다. */}
        <p className="mt-6 text-[11.5px] leading-relaxed text-faint">
          포스터 이미지 출처: TMDB. This product uses TMDB and the TMDB APIs but is not
          endorsed, certified, or otherwise approved by TMDB.
        </p>
      </div>
    </footer>
  )
}
