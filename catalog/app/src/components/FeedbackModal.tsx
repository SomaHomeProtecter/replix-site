import { useCallback, useEffect, useRef, useState } from 'react'
import { StarIcon } from '@phosphor-icons/react'
import { api, ApiError, type FeedbackCategory } from '../api'
import { useAuth } from '../auth'
import { engaged } from '../analytics'
import { STAR_LABELS, STORE_URL, buildPayload, canSend, errorMessage, feedbackNote } from '../feedback-pure.js'

/* ═══ 피드백 보내기(HP-426, 웹) ═══════════════════════════════
   푸터 링크에서만 열린다 — 헤더에 아이콘을 새로 두지 않는다(HP-425 결정 3).
   보낼 값의 모양·활성 조건·문구는 feedback-pure.js 가 정하고 node 로 검사한다(scripts/test-feedback.mjs).
   이 화면은 특정 회차 위에 뜨지 않으므로 contentId·episodeId 는 항상 null 이다(buildPayload).
   계측은 catalog_engaged{feature: feedback} 하나로 묶고, 본문은 어떤 속성에도 싣지 않는다(트래킹 플랜 §2). */

const CHIPS: Array<{ key: FeedbackCategory; label: string }> = [
  { key: 'ANNOY', label: '불편해요' },
  { key: 'BUG', label: '버그예요' },
  { key: 'IDEA', label: '이런 게 있으면' },
  { key: 'PRAISE', label: '잘 쓰고 있어요' },
]

/** 별점 띠. Comments.tsx 의 Stars 와 달리 칸·테두리 없이 이어 붙고 옆에 라벨이 따라온다 — 그래서 저기를 고치지 않고
 *  여기 따로 둔다. 라디오 묶음이라 좌우 화살표로 옮겨 다니고, 가리키거나 포커스한 별의 라벨을 미리 보여 준다. */
function StarBand({ value, onChange, firstRef }: { value: number; onChange: (v: number) => void; firstRef: React.RefObject<HTMLButtonElement | null> }) {
  const [hover, setHover] = useState(0)
  const group = useRef<HTMLDivElement>(null)
  const shown = hover || value
  const move = (e: React.KeyboardEvent, n: number) => {
    const to = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? n + 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? n - 1 : 0
    if (!to || to < 1 || to > 5) return
    e.preventDefault()
    ;(group.current?.children[to - 1] as HTMLButtonElement | undefined)?.focus()
  }
  return (
    <div className="flex items-center gap-2.5">
      <div
        ref={group}
        role="radiogroup"
        aria-label="별점"
        className="inline-flex"
        onMouseLeave={() => setHover(0)}
        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHover(0) }}
      >
        {[1, 2, 3, 4, 5].map((n) => {
          const on = n <= shown
          return (
            <button
              key={n}
              ref={n === 1 ? firstRef : undefined}
              type="button"
              role="radio"
              aria-checked={n === value}
              aria-label={`${n}점`}
              tabIndex={n === (value || 1) ? 0 : -1}
              onClick={() => onChange(n)}
              onMouseEnter={() => setHover(n)}
              onFocus={() => setHover(n)}
              onKeyDown={(e) => move(e, n)}
              className={`inline-flex size-9 cursor-pointer items-center justify-center leading-none transition-colors ${on ? 'text-accent' : 'text-line2'}`}
            >
              <StarIcon size={28} weight={on ? 'fill' : 'regular'} />
            </button>
          )
        })}
      </div>
      <span className={`text-[13px] ${shown ? 'font-bold text-ink' : 'text-muted'}`}>{shown ? STAR_LABELS[shown] : '별을 눌러 주세요'}</span>
    </div>
  )
}

export function FeedbackModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth()
  const [score, setScore] = useState(0)
  const [category, setCategory] = useState<FeedbackCategory | ''>('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const firstStar = useRef<HTMLButtonElement | null>(null)

  /* 열 때마다 처음부터. 비우는 것은 '열 때'가 아니라 '닫을 때'다 — 열 때 비우면 그 첫 렌더에는 지난번 화면(감사 뷰)이
     아직 남아 있어 별이 없고, 첫 별에 포커스를 줄 수 없다. 닫힌 동안은 아무것도 그리지 않으므로 비워도 보이지 않는다. */
  useEffect(() => {
    if (open) {
      engaged('feedback', 'opened')
      firstStar.current?.focus()
      return
    }
    setScore(0); setCategory(''); setBody(''); setBusy(false); setErr(null); setDone(false)
  }, [open])

  useEffect(() => {
    if (!open) return
    const on = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', on)
    return () => document.removeEventListener('keydown', on)
  }, [open, onClose])

  const submit = useCallback(async () => {
    setBusy(true); setErr(null)
    try {
      await api.sendFeedback(buildPayload({ score, category, body }))
      /* 무엇을 적었는지는 싣지 않는다 — 점수와 유형(둘 다 열거값)만. */
      engaged('feedback', 'submitted', { score, category: category || 'none' })
      setDone(true)
    } catch (x) {
      setErr(errorMessage(x instanceof ApiError ? x.status : 0))
    } finally {
      setBusy(false)
    }
  }, [score, category, body])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex justify-center overflow-y-auto bg-black/40 py-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* 세로 가운데는 items-center 가 아니라 카드의 my-auto 로 잡는다 — 스크롤 컨테이너에서 items-center 는
          카드가 화면보다 높을 때 위쪽이 잘려 스크롤로도 닿지 못한다(낮은 창·가로 모드). */}
      <div role="dialog" aria-modal="true" aria-labelledby="feedback-title" className="my-auto h-fit w-[calc(100%-32px)] max-w-[440px] rounded-lg bg-raise p-6 shadow-[0_24px_64px_rgba(16,16,24,0.22)]">
        {done ? (
          <div className="grid gap-3">
            <p className="text-[17px] font-bold text-ink">의견 감사합니다. 리플릭스를 더 낫게 고쳐 볼게요.</p>
            {/* 점수와 무관하게 누구에게나 같은 링크를 보인다 — 좋게 준 사람만 스토어로 보내지 않는다. */}
            <a
              href={STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => engaged('feedback', 'store_review_clicked')}
              className="text-[14px] font-bold text-accentd hover:underline"
            >
              스토어에도 평가를 남겨 주세요 ↗
            </a>
            <div className="mt-1 flex justify-end">
              <button type="button" onClick={onClose} className="btn btn--ghost btn--sm">닫기</button>
            </div>
          </div>
        ) : (
          <div className="grid gap-3.5">
            <h2 id="feedback-title" className="text-[20px] font-bold text-ink">피드백 보내기</h2>

            <p className="text-[13px] text-muted">전체적으로 어땠어요?</p>
            <StarBand value={score} onChange={setScore} firstRef={firstStar} />

            <p className="text-[13px] text-muted">어떤 이야기예요? (선택)</p>
            <div className="flex flex-wrap gap-1.5">
              {CHIPS.map((c) => {
                const on = category === c.key
                return (
                  <button
                    key={c.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setCategory(on ? '' : c.key)}
                    className={`rounded-btn px-3 py-1.5 text-[12.5px] transition-colors ${on ? 'bg-ink text-warm' : 'bg-soft text-ink2 hover:bg-sink'}`}
                  >
                    {c.label}
                  </button>
                )
              })}
            </div>

            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={1000}
              rows={4}
              placeholder="좋았던 점이나 아쉬운 점을 적어 주세요."
              className="w-full resize-y rounded-sm border border-line bg-warm px-3 py-2 text-[14px] leading-relaxed text-ink outline-none placeholder:text-faint focus:border-line2"
            />

            <p className="text-[12px] leading-relaxed text-muted">{feedbackNote(!!user)}</p>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              {err && <span className="text-[12.5px] text-accentd">{err}</span>}
              <span className="ml-auto num font-mono text-[11px] text-faint">{body.length}/1000</span>
              <button type="button" onClick={onClose} className="btn btn--ghost btn--sm">취소</button>
              <button
                type="button"
                onClick={submit}
                disabled={!canSend({ score, body }) || busy}
                className="btn btn--primary btn--sm disabled:opacity-60"
              >
                보내기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
