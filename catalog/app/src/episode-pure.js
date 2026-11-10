// 회차 표기 규칙(HP-807) — 작품 탐색 화면 전부가 이 파일 하나로 회차를 적는다. React·DOM 없이 node 로 검사한다(scripts/test-episode.mjs).
// 규칙(2026-11-10 조현빈 팀장 결정):
//   ① 시즌은 플랫폼이 준 그대로 적는다 — 시즌 1도 붙인다('시즌1 3화'). 작품마다 예외를 두지 않는다.
//   ② 진짜 회차 번호가 없으면(영화, 잠정 회차의 자리 채움 번호) 회차 칸을 아예 쓰지 않는다 — '영화'·'1화'로 채우지 않는다.
//   ③ 회차 제목은 메타데이터다 — 회차를 가리키는 이름은 표기('시즌1 3화')이고, 제목은 그 뒤에 덧붙이는 정보다.
// 서버 계약(HP-807 BE): 회차를 싣는 응답에 contentType('MOVIE'|'SERIES')과 hasEpisodeNumber(영화·자리 채움이면 false)가 붙는다.
// 지금 운영 서버에는 두 필드가 없을 수 있어, 없으면 종전처럼 번호만 보고 판단한다(던지지 않고 'undefined' 를 적지 않는다).
// 정적 페이지 두 곳(docs/overlay/index.html · docs/invite/index.html)은 이 파일을 import 하지 못해 같은 규칙의 작은 사본
// (formatEpisodeLabel)을 둔다 — 규칙을 바꾸면 세 곳을 함께 고친다. scripts/test-episode.mjs 가 세 곳의 결과를 견준다.

/** 진짜 회차 번호가 있는가 — 영화거나(e.contentType 또는 넘긴 contentType), 서버가 hasEpisodeNumber=false 로 알렸거나,
 *  번호가 양의 정수가 아니면(null·0·누락) false. */
export function hasEpisodeNumber(e, contentType) {
  if (!e || typeof e !== 'object') return false
  if (contentType === 'MOVIE' || e.contentType === 'MOVIE') return false
  if (e.hasEpisodeNumber === false) return false
  const n = e.episodeNumber
  return typeof n === 'number' && Number.isFinite(n) && n > 0
}

/** 시즌 칸 — '시즌2'. 시즌이 양수가 아니면(모름·0) ''. */
export function seasonLabel(seasonNumber) {
  return typeof seasonNumber === 'number' && Number.isFinite(seasonNumber) && seasonNumber > 0 ? `시즌${seasonNumber}` : ''
}

/** 회차 표기 — '시즌1 3화' · '3화'(시즌 모름) · ''(영화·자리 채움·번호 없음). */
export function episodeLabel(e, contentType) {
  if (!hasEpisodeNumber(e, contentType)) return ''
  const s = seasonLabel(e.seasonNumber)
  return (s ? s + ' ' : '') + `${e.episodeNumber}화`
}

const norm = (v) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '')

/** 쓸 만한 회차 제목 — 비었거나, 작품명과 같거나(영화는 플랫폼이 회차 제목에 작품명을 넣는다), 회차 표기와 같은 말이면
 *  ('7화'·'제 7화'·'Episode 7' 제목 → '시즌1 7화 · 7화' 가 되지 않게) ''. 그 밖엔 앞뒤 공백만 걷어 그대로. */
export function episodeTitle(title, e, work, contentType) {
  const t = norm(title)
  if (!t) return ''
  if (work && t === norm(work)) return ''
  const label = episodeLabel(e, contentType)
  if (label && (t === label || sameNumberOnly(t, e.episodeNumber))) return ''
  return t
}
// 번호만 적은 제목인가 — '7화'·'제 7화'·'제7화'·'Episode 7'·'Ep. 7'·'에피소드 7'(같은 번호일 때만).
function sameNumberOnly(t, n) {
  const m = /^(?:제\s*)?(\d+)\s*화$/.exec(t) || /^(?:episode|ep\.?|에피소드)\s*(\d+)$/i.exec(t)
  return !!m && Number(m[1]) === n
}

/** 비지 않은 칸만 sep 로 잇는다 — ', 1:19:37 근처' 처럼 빈 칸 앞에 구분자가 남지 않게. */
export function joinParts(parts, sep) {
  return parts.filter((p) => typeof p === 'string' && p.trim() !== '').join(sep)
}

/** 회차 한 줄 — 표기와 제목을 잇는다('시즌1 3화 · 제목'). 하나만 있으면 그것, 둘 다 없으면(영화) ''. */
export function episodeLine(e, title, work, contentType) {
  return joinParts([episodeLabel(e, contentType), episodeTitle(title, e, work, contentType)], ' · ')
}

/** 회차 이름 — 칩·카드 제목처럼 짧은 자리. 표기가 있으면 표기, 없으면 쓸 만한 제목, 둘 다 없으면 ''. */
export function episodeName(e, title, work, contentType) {
  return episodeLabel(e, contentType) || episodeTitle(title, e, work, contentType)
}
