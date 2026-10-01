/* 내 활동(HP-443, `#/me`) — 로그인한 사람이 남긴 작품 댓글(별점)과 공개 채팅(답글 포함)을 작품별로 모은다(HP-274 안 B).
   데이터는 HP-441 두 API — 전 작품 `GET /users/me/activity`(카드마다 채팅 3개 + 개수) · '더 보기' = 그 작품 전량
   `GET /users/me/activity/contents/{id}`(≤300, 커서 없음). 정렬은 API 순서 하나(마지막 활동순, HP-274 결정 14 — 토글 없음).
   가림·상대 날짜·상태 판정은 activity-pure.js(노드 검사 scripts/test-activity.mjs). 내 글은 가리지 않고 남의 원문만 가린다.
   쓰기·고치기는 작품 페이지의 평가 칸(#/title/{id}/review)에만 있다 — 여기선 지우기만, 작품 페이지와 같은 확인(Comments.tsx).
   들어오는 길 = 헤더 닉네임 메뉴 「내 활동」(Chrome.tsx) · 확장의 「전체 활동 보기」(HP-442). */
import { useState } from 'react'
import { EyeSlashIcon, HeartIcon, TrashIcon } from '@phosphor-icons/react'
import { api, ApiError, decodeEntities, deleteMyComment, episodeLabel, fmtTime, watchUrl, type MyActivityChat, type MyActivityWork } from '../api'
import { login, useAuth } from '../auth'
import { useAsync } from '../hooks'
import { engaged, trackWatch } from '../analytics'
import { reviewHref, titleHref } from '../route-pure.js'
import { Chip, PosterSlot } from '../components/primitives'
import { Stars } from '../components/Comments'
import {
  ASK_ACTION, CHATS_HEAD, EMPTY_ACTION, EMPTY_BODY, EMPTY_TITLE, EXPIRED, FAILED, GATE_LEDE, HIDDEN_PARENT, LEDE, MORE_FAILED,
  NO_CHATS, PREVIEW, REPLY_FALLBACK, SPOILER_TAG, TRUNCATED_NOTE,
  activityPageState, askLine, averageLabel, capNote, chatsCount, isLeakScore, lastActivityLabel, moreLabel, parentView, snip,
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

/** 작품 카드 — 포스터 · 제목 · 마지막 활동 · 내 평가(또는 평가 유도) · 이 작품에서 남긴 채팅(3개 + 더 보기). */
function WorkCard({ w, onDeleted }: { w: MyActivityWork; onDeleted: () => void }) {
  const [full, setFull] = useState<MyActivityWork | null>(null)   // '더 보기'로 받은 그 작품 전량(한 번 받으면 접었다 펴도 다시 안 받는다)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [moreErr, setMoreErr] = useState(false)
  const src = open && full ? full : w
  const chats = open && full ? full.chats : w.chats.slice(0, PREVIEW)
  const more = moreLabel(src.chatCount, open)
  const toggle = async () => {
    if (open) { setOpen(false); return }
    if (full) { setOpen(true); return }
    setBusy(true); setMoreErr(false)
    try { setFull(await api.myActivityWork(w.contentId)); setOpen(true); engaged('my_activity', 'more') }
    catch { setMoreErr(true) }
    finally { setBusy(false) }
  }
  const del = async () => {
    if (!w.review || !(await deleteMyComment(w.review))) return
    engaged('my_activity', 'review_deleted')
    onDeleted()
  }
  const r = w.review
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
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3.5 gap-y-2 rounded-md border border-dashed border-line2 px-4 py-3">
              <p className="text-[13.5px] text-ink2">{askLine(w.chatCount)}</p>
              <a href={reviewHref(w.contentId)} className="btn btn--primary btn--sm">{ASK_ACTION}</a>
            </div>
          )}

          {w.chatCount > 0 ? (
            <div className="mt-3.5">
              <div className="flex items-baseline gap-2.5">
                <b className="text-[13px] text-ink">{CHATS_HEAD}</b>
                <span className="num font-mono text-[11px] text-faint">{chatsCount(src.chatCount, src.episodeCount)}</span>
              </div>
              {/* amp-mask = 세션 리플레이 글자 가림(HP-457) — 답글 원문(남의 글·닉네임)이 섞여 있어 목록을 통째로 가린다. */}
              <ol className="amp-mask mt-2 divide-y divide-line overflow-hidden rounded-md border border-line">
                {chats.map((c) => <ChatRow key={c.id} w={w} c={c} />)}
                {more && (
                  <li>
                    <button type="button" onClick={toggle} disabled={busy} aria-expanded={open}
                      className="w-full bg-raise px-3.5 py-2.5 text-center text-[12.5px] font-bold text-muted hover:text-ink disabled:opacity-60">
                      {busy ? '불러오는 중…' : more}
                    </button>
                  </li>
                )}
              </ol>
              {moreErr && <p role="alert" className="mt-1.5 text-[12.5px] text-accentd">{MORE_FAILED}</p>}
              {open && capNote(src.chatCount) && <p className="mt-1.5 text-[12px] text-faint">{capNote(src.chatCount)}</p>}
            </div>
          ) : (
            <p className="mt-3.5 text-[13px] text-faint">{NO_CHATS}</p>
          )}
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

  /* 로그인 전(확장의 「전체 활동 보기」로 들어온 경우가 대부분 — 헤더 메뉴는 로그인해야 생긴다)과 세션 만료·동의 전(401·403)은
     같은 자리에서 로그인으로 보낸다. 동의 전이면 ConsentModal 이 위에 떠 있다(auth.ts). */
  if (view === 'gate' || view === 'expired') {
    return (
      <section className={WRAP}>
        <div className="mx-auto mt-6 max-w-[520px] rounded-lg border border-line bg-raise px-6 py-8 text-center">
          <h1 className="text-[28px]">내 활동</h1>
          <p className="mt-2.5 text-[14px] text-muted">{view === 'expired' ? EXPIRED : GATE_LEDE}</p>
          <button type="button" onClick={login} className="btn btn--primary btn--sm mt-[18px]">로그인</button>
        </div>
      </section>
    )
  }

  const s = act.data?.summary
  return (
    <section className={WRAP} aria-busy={view === 'auth' || view === 'loading'}>
      <h1 className="text-[32px]">내 활동</h1>
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
          {/* 요약 숫자 줄(HP-274 결정 14) — 서버 summary 그대로. 정렬 토글은 없다(최근 활동순 하나). */}
          <div className="mt-5 flex overflow-hidden rounded-md border border-line bg-raise">
            {([[String(s.ratedWorks), '평가한 작품'], [averageLabel(s.averageRating), '내 평균 별점'], [String(s.chatCount), '남긴 채팅']] as const).map(([n, k]) => (
              <div key={k} className="min-w-0 flex-1 border-l border-line px-5 py-4 first:border-l-0">
                <p className="num font-mono text-[24px] font-extrabold leading-none tracking-tight text-ink">{n}</p>
                <p className="mt-1.5 text-[12.5px] text-muted">{k}</p>
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
