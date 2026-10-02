import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { PlayIcon, ListPlusIcon, ArrowUpRightIcon } from '@phosphor-icons/react'
import {
  api,
  decodeEntities,
  episodeLabel,
  fmtTime,
  watchUrl,
  type LiveShow,
  type Moment,
  type RankItem,
  type Window,
} from '../api'
import { useAsync, useFillCount } from '../hooks'
import { titleHref } from '../route-pure.js'
import { engaged, trackWatch } from '../analytics'
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
   1위 = /catalog/home ranking[0](창별 누적 감상 시간). 지수 산식은 만들지 않기로 했으므로(2026-09-05)
   "지수 100" 대신 순위만 적는다. 파형(bars)·순간(moments)·길이는 같은 응답에 실려 온다 — 슬라이드가 따로 요청하지 않는다. */
/* ═══ 빌보드 자동 전환 ═════════════════════════════════════════
   상위 작품 몇 개를 일정 간격으로 돌린다(조현빈 2026-09-07). 레일에 마우스를 올리거나 포커스가 들어오면
   멈추고, 점을 누르면 그 작품으로 간다. 움직임 줄이기 설정이면 자동 전환은 하지 않는다. */
const BILLBOARD_COUNT = 5
const BILLBOARD_INTERVAL_MS = 7000

function Billboard({ items, live, loading }: { items: RankItem[]; live: LiveShow[]; loading: boolean }) {
  const slides = items.slice(0, BILLBOARD_COUNT)
  const [idx, setIdx] = useState(0)
  // 멈춤 이유 둘을 따로 든다 — 하나로 합치면 레일에서 마우스가 나갈 때 키보드 포커스 멈춤까지 풀린다.
  const [hoverPaused, setHoverPaused] = useState(false)
  const [focusPaused, setFocusPaused] = useState(false)
  const paused = hoverPaused || focusPaused
  const reduce = useReducedMotion()
  useEffect(() => { setIdx(0) }, [slides.length])
  /* 전환 시계는 진행 줄 애니메이션 하나다. 예전엔 setInterval 과 CSS 진행 줄이 따로 돌아, 마우스를 올렸다 떼면
     줄은 멈춘 자리부터 이어 가는데 타이머는 7초를 처음부터 다시 셌다 — 줄이 다 찬 채 몇 초씩 서 있다가 넘어갔다.
     이제 애니메이션이 끝나는 순간(animationend)에 넘긴다. 멈춤도 animationPlayState 하나로 둘이 함께 멈춘다. */
  const autoplay = !reduce && slides.length > 1
  const next = () => setIdx((i) => (i + 1) % slides.length)
  const playState = paused ? 'paused' : 'running'
  /* 오른쪽 세로 레일(2026-09-07 조현빈): 다섯 작품이 포스터를 배경으로 세로로 쌓이고, 현재 작품 칸은 크게,
     나머지는 작게. flex 값이 바뀌면서 칸 크기가 자연스럽게 흐른다. 누르면 그 작품으로 전환.
     간격·모서리 없이 붙인 한 기둥으로 두고 왼쪽 포스터보다 작게 — 레일은 보여주기가 아니라 꾸밈이라
     왼쪽 카드와 같은 형태로 나란히 서면 시선이 갈라지고 중복으로 읽힌다(시안 B). */
  const rail = slides.length > 1 ? (
    <ol className="hidden h-[272px] flex-col self-center overflow-hidden rounded-[4px] md:flex" role="tablist" aria-label="빌보드 작품" onMouseEnter={() => setHoverPaused(true)} onMouseLeave={() => setHoverPaused(false)}>
      {slides.map((w, i) => {
        const on = i === idx
        const poster = w.posterUrl ?? undefined
        return (
          <li key={`${w.contentId}-${i}`} className="min-h-0" style={{ flex: on ? '1.8 1 0' : '1 1 0', transition: reduce ? undefined : 'flex .7s cubic-bezier(.16,1,.3,1)' }}>
            <button
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => { setIdx(i); engaged('billboard', 'switch') }}
              className="relative block h-full w-full overflow-hidden text-left"
              style={{ background: 'var(--color-sink)', boxShadow: i ? 'inset 0 1px 0 rgba(255,255,255,.14)' : undefined }}
            >
              {poster && (
                <img src={poster} alt="" className="absolute inset-0 size-full object-cover" style={{ objectPosition: '50% 18%', filter: on ? 'saturate(.9) brightness(.85)' : 'grayscale(1) brightness(.45)', transition: reduce ? undefined : 'filter .7s' }} />
              )}
              <span className="absolute inset-0" style={{ background: on ? 'linear-gradient(90deg, rgba(16,16,24,.7), rgba(16,16,24,.35))' : 'linear-gradient(90deg, rgba(16,16,24,.75), rgba(16,16,24,.55))', transition: reduce ? undefined : 'background .7s' }} />
              {on && autoplay && (
                <span key={idx} className="absolute inset-x-0 bottom-0 h-[3px] origin-left bg-accent" style={{ animation: `rail-progress ${BILLBOARD_INTERVAL_MS}ms linear forwards`, animationPlayState: playState }} />
              )}
              <span className="absolute inset-x-0 bottom-0 flex items-center gap-2 px-3 py-2">
                <span className={`num font-mono text-[11px] font-bold leading-none ${on ? 'text-white' : 'text-white/55'}`} style={{ transition: 'color .5s' }}>{i + 1}</span>
                <span className={`block min-w-0 truncate font-bold ${on ? 'text-[12.5px] text-white' : 'text-[12px] text-white/75'}`} style={{ transition: 'font-size .5s, color .5s' }}>{w.title}</span>
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  ) : null

  const dots = slides.length > 1 ? (
    <div className="mt-6 flex items-center gap-2 md:hidden" role="tablist" aria-label="빌보드 작품">
      {slides.map((w, i) => (
        <button key={`${w.contentId}-${i}`} type="button" role="tab" aria-selected={i === idx} aria-label={`${i + 1}위 ${w.title}`} onClick={() => { setIdx(i); engaged('billboard', 'switch') }}
          className={`h-[6px] rounded-full transition-all ${i === idx ? 'w-7 bg-accent' : 'w-[6px] bg-ink/25 hover:bg-ink/50'}`} />
      ))}
    </div>
  ) : null

  return (
    /* 마우스 멈춤은 레일(작품 고르는 곳) 위에서만. 히어로 전체에 걸면 화면 폭을 다 차지하는 맨 위 영역이라 커서가
       지나가기만 해도 줄이 멈췄다 가기를 반복해 버벅거렸다(2026-10-01 실측).
       포커스 멈춤은 키보드로 들어온 포커스(:focus-visible)만. 마우스 클릭도 링크·버튼에 포커스를 남기는데, 그걸로
       멈추면 클릭 한 번에 다른 곳을 누를 때까지 전환이 서 버린다. */
    <div className="relative border-b border-line bg-raise" onFocusCapture={(e) => setFocusPaused((e.target as Element).matches(':focus-visible'))} onBlurCapture={() => setFocusPaused(false)}>
      <div className="wrap grid gap-8 py-9 md:grid-cols-[minmax(0,1fr)_168px] lg:grid-cols-[minmax(0,1fr)_184px] lg:gap-10">
        {/* 슬라이드 다섯 장을 모두 마운트해 같은 자리에 겹쳐 두고 투명도만 교차시킨다. 지웠다 다시 만들면
            그때마다 파형·순간을 새로 받아 빈 화면이 깜빡인다. 높이는 가장 큰 슬라이드에 맞춰 고정된다. */}
        <div className="grid min-w-0">
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
        {rail}
      </div>
      {/* 전환을 일으키는 보이지 않는 시계. 진행 줄과 같은 key·길이·멈춤 상태라 함께 차오르고 함께 끝난다.
          진행 줄 자체를 시계로 쓰지 않는 이유: 레일은 모바일에서 display:none 이라 그 안의 애니메이션은 돌지 않는다. */}
      {autoplay && (
        <span key={idx} aria-hidden className="pointer-events-none absolute left-0 top-0 size-px opacity-0" style={{ animation: `rail-progress ${BILLBOARD_INTERVAL_MS}ms linear forwards`, animationPlayState: playState }} onAnimationEnd={next} />
      )}
    </div>
  )
}

/* ═══ 순간별 대표 채팅 말풍선(HP-124, 2026-10-02 조현빈 확정 — 시안 1·디자인 1) ═══ */
const shown = (list: Moment[]) => list.filter((m) => m.quote)

/** 히어로 파형 위에 순간마다 대표 채팅 말풍선을 하나씩 띄운다(HP-124, 2026-10-02 조현빈 확정).
 *  · 크기: 반응 강도^2.5(최소 폭 36px·글자 9.5px).
 *  · 꼬리: 좌우 대칭 삼각형, 말풍선 아랫변 어디에든 붙는다 — 그래서 몸통을 꼬리 기준 좌·우 어디로든 옮길 수 있다.
 *    꼬리 끝은 막대 윗면 바로 위에 닿는다(별도 연결선 없음). 밀려 올라가도 막대에서 최대 LIFT 까지만 뜬다.
 *  · 위치는 대략이면 된다: 꼬리 끝은 순간에서 좌우 ±26px(양옆 순간은 넘지 않음). 가장 뜨거운 순간은 자기 빨간 막대 기둥을
 *    덮지 않는다(같은 빨강끼리 한 덩어리로 보이지 않게).
 *  · 겹침: 말풍선끼리 작은 쪽 넓이의 30% 까지, 글이 시작하는 앞쪽 45% 는 가리지 않는다. 다른 말풍선의 꼬리도 가리지 않는다.
 *  · 히트맵은 가려도 된다. 자리는 가장 뜨거운 순간이 먼저, 나머지는 오른쪽 순간부터 잡는다. */
const FIT_HEADROOM = 28
const TAIL = 7
const LIFT = 18
/** 말풍선 모양 — 둥근 사각형 + 아랫변 u 위치의 대칭 꼬리(끝 (u, h+TAIL), 끝은 살짝 둥글게). */
function bubblePath(w: number, h: number, radius: number, u: number) {
  const r = Math.min(radius, h / 2), T = TAIL, hw = 6.5
  return `M ${r} 0 H ${w - r} Q ${w} 0 ${w} ${r} V ${h - r} Q ${w} ${h} ${w - r} ${h}`
    + ` H ${u + hw} Q ${u + 2.2} ${h + 0.6} ${u + 0.9} ${h + T - 1.2} Q ${u} ${h + T + 0.3} ${u - 0.9} ${h + T - 1.2} Q ${u - 2.2} ${h + 0.6} ${u - hw} ${h}`
    + ` H ${r} Q 0 ${h} 0 ${h - r} V ${r} Q 0 0 ${r} 0 Z`
}
/** 디자인 1(부드러운 카드): 테두리 없는 흰 바탕 + 두 겹 그림자, 휘어 내려가는 꼬리.
 *  가장 뜨거운 순간은 강조색 + 빨간 글로우 그림자 — 같은 빨강의 막대 위에서 떠 보이게 한다(2026-10-02 확정). */
function bubbleLook(hot: boolean) {
  return hot
    ? { radius: 8, fill: 'var(--color-accent)', color: '#fff', weight: 600, shadow: 'drop-shadow(0 3px 4px rgba(120,0,6,.35)) drop-shadow(0 10px 16px rgba(229,9,20,.45))' }
    : { radius: 8, fill: 'var(--color-raise)', color: 'var(--color-ink)', weight: 500, shadow: 'drop-shadow(0 2px 3px rgba(16,16,24,.10)) drop-shadow(0 8px 18px rgba(16,16,24,.12))' }
}
/** 글자 폭 측정용 캔버스 하나를 모듈에서 공유한다(컴포넌트마다 만들지 않는다). */
const measureCtx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null
function textWidth(text: string, font: string) {
  if (!measureCtx) return text.length * 11
  measureCtx.font = font
  return measureCtx.measureText(text).width
}
function QuoteBubblesFit({ list, duration, peak, values, waveH }: { list: Moment[]; duration: number; peak: Moment | null; values: number[]; waveH: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [W, setW] = useState(0)
  const [font, setFont] = useState('sans-serif')
  // 폭과 글꼴은 그린 뒤에 잰다(렌더 중 ref 를 읽지 않는다). 글꼴은 말풍선 폭을 글자 길이로 맞추는 데 쓴다.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    setFont(getComputedStyle(el).fontFamily)
    const ro = new ResizeObserver(() => setW(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const H = FIT_HEADROOM + waveH, MINW = 36, n = values.length, OVERLAP = 0.3
  const barTopAt = (x: number) => H - Math.max(0.02, values[Math.min(n - 1, Math.max(0, Math.floor((x / W) * n)))] ?? 0) * waveH
  /** x = 꼬리 끝, u = 말풍선 왼쪽 끝에서 꼬리까지 */
  type R = { m: Moment; x: number; u: number; left: number; top: number; w: number; h: number; fs: number; px: number; t: number }
  const placed: R[] = []
  if (W > 0) {
    type B = { l: number; t: number; r: number; b: number }
    const inter = (a: B, b: B) => Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t))
    const area = (a: B) => (a.r - a.l) * (a.b - a.t)
    const boxOf = (p: R): B => ({ l: p.left, t: p.top, r: p.left + p.w, b: p.top + p.h })
    const tailOf = (p: R): B => ({ l: p.x - 6, t: p.top + p.h, r: p.x + 6, b: p.top + p.h + TAIL })
    // 머리 = 글이 시작하는 앞쪽 45%. 겹침은 끝쪽(글 잘리는 쪽)에만 허용한다 — 머리가 가려지면 읽을 수 없다.
    const headOf = (p: R): B => ({ l: p.left, t: p.top, r: p.left + p.w * 0.45, b: p.top + p.h })
    // 가장 뜨거운 순간이 먼저 자리를 잡아 크기를 지키고, 나머지는 오른쪽 순간부터(연결선이 없어 순서 제약이 풀렸다).
    const order = [...shown(list)].sort((a, b) => (b === peak ? 1 : 0) - (a === peak ? 1 : 0) || b.at - a.at)
    const xs = order.map((q) => (q.at / duration) * W).sort((a, b) => a - b)
    for (const m of order) {
      const t = Math.pow(Math.max(0, Math.min(1, m.strength / 100)), 2.5)
      const fs = 9.5 + 4 * t, h = Math.round(16 + 14 * t), px = Math.round(6 + 6 * t), x = (m.at / duration) * W
      const want = Math.max(MINW, Math.min(Math.round(56 + 204 * t), Math.ceil(textWidth(m.quote ?? '', `${fs}px ${font}`) + px * 2 + 2)))
      const prevX = [...xs].reverse().find((v) => v < x - 0.5) ?? -Infinity, nextX = xs.find((v) => v > x + 0.5) ?? Infinity
      const offsets = (m === peak ? [10, -10, 18, -18, 26, -26] : [0, 8, -8, 16, -16, 24, -24])
        .filter((d) => x + d > Math.max(0, prevX + 6) && x + d < Math.min(W, nextX - 6))
      if (!offsets.length) offsets.push(0)
      const peakBar = m === peak ? { l: x - 4, t: barTopAt(x) - 3, r: x + 4, b: H } : null
      let found: R | null = null
      // 1차: 겹침 30%·머리 보호까지 지키는 자리. 2차(못 찾으면): 말풍선끼리 겹침은 너그럽게, 꼬리 규칙만 지킨다.
      for (const strict of [true, false]) {
        search: for (const d of offsets) {
          const tx = x + d
          const seat = barTopAt(tx) - 2 // 꼬리 끝이 닿을 막대 윗면
          for (let w = want; ; w = Math.max(MINW, w - 12)) {
            // 꼬리를 아랫변 어디에 붙일지 — 왼쪽 가까이(글 시작 쪽)부터, 몸통을 왼쪽으로 밀며 오른쪽 끝까지.
            const r = 8, uMin = Math.min(r + 7, w / 2), uMax = Math.max(uMin, w - r - 7)
            const us: number[] = []
            for (let u = Math.min(14, uMax); u <= uMax + 0.1; u += 12) us.push(u)
            if (us[us.length - 1] < uMax) us.push(uMax)
            for (const u of us) {
              const left = tx - u
              if (left < 0 || left + w > W) continue
              const low = seat - TAIL - h // 꼬리 끝이 막대에 닿는 높이
              // 막대가 높아 위 여유가 모자라면 맨 위부터(막대 윗부분을 덮는다). 위로는 LIFT 까지만 띄운다.
              for (let top = Math.max(0, Math.min(low, H - h - TAIL)); top >= Math.max(0, low - LIFT); top -= 3) {
                const c: R = { m, x: tx, u, left, top, w, h, fs, px, t }
                const box = boxOf(c), tail = tailOf(c)
                if (peakBar && (inter(box, peakBar) > 0 || inter(tail, peakBar) > 0)) continue
                const clash = placed.some((p) => {
                  const pb = boxOf(p)
                  if (inter(box, tailOf(p)) > 0 || inter(tail, pb) > 0) return true
                  if (!strict) return inter(box, headOf(p)) > 0.6 * area(headOf(p))
                  return inter(box, pb) > OVERLAP * Math.min(area(box), area(pb)) || inter(box, headOf(p)) > 0 || inter(headOf(c), pb) > 0
                })
                if (!clash) { found = c; break search }
              }
            }
            if (w === MINW) break
          }
        }
        if (found) break
      }
      placed.push(found ?? { m, x, u: Math.min(14, want / 2), left: Math.min(Math.max(0, x - 14), W - want), top: 0, w: want, h, fs, px, t })
    }
  }
  return (
    <div ref={ref} className="pointer-events-none absolute inset-0 z-[1] hidden sm:block">
      {placed.map((p) => {
        const look = bubbleLook(p.m === peak)
        return (
          <div key={p.m.at} style={{ position: 'absolute', zIndex: Math.round(p.t * 100) }}>
            <svg className="absolute overflow-visible" style={{ left: p.left, top: p.top, filter: look.shadow }} width={p.w} height={p.h + TAIL} aria-hidden>
              <path d={bubblePath(p.w, p.h, look.radius, p.u)} fill={look.fill} />
            </svg>
            <div className="absolute flex items-center leading-none"
              style={{ left: p.left, top: p.top, width: p.w, height: p.h, fontSize: p.fs, paddingInline: p.px, fontWeight: look.weight, color: look.color }}>
              <span className="block min-w-0 truncate">{p.m.quote}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function BillboardSlide({ top, live, loading, rank, footer }: { top: RankItem | null; live: LiveShow[]; loading: boolean; rank: number; footer?: React.ReactNode }) {
  const episodeId = top?.episodeId ?? null
  const duration = top?.durationSec ?? 0
  const bars = { values: top?.bars.length ? top.bars : Array(120).fill(0.04) as number[], duration }
  // 모바일 파형은 48개 — 120개를 350px 에 넣으면 1px 미만이 되어 봉우리가 뭉개진다.
  const barsSm = { values: downsample(bars.values, 48), duration }
  const list = top?.moments ?? []
  const show = live.find((s) => s.showId === String(episodeId)) ?? null
  const viewers = show ? show.segments.reduce((a, s) => a + s.viewers, 0) : 0
  const peak = list.reduce<Moment | null>((a, m) => (!a || m.strength > a.strength ? m : a), null)
  const play = top ? watchUrl(top.platform, top.platformEpisodeId, peak?.at) : null
  const epTitle = top ? (top.episodeTitle ?? (episodeLabel({ seasonNumber: top.seasonNumber, episodeNumber: top.episodeNumber }, top.contentType) || '대표 회차')) : ''

  if (!top) {
    const tone = loading ? 'skeleton' : 'bg-sink/60'
    return (
      <section className="h-full" aria-busy={loading}>
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
    <section className="flex h-full flex-col justify-center">
      <div className="flex flex-col gap-7 md:flex-row md:items-center md:gap-10">
        <a href={titleHref(top.contentId, episodeId)} className="w-[168px] shrink-0 lg:w-[212px]">
          <PosterSlot title={top.title} poster={top.posterUrl} />
        </a>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <Chip tone="accent">{rank === 1 ? '가장 많이 본 작품' : `많이 본 작품 ${rank}위`}</Chip>
            {viewers > 0 && (<><Rule /><LiveCount n={viewers} /></>)}
          </div>

          <h1 className="mt-3 text-[38px] leading-[1.02] tracking-[-0.05em] lg:text-[44px]">{top.title}</h1>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-[13px] text-muted">
            <span className="font-bold text-ink">{epTitle}</span>
            {bars.duration > 0 && (<><Rule /><span className="num">{fmtTime(bars.duration)}</span></>)}
            {list.length > 0 && (
              <><Rule /><span className="font-bold text-accentd">뜨거운 순간 {list.length}</span></>
            )}
          </div>

          <div className="mt-6">
            <p className="mb-2.5 text-[12px] font-semibold text-muted">이 회차의 채팅 반응</p>
            {bars.duration > 0 ? (
              <>
                <div className="relative sm:pt-[28px]">
                  {/* 말풍선 머리 위 여유(FIT_HEADROOM=28) — 모바일은 말풍선을 그리지 않으므로 여유도 두지 않는다. */}
                  <QuoteBubblesFit list={list} duration={bars.duration} peak={peak} values={bars.values} waveH={104} />
                  <Waveform values={bars.values} height={104} className="hidden sm:flex"
                    active={peak ? [peak.at / bars.duration - 0.016, peak.at / bars.duration + 0.016] : undefined} />
                </div>
                <Waveform values={barsSm.values} height={72} className="sm:hidden"
                  active={peak ? [peak.at / bars.duration - 0.03, peak.at / bars.duration + 0.03] : undefined} />
                <div className="relative mt-2 h-px bg-line">
                  {list.map((m) => (
                    <span key={m.at} className="absolute top-1/2 size-[6px] -translate-x-1/2 -translate-y-1/2 rounded-full"
                      style={{ left: `${(m.at / bars.duration) * 100}%`, background: m === peak ? 'var(--color-accent)' : 'var(--color-faint)' }} />
                  ))}
                </div>
                <div className="relative mt-2 hidden h-9 sm:block">
                  {/* 가까운 순간끼리 라벨이 겹치므로 직전 라벨과 4.5% 안이면 라벨을 건너뛴다(점은 남는다). */}
                  {list.filter((m, i, arr) => i === 0 || (m.at - arr[i - 1].at) / bars.duration > 0.045 || m === peak).map((m) => {
                    const i = list.indexOf(m)
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
              <Empty>이 회차에는 아직 채팅이 없습니다</Empty>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {play && (
              <a href={play} target="_blank" rel="noopener" onClick={() => trackWatch(play, 'home_billboard')}
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-btn bg-accent px-4 py-2.5 text-[14px] font-bold text-white transition-all hover:brightness-110 active:translate-y-px">
                <PlayIcon size={15} weight="fill" />
                넷플릭스에서 {peak ? `${fmtTime(peak.at)}부터 ` : ''}보기
                <ArrowUpRightIcon size={13} weight="bold" className="opacity-80" />
              </a>
            )}
            <a href={titleHref(top.contentId, episodeId)}
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-btn border border-line2 bg-raise px-4 py-2.5 text-[14px] font-bold text-ink transition-colors hover:bg-soft">
              <ListPlusIcon size={15} />
              작품 상세
            </a>
          </div>
          {footer}
        </div>
      </div>
    </section>
  )
}

/* ═══ 많이 본 작품 ════════════════════════════════════════════
   ranking 순서가 곧 순위다. 지수가 없으므로 숫자·선은 두지 않는다. 창(전체/이번 주)은 읽기 모델(HP-124)의
   시간축이 생기면서 가능해진 것 — 전체 누적은 시간이 갈수록 굳으므로 '이번 주'가 새 작품이 올라오는 길이다. */
function WindowToggle({ value, onChange }: { value: Window; onChange: (w: Window) => void }) {
  return (
    <div className="flex gap-1 rounded-sm bg-sink p-0.5 text-[12px] font-bold" role="group" aria-label="기간">
      {(['all', '7d'] as const).map((k) => (
        <button key={k} type="button" onClick={() => onChange(k)} aria-pressed={value === k}
          className={`rounded-[6px] px-2.5 py-1 transition-colors ${value === k ? 'bg-raise text-ink shadow-[0_1px_2px_rgba(16,16,24,0.12)]' : 'text-muted hover:text-ink'}`}>
          {k === 'all' ? '전체' : '이번 주'}
        </button>
      ))}
    </div>
  )
}

function Ranking({ items, loading, window, onWindow }: { items: RankItem[]; loading: boolean; window: Window; onWindow: (w: Window) => void }) {
  /* 열 수는 폭이 정하고 줄은 두 줄 — 작품 선택의 폭을 위해 순위만 두 줄을 허용한다. */
  const fill = useFillCount(150, 16, 2)
  return (
    <section id="ranking" className={`scroll-mt-[74px] ${SEC}`} aria-busy={loading}>
      <SectionHead title="많이 본 작품" action={<WindowToggle value={window} onChange={onWindow} />} />
      {items.length === 0 ? (
        <div ref={fill.ref}>
          <PosterGridSkeleton count={fill.count} loading={loading} />
          {!loading && <EmptyNote>아직 순위가 없습니다.</EmptyNote>}
        </div>
      ) : (
        <div ref={fill.ref} className="fill-grid" style={{ '--min': '150px', '--gx': '16px', '--gy': '24px' } as React.CSSProperties}>
          {items.map((w, i) => (
            <Reveal key={`${w.contentId}-${i}`} delay={Math.min(i, 6) * 0.03} hidden={i >= fill.count}>
              <a href={titleHref(w.contentId, w.episodeId)} className="group block"
                aria-label={`${i + 1}위 ${w.title}`}>
                <div className="relative">
                  <PosterSlot title={w.title} poster={w.posterUrl} />
                  <span className={`num absolute left-2 top-2 inline-flex items-center rounded-sm px-2 py-1 font-mono text-[11px] font-bold leading-none shadow-[0_1px_4px_rgba(16,16,24,0.35)] ${i === 0 ? 'bg-accent text-white' : 'bg-ink/80 text-white'}`}>
                    {i + 1}
                  </span>
                </div>
                <p className="mt-2.5 truncate text-[13.5px] font-bold text-ink">{w.title}</p>
                <p className="mt-0.5 truncate text-[12px] text-muted">{w.episodeTitle ?? (episodeLabel({ seasonNumber: w.seasonNumber, episodeNumber: w.episodeNumber }, w.contentType) || ' ')}</p>
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
function HotMoments({ top, live, loading }: { top: RankItem | null; live: LiveShow[]; loading: boolean }) {
  const episodeId = top?.episodeId ?? null
  const show = live.find((s) => s.showId === String(episodeId)) ?? null
  const list = top?.moments ?? []
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
          <a href={titleHref(top.contentId, episodeId)} className="block w-[96px] shrink-0 md:w-full">
            <PosterSlot title={top.title} poster={top.posterUrl} />
          </a>
          <div className="min-w-0 md:mt-3">
            <p className="text-[15px] font-bold text-ink">{top.title}</p>
            <p className="mt-0.5 text-[12.5px] text-muted">{top.episodeTitle ?? episodeLabel({ seasonNumber: top.seasonNumber, episodeNumber: top.episodeNumber }, top.contentType)}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-muted">
              <span>순간 {list.length}개</span>
              {show && (<><Rule /><LiveCount n={show.segments.reduce((a, s) => a + s.viewers, 0)} /></>)}
            </div>
          </div>
        </div>

        {list.length === 0 ? (
          <div>
            <RowsSkeleton rows={5} loading={false} />
            <EmptyNote>아직 순간이 없습니다.</EmptyNote>
          </div>
        ) : (
          <ol className="min-w-0 divide-y divide-line border-y border-line">
            {list.map((m, i) => {
              const on = m === peak
              const href = watchUrl(top.platform, top.platformEpisodeId, m.at)
              const Row = href ? 'a' : 'div'
              return (
                <li key={m.at}>
                  <Row {...(href ? { href, target: '_blank', rel: 'noopener', onClick: () => trackWatch(href, 'home_hot') } : {})}
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
              <a href={href ?? undefined} target={href ? '_blank' : undefined} rel="noopener" className="group block" onClick={() => trackWatch(href, 'home_live')}>
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

/* ═══ 이번 주 인기 순간 — 최근 7일 순위 작품들의 1위 순간 ═══
   창이 '7d' 인 홈 응답을 쓴다 — 읽기 모델의 시간축 덕분에 이름 그대로 "이번 주"다(이전엔 전체 누적이었다). */
function WeeklyMoments({ items, loading }: { items: RankItem[]; loading: boolean }) {
  const fill = useFillCount(300, 20, 1)
  const heads = items.filter((w) => w.episodeId).slice(0, Math.max(fill.count, 1))
  const rows = heads.map((w) => {
    const m = [...w.moments].sort((a, b) => b.strength - a.strength)[0]
    return m ? { key: `${w.episodeId}`, work: w.title, episode: w.episodeTitle ?? episodeLabel({ seasonNumber: w.seasonNumber, episodeNumber: w.episodeNumber }, w.contentType), at: fmtTime(m.at), quote: m.quote ?? '', poster: w.posterUrl, contentId: w.contentId } : null
  }).filter((x): x is NonNullable<typeof x> => x !== null)
  const busy = loading
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
              <a href={titleHref(c.contentId)} className="group flex gap-4">
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

/* 막대 배열을 n개로 줄인다(구간 최대값) — 봉우리를 살리기 위해 평균이 아니라 최대를 취한다. */
function downsample(values: number[], n: number): number[] {
  if (values.length <= n) return values
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    const a = Math.floor((i / n) * values.length)
    const b = Math.max(a + 1, Math.floor(((i + 1) / n) * values.length))
    out.push(Math.max(...values.slice(a, b)))
  }
  return out
}

/* ═══ 홈 ═════════════════════════════════════════════════════
   요청은 셋뿐이다 — /catalog/home(전체) · /catalog/home(이번 주) · /live-scenes. 순위·빌보드·순간·파형은 전부
   첫 두 응답에 실려 온다(HP-124 읽기 모델). 창 전환은 이미 받은 두 응답을 바꿔 끼우는 것이라 요청이 없다. */
export default function Home() {
  const [window, setWindow] = useState<Window>('all')
  const all = useAsync(() => api.catalogHome('all'), [])
  const week = useAsync(() => api.catalogHome('7d'), [])
  const live = useAsync(() => api.liveScenes(), [])
  const cur = window === 'all' ? all : week
  const items = cur.data?.ranking ?? []
  const shows = live.data?.shows ?? []

  return (
    <>
      <Billboard items={items} live={shows} loading={cur.loading} />
      <Ranking items={items} loading={cur.loading} window={window} onWindow={setWindow} />
      <HotMoments top={items[0] ?? null} live={shows} loading={cur.loading} />
      <WeeklyMoments items={week.data?.ranking ?? []} loading={week.loading} />
      <LiveRail shows={shows} loading={live.loading} />
      {cur.error && (
        <p className={`text-[12.5px] text-muted ${SEC}`}>서버 응답 오류: {cur.error.message}</p>
      )}
    </>
  )
}
