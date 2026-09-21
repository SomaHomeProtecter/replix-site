/* 공지 페이지(HP-425, `#/notice[/{id}]`). 점검·업데이트·장애 소식을 한 줄기로 모아 두는 사이트 수준 표면이다.
   여기로 오는 링크는 헤더의 '공지'와 공지 띠의 '보기'다. 확장 공지함의 "전문 보기 ↗"는 이 페이지가 아니라
   운영자가 공지에 넣은 linkUrl 을 그대로 연다 — 이 페이지와 확장 공지함은 같은 목록을 각자 보여 줄 뿐이다.
   목록·읽음 상태는 notices.ts 가 모듈 전역으로 한 번만 가져와 헤더 링크·띠와 나눠 쓴다. */
import { useEffect, useState } from 'react'
import { markSeen, noticePageState, readSeenId, useNotices } from '../notices'
import type { Notice as NoticeRow } from '../api'

/* 태그 문구는 확장·웹 공통(global-constraints): 공지 / 점검 / 장애. 점검색은 토큰에 없는 호박색 한 쌍이다
   (라이트 배경 위 경고 톤 — 강조색 빨강은 장애에 남겨 둔다). */
const KIND = {
  NOTICE: ['공지', 'bg-sink text-muted'],
  MAINTENANCE: ['점검', 'bg-[#fbf1df] text-[#7a4a00]'],
  INCIDENT: ['장애', 'bg-accentw text-accentd'],
} as const

function fmt(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(+d) ? '' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function Notice({ noticeId }: { noticeId: number | null }) {
  const { items, failed, loading } = useNotices()
  /* 어떤 안내 한 줄을 보일지는 순수 함수가 정한다(notices-pure.js) — React 밖에서 검사하려고(scripts/test-notices.mjs).
     핵심은 loading: 첫 실패 뒤 재시도 동안은 items 가 빈 목록이라도 '공지 0건'이 아니라 '불러오는 중'이다. */
  const view = noticePageState({ items, failed, loading, noticeId })
  /* NEW 배지의 기준선은 **페이지에 들어온 순간**의 읽음 값이다. 훅이 주는 seenId 를 쓰면 바로 아래
     markSeen 이 그 값을 올려 버려 배지가 한 프레임 만에 전부 사라진다 — "이번에 새로 올라온 것"을
     알려 주는 표시가 아무 일도 못 하게 된다. 마운트 때 한 번 읽어 이 방문 동안 고정한다. */
  const [seenAtEntry] = useState(readSeenId)
  // 페이지를 본 순간 읽음 — 헤더 링크의 빨간 점은 이걸로 꺼진다.
  useEffect(() => { if (items) markSeen(items) }, [items])
  // 목록이 늦게 도착한 경우(첫 렌더에 캐시가 없던 경우)의 스크롤. 캐시가 있을 때는 App 이 앵커로 처리한다.
  useEffect(() => { if (items && noticeId) document.getElementById(`n-${noticeId}`)?.scrollIntoView({ block: 'start' }) }, [items, noticeId])

  return (
    <section className="wrap min-h-[60vh] py-10">
      <h1 className="mb-1.5 text-[32px]">공지</h1>
      <p className="mb-6 text-[14px] text-muted">
        점검·업데이트·장애 소식을 모아 둡니다. 확장 패널의 공지함과 같은 내용이에요.
      </p>
      {view === 'loading' && <p className="text-muted">불러오는 중…</p>}
      {/* #/notice/<id> 로 왔는데 그 공지가 목록에 없는 경우(90일 지나 내려갔거나 limit 밖) — 아무 표시도
          없으면 링크가 깨진 것처럼 보인다. 목록은 그대로 두고 왜 그 항목이 없는지만 한 줄로 알린다.
          목록이 비었을 때는 내지 않는다(아래 '아직 공지가 없어요'와 같이 나오면 서로 다른 말을 한다). */}
      {view === 'missing' && (
        <p role="status" className="mb-4 text-[14px] text-muted">
          찾는 공지는 목록에서 내려갔어요. 아래는 최근 공지예요.
        </p>
      )}
      {/* 못 불러온 것과 아직 아무 공지도 없는 것은 다른 사실이다 — 섞어 쓰면 장애 중에 "공지 없음"이라고 거짓말한다. */}
      {view === 'failed' && <p className="text-muted">공지를 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.</p>}
      {view === 'empty' && <p className="text-muted">아직 공지가 없어요.</p>}
      {items?.map((n: NoticeRow) => {
        const [label, cls] = KIND[n.kind] ?? KIND.NOTICE
        const isNew = n.id > seenAtEntry
        const target = n.id === noticeId
        return (
          <article
            key={n.id}
            id={`n-${n.id}`}
            className={`grid grid-cols-[auto_1fr_auto] items-baseline gap-x-3.5 gap-y-1.5 scroll-mt-[90px] border-t border-line py-4 last:border-b ${target ? '-mx-4 rounded-sm bg-accentw px-4' : ''}`}
          >
            <span className={`rounded px-1.5 py-0.5 font-mono text-[11px] ${cls}`}>{label}</span>
            <span className="text-[17px] font-bold text-ink">
              {n.title}
              {/* 점검과 장애는 **다른 말을 쓴다** — 점검은 해결하는 대상이 아니라 끝내는 일이라
                  "(완료)"이고, 장애는 해결하는 대상이라 "(해결됨)"이다. 한 조건으로 묶으면 점검이
                  사고처럼 읽힌다(HP-439). 확장 공지함(Replix-extension features/notices.js)과
                  **같은 문구여야** 한다 — 한쪽만 고치면 같은 공지가 둘에서 다르게 보인다. */}
              {!n.endedAt || n.kind === 'NOTICE' ? '' : n.kind === 'MAINTENANCE' ? ' (완료)' : ' (해결됨)'}
              {isNew && <span className="ml-2 align-[2px] font-mono text-[10px] text-accent">NEW</span>}
            </span>
            <span className="num font-mono text-[12px] text-faint">{fmt(n.startsAt)}</span>
            <p className="col-span-2 col-start-2 max-w-[70ch] whitespace-pre-wrap text-[14px] text-ink2">{n.message}</p>
            {/* 임의의 외부 https 링크다(운영자가 넣는다) — 새 탭 + noreferrer. http·javascript: 는 아예 그리지 않는다. */}
            {n.linkUrl && /^https:\/\//.test(n.linkUrl) && (
              <a className="col-start-2 text-[13.5px] font-bold text-accentd hover:underline" href={n.linkUrl} target="_blank" rel="noopener noreferrer">
                전문 보기 ↗
              </a>
            )}
          </article>
        )
      })}
    </section>
  )
}
