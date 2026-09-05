import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { PlayIcon, ArrowUpRightIcon, PuzzlePieceIcon, HeartIcon } from '@phosphor-icons/react'
import {
  api,
  decodeEntities,
  episodeLabel,
  fmtTime,
  heatToBars,
  watchUrl,
  ApiError,
  type ChatMessage,
  type ContentDetail,
  type EpisodeSummary,
  type LiveShow,
  type Moment,
} from '../api'
import { useAsync } from '../hooks'
import { titleHref } from '../App'
import { Avatar, Chip, MomentDots, PosterSlot, Reveal, Rule, SectionHead, Waveform } from '../components/primitives'
import { CardGridSkeleton, EmptyNote, RailSkeleton, RowsSkeleton } from '../components/skeleton'

const SEC = 'wrap py-9'
const SPOILER_CUT = 3

const SUBNAV = [
  { id: 'episodes', label: '회차' },
  { id: 'moments', label: '순간과 채팅' },
  { id: 'related', label: '함께 본 작품' },
]

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-md border border-dashed border-line2 px-4 py-6 text-center text-[13px] text-muted">{children}</p>
}

function liveViewers(live: LiveShow[], episodeId: number | null) {
  const s = live.find((x) => x.showId === String(episodeId))
  return s ? s.segments.reduce((a, x) => a + x.viewers, 0) : 0
}

/* ═══ 히어로 ═════════════════════════════════════════════════ */
function Hero({ c, ep, live, peak }: { c: ContentDetail; ep: EpisodeSummary | null; live: LiveShow[]; peak: Moment | null }) {
  const viewers = liveViewers(live, ep?.episodeId ?? null)
  const play = ep ? watchUrl(c.platform, ep.platformEpisodeId) : null
  const maxShare = Math.max(1, ...c.episodes.map((e) => e.heatShare))

  return (
    <section className={`border-b border-line bg-raise ${SEC}`}>
      <div className="flex flex-col gap-7 md:flex-row md:gap-10">
        <div className="w-[150px] shrink-0 lg:w-[190px]"><PosterSlot title={c.title} poster={c.posterUrl} /></div>

        <div className="min-w-0 flex-1">
          <h1 className="text-[34px] leading-[1.04] tracking-[-0.05em] lg:text-[40px]">{c.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12.5px] text-muted">
            <span>{c.contentType === 'MOVIE' ? '영화' : '시리즈'}</span>
            <Rule />
            <span>{c.platform === 'netflix' ? '넷플릭스' : c.platform}</span>
            {ep && (<><Rule /><span>{episodeLabel(ep, c.contentType) || ep.title}</span></>)}
          </div>

          <div className="mt-6 grid gap-6 border-t border-line pt-5 lg:grid-cols-[168px_260px_1fr] lg:gap-8">
            <div>
              <p className="text-[12px] font-semibold text-muted">지금 보는 사람</p>
              <p className="num mt-1 font-mono text-[38px] font-extrabold leading-none tracking-tight text-accent">{viewers}</p>
                          </div>
            <div>
              <p className="text-[12px] font-semibold text-muted">가장 뜨거운 순간의 채팅</p>
              {peak?.quote ? (
                <>
                  <p className="mt-1.5 text-[14px] font-bold leading-snug text-ink">“{decodeEntities(peak.quote)}”</p>
                  <p className="num mt-1 font-mono text-[11px] text-muted">{ep ? episodeLabel(ep, c.contentType) : ''} {fmtTime(peak.at)}</p>
                </>
              ) : (
                <p className="mt-1.5 text-[12.5px] text-faint">아직 인용할 채팅이 없습니다</p>
              )}
            </div>
            <div>
              <div className="flex items-baseline justify-between gap-4">
                <p className="text-[12px] font-semibold text-muted">회차별 채팅 반응</p>
                              </div>
              {c.episodes.length === 0 ? (
                <p className="mt-3 text-[12.5px] text-faint">아직 회차가 없습니다.</p>
              ) : (
                <>
                  <div className="mt-2.5 flex h-[76px] items-end gap-[5px]">
                    {c.episodes.map((e) => (
                      <div key={e.episodeId} className="flex h-full min-w-0 flex-1 flex-col justify-end">
                        <div className="rounded-t-[2px]" style={{ height: `${Math.max(3, (e.heatShare / maxShare) * 100)}%`, background: e.episodeId === ep?.episodeId ? 'var(--color-accent)' : 'rgba(16,16,24,0.16)' }} />
                      </div>
                    ))}
                  </div>
                  <div className="mt-1.5 flex gap-[5px]">
                    {c.episodes.map((e) => (
                      <a key={e.episodeId} href={titleHref(c.contentId, e.episodeId)}
                        className={`num min-w-0 flex-1 text-center font-mono text-[10.5px] hover:text-ink ${e.episodeId === ep?.episodeId ? 'font-bold text-accent' : 'text-muted'}`}>
                        {e.episodeNumber || '·'}
                      </a>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {play && (
              <a href={play} target="_blank" rel="noopener"
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-btn bg-accent px-4 py-2.5 text-[14px] font-bold text-white transition-all hover:brightness-110 active:translate-y-px">
                <PlayIcon size={15} weight="fill" />
                넷플릭스에서 {ep ? episodeLabel(ep, c.contentType) || '이 회차' : ''} 보기
                <ArrowUpRightIcon size={13} weight="bold" className="opacity-80" />
              </a>
            )}
            <a href="#/" className="inline-flex items-center gap-2 whitespace-nowrap rounded-btn border border-line2 bg-raise px-4 py-2.5 text-[14px] font-bold text-ink transition-colors hover:bg-soft">
              <PuzzlePieceIcon size={16} />
              크롬 확장프로그램 설치하기
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

function SubNav() {
  const [active, setActive] = useState(SUBNAV[0].id)
  useEffect(() => {
    let raf = 0
    const pick = () => {
      raf = 0
      let cur = SUBNAV[0].id
      for (const s of SUBNAV) {
        const el = document.getElementById(s.id)
        if (el && el.getBoundingClientRect().top <= 130) cur = s.id
      }
      setActive(cur)
    }
    const on = () => { if (!raf) raf = requestAnimationFrame(pick) }
    pick()
    window.addEventListener('scroll', on, { passive: true })
    return () => { window.removeEventListener('scroll', on); if (raf) cancelAnimationFrame(raf) }
  }, [])
  return (
    <div className="sticky top-[66px] z-30 border-b border-line bg-warm/92 backdrop-blur-md">
      <nav className="wrap flex gap-6 overflow-x-auto">
        {SUBNAV.map((s) => (
          <a key={s.id} href={`#${s.id}`}
            className={`whitespace-nowrap border-b-2 py-3 text-[13.5px] font-bold transition-colors ${s.id === active ? 'border-accent text-ink' : 'border-transparent text-muted hover:border-line2 hover:text-ink'}`}>
            {s.label}
          </a>
        ))}
      </nav>
    </div>
  )
}

/* ═══ 회차 카드 ══════════════════════════════════════════════
   카드의 몸통은 그 회차의 채팅이다. 순간 3개를 회차마다 따로 받는다(회차 수만큼 호출, 서버 5분 캐시). */
function EpisodeCard({ c, e, selected, i }: { c: ContentDetail; e: EpisodeSummary; selected: boolean; i: number }) {
  const m = useAsync(() => api.moments(e.episodeId, 3).catch(() => null), [e.episodeId])
  const list = m.data?.moments ?? []
  const top = list.reduce<Moment | null>((a, x) => (!a || x.strength > a.strength ? x : a), null)
  const duration = list.length ? Math.max(...list.map((x) => x.at)) * 1.15 : 1
  return (
    <Reveal delay={Math.min(i, 6) * 0.03} className="flex">
      <a href={titleHref(c.contentId, e.episodeId) + '#moments'}
        className={`flex w-full flex-col rounded-md border p-4 transition-colors ${selected ? 'border-accent/30 bg-accentw' : 'border-line bg-raise hover:bg-soft'}`}>
        <div className="flex items-baseline justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <h3 className="text-[20px]">{episodeLabel(e, c.contentType) || e.title || '회차'}</h3>
            {list.length > 0 && <span className="text-[11.5px] text-muted">순간 {list.length}개</span>}
          </div>
          {e.heatShare > 0 && <span className="text-[11px] text-faint">채팅 반응 {e.heatShare}</span>}
        </div>
        <p className="mt-1 truncate text-[13px] text-ink2">
          {top ? (<><span className={`num font-mono font-bold ${selected ? 'text-accent' : 'text-ink'}`}>{fmtTime(top.at)}</span> 가장 뜨거운 순간</>) : (e.title ?? ' ')}
        </p>
        <ul className="mt-3 flex min-h-[64px] flex-col gap-1.5 border-t border-line pt-3">
          {list.filter((x) => x.quote).map((x) => (
            <li key={x.at} className="grid grid-cols-[44px_1fr] gap-x-2 text-[12.5px] leading-snug">
              <span className="num font-mono text-[11px] text-faint">{fmtTime(x.at)}</span>
              <span className="truncate text-ink2">{decodeEntities(x.quote)}</span>
            </li>
          ))}
          {!m.loading && list.length === 0 && <li className="text-[12px] text-faint">아직 순간이 없습니다.</li>}
        </ul>
        <div className="mt-auto pt-3">
          <MomentDots moments={list.map((x) => ({ id: String(x.at), sec: x.at }))} duration={duration} activeSec={top?.at} />
        </div>
      </a>
    </Reveal>
  )
}

function Episodes({ c, selected }: { c: ContentDetail; selected: EpisodeSummary | null }) {
  const [sort, setSort] = useState<'ep' | 'heat'>('ep')
  const list = [...c.episodes].sort((a, b) =>
    sort === 'ep' ? a.seasonNumber - b.seasonNumber || a.episodeNumber - b.episodeNumber : b.heatShare - a.heatShare)
  return (
    <section id="episodes" className={`scroll-mt-28 ${SEC}`}>
      <SectionHead title="회차"
        action={
          <div className="flex gap-1 rounded-sm bg-sink p-0.5 text-[12px] font-bold" role="group" aria-label="정렬">
            {(['ep', 'heat'] as const).map((k) => (
              <button key={k} type="button" onClick={() => setSort(k)} aria-pressed={sort === k}
                className={`rounded-[6px] px-2.5 py-1 transition-colors ${sort === k ? 'bg-raise text-ink shadow-[0_1px_2px_rgba(16,16,24,0.12)]' : 'text-muted hover:text-ink'}`}>
                {k === 'ep' ? '회차순' : '반응순'}
              </button>
            ))}
          </div>
        } />
      {list.length === 0 ? (
        <>
          <CardGridSkeleton count={4} loading={false} />
          <EmptyNote>아직 회차가 없습니다.</EmptyNote>
        </>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((e, i) => <EpisodeCard key={e.episodeId} c={c} e={e} selected={e.episodeId === selected?.episodeId} i={i} />)}
        </div>
      )}
    </section>
  )
}

/* ═══ 순간 + 채팅 (마스터-디테일) ═══════════════════════════ */
function Moments({ c, ep, moments, momentsLoading, onPeak }: { c: ContentDetail; ep: EpisodeSummary | null; moments: Moment[]; momentsLoading: boolean; onPeak: (m: Moment | null) => void }) {
  const [sel, setSel] = useState(0)
  const reduce = useReducedMotion()
  const episodeId = ep?.episodeId ?? null
  const heat = useAsync(() => (episodeId ? api.heatmap(episodeId) : null), [episodeId])
  const bars = useMemo(() => heatToBars(heat.data, 150), [heat.data])
  const peakIdx = moments.reduce((bi, m, i, arr) => (m.strength > (arr[bi]?.strength ?? -1) ? i : bi), 0)
  useEffect(() => { setSel(peakIdx) }, [peakIdx, episodeId])
  useEffect(() => { onPeak(moments[peakIdx] ?? null) }, [moments, peakIdx, onPeak])
  const m = moments[sel] ?? null
  const chats = useAsync(
    () => (episodeId && m ? api.messages(episodeId, Math.max(0, m.at - 15), m.at + 45, 60) : null),
    [episodeId, m?.at],
  )
  const log = useMemo(() => {
    const items = chats.data?.items ?? []
    return items
      .filter((x) => x.moderationStatus === 'visible' && (x.spoilerScore == null || x.spoilerScore < SPOILER_CUT) && x.message.trim())
      .sort((a, b) => b.likeCount - a.likeCount || a.playbackTime - b.playbackTime)
      .slice(0, 8)
      .sort((a, b) => a.playbackTime - b.playbackTime)
  }, [chats.data])
  const play = ep && m ? watchUrl(c.platform, ep.platformEpisodeId, m.at) : null

  return (
    <section id="moments" className={`scroll-mt-28 border-y border-line bg-soft ${SEC}`}>
      <SectionHead title="순간" chip={ep ? <Chip>{episodeLabel(ep, c.contentType) || ep.title || '회차'}</Chip> : undefined}
      />

      {moments.length === 0 ? (
        <>
          <RowsSkeleton rows={5} loading={momentsLoading} />
          {!momentsLoading && <EmptyNote>아직 순간이 없습니다.</EmptyNote>}
        </>
      ) : (
        <>
          {bars.duration > 0 && (
            <div className="px-1">
              <Waveform values={bars.values} height={64} active={m ? [m.at / bars.duration - 0.026, m.at / bars.duration + 0.026] : undefined} />
              <div className="relative mt-2 h-px bg-line2">
                {moments.map((mm, i) => (
                  <button key={mm.at} type="button" onClick={() => setSel(i)} aria-label={`${fmtTime(mm.at)} 순간 ${i + 1}`} aria-pressed={i === sel}
                    className="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2" style={{ left: `${(mm.at / bars.duration) * 100}%` }}>
                    <span className="mx-auto block rounded-full ring-4 ring-soft" style={{ width: i === sel ? 9 : 6, height: i === sel ? 9 : 6, background: i === sel ? 'var(--color-accent)' : 'var(--color-faint)' }} />
                  </button>
                ))}
              </div>
              <div className="mt-2 flex justify-between font-mono text-[10.5px] text-faint"><span>00:00</span><span>{fmtTime(bars.duration)}</span></div>
            </div>
          )}

          <div className="mt-5 grid gap-4 lg:grid-cols-[320px_1fr] lg:gap-6">
            <ol className="grid auto-rows-fr divide-y divide-line overflow-hidden rounded-md border border-line bg-raise">
              {moments.map((mm, i) => {
                const on = i === sel
                return (
                  <li key={mm.at} className="flex">
                    <button type="button" onClick={() => setSel(i)} aria-pressed={on}
                      className={`grid w-full grid-cols-[64px_1fr_auto] items-center gap-x-3 px-4 py-3 text-left transition-colors ${on ? 'bg-accentw' : 'hover:bg-soft'}`}>
                      <span className={`num font-mono text-[15px] font-bold ${on ? 'text-accent' : 'text-ink'}`}>{fmtTime(mm.at)}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-[14px] font-bold text-ink">순간 {i + 1}{i === peakIdx ? ' · 가장 뜨거움' : ''}</span>
                        <span className="block truncate text-[12px] text-muted">{mm.quote ? `“${decodeEntities(mm.quote)}”` : '대표 채팅 없음'}</span>
                      </span>
                      <span className={`num font-mono text-[12px] ${on ? 'font-bold text-accent' : 'text-muted'}`} title="이 회차 안의 상대 강도">{mm.strength}</span>
                    </button>
                  </li>
                )
              })}
            </ol>

            {m && (
              <motion.div key={m.at} initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                className="flex min-w-0 flex-col overflow-hidden rounded-md border border-line bg-raise">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-5 py-3.5">
                  <p className="num font-mono text-[22px] font-extrabold leading-none tracking-tight text-accent">{fmtTime(m.at)}</p>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-bold text-ink">순간 {sel + 1}</p>
                  </div>
                  {play && (
                    <a href={play} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-btn bg-accent px-3.5 py-2 text-[13px] font-bold text-white transition-all hover:brightness-110">
                      <PlayIcon size={12} weight="fill" />넷플릭스에서 {fmtTime(m.at)}부터 보기<ArrowUpRightIcon size={11} weight="bold" className="opacity-80" />
                    </a>
                  )}
                </div>
                <ol className="flex-1 divide-y divide-line">
                  {log.map((x: ChatMessage) => (
                    <li key={x.id} className="grid grid-cols-[52px_28px_1fr_auto] items-start gap-x-3 px-5 py-3">
                      <span className="num pt-[3px] font-mono text-[11px] text-faint">{fmtTime(x.playbackTime)}</span>
                      <Avatar ch={(x.displayName ?? '익').slice(0, 1)} />
                      <p className="text-[14px] leading-relaxed text-ink">{decodeEntities(x.message)}</p>
                      <span className="flex items-center gap-1 pt-[3px] text-[11.5px] text-muted">
                        <HeartIcon size={12} weight="fill" className="text-accent" /><span className="num font-mono">{x.likeCount}</span>
                      </span>
                    </li>
                  ))}
                  {!chats.loading && log.length === 0 && <li className="px-5 py-6 text-center text-[12.5px] text-muted">채팅이 없습니다.</li>}
                </ol>
                <div className="flex items-center justify-end border-t border-line bg-soft px-5 py-3">
                  <a href="https://chromewebstore.google.com/detail/replix/lgfllmbombkdbebcepigebnbmeaacikp" target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-ink hover:text-accent"><PuzzlePieceIcon size={14} />크롬 확장프로그램 설치하기</a>
                </div>
              </motion.div>
            )}
          </div>
        </>
      )}
    </section>
  )
}

function Related({ contentId }: { contentId: number }) {
  const r = useAsync(() => api.alsoWatched(contentId).catch(() => null), [contentId])
  const items = r.data?.items ?? []
  return (
    <section id="related" className={`scroll-mt-28 border-t border-line ${SEC}`}>
      <SectionHead title="함께 본 작품" />
      {items.length === 0 ? (
        <>
          <RailSkeleton count={6} loading={r.loading} />
          {!r.loading && <EmptyNote>아직 함께 본 작품이 없습니다.</EmptyNote>}
        </>
      ) : (
        <ul className="bleed flex snap-x gap-4 overflow-x-auto pb-2">
          {items.map((t) => (
            <li key={t.contentId} className="w-[126px] shrink-0 snap-start lg:w-[148px]">
              <a href={titleHref(t.contentId)} className="group block">
                <PosterSlot title={t.title} poster={t.posterUrl} />
                <p className="mt-2 truncate text-[12.5px] font-bold text-ink">{t.title}</p>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/* ═══ 작품 상세 ══════════════════════════════════════════════ */
export default function Title({ contentId, episodeId }: { contentId: number; episodeId: number | null }) {
  const detail = useAsync(() => api.content(contentId), [contentId])
  const live = useAsync(() => api.liveScenes(), [])
  const c = detail.data
  const ep = useMemo<EpisodeSummary | null>(() => {
    if (!c) return null
    return c.episodes.find((e) => e.episodeId === episodeId)
      ?? [...c.episodes].sort((a, b) => b.heatShare - a.heatShare)[0]
      ?? null
  }, [c, episodeId])
  const moments = useAsync(() => (ep ? api.moments(ep.episodeId, 5).catch(() => null) : null), [ep?.episodeId])
  const [peak, setPeak] = useState<Moment | null>(null)

  if (detail.loading) {
    return (
      <section className={`border-b border-line bg-raise ${SEC}`} aria-busy>
        <div className="flex flex-col gap-7 md:flex-row md:gap-10">
          <div className="skeleton w-[150px] shrink-0 rounded-md lg:w-[190px]" style={{ aspectRatio: '2 / 3' }} />
          <div className="min-w-0 flex-1">
            <div className="skeleton h-9 w-2/5 rounded-sm" />
            <div className="skeleton mt-3 h-4 w-1/3 rounded-sm" />
            <div className="mt-6 grid gap-6 border-t border-line pt-5 lg:grid-cols-[168px_260px_1fr] lg:gap-8">
              <div className="skeleton h-16 rounded-sm" /><div className="skeleton h-16 rounded-sm" /><div className="skeleton h-24 rounded-sm" />
            </div>
            <div className="skeleton mt-6 h-10 w-52 rounded-btn" />
          </div>
        </div>
      </section>
    )
  }
  if (detail.error || !c) {
    const notDeployed = detail.error instanceof ApiError && (detail.error.status === 404 || detail.error.status === 401)
    return (
      <section className={SEC}>
        <Empty>
          {notDeployed
            ? '작품을 찾을 수 없습니다.'
            : `작품을 불러오지 못했습니다: ${detail.error?.message}`}
        </Empty>
      </section>
    )
  }

  return (
    <>
      <Hero c={c} ep={ep} live={live.data?.shows ?? []} peak={peak} />
      <SubNav />
      <Episodes c={c} selected={ep} />
      <Moments c={c} ep={ep} moments={moments.data?.moments ?? []} momentsLoading={moments.loading} onPeak={setPeak} />
      <Related contentId={c.contentId} />
    </>
  )
}
