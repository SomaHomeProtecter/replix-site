import { useEffect, useRef, useState } from 'react'
import { PROVIDERS, closeLogin, loginWith, useLoginChooser, type Provider } from '../auth'
import { GOOGLE_G, KAKAO_MARK, NAVER_MARK } from '../provider-marks'

/* ═══ 로그인 제공자 선택(HP-447) ═════════════════════════════
   확장의 로그인 모달(HP-71 B′)과 같은 형태 — 가운데 카드에 Google·카카오·네이버 세 버튼을 같은 규격으로 둔다
   (구글 동등 노출 요건: 높이 40px·글꼴 14px/500·모서리 8px). 컨테이너 색과 심벌은 각 사 가이드 값이다.
   모달 틀(바깥 클릭·Esc 로 닫기, 포커스 가둠, 뒤 스크롤 잠금)은 FeedbackModal 과 같은 방식이다.
   확장에 있는 '처음이면 약관 동의로 이어져요' 안내는 옮기지 않는다 — 웹에는 그 단계가 없다(HP-449). */

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

/** 전역에 하나. 로그인 진입점(헤더·댓글 쓰기·좋아요)이 login() 으로 연다. 카드는 열려 있는 동안만 마운트되므로
 *  닫을 때마다 진행·실패 표시가 처음으로 돌아간다. */
export function LoginModal() {
  return useLoginChooser() ? <LoginCard /> : null
}

function LoginCard() {
  /* 고른 뒤 IdP 로 떠나기까지 잠깐 비는 동안 눌렸다는 표시가 없으면 다시 누르게 된다 — 버튼을 잠그고 진행 커서를 보인다. */
  const [pending, setPending] = useState<Provider | null>(null)
  const [failed, setFailed] = useState(false)
  const card = useRef<HTMLDivElement>(null)
  const first = useRef<HTMLButtonElement>(null)

  /* 열 때: 연 요소를 기억하고 첫 버튼에 포커스, 뒤 페이지 스크롤을 잠근다(FeedbackModal 과 같은 이유).
     닫힐 때(언마운트 — Esc·바깥·닫기·로그인 완료 어느 쪽이든): 스크롤을 풀고 포커스를 연 요소로 돌려준다. 모달이 전역
     하나라 여는 쪽이 각자 돌려받을 수 없다 — 키보드로 댓글 깊숙이에서 열었다 닫았는데 페이지 맨 위로 튀지 않게. */
  useEffect(() => {
    const opener = document.activeElement
    first.current?.focus()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus()
    }
  }, [])

  /* Esc 와 포커스 가둠. document 에서 보는 이유는 FeedbackModal 과 같다. 포커스가 카드의 '누를 수 있는 버튼' 밖이면
     (모달 밖·카드 자신·진행 중 잠긴 버튼) Tab 을 기본 동작에 맡기지 않고 카드 안으로 되돌린다 — 잠긴 버튼에서의
     Shift+Tab 은 모달 뒤(푸터)로 빠져나간다. */
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { closeLogin(); return }
      if (e.key !== 'Tab' || !card.current) return
      const f = Array.from(card.current.querySelectorAll<HTMLButtonElement>('button:not([disabled])'))
      if (!f.length) return
      const at = document.activeElement
      if (!f.some((b) => b === at)) { e.preventDefault(); (e.shiftKey ? f[f.length - 1] : f[0]).focus(); return }
      const edge = e.shiftKey ? f[0] : f[f.length - 1]
      if (at !== edge) return
      e.preventDefault()
      ;(e.shiftKey ? f[f.length - 1] : f[0]).focus()
    }
    document.addEventListener('keydown', on)
    return () => document.removeEventListener('keydown', on)
  }, [])

  /* IdP 화면에서 뒤로 가기로 bfcache 에서 돌아오면 이 카드가 그대로 살아 있어 버튼이 잠긴 채 남는다 — 진행 표시를 푼다. */
  useEffect(() => {
    const on = (e: PageTransitionEvent) => { if (e.persisted) { setPending(null); setFailed(false) } }
    window.addEventListener('pageshow', on)
    return () => window.removeEventListener('pageshow', on)
  }, [])

  const choose = (id: Provider) => {
    setFailed(false)
    setPending(id)
    loginWith(id).catch(() => { setPending(null); setFailed(true) })
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex justify-center overflow-y-auto bg-black/40 py-4"
      /* preventDefault: 닫힘 정리가 연 요소로 돌려준 포커스를 mousedown 의 기본 포커스 이동이 뒤이어 body 로 빼앗지 않게. */
      onMouseDown={(e) => { if (e.target === e.currentTarget) { e.preventDefault(); closeLogin() } }}
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
        {failed && <p role="alert" className="mt-3 text-[12.5px] text-accentd">로그인을 시작하지 못했습니다. 잠시 뒤 다시 시도해 주세요.</p>}
        <button type="button" onClick={closeLogin} className="mt-3 px-2 py-1 text-[13px] text-muted hover:text-ink">닫기</button>
      </div>
    </div>
  )
}
