/* 아카이브 2026-09-05 — 큐레이션 홈 '이 회차의 뜨거운 순간'의 가로 시간축 구성.
   큐레이션 페이지보다 랜딩·대시보드에 어울린다는 판단으로 홈에서는 뺐고,
   랜딩(HP-87) 개선 때 재사용 후보로 보관한다. 의존: primitives.tsx 의
   Waveform/waveform/Reveal/ReactionBar/REACTION_TEXT/Chip/SectionHead/MoreLink,
   data.ts 의 FEATURE_MOMENTS/FEATURE_DURATION/netflixWatchUrl. */

/* ═══ 이 회차의 뜨거운 순간 ═══════════════════════════════════
   이 섹션의 실체는 "62:30 안의 다섯 지점"이다. 그래서 데스크톱에서는
   가로 시간축을 화면 폭 전체에 깔고, 순간 카드를 실제 시각 위치에
   매단다 — 12:40 은 왼쪽 1/5, 57:05 는 오른쪽 끝. 카드 사이 간격이
   곧 시간 간격이라 구성이 데이터에서 나온다. 가까운 순간끼리 겹치지
   않도록 위·아래 두 줄에 번갈아 건다. 1위(41:20)만 크고 붉다.
   좁은 화면은 같은 내용을 세로 타임라인으로 내린다. */
function dominant(r: Reaction) {
  return REACTION_LABELS.reduce((a, b) => (r[b.key] > r[a.key] ? b : a))
}

const HOT_WAVE = waveform(160, FEATURE_DURATION, FEATURE_MOMENTS, 31)

function MomentCard({ m, idx, peak }: { m: Moment; idx: number; peak: boolean }) {
  const d = dominant(m.reaction)
  return (
    <a
      href={netflixWatchUrl(FEATURE_NETFLIX_ID, m.sec)}
      target="_blank"
      rel="noopener"
      title={`넷플릭스에서 ${m.at}부터 보기`}
      className={`group flex h-full flex-col rounded-md bg-raise ring-1 transition-shadow hover:shadow-[0_10px_30px_rgba(16,16,24,0.10)] ${
        peak ? 'p-5 ring-accent/30 shadow-[0_8px_28px_rgba(229,9,20,0.10)]' : 'p-4 ring-line'
      }`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span
          className={`num font-mono font-extrabold leading-none tracking-[-0.03em] ${
            peak ? 'text-[34px] text-accent' : 'text-[19px] text-ink'
          }`}
        >
          {m.at}
        </span>
        <span className={`num font-mono font-bold ${peak ? 'text-[15px] text-accent' : 'text-[12.5px] text-muted'}`}>
          {m.score}
        </span>
      </div>
      <h3 className={`mt-2 ${peak ? 'text-[20px]' : 'text-[15px]'}`}>{m.name}</h3>
      <blockquote className={`mt-1.5 line-clamp-2 ${peak ? 'text-[14px] leading-snug text-ink2' : 'text-[12.5px] leading-snug text-muted'}`}>
        “{m.quote}”
      </blockquote>
      <div className="mt-auto pt-3">
        {peak ? (
          <ReactionBar reaction={m.reaction} />
        ) : (
          <span className={`text-[12px] font-bold ${REACTION_TEXT[d.cls]}`}>
            {d.label} <span className="num font-mono">{m.reaction[d.key]}%</span>
          </span>
        )}
      </div>
      {peak && (
        <span className="mt-4 inline-flex w-fit items-center gap-2 whitespace-nowrap rounded-btn bg-accent px-3.5 py-2 text-[13px] font-bold text-white transition-all group-hover:brightness-110">
          <PlayIcon size={13} weight="fill" />
          넷플릭스에서 {m.at}부터 보기
          <ArrowUpRightIcon size={12} weight="bold" className="opacity-80" />
        </span>
      )}
      <span className="sr-only">순간 {idx + 1}</span>
    </a>
  )
}

function HotMoments() {
  return (
    <section className={`border-t border-line ${SEC}`}>
      <SectionHead
        title="이 회차의 뜨거운 순간"
        chip={<Chip>나는 솔로 22기 8화</Chip>}
        note="62:30 안에서 다섯 지점, 카드 위치가 곧 시각"
        action={<MoreLink>순간 이어 보기</MoreLink>}
      />

      {/* ── 데스크톱: 가로 시간축 ── */}
      <div className="hidden lg:block">
        <Waveform
          values={HOT_WAVE}
          height={72}
          active={[PEAK.sec / FEATURE_DURATION - 0.014, PEAK.sec / FEATURE_DURATION + 0.014]}
        />
        {/* 축. 양 끝 시각을 적어 카드 위치가 절대 시각으로 읽히게 한다. */}
        <div className="relative mt-2 h-px bg-line2">
          <span className="num absolute left-0 top-2 font-mono text-[10.5px] text-faint">00:00</span>
          <span className="num absolute right-0 top-2 font-mono text-[10.5px] text-faint">62:30</span>
          {FEATURE_MOMENTS.map((m) => (
            <span
              key={m.id}
              className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-4 ring-warm ${
                m.score === 100 ? 'size-[11px] bg-accent' : 'size-[7px] bg-ink/60'
              }`}
              style={{ left: `${(m.sec / FEATURE_DURATION) * 100}%` }}
            />
          ))}
        </div>

        {/* 카드가 걸리는 판. 두 줄에 나눠 건다 — 이웃한 순간끼리 겹치지 않고,
            1위는 아랫줄 가운데에 가장 크게 앉아 구성의 무게중심이 된다.
            줄 배정은 시각 간격을 보고 정한 값이라 순간 수가 바뀌면 다시 본다. */}
        <div className="relative h-[484px]">
          {FEATURE_MOMENTS.map((m, i) => {
            const peak = m.score === 100
            const pct = (m.sec / FEATURE_DURATION) * 100
            const lower = [false, true, true, false, true][i] ?? i % 2 === 1
            const w = peak ? 280 : 200
            const top = lower ? 212 : 28
            return (
              <div key={m.id}>
                {/* 축에서 카드까지 내려오는 줄기 */}
                <span
                  className={`absolute top-0 w-px ${peak ? 'bg-accent/50' : 'bg-line2'}`}
                  style={{ left: `${pct}%`, height: top }}
                  aria-hidden
                />
                <div
                  className="absolute"
                  style={{
                    left: `clamp(0px, calc(${pct}% - ${w / 2}px), calc(100% - ${w}px))`,
                    top,
                    width: w,
                    height: peak ? 264 : 156,
                  }}
                >
                  <Reveal delay={i * 0.05} className="h-full">
                    <MomentCard m={m} idx={i} peak={peak} />
                  </Reveal>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 좁은 화면: 세로 타임라인 ── */}
      <ol className="relative mt-4 lg:hidden">
        <div className="absolute bottom-4 left-[11.5px] top-4 w-px bg-line2" aria-hidden />
        {FEATURE_MOMENTS.map((m, i) => {
          const peak = m.score === 100
          return (
            <Reveal key={m.id} as="li" delay={i * 0.05}>
              <div className={`grid grid-cols-[24px_1fr] gap-x-4 ${peak ? 'py-4' : 'py-3'}`}>
                <span className="flex justify-center pt-[6px]">
                  <span className={`block rounded-full ring-4 ring-warm ${peak ? 'size-[11px] bg-accent' : 'size-[7px] bg-ink/55'}`} />
                </span>
                <div className={peak ? 'min-h-[260px]' : 'min-h-[132px]'}>
                  <MomentCard m={m} idx={i} peak={peak} />
                </div>
              </div>
            </Reveal>
          )
        })}
      </ol>
    </section>
  )
}

