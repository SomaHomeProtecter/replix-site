import { useCallback, useEffect, useState } from 'react'
import { HeartIcon, StarIcon, TrashIcon, EyeSlashIcon } from '@phosphor-icons/react'
import { api, ApiError, decodeEntities, type Comment, type CommentSort, type Rating } from '../api'
import { login, useAuth } from '../auth'
import { Avatar, SectionHead } from './primitives'
import { EmptyNote } from './skeleton'

/* ═══ 작품 댓글(별점) ═══════════════════════════════════════
   회차 채팅이 "그 장면"에 대한 반응이라면, 여기는 "그 작품"에 대한 평가다(2026-09-14 조현빈).
   회차마다 댓글창을 열지 않고 작품 하나에 한 창 — 사용자당 한 건(다시 쓰면 내 글이 갱신된다).
   읽기는 누구나, 쓰기·좋아요는 로그인. 스포일러는 작성자 표시로 가리고 눌러서 연다. */

const PAGE = 20

export function Stars({ value, onChange, size = 16 }: { value: number; onChange?: (v: number) => void; size?: number }) {
  const [hover, setHover] = useState(0)
  const shown = hover || value
  return (
    <span className="inline-flex items-center gap-0.5" role={onChange ? 'radiogroup' : undefined} aria-label={onChange ? '별점' : `별점 ${value}점`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = n <= shown
        const El = onChange ? 'button' : 'span'
        return (
          <El key={n} {...(onChange ? { type: 'button', role: 'radio', 'aria-checked': n === value, 'aria-label': `${n}점`,
            onClick: () => onChange(n), onMouseEnter: () => setHover(n), onMouseLeave: () => setHover(0) } : {})}
            className={`leading-none ${onChange ? 'cursor-pointer' : ''} ${on ? 'text-accent' : 'text-line2'}`}>
            <StarIcon size={size} weight={on ? 'fill' : 'regular'} />
          </El>
        )
      })}
    </span>
  )
}

export function RatingSummary({ rating }: { rating: Rating }) {
  if (!rating.count) return <p className="text-[12.5px] text-faint">아직 별점이 없습니다</p>
  return (
    <div className="flex items-baseline gap-2.5">
      <p className="num font-mono text-[30px] font-extrabold leading-none tracking-tight text-ink">{rating.average!.toFixed(1)}</p>
      <div>
        <Stars value={Math.round(rating.average!)} size={13} />
        <p className="mt-0.5 num font-mono text-[11px] text-muted">{rating.count}명이 평가</p>
      </div>
    </div>
  )
}

function Write({ contentId, mine, onSaved }: { contentId: number; mine: Comment | null; onSaved: (c: Comment) => void }) {
  const { ready, user } = useAuth()
  const [body, setBody] = useState(mine?.body ?? '')
  const [rating, setRating] = useState(mine?.rating ?? 0)
  const [spoiler, setSpoiler] = useState(mine?.spoiler ?? false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => { setBody(mine?.body ?? ''); setRating(mine?.rating ?? 0); setSpoiler(mine?.spoiler ?? false) }, [mine?.id, mine?.updatedAt])

  if (!ready) return null
  if (!user) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-dashed border-line2 px-4 py-4">
        <p className="text-[13px] text-muted">이 작품에 별점과 한마디를 남기려면 로그인이 필요합니다.</p>
        <button type="button" onClick={login} className="btn btn--primary btn--sm">로그인하고 남기기</button>
      </div>
    )
  }
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rating) { setErr('별점을 골라 주세요.'); return }
    if (!body.trim()) { setErr('내용을 적어 주세요.'); return }
    setBusy(true); setErr(null)
    try {
      onSaved(await api.writeComment(contentId, { body: body.trim(), rating, spoiler }))
    } catch (x) {
      const ae = x instanceof ApiError ? x : null
      setErr(ae?.code === 'COMMENT_BLOCKED' ? '클린봇이 걸러낸 표현이 있어 등록되지 않았습니다.'
        : ae?.code === 'USER_SUSPENDED' ? '정지된 계정은 댓글을 남길 수 없습니다.'
        : ae?.status === 401 ? '로그인이 만료됐습니다. 다시 로그인해 주세요.'
        : '등록하지 못했습니다. 잠시 뒤 다시 시도해 주세요.')
    } finally { setBusy(false) }
  }
  return (
    <form onSubmit={submit} className="rounded-md border border-line bg-raise p-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Stars value={rating} onChange={setRating} size={20} />
        <span className="text-[12.5px] text-muted">{mine ? '내 평가를 고칩니다' : `${user.name} 님의 평가`}</span>
      </div>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} rows={3} placeholder="이 작품, 어땠나요?"
        className="mt-3 w-full resize-y rounded-sm border border-line bg-warm px-3 py-2 text-[14px] leading-relaxed text-ink outline-none placeholder:text-faint focus:border-line2" />
      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="inline-flex items-center gap-1.5 text-[12.5px] text-ink2">
          <input type="checkbox" checked={spoiler} onChange={(e) => setSpoiler(e.target.checked)} className="accent-[var(--color-accent)]" />
          스포일러가 있어요
        </label>
        {err && <span className="text-[12.5px] text-accentd">{err}</span>}
        <span className="ml-auto num font-mono text-[11px] text-faint">{body.length}/1000</span>
        <button type="submit" disabled={busy} className="btn btn--primary btn--sm disabled:opacity-60">{mine ? '고치기' : '남기기'}</button>
      </div>
    </form>
  )
}

function Item({ c, onLike, onDelete }: { c: Comment; onLike: (c: Comment, on: boolean) => void; onDelete: (c: Comment) => void }) {
  const { user } = useAuth()
  const [open, setOpen] = useState(!c.spoiler)
  useEffect(() => { setOpen(!c.spoiler) }, [c.id, c.spoiler])
  return (
    <li className="grid grid-cols-[32px_1fr] gap-x-3 py-4">
      {c.profileImageUrl ? <img src={c.profileImageUrl} alt="" className="size-8 rounded-full object-cover" /> : <Avatar ch={c.displayName.slice(0, 1)} />}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className="text-[13.5px] font-bold text-ink">{c.displayName}</span>
          <Stars value={c.rating} size={12} />
          <span className="num font-mono text-[11px] text-faint">{new Date(c.createdAt).toLocaleDateString('ko-KR')}</span>
          {c.mine && <span className="rounded-sm bg-sink px-1.5 py-[2px] text-[10.5px] font-bold text-ink2">내 평가</span>}
        </div>
        {open ? (
          <p className="mt-1.5 whitespace-pre-wrap text-[14px] leading-relaxed text-ink">{decodeEntities(c.body)}</p>
        ) : (
          <button type="button" onClick={() => setOpen(true)} className="mt-1.5 inline-flex items-center gap-1.5 rounded-sm bg-sink px-3 py-2 text-[12.5px] font-bold text-ink2 hover:bg-line">
            <EyeSlashIcon size={14} />스포일러가 있는 평가 — 눌러서 보기
          </button>
        )}
        <div className="mt-2 flex items-center gap-4">
          <button type="button" onClick={() => (user ? onLike(c, !c.likedByMe) : login())} aria-pressed={c.likedByMe}
            className={`inline-flex items-center gap-1 text-[12px] ${c.likedByMe ? 'font-bold text-accent' : 'text-muted hover:text-ink'}`}>
            <HeartIcon size={13} weight={c.likedByMe ? 'fill' : 'regular'} /><span className="num font-mono">{c.likeCount}</span>
          </button>
          {c.mine && (
            <button type="button" onClick={() => onDelete(c)} className="inline-flex items-center gap-1 text-[12px] text-muted hover:text-accentd">
              <TrashIcon size={13} />지우기
            </button>
          )}
        </div>
      </div>
    </li>
  )
}

export function Comments({ contentId, onRating }: { contentId: number; onRating?: (r: Rating) => void }) {
  const { ready, user } = useAuth()
  const [sort, setSort] = useState<CommentSort>('recent')
  const [items, setItems] = useState<Comment[]>([])
  const [rating, setRating] = useState<Rating>({ average: null, count: 0 })
  const [more, setMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [mine, setMine] = useState<Comment | null>(null)

  const load = useCallback(async (offset: number, replace: boolean) => {
    setLoading(true)
    try {
      const p = await api.comments(contentId, sort, offset, PAGE)
      setItems((prev) => (replace ? p.items : [...prev, ...p.items]))
      setMore(p.hasMore); setRating(p.rating); onRating?.(p.rating)
    } catch { if (replace) setItems([]) }
    finally { setLoading(false) }
  }, [contentId, sort, onRating])

  useEffect(() => { if (ready) load(0, true) }, [ready, load, user?.sub])
  useEffect(() => { if (ready && user) api.myComment(contentId).then(setMine, () => setMine(null)); else setMine(null) }, [ready, user?.sub, contentId])

  const onSaved = (c: Comment) => { setMine(c); load(0, true) }
  const onLike = async (c: Comment, on: boolean) => {
    setItems((prev) => prev.map((x) => (x.id === c.id ? { ...x, likedByMe: on, likeCount: x.likeCount + (on ? 1 : -1) } : x)))
    try { const r = await api.likeComment(c.id, on); setItems((prev) => prev.map((x) => (x.id === c.id ? { ...x, likeCount: r.likeCount, likedByMe: r.liked } : x))) }
    catch { setItems((prev) => prev.map((x) => (x.id === c.id ? c : x))) }
  }
  const onDelete = async (c: Comment) => {
    if (!confirm('내 평가를 지울까요?')) return
    try { await api.deleteComment(c.id); setMine(null); load(0, true) } catch { /* 목록 재요청으로 상태가 맞춰진다 */ }
  }

  return (
    <section id="comments" className={`scroll-mt-28 border-t border-line wrap py-9`}>
      <SectionHead title="평가" note={rating.count ? undefined : '이 작품을 본 사람들의 별점과 한마디'}
        action={
          <div className="flex gap-1 rounded-sm bg-sink p-0.5 text-[12px] font-bold" role="group" aria-label="정렬">
            {(['recent', 'top'] as const).map((k) => (
              <button key={k} type="button" onClick={() => setSort(k)} aria-pressed={sort === k}
                className={`rounded-[6px] px-2.5 py-1 transition-colors ${sort === k ? 'bg-raise text-ink shadow-[0_1px_2px_rgba(16,16,24,0.12)]' : 'text-muted hover:text-ink'}`}>
                {k === 'recent' ? '최신순' : '공감순'}
              </button>
            ))}
          </div>
        } />
      <div className="grid gap-6 lg:grid-cols-[220px_1fr] lg:gap-10">
        <div>
          <RatingSummary rating={rating} />
        </div>
        <div className="min-w-0">
          <Write contentId={contentId} mine={mine} onSaved={onSaved} />
          {items.length === 0 ? (
            !loading && <EmptyNote>아직 평가가 없습니다. 첫 평가를 남겨 보세요.</EmptyNote>
          ) : (
            <ul className="mt-2 divide-y divide-line">
              {items.map((c) => <Item key={c.id} c={c} onLike={onLike} onDelete={onDelete} />)}
            </ul>
          )}
          {more && (
            <button type="button" onClick={() => load(items.length, false)} disabled={loading} className="btn btn--ghost btn--sm mt-3 w-full justify-center">
              더 보기
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
