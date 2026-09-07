import { useEffect, useMemo, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { PlayIcon, ListPlusIcon, ArrowUpRightIcon } from '@phosphor-icons/react'
import {
  api,
  decodeEntities,
  episodeLabel,
  fmtTime,
  heatToBars,
  watchUrl,
  type LiveShow,
  type Moment,
  type MostWatched,
} from '../api'
import { useAsync, useFillCount } from '../hooks'
import { titleHref } from '../App'
import { Chip, PosterSlot, Reveal, Rule, SectionHead, Waveform } from '../components/primitives'
import { EmptyNote, PosterGridSkeleton, RailSkeleton, RowsSkeleton, Shimmer } from '../components/skeleton'

const SEC = 'wrap py-9'

/** 지금 보고 있는 사람 수. 이 화면에서 상태를 나타내는 유일한 점이다. */
function LiveCount({ n, className = '' }: { n: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-[11px] font-bold leading-none text-ink2 ${className}`}>
      <span className="size-[5px] rounded-full bg-accent" />
      {n}명
    </span>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-md border border-dashed border-line2 px-4 py-6 text-center text-[13px] text-muted">{children}</p>
}

/* ═══ 빌보드 ══════════════════════════════════════════════════
   오늘 1위 = public-stats.mostWatched[0](누적 시청시간). 지수 산식은 만들지 않기로 했으므로(2026-09-05)
   "지수 100" 대신 "오늘 1위"만 적는다. 파형은 그 회차의 히트맵, 순간은 /moments. */
/* ═══ 빌보드 자동 전환 ═════════════════════════════════════════
   상위 작품 몇 개를 일정 간격으로 돌린다(조현빈 2026-09-07). 마우스를 올리거나 포커스가 들어오면
   멈추고, 점을 누르면 그 작품으로 간다. 움직임 줄이기 설정이면 자동 전환은 하지 않는다. */
const BILLBOARD_COUNT = 5
const BILLBOARD_INTERVAL_MS = 7000

function Billboard({ items, live, loading }: { items: MostWatched[]; live: LiveShow[]; loading: boolean }) {
  const slides = items.slice(0, BILLBOARD_COUNT)
  const [idx, setIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  const reduce = useReducedMotion()
  useEffect(() => { setIdx(0) }, [slides.length])
  useEffect(() => {
    if (reduce || paused || slides.length < 2) return
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), BILLBOARD_INTERVAL_MS)
    return () => clearInterval(t)
  }, [reduce, paused, slides.length])
  const dots = slides.length > 1 ? (
    <div className="mt-6 flex items-center gap-2" role="tablist" aria-label="빌보드 작품">
      {slides.map((w, i) => (
        <button
          key={`${w.show}-${i}`}
          type="button"
          role="tab"
          aria-selected={i === idx}
          aria-label={`${i + 1}위 ${w.show}`}
          onClick={() => setIdx(i)}
          className={`h-[6px] rounded-full transition-all ${i === idx ? 'w-7 bg-accent' : 'w-[6px] bg-ink/25 hover:bg-ink/50'}`}
        />
      ))}
    </div>
  ) : null

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={() => setPaused(false)}>
      {/* 슬라이드 다섯 장을 모두 마운트해 같은 자리에 겹쳐 두고 투명도만 교차시킨다. 지웠다 다시 만들면
          그때마다 파형·순간을 새로 받아 빈 화면이 깜빡인다. 높이는 가장 큰 슬라이드에 맞춰 고정된다. */}
      <div className="grid border-b border-line bg-raise">
        {(slides.length ? slides : [null]).map((w, i) => {
          const on = i === idx
          return (
            <div
              key={w ? `${w.contentId}-${w.episodeId}` : 'empty'}
              style={{ gridArea: '1 / 1', opacity: on ? 1 : 0, transition: reduce ? undefined : 'opacity .7s cubic-bezier(.16,1,.3,1)', pointerEvents: on ? 'auto' : 'none' }}
              aria-hidden={!on}
            >
              <BillboardSlide top={w} live={live} loading={loading} rank={i + 1} footer={dots} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function BillboardSlide({ top, live, loading, rank, footer }: { top: MostWatched | null; live: LiveShow[]; loading: boolean; rank: number; footer?: React.ReactNode }) {
  const episodeId = top?.episodeId ?? null
  const heat = useAsync(() => (episodeId ? api.heatmap(episodeId) : null), [episodeId])
  const moments = useAsync(() => (episodeId ? api.moments(episodeId, 5) : null), [episodeId])
  const bars = useMemo(() => heatToBars(heat.data, 120), [heat.data])
  const barsSm = useMemo(() => heatToBars(heat.data, 48), [heat.data])
  const show = live.find((s) => s.showId === String(episodeId)) ?? null
  const viewers = show ? show.segments.reduce((a, s) => a + s.viewers, 0) : 0
  const peak = (moments.data?.moments ?? []).reduce<Moment | null>((a, m) => (!a || m.strength > a.strength ? m : a), null)
  // 재생 딥링크 재료(플랫폼·회차 id)는 '지금 보는 중'에 있으면 거기서, 아니면 작품 상세에서 가져온다 —
  // 빌보드의 주 CTA 가 시청자 유무에 따라 사라지면 안 된다.
  const contentId = top?.contentId ?? null
  const detail = useAsync(() => (contentId && !show ? api.content(contentId).catch(() => null) : null), [contentId, !!show])
  const ep = detail.data?.episodes.find((e) => e.episodeId === episodeId) ?? null
  const play = show
    ? watchUrl(show.platform, show.watchId, peak?.at)
    : detail.data && ep ? watchUrl(detail.data.platform, ep.platformEpisodeId, peak?.at) : null

  if (!top) {
    const tone = loading ? 'skeleton' : 'bg-sink/60'
    return (
      <section className={`h-full ${SEC}`} aria-busy={loading}>
        <div className="flex flex-col gap-7 md:flex-row md:items-center md:gap-10">
          <div className={`${tone} w-[168px] shrink-0 rounded-md lg:w-[212px]`} style={{ aspectRatio: '2 / 3' }} aria-hidden />
          <div className="min-w-0 flex-1" aria-hidden={loading}>
            <div className={`${tone} h-5 w-24 rounded-sm`} />
            <div className={`${tone} mt-4 h-10 w-2/5 rounded-sm`} />
            <div className={`${tone} mt-3 h-4 w-1/3 rounded-sm`} />
            <div className={`${tone} mt-8 h-[104px] w-full rounded-sm`} />
            <div className={`${tone} mt-6 h-10 w-44 rounded-btn`} />
            {!loading && (
              <p className="mt-5 text-[13px] text-muted">아직 반응이 쌓인 작품이 없습니다.</p>
            )}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className={`flex h-full flex-col justify-center ${SEC}`}>
      <div className="flex flex-col gap-7 md:flex-row md:items-center md:gap-10">
        <a href={top.contentId ? titleHref(top.contentId, episodeId) : undefined} className="w-[168px] shrink-0 lg:w-[212px]">
          <PosterSlot title={top.show} poster={top.thumbnailUrl} />
        </a>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <Chip tone="accent">{rank === 1 ? '가장 많이 본 작품' : `많이 본 작품 ${rank}위`}</Chip>
            {viewers > 0 && (<><Rule /><LiveCount n={viewers} /></>)}
          </div>

          <h1 className="mt-3 text-[38px] leading-[1.02] tracking-[-0.05em] lg:text-[44px]">{top.show}</h1>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-[13px] text-muted">
            <span className="font-bold text-ink">{top.episodeTitle ?? (show ? episodeLabel(show) : '대표 회차')}</span>
            {bars.duration > 0 && (<><Rule /><span className="num">{fmtTime(bars.duration)}</span></>)}
            {moments.data && moments.data.moments.length > 0 && (
              <><Rule /><span className="font-bold text-accentd">뜨거운 순간 {moments.data.moments.length}</span></>
            )}
          </div>

          <div className="mt-6">
            <p className="mb-2.5 text-[12px] font-semibold text-muted">이 회차의 채팅 반응</p>
            {heat.data && bars.duration > 0 ? (
              <>
                <Waveform values={bars.values} height={104} className="hidden sm:flex"
                  active={peak ? [peak.at / bars.duration - 0.016, peak.at / bars.duration + 0.016] : undefined} />
                <Waveform values={barsSm.values} height={72} className="sm:hidden"
                  active={peak ? [peak.at / bars.duration - 0.03, peak.at / bars.duration + 0.03] : undefined} />
                <div className="relative mt-2 h-px bg-line">
                  {(moments.data?.moments ?? []).map((m) => (
                    <span key={m.at} className="absolute top-1/2 size-[6px] -translate-x-1/2 -translate-y-1/2 rounded-full"
                      style={{ left: `${(m.at / bars.duration) * 100}%`, background: m === peak ? 'var(--color-accent)' : 'var(--color-faint)' }} />
                  ))}
                </div>
                <div className="relative mt-2 hidden h-9 sm:block">
                  {/* 가까운 순간끼리 라벨이 겹치므로 직전 라벨과 4.5% 안이면 라벨을 건너뛴다(점은 남는다). */}
                  {(moments.data?.moments ?? []).filter((m, i, arr) => i === 0 || (m.at - arr[i - 1].at) / bars.duration > 0.045 || m === peak).map((m) => {
                    const i = (moments.data?.moments ?? []).indexOf(m)
                    return (
                    <div key={m.at} className="absolute -translate-x-1/2 text-center" style={{ left: `${(m.at / bars.duration) * 100}%` }}>
                      <p className={`num font-mono text-[11.5px] font-bold ${m === peak ? 'text-accent' : 'text-ink2'}`}>{fmtTime(m.at)}</p>
                      <p className="whitespace-nowrap text-[11px] text-muted">순간 {i + 1}</p>
                    </div>
                    )
                  })}
                </div>
              </>
            ) : (
              <Empty>{heat.loading ? '채팅 반응을 불러오는 중' : '이 회차에는 아직 채팅이 없습니다'}</Empty>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {play && (
              <a href={play} target="_blank" rel="noopener"
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-btn bg-accent px-4 py-2.5 text-[14px] font-bold text-white transition-all hover:brightness-110 active:translate-y-px">
                <PlayIcon size={15} weight="fill" />
                넷플릭스에서 {peak ? `${fmtTime(peak.at)}부터 ` : ''}보기
                <ArrowUpRightIcon size={13} weight="bold" className="opacity-80" />
              </a>
            )}
            {top.contentId && (
              <a href={titleHref(top.contentId, episodeId)}
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-btn border border-line2 bg-raise px-4 py-2.5 text-[14px] font-bold text-ink transition-colors hover:bg-soft">
                <ListPlusIcon size={15} />
                작품 상세
              </a>
            )}
          </div>
          {footer}
        </div>
      </div>
    </section>
  )
}

/* ═══ 오늘의 작품 순위 ════════════════════════════════════════
   mostWatched 순서가 곧 순위다. 지수가 없으므로 숫자·선은 두지 않는다. */
function Ranking({ items, loading }: { items: MostWatched[]; loading: boolean }) {
  /* 열 수는 폭이 정하고 줄은 두 줄 — 작품 선택의 폭을 위해 순위만 두 줄을 허용한다. */
  const fill = useFillCount(150, 16, 2)
  return (
    <section id="ranking" className={`scroll-mt-[74px] ${SEC}`} aria-busy={loading}>
      <SectionHead title="많이 본 작품" />
      {items.length === 0 ? (
        <div ref={fill.ref}>
          <PosterGridSkeleton count={fill.count} loading={loading} />
          {!loading && <EmptyNote>아직 순위가 없습니다.</EmptyNote>}
        </div>
      ) : (
        <div ref={fill.ref} className="fill-grid" style={{ '--min': '150px', '--gx': '16px', '--gy': '24px' } as React.CSSProperties}>
          {items.map((w, i) => (
            <Reveal key={`${w.show}-${i}`} delay={Math.min(i, 6) * 0.03} hidden={i >= fill.count}>
              <a href={w.contentId ? titleHref(w.contentId, w.episodeId) : undefined} className="group block"
                aria-label={`${i + 1}위 ${w.show}`}>
                <div className="relative">
                  <PosterSlot title={w.show} poster={w.thumbnailUrl} />
                  <span className={`num absolute left-2 top-2 inline-flex items-center rounded-sm px-2 py-1 font-mono text-[11px] font-bold leading-none shadow-[0_1px_4px_rgba(16,16,24,0.35)] ${i === 0 ? 'bg-accent text-white' : 'bg-ink/80 text-white'}`}>
                    {i + 1}
                  </span>
                </div>
                <p className="mt-2.5 truncate text-[13.5px] font-bold text-ink">{w.show}</p>
                <p className="mt-0.5 truncate text-[12px] text-muted">{w.episodeTitle ?? ' '}</p>
                {w.quoteText && <p className="mt-1 truncate text-[12px] text-ink2">“{decodeEntities(w.quoteText)}”</p>}
              </a>
            </Reveal>
          ))}
        </div>
      )}
    </section>
  )
}

/* ═══ 이 회차의 뜨거운 순간 — 포스터 + 트랙리스트 ═══════════ */
function HotMoments({ top, live, loading }: { top: MostWatched | null; live: LiveShow[]; loading: boolean }) {
  const episodeId = top?.episodeId ?? null
  const moments = useAsync(() => (episodeId ? api.moments(episodeId, 5) : null), [episodeId])
  const show = live.find((s) => s.showId === String(episodeId)) ?? null
  const list = moments.data?.moments ?? []
  const peak = list.reduce<Moment | null>((a, m) => (!a || m.strength > a.strength ? m : a), null)
  if (!top || !episodeId) {
    return (
      <section id="hot" className={`scroll-mt-[74px] border-t border-line ${SEC}`} aria-busy={loading}>
        <SectionHead title="이 회차의 뜨거운 순간" />
        <div className="grid gap-6 md:grid-cols-[168px_1fr] md:gap-8 lg:grid-cols-[200px_1fr] lg:gap-10">
          <div className={`${loading ? 'skeleton' : 'bg-sink/60'} w-[96px] rounded-md md:w-full`} style={{ aspectRatio: '2 / 3' }} aria-hidden />
          <div>
            <RowsSkeleton rows={5} loading={loading} />
            {!loading && <EmptyNote>아직 순간이 없습니다.</EmptyNote>}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="hot" className={`scroll-mt-[74px] border-t border-line ${SEC}`}>
      <SectionHead title="이 회차의 뜨거운 순간" />
      <div className="grid gap-6 md:grid-cols-[168px_1fr] md:gap-8 lg:grid-cols-[200px_1fr] lg:gap-10">
        <div className="flex gap-4 md:block">
          <a href={top.contentId ? titleHref(top.contentId, episodeId) : undefined} className="block w-[96px] shrink-0 md:w-full">
            <PosterSlot title={top.show} poster={top.thumbnailUrl} />
          </a>
          <div className="min-w-0 md:mt-3">
            <p className="text-[15px] font-bold text-ink">{top.show}</p>
            <p className="mt-0.5 text-[12.5px] text-muted">{top.episodeTitle ?? (show ? episodeLabel(show) : '')}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-muted">
              <span>순간 {list.length}개</span>
              {show && (<><Rule /><LiveCount n={show.segments.reduce((a, s) => a + s.viewers, 0)} /></>)}
            </div>
          </div>
        </div>

        {list.length === 0 ? (
          <div>
            <RowsSkeleton rows={5} loading={moments.loading} />
            {!moments.loading && <EmptyNote>아직 순간이 없습니다.</EmptyNote>}
          </div>
        ) : (
          <ol className="min-w-0 divide-y divide-line border-y border-line">
            {list.map((m, i) => {
              const on = m === peak
              const href = show ? watchUrl(show.platform, show.watchId, m.at) : null
              const Row = href ? 'a' : 'div'
              return (
                <li key={m.at}>
                  <Row {...(href ? { href, target: '_blank', rel: 'noopener' } : {})}
                    className={`group grid grid-cols-[28px_1fr_auto] items-center gap-x-3 px-2 py-3 transition-colors sm:grid-cols-[28px_64px_1fr_auto] md:gap-x-4 ${on ? 'bg-accentw' : 'hover:bg-soft'}`}>
                    <span className="relative flex h-6 items-center justify-center">
                      <span className={`num font-mono text-[12px] ${href ? 'group-hover:opacity-0' : ''} ${on ? 'font-bold text-accent' : 'text-muted'}`}>{i + 1}</span>
                      {href && <PlayIcon size={12} weight="fill" className={`absolute opacity-0 group-hover:opacity-100 ${on ? 'text-accent' : 'text-ink'}`} />}
                    </span>
                    <span className={`num hidden font-mono text-[15px] font-bold sm:block ${on ? 'text-accent' : 'text-ink'}`}>{fmtTime(m.at)}</span>
                    <span className="min-w-0">
                      <span className="flex items-baseline gap-2">
                        <span className={`num font-mono text-[14px] font-bold sm:hidden ${on ? 'text-accent' : 'text-ink'}`}>{fmtTime(m.at)}</span>
                        <span className="truncate text-[14.5px] font-bold text-ink">순간 {i + 1}</span>
                      </span>
                      <span className="mt-0.5 block truncate text-[12.5px] text-muted">{m.quote ? `“${decodeEntities(m.quote)}”` : '대표 채팅 없음'}</span>
                    </span>
                    <span className={`text-[11.5px] ${on ? 'font-bold text-accent' : 'text-faint'}`}>{on ? '가장 뜨거움' : ''}</span>
                  </Row>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </section>
  )
}

/* ═══ 지금 보는 중 ═══════════════════════════════════════════
   장르 데이터가 없어 장르 레일은 두지 않는다. 대신 live-scenes 의 "지금 보는 중" 회차를 레일로 — 실시간 인원은
   실제로 있는 사람 수라 절대 수치 예외에 든다. */
function LiveRail({ shows, loading }: { shows: LiveShow[]; loading: boolean }) {
  const fill = useFillCount(140, 16, 1)
  if (shows.length === 0) {
    return (
      <section id="live" className={`scroll-mt-[74px] border-t border-line ${SEC}`} aria-busy={loading}>
        <SectionHead title="지금 보는 중" />
        <div ref={fill.ref}><RailSkeleton count={fill.count} loading={loading} /></div>
        {!loading && <EmptyNote>지금 보는 사람이 없습니다.</EmptyNote>}
      </section>
    )
  }
  const sorted = [...shows].sort((a, b) => sum(b) - sum(a))
  return (
    <section id="live" className={`scroll-mt-[74px] border-t border-line ${SEC}`}>
      <SectionHead title="지금 보는 중" />
      <ul ref={fill.ref} className="fill-grid" style={{ '--min': '140px', '--gx': '16px', '--gy': '0px' } as React.CSSProperties}>
        {sorted.map((s, i) => {
          const hot = [...s.segments].sort((a, b) => b.viewers - a.viewers)[0]
          const href = watchUrl(s.platform, s.watchId, hot?.at)
          return (
            <li key={s.showId} hidden={i >= fill.count}>
              <a href={href ?? undefined} target={href ? '_blank' : undefined} rel="noopener" className="group block">
                <div className="relative">
                  <PosterSlot title={s.show} poster={s.posterUrl} />
                  <span className="absolute bottom-2 right-2 inline-flex items-center rounded-sm bg-raise/95 px-2 py-1 leading-none shadow-[0_1px_4px_rgba(16,16,24,0.25)]">
                    <LiveCount n={sum(s)} />
                  </span>
                </div>
                <p className="mt-2 truncate text-[12.5px] font-bold text-ink">{s.show}</p>
                <p className="mt-0.5 truncate text-[12px] text-muted">{episodeLabel(s)}{hot ? `, ${fmtTime(hot.at)} 근처` : ''}</p>
              </a>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
const sum = (s: LiveShow) => s.segments.reduce((a, x) => a + x.viewers, 0)

/* ═══ 이번 주 인기 순간 — 순위 작품들의 1위 순간 ═══════════ */
function WeeklyMoments({ items, loading }: { items: MostWatched[]; loading: boolean }) {
  const fill = useFillCount(300, 20, 1)
  const heads = items.filter((w) => w.episodeId).slice(0, Math.max(fill.count, 1))
  const fetched = useAsync(
    () => (heads.length ? Promise.all(heads.map((w) => api.moments(w.episodeId!, 1).catch(() => null))) : null),
    [heads.map((w) => w.episodeId).join(',')],
  )
  const rows = heads.map((w, i) => {
    const m = fetched.data?.[i]?.moments[0]
    return m ? { key: `${w.episodeId}`, work: w.show, episode: w.episodeTitle ?? '', at: fmtTime(m.at), quote: m.quote ?? '', poster: w.thumbnailUrl, contentId: w.contentId ?? null } : null
  }).filter((x): x is NonNullable<typeof x> => x !== null)
  const busy = loading || (heads.length > 0 && fetched.loading)
  if (rows.length === 0) {
    return (
      <section className={`border-t border-line ${SEC}`} aria-busy={busy}>
        <SectionHead title="이번 주 인기 순간" />
        <ol ref={fill.ref} className="fill-grid" style={{ '--min': '300px', '--gx': '20px', '--gy': '0px' } as React.CSSProperties} aria-hidden>
          {Array.from({ length: fill.count }, (_, i) => (
            <li key={i} className={`flex gap-4 ${i > 0 ? 'border-l border-line pl-5' : ''}`}>
              <div className={`${busy ? 'skeleton' : 'bg-sink/60'} w-[76px] shrink-0 rounded-md`} style={{ aspectRatio: '2 / 3' }} />
              <div className="flex-1 py-0.5">
                <Shimmer className={`h-3 w-2/3 ${busy ? '' : '!bg-sink/60 !animate-none'}`} />
                <Shimmer className={`mt-3 h-6 w-1/3 ${busy ? '' : '!bg-sink/60 !animate-none'}`} />
                <Shimmer className={`mt-2.5 h-3 w-5/6 ${busy ? '' : '!bg-sink/60 !animate-none'}`} />
              </div>
            </li>
          ))}
        </ol>
        {!busy && <EmptyNote>아직 순간이 없습니다.</EmptyNote>}
      </section>
    )
  }
  return (
    <section className={`border-t border-line ${SEC}`}>
      <SectionHead title="이번 주 인기 순간" />
      <div className="relative">
        <ol ref={fill.ref} className="fill-grid" style={{ '--min': '300px', '--gx': '20px', '--gy': '0px' } as React.CSSProperties}>
          {rows.map((c, i) => (
            <li key={c.key} hidden={i >= fill.count} className={i > 0 ? 'border-l border-line pl-5' : ''}>
              <a href={c.contentId ? titleHref(c.contentId) : undefined} className="group flex gap-4">
                <div className="relative w-[76px] shrink-0">
                  <PosterSlot title={c.work} poster={c.poster} className="transition-transform duration-300 ease-out-soft group-hover:-translate-y-0.5" />
                  <span className={`num absolute left-1.5 top-1.5 rounded-sm px-1.5 py-[2px] font-mono text-[11px] font-bold text-white ${i === 0 ? 'bg-accent' : 'bg-ink'}`}>{i + 1}</span>
                </div>
                <div className="flex min-w-0 flex-1 flex-col py-0.5">
                  <p className="truncate text-[12px] text-muted"><span className="font-bold text-ink">{c.work}</span> {c.episode}</p>
                  <p className={`num mt-2 font-mono text-[22px] font-extrabold leading-none tracking-tight ${i === 0 ? 'text-accent' : 'text-ink'}`}>{c.at}</p>
                  <p className="mt-1.5 line-clamp-2 text-[13px] leading-snug text-ink2">{c.quote ? `“${decodeEntities(c.quote)}”` : ''}</p>
                </div>
              </a>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

/* ═══ 홈 ═════════════════════════════════════════════════════ */
export default function Home() {
  const stats = useAsync(() => api.publicStats(), [])
  const live = useAsync(() => api.liveScenes(), [])
  const items = stats.data?.mostWatched ?? []
  const shows = live.data?.shows ?? []

  return (
    <>
      <Billboard items={items} live={shows} loading={stats.loading} />
      <Ranking items={items} loading={stats.loading} />
      <HotMoments top={items[0] ?? null} live={shows} loading={stats.loading} />
      <WeeklyMoments items={items} loading={stats.loading} />
      <LiveRail shows={shows} loading={live.loading} />
      {stats.error && (
        <p className={`text-[12.5px] text-muted ${SEC}`}>서버 응답 오류: {stats.error.message}</p>
      )}
    </>
  )
}
