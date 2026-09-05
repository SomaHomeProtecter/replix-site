/* 시안용 예시 데이터. 실제로는 서버에서 내려온다.
   수치 규칙(랜딩 HP-87 선례): 절대 수치를 노출하지 않는다. 순위와 상대
   강도(리플릭스 지수 0~100)만 쓴다. 예외는 "지금 N명"(라이브 인원)으로,
   실제로 그 순간 접속해 있는 사람 수라 과장이 아니다. */

export type Reaction = { joy: number; surprise: number; moved: number }

export type Moment = {
  id: string
  at: string
  sec: number
  name: string
  reaction: Reaction
  score: number
  quote: string
  writer: string
}

export type Episode = {
  id: string
  label: string
  peakName: string
  moments: Moment[]
  score: number
}

export type Work = {
  id: string
  title: string
  unit: string
  genre: '예능' | '드라마'
  score: number
  live?: number
  episodeLabel: string
  momentCount: number
}

export const REACTION_LABELS: { key: keyof Reaction; label: string; cls: string }[] = [
  { key: 'joy', label: '웃음', cls: 'joy' },
  { key: 'surprise', label: '놀람', cls: 'surprise' },
  { key: 'moved', label: '감동', cls: 'moved' },
]

/* ── 홈: 오늘의 작품 순위 ──────────────────────────────────── */

export const RANKING: Work[] = [
  { id: 'solo', title: '나는 솔로', unit: '22기', genre: '예능', score: 100, live: 37, episodeLabel: '22기 8화', momentCount: 5 },
  { id: 'chef', title: '흑백요리사', unit: '시즌1', genre: '예능', score: 82, live: 14, episodeLabel: '시즌1 6화', momentCount: 3 },
  { id: 'devil', title: '데블스 플랜', unit: '시즌2', genre: '예능', score: 71, live: 9, episodeLabel: '시즌2 4화', momentCount: 4 },
  { id: 'exchange', title: '환승연애', unit: '시즌4', genre: '예능', score: 68, live: 5, episodeLabel: '시즌4 9화', momentCount: 4 },
  { id: 'itaewon', title: '이태원 클라쓰', unit: '12화', genre: '드라마', score: 64, episodeLabel: '12화', momentCount: 2 },
  { id: 'hell', title: '솔로지옥', unit: '시즌5', genre: '예능', score: 58, live: 3, episodeLabel: '시즌5 3화', momentCount: 2 },
  { id: 'physical', title: '피지컬: 100', unit: '시즌3', genre: '예능', score: 55, live: 7, episodeLabel: '시즌3 5화', momentCount: 3 },
  { id: 'moving', title: '무빙', unit: '14화', genre: '드라마', score: 51, episodeLabel: '14화', momentCount: 2 },
  { id: 'glory', title: '더 글로리', unit: '파트2', genre: '드라마', score: 47, episodeLabel: '파트2 4화', momentCount: 2 },
  { id: 'maskgirl', title: '마스크걸', unit: '6화', genre: '드라마', score: 44, episodeLabel: '6화', momentCount: 1 },
  { id: 'siren', title: '사이렌: 불의 섬', unit: '8화', genre: '예능', score: 41, live: 2, episodeLabel: '8화', momentCount: 2 },
  { id: 'suits', title: '슈츠', unit: '시즌3', genre: '드라마', score: 38, episodeLabel: '시즌3 4화', momentCount: 1 },
]

/* ── 장르 레일 ─────────────────────────────────────────────── */

export const GENRE_RAILS: Record<'예능' | '드라마', Work[]> = {
  예능: [
    { id: 'solo', title: '나는 솔로', unit: '22기', genre: '예능', score: 100, episodeLabel: '22기', momentCount: 5 },
    { id: 'chef', title: '흑백요리사', unit: '시즌1', genre: '예능', score: 82, episodeLabel: '시즌1', momentCount: 3 },
    { id: 'devil', title: '데블스 플랜', unit: '시즌2', genre: '예능', score: 71, episodeLabel: '시즌2', momentCount: 4 },
    { id: 'exchange', title: '환승연애', unit: '시즌4', genre: '예능', score: 68, episodeLabel: '시즌4', momentCount: 4 },
    { id: 'hell', title: '솔로지옥', unit: '시즌5', genre: '예능', score: 58, episodeLabel: '시즌5', momentCount: 2 },
    { id: 'physical', title: '피지컬: 100', unit: '시즌3', genre: '예능', score: 55, episodeLabel: '시즌3', momentCount: 3 },
    { id: 'korea1', title: '코리아 넘버원', unit: '시즌2', genre: '예능', score: 42, episodeLabel: '시즌2', momentCount: 2 },
    { id: 'celeb', title: '셀럽은 회의 중', unit: '9화', genre: '예능', score: 34, episodeLabel: '9화', momentCount: 1 },
    { id: 'tiki', title: '두 발로 티키타카', unit: '4화', genre: '예능', score: 29, episodeLabel: '4화', momentCount: 1 },
  ],
  드라마: [
    { id: 'itaewon', title: '이태원 클라쓰', unit: '12화', genre: '드라마', score: 64, episodeLabel: '12화', momentCount: 2 },
    { id: 'moving', title: '무빙', unit: '14화', genre: '드라마', score: 51, episodeLabel: '14화', momentCount: 2 },
    { id: 'glory', title: '더 글로리', unit: '파트2', genre: '드라마', score: 47, episodeLabel: '파트2', momentCount: 2 },
    { id: 'maskgirl', title: '마스크걸', unit: '6화', genre: '드라마', score: 44, episodeLabel: '6화', momentCount: 1 },
    { id: 'siren2', title: '사이렌: 불의 섬', unit: '8화', genre: '드라마', score: 41, episodeLabel: '8화', momentCount: 2 },
    { id: 'suits', title: '슈츠', unit: '시즌3', genre: '드라마', score: 38, episodeLabel: '시즌3', momentCount: 1 },
    { id: 'zombie', title: '지금 우리 학교는', unit: '9화', genre: '드라마', score: 33, episodeLabel: '9화', momentCount: 1 },
    { id: 'sweet', title: '스위트홈', unit: '시즌3', genre: '드라마', score: 28, episodeLabel: '시즌3', momentCount: 1 },
    { id: 'kingdom', title: '킹덤', unit: '시즌2', genre: '드라마', score: 24, episodeLabel: '시즌2', momentCount: 1 },
  ],
}

/* ── 대상 회차(나는 솔로 22기 8화) ────────────────────────── */

export const FEATURE_DURATION = 3750 // 62:30

export const FEATURE_MOMENTS: Moment[] = [
  {
    id: 'm1', at: '12:40', sec: 760, name: '첫 갈등', score: 62,
    reaction: { joy: 30, surprise: 52, moved: 18 },
    quote: '영수님 표정 왜 저래 벌써', writer: '영',
  },
  {
    id: 'm2', at: '27:14', sec: 1634, name: '분위기 반전', score: 71,
    reaction: { joy: 64, surprise: 22, moved: 14 },
    quote: '이걸 저기서 꺼낸다고?', writer: '현',
  },
  {
    id: 'm3', at: '41:20', sec: 2480, name: '최종 선택 직전', score: 100,
    reaction: { joy: 22, surprise: 58, moved: 20 },
    quote: '정숙님 표정 진짜 봐야 됨 이건', writer: '다',
  },
  {
    id: 'm4', at: '49:02', sec: 2942, name: '고백', score: 84,
    reaction: { joy: 18, surprise: 26, moved: 56 },
    quote: '아 손 떨리는 거 보인다', writer: '수',
  },
  {
    id: 'm5', at: '57:05', sec: 3425, name: '엔딩 직전', score: 78,
    reaction: { joy: 26, surprise: 50, moved: 24 },
    quote: '다음 화 예고 왜 이래', writer: '준',
  },
]

export const FEATURE_REACTION: Reaction = { joy: 58, surprise: 26, moved: 16 }

/* ── 홈: 이번 주 인기 순간 (작품을 가로질러) ───────────────── */

export type CrossMoment = {
  work: string
  episode: string
  at: string
  name: string
  quote: string
  writer: string
  top: { label: string; pct: number; cls: string }
}

export const CROSS_MOMENTS: CrossMoment[] = [
  { work: '흑백요리사', episode: '시즌1 6화', at: '27:05', name: '심사위원 침묵', quote: '손 떨리는 거 보이냐', writer: 'ㅎ', top: { label: '놀람', pct: 62, cls: 'surprise' } },
  { work: '데블스 플랜', episode: '시즌2 4화', at: '58:44', name: '선택의 순간', quote: '여기서 저 선택을 한다고?', writer: 'ㅁ', top: { label: '놀람', pct: 64, cls: 'surprise' } },
  { work: '환승연애', episode: '시즌4 9화', at: '12:33', name: '말없는 대화', quote: '자막 없어도 표정이 다 말함', writer: 'ㅅ', top: { label: '감동', pct: 62, cls: 'moved' } },
  { work: '이태원 클라쓰', episode: '12화', at: '44:02', name: '재회', quote: '이 장면 다시 봐도 소름', writer: 'ㅇ', top: { label: '감동', pct: 60, cls: 'moved' } },
  { work: '솔로지옥', episode: '시즌5 3화', at: '22:18', name: '폭소', quote: '여기서 나가는 거 실화냐', writer: 'ㅂ', top: { label: '웃음', pct: 74, cls: 'joy' } },
  { work: '슈츠', episode: '시즌3 4화', at: '31:18', name: '명대사', quote: '대사 미쳤다 진짜', writer: 'ㅈ', top: { label: '감동', pct: 50, cls: 'moved' } },
]

/* ── 상세: 회차 ────────────────────────────────────────────── */

const mk = (at: string, sec: number, name: string, r: Reaction, quote = '', writer = ''): Moment => ({
  id: `${at}-${name}`, at, sec, name, reaction: r, score: 0, quote, writer,
})

export const EPISODES: Episode[] = [
  { id: 'e8', label: '8화', peakName: '최종 선택 직전', score: 100, moments: FEATURE_MOMENTS },
  {
    id: 'e7', label: '7화', peakName: '3일차 데이트', score: 80,
    moments: [
      mk('15:02', 902, '아침 대화', { joy: 48, surprise: 30, moved: 22 }, '아침부터 저 텐션 뭐야', '영'),
      mk('36:40', 2200, '3일차 데이트', { joy: 38, surprise: 40, moved: 22 }, '데이트 상대 바뀐 거 눈치챈 사람', '수'),
      mk('52:11', 3131, '자유 선택', { joy: 26, surprise: 52, moved: 22 }, '여기서 저 사람 고른다고?', '현'),
    ],
  },
  {
    id: 'e9', label: '9화', peakName: '최종 선택', score: 74,
    moments: [
      mk('20:18', 1218, '마지막 데이트', { joy: 34, surprise: 28, moved: 38 }, '마지막인데 둘 다 말이 없네', '다'),
      mk('44:55', 2695, '최종 선택', { joy: 20, surprise: 56, moved: 24 }, '와 진짜 예상 못 함', '준'),
      mk('58:02', 3482, '결과 발표', { joy: 24, surprise: 44, moved: 32 }, '커플 성사 축하 근데 왜 내가 울지', '민'),
    ],
  },
  {
    id: 'e5', label: '5화', peakName: '자기소개', score: 72,
    moments: [
      mk('10:44', 644, '자기소개', { joy: 62, surprise: 24, moved: 14 }, '자기소개에서 벌써 캐릭터 잡힘', '영'),
      mk('32:08', 1928, '첫 대화', { joy: 50, surprise: 32, moved: 18 }, '첫 대화 어색함 화면 뚫고 나옴', '수'),
      mk('54:30', 3270, '밤 산책', { joy: 30, surprise: 28, moved: 42 }, '밤 산책 분위기 이번 기수 최고', '현'),
    ],
  },
  {
    id: 'e4', label: '4화', peakName: '입주', score: 61,
    moments: [
      mk('18:20', 1100, '입주', { joy: 58, surprise: 30, moved: 12 }, '입주하자마자 짐 푸는 순서로 성격 보임', '다'),
      mk('41:02', 2462, '첫 인사', { joy: 44, surprise: 34, moved: 22 }, '인사 한 번에 관계도 정리됨', '준'),
    ],
  },
  {
    id: 'e6', label: '6화', peakName: '첫인상 선택', score: 58,
    moments: [
      mk('24:30', 1470, '첫인상 선택', { joy: 40, surprise: 44, moved: 16 }, '첫인상 선택 결과 아무도 예상 못 했지', '민'),
      mk('47:12', 2832, '저녁 식사', { joy: 52, surprise: 26, moved: 22 }, '저녁 식사 자리 배치가 다 말해 줌', '영'),
    ],
  },
  {
    id: 'e10', label: '10화', peakName: '에필로그', score: 49,
    moments: [mk('33:40', 2020, '에필로그', { joy: 28, surprise: 22, moved: 50 }, '에필로그 보고 나서야 이해됨', '수')],
  },
]

/* 회차별 반응 분포. 11~14화는 데이터가 없다 (지어내지 않는다). */
export const EPISODE_DISTRIBUTION: { ep: number; score: number | null }[] = [
  { ep: 1, score: 22 }, { ep: 2, score: 31 }, { ep: 3, score: 28 }, { ep: 4, score: 61 },
  { ep: 5, score: 72 }, { ep: 6, score: 58 }, { ep: 7, score: 80 }, { ep: 8, score: 100 },
  { ep: 9, score: 74 }, { ep: 10, score: 49 },
  { ep: 11, score: null }, { ep: 12, score: null }, { ep: 13, score: null }, { ep: 14, score: null },
]

export const WORK_REACTION: Reaction = { joy: 54, surprise: 28, moved: 18 }

/* ── 상세: 대표 채팅 (41:20 구간) ─────────────────────────── */

export type Chat = { id: string; writer: string; at: string; body: string; likes: number; replies: number }

/** 넷플릭스 재생 딥링크. 사용자의 브라우저가 넷플릭스 페이지로 이동하는
 *  것이지 서버가 넷플릭스에 요청을 보내는 것이 아니다(규칙 문서 §7 경계 안).
 *  `t` 는 초 단위 시작 위치. 시안에서는 나는 솔로 22기 8화 회차 ID 를 모르므로
 *  작품 ID 로 대신한다 — 실제로는 회차(episode) ID 가 들어가야 한다. */
export const FEATURE_NETFLIX_ID = '81551819'
export function netflixWatchUrl(id: string, sec?: number) {
  return `https://www.netflix.com/watch/${id}${sec !== undefined ? `?t=${sec}` : ''}`
}

/** 지수의 한 줄 정의. 화면 어디서든 같은 문장을 쓴다. */
export const SCORE_DEFINITION = '채팅과 반응을 합산한 상대 지수. 오늘 1위 회차가 100'

export const CHATS: Chat[] = [
  { id: 'c1', writer: '영', at: '41:18', body: '정숙님 표정 진짜 봐야 됨 이건 편집이 아니라 그냥 실시간이었을 듯', likes: 34, replies: 6 },
  { id: 'c2', writer: '현', at: '41:22', body: '아니 이 타이밍에 저 말을 한다고', likes: 28, replies: 3 },
  { id: 'c3', writer: '다', at: '41:25', body: '제작진 편집 미쳤다 진짜 여기서 끊는 거 봐', likes: 21, replies: 9 },
  { id: 'c4', writer: '수', at: '41:31', body: '벌써 손에 땀남', likes: 17, replies: 2 },
  { id: 'c5', writer: '준', at: '41:38', body: '다들 같은 데서 소리 지르는 거 웃기다', likes: 12, replies: 4 },
  { id: 'c6', writer: '민', at: '41:44', body: '이 회차만 세 번째 보는 중', likes: 9, replies: 1 },
]

/* 순간별 대표 채팅. 순간을 고르면 실제로 내용이 바뀌어야 상호작용이 믿긴다. */
export const CHATS_BY_MOMENT: Record<string, Chat[]> = {
  m1: [
    { id: 'a1', writer: '영', at: '12:38', body: '영수님 표정 왜 저래 벌써', likes: 21, replies: 4 },
    { id: 'a2', writer: '수', at: '12:41', body: '시작부터 이러면 뒤에 뭐가 남음', likes: 15, replies: 2 },
    { id: 'a3', writer: '민', at: '12:47', body: '카메라 감독 눈치 빠르다 바로 잡네', likes: 9, replies: 1 },
  ],
  m2: [
    { id: 'b1', writer: '현', at: '27:12', body: '이걸 저기서 꺼낸다고? 미쳤다', likes: 30, replies: 5 },
    { id: 'b2', writer: '다', at: '27:16', body: '아 웃겨 다들 표정 굳음', likes: 22, replies: 3 },
    { id: 'b3', writer: '준', at: '27:20', body: '편집점 여기가 이번 기수 최고', likes: 11, replies: 2 },
  ],
  m3: CHATS,
  m4: [
    { id: 'd1', writer: '수', at: '49:00', body: '아 손 떨리는 거 보인다', likes: 27, replies: 3 },
    { id: 'd2', writer: '영', at: '49:05', body: '여기서 울면 지는 건데 이미 늦음', likes: 19, replies: 6 },
    { id: 'd3', writer: '민', at: '49:11', body: '배경음악 타이밍 너무 정확함', likes: 8, replies: 1 },
  ],
  m5: [
    { id: 'e1', writer: '준', at: '57:03', body: '다음 화 예고 왜 이래', likes: 24, replies: 7 },
    { id: 'e2', writer: '현', at: '57:08', body: '일주일 어떻게 기다림', likes: 16, replies: 2 },
    { id: 'e3', writer: '다', at: '57:14', body: '예고에 나온 그 장면 진짜인지 아닌지 내기', likes: 10, replies: 4 },
  ],
}

export const ALSO_WATCHED = ['환승연애', '흑백요리사', '솔로지옥', '데블스 플랜', '이태원 클라쓰', '슈츠']

/* ── 포스터 (TMDB) ──────────────────────────────────────────
   넷플릭스에서 꺼내오지 않는다. 왜 그 구분이 중요한지는 개발 규칙 'B 보충',
   API 사용법·매칭 절차는 docs/tmdb-integration.md 가 정본이다.

   아래 값은 2026-09-04 에 **실제 TMDB API 로** 매칭 절차를 돌려 얻은 결과다
   (검색 → 상위 4개 후보 상세 조회 → 제목 일치 + 넷플릭스 KR 제공 보강).
   결과: confirmed 13 · provisional 4 · 없음 1, **틀린 확정 0건**.

   ⚠️ `status` 를 지우지 말 것. provisional 은 "포스터는 보여 주되 사람이
      확인해야 한다"는 뜻이다. 화면은 둘을 구분해 그리지 않는다 — 확신이
      없다고 자리를 비우면 그게 더 나쁘기 때문이다.
   ⚠️ `type` 을 반드시 본다. tv 와 movie 는 id 네임스페이스가 다르다.
      `셀럽은 회의 중` 은 TV 항목이 없고 영화만 있다. */

/** 이미지 주소의 앞 두 조각. TMDB `/configuration` 의 `images.secure_base_url`
 *  과 `poster_sizes` 에서 온 값이다(2026-09-04 실호출 확인).
 *  ⚠️ 서버 구현에서는 이렇게 박지 말고 기동 시 `/configuration` 을 받아 캐시한다.
 *     TMDB 가 크기 목록을 바꿀 수 있다. 시안이라 고정해 둔 것뿐이다. */
export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/'
export const TMDB_POSTER_SIZE = 'w500'

export type PosterRef = {
  tmdbId: string
  /** tv 와 movie 는 서로 다른 id 공간이다. */
  type: 'tv' | 'movie'
  /** TMDB `poster_path`. 전체 URL 이 아니라 경로만 저장한다. */
  posterPath: string
  /** 매칭 확신도. provisional 은 사람 확인 대기. */
  status: 'confirmed' | 'provisional'
  /** 넷플릭스 작품 ID. 없으면 넷플릭스에서 서비스하지 않는 작품이다. */
  netflixId?: string
}

export const POSTERS: Record<string, PosterRef> = {
  '나는 솔로': { tmdbId: '129236', type: 'tv', posterPath: '/ee5oS2TMiImM4m1rYTn1GpnCLTZ.jpg', status: 'confirmed', netflixId: '81551819' },
  '더 글로리': { tmdbId: '136283', type: 'tv', posterPath: '/v2PhLwwWkeodAuF1ePtlIn5m2VI.jpg', status: 'confirmed', netflixId: '81519223' },
  '데블스 플랜': { tmdbId: '214582', type: 'tv', posterPath: '/q8ED7O2RM5pXCafMQuBKragWqPz.jpg', status: 'confirmed', netflixId: '81653386' },
  '마스크걸': { tmdbId: '156888', type: 'tv', posterPath: '/urnfhsTOFtLuW61GFKS3OXCDMZl.jpg', status: 'confirmed', netflixId: '81516491' },
  '무빙': { tmdbId: '126485', type: 'tv', posterPath: '/b9MhD5syJ7TbYSeje4wB4oyTzc7.jpg', status: 'provisional' },  // 넷플릭스 아님(디즈니+)
  '사이렌: 불의 섬': { tmdbId: '226907', type: 'tv', posterPath: '/itAOFWuejY9Xdk1XaVxPtHN7q2M.jpg', status: 'confirmed', netflixId: '81631016' },
  '셀럽은 회의 중': { tmdbId: '929373', type: 'movie', posterPath: '/daTMww6IVLvgyof9orQGa7KuTeM.jpg', status: 'confirmed' },
  '솔로지옥': { tmdbId: '139798', type: 'tv', posterPath: '/tF3G9yCgmTzcAWx22c7fZZLRURk.jpg', status: 'provisional', netflixId: '81436209' },  // 제목 일치 후보 여럿
  '슈츠': { tmdbId: '37680', type: 'tv', posterPath: '/lvYWwQj89ioSk9WzhC1KEujmpWa.jpg', status: 'confirmed', netflixId: '70195800' },
  '스위트홈': { tmdbId: '96648', type: 'tv', posterPath: '/kJEcSBMPacDJuAihPNmcUEgon1Y.jpg', status: 'confirmed', netflixId: '81061734' },
  '이태원 클라쓰': { tmdbId: '96162', type: 'tv', posterPath: '/2tTMci6Hq99gkagpYe19RulNXRr.jpg', status: 'confirmed', netflixId: '81193309' },
  '지금 우리 학교는': { tmdbId: '99966', type: 'tv', posterPath: '/d9yefq8dNke4UbuqStBtUcO9TxD.jpg', status: 'confirmed', netflixId: '81237994' },
  '코리아 넘버원': { tmdbId: '213471', type: 'tv', posterPath: '/g62L2NHcTUfBuNTX3fWQx3knoIA.jpg', status: 'confirmed', netflixId: '81610166' },
  '킹덤': { tmdbId: '70593', type: 'tv', posterPath: '/zXfQcdTx0jxbH5Atpwjvb5z5VjE.jpg', status: 'provisional', netflixId: '80180171' },  // 제목 일치 후보 여럿
  '피지컬: 100': { tmdbId: '210905', type: 'tv', posterPath: '/1nOSEftQdH3ftjSbhCDJyIReCR1.jpg', status: 'confirmed', netflixId: '81587446' },
  '환승연애': { tmdbId: '128119', type: 'tv', posterPath: '/27Rrj2wtNI3vTDbaIm2Wm9B5Pbj.jpg', status: 'provisional' },  // 넷플릭스 아님(TVING)
  '흑백요리사': { tmdbId: '245684', type: 'tv', posterPath: '/tsEIrmV6SIbEVqPZimWqXGvbFcw.jpg', status: 'confirmed', netflixId: '81728365' },
}

/** 포스터 URL 조립. base + size + path 세 조각이라는 TMDB 규칙 그대로. */
export function posterUrl(title: string): string | undefined {
  const p = POSTERS[title]
  return p && `${TMDB_IMAGE_BASE}${TMDB_POSTER_SIZE}${p.posterPath}`
}
