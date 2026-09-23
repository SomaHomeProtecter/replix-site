import { useCallback, useEffect, useRef, useState } from 'react'
import { PROVIDERS, closeLogin, loginWith, useLoginChooser, type Provider } from '../auth'
import { GOOGLE_G, KAKAO_MARK, NAVER_MARK } from '../provider-marks'

/* ═══ 로그인 제공자 선택(HP-447) ═════════════════════════════
   확장의 로그인 모달(HP-71 B′)과 같은 형태 — 가운데 카드에 Google·카카오·네이버 세 버튼을 같은 규격으로 둔다
   (구글 동등 노출 요건: 높이 40px·글꼴 14px/500·모서리 8px). 컨테이너 색과 심벌은 각 사 가이드 값이다.
   모달 틀(바깥 클릭·Esc 로 닫기, 포커스 가둠, 뒤 스크롤 잠금)은 FeedbackModal 과 같은 방식이다.
   확장에 있는 '처음이면 약관 동의로 이어져요' 안내는 옮기지 않는다 — 웹에는 그 단계가 없다. */

/* 컨테이너 색 = 각 사 가이드 값. 네이버는 공식 로그인 버튼 값 #03A94D 다 — 흔히 쓰이는 #03C75A 는 네이버 클라우드 SSO
   색이라 로그인 버튼에 쓰면 가이드 위반이다(확장 styles.css 와 같은 근거). 구글은 흰 바탕이라 밝기 필터로는 hover 가
   보이지 않아 배경을 직접 바꾼다. */
const TONE: Record<Provider, string> = {
  google: 'border border-[#747775] bg-white text-[#1f1f1f] hover:bg-[#f2f3f4]',
  kakao: 'bg-[#fee500] text-black/85 hover:brightness-[1.08]',
  naver: 'bg-[#03A94D] text-white hover:brightness-[1.08]',
}

function ProviderSymbol({ id }: { id: Provider }) {
  /* 공식 G PNG 는 흰 바탕이 불투명해서 hover 배경 위에 흰 사각이 드러난다 — multiply 로 바탕만 지운다
     (PNG 를 알파로 다시 만드는 건 공식 애셋 픽셀을 손대는 일이라 하지 않는다). */
  if (id === 'google') return <img src={GOOGLE_G} width={20} height={20} alt="" className="size-5 flex-none mix-blend-multiply" />
  const m = id === 'kakao' ? KAKAO_MARK : NAVER_MARK
  return (
    <svg width={m.width} height={m.height} viewBox={m.viewBox} aria-hidden="true" className="flex-none">
      <path fill={m.fill} d={m.d} />
    </svg>
  )
}

export function LoginModal() {
  const open = useLoginChooser()
  /* 고른 뒤 IdP 로 떠나기까지 잠깐 비는 동안 눌렸다는 표시가 없으면 다시 누르게 된다 — 버튼을 잠그고 진행 커서를 보인다. */
  const [pending, setPending] = useState<Provider | null>(null)
  const card = useRef<HTMLDivElement>(null)
  const first = useRef<HTMLButtonElement>(null)

  const close = useCallback(() => { setPending(null); closeLogin() }, [])

  useEffect(() => { if (open) first.current?.focus() }, [open])

  /* 열려 있는 동안 뒤 페이지는 스크롤되지 않는다(FeedbackModal 과 같은 이유). */
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  /* Esc 와 포커스 가둠. document 에서 보는 이유는 FeedbackModal 과 같다 — 카드의 글자를 누르면 포커스가 카드로
     옮겨 가 카드 밖 요소로 Tab 이 빠져나갈 수 있다. */
  useEffect(() => {
    if (!open) return
    const on = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { close(); return }
      if (e.key !== 'Tab' || !card.current) return
      const f = Array.from(card.current.querySelectorAll<HTMLButtonElement>('button:not([disabled])'))
      if (!f.length) return
      const at = document.activeElement
      if (!card.current.contains(at) || at === card.current) { e.preventDefault(); (e.shiftKey ? f[f.length - 1] : f[0]).focus(); return }
      const edge = e.shiftKey ? f[0] : f[f.length - 1]
      if (at !== edge) return
      e.preventDefault()
      ;(e.shiftKey ? f[f.length - 1] : f[0]).focus()
    }
    document.addEventListener('keydown', on)
    return () => document.removeEventListener('keydown', on)
  }, [open, close])

  /* IdP 화면에서 뒤로 가기로 bfcache 에서 돌아오면 모듈 상태가 그대로라 버튼이 잠긴 채 남는다 — 진행 표시를 푼다. */
  useEffect(() => {
    const on = (e: PageTransitionEvent) => { if (e.persisted) setPending(null) }
    window.addEventListener('pageshow', on)
    return () => window.removeEventListener('pageshow', on)
  }, [])

  if (!open) return null

  const choose = (id: Provider) => {
    setPending(id)
    loginWith(id).catch(() => setPending(null))
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex justify-center overflow-y-auto bg-black/40 py-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) close() }}
    >
      <div
        ref={card}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-title"
        aria-describedby="login-sub"
        aria-busy={pending !== null}
        className={`my-auto h-fit w-[calc(100%-32px)] max-w-[340px] rounded-lg bg-raise px-6 pb-4 pt-6 text-center shadow-[0_24px_64px_rgba(16,16,24,0.22)] outline-none ${pending ? 'cursor-progress' : ''}`}
      >
        <h2 id="login-title" className="text-[18px] font-bold text-ink">Replix 시작하기</h2>
        <p id="login-sub" className="mt-1 text-[13px] text-muted">로그인하고 별점과 한마디를 남기세요</p>
        <div className="mt-4 grid gap-2">
          {PROVIDERS.map((p, i) => (
            <button
              key={p.id}
              ref={i === 0 ? first : undefined}
              type="button"
              disabled={pending !== null}
              onClick={() => choose(p.id)}
              className={`flex h-10 w-full items-center justify-center gap-[9px] rounded-[8px] text-[14px] font-medium transition-[filter,background-color] duration-150 disabled:cursor-progress ${TONE[p.id]}`}
            >
              <ProviderSymbol id={p.id} />
              {p.label}로 계속하기
            </button>
          ))}
        </div>
        <button type="button" onClick={close} className="mt-3 px-2 py-1 text-[13px] text-muted hover:text-ink">닫기</button>
      </div>
    </div>
  )
}
