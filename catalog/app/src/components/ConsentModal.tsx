import { useEffect, useRef, useState, type Ref } from 'react'
import { acceptConsent, declineConsent, useConsentRequired } from '../auth'
import { acceptErrorMessage, canAccept } from '../consent-pure.js'

/* ═══ 약관·처리방침 동의(HP-449) ═════════════════════════════
   로그인만으로는 Replix 계정이 아니다 — 확장(features/consent.js)과 같은 두 필수 항목에 동의해야 계정이 생긴다.
   문구는 확장과 같게 두되 '채팅' 자리에 웹의 기능(별점·한마디)을 적는다. 바깥 클릭·Esc 로는 닫지 않는다 — 동의 여부는
   버튼으로 명시적으로 고르게 한다. '동의하지 않음'은 로그인 전으로 되돌리며 Keycloak 세션까지 끝내므로(auth.declineConsent)
   Esc 한 번의 실수로 로그아웃되지 않게 Esc 에는 걸지 않는다.
   모달 틀(포커스 가둠·뒤 스크롤 잠금)은 FeedbackModal·LoginModal 과 같은 방식이다. */

/** 전역에 하나. 로그인했고 아직 동의 전일 때만 카드를 마운트한다 — 닫을 때마다 체크·오류 표시가 처음으로 돌아간다. */
export function ConsentModal() {
  return useConsentRequired() ? <ConsentCard /> : null
}

function Check({ ref, checked, onChange, title, desc, href, doc }: {
  ref?: Ref<HTMLInputElement>
  checked: boolean
  onChange: (on: boolean) => void
  title: string
  desc: string
  href: string
  doc: string
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border border-line px-3.5 py-3">
      <label className="flex min-w-0 cursor-pointer items-start gap-2.5">
        <input ref={ref} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-[3px] size-4 flex-none cursor-pointer accent-[#e50914]" />
        <span className="grid gap-0.5">
          <b className="text-[14px] text-ink">{title}</b>
          <small className="text-[12px] leading-snug text-muted">{desc}</small>
        </span>
      </label>
      {/* 새 탭 — 전문을 읽고 돌아와도 체크한 상태가 그대로다. 두 링크가 같은 이름이면 스크린리더에서 구별되지 않아 문서명을 싣는다. */}
      <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`${doc} 전문 보기(새 탭)`} className="flex-none text-[12.5px] font-bold text-accentd hover:underline">전문 보기 ↗</a>
    </div>
  )
}

function ConsentCard() {
  const [terms, setTerms] = useState(false)
  const [privacy, setPrivacy] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const card = useRef<HTMLDivElement>(null)
  const first = useRef<HTMLInputElement>(null)
  const acceptBtn = useRef<HTMLButtonElement>(null)
  /* 저장 중에는 거부를 받지 않는다 — PUT 이 서버에 닿아 계정이 생긴 뒤 토큰을 버리면 둘이 어긋난다. */
  const busyRef = useRef(false)

  /* 열 때 첫 체크박스에 포커스를 두고 뒤 페이지 스크롤을 잠근다. 닫힐 때(동의 완료·거부) 스크롤을 푼다. */
  useEffect(() => {
    first.current?.focus()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  /* 오류가 뜨면 포커스를 되살린다 — 저장 중 잠긴 버튼이 포커스를 잃었다. 두 항목이 그대로면 다시 시도할 수 있게 동의
     버튼으로, 문서 갱신으로 체크가 풀렸으면 첫 체크박스로(렌더 뒤라 버튼이 이미 풀려 있다). */
  useEffect(() => {
    if (!err) return
    ;(canAccept({ terms, privacy }) ? acceptBtn : first).current?.focus()
    // 오류가 새로 뜰 때만 옮긴다 — 체크를 바꿀 때마다 포커스를 빼앗지 않게 terms·privacy 는 의존성에서 뺀다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [err])

  /* Esc 와 포커스 가둠. 문서 capture 단계에서 받고 전파를 멈춘다 — 아래에 다른 모달(피드백)이 열려 있으면 Esc 한 번에
     그쪽이 닫히거나 두 가둠이 포커스를 다툰다. Esc 는 삼키기만 한다(위 머리 주석). */
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); return }
      if (e.key !== 'Tab' || !card.current) return
      e.stopPropagation()
      const f = Array.from(card.current.querySelectorAll<HTMLElement>('input:not([disabled]), a[href], button:not([disabled])'))
      if (!f.length) return
      const at = document.activeElement
      if (!f.some((el) => el === at)) { e.preventDefault(); (e.shiftKey ? f[f.length - 1] : f[0]).focus(); return }
      const edge = e.shiftKey ? f[0] : f[f.length - 1]
      if (at !== edge) return
      e.preventDefault()
      ;(e.shiftKey ? f[f.length - 1] : f[0]).focus()
    }
    document.addEventListener('keydown', on, true)
    return () => document.removeEventListener('keydown', on, true)
  }, [])

  const accept = async () => {
    if (!canAccept({ terms, privacy }) || busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setErr(null)
    const r = await acceptConsent()
    busyRef.current = false
    // 성공하면 계정 상태가 회원으로 바뀌며 이 카드가 사라진다. 포커스는 헤더의 계정 메뉴가 받는다(auth.takeAccountFocus).
    if (r.ok) return
    setBusy(false)
    if (r.code === 'OUTDATED_LEGAL_DOCUMENTS') { setTerms(false); setPrivacy(false) } // 새 문서에 다시 체크받는다
    setErr(acceptErrorMessage(r.code))
  }

  return (
    <div className="fixed inset-0 z-[60] flex justify-center overflow-y-auto bg-black/40 py-4">
      <div
        ref={card}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-title"
        aria-describedby="consent-lead"
        aria-busy={busy}
        className="my-auto h-fit w-[calc(100%-32px)] max-w-[420px] rounded-lg bg-raise p-6 shadow-[0_24px_64px_rgba(16,16,24,0.22)] outline-none"
      >
        <p className="text-[12.5px] font-bold text-accentd">이 계정에서 처음 한 번만 확인해 주세요</p>
        <h2 id="consent-title" className="mt-1.5 text-[20px] font-bold text-ink">Replix 이용을 위한 필수 동의예요</h2>
        <p id="consent-lead" className="mt-2 text-[13.5px] text-muted">계정과 별점·한마디 기능을 제공하기 위해 아래 두 항목에 동의가 필요해요.</p>
        <div className="mt-4 grid gap-2.5">
          <Check ref={first} checked={terms} onChange={setTerms} href="/terms" doc="이용약관"
            title="[필수] 이용약관 동의" desc="서비스 이용 조건과 사용자 책임을 확인해 주세요." />
          <Check checked={privacy} onChange={setPrivacy} href="/privacy" doc="개인정보 처리방침"
            title="[필수] 개인정보 수집·이용 동의" desc="계정 식별정보(이메일 포함)·프로필을 탈퇴까지 처리하며, 거부 시 로그인·별점 작성이 제한돼요." />
        </div>
        {err && <p role="alert" className="mt-3 text-[12.5px] text-accentd">{err}</p>}
        <button ref={acceptBtn} type="button" disabled={!canAccept({ terms, privacy }) || busy} onClick={accept} className="btn btn--primary mt-5 w-full justify-center disabled:opacity-60">
          동의하고 Replix 시작
        </button>
        <p className="mt-2 text-center text-[12px] text-muted">동의는 현재 로그인한 Replix 계정에 기록돼요.</p>
        <div className="mt-1 text-center">
          <button type="button" disabled={busy} onClick={declineConsent} className="px-2 py-1 text-[13px] text-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-60">
            동의하지 않음
          </button>
        </div>
      </div>
    </div>
  )
}
