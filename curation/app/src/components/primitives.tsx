import { useEffect, useRef, useState } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'
import { posterUrl, REACTION_LABELS, type Reaction } from '../data'

/* ── 반응 유형 색 ────────────────────────────────────────────
   색만으로 구분하지 않는다. 어느 표시에서든 이름과 %를 함께 붙인다
   (원본 시안이 세운 규칙이고, 색맹 대응의 실질적 보장은 여기서 나온다). */
export const REACTION_BG: Record<string, string> = {
  joy: 'bg-joy',
  surprise: 'bg-surprise',
  moved: 'bg-moved',
}
export const REACTION_TEXT: Record<string, string> = {
  joy: 'text-joy',
  surprise: 'text-surprise',
  moved: 'text-moved',
}

/* ── 진입 감지 (안전망 포함) ─────────────────────────────────
   스크롤 진입 연출은 요소를 opacity 0 에서 시작시킨다. 그런데
   IntersectionObserver 가 어떤 이유로든 발화하지 않으면 그 콘텐츠는
   영원히 보이지 않는다. 화면이 비는 것보다 연출이 생략되는 편이 낫다.
   그래서 진입 신호와 별개로 1.2초 뒤에는 무조건 보이게 한다. */
export function useRevealed(ref: React.RefObject<Element | null>, amount = 0.25) {
  const inView = useInView(ref, { once: true, amount })
  const [timedOut, setTimedOut] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setTimedOut(true), 1200)
    return () => clearTimeout(id)
  }, [])
  return inView || timedOut
}

/* ── 결정적 난수 ────────────────────────────────────────────
   파형은 렌더마다 모양이 바뀌면 안 된다. 시드 고정. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 순간 위치에 봉우리를 둔 반응 파형 값 배열. */
export function waveform(bars: number, duration: number, peaks: { sec: number; score: number }[], seed = 7) {
  const rnd = mulberry32(seed)
  // 봉우리 폭은 막대 두세 칸 정도여야 순간이 분리돼 보인다.
  // 이보다 넓으면 봉우리들이 겹쳐 하나의 오르막으로 뭉개진다.
  const sigma = (duration / bars) * 2.2
  return Array.from({ length: bars }, (_, i) => {
    const t = ((i + 0.5) / bars) * duration
    let v = 0.08 + rnd() * 0.1
    for (const p of peaks) {
      v += (p.score / 100) * Math.exp(-((t - p.sec) ** 2) / (2 * sigma ** 2)) * 0.86
    }
    return Math.min(1, v)
  })
}

/* ── 파형 ────────────────────────────────────────────────────
   화면당 큰 파형은 한 장뿐이다(홈=빌보드, 상세=회차 히트맵).
   나머지는 낮은 스파크라인이거나 점이다. 카드마다 파형을 넣으면
   정보가 아니라 배경 무늬가 된다. */
export function Waveform({
  values,
  height = 128,
  active,
  className = '',
}: {
  values: number[]
  height?: number
  /** 강조할 막대 구간 [시작비율, 끝비율] */
  active?: [number, number]
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const shown = useRevealed(ref, 0.4)
  const reduce = useReducedMotion()

  return (
    <div ref={ref} className={`flex items-end gap-[2px] ${className}`} style={{ height }} aria-hidden>
      {values.map((v, i) => {
        const p = i / values.length
        const on = active ? p >= active[0] && p <= active[1] : false
        return (
          /* height 는 고정값으로 두고 scaleY 만 움직인다. height 를 애니메이션하면
             매 프레임 레이아웃이 다시 계산되어 모바일에서 프레임이 무너진다. */
          <motion.span
            key={i}
            className="min-w-0 flex-1 rounded-t-[2px]"
            style={{
              height: `${Math.max(2, v * 100)}%`,
              transformOrigin: 'bottom',
              background: on ? 'var(--color-accent)' : 'rgba(16,16,24,0.17)',
            }}
            initial={reduce ? false : { scaleY: 0 }}
            animate={shown || reduce ? { scaleY: 1 } : {}}
            transition={{ duration: 0.5, delay: reduce ? 0 : i * 0.004, ease: [0.16, 1, 0.3, 1] }}
          />
        )
      })}
    </div>
  )
}

/* ── 반응 유형 막대 ─────────────────────────────────────────── */
export function ReactionBar({
  reaction,
  showLabels = true,
  size = 'md',
}: {
  reaction: Reaction
  showLabels?: boolean
  size?: 'sm' | 'md'
}) {
  const h = size === 'sm' ? 'h-[3px]' : 'h-[5px]'
  /* 라벨이 붙을 때는 세 토막을 띄워 각 라벨과 짝지어 읽히게 하고,
     라벨이 없을 때는 붙여서 하나의 비율 막대로 만든다. 라벨 없이 띄우면
     세 개의 짧은 선이 떠 있는 꼴이라 비율이 아니라 장식으로 읽힌다. */
  const gap = showLabels ? 'gap-[3px]' : 'gap-0'
  const round = showLabels ? 'rounded-full' : ''
  return (
    <div>
      <div className={`flex ${h} ${gap} w-full overflow-hidden ${showLabels ? '' : 'rounded-full'}`}>
        {REACTION_LABELS.map(({ key, cls }) => (
          <span
            key={key}
            className={`${REACTION_BG[cls]} ${round}`}
            style={{ width: `${reaction[key]}%` }}
          />
        ))}
      </div>
      {showLabels && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {REACTION_LABELS.map(({ key, label, cls }) => (
            <span key={key} className={`text-[12px] font-semibold ${REACTION_TEXT[cls]}`}>
              {label} <span className="num font-mono text-[11.5px]">{reaction[key]}%</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── 지수 카운트업 ──────────────────────────────────────────
   지수는 계산된 값이라는 것을 숫자가 올라가는 동작이 말해 준다.
   장식이 아니라 "지금 집계된 값"이라는 신호다. */
export function CountUp({ to, className = '' }: { to: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const shown = useRevealed(ref, 0.6)
  const reduce = useReducedMotion()
  const [counted, setCounted] = useState(0)
  // 모션을 끈 사용자에게는 세는 과정이 의미가 없으므로 최종값을 바로 렌더한다.
  const n = reduce ? to : counted

  useEffect(() => {
    if (reduce || !shown) return
    let raf = 0
    const start = performance.now()
    const dur = 900
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur)
      setCounted(Math.round(to * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [shown, to, reduce])

  return (
    <span ref={ref} className={`num ${className}`}>
      {n}
    </span>
  )
}

/* ── 포스터 ─────────────────────────────────────────────────
   이미지는 TMDB 에서 받는다. 넷플릭스 클라이언트에서 꺼내는 경로는
   금지이고(개발 규칙 B1·B2), 그 금지는 이미지라는 대상이 아니라
   출처에 걸려 있다 — 배포처를 지나오면 등급이 다르다(B 보충).
   활자 판은 아래에 남겨 두는 폴백이다: TMDB 에 없는 작품, 이미지 로드
   실패, 오프라인 검토 세 경우를 이게 받는다. */
export function PosterSlot({
  title,
  poster: posterProp,
  className = '',
}: {
  title: string
  /** 서버가 준 포스터 URL. 주면 그걸 쓰고, 없으면(undefined) 시안용 POSTERS 표에서 찾는다. null 은 "없음". */
  poster?: string | null
  className?: string
}) {
  const poster = posterProp === undefined ? posterUrl(title) : posterProp
  return (
    <div
      className={`poster-slot relative overflow-hidden rounded-md bg-sink ${className}`}
      style={{ aspectRatio: '2 / 3' }}
      aria-hidden
    >
      {/* 활자 판은 지우지 않고 아래에 남긴다. TMDB 에 없는 작품(매칭 실패)과
          이미지를 못 불러온 경우에 그대로 드러나는 바닥이 된다.
          여백을 padding 이 아니라 inset 으로 주는 이유: 퍼센트 padding 은 자기
          너비가 아니라 부모(포함 블록)의 너비를 기준으로 계산되므로, 부모가
          넓은 곳에 같은 컴포넌트를 놓으면 패딩이 타일보다 커져 내용이 사라진다. */}
      <div className="absolute inset-[8%] flex flex-col justify-end">
        <span className="poster-slot__title font-extrabold text-ink/45">{title}</span>
      </div>

      {/* TMDB 포스터는 2:3 이 아니다(500×700~750 로 제각각). 비율을 맞추려
          늘리지 말고 cover 로 채운다. */}
      {poster && (
        <img
          src={poster}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 size-full object-cover"
        />
      )}
    </div>
  )
}

/* ── 스크롤 진입 ────────────────────────────────────────────
   순위는 순서가 곧 내용이다. 위에서부터 차례로 들어오게 해서
   그 순서를 눈이 따라가게 만든다. */
export function Reveal({
  children,
  delay = 0,
  className = '',
  as = 'div',
  hidden = false,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
  as?: 'div' | 'li' | 'section'
  /** 격자 줄 상한 밖의 항목. 언마운트하지 않고 숨긴다 — 다시 나타날 때 진입 연출이 되돌지 않게. */
  hidden?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const shown = useRevealed(ref)
  const reduce = useReducedMotion()
  const M = motion[as] as typeof motion.div
  return (
    <M
      ref={ref}
      hidden={hidden}
      className={className}
      initial={reduce ? false : { opacity: 0, y: 18 }}
      animate={shown || reduce ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay: reduce ? 0 : delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </M>
  )
}

/* ── 섹션 제목 ──────────────────────────────────────────────
   제품 화면의 눈금이다. 랜딩처럼 26~30px 로 키우면 카탈로그를 훑는
   화면이 아니라 소개 페이지가 된다. 원 시안과 같은 19px 을 유지한다.
   눈썹(작은 대문자 넓은 자간 라벨)은 쓰지 않는다 — 제목 옆 한 줄이면 된다. */
export function SectionHead({
  title,
  chip,
  note,
  action,
}: {
  title: string
  chip?: React.ReactNode
  note?: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <h2 className="text-[19px] tracking-[-0.035em]">{title}</h2>
      {chip}
      {note && <p className="text-[12.5px] text-muted">{note}</p>}
      {action && <div className="ml-auto">{action}</div>}
    </div>
  )
}

/** 순위·회차 목록에서 "모두 보기" 같은 보조 이동. 한 페이지에 한 가지 문구만 쓴다. */
export function MoreLink({ children = '모두 보기' }: { children?: React.ReactNode }) {
  return (
    <a href="#/" className="text-[12.5px] font-semibold text-muted transition-colors hover:text-ink">
      {children}
    </a>
  )
}

/** 작은 라벨. 강조색은 실제로 강조가 필요한 하나에만 쓴다. */
export function Chip({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode
  tone?: 'neutral' | 'accent' | 'ink'
}) {
  const cls =
    tone === 'accent'
      ? 'bg-accentw text-accentd'
      : tone === 'ink'
        ? 'bg-ink text-white'
        : 'bg-sink text-ink2'
  return (
    <span className={`rounded-sm px-2 py-[3px] text-[11.5px] font-bold ${cls}`}>{children}</span>
  )
}

/* ── 순간 점선 ──────────────────────────────────────────────
   카드와 목록 행에 들어가는 작은 축. 큰 파형은 화면당 한 장뿐이므로
   여기서는 점만 찍는다. */
export function MomentDots({
  moments,
  duration,
  activeSec,
  className = '',
}: {
  moments: { id: string; sec: number; score?: number }[]
  duration: number
  activeSec?: number
  className?: string
}) {
  return (
    <div className={`relative h-[9px] ${className}`} aria-hidden>
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-line2" />
      {moments.map((m) => {
        const on = activeSec === m.sec
        return (
          <span
            key={m.id}
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              left: `${(m.sec / duration) * 100}%`,
              width: on ? 7 : 5,
              height: on ? 7 : 5,
              background: on ? 'var(--color-accent)' : 'rgba(16,16,24,0.45)',
            }}
          />
        )
      })}
    </div>
  )
}

/** 세로 실선 구분. 가운뎃점 대신 쓴다. */
export function Rule() {
  return <span className="h-3 w-px shrink-0 bg-line2" aria-hidden />
}

export function Avatar({ ch }: { ch: string }) {
  return (
    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-sink text-[11px] font-bold text-muted">
      {ch}
    </span>
  )
}
