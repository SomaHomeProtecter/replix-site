import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { api, ApiError, type Collection, type Density, type Episode, type NewPlanItem, type NewSceneNote, type Plan, type PlanView, type Post, type PostsPage, type SceneNote, type SourceKind, type Work } from './api'
import { canRead, canWrite, login, logout, useAuth } from './auth'
import { ENV } from './env'

/* 시딩 1단계 화면(HP-435): 작품 → 회차 → 수집. 한 화면에 세 단이 좌→우로 놓이고, 오른쪽 단이 진행·결과다.
   라우팅은 없다(관리자 한 명이 한 회차씩 다루는 도구). 진행 중 작업은 2초마다 다시 읽는다. */

const KST = 'Asia/Seoul'
const WEEKDAYS = ['', '월', '화', '수', '목', '금', '토', '일']
const SOURCE_LABEL: Record<SourceKind, string> = { DCINSIDE: '디시', THEQOO: '더쿠' }
const STATUS_LABEL: Record<Collection['status'], string> = { QUEUED: '대기', RUNNING: '진행 중', DONE: '완료', FAILED: '실패', CANCELLED: '취소' }
const STATUS_CLASS: Record<Collection['status'], string> = {
  QUEUED: 'bg-soft text-muted', RUNNING: 'bg-warnw text-warn', DONE: 'bg-okw text-ok', FAILED: 'bg-badw text-bad', CANCELLED: 'bg-soft text-muted',
}

function fmtKst(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = {}) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('ko-KR', { timeZone: KST, hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', ...opts }).format(new Date(iso))
}
/* <input type=datetime-local> 값(KST 벽시계) ↔ ISO(UTC) */
function isoToLocalInput(iso: string | null): string {
  if (!iso) return ''
  const p = new Intl.DateTimeFormat('sv-SE', { timeZone: KST, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso))
  return p.replace(' ', 'T')
}
function localInputToIso(v: string): string | null {
  if (!v) return null
  return new Date(`${v}:00+09:00`).toISOString()
}
/* 작품의 방영 요일로 "가장 최근 방영일"을 제안한다 — 회차 추가 폼의 기본값. */
function lastAirDate(weekday: number | null): string {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: KST }))
  if (!weekday) return now.toISOString().slice(0, 10)
  const isoDow = ((now.getDay() + 6) % 7) + 1
  const back = (isoDow - weekday + 7) % 7
  now.setDate(now.getDate() - back)
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}
function errText(e: unknown) { return e instanceof ApiError ? `${e.message}${e.code ? ` (${e.code})` : ''}` : e instanceof Error ? e.message : String(e) }

export default function App() {
  const { ready, user } = useAuth()
  if (!ready) return <Shell><p className="text-muted">로그인 확인 중…</p></Shell>
  if (!user) return <Shell><Gate title="관리자 로그인이 필요합니다" body="운영 데이터를 다루는 도구입니다. 팀 Keycloak 계정으로 로그인하세요."><button className="btn-primary" onClick={login}>로그인</button></Gate></Shell>
  if (!canRead(user)) return <Shell user={user.name}><Gate title="권한이 없습니다" body={`${user.name} 계정에 관리자 롤(admin · moderation_operator · admin_console_viewer)이 없습니다.`}><button className="btn" onClick={logout}>로그아웃</button></Gate></Shell>
  return <Shell user={user.name}><Workspace writable={canWrite(user)} /></Shell>
}

function Shell({ user, children }: { user?: string; children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-12 bg-ink text-white flex items-center gap-4 px-5">
        <span className="inline-block w-2.5 h-2.5 rounded-sm bg-accent" />
        <span className="font-bold tracking-wide">Replix 시딩</span>
        <span className="text-white/60 text-sm">1단계 · 수집</span>
        <span className={`ml-2 px-2 py-0.5 rounded-full text-[11px] font-bold tracking-wider ${ENV === 'prod' ? 'bg-bad text-white' : 'bg-warn text-white'}`}>{ENV === 'prod' ? 'PROD' : 'DEV'}</span>
        <span className="text-white/50 text-xs">주입 대상 서버는 주소가 정합니다</span>
        <span className="flex-1" />
        {user && <><span className="text-sm text-white/80">{user}</span><button className="text-xs text-white/60 hover:text-white" onClick={logout}>로그아웃</button></>}
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}

function Gate({ title, body, children }: { title: string; body: string; children: ReactNode }) {
  return (
    <div className="max-w-md mx-auto mt-24 bg-raise border border-line rounded-lg p-6 flex flex-col gap-3">
      <h1 className="text-lg font-bold">{title}</h1>
      <p className="text-sm text-ink2">{body}</p>
      <div>{children}</div>
    </div>
  )
}

function Workspace({ writable }: { writable: boolean }) {
  const [works, setWorks] = useState<Work[] | null>(null)
  const [workId, setWorkId] = useState<number | null>(null)
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [episodeId, setEpisodeId] = useState<number | null>(null)
  const [collections, setCollections] = useState<Collection[]>([])
  const [collectionId, setCollectionId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const work = useMemo(() => works?.find((w) => w.id === workId) ?? null, [works, workId])
  const episode = useMemo(() => episodes.find((e) => e.id === episodeId) ?? null, [episodes, episodeId])

  const loadWorks = useCallback(() => api.works().then((ws) => { setWorks(ws); if (ws.length && workId == null) setWorkId(ws[0].id) }).catch((e) => setError(errText(e))), [workId])
  const loadEpisodes = useCallback((wid: number) => api.episodes(wid).then((es) => { setEpisodes(es); setEpisodeId((cur) => es.some((e) => e.id === cur) ? cur : (es[0]?.id ?? null)) }).catch((e) => setError(errText(e))), [])
  const loadCollections = useCallback((eid: number) => api.collections(eid).then((cs) => { setCollections(cs); setCollectionId((cur) => cs.some((c) => c.id === cur) ? cur : (cs[0]?.id ?? null)) }).catch((e) => setError(errText(e))), [])

  useEffect(() => { loadWorks() }, [loadWorks])
  useEffect(() => { if (workId != null) loadEpisodes(workId) }, [workId, loadEpisodes])
  useEffect(() => { if (episodeId != null) loadCollections(episodeId); else { setCollections([]); setCollectionId(null) } }, [episodeId, loadCollections])

  return (
    <div className="grid grid-cols-[300px_minmax(0,1fr)_minmax(0,1.4fr)] gap-5 items-start">
      {error && <div className="col-span-3 bg-badw text-bad text-sm rounded px-3 py-2 flex justify-between"><span>{error}</span><button onClick={() => setError(null)}>닫기</button></div>}

      <section className="bg-raise border border-line rounded-lg">
        <h2 className="px-4 py-3 border-b border-line text-xs font-semibold tracking-widest text-muted">① 작품</h2>
        <ul className="p-2 flex flex-col gap-1">
          {works == null && <li className="px-3 py-2 text-sm text-muted">불러오는 중…</li>}
          {works?.map((w) => (
            <li key={w.id}>
              <button onClick={() => setWorkId(w.id)} className={`w-full text-left rounded px-3 py-2 border ${w.id === workId ? 'border-info bg-infow' : 'border-transparent hover:bg-soft'}`}>
                <div className="font-semibold">{w.title} <span className="mono text-xs text-faint">{w.code}</span></div>
                <div className="text-xs text-muted mt-0.5">{w.airWeekday ? `${WEEKDAYS[w.airWeekday]}요일 ${w.airTime ?? ''}` : '정기 편성 없음'} · 본편 {w.defaultRuntimeSec ? `${Math.round(w.defaultRuntimeSec / 60)}분` : '—'}</div>
                <div className="text-xs text-muted mt-0.5">{w.sources.map((s) => `${SOURCE_LABEL[s.kind]}:${s.boardId}`).join(' · ') || '소스 없음'}</div>
              </button>
            </li>
          ))}
        </ul>
        <p className="px-4 pb-3 text-[11px] text-faint">새 작품은 API(POST /works)로 등록합니다 — 방영 시각·소스는 사람이 실측해 적습니다.</p>
      </section>

      <section className="bg-raise border border-line rounded-lg">
        <h2 className="px-4 py-3 border-b border-line text-xs font-semibold tracking-widest text-muted flex justify-between"><span>② 회차</span>{work && <span className="normal-case tracking-normal font-normal">{work.title}</span>}</h2>
        {work && <EpisodePanel work={work} episodes={episodes} episodeId={episodeId} setEpisodeId={setEpisodeId} writable={writable} onChanged={() => loadEpisodes(work.id)} onError={setError} />}
      </section>

      <section className="bg-raise border border-line rounded-lg">
        <h2 className="px-4 py-3 border-b border-line text-xs font-semibold tracking-widest text-muted flex justify-between"><span>③ 수집</span>{episode && <span className="normal-case tracking-normal font-normal">{episode.label ?? episode.airDate}</span>}</h2>
        {episode
          ? <CollectionPanel episode={episode} collections={collections} collectionId={collectionId} setCollectionId={setCollectionId} writable={writable} reload={() => loadCollections(episode.id)} onError={setError} onEpisodeChanged={() => loadEpisodes(episode.workId)} />
          : <p className="p-4 text-sm text-muted">회차를 고르면 수집을 시작할 수 있습니다.</p>}
      </section>
    </div>
  )
}

function EpisodePanel({ work, episodes, episodeId, setEpisodeId, writable, onChanged, onError }: {
  work: Work; episodes: Episode[]; episodeId: number | null; setEpisodeId: (id: number) => void; writable: boolean; onChanged: () => void; onError: (m: string) => void
}) {
  const [adding, setAdding] = useState(false)
  const [airDate, setAirDate] = useState(() => lastAirDate(work.airWeekday))
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const selected = episodes.find((e) => e.id === episodeId) ?? null

  const add = async () => {
    setBusy(true)
    try { const e = await api.createEpisode(work.id, { airDate, label: label || undefined }); setAdding(false); setLabel(''); onChanged(); setEpisodeId(e.id) }
    catch (e) { onError(errText(e)) } finally { setBusy(false) }
  }

  return (
    <div className="flex flex-col">
      <ul className="p-2 flex flex-col gap-1 max-h-64 overflow-auto">
        {episodes.length === 0 && <li className="px-3 py-2 text-sm text-muted">회차가 없습니다. 방영일을 추가하세요.</li>}
        {episodes.map((e) => (
          <li key={e.id}>
            <button onClick={() => setEpisodeId(e.id)} className={`w-full text-left rounded px-3 py-2 border ${e.id === episodeId ? 'border-info bg-infow' : 'border-transparent hover:bg-soft'}`}>
              <div className="font-semibold">{e.label ?? e.airDate} <span className="mono text-xs text-faint">{e.airDate}</span></div>
              <div className="text-xs text-muted mt-0.5 mono">{fmtKst(e.airStartAt)} → {e.airEndAt ? fmtKst(e.airEndAt) : `추정(+${e.runtimeSec ? Math.round(e.runtimeSec / 60) : '?'}분)`}</div>
            </button>
          </li>
        ))}
      </ul>
      {writable && (
        <div className="px-4 py-3 border-t border-line">
          {!adding ? <button className="btn" onClick={() => { setAirDate(lastAirDate(work.airWeekday)); setAdding(true) }}>+ 회차 추가</button> : (
            <div className="flex flex-col gap-2 text-sm">
              <label className="flex items-center gap-2">방영일 <input type="date" value={airDate} onChange={(e) => setAirDate(e.target.value)} className="input" /></label>
              <label className="flex items-center gap-2">이름 <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="예: 33기 9회" className="input flex-1" /></label>
              <p className="text-xs text-muted">시작 시각은 작품 규칙({work.airTime ?? '없음'} KST)으로 채워지고, 종료·러닝타임은 비워 두면 본편 {work.defaultRuntimeSec ? `${Math.round(work.defaultRuntimeSec / 60)}분` : '100분'} + 광고 3분으로 추정합니다. 아래에서 고칠 수 있습니다.</p>
              <div className="flex gap-2"><button className="btn-primary" disabled={busy} onClick={add}>추가</button><button className="btn" onClick={() => setAdding(false)}>취소</button></div>
            </div>
          )}
        </div>
      )}
      {selected && <>
        <EpisodeMeta key={selected.id} episode={selected} writable={writable} onChanged={onChanged} onError={onError} />
        <SceneNotesPanel key={'scene-' + selected.id} episode={selected} writable={writable} onError={onError} />
        <PlanPanel key={'plan-' + selected.id} episode={selected} writable={writable} onError={onError} />
      </>}
    </div>
  )
}

function EpisodeMeta({ episode, writable, onChanged, onError }: { episode: Episode; writable: boolean; onChanged: () => void; onError: (m: string) => void }) {
  const [label, setLabel] = useState(episode.label ?? '')
  const [start, setStart] = useState(isoToLocalInput(episode.airStartAt))
  const [end, setEnd] = useState(isoToLocalInput(episode.airEndAt))
  const [runtime, setRuntime] = useState(episode.runtimeSec?.toString() ?? '')
  const [busy, setBusy] = useState(false)
  const dirty = label !== (episode.label ?? '') || start !== isoToLocalInput(episode.airStartAt) || end !== isoToLocalInput(episode.airEndAt) || runtime !== (episode.runtimeSec?.toString() ?? '')

  const save = async () => {
    const s = localInputToIso(start)
    if (!s) { onError('시작 시각은 비울 수 없습니다'); return }
    setBusy(true)
    try { await api.updateEpisode(episode.id, { label: label || null, airStartAt: s, airEndAt: localInputToIso(end), runtimeSec: runtime ? Number(runtime) : null, episodeId: episode.episodeId }); onChanged() }
    catch (e) { onError(errText(e)) } finally { setBusy(false) }
  }

  return (
    <div className="px-4 py-3 border-t border-line text-sm flex flex-col gap-2">
      <div className="text-xs font-semibold tracking-widest text-muted">방영 메타 (KST)</div>
      <label className="grid grid-cols-[88px_1fr] items-center gap-2">이름<input value={label} onChange={(e) => setLabel(e.target.value)} disabled={!writable} className="input" /></label>
      <label className="grid grid-cols-[88px_1fr] items-center gap-2">시작<input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} disabled={!writable} className="input mono" /></label>
      <label className="grid grid-cols-[88px_1fr] items-center gap-2">종료<input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} disabled={!writable} className="input mono" placeholder="비우면 추정" /></label>
      <label className="grid grid-cols-[88px_1fr] items-center gap-2">본편(초)<input type="number" value={runtime} onChange={(e) => setRuntime(e.target.value)} disabled={!writable} className="input mono" /></label>
      <p className="text-xs text-faint">시작 = 커뮤니티 첫 반응 글 시각, 종료 = 분당 글 수가 급감하는 지점으로 실측해 적습니다(편성표를 믿지 않습니다). 수집 구간은 시작 −20분 ~ 종료 +30분.</p>
      {writable && dirty && <div><button className="btn-primary" disabled={busy} onClick={save}>저장</button></div>}
    </div>
  )
}

/* 1분 창 장면 메모(HP-436 후속) — 수집 글로 역산한 "그 분에 화면에서 벌어진 일". 자동화 전엔 사람이 표를 붙여넣어
   저장한다(2026-09-21 조현빈 결정). 확장 패널이 현재 분의 메모를 보여 주고 변형 생성의 문맥으로 쓴다.
   붙여넣기 형식: 마크다운 표 `| HH:MM | 추정 장면 | 근거 | 확신 | 특이 |` (근거 열은 저장하지 않는다). */
function parseSceneTable(text: string, airDate: string, airStartAt: string): NewSceneNote[] {
  const out: NewSceneNote[] = []
  const start = new Date(airStartAt).getTime()
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line.startsWith('|')) continue
    const cells = line.slice(1, line.endsWith('|') ? -1 : undefined).split('|').map((c) => c.trim())
    const m = /^(\d{1,2}):(\d{2})$/.exec(cells[0] ?? '')
    if (!m || !cells[1] || /^-+$/.test(cells[1])) continue
    let t = new Date(`${airDate}T${m[1].padStart(2, '0')}:${m[2]}:00+09:00`).getTime()
    if (t < start - 3 * 3600_000) t += 86400_000 // 자정을 넘긴 시각은 다음날
    out.push({ minuteAt: new Date(t).toISOString(), note: cells[1], confidence: cells[3] || null, tag: cells[4] || null })
  }
  return out
}

function SceneNotesPanel({ episode, writable, onError }: { episode: Episode; writable: boolean; onError: (m: string) => void }) {
  const [notes, setNotes] = useState<SceneNote[] | null>(null)
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let alive = true
    api.sceneNotes(episode.id).then((n) => { if (alive) setNotes(n) }).catch((e) => onError(errText(e)))
    return () => { alive = false }
  }, [episode.id, onError])
  const parsed = useMemo(() => parseSceneTable(text, episode.airDate, episode.airStartAt), [text, episode.airDate, episode.airStartAt])
  const save = async () => {
    setBusy(true)
    try { setNotes(await api.putSceneNotes(episode.id, parsed)); setText(''); setOpen(false) }
    catch (e) { onError(errText(e)) } finally { setBusy(false) }
  }
  const clear = async () => {
    if (!confirm('장면 메모를 모두 지웁니다.')) return
    setBusy(true)
    try { setNotes(await api.putSceneNotes(episode.id, [])) } catch (e) { onError(errText(e)) } finally { setBusy(false) }
  }
  const tagged = (notes ?? []).filter((n) => n.tag)
  return (
    <div className="px-4 py-3 border-t border-line text-sm flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold tracking-widest text-muted">1분 창 장면 메모</span>
        <span className="text-xs text-faint">{notes ? `${notes.length}분` : '…'}{tagged.length > 0 && ` · ${tagged.map((n) => `${n.tag} ${fmtKst(n.minuteAt, { second: undefined })}`).join(' / ')}`}</span>
        <span className="flex-1" />
        {writable && <button className="btn" onClick={() => setOpen((v) => !v)}>{open ? '닫기' : '표 붙여넣기'}</button>}
        {writable && notes && notes.length > 0 && <button className="btn text-bad" disabled={busy} onClick={clear}>비우기</button>}
      </div>
      {open && (
        <div className="flex flex-col gap-2">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} spellCheck={false} className="input mono text-xs"
            placeholder={'| 22:35 | 영수가 눈 뜨자마자 컵라면… | 근거 | 높음 | |\n| 22:36 | … | … | 중간 | 광고 |'} />
          <div className="flex items-center gap-2 text-xs text-muted">
            <span>인식된 행 <b className="text-ink">{parsed.length}</b>개 (시각은 방영일 {episode.airDate} KST, 자정 넘김은 다음날)</span>
            <span className="flex-1" />
            <button className="btn-primary" disabled={busy || parsed.length === 0} onClick={save}>저장 (전체 교체)</button>
          </div>
        </div>
      )}
      {notes && notes.length > 0 && (
        <div className="max-h-40 overflow-auto text-xs flex flex-col gap-0.5">
          {notes.map((n) => (
            <div key={n.id} className="grid grid-cols-[44px_1fr_auto] gap-2">
              <span className="mono text-faint">{fmtKst(n.minuteAt, { second: undefined })}</span>
              <span className={n.note === '추정 불가' ? 'text-faint' : ''}>{n.note}</span>
              <span className="text-faint whitespace-nowrap">{[n.confidence, n.tag].filter(Boolean).join(' · ')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* 주입 계획 검수(HP-436 후속, 2026-09-21 조현빈 결정) — 로컬 파이프라인(Replix-research tools/seed-autopilot)이 만든
   계획 JSON 을 올리고, 재생 시각과 함께 훑으며 거부만 한 뒤 "전체 주입". 시각 환산은 서버가 현재 기준점으로 미리 보여 준다. */
function fmtSec(sec: number | null) {
  if (sec == null || !Number.isFinite(sec)) return '--:--'
  const s = Math.max(0, sec); const m = Math.floor(s / 60); const r = Math.floor(s % 60)
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

function PlanPanel({ episode, writable, onError }: { episode: Episode; writable: boolean; onError: (m: string) => void }) {
  const [plans, setPlans] = useState<Plan[] | null>(null)
  const [view, setView] = useState<PlanView | null>(null)
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [filter, setFilter] = useState<'all' | 'accepted' | 'rejected' | 'failed'>('all')
  const reloadPlans = useCallback(() => api.plans(episode.id).then(setPlans).catch((e) => onError(errText(e))), [episode.id, onError])
  useEffect(() => { reloadPlans() }, [reloadPlans])
  const openPlan = async (id: number) => { try { setView(await api.plan(id)) } catch (e) { onError(errText(e)) } }

  const parsed = useMemo(() => {
    if (!text.trim()) return null
    try {
      const j = JSON.parse(text)
      const items: NewPlanItem[] = Array.isArray(j) ? j : j.items
      if (!Array.isArray(items)) return null
      return { label: (Array.isArray(j) ? null : j.label) ?? null, source: (Array.isArray(j) ? null : j.source) ?? null, items }
    } catch { return null }
  }, [text])
  const upload = async () => {
    if (!parsed) return
    setBusy(true)
    try { const v = await api.createPlan(episode.id, parsed); setText(''); setOpen(false); await reloadPlans(); setView(v) }
    catch (e) { onError(errText(e)) } finally { setBusy(false) }
  }
  const toggle = async (itemId: number, accepted: boolean) => {
    try { const it = await api.patchPlanItem(itemId, { accepted }); setView((v) => v && { ...v, items: v.items.map((x) => x.item.id === it.id ? { ...x, item: it } : x) }) }
    catch (e) { onError(errText(e)) }
  }
  // 실행은 서버 백그라운드(202) — 2초마다 다시 받아 진행률을 보이다가 끝나면 목록을 갱신한다
  const execute = async () => {
    if (!view) return
    const n = view.items.filter((x) => x.item.accepted && !x.item.injectionId).length
    if (!confirm(`수락된 ${n}건을 회차 채팅에 주입합니다. 되돌리려면 "전체 되돌리기"나 확장 패널의 개별 취소를 쓰세요.`)) return
    setBusy(true)
    try { setView(await api.executePlan(view.plan.id)) } catch (e) { onError(errText(e)); setBusy(false) }
  }
  useEffect(() => {
    if (!view || view.plan.status !== 'RUNNING') return
    const t = setInterval(async () => {
      try { const v = await api.plan(view.plan.id); setView(v); if (v.plan.status !== 'RUNNING') { setBusy(false); reloadPlans() } } catch { /* 다음 틱 */ }
    }, 2000)
    return () => clearInterval(t)
  }, [view, reloadPlans])
  const remove = async () => {
    if (!view || !confirm('이 계획(초안)을 지웁니다.')) return
    setBusy(true)
    try { await api.deletePlan(view.plan.id); setView(null); await reloadPlans() } catch (e) { onError(errText(e)) } finally { setBusy(false) }
  }

  const rows = (view?.items ?? []).filter((x) => filter === 'all' ? true : filter === 'accepted' ? x.item.accepted && !x.item.error : filter === 'rejected' ? !x.item.accepted : !!x.item.error)
  const stats = view ? { total: view.items.length, accepted: view.items.filter((x) => x.item.accepted).length, done: view.items.filter((x) => x.item.injectionId).length, failed: view.items.filter((x) => x.item.error).length } : null
  const KIND: Record<string, string> = { VERBATIM: '그대로', LIGHT_EDIT: '국소 수정', VARIANT: '변형', MANUAL: '생성' }

  return (
    <div className="px-4 py-3 border-t border-line text-sm flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold tracking-widest text-muted">주입 계획</span>
        <span className="text-xs text-faint">{plans ? `${plans.length}개` : '…'}</span>
        <span className="flex-1" />
        {writable && <button className="btn" onClick={() => setOpen((v) => !v)}>{open ? '닫기' : '계획 JSON 올리기'}</button>}
      </div>
      {open && (
        <div className="flex flex-col gap-2">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} spellCheck={false} className="input mono text-xs"
            placeholder={'{"label":"9/16 자동 계획 v1","source":"seed-autopilot/1","items":[{"seedPostId":123,"wallclockAt":"2026-09-16T13:35:12Z","message":"…","kind":"VERBATIM"}, {"playbackSec":312.4,"ghostKey":"gen:7","message":"…","kind":"MANUAL","scene":"…","reason":"빈 구간"}]}'} />
          <div className="flex items-center gap-2 text-xs text-muted">
            <span>{parsed ? <>인식된 행 <b className="text-ink">{parsed.items.length}</b>개</> : text.trim() ? <span className="text-bad">JSON 형식이 아닙니다</span> : '파이프라인 산출물(plan.json)을 붙여 넣으세요'}</span>
            <span className="flex-1" />
            <button className="btn-primary" disabled={busy || !parsed || parsed.items.length === 0} onClick={upload}>올리기</button>
          </div>
        </div>
      )}
      {plans && plans.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {plans.map((p) => (
            <button key={p.id} className={`btn text-xs ${view?.plan.id === p.id ? 'ring-1 ring-accent' : ''}`} onClick={() => openPlan(p.id)}>
              #{p.id} {p.label ?? p.source ?? ''} <span className={p.status === 'EXECUTED' ? 'text-ok' : p.status === 'RUNNING' ? 'text-warn' : 'text-faint'}>{p.status === 'EXECUTED' ? '실행됨' : p.status === 'RUNNING' ? '주입 중' : '초안'}</span>
            </button>
          ))}
        </div>
      )}
      {view && stats && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
            <span>{view.plan.status === 'RUNNING' && <b className="text-warn">주입 중… </b>}전체 <b className="text-ink">{stats.total}</b> · 수락 <b className="text-ink">{stats.accepted}</b> · 주입됨 <b className="text-ink">{stats.done}</b>{stats.failed > 0 && <> · <span className="text-bad">실패 {stats.failed}</span></>}</span>
            <span className="text-faint">기준점 {view.anchorCount}개{view.anchorCount === 0 && ' (방영 시작 시각으로 환산 — 확장에서 기준점을 잡으면 더 정확)'}</span>
            <span className="flex-1" />
            <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="input text-xs py-0.5">
              <option value="all">전체</option><option value="accepted">수락</option><option value="rejected">거부</option><option value="failed">실패</option>
            </select>
            {writable && view.plan.status === 'DRAFT' && <button className="btn text-bad" disabled={busy} onClick={remove}>계획 삭제</button>}
            {writable && <button className="btn-primary" disabled={busy || view.plan.status === 'RUNNING' || stats.accepted - stats.done <= 0} onClick={execute}>{view.plan.status === 'RUNNING' ? `주입 중 ${stats.done + stats.failed}/${stats.accepted}` : `수락분 전체 주입 (${stats.accepted - stats.done})`}</button>}
          </div>
          <div className="max-h-[560px] overflow-auto border border-line rounded">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-soft text-[11px] text-muted"><tr>
                <th className="px-2 py-1 text-left">재생</th><th className="px-2 py-1 text-left">종류</th><th className="px-2 py-1 text-left">메시지</th><th className="px-2 py-1 text-left">장면 / 이유</th><th className="px-2 py-1 text-left">상태</th>
              </tr></thead>
              <tbody>
                {rows.map(({ item, previewSec, gap }) => (
                  <tr key={item.id} className={`border-t border-line align-top ${!item.accepted ? 'opacity-40' : ''} ${item.error ? 'bg-red-50/40' : ''}`}>
                    <td className="px-2 py-1 mono whitespace-nowrap">{fmtSec(previewSec)}{gap && <span className="text-warn" title="광고 중 글 — 다음 기준점에 붙음"> ⚠</span>}</td>
                    <td className="px-2 py-1 whitespace-nowrap">{KIND[item.kind]}{item.spoiler && <span className="text-warn"> 스포</span>}</td>
                    <td className="px-2 py-1">{item.message}</td>
                    <td className="px-2 py-1 text-faint">{item.scene}{item.reason && <div>{item.reason}</div>}</td>
                    <td className="px-2 py-1 whitespace-nowrap">
                      {item.injectionId ? <span className="text-ok">주입됨</span> : item.error ? <span className="text-bad" title={item.error}>실패</span>
                        : writable ? <button className="btn h-6 px-2 text-[11px]" onClick={() => toggle(item.id, !item.accepted)}>{item.accepted ? '거부' : '복원'}</button> : (item.accepted ? '수락' : '거부')}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={5} className="px-2 py-3 text-muted">행이 없습니다</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function CollectionPanel({ episode, collections, collectionId, setCollectionId, writable, reload, onError, onEpisodeChanged }: {
  episode: Episode; collections: Collection[]; collectionId: number | null; setCollectionId: (id: number | null) => void; writable: boolean; reload: () => void; onError: (m: string) => void; onEpisodeChanged: () => void
}) {
  const [busy, setBusy] = useState(false)
  const selected = collections.find((c) => c.id === collectionId) ?? null
  const active = collections.some((c) => c.status === 'QUEUED' || c.status === 'RUNNING')

  useEffect(() => {
    if (!active) return
    const t = setInterval(reload, 2000)
    return () => clearInterval(t)
  }, [active, reload])

  const start = async () => {
    setBusy(true)
    try { const c = await api.startCollection(episode.id); reload(); setCollectionId(c.id) }
    catch (e) { onError(errText(e)) } finally { setBusy(false) }
  }

  return (
    <div className="flex flex-col">
      <div className="px-4 py-3 border-b border-line flex items-center gap-3">
        {writable && <button className="btn-primary" disabled={busy || active} onClick={start}>{active ? '수집 진행 중…' : '수집 시작'}</button>}
        <span className="text-xs text-muted">디시·더쿠를 방영 구간으로 긁어 서버에 저장합니다. 요청 간격 1.2초 — 본방 한 회차에 2~5분.</span>
      </div>
      <ul className="p-2 flex flex-col gap-1 max-h-40 overflow-auto">
        {collections.length === 0 && <li className="px-3 py-2 text-sm text-muted">아직 수집한 적이 없습니다.</li>}
        {collections.map((c) => (
          <li key={c.id}>
            <button onClick={() => setCollectionId(c.id)} className={`w-full text-left rounded px-3 py-2 border flex items-center gap-3 ${c.id === collectionId ? 'border-info bg-infow' : 'border-transparent hover:bg-soft'}`}>
              <span className="mono text-xs text-faint">#{c.id}</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_CLASS[c.status]}`}>{STATUS_LABEL[c.status]}</span>
              <span className="text-sm">{c.postCount}건</span>
              <span className="text-xs text-muted mono ml-auto">{fmtKst(c.createdAt)}</span>
            </button>
          </li>
        ))}
      </ul>
      {selected && <CollectionDetail key={selected.id} collection={selected} episode={episode} writable={writable} reload={reload} onError={onError} onDeleted={() => setCollectionId(null)} onEpisodeChanged={onEpisodeChanged} />}
    </div>
  )
}

/* 글 목록은 "더 보기"로 넘기지 않는다 — 수천 건을 페이지로 넘기면 원하는 시각에 닿기까지 수십 번을 눌러야 했다
   (2026-09-20 조현빈). 대신 ① 시각으로 점프(입력칸 / 밀도 그래프 막대 클릭 → 그 분부터) ② 바닥에 닿으면 다음
   500건을 자동으로 이어 붙임 ③ 처음·끝 버튼. 시작점은 서버의 from(시각) 파라미터 하나로 처리한다. */
type Anchor = { from: string | null; order: 'asc' | 'desc' }

function CollectionDetail({ collection: c, episode, writable, reload, onError, onDeleted, onEpisodeChanged }: { collection: Collection; episode: Episode; writable: boolean; reload: () => void; onError: (m: string) => void; onDeleted: () => void; onEpisodeChanged: () => void }) {
  const [page, setPage] = useState<PostsPage | null>(null)
  const [items, setItems] = useState<Post[]>([])
  const [source, setSource] = useState<SourceKind | ''>('')
  const [anchor, setAnchor] = useState<Anchor>({ from: null, order: 'asc' })
  const [timeText, setTimeText] = useState('')
  const [busy, setBusy] = useState(false)
  const [view, setView] = useState<{ from: string; to: string } | null>(null) // 지금 화면에 보이는 글의 시각 범위
  const listRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef(0)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef(false)
  const finished = c.status === 'DONE' || c.status === 'FAILED' || c.status === 'CANCELLED'

  useEffect(() => {
    let alive = true
    api.posts(c.id, { source: source || undefined, from: anchor.from, order: anchor.order, size: 200 })
      .then((p) => { if (alive) { setPage(p); setItems(p.items); listRef.current?.scrollTo({ top: 0 }) } })
      .catch((e) => onError(errText(e)))
    return () => { alive = false }
  }, [c.id, c.status, c.postCount, source, anchor, onError])

  // 바닥 감시: 목록 끝의 빈 요소가 보이면 다음 500건을 붙인다. loadingRef 로 겹치는 요청을 막는다.
  useEffect(() => {
    const el = sentinelRef.current, root = listRef.current
    if (!el || !root || !page?.nextCursor) return
    const io = new IntersectionObserver(async (entries) => {
      if (!entries[0].isIntersecting || loadingRef.current) return
      loadingRef.current = true
      try {
        const p = await api.posts(c.id, { source: source || undefined, cursor: page.nextCursor, order: anchor.order, size: 500 })
        setPage(p); setItems((cur) => [...cur, ...p.items])
      } catch (e) { onError(errText(e)) } finally { loadingRef.current = false }
    }, { root, rootMargin: '200px' })
    io.observe(el)
    return () => io.disconnect()
  }, [c.id, source, anchor.order, page, onError])

  // 스크롤할 때마다 화면에 보이는 첫 행·끝 행의 시각을 읽어 그래프에 넘긴다. 행마다 data-at 을 달아 두고
  // offsetTop 으로 이진 탐색하므로 수천 행이어도 스크롤당 계산은 log n 이다. rAF 로 프레임당 한 번만 계산한다.
  const trackView = () => {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const root = listRef.current
      if (!root) return
      const rows = Array.from(root.querySelectorAll<HTMLTableRowElement>('tbody tr[data-at]'))
      if (rows.length === 0) { setView(null); return }
      const top = root.scrollTop, bottom = top + root.clientHeight
      let lo = 0, hi = rows.length - 1
      while (lo < hi) { const mid = (lo + hi) >>> 1; if (rows[mid].offsetTop + rows[mid].offsetHeight < top) lo = mid + 1; else hi = mid }
      const first = lo
      lo = first; hi = rows.length - 1
      while (lo < hi) { const mid = (lo + hi + 1) >>> 1; if (rows[mid].offsetTop < bottom) lo = mid; else hi = mid - 1 }
      const a = rows[first].dataset.at!, b = rows[lo].dataset.at!
      setView(a <= b ? { from: a, to: b } : { from: b, to: a })
    })
  }
  useEffect(() => { trackView() }, [items]) // 새로 불러온 뒤에도 갱신
  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  const jumpTo = (iso: string) => setAnchor({ from: iso, order: 'asc' })
  // HH:mm → 방영일 KST 의 그 시각. 수집 구간 시작보다 이르면(자정을 넘긴 시각) 다음날로 본다.
  const jumpToTime = () => {
    if (!/^\d{2}:\d{2}$/.test(timeText)) return
    let t = new Date(`${episode.airDate}T${timeText}:00+09:00`)
    if (t.getTime() < new Date(c.windowStartAt).getTime()) t = new Date(t.getTime() + 86400000)
    jumpTo(t.toISOString())
  }
  const act = async (fn: () => Promise<unknown>, after?: () => void) => { setBusy(true); try { await fn(); reload(); after?.() } catch (e) { onError(errText(e)) } finally { setBusy(false) } }

  return (
    <div className="border-t border-line">
      <div className="px-4 py-3 flex flex-col gap-1 text-sm">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_CLASS[c.status]}`}>{STATUS_LABEL[c.status]}</span>
          <span className="mono text-xs text-muted">구간 {fmtKst(c.windowStartAt)} ~ {fmtKst(c.windowEndAt)}</span>
          <span className="flex-1" />
          {finished && <button className="btn" disabled={busy} onClick={() => act(() => api.download(c.id))}>JSON 저장</button>}
          {writable && !finished && <button className="btn" disabled={busy} onClick={() => act(() => api.cancel(c.id))}>취소</button>}
          {writable && finished && <button className="btn text-bad" disabled={busy} onClick={() => { if (confirm(`수집 #${c.id} 결과 ${c.postCount}건을 지웁니다. 되돌릴 수 없습니다.`)) act(() => api.remove(c.id), onDeleted) }}>삭제</button>}
        </div>
        {c.progress && !finished && <div className="text-xs text-warn mono">{c.progress}</div>}
        {c.error && <div className="text-xs text-bad">{c.error}</div>}
        {page && (
          <div className="flex items-center gap-3 text-xs text-muted mt-1">
            <span>총 <b className="text-ink">{c.postCount}</b>건</span>
            {(Object.keys(SOURCE_LABEL) as SourceKind[]).map((k) => <span key={k}>{SOURCE_LABEL[k]} {page.countBySource[k] ?? 0}</span>)}
            <span className="flex-1" />
            <select value={source} onChange={(e) => setSource(e.target.value as SourceKind | '')} className="input text-xs py-0.5">
              <option value="">전체</option><option value="DCINSIDE">디시</option><option value="THEQOO">더쿠</option>
            </select>
          </div>
        )}
      </div>
      {finished && c.postCount > 0 && <DensityPanel collection={c} episode={episode} writable={writable} onError={onError} onEpisodeChanged={onEpisodeChanged} onJump={jumpTo} view={view} />}
      {page && c.postCount > 0 && (
        <div className="px-4 py-2 border-t border-line flex flex-wrap items-center gap-2 text-xs">
          <button className="btn h-6 px-2 text-[11px]" disabled={anchor.from === null && anchor.order === 'asc'} onClick={() => setAnchor({ from: null, order: 'asc' })}>처음</button>
          <button className="btn h-6 px-2 text-[11px]" disabled={anchor.order === 'desc'} onClick={() => setAnchor({ from: null, order: 'desc' })}>끝 (최신순)</button>
          <span className="text-faint ml-2">시각으로 이동</span>
          <input type="time" value={timeText} onChange={(e) => setTimeText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') jumpToTime() }} className="input text-xs py-0.5 w-24" />
          <button className="btn h-6 px-2 text-[11px]" disabled={!timeText} onClick={jumpToTime}>이동</button>
          <span className="flex-1" />
          <span className="text-faint mono">
            {anchor.order === 'desc' ? '최신 → 과거' : anchor.from ? `${fmtKst(anchor.from, { second: undefined })} 부터` : '구간 처음부터'} · 아래로 내리면 이어서 불러옵니다
          </span>
        </div>
      )}
      <div ref={listRef} onScroll={trackView} className="max-h-[520px] overflow-auto border-t border-line">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-soft text-[11px] text-muted"><tr><th className="text-left px-3 py-1.5 font-medium">시각(KST)</th><th className="text-left px-2 py-1.5 font-medium">출처</th><th className="text-left px-2 py-1.5 font-medium">제목</th><th className="text-left px-2 py-1.5 font-medium">작성자</th></tr></thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} data-at={p.postedAt} className="border-t border-line align-top">
                <td className="px-3 py-1.5 mono text-xs whitespace-nowrap text-ink2">{fmtKst(p.postedAt, p.precision === 'MINUTE' ? { second: undefined } : {})}{p.precision === 'MINUTE' && <span className="text-faint"> ±분</span>}</td>
                <td className="px-2 py-1.5 text-xs text-muted whitespace-nowrap">{SOURCE_LABEL[p.source]}</td>
                <td className="px-2 py-1.5">{p.sourceUrl ? <a href={p.sourceUrl} target="_blank" rel="noreferrer" className="hover:underline">{p.title}</a> : p.title}{p.body && <div className="text-xs text-muted mt-0.5 line-clamp-2">{p.body}</div>}</td>
                <td className="px-2 py-1.5 mono text-xs text-faint">{p.authorToken.slice(0, 6)}</td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={4} className="px-3 py-4 text-sm text-muted">{finished ? (anchor.from ? '이 시각 이후 글이 없습니다.' : '수집된 글이 없습니다.') : '수집이 끝나면 여기에 보입니다.'}</td></tr>}
          </tbody>
        </table>
        <div ref={sentinelRef} className="p-2 text-center text-[11px] text-faint">{page?.nextCursor ? '불러오는 중…' : items.length > 0 ? '끝' : ''}</div>
      </div>
    </div>
  )
}

/* 분당 밀도 그래프 + 시작·종료 제안(HP-434 후속). 제안은 자동 반영하지 않는다 — 이 값이 벽시계→재생시각 환산의
   기준이라, 사람이 그래프를 보고 "적용"을 눌러야 회차에 저장된다. */
function DensityPanel({ collection: c, episode, writable, onError, onEpisodeChanged, onJump, view }: { collection: Collection; episode: Episode; writable: boolean; onError: (m: string) => void; onEpisodeChanged: () => void; onJump: (iso: string) => void; view: { from: string; to: string } | null }) {
  const [d, setD] = useState<Density | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let alive = true
    api.density(c.id).then((x) => { if (alive) setD(x) }).catch((e) => onError(errText(e)))
    return () => { alive = false }
  }, [c.id, onError])
  if (!d) return <div className="px-4 py-2 text-xs text-muted border-t border-line">밀도 계산 중…</div>

  const W = 720, H = 90, n = d.buckets.length
  const max = Math.max(1, ...d.buckets.map((b) => b.count))
  const x = (iso: string) => ((new Date(iso).getTime() - new Date(d.from).getTime()) / 60000) / Math.max(1, n - 1) * W
  const apply = async (field: 'airStartAt' | 'airEndAt', value: string) => {
    setBusy(true)
    try {
      await api.updateEpisode(episode.id, { label: episode.label, airStartAt: field === 'airStartAt' ? value : episode.airStartAt, airEndAt: field === 'airEndAt' ? value : episode.airEndAt, runtimeSec: episode.runtimeSec, episodeId: episode.episodeId })
      onEpisodeChanged()
    } catch (e) { onError(errText(e)) } finally { setBusy(false) }
  }
  const Marker = ({ iso, color, label }: { iso: string | null; color: string; label: string }) => iso ? (
    <g><line x1={x(iso)} x2={x(iso)} y1={0} y2={H} stroke={color} strokeWidth={1.5} strokeDasharray="3 2" /><text x={x(iso) + 3} y={10} fontSize={9} fill={color}>{label}</text></g>
  ) : null

  return (
    <div className="px-4 py-3 border-t border-line flex flex-col gap-2">
      <div className="flex items-center gap-3 text-xs">
        <span className="font-semibold tracking-widest text-muted">분당 글 수</span>
        <span className="text-faint">{fmtKst(d.from, { second: undefined })} ~ {fmtKst(d.to, { second: undefined })} · 최대 {max}건/분 · 막대를 누르면 그 분의 글로 이동</span>
        {view && <span className="mono text-[11px] px-1.5 rounded" style={{ background: '#e0a12633', color: '#8a6508' }}>보는 중 {fmtKst(view.from, { second: undefined })} ~ {fmtKst(view.to, { second: undefined })}</span>}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-24 bg-soft rounded" preserveAspectRatio="none">
        {d.buckets.map((b, i) => <rect key={i} x={i / Math.max(1, n - 1) * W} y={H - (b.count / max) * H} width={Math.max(1, W / n)} height={(b.count / max) * H} fill="#9db4ff" />)}
        {/* 클릭 영역: 막대가 얇아 누르기 어려우므로 분마다 세로 전체를 덮는 투명 사각형을 둔다 */}
        {d.buckets.map((b, i) => <rect key={`h${i}`} x={i / Math.max(1, n - 1) * W} y={0} width={Math.max(1, W / n)} height={H} fill="transparent" className="cursor-pointer hover:fill-[#2f6da833]" onClick={() => onJump(b.at)}><title>{fmtKst(b.at, { second: undefined })} · {b.count}건</title></rect>)}
        {/* 목록에서 지금 보고 있는 글들의 시각 범위. 한 화면이 1분 안에 들어가도 보이도록 최소 폭을 준다 */}
        {view && <rect x={Math.min(x(view.from), W - 3)} y={0} width={Math.max(3, x(view.to) - x(view.from))} height={H} fill="#e0a12655" stroke="#b8860b" strokeWidth={1} pointerEvents="none" />}
        <Marker iso={episode.airStartAt} color="#2f6da8" label="시작(저장)" />
        <Marker iso={episode.airEndAt} color="#2f6da8" label="종료(저장)" />
        <Marker iso={d.suggestedStartAt} color="#b03030" label="시작 제안" />
        <Marker iso={d.suggestedEndAt} color="#b03030" label="종료 제안" />
      </svg>
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="text-muted">{d.note}</span>
        <span className="flex-1" />
        {d.suggestedStartAt && <span className="mono">시작 제안 {fmtKst(d.suggestedStartAt, { second: undefined })}{writable && d.suggestedStartAt !== episode.airStartAt && <button className="btn ml-2 h-6 px-2 text-[11px]" disabled={busy} onClick={() => apply('airStartAt', d.suggestedStartAt!)}>적용</button>}</span>}
        {d.suggestedEndAt && <span className="mono">종료 제안 {fmtKst(d.suggestedEndAt, { second: undefined })}{writable && d.suggestedEndAt !== episode.airEndAt && <button className="btn ml-2 h-6 px-2 text-[11px]" disabled={busy} onClick={() => apply('airEndAt', d.suggestedEndAt!)}>적용</button>}</span>}
      </div>
    </div>
  )
}
