import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { RAIL_QUERY, columnsFor, visibleLimit } from './grid-pure.js'

export type Async<T> = { data: T | null; error: Error | null; loading: boolean }

/** 아주 작은 fetch 훅. 의존값이 바뀌면 다시 부르고, 언마운트·재요청 뒤 늦게 온 응답은 버린다. */
export function useAsync<T>(fn: () => Promise<T> | null, deps: unknown[]): Async<T> {
  const [state, setState] = useState<Async<T>>({ data: null, error: null, loading: true })
  useEffect(() => {
    let alive = true
    const p = fn()
    if (!p) {
      setState({ data: null, error: null, loading: false })
      return
    }
    setState((s) => ({ ...s, loading: true, error: null }))
    p.then(
      (data) => alive && setState({ data, error: null, loading: false }),
      (error: Error) => alive && setState({ data: null, error, loading: false }),
    )
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return state
}

/** 휴대폰 폭(760px 이하)인가 — 격자를 한 줄 가로 레일로 바꾸는 판정(grid-pure.js RAIL_QUERY). 폭이 바뀌면 다시 본다. */
export function useRail() {
  const [rail, setRail] = useState(() => typeof window !== 'undefined' && window.matchMedia(RAIL_QUERY).matches)
  useEffect(() => {
    const mq = window.matchMedia(RAIL_QUERY)
    const on = () => setRail(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return rail
}

/** 화면 폭을 가득 채우는 격자에서 보일 항목 수(열 × 줄). 열 수는 컨테이너 폭에서 계산하고
 *  폭이 바뀌면 다시 센다. 숫자 상한 대신 화면이 상한을 정한다(2026-09-07 조현빈).
 *  휴대폰 폭에선 격자가 한 줄 가로 레일이 되어(index.css .fill-grid.rail-sm) 하나도 숨기지 않는다 — 숨김은 i >= limit 으로
 *  보고, 레일이면 limit 이 무한대다(HP-474, 2026-10-02 김지호 휴대폰 예외). count 는 스켈레톤 칸 수로 그대로 쓴다.
 *  ref 는 콜백이다 — 스켈레톤 ↔ 실제 격자처럼 요소가 바뀌어도 새 요소를 다시 관찰한다. */
export function useFillCount(minPx: number, gapPx: number, rows: number) {
  const [node, setNode] = useState<HTMLElement | null>(null)
  const [cols, setCols] = useState(1)
  const rail = useRail()
  const ref = useCallback((el: HTMLElement | null) => setNode(el), [])
  useLayoutEffect(() => {
    if (!node) return
    const measure = () => {
      const w = node.clientWidth
      if (w < minPx) return // 캡처·전환 중 잠깐 0 으로 재는 경우가 있다 — 그 값으로 열을 줄이지 않는다
      setCols(columnsFor(w, minPx, gapPx))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(node)
    return () => ro.disconnect()
  }, [node, minPx, gapPx])
  return { ref, count: cols * rows, cols, rail, limit: visibleLimit(cols, rows, rail) }
}
