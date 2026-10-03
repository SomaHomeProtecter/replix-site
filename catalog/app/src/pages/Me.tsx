/* 내 활동(HP-443, `#/me`) — 로그인한 사람이 남긴 작품 댓글(별점)과 공개 채팅(답글 포함)을 작품별로 모은다(HP-274 안 B).
   2차(HP-471 · HP-191) — 카드에 반응한 장면(칩 6 + 더 보기)·좋아요한 채팅(줄 3 + 더 보기)을 내 채팅 아래에 더하고 요약을 다섯 칸으로.
   '더 보기'는 한 작품 보기 응답 하나를 세 섹션이 함께 쓴다. 2차 필드는 activity-pure phase2Of 로만 읽는다(1차 서버에서도 그대로).
   데이터는 HP-441 두 API — 전 작품 `GET /users/me/activity`(카드마다 채팅 3개 + 개수) · '더 보기' = 그 작품 전량
   `GET /users/me/activity/contents/{id}`(≤300, 커서 없음). 정렬은 API 순서 하나(마지막 활동순, HP-274 결정 14 — 토글 없음).
   가림·상대 날짜·상태 판정은 activity-pure.js(노드 검사 scripts/test-activity.mjs). 내 글은 가리지 않고 남의 원문만 가린다.
   쓰기·고치기는 작품 페이지의 평가 칸(#/title/{id}/review)에만 있다 — 여기선 지우기만, 작품 페이지와 같은 확인(Comments.tsx).
   들어오는 길 = 헤더 닉네임 메뉴 「내 활동」(Chrome.tsx) · 확장의 「전체 활동 보기」(HP-442). */
import { useCallback, useState, type ReactElement } from 'react'
import { EyeSlashIcon, HeartIcon, TrashIcon } from '@phosphor-icons/react'
import { api, ApiError, decodeEntities, deleteMyComment, episodeLabel, fmtTime, watchUrl, type MyActivityChat, type MyActivityLiked, type MyActivityScene, type MyActivityWork } from '../api'
import { login, useAuth } from '../auth'
import { useAsync } from '../hooks'
import { engaged, trackWatch } from '../analytics'
import { reviewHref, titleHref } from '../route-pure.js'
import { Chip, PosterSlot } from '../components/primitives'
import { Stars } from '../components/Comments'
import {
  ASK_ACTION, CHATS_HEAD, EMPTY_ACTION, EMPTY_BODY, EMPTY_TITLE, EXPIRED, FAILED, GATE_LEDE, HIDDEN_PARENT, LEDE, LIKED_HEAD, LIKED_PREVIEW,
  NO_CHATS, PREVIEW, REPLY_FALLBACK, SCENES_HEAD, SCENES_PREVIEW, SPOILER_TAG, TRUNCATED_NOTE,
  activityPageState, askText, capNote, cardSections, chatsCount, deleteErrorText, emojisOf, isLeakScore, lastActivityLabel, likedSummary,
  likedView, moreErrorText, moreLabel, parentView, phase2Of, sceneEndSec, scenesSummary, snip, summaryCells,
  type CardSection,
} from '../activity-pure.js'

const WRAP = 'wrap min-h-[60vh] py-10'

/** 채팅 한 줄 — 회차·시각을 누르면 넷플릭스 그 장면이 새 탭(뜨거운 순간과 같은 watchUrl). 답글이면 본문 위에 원문 한 줄.
 *  watchUrl 이 null(넷플릭스가 아니거나 회차 id 없음)이면 링크가 아니라 글만 둔다. */
function ChatRow({ w, c }: { w: MyActivityWork; c: MyActivityChat }) {
  const url = watchUrl(w.platform, c.platformEpisodeId, c.playbackTime)
  const ref = parentView(c.parent)
  const body = (
    <>
      <span className="text-[12px] font-bold text-ink2">{episodeLabel(c, w.contentType) || '회차'}</span>
      <span className="num rounded-sm bg-accentw px-1.5 py-0.5 text-center font-mono text-[11px] text-accent">{fmtTime(c.playbackTime)}</span>
      <span className="min-w-0 text-[13.5px] text-ink">
        {c.parentId && (
          <span className="block truncate text-[12px] text-muted">
            {ref ? <>↳ <b className="text-ink2">{ref.who}</b> {ref.text === null ? HIDDEN_PARENT : snip(decodeEntities(ref.text))}</> : REPLY_FALLBACK}
          </span>
        )}
        {decodeEntities(c.message)}
        {isLeakScore(c.spoilerScore) && (
          <span className="ml-2 whitespace-nowrap rounded-sm bg-accentw px-1.5 text-[10.5px] font-bold text-accentd">{SPOILER_TAG}</span>
        )}
      </span>
    </>
  )
  const cls = 'grid grid-cols-[48px_54px_1fr] items-baseline gap-3 bg-raise px-3.5 py-2.5'
  return (
    <li>
      {url ? (
        <a href={url} target="_blank" rel="noopener" title="넷플릭스에서 이 장면 보기" onClick={() => trackWatch(url, 'my_activity')} className={`${cls} hover:bg-soft`}>
          {body}
        </a>
      ) : (
        <div className={cls}>{body}</div>
      )}
    </li>
  )
}

/** 반응한 장면 칩(HP-471 결정 2) — 회차 · 장면 시작 · 이모지별 횟수. 누르면 넷플릭스 그 장면(구간 시작)이 새 탭 — 채팅 줄과 같은
 *  watchUrl·trackWatch. url 이 null(넷플릭스가 아니거나 회차 id 없음)이면 링크 없이 글만. 툴팁에 30초 구간 "시작~끝". */
function SceneChip({ w, sc }: { w: MyActivityWork; sc: MyActivityScene }) {
  const url = watchUrl(w.platform, sc.platformEpisodeId, sc.slotStart)
  const span = `${fmtTime(sc.slotStart)}~${fmtTime(sceneEndSec(sc.slotStart))}`
  const body = (
    <>
      <span className="text-[12px] font-bold text-ink2">{episodeLabel(sc, w.contentType) || '회차'}</span>
      <span className="num font-mono text-[11.5px] text-accent">{fmtTime(sc.slotStart)}</span>
      <span className="inline-flex gap-1.5">
        {emojisOf(sc).map((e) => (
          <span key={e.emoji}>{e.emoji}<b className="num ml-px font-mono text-[11px] font-semibold text-muted">{e.count}</b></span>
        ))}
      </span>
    </>
  )
  const cls = 'inline-flex items-center gap-2 rounded-full border border-line bg-raise px-[11px] py-1.5 text-[12.5px] text-ink2'
  return (
    <li>
      {url ? (
        <a href={url} target="_blank" rel="noopener" title={`넷플릭스에서 이 장면 보기 (${span})`} onClick={() => trackWatch(url, 'my_activity')} className={`${cls} hover:border-line2 hover:bg-soft`}>
          {body}
        </a>
      ) : (
        <span className={cls} title={span}>{body}</span>
      )}
    </li>
  )
}

/** 좋아요한 채팅 한 줄(HP-471 결정 3) — 채팅 줄 모양 + 작성자. 남의 글이라 답글 원문과 같은 판정(likedView = parentView): 운영 가림·
 *  공개 아님·차단·스포일러 신호면 "가려진 메시지", 내 글에 누른 좋아요는 그대로. 작성자는 가려도 남긴다(누구 글인지는 읽혀야 한다 —
 *  답글 원문과 같다). 탈퇴한 작성자 이름은 서버 값("탈퇴한 사용자"). */
function LikedRow({ w, l }: { w: MyActivityWork; l: MyActivityLiked }) {
  const url = watchUrl(w.platform, l.platformEpisodeId, l.playbackTime)
  const v = likedView(l)
  const body = (
    <>
      <span className="text-[12px] font-bold text-ink2">{episodeLabel(l, w.contentType) || '회차'}</span>
      <span className="num rounded-sm bg-accentw px-1.5 py-0.5 text-center font-mono text-[11px] text-accent">{fmtTime(l.playbackTime)}</span>
      <span className="min-w-0 text-[13.5px] text-ink">
        <span className="mr-2 whitespace-nowrap text-[12.5px] font-bold text-ink2">{v.who}</span>
        {v.text === null ? <span className="italic text-faint">{HIDDEN_PARENT}</span> : decodeEntities(v.text)}
      </span>
    </>
  )
  const cls = 'grid grid-cols-[48px_54px_1fr] items-baseline gap-3 bg-raise px-3.5 py-2.5'
  return (
    <li>
      {url ? (
        <a href={url} target="_blank" rel="noopener" title="넷플릭스에서 이 장면 보기" onClick={() => trackWatch(url, 'my_activity')} className={`${cls} hover:bg-soft`}>
          {body}
        </a>
      ) : (
        <div className={cls}>{body}</div>
      )}
    </li>
  )
}

/** 작품 카드 — 포스터 · 제목 · 마지막 활동 · 내 평가(또는 평가 권유) · 내 채팅 → 반응한 장면 → 좋아요한 채팅(HP-191 결정 1).
 *  '더 보기'는 한 작품 보기(api.myActivityWork) 응답 하나를 세 섹션이 함께 쓴다 — 한 번 받으면 접었다 펴도, 다른 섹션을 펴도
 *  다시 받지 않는다. 받는 동안엔 셋 다 잠근다(두 번 받지 않게). */
function WorkCard({ w, onDeleted }: { w: MyActivityWork; onDeleted: () => void }) {
  const [full, setFull] = useState<MyActivityWork | null>(null)
  const [open, setOpen] = useState<Record<CardSection, boolean>>({ chats: false, scenes: false, liked: false })
  const [busy, setBusy] = useState<CardSection | null>(null)
  const [moreErr, setMoreErr] = useState<{ sec: CardSection; text: string } | null>(null)
  const [delErr, setDelErr] = useState<string | null>(null)
  const toggle = async (sec: CardSection) => {
    if (open[sec]) { setOpen((o) => ({ ...o, [sec]: false })); return }
    if (full) { setOpen((o) => ({ ...o, [sec]: true })); return }
    setBusy(sec); setMoreErr(null)
    try { setFull(await api.myActivityWork(w.contentId)); setOpen((o) => ({ ...o, [sec]: true })); engaged('my_activity', 'more') }
    catch (x) { setMoreErr({ sec, text: moreErrorText(x instanceof ApiError ? x.status : undefined) }) }
    finally { setBusy(null) }
  }
  /* 확인을 취소하면 아무 일 없다. 지웠으면 전체 보기를 다시 받는다(요약·순서는 서버가 정본). 실패는 카드에 한 줄
     (deleteErrorText) — 404 는 이미 없다는 뜻(다른 곳에서 지웠다)이라 문구 대신 다시 받아 맞춘다. */
  const del = async () => {
    if (!w.review) return
    setDelErr(null)
    try {
      if (!(await deleteMyComment(w.review))) return
      engaged('my_activity', 'review_deleted')
      onDeleted()
    } catch (x) {
      const text = deleteErrorText(x instanceof ApiError ? x.status : undefined)
      if (text === null) onDeleted()
      else setDelErr(text)
    }
  }
  const r = w.review
  const p2 = phase2Of(w)
  const f2 = full ? phase2Of(full) : null
  const sections = cardSections({ chatCount: w.chatCount, sceneCount: p2.sceneCount, likedCount: p2.likedCount })
  const ask = r ? null : askText({ chatCount: w.chatCount, reactionCount: p2.reactionCount, likedCount: p2.likedCount })
  const errLine = (sec: CardSection) => moreErr?.sec === sec && <p role="alert" className="mt-1.5 text-[12.5px] text-accentd">{moreErr.text}</p>
  const rowMore = (sec: CardSection, label: string | null) => label && (
    <li>
      <button type="button" onClick={() => toggle(sec)} disabled={busy !== null} aria-expanded={open[sec]}
        className="w-full bg-raise px-3.5 py-2.5 text-center text-[12.5px] font-bold text-muted hover:text-ink disabled:opacity-60">
        {busy === sec ? '불러오는 중…' : label}
      </button>
    </li>
  )
  const head = (title: string, count: string) => (
    <div className="flex items-baseline gap-2.5">
      <b className="text-[13px] text-ink">{title}</b>
      <span className="num font-mono text-[11px] text-faint">{count}</span>
    </div>
  )

  const chatsSec = () => {
    const src = open.chats && full ? full : w
    const chats = open.chats && full ? full.chats : w.chats.slice(0, PREVIEW)
    return (
      <div key="chats" className="mt-3.5">
        {head(CHATS_HEAD, chatsCount(src.chatCount, src.episodeCount))}
        {/* amp-mask = 세션 리플레이 글자 가림(HP-457) — 답글 원문(남의 글·닉네임)이 섞여 있어 목록을 통째로 가린다. */}
        <ol className="amp-mask mt-2 divide-y divide-line overflow-hidden rounded-md border border-line">
          {chats.map((c) => <ChatRow key={c.id} w={w} c={c} />)}
          {rowMore('chats', moreLabel(src.chatCount, open.chats))}
        </ol>
        {errLine('chats')}
        {open.chats && capNote(src.chatCount) && <p className="mt-1.5 text-[12px] text-faint">{capNote(src.chatCount)}</p>}
      </div>
    )
  }
  const scenesSec = () => {
    const s2 = open.scenes && f2 ? f2 : p2
    const scenes = open.scenes && f2 ? f2.scenes : p2.scenes.slice(0, SCENES_PREVIEW)
    const more = moreLabel(s2.sceneCount, open.scenes, SCENES_PREVIEW)
    return (
      <div key="scenes" className="mt-3.5">
        {head(SCENES_HEAD, scenesSummary(s2.sceneCount, s2.reactionCount))}
        {/* 장면은 내 반응(회차·시각·이모지)뿐이라 리플레이 가림(amp-mask)을 두지 않는다 — 남의 글·이름이 없다. */}
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {scenes.map((sc) => <SceneChip key={`${sc.episodeId}:${sc.slotStart}`} w={w} sc={sc} />)}
          {more && (
            <li>
              <button type="button" onClick={() => toggle('scenes')} disabled={busy !== null} aria-expanded={open.scenes}
                className="rounded-full border border-dashed border-line2 px-[11px] py-1.5 text-[12px] font-bold text-muted hover:text-ink disabled:opacity-60">
                {busy === 'scenes' ? '불러오는 중…' : more}
              </button>
            </li>
          )}
        </ul>
        {errLine('scenes')}
        {open.scenes && capNote(s2.sceneCount) && <p className="mt-1.5 text-[12px] text-faint">{capNote(s2.sceneCount)}</p>}
      </div>
    )
  }
  const likedSec = () => {
    const l2 = open.liked && f2 ? f2 : p2
    const liked = open.liked && f2 ? f2.liked : p2.liked.slice(0, LIKED_PREVIEW)
    return (
      <div key="liked" className="mt-3.5">
        {head(LIKED_HEAD, likedSummary(l2.likedCount))}
        {/* amp-mask = 세션 리플레이 글자 가림(HP-457 되돌림 방지) — 남의 글·이름을 보이는 목록은 통째로 가린다. */}
        <ol className="amp-mask mt-2 divide-y divide-line overflow-hidden rounded-md border border-line">
          {liked.map((l) => <LikedRow key={l.id} w={w} l={l} />)}
          {rowMore('liked', moreLabel(l2.likedCount, open.liked, LIKED_PREVIEW))}
        </ol>
        {errLine('liked')}
        {open.liked && capNote(l2.likedCount) && <p className="mt-1.5 text-[12px] text-faint">{capNote(l2.likedCount)}</p>}
      </div>
    )
  }
  const renderSec: Record<CardSection, () => ReactElement> = { chats: chatsSec, scenes: scenesSec, liked: likedSec }

  return (
    <li>
      <article className="grid grid-cols-[72px_1fr] gap-4 rounded-lg border border-line bg-raise p-4 sm:grid-cols-[96px_1fr] sm:gap-5 sm:p-5">
        <a href={titleHref(w.contentId)} aria-label={w.title} className="block self-start"><PosterSlot title={w.title} poster={w.posterUrl} /></a>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h2 className="text-[21px] tracking-[-0.04em]"><a href={titleHref(w.contentId)} className="hover:text-accentd">{w.title}</a></h2>
            <span className="num font-mono text-[11px] text-faint">{lastActivityLabel(w.lastActivityAt)}</span>
          </div>

          {r ? (
            /* amp-mask = 세션 리플레이 글자 가림(HP-457) — 작품 페이지의 평가 한 건과 같은 가림. 평가의 스포일러는 작성자 표시라
               펼쳐 두고 꼬리표만 붙인다(내 글은 가리지 않는다). */
            <div className="amp-mask mt-3 rounded-md border border-line bg-warm px-4 py-3">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <Stars value={r.rating} size={13} />
                <Chip>내 평가</Chip>
                {r.spoiler && <Chip tone="accent"><span className="inline-flex items-center gap-1"><EyeSlashIcon size={11} />스포일러</span></Chip>}
                <span className="num ml-auto font-mono text-[11px] text-faint">{new Date(r.createdAt).toLocaleDateString('ko-KR')}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-[14px] leading-relaxed text-ink">{decodeEntities(r.body)}</p>
              <div className="mt-2.5 flex items-center gap-4 text-[12px]">
                <span title="받은 좋아요" className="num inline-flex items-center gap-1 font-mono font-bold text-accent"><HeartIcon size={13} />{r.likeCount}</span>
                <a href={reviewHref(w.contentId)} className="text-muted hover:text-ink">고치기</a>
                <button type="button" onClick={del} className="inline-flex items-center gap-1 text-muted hover:text-accentd"><TrashIcon size={13} />지우기</button>
              </div>
              {delErr && <p role="alert" className="mt-1.5 text-[12.5px] text-accentd">{delErr}</p>}
            </div>
          ) : ask && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3.5 gap-y-2 rounded-md border border-dashed border-line2 px-4 py-3">
              <p className="text-[13.5px] text-ink2">{ask}</p>
              <a href={reviewHref(w.contentId)} className="btn btn--primary btn--sm">{ASK_ACTION}</a>
            </div>
          )}

          {sections.length ? sections.map((sec) => renderSec[sec]()) : <p className="mt-3.5 text-[13px] text-faint">{NO_CHATS}</p>}
        </div>
      </article>
    </li>
  )
}

function MeSkeleton() {
  return (
    <div aria-hidden>
      <div className="skeleton mt-5 h-[76px] rounded-md" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="mt-[18px] grid grid-cols-[96px_1fr] gap-5 rounded-lg border border-line bg-raise p-5">
          <div className="skeleton rounded-md" style={{ aspectRatio: '2 / 3' }} />
          <div>
            <div className="skeleton h-6 w-1/3 rounded-sm" />
            <div className="skeleton mt-3 h-20 rounded-md" />
            <div className="skeleton mt-3 h-24 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Me() {
  const { ready, user } = useAuth()
  const [gen, setGen] = useState(0)   // 지운 뒤 전체 보기를 다시 받는다 — 요약·순서는 서버가 정본이라 화면에서 되세지 않는다
  const act = useAsync(() => (ready && user ? api.myActivity() : null), [ready, user?.sub, gen])
  const view = activityPageState({
    ready, user: !!user, loading: act.loading, data: act.data,
    error: act.error ? { status: act.error instanceof ApiError ? act.error.status : undefined } : null,
  })
  /* 들어오면 제목(h1)에 포커스 — 헤더 메뉴 「내 활동」은 누르는 순간 메뉴와 함께 사라져 포커스가 body 로 떨어진다(키보드·
     스크린리더 사용자가 길을 잃는다). 제목 요소는 로그인 안내 ↔ 본문 전환 때 바뀌므로 effect 가 아니라 붙을 때마다 부르는 ref 로
     잡고, 포커스를 잃었을 때(body)만 옮긴다. 고정 함수(useCallback)라 같은 요소에 다시 불리지 않는다. */
  const focusIfLost = useCallback((el: HTMLHeadingElement | null) => {
    if (el && (!document.activeElement || document.activeElement === document.body)) el.focus({ preventScroll: true })
  }, [])

  /* 로그인 전(확장의 「전체 활동 보기」로 들어온 경우가 대부분 — 헤더 메뉴는 로그인해야 생긴다)과 세션 만료·동의 전(401·403)은
     같은 자리에서 로그인으로 보낸다. 동의 전이면 ConsentModal 이 위에 떠 있다(auth.ts). */
  if (view === 'gate' || view === 'expired') {
    return (
      <section className={WRAP}>
        <div className="mx-auto mt-6 max-w-[520px] rounded-lg border border-line bg-raise px-6 py-8 text-center">
          <h1 ref={focusIfLost} tabIndex={-1} className="text-[28px] focus:outline-none">내 활동</h1>
          <p className="mt-2.5 text-[14px] text-muted">{view === 'expired' ? EXPIRED : GATE_LEDE}</p>
          <button type="button" onClick={login} className="btn btn--primary btn--sm mt-[18px]">로그인</button>
        </div>
      </section>
    )
  }

  const s = act.data?.summary
  return (
    <section className={WRAP} aria-busy={view === 'auth' || view === 'loading'}>
      <h1 ref={focusIfLost} tabIndex={-1} className="text-[32px] focus:outline-none">내 활동</h1>
      <p className="mt-2 text-[14px] text-muted">{LEDE}</p>
      {(view === 'auth' || view === 'loading') && <MeSkeleton />}
      {/* 못 불러온 것과 활동이 없는 것은 다른 사실이다 — 섞어 쓰면 장애 중에 "활동 없음"이라고 거짓말한다(Notice.tsx 와 같은 이유). */}
      {view === 'failed' && <p className="mt-6 text-muted">{FAILED}</p>}
      {/* 처음 온 사람 — 요약 숫자 줄은 보여 줄 것이 없어 숨긴다(프로토타입). */}
      {view === 'empty' && (
        <div className="mt-6 rounded-lg border border-dashed border-line2 px-7 py-9 text-center">
          <p className="text-[16px] font-extrabold text-ink">{EMPTY_TITLE}</p>
          <p className="mx-auto mt-2 max-w-[46ch] text-[13.5px] text-muted">{EMPTY_BODY}</p>
          <a href="#/ranking" className="btn btn--ghost btn--sm mt-4">{EMPTY_ACTION}</a>
        </div>
      )}
      {view === 'list' && act.data && s && (
        <>
          {/* 요약 숫자 줄(HP-274 결정 14 · HP-191 결정 4 다섯 칸) — 서버 summary 그대로(summaryCells: 1차 서버면 세 칸). 정렬 토글은 없다.
              휴대폰(HP-474 이후 입구가 있다)에서도 한 줄 — 칸 여백·글자만 줄이고 이름은 두 줄로 접힌다. */}
          <div className="mt-5 flex overflow-hidden rounded-md border border-line bg-raise">
            {summaryCells(s).map(([n, k]) => (
              <div key={k} className="min-w-0 flex-1 border-l border-line px-2.5 py-3 first:border-l-0 sm:px-5 sm:py-4">
                <p className="num font-mono text-[20px] font-extrabold leading-none tracking-tight text-ink sm:text-[24px]">{n}</p>
                <p className="mt-1.5 text-[11px] leading-snug text-muted sm:text-[12.5px]">{k}</p>
              </div>
            ))}
          </div>
          {act.data.truncated && <p role="status" className="mt-2 text-[12.5px] text-faint">{TRUNCATED_NOTE}</p>}
          <ol className="mt-6 flex flex-col gap-[18px]">
            {act.data.works.map((w) => <WorkCard key={w.contentId} w={w} onDeleted={() => setGen((g) => g + 1)} />)}
          </ol>
        </>
      )}
    </section>
  )
}
