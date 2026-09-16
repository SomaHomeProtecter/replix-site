import { useCallback, useEffect, useRef, useState } from 'react'
import { StarIcon } from '@phosphor-icons/react'
import { api, ApiError, type FeedbackCategory } from '../api'
import { useAuth } from '../auth'
import { engaged } from '../analytics'
import {
  CHIPS, PLACEHOLDER, Q_CATEGORY, Q_SCORE, STAR_LABELS, STORE_TEXT, STORE_URL, THANKS,
  buildPayload, canSend, errorMessage, feedbackNote,
} from '../feedback-pure.js'

/* ═══ 피드백 보내기(HP-426, 웹) ═══════════════════════════════
   푸터 링크에서만 열린다 — 헤더에 아이콘을 새로 두지 않는다(HP-425 결정 3).
   보낼 값의 모양·활성 조건·문구는 feedback-pure.js 가 정하고 node 로 검사한다(scripts/test-feedback.mjs).
   이 화면은 특정 회차 위에 뜨지 않으므로 contentId·episodeId 는 항상 null 이다(buildPayload).
   계측은 catalog_engaged{feature: feedback} 하나로 묶고, 본문은 어떤 속성에도 싣지 않는다(트래킹 플랜 §2). */

/* 카드 안에서 Tab 이 실제로 닿는 요소들. 로빙 탭으로 tabIndex -1 이 된 별과 비활성 버튼은 빠진다. */
function focusablesIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), textarea, input, select'))
    .filter((el) => el.tabIndex >= 0)
}

/** 별점 띠. Comments.tsx 의 Stars 와 달리 칸·테두리 없이 이어 붙고 옆에 라벨이 따라온다 — 그래서 저기를 고치지 않고
 *  여기 따로 둔다. 라디오 묶음(APG radiogroup)이라 화살표·Home·End 가 포커스를 옮기면서 **그 자리를 고른다**.
 *  미리보기는 마우스로 가리킬 때만이다 — 포커스로도 켜면 열자마자 첫 별에 포커스가 가므로 고르지 않았는데 1점처럼 보인다. */
function StarBand({ value, onChange, firstRef, labelledBy }: { value: number; onChange: (v: number) => void; firstRef: React.RefObject<HTMLButtonElement | null>; labelledBy: string }) {
  const [hover, setHover] = useState(0)
  const group = useRef<HTMLDivElement>(null)
  const shown = hover || value
  const key = (e: React.KeyboardEvent, n: number) => {
    const to = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? n + 1
      : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? n - 1
      : e.key === 'Home' ? 1
      : e.key === 'End' ? 5
      : 0
    /* 양 끝에서는 멈춘다(APG 의 순환 대신). 별점은 순환하면 최고예요에서 화살표 한 번에 별로예요가 되어
       누른 사람이 모르는 사이 정반대 점수가 들어간다 — 되돌릴 수 없는 전송이 붙어 있어 순환을 뺀다. */
    if (!to || to < 1 || to > 5) return
    e.preventDefault()
    onChange(to)
    ;(group.current?.children[to - 1] as HTMLButtonElement | undefined)?.focus()
  }
  return (
    <div className="flex items-center gap-2.5">
      <div
        ref={group}
        role="radiogroup"
        aria-labelledby={labelledBy}
        className="inline-flex"
        onMouseLeave={() => setHover(0)}
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
              onKeyDown={(e) => key(e, n)}
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
  const { ready, user } = useAuth()
  const [score, setScore] = useState(0)
  const [category, setCategory] = useState<FeedbackCategory | ''>('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const firstStar = useRef<HTMLButtonElement | null>(null)
  const doneBtn = useRef<HTMLButtonElement>(null)
  const card = useRef<HTMLDivElement>(null)
  /* 전송 중에도 닫을 수 있다(기다리게 하지 않는다). 그래서 응답이 늦게 오면 이미 닫힌 화면의 상태를 건드릴 수 있어,
     다음에 열었을 때 감사 뷰나 지난 오류가 남는다 — 응답 처리 직전에 이 ref 로 "아직 열려 있나"를 확인한다. */
  const openRef = useRef(open)
  useEffect(() => { openRef.current = open }, [open])

  /* 닫기는 한 곳으로 모은다: 상태를 비우고(다음에 열면 처음부터) 부모에게 알린다. 비우기를 effect 가 아니라
     이 핸들러에서 하는 이유 — 열 때 비우면 그 첫 렌더에 지난 화면(감사 뷰)이 남아 첫 별에 포커스를 줄 수 없다. */
  const close = useCallback(() => {
    setScore(0); setCategory(''); setBody(''); setBusy(false); setErr(null); setDone(false)
    onClose()
  }, [onClose])

  useEffect(() => {
    if (!open) return
    engaged('feedback', 'opened')
    firstStar.current?.focus()
  }, [open])

  /* 열려 있는 동안 뒤 페이지는 스크롤되지 않는다 — 모달 안을 스크롤하려다 뒤가 밀리면 어디를 보고 있었는지 잃는다. */
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  /* Esc 와 포커스 가둠을 한 리스너에서 본다. 가둠을 카드의 onKeyDown 이 아니라 document 에서 하는 이유:
     카드의 글자(제목·안내문)를 클릭하면 포커스가 body 로 떨어져 카드가 keydown 을 못 받고, 그 상태의 Tab 은
     모달 뒤 푸터 링크로 빠져나간다. document 에서 보면 그 경우도 잡아 카드 안 첫 요소로 되돌린다. */
  useEffect(() => {
    if (!open) return
    const on = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { close(); return }
      if (e.key !== 'Tab' || !card.current) return
      const f = focusablesIn(card.current)
      if (!f.length) return
      if (!card.current.contains(document.activeElement)) { e.preventDefault(); f[0].focus(); return }
      /* 카드 자신이 포커스일 때(글자를 클릭한 직후): Tab 은 그대로 두면 카드 안 첫 요소로 들어가지만,
         Shift+Tab 은 카드보다 앞(모달 밖)으로 나간다 — 그것만 막아 마지막 요소로 돌린다. */
      if (document.activeElement === card.current) {
        if (!e.shiftKey) return
        e.preventDefault(); f[f.length - 1].focus(); return
      }
      const edge = e.shiftKey ? f[0] : f[f.length - 1]
      if (document.activeElement !== edge) return
      e.preventDefault()
      ;(e.shiftKey ? f[f.length - 1] : f[0]).focus()
    }
    document.addEventListener('keydown', on)
    return () => document.removeEventListener('keydown', on)
  }, [open, close])

  /* 보낸 뒤에는 화면이 통째로 바뀌어 포커스가 body 로 떨어진다 — 남아 있는 유일한 버튼('닫기')으로 옮긴다. */
  useEffect(() => { if (done) doneBtn.current?.focus() }, [done])

  const submit = useCallback(async () => {
    setBusy(true); setErr(null)
    try {
      await api.sendFeedback(buildPayload({ score, category, body }))
      /* 계측은 닫혔어도 보낸다 — 서버가 실제로 접수했으므로 세지 않으면 건수가 어긋난다.
         무엇을 적었는지는 싣지 않는다 — 점수와 유형(둘 다 열거값)만. */
      engaged('feedback', 'submitted', { score, category: category || 'none' })
      if (!openRef.current) return
      setDone(true)
    } catch (x) {
      if (!openRef.current) return
      setErr(errorMessage(x instanceof ApiError ? x.status : 0))
    } finally {
      if (openRef.current) setBusy(false)
    }
  }, [score, category, body])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex justify-center overflow-y-auto bg-black/40 py-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) close() }}
    >
      {/* 세로 가운데는 items-center 가 아니라 카드의 my-auto 로 잡는다 — 스크롤 컨테이너에서 items-center 는
          카드가 화면보다 높을 때 위쪽이 잘려 스크롤로도 닿지 못한다(낮은 창·가로 모드). */}
      {/* tabIndex -1: 카드의 글자를 클릭했을 때 포커스가 body 까지 나가지 않고 카드에 머문다(가둠의 출발점). */}
      <div ref={card} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="feedback-title" className="my-auto h-fit w-[calc(100%-32px)] max-w-[440px] rounded-lg bg-raise p-6 shadow-[0_24px_64px_rgba(16,16,24,0.22)] outline-none">
        {done ? (
          <div className="grid gap-3">
            {/* 감사 뷰에도 같은 id 를 준다 — 둘 중 하나만 그려지므로 중복되지 않고, 이것 없이는
                aria-labelledby 가 사라진 제목을 가리켜 대화상자가 이름 없이 읽힌다. */}
            <p id="feedback-title" className="text-[17px] font-bold text-ink">{THANKS}</p>
            {/* 점수와 무관하게 누구에게나 같은 링크를 보인다 — 좋게 준 사람만 스토어로 보내지 않는다. */}
            <a
              href={STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => engaged('feedback', 'store_review_clicked')}
              className="text-[14px] font-bold text-accentd hover:underline"
            >
              {STORE_TEXT}
            </a>
            <div className="mt-1 flex justify-end">
              <button ref={doneBtn} type="button" onClick={close} className="btn btn--ghost btn--sm">닫기</button>
            </div>
          </div>
        ) : (
          <div className="grid gap-3.5">
            <h2 id="feedback-title" className="text-[20px] font-bold text-ink">피드백 보내기</h2>

            <p id="feedback-q-score" className="text-[13px] text-muted">{Q_SCORE}</p>
            <StarBand value={score} onChange={setScore} firstRef={firstStar} labelledBy="feedback-q-score" />

            <p id="feedback-q-category" className="text-[13px] text-muted">{Q_CATEGORY}</p>
            <div role="group" aria-labelledby="feedback-q-category" className="flex flex-wrap gap-1.5">
              {CHIPS.map((c) => {
                const on = category === c.value
                return (
                  <button
                    key={c.value}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setCategory(on ? '' : c.value)}
                    className={`cursor-pointer rounded-btn px-3 py-1.5 text-[12.5px] transition-colors ${on ? 'bg-ink text-warm' : 'bg-soft text-ink2 hover:bg-sink'}`}
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
              placeholder={PLACEHOLDER}
              aria-label={PLACEHOLDER}
              aria-describedby="feedback-count"
              className="w-full resize-y rounded-sm border border-line bg-warm px-3 py-2 text-[14px] leading-relaxed text-ink outline-none placeholder:text-faint focus:border-line2"
            />

            <p className="text-[12px] leading-relaxed text-muted">{feedbackNote(!!user)}</p>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              {err && <span role="alert" className="text-[12.5px] text-accentd">{err}</span>}
              <span id="feedback-count" className="ml-auto num font-mono text-[11px] text-faint">{body.length}/1000</span>
              <button type="button" onClick={close} className="btn btn--ghost btn--sm">취소</button>
              {/* !ready 면 잠근다 — Keycloak 의 조용한 세션 확인이 끝나기 전에는 이 글이 계정에 붙을지 아닐지가
                  아직 정해지지 않았다(postPublic 은 보낼 때 토큰을 붙인다). 안내문과 실제 전송이 어긋나지 않게 기다린다. */}
              <button
                type="button"
                onClick={submit}
                disabled={!canSend({ score, body }) || busy || !ready}
                aria-busy={busy}
                className="btn btn--primary btn--sm disabled:opacity-60"
              >
                {busy ? '보내는 중…' : '보내기'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
