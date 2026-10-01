# replix.tv 웹 — 트래킹 플랜 v7 (Amplitude + Google Analytics)

> **이 문서가 정본이다.** 계측을 바꿀 때는 코드가 아니라 여기부터 고친다.
> 코드에만 있고 여기 없는 이벤트는 **버그로 취급**한다 — 아무도 그게 언제 찍히는지 모르기 때문이다.
> (확장의 `Replix-extension/docs/analytics/tracking-plan.md`와 같은 원칙. 세 표면을 가로로 합친 뷰는
> `Replix-workspace/docs/analytics/replix-amplitude-taxonomy.xlsx`.)
>
> 상태: **구현 완료 · dev 검증**(HP-415) · 대상: 랜딩 `replix.tv/` + 작품 탐색 `replix.tv/catalog/`
>
> **수집 선행 조건(2026-10-01부터, §11):** **랜딩 + 한국 시간대** 방문자는 옵트아웃 — 미선택이어도 이벤트를 수집하고
> 하단 배너는 '수집 안내 + 거부'다. **작품 탐색·그 밖의 지역**은 지금처럼 **허용** 뒤에만 수집한다. **세션 리플레이**는 어디서나
> 허용 뒤에만. 거부는 어디서나 no-op 이며, 거부·철회하면 쿠키·미전송 큐를 지운다.

## 0. 왜 문서가 먼저인가

확장 문서 §0 과 같다. `track('install_cta_clicked')`가 "버튼을 누른 순간"인지 "새 탭이 열린 순간"인지
6개월 뒤에도 알 수 있어야 숫자를 믿고, 믿어야 대시보드를 본다. 그래서 이벤트마다 **파일·함수 단위 발화 시점**을 적는다.

## 1. 이 계측으로 답하려는 질문

| # | 질문 | 왜 알아야 하나 |
| --- | --- | --- |
| W1 | 방문자 중 **설치 CTA를 누르는 비율**은? 어느 위치의 CTA가 효과적인가? | 랜딩의 존재 이유. 문구·배치 결정의 근거 |
| W2 | 어느 **채널(UTM·리퍼러)** 의 방문이 설치까지 가나? | 홍보 채널 선택 |
| W3 | 랜딩을 **어디까지 읽나**? | 아래 섹션이 안 읽히면 위로 올리거나 지운다 |
| W4 | 데모·FAQ를 **만지나**? | 만지지 않는 인터랙션은 유지비만 든다 |
| W5 | 작품 탐색에서 검색→작품→회차/순간→**"넷플릭스에서 보기"** 로 이어지나? | 작품 탐색이 설치 전 "맛보기"로 기능하는지 |
| W6 | 랜딩에서 설치 말고 **어느 버튼·링크를 누르나**? (작품 탐색·섹션 메뉴·약관) | 버튼마다 목적지가 다르다 — 설치로 안 간 방문자가 어디로 가는지 알아야 메뉴·푸터 구성을 정한다 |
| W8 | 랜딩 방문자가 **화면을 실제로 어떻게 쓰나**? (어디서 멈추고, 무엇을 누르려다 마는가) | 이벤트는 '무엇을 했나'만 말한다. 왜 CTA 앞에서 떠나는지는 화면을 봐야 보인다 — 세션 리플레이(§9) |
| W7 | 작품 탐색에서 로그인을 시작한 사람 중 **동의까지 마쳐 회원이 되는** 비율은? 어느 제공자로? | 로그인·동의 흐름(HP-447·HP-449)의 이탈 지점. 가입은 동의 저장 시점이라 웹 가입이 여기서 처음 잡힌다 |

⚠️ 베타 규모에서 비율은 노이즈다(확장 문서 §1 과 같은 경고). W1·W5 의 퍼센트보다 "어느 CTA 가 0건인가" 같은 유무가 먼저 값을 한다.

## 2. 절대 보내지 않는 것 (금지 목록)

확장 §2 의 다섯 항목(채팅 본문 · 이메일/이름/프로필 URL · 작품명·회차명·플랫폼 ID · 재생 위치 · 토큰)에 **웹에서 셋을 더한다.**

| 금지 | 이유 |
| --- | --- |
| **우리 `contentId`·`episodeId`** | 공개 카탈로그라도 기기와 묶이면 "무엇을 봤나"가 된다. 인기 작품은 서버 로그·DB 로 답한다 |
| **검색어** | 검색어는 곧 작품명이다 |
| **IP 기반 위치** | 처리방침 수집 항목에 IP 가 없다. `trackingOptions.ipAddress = false`. 확장(HTTP API)도 `ip` 를 싣지 않아 위치가 안 잡힌다 — 웹을 그 수준에 맞춘다 |
| 전체 URL(쿼리·해시 원문) | `/invite?w=..&t=<토큰>`, `/catalog/#/title/<id>` — SDK 자동 페이지뷰·URL 보강을 끄고 `page_path` 를 직접 정제한다(§7) |

> `/invite` 는 **계측하지 않는다.** 쿼리에 초대 토큰이 실리고(README 계약 "분석 도구로 보내지 않는다"),
> 페이지가 즉시 이동해 동의를 받을 자리도 없다. `scripts/test-analytics.mjs` 가 그 파일에 analytics 참조가 없음을 고정한다.

## 3. 동의 (consent)

| 항목 | 값 |
| --- | --- |
| UI | 하단 고정 배너(`docs/js/analytics.js` `showBanner`). 랜딩·카탈로그 공통 — 스타일을 JS 가 들고 다닌다(두 표면의 CSS 체계가 다르다) |
| 저장 | `localStorage.replix_web_analytics_consent_v1 = { decision: 'granted'|'denied', decidedAt, version }` — 지금 유효한 버전은 `consentVersion()`(운영은 2026-10-01 전 1, 그 뒤 3 · 로컬은 항상 3. 2 는 리플레이만 시행 예정이던 기간용으로 남은 값) |
| 미선택 | **랜딩 + 한국 시간대**(운영 2026-10-01~, §11): 안내 배너 + SDK·GA 로드, 이벤트 수집(리플레이 제외). **그 밖**: 동의 요청 배너, SDK·쿠키·요청 0건 |
| 거부 | 배너 숨김. SDK·쿠키·요청 0건. **거부는 버전이 바뀌어도 계속 존중**(`parseConsent`) — 옵트아웃에서 옛 거부가 풀리면 거부한 사람을 수집하게 된다 |
| 허용 | SDK 스크립트 주입 → (랜딩이면 리플레이 플러그인 주입·부착, §9) → `init` → 큐 flush · GA `gtag.js` 주입(§10) → 현재 페이지 `page_viewed`(GA 는 `page_view`) 1회 |
| 철회 | 푸터 '분석 설정'(`[data-analytics-settings]`) → 배너 재표시 → 거부 시 리플레이 플러그인 제거 + `setOptOut(true)` + `AMP_*` 쿠키·`AMP_*` localStorage·`AMP_*` IndexedDB 삭제(IndexedDB 는 SDK 가 연결을 쥐고 있어 페이지를 떠날 때 실제로 지워진다) |
| 재허용 | 같은 페이지에서 거부 뒤 다시 허용하면 `setOptOut(false)` + `reset()` — **새 device_id**. 철회 전 식별값과 이어지지 않는다. 리플레이도 새 식별자로 다시 붙는다. **옵트아웃 수집 중 허용**은 철회가 아니므로 device_id 그대로, 리플레이만 더한다(`_revoked`) |
| 버전 | `version` 이 바뀌면 다시 묻는다(문안·범위·받는 곳이 바뀌었을 때 올린다). **2 = 랜딩 세션 리플레이**(HP-457) — 배너 문구가 화면 조작 기록을 밝힌다 · **3 = Google Analytics**(HP-465) — 배너 문구가 Google 을 밝힌다(`bannerText`) |

처리방침 §6 문안이 이 동작을 약속한다: "확장 프로그램 **또는 웹사이트(replix.tv)** 에서 명시적으로 동의한 경우에만 … 웹사이트 하단의 '분석 설정'에서 변경".

## 4. 신원 (identity)

| 필드 | 값 | 저장 |
| --- | --- | --- |
| `device_id` | SDK 가 만드는 UUID | SDK 쿠키(`AMP_<키 앞 10자>`), `replix.tv` 도메인 — 랜딩·카탈로그가 같은 기기로 묶인다 |
| `user_id` | **없음** | 작품 탐색에 로그인이 있지만(HP-421·HP-447·HP-449) 회원 식별값은 싣지 않는다 — 동의 배너(§3)가 기기 식별값만 고지한다 |

- ⚠️ **웹↔확장 기기 연결은 아직 없다.** 랜딩의 device_id 와 확장의 device_id(`chrome.storage`)는 다른 값이라
  "랜딩 → 설치 → 첫 채팅" 퍼널은 한 사람으로 이어지지 않는다. 확장이 `replix.tv` 쿠키를 읽어 승계하는 것은 후속 결정.
  지금은 표면별 전환(W1: 방문→CTA 클릭, 확장 Q1: 설치→채팅)을 각각 본다.
- `initial_utm_*`·`initial_referring_domain` 등 어트리뷰션 사용자 속성은 SDK 가 자동으로 붙인다(W2).

## 5. 공통 속성 (모든 이벤트에 자동 부착 — `commonProps()`)

| 속성 | 예 | 왜 |
| --- | --- | --- |
| `env` | `prod` \| `dev` | 호스트명으로 판정 — `replix.tv` 만 prod, 미리보기·localhost·file 은 dev. 확장과 같은 두 프로젝트 |
| `surface` | `web_landing` \| `web_catalog` | 확장(`extension`)과 한 프로젝트에 섞이므로 표면을 가른다 |
| `locale` | `ko-KR` | `navigator.language` |
| `page_path` | `/` · `/catalog/` · `/catalog/#/title` | 정제된 경로(§7). 작품·회차 ID 없음 |
| `device_class` | `mobile` \| `tablet` \| `desktop` | 768/1024 경계. 랜딩 레이아웃 판단 |

## 6. 이벤트 명세

명명 규약: **`객체_동작` snake_case**. 속성·열거값도 snake_case.

| 이벤트 | surface | 발화 시점 | 속성 | 질문 |
| --- | --- | --- | --- | --- |
| `page_viewed` | 둘 다 | 랜딩: `main.js` 끝 `page()` 1회 · 카탈로그: `App.tsx` 라우트 effect(홈/작품/앵커 변경마다). 동의 전 호출은 기억만 하고 허용 직후 1회 | `route`(카탈로그: `home` \| `title` \| `notice`) | W1 분모 |
| `install_cta_clicked` | 둘 다 | `[data-cta]` 요소 클릭(`analytics.js` 문서 위임, capture) | `location`: `nav` \| `hero` \| `close`(랜딩) · `catalog_nav` \| `catalog_title` \| `catalog_footer` | **W1** |
| `nav_link_clicked` | landing | `[data-link]` 요소 클릭(`analytics.js` 문서 위임, capture) — 설치 CTA 가 **아닌** 랜딩의 모든 `<a>`. 아래 표 | `target`(어디로) · `location`: `nav` \| `footer` | **W6** |
| `section_viewed` | landing | `reveal.js` — 섹션 상단이 뷰포트 위 60% 안에 들어올 때 페이지뷰당 1회 | `section`: `intro` \| `how` \| `scenes` \| `works` \| `rooms` \| `faq` \| `install` | W3 |
| `demo_interacted` | landing | `hero.js` 히어로 원본/Replix 토글 클릭 | `demo`: `hero_toggle` · `action`: `toggle` | W4 |
| `faq_opened` | landing | `faq.js` 아코디언을 **열 때만** | `question_index`(0~7) | W4 |
| `catalog_engaged` | catalog | 아래 표 | `feature`, `action`(+`has_results`·`sort`·`source`·`kind`·`score`·`category`) | W5 |
| `watch_link_clicked` | catalog | 재생 딥링크 `<a>` 클릭(`analytics.ts` `trackWatch`) | `platform`(`netflix`), `from`: `title_hero` \| `moment` \| `home_billboard` \| `home_hot` \| `home_live`, `has_timestamp`(bool — `?t=` 유무) | **W5** |
| `login_started` | catalog | `LoginModal.tsx` 제공자 버튼 클릭 — IdP 로 떠나기 직전 | `provider`: `google` \| `kakao` \| `naver` | **W7** |
| `login_completed` | catalog | `auth.ts` — 로그인 왕복 뒤 이미 동의한 회원으로 확인됐을 때(`is_new_user: false`), 동의 저장으로 계정이 생겼을 때(`is_new_user: true` — 문서 개정 재동의 포함, 확장 §5.5 와 같은 뜻). 새로고침으로 세션을 되살린 것은 세지 않는다 | `is_new_user`(bool) | **W7** |

`nav_link_clicked` 발화 지점 — 랜딩(`docs/index.html`) 13곳. 마크업의 `data-link`(=`target`) · `data-link-loc`(=`location`):

| `location` | `target` | 버튼·링크 | 이동 |
| --- | --- | --- | --- |
| `nav` | `top` | 로고 | `#top` |
| `nav` | `scenes` · `rooms` · `faq` | 메뉴 "인기 장면" · "함께 보기" · "자주 묻는 질문" | 섹션 앵커 |
| `nav` | `catalog` | 보조 버튼 "작품 탐색" | `/catalog/`(같은 탭) |
| `footer` | `top` | 로고 | `#top` |
| `footer` | `scenes` · `faq` | "인기 장면" · "자주 묻는 질문" | 섹션 앵커 |
| `footer` | `catalog` | "작품 탐색" | `/catalog/`(같은 탭) |
| `footer` | `privacy` · `terms` | "개인정보처리방침" · "이용약관" | `/privacy` · `/terms`(같은 탭, **SDK 없는 페이지**) |
| `footer` | `contact_email` | 문의 메일 | `mailto:` |
| `footer` | `tmdb` | TMDB 출처 링크 | 새 탭 |

> ⚠️ **설치 버튼 3개는 여기 없다** — `install_cta_clicked{location: nav \| hero \| close}` 로 이미 버튼마다 갈린다(W1). 둘을 합치지 않는다:
> W1 퍼널·대시보드 차트가 `install_cta_clicked` 에 걸려 있고, "설치로 갔나 / 다른 데로 갔나"는 애초에 다른 질문이다.
>
> ⚠️ 값은 **열거값만** 보낸다(`analytics.js` `linkProps` 가 목록 밖을 버린다). `href`·링크 텍스트를 싣지 않는다(§2 전체 URL 금지).
> 랜딩의 모든 `<a>` 는 `data-cta` \| `data-link` \| `data-analytics-settings` 중 **정확히 하나**를 가져야 하고, `(location, target)` 쌍은
> 겹치면 안 된다 — `scripts/test-analytics.mjs` 가 고정한다. 새 버튼을 붙이면 이 표·`LINK_TARGETS`·테스트 목록 셋을 같이 고친다.
>
> ⚠️ **'분석 설정'은 세지 않는다.** 동의를 철회하러 가는 클릭을 이벤트로 남기지 않는다. 동의 배너 안의 처리방침 링크도 같다(동의 전이라 어차피 no-op).

`catalog_engaged` 발화 지점(`analytics.ts` `engaged(feature, action)`):

| `feature` | `action` | 발화 시점 | 추가 속성 |
| --- | --- | --- | --- |
| `search` | `open` | `Chrome.tsx` 검색창 포커스 — **포커스당 1회**(타이핑마다 세지 않는다) | — |
| `search` | `select` | 검색 결과 항목 클릭 | `has_results: true` |
| `billboard` | `switch` | `Home.tsx` 빌보드 레일·점 클릭 | — |
| `episode_list` | `select` | `Title.tsx` 회차 막대·번호·회차 카드 클릭 | — |
| `episode_list` | `sort` | 회차 정렬 토글 | `sort`: `ep` \| `heat` |
| `moments` | `select` | 순간 타임라인 점·목록 클릭 | — |
| `also_watched` | `click` | 함께 본 작품 카드 클릭 | — |
| `notice` | `opened` | 공지 페이지(`#/notice`)로 가는 링크 클릭 — `Chrome.tsx` 헤더 링크·공지 띠의 '보기'·푸터 링크 | `source`: `nav` \| `band` \| `footer` |
| `notice` | `band_dismissed` | 공지 띠의 '닫기' 클릭(`Chrome.tsx` `NoticeBand`) | `kind`: `NOTICE` \| `MAINTENANCE` \| `INCIDENT` |
| `feedback` | `opened` | 푸터 '피드백 보내기' 로 모달이 열린 순간(`FeedbackModal.tsx`) | — |
| `feedback` | `submitted` | 피드백 전송 **성공**(`POST /api/v1/feedback` 201) | `score`: `0`(미선택) \| `1`~`5`, `category`: `ANNOY` \| `BUG` \| `IDEA` \| `PRAISE` \| `none`(미선택) |
| `feedback` | `store_review_clicked` | 전송 뒤 감사 화면의 스토어 평가 링크 클릭 | — |

> ⚠️ `demo_interacted` 는 `hero_toggle` 하나다. 인터랙티브 히트맵 플레이어(`hm*`)는 `#scenes-legacy` 에 `display:none` 으로
> 숨겨져 있어 발화 지점이 없다 — 되살리면 `scenes_player`(`play`/`pause`/`jump`)를 여기 먼저 추가한다.
>
> ⚠️ 검색 `select` 는 결과 제목·contentId 를 싣지 않는다(§2). "무엇을 찾나"는 서버 `/contents?q=` 로그로 본다.
>
> ⚠️ 공지(HP-425)는 새 이벤트를 만들지 않는다 — 진입은 `catalog_engaged{feature: notice}`, 페이지 노출은
> `page_viewed{route: notice}` 로 센다. 공지 **본문·제목·noticeId 는 어떤 속성에도 싣지 않는다**(§2 와 같은 이유).
> `band_dismissed` 의 `kind` 는 세 개짜리 열거값이라 개별 공지를 지목하지 않는다.
>
> ⚠️ 피드백(HP-426)도 새 이벤트를 만들지 않는다 — `catalog_engaged{feature: feedback}` 하나로 센다.
> **사용자가 적은 본문은 어떤 속성에도 싣지 않는다**(§2). `submitted` 가 싣는 것은 `score`·`category` 둘뿐이고
> 둘 다 열거값이다 — 본문은 서버(`/api/v1/feedback`)에만 가고 계측에는 오지 않는다. 실패(4xx·5xx)는 세지 않는다:
> 보냈다는 사실이 아니라 **접수된 건수**를 봐야 서버에 쌓인 피드백 수와 맞출 수 있다.

## 7. 전송 방식 — Browser SDK, 자동수집 최소화

- **SDK**: `https://cdn.amplitude.com/libs/analytics-browser-2.45.8-min.js.gz`. **동의 허용 뒤에만** `<script>` 를 주입한다(정적 태그 금지 — 테스트가 고정).
- **init 설정**(`SDK_CONFIG`):
  `autocapture: { attribution: true, sessions: true, pageViews: false, formInteractions: false, fileDownloads: false, elementInteractions: false, pageUrlEnrichment: false }` ·
  `trackingOptions: { ipAddress: false }` · `remoteConfig: { fetchRemoteConfig: false }` · `identityStorage: 'cookie'` · `cookieOptions: { sameSite: 'Lax', secure: <https 여부> }`
- **원격 설정을 끄는 이유**: 기본값(`true`)이면 SDK 가 `sr-client-cfg.amplitude.com` 에서 설정을 받아 오고, Amplitude 대시보드의
  Autocapture 설정이 코드의 `autocapture` 를 **덮어쓴다** — 누군가 대시보드에서 스위치를 켜면 §2 가 금지한 전체 URL·클릭 요소 텍스트가
  코드 변경 없이 실리기 시작한다. 계측 범위는 코드(이 문서)만이 정한다.
- **왜 끄나**: 자동 `pageViews` 와 `pageUrlEnrichment` 는 전체 URL(쿼리·해시)을 싣는다 — §2 의 마지막 줄. `formInteractions` 는 검색창 입력을 잡는다. `elementInteractions` 는 클릭한 요소의 텍스트(작품명)를 싣는다.
- **왜 SDK 인가**(확장은 HTTP API 직접): 웹은 세션·어트리뷰션(W2)·재시도·배치를 SDK 가 이미 하고, 원격 스크립트 로딩 제약(MV3)도 없다. 대신 자동수집을 끄는 것이 조건이다.
- **떠날 때 flush**: `pagehide` 에서 `setTransport('beacon')` + `flush()`, bfcache 로 돌아오면(`pageshow` `persisted`) `fetch` 로 복귀.
  SDK 는 1초 배치라 같은 탭 링크 클릭 직후 페이지가 먼저 사라진다 — 그 이벤트는 localStorage 큐(`AMP_unsent_*`)에 남아 다음 SDK 페이지가
  보내지만, `/privacy`·`/terms` 처럼 **SDK 가 없는 페이지로 가면 다음 방문까지 밀린다**(2026-09-21 실측, HP-437). beacon 은 응답을 못 받아
  재시도가 없으므로 떠날 때만 쓴다. 철회 상태에서는 optOut 이라 아무것도 나가지 않는다.
- **큐**: SDK 로드 전 `track`/`page` 호출은 메모리 큐 → `onload` 뒤 flush. 로드 실패(차단·오프라인)는 큐를 버리고 조용히 포기(fail-open).
- **카탈로그 연결**: `catalog/app/src/analytics.ts` 가 `/js/analytics.js` 를 런타임에 붙이고 `window.ReplixAnalytics` 로 부른다. 준비 전 호출은 shim 큐 → `replix-analytics-ready` 이벤트에서 flush. Vite dev·`file://` 에서는 no-op.

## 8. 검증 (구현 후 필수)

1. 미선택 상태: 네트워크에 `amplitude.com` 요청 0건, `AMP_*` 쿠키 없음
   (리플레이: 허용 뒤 랜딩 이벤트에 `[Amplitude] Session Replay ID` 가 붙고 떠날 때 `api-sr.amplitude.com` 으로 beacon ·
   카탈로그에서는 플러그인 스크립트 요청 0건 · 철회 뒤 떠나도 beacon 0건)
2. 허용 뒤 이벤트 8종을 각 1회 발생시키고 **요청 본문에 금지 항목이 없음**을 눈으로 확인 ← 가장 중요
3. 랜딩 → 카탈로그 이동 시 같은 `device_id`
4. 철회 뒤 요청 중단·쿠키 삭제
5. Amplitude dev 프로젝트 User Look-Up 에 도착 확인
6. `node scripts/test-analytics.mjs` 통과

## 9. 세션 리플레이 — 랜딩 전용 (HP-457)

이벤트가 아니라 **화면 조작 기록**이다(스크롤·클릭·화면 구성의 변화를 재생 가능한 형태로). W8 에 답한다.

| 항목 | 값 | 왜 |
| --- | --- | --- |
| 범위 | **랜딩(`/`)만** — `replayOn()` | 작품 탐색은 검색창 입력(=작품명)과 작품 화면이 그대로 찍힌다 — §2 금지 목록. 확장은 넷플릭스 화면·채팅 본문이 찍혀 아예 불가 |
| 시행 | 운영은 **2026-10-01 00:00 KST 부터**(`REPLAY_FROM`) · 로컬은 항상 | 처음엔 공고(09-29) 7일 뒤(10-07)였으나, 2026-10-01 고경우 결정으로 GA·옵트아웃 개정과 묶어 공고와 동시에 시행. 법정 사전 공지 기간은 없고 개인정보위 작성지침도 "개정 전 또는 즉시 공지" — 처리방침 11항의 7일 약속도 같은 개정으로 고쳤다. ⚠️ 날짜를 옮기면 코드 상수와 `privacy.html` 시행일을 **같이**(테스트가 대조) |
| 동의 | 기존 배너, 버전 2 | 범위가 늘었으므로 1 로 받은 동의는 시행일부터 무효 — 새 문구로 다시 묻는다 |
| 플러그인 | `plugin-session-replay-browser-1.35.4`(CDN), 동의 뒤 동적 주입, `init` **앞에** `add` | 정적 태그 금지(§7 과 같은 이유). 막히거나 실패하면 이벤트 계측만 간다(fail-open) |
| 표집 | `sampleRate: 1` | 방문이 적다. Starter 요금제 월 1,000건 한도에 닿으면 낮춘다 |
| 가림 | `defaultMaskLevel: 'medium'`(입력값 전부 가림) | 랜딩에 입력 필드·이용자 생성 콘텐츠는 없지만, 생겨도 새지 않게. 가릴 요소가 생기면 `amp-mask`·`amp-block` 클래스 |
| 저장 | `storeType: 'memory'` | 미전송 녹화 조각을 IndexedDB 에 남기지 않는다 — 철회하면 그 즉시 사라진다. 떠날 때는 플러그인이 beacon 으로 비운다 |
| 전송처 | `api-sr.amplitude.com/sessions/v2/track` · 설정 `sr-client-cfg.amplitude.com` | 이벤트(`api2.amplitude.com`)와 다른 호스트. **플러그인의 웹 워커가 1~10초 간격으로 보낸다** — 페이지의 fetch 후킹·리소스 타이밍에 안 잡힌다. 확인은 SDK `logLevel: 4` 로 올려 `Session replay event batch tracked successfully` 로그로(2026-09-29 실측: 첫 묶음 196KB) |
| 보관 | Amplitude 에서 30일 | 처리방침 3·6항에 적은 값 |
| 알려진 한계 | 떠나는 순간의 마지막 조각은 `sendBeacon` 으로 나가는데 크롬에서 CORS 로 막힌다(플러그인 1.35.4) | 마지막 몇 초가 빠질 수 있다. 그 앞은 워커가 이미 보냈다 |
| 부수 효과 | 랜딩 이벤트에 `[Amplitude] Session Replay ID`(`<device_id>/<session_id>`) 속성이 붙는다 | 이벤트에서 해당 녹화로 건너가는 열쇠. 새 식별 정보는 아니다 |

> ⚠️ **플러그인의 원격 설정은 끌 수 없다.** SDK 는 `fetchRemoteConfig: false` 로 막았지만(§7), 리플레이 플러그인은 자기 설정(표집·가림)을
> `sr-client-cfg` 에서 따로 받는다. **Amplitude 대시보드 Settings → Session Replay 에서 가림 수준을 낮추거나 카탈로그용 규칙을 넣지 말 것** —
> 코드의 `medium` 보다 느슨해질 수 있다. 범위(랜딩만)는 플러그인을 아예 싣지 않는 방식이라 원격 설정으로 넓힐 수 없다.
>
> ⚠️ **회원 약관 동의 버전(BE `requiredPrivacyVersion`)은 건드리지 않았다.** 리플레이는 웹 방문자의 배너 동의(버전 2)로 받는다.
> 회원 재동의가 필요한지는 HP-243 담당 판단.

## 10. Google Analytics (HP-465)

Amplitude 와 **같은 배너·같은 동의** 뒤에서 GA4(`G-MVDJ0Z60LJ`)도 받는다. Amplitude 를 대체하지 않는다 —
이벤트 정본·대시보드는 Amplitude 이고, GA 는 유입 경로 리포트·익숙한 화면용 사본이다. **커버리지는 Amplitude 와 같다**(동의한 방문만).

| 항목 | 값 |
| --- | --- |
| 시행 | 운영 **2026-10-01 KST**(`GA_FROM`) — 공고(2026-10-01)와 동시(§9 시행 행 참조). 로컬·미리보기는 항상 켜고 `traffic_type=internal`·`debug_mode` |
| 로드 | 동의 허용 뒤 `gtag/js?id=…` 를 동적 주입(정적 태그 금지 — 테스트가 고정). 두 표면(랜딩·작품 탐색) 모두 |
| 이벤트 | `track()` 이 Amplitude 와 **같은 이름·속성**으로 GA 에도 보낸다(+`surface`). `page_viewed` 만 GA 표준 `page_view` 로 |
| 덮어쓰는 값 | `page_location` = `origin + cleanPath()`(쿼리·작품 번호 없음) · `page_title` = 표면 이름 고정(`Replix 랜딩`·`Replix 작품 탐색`) · `page_referrer` = 외부면 출처만, 같은 출처면 정리된 경로(검색어·초대 토큰 차단) |
| 끈 것 | 자동 `page_view`(`send_page_view: false`) · Google 신호 · 광고 개인화 |
| 철회 | `window['ga-disable-G-…'] = true` + `_ga*` 쿠키 삭제. 같은 페이지 재허용에서는 GA 를 다시 켜지 않는다(gtag 가 메모리에 쥔 옛 client id 가 이어지지 않게) — 다음 로드부터 새 쿠키 |

> ⚠️ **GA 관리 화면의 '향상된 측정'은 반드시 끈다.** 코드로 막을 수 없는 원격 설정이다. 켜 두면 이탈 클릭이
> 넷플릭스 재생 주소(`link_url` — 작품·회차 번호와 `?t=` 재생 위치)를, 사이트 검색이 검색어를 싣는다(§2 금지). 2026-10-01 로컬
> 검증에서 우리가 보내지 않은 `scroll` 이벤트가 나가 **아직 켜져 있음**을 확인했다.
>
> GA 관리 설정(사람이 한다): 향상된 측정 끄기 · 데이터 설정 → Google 신호 끄기 · 데이터 보관 **14개월**(처리방침 3항과 같아야 한다) ·
> 데이터 필터 'Internal Traffic' 활성(로컬 검증 트래픽 제외).
>
> GA4 는 IP 를 로그·저장하지 않고 지역 추정에만 쓴다(처리방침 1항이 이렇게 밝힌다). 브라우저 종류·OS(사용자 에이전트 클라이언트 힌트)는 실린다.

## 11. 옵트아웃 — 랜딩 · 한국 시간대 (HP-466)

2026-10-01 고경우 결정: "법 강제가 아닌 부분은 동의 전 수집으로, 랜딩 수집이 중요하다." 운영 시행 **2026-10-01**(`OPTOUT_FROM`, 공고와 동시,
처리방침 1·6항 개정 공고 2026-10-01). 아래 근거는 조사 결과이며 법률 자문이 아니다 — HP-243 검토 대상.

| 대상 | 방식 | 근거 |
| --- | --- | --- |
| 랜딩 · 한국 시간대(`Asia/Seoul`) | **옵트아웃** — 미선택이어도 Amplitude·GA 이벤트 | 개인정보위 2024-01-31 '맞춤형 광고 행태정보 정책 방안': 특정 개인을 식별하지 않는 행태정보는 동의 없이 처리 가능(누적·결합 식별 방지, 처리방침 공개, 거부권, 안전조치 조건) |
| 작품 탐색 | 옵트인 | 로그인(Keycloak)이 있어 식별 결합 여지가 크다 — 랜딩만 바꾼다(고경우) |
| 그 밖의 시간대·모름 | 옵트인 | EU: 분석 쿠키 사전 동의(GDPR·ePrivacy). 캘리포니아: 도청법(CIPA) 소송 |
| 세션 리플레이(§9) | 옵트인(허용 버튼) | 미국 CIPA 세션 리플레이 소송의 주 대상(2025 9th Cir. Mikulsky v. Bloomingdale's) — 배너 동의가 방어 수단 |
| 확장 프로그램 | 옵트인(최초 실행 선택, 변경 없음) | 크롬 웹스토어 사용자 데이터 정책: 수집 전 눈에 띄는 고지 + 명시적 동의. 회원 식별값(user_id)과도 결합 |

> ⚠️ **되돌리지 말 것 — 이 근거의 전제는 "식별하지 않는다"이다.** 웹 이벤트에 회원 식별값(`user_id`)·이메일·IP 를 싣는 순간
> 근거가 무너져 동의가 필요해진다(§2·§4). 작품 탐색에 로그인 연결을 넣을 때 이 절부터 다시 본다.
>
> 시행 시점: 개정 전 처리방침 11항은 "시행 7일 전(중대한 변경은 30일 전) 공지"를 약속했다. 법정 의무가 아닌 자체 약속이라
> 고경우 지시("법적인 것만 따진다")에 따라 같은 개정에서 11항을 "시행 전 또는 시행과 동시에 공지"로 고치고 공고와 동시에 시행했다.

## 변경 이력

| 버전 | 날짜 | 변경 |
| --- | --- | --- |
| v1 | 2026-09-13 | 초안·구현 — 이벤트 7종, 동의 배너, 금지 목록 3항 추가, `/invite` 제외(HP-415) — 고경우 |
| v2 | 2026-09-16 | `catalog_engaged` 에 `feature: feedback`(`opened`·`submitted`·`store_review_clicked`) 추가 — 새 이벤트 없이 기존 이벤트 확장, 본문은 계측 금지(HP-426) — 김지호 |
| v3 | 2026-09-21 | 랜딩 버튼·링크를 버튼별로 계측 — `nav_link_clicked{target, location}` 13곳(W6). 설치 CTA 3곳은 `install_cta_clicked` 유지. `pagehide` beacon flush 추가(같은 탭 이동 직전 이벤트가 밀리던 것, 실측)(HP-437) — 고경우 |
| v4 | 2026-09-24 | 로그인·가입 계측 — `login_started{provider}`·`login_completed{is_new_user}`(W7). 가입은 약관 동의 저장 시점(HP-449). §4 `user_id` 설명 정정(로그인은 있으나 회원 식별값은 싣지 않는다) — 김지호 |
| v5 | 2026-09-29 | 랜딩 세션 리플레이(W8, §9) — 랜딩 전용·운영 시행 2026-10-07·동의 버전 2·입력 가림 `medium`·`storeType: memory`. 처리방침 1·3·5·6항 반영(HP-457) — 고경우 |
| v6 | 2026-10-01 | Google Analytics 추가(§10) — 같은 동의 뒤 동적 로드, 운영 시행 2026-10-09, 동의 버전 3, 주소·제목·리퍼러를 정리값으로 덮어쓰기, 철회 시 `_ga*` 삭제. 처리방침 1·3·5·6항 반영(HP-465) — 고경우 |
| v7 | 2026-10-01 | 랜딩·한국 시간대 옵트아웃(§11) — 미선택에도 이벤트 수집, 배너는 안내+거부, 리플레이·작품 탐색·해외는 옵트인 유지, 거부는 버전 무관 존중. 리플레이(v5)·GA(v6)·옵트아웃을 한 개정으로 묶어 **2026-10-01 공고와 동시에 시행**, 처리방침 1·6·11항(HP-466) — 고경우 |
