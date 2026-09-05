import { useEffect, useState } from 'react'

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
