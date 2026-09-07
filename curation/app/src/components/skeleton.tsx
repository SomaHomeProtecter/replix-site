/* 로딩 스켈레톤과 빈 상태(HP-124 시안).
   예시 데이터로 채우지 않는다 — 없는 것은 없다고 보이게 한다(조현빈, 2026-09-05).
   로딩 중에는 유튜브 목록처럼 실제 카드와 같은 크기의 회색 판이 은은하게 깜빡이고,
   데이터가 없으면 같은 자리를 흐린 빈 카드로 채우고 문구 한 줄을 둔다. */

export function Shimmer({ className = '' }: { className?: string }) {
  return <span className={`skeleton block rounded-sm ${className}`} aria-hidden />
}

/** 포스터 카드 자리. loading 이면 깜빡이고, 아니면 흐린 빈 판(데이터 없음). */
export function PosterCardSkeleton({ loading = true, wide = false }: { loading?: boolean; wide?: boolean }) {
  const tone = loading ? 'skeleton' : 'bg-sink/60'
  return (
    <div aria-hidden>
      <div className={`${tone} rounded-md`} style={{ aspectRatio: wide ? '16 / 9' : '2 / 3' }} />
      <div className={`${tone} mt-2.5 h-[13px] w-3/4 rounded-sm`} />
      <div className={`${tone} mt-1.5 h-[11px] w-1/2 rounded-sm`} />
    </div>
  )
}

export function PosterGridSkeleton({ count = 12, loading = true }: { count?: number; loading?: boolean }) {
  return (
    <div className="fill-grid" style={{ '--min': '150px', '--gx': '16px', '--gy': '24px' } as React.CSSProperties}>
      {Array.from({ length: count }, (_, i) => <PosterCardSkeleton key={i} loading={loading} />)}
    </div>
  )
}

export function RailSkeleton({ count = 10, loading = true }: { count?: number; loading?: boolean }) {
  return (
    <ul className="fill-grid" style={{ '--min': '140px', '--gx': '16px', '--gy': '0px' } as React.CSSProperties}>
      {Array.from({ length: count }, (_, i) => (
        <li key={i}><PosterCardSkeleton loading={loading} /></li>
      ))}
    </ul>
  )
}

/** 트랙리스트(순간 목록) 자리. */
export function RowsSkeleton({ rows = 5, loading = true }: { rows?: number; loading?: boolean }) {
  const tone = loading ? 'skeleton' : 'bg-sink/60'
  return (
    <ol className="divide-y divide-line border-y border-line" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="grid grid-cols-[28px_64px_1fr] items-center gap-x-4 px-2 py-3.5">
          <span className={`${tone} h-3 w-3 rounded-sm`} />
          <span className={`${tone} h-4 w-12 rounded-sm`} />
          <span className="min-w-0">
            <span className={`${tone} block h-4 w-2/5 rounded-sm`} />
            <span className={`${tone} mt-1.5 block h-3 w-3/5 rounded-sm`} />
          </span>
        </li>
      ))}
    </ol>
  )
}

/** 카드 격자(회차 카드) 자리. */
export function CardGridSkeleton({ count = 4, loading = true }: { count?: number; loading?: boolean }) {
  const tone = loading ? 'skeleton' : 'bg-sink/60'
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-md border border-line bg-raise p-4">
          <div className={`${tone} h-5 w-1/3 rounded-sm`} />
          <div className={`${tone} mt-2 h-3.5 w-2/3 rounded-sm`} />
          <div className="mt-3 space-y-1.5 border-t border-line pt-3">
            <div className={`${tone} h-3 w-full rounded-sm`} />
            <div className={`${tone} h-3 w-5/6 rounded-sm`} />
            <div className={`${tone} h-3 w-4/6 rounded-sm`} />
          </div>
          <div className={`${tone} mt-4 h-px w-full`} />
        </div>
      ))}
    </div>
  )
}

/** 빈 상태 문구. 스켈레톤(빈 카드) 아래에 한 줄로 둔다. */
export function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 text-center text-[13px] text-muted">{children}</p>
}
