# replix.tv 웹 — 트래킹 플랜 v25 (Amplitude + Google Analytics + Meta 픽셀)

> **이 문서가 정본이다.** 계측을 바꿀 때는 코드가 아니라 여기부터 고친다.
> 코드에만 있고 여기 없는 이벤트는 **버그로 취급**한다 — 아무도 그게 언제 찍히는지 모르기 때문이다.
> (익스텐션의 `Replix-extension/docs/analytics/tracking-plan.md`와 같은 원칙. 세 표면을 가로로 합친 뷰는
> `Replix-workspace/docs/analytics/replix-amplitude-taxonomy.xlsx`.)
>
> 상태: **구현 완료 · dev 검증**(HP-415) · 대상: 랜딩 `replix.tv/` + 작품 탐색 `replix.tv/catalog/`
>
> **수집 선행 조건(2026-10-01부터, §11):** **한국 시간대** 방문자는 랜딩·작품 탐색 모두 옵트아웃 — 미선택이어도 이벤트를 수집하고
> 하단 배너는 '수집 안내 + 거부'다. **그 밖의 지역**은 지금처럼 **허용** 뒤에만 수집한다. **세션 리플레이**는 한국 시간대
> **랜딩**은 2026-10-10 부터 미선택이어도(§9·§11), 작품 탐색·해외는 허용 뒤에만. 거부는 어디서나 no-op 이며, 거부·철회하면
> 쿠키·미전송 큐·녹화를 지운다. 옵트아웃·리플레이·배너는 처리방침이 밝힌 두 표면(첫 화면 `/`·작품 탐색)에서만이고, `/discord/` 는
> 이미 허용한 방문자의 설치·봇 추가 클릭만 보낸다(§11). **로컬 호스트는 디버그 표시 없이는 보내지 않고, 팀 브라우저는 `traffic_type=internal`
> 로 표시만 한다**(§5·§7, HP-615). **Meta 픽셀**은 같은 게이트 뒤에 첫 화면 `/` 에서만, 운영 2026-10-20 부터(§13, HP-542).

## 0. 왜 문서가 먼저인가

익스텐션 문서 §0 과 같다. `track('install_cta_clicked')`가 "버튼을 누른 순간"인지 "새 탭이 열린 순간"인지
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

⚠️ 베타 규모에서 비율은 노이즈다(익스텐션 문서 §1 과 같은 경고). W1·W5 의 퍼센트보다 "어느 CTA 가 0건인가" 같은 유무가 먼저 값을 한다.

## 2. 절대 보내지 않는 것 (금지 목록)

익스텐션 §2 의 다섯 항목(채팅 본문 · 이메일/이름/프로필 URL · 작품명·회차명·플랫폼 ID · 재생 위치 · 토큰)에 **웹에서 셋을 더한다.**

| 금지 | 이유 |
| --- | --- |
| **우리 `contentId`·`episodeId`** | 공개 카탈로그라도 기기와 묶이면 "무엇을 봤나"가 된다. 인기 작품은 서버 로그·DB 로 답한다 |
| **검색어** | 검색어는 곧 작품명이다 |
| **IP 기반 위치** | 처리방침 수집 항목에 IP 가 없다. `trackingOptions.ipAddress = false`. 익스텐션(HTTP API)도 `ip` 를 싣지 않아 위치가 안 잡힌다 — 웹을 그 수준에 맞춘다 |
| 전체 URL(쿼리·해시 원문) | `/invite?w=..&t=<토큰>`, `/catalog/#/title/<id>` — SDK 자동 페이지뷰·URL 보강을 끄고 `page_path` 를 직접 정제한다(§7). 예외 하나: GA `page_location` 의 **광고 캠페인 쿼리**(`utm_*` 다섯, §10) — 우리가 광고 주소에 붙이는 캠페인 단위 값이라 방문자를 가리키지 않는다. 광고 클릭 식별값(`gclid`·`gbraid`·`wbraid`·`fbclid` — 광고 플랫폼이 클릭마다 붙이는 값)은 처리방침이 밝힌 GA 수집 항목('방문한 페이지(작품·회차 번호를 뺀 경로)') 밖이라 남기지 않는다(HP-615). 2026-10-14 부터는 부트 때 주소에서 아예 지워(`CLICK_ID_PARAMS` 11종, `stripClickIds`) Amplitude 귀속·리플레이·Meta 픽셀은 보지 못한다 — Amplitude 웹 귀속이 이 값을 사용자 속성으로 보내고 있었다(HP-628). 예외 하나: **Google 것 셋(`gclid`·`gbraid`·`wbraid`)은 지우기 전에 받아 두었다가 GA `page_location` 에만** 싣는다(2026-10-21 처리방침 개정부터, §10, HP-691) |

> `/invite`·`/together` 는 **계측하지 않는다.** 쿼리에 초대·연결 토큰이 실리고(README 계약 "분석 도구로 보내지 않는다"·"계측 없음"),
> 주소와 화면(초대의 '넷플릭스에서 열기' 링크, 링크 복사 칸)에 토큰이 있어 녹화·GA 향상된 측정(바깥 링크 클릭의 `link_url`)에 실릴 수 있다. 설치 버튼은 스토어 링크의
> `utm_medium`(§12)으로만 가른다 — 스토어 대시보드가 세는 값이라 이 페이지에서 나가는 요청이 없다. `scripts/test-analytics.mjs`·
> `test-invite.mjs` 가 두 파일에 analytics 참조가 없음을 고정한다.

## 3. 동의 (consent)

| 항목 | 값 |
| --- | --- |
| UI | 하단 고정 배너(`docs/js/analytics.js` `showBanner`). 랜딩·카탈로그 공통 — 스타일을 JS 가 들고 다닌다(두 표면의 CSS 체계가 다르다). **두 층**(HP-585, 2026-10-12): 늘 보이는 요약(`noticeText`·`bannerText`, 70자 이하 — 무엇·어디로(미국)·허용이 더하는 것) + [자세히]를 누르면 배너 안에서 펼쳐지는 세부(`noticeDetail`·`bannerDetail` — 받는 곳 이름·항목·가리는 것·거부의 효과)와 처리방침 링크. [거부]는 [허용]과 같은 크기·같은 채움. 접힌 높이는 휴대폰 390×664 에서 70px(11%) — 전문을 다 보이던 종전 배너는 202px(30%)였다 |
| 저장 | `localStorage.replix_web_analytics_consent_v1 = { decision: 'granted'|'denied', decidedAt, version }` — 지금 유효한 버전은 `consentVersion()`(운영은 2026-10-01 전 1, 2026-10-21 전 4, 그 뒤 **5** · 로컬은 항상 5. 2·3 은 리플레이·GA 를 따로 시행하려던 계획의 값으로 남아 있다 — 같은 날 4 로 묶여 운영에서 유효한 적은 없다) |
| 미선택 | **한국 시간대, 두 표면 모두**(첫 화면 `/`·작품 탐색 — `fullSurface()`, 운영 2026-10-01~, §11): 안내 배너 + SDK·GA 로드, 이벤트 수집(리플레이는 §9). **그 밖**: 동의 요청 배너, SDK·쿠키·요청 0건. **그 밖의 페이지(`/discord/`)**: 시간대와 무관하게 배너도 요청도 없다 — 이미 허용한 방문자만 설치·봇 추가 클릭을 보낸다(HP-615·HP-671) |
| 거부 | 배너 숨김. SDK·쿠키·요청 0건. **거부는 버전이 바뀌어도 계속 존중**(`parseConsent`) — 옵트아웃에서 옛 거부가 풀리면 거부한 사람을 수집하게 된다 |
| 허용 | SDK 스크립트 주입 → (랜딩이면 리플레이 플러그인 주입·부착, §9) → `init` → 큐 flush · GA `gtag.js` 주입(§10) → 현재 페이지 `page_viewed`(GA 는 `page_view`) 1회 |
| 철회 | 푸터 '분석 설정'(`[data-analytics-settings]`) → 배너 재표시 → 거부 시 리플레이 플러그인 제거 + `setOptOut(true)` + `AMP_*` 쿠키·`AMP_*` localStorage·`AMP_*` IndexedDB 삭제(IndexedDB 는 SDK 가 연결을 쥐고 있어 페이지를 떠날 때 실제로 지워진다). 거부 뒤에는 SDK 의 묶음 전송도 나가지 않는다 — `setOptOut` 은 새 이벤트만 막아 이미 메모리 큐에 든 묶음이 1초 뒤 그대로 나갔으므로(2026-10-14 실측), 보내는 순간 수집 상태를 다시 보는 관문(`gateTransport`, 플러그인 `replix-send-gate`)이 막는다(HP-628) |
| 재허용 | 같은 페이지에서 거부 뒤 다시 허용하면 `setOptOut(false)` + `reset()` — **새 device_id**. 철회 전 식별값과 이어지지 않는다. 리플레이도 새 식별자로 다시 붙는다. **옵트아웃 수집 중 허용**은 철회가 아니므로 device_id 그대로, 리플레이만 더한다(`_revoked`) |
| 버전 | `version` 이 바뀌면 다시 묻는다(범위·받는 곳이 바뀌었을 때 올린다). **2 = 랜딩 세션 리플레이**(HP-457) — 배너가 화면 조작 기록을 밝힌다 · **3 = Google Analytics**(HP-465) — 배너 세부가 Google 을 밝힌다(`bannerDetail`) · **4 = 작품 탐색까지 리플레이**(2026-10-01 고경우, §9) · **5 = Meta 픽셀·광고 성과 측정**(2026-10-20 조현빈, §13) — 지금 값(`CONSENT_VERSION`), 운영은 `META_FROM`(2026-10-20) 부터. 문구만 두 층으로 나눈 HP-585 와 계측 정확도를 고친 HP-615 는 범위·받는 곳이 같아 올리지 않았다 — 이미 받은 허용·거부가 그대로 유효하다 |

처리방침 §6 문안이 이 동작을 약속한다: "익스텐션 **또는 웹사이트(replix.tv)** 에서 명시적으로 동의한 경우에만 … 웹사이트 하단의 '분석 설정'에서 변경".

## 4. 신원 (identity)

| 필드 | 값 | 저장 |
| --- | --- | --- |
| `device_id` | SDK 가 만드는 UUID | SDK 쿠키(`AMP_<키 앞 10자>`), `replix.tv` 도메인 — 랜딩·카탈로그가 같은 기기로 묶인다 |
| `user_id` | **없음** | 작품 탐색에 로그인이 있지만(HP-421·HP-447·HP-449) 회원 식별값은 싣지 않는다 — 동의 배너(§3)가 기기 식별값만 고지한다 |

- ⚠️ **웹↔익스텐션 기기 연결은 아직 없다.** 랜딩의 device_id 와 익스텐션의 device_id(`chrome.storage`)는 다른 값이라
  "랜딩 → 설치 → 첫 채팅" 퍼널은 한 사람으로 이어지지 않는다. 익스텐션이 `replix.tv` 쿠키를 읽어 승계하는 것은 후속 결정.
  지금은 표면별 전환(W1: 방문→CTA 클릭, 익스텐션 Q1: 설치→채팅)을 각각 본다.
- `initial_utm_*`·`initial_referring_domain` 등 어트리뷰션 사용자 속성은 SDK 가 자동으로 붙인다(W2). 광고 클릭 식별값(`gclid`·`fbclid` 등 11종)은 부트 때 주소에서 지워 싣지 않는다(§2, HP-628).

## 5. 공통 속성 (모든 이벤트에 자동 부착 — `commonProps()`)

| 속성 | 예 | 왜 |
| --- | --- | --- |
| `env` | `prod` \| `dev` | 호스트명으로 판정 — `replix.tv` 만 prod, 미리보기·localhost·file 은 dev. 익스텐션과 같은 두 프로젝트 |
| `surface` | `web_landing` \| `web_catalog` | 익스텐션 이벤트와 한 프로젝트에 섞이므로 표면을 가른다. 익스텐션 이벤트는 대부분 `surface` 가 없고, 피드백 2종과 `login_completed`(HP-619 수정 버전부터)만 `EXT` 를 싣는다(익스텐션 트래킹 플랜 §4) |
| `locale` | `ko-KR` | `navigator.language` |
| `page_path` | `/` · `/catalog/` · `/catalog/#/title` · `/catalog/#/notice` · `/catalog/#/me` | 정제된 경로(§7) — 해시는 라우트 이름까지만(`cleanPath`). 작품·회차·공지 ID 없음 |
| `device_class` | `mobile` \| `tablet` \| `desktop` | 768/1024 경계. 랜딩 레이아웃 판단 |
| `traffic_type` | `internal` — **표시가 있을 때만** 붙는다 | 팀·개발 트래픽 표시(HP-615). 팀 브라우저(`?replix_internal=1` 로 한 번 들어오면 그 브라우저에 남는다, `=0` 이면 해제)이거나 운영이 아닌 곳(디버그로 보낸 로컬)이면 붙는다. 버리지 않는다 — 차트에서 `traffic_type` 이 `internal` 이 아닌 것으로 거른다. 모든 팀 브라우저가 같은 상수라 사람을 가리키지 않는다(§4·§11 의 '식별하지 않는다'와 충돌 없음). SDK 자동 이벤트(`session_start`·`$identify`)에는 붙지 않는다 |

## 6. 이벤트 명세

명명 규약: **`객체_동작` snake_case**. 속성·열거값도 snake_case.

| 이벤트 | surface | 발화 시점 | 속성 | 질문 |
| --- | --- | --- | --- | --- |
| `page_viewed` | 둘 다 | 랜딩: `main.js` 끝 `page()` 1회 · 카탈로그: `App.tsx` 계측 effect — **페이지가 바뀔 때만**(`route-pure.js` `pageKey`: 홈 · 작품(작품마다) · 공지 · 내 활동). 홈 안 앵커(`#/ranking`·`#/hot`·`#/live`)·공지 항목·회차 선택·평가 칸 이동은 세지 않고, 로그인 왕복(IdP 로그인, 제3자 쿠키가 막힌 브라우저의 조용한 세션 확인 전체 리디렉트)으로 다시 열린 로드도 세지 않는다(`isAuthReturn`, HP-615). 동의 전 호출은 기억만 하고 허용 직후 1회 | `route`(카탈로그: `home` \| `title` \| `notice` \| `me`) | W1 분모 |
| `install_cta_clicked` | 둘 다 | `[data-cta]` 요소 클릭(`analytics.js` 문서 위임, capture). 휴대폰 기기(익스텐션 설치 불가)에서는 웹 스토어 대신 설치 안내 시트가 열리지만 클릭은 그대로 센다(HP-477). `/discord/` 는 이미 허용한 방문자의 클릭만(§11, HP-615) | `location`: `nav` \| `hero` \| `friends` \| `close` \| `float`(랜딩 — `friends` = '친구랑 같이 보기' 중간 버튼, `float` = 휴대폰 따라오는 버튼, HP-664) · `catalog_nav` \| `catalog_title_hero` \| `catalog_title` \| `catalog_footer` · `discord`(`/discord/` 위 띠). 스토어 링크의 `utm_medium` 과 같은 낱말(§12) | **W1** |
| `install_guide_action` | 둘 다 | `install-guide.js` — 휴대폰 기기에서 설치 버튼으로 열린 'PC 크롬에서 써요' 시트 안의 행동. 열 때 1회(`opened`)와 버튼마다. 시트의 웹 스토어 링크에는 `data-cta` 가 없어 `install_cta_clicked` 와 겹쳐 세지 않는다. 복사·공유·메일로 보내는 주소는 싣지 않는다. 앱 안 브라우저(`in_app` ≠ `none`)에서는 '웹 스토어에서 PC로 보내기'가 보이지 않는다(크롬 로그인이 없어 막힌다). 두 번째 버튼은 공유 기능이 있으면 [공유하기], 없으면 앱 밖 브라우저에서만 [메일로 보내기](안드로이드 앱 안 웹뷰는 mailto 를 열지 못할 수 있어 [링크 복사] 하나만). [휴대폰으로는 작품 탐색부터 둘러보기]는 랜딩에서 연 시트에만 있다(HP-638, 규칙은 `install-guide.js` `sheetPlan`) | `action`: `opened` \| `copy_link` \| `share` \| `mail` \| `open_store` \| `open_catalog` · `in_app`: `instagram` \| `facebook` \| `kakaotalk` \| `naver` \| `line` \| `webview`(그 밖의 안드로이드 웹뷰, 'Safari/' 가 없는 iOS 앱 안 웹뷰) \| `none`(앱 밖 브라우저 — UA 로 가린다) | **W1**(휴대폰 갈래) |
| `nav_link_clicked` | landing · `/discord/` | `[data-link]` 요소 클릭(`analytics.js` 문서 위임, capture) — 설치 CTA 가 **아닌** 랜딩의 모든 `<a>` + `/discord/` 의 [디스코드에 추가] 2곳(이미 허용한 방문자만 — §11, HP-671). 아래 표 | `target`(어디로) · `location`: `nav` \| `footer` \| `discord` \| `discord_page_hero` \| `discord_page_close` | **W6** |
| `section_viewed` | landing | `reveal.js` — 섹션 상단이 뷰포트 위 60% 안에 들어올 때 페이지뷰당 1회 | `section`: `friends` \| `discord` \| `how` \| `faq` \| `install`(2026-10-17 HP-664 부터. 그 전 값 `intro` · `rooms` · `scenes` · `works` 는 git 태그 `landing-v1` 의 랜딩이다 — 전후를 섹션 이름으로 잇지 말고 `scroll_depth` 로 잇는다) | W3 |
| `scroll_depth` | landing | `reveal.js` — 화면 아래 끝이 페이지 길이의 25·50·75·100% 를 지날 때 **값마다 페이지뷰당 1회**. 메뉴 링크처럼 건너뛰면 지난 값을 한꺼번에 보낸다. 섹션 구성과 상관없는 자라 구성을 바꿔도 전후를 비교할 수 있다(HP-664) | `percent`: `25` \| `50` \| `75` \| `100` | W3 |
| `demo_interacted` | landing | **2026-10-17(HP-664)부터 발화 지점 없음** — 제품 화면 섹션(`#intro`)을 뺐다(되살리면 다시 난다, git 태그 `landing-v1`). 그 전: `hero.js` 제품 화면이 원본으로 보인 뒤 **스크롤로 전환 경계(화면 전체가 뷰포트에 들어온 위치)를 넘어 Replix 로 바뀌었을 때** 페이지뷰당 1회(2026-10-13 HP-602 부터 — 그 전엔 스크롤 비례 진행도가 1에 닿을 때). 이미 지나친 위치에서 열린 경우(앵커·새로고침)는 세지 않는다 | `demo`: `hero_toggle` · `action`: `scroll_complete` | W4 |
| `faq_opened` | landing | `faq.js` 아코디언을 **열 때만** | `question_index`(0~6). ⚠️ 2026-10-17(HP-664) 질문 목록을 바꿔 순번이 가리키는 질문이 달라졌다(8개 → 7개, 휴대폰·친구 설치 질문이 맨 위) — 전후를 순번으로 잇지 않는다 | W4 |
| `catalog_engaged` | catalog | 아래 표 | `feature`, `action`(+`has_results`·`sort`·`source`·`kind`·`score`·`category`). GA 에서는 `source` 가 `click_source` 로 온다(§10) | W5 |
| `watch_link_clicked` | catalog | 재생 딥링크 `<a>` 클릭(`analytics.ts` `trackWatch`) | `platform`(`netflix`), `from`: `title_hero` \| `moment` \| `home_billboard` \| `home_hot` \| `home_live` \| `my_activity`, `has_timestamp`(bool — `?t=` 유무) | **W5** |
| `login_started` | catalog | `LoginModal.tsx` 제공자 버튼 클릭 — IdP 로 떠나기 직전 | `provider`: `google` \| `kakao` \| `naver` | **W7** |
| `login_completed` | catalog | `auth.ts` — 로그인 왕복 뒤 이미 동의한 회원으로 확인됐을 때(`is_new_user: false`), 동의 모달에서 저장했을 때(`is_new_user: true` — 문서 개정 재동의 포함, 익스텐션 §5.5 와 같은 뜻). 새로고침으로 세션을 되살린 것은 세지 않는다(되살린 세션이라도 동의 모달에서 저장하면 센다 — 그 저장이 가입이거나 재동의다) | `is_new_user`(bool — **동의 모달을 거쳤는가. 가입 수가 아니다 — 가입은 `login_kind: signup`**) · `login_kind`: `signup` \| `reconsent` \| `login` \| `consent`(아래, HP-619) | **W7** |

**`login_completed.login_kind` — 가입과 재동의를 가른다(HP-619, 2026-10-14).** `is_new_user` 는 '동의 모달을 거쳤는가'라 약관 개정 뒤
재동의한 기존 회원도 true 다 — 가입 수로 읽으면 약관을 고칠 때마다 가입이 부푼다. 쌓인 차트가 깨지지 않게 뜻은 그대로 두고, 가입 수는
`login_kind = signup` 으로 본다. 동의 저장(`PUT /api/v1/users/me/legal-consents`) 응답의 `newAccount` — BE 가 계정을 만들기 직전에 판정한
"이번 저장이 계정을 만드는가"(Replix-be HP-619) — 로 가른다(`consent-pure.js` `loginKindOf`, 익스텐션과 같은 값).

| `login_kind` | 뜻 | `is_new_user` |
| --- | --- | --- |
| `signup` | 이 동의 저장이 계정을 만들었다 — **가입** | true |
| `reconsent` | 계정이 이미 있던 회원이 새 약관에 동의했다(약관 개정 뒤 재동의) | true |
| `login` | 로그인 왕복 뒤 이미 동의한 회원으로 확인됐다(동의 모달 없음) | false |
| `consent` | 동의 모달에서 저장했지만 `newAccount` 를 모른다 — 응답에 이 값이 없는 서버(Replix-be HP-619 운영 배포 전)이거나 본문을 못 읽었다 | true |

> ⚠️ 작품 탐색은 운영 API(`api.replix.tv`)를 부르므로 **Replix-be HP-619 가 운영에 나가기 전에는 동의 모달을 거친 완료가 모두 `consent`** 다.
> 그 기간과 이 수정 전(`login_kind` 없음)은 가입과 재동의를 가를 수 없다 — 날짜로 거른다.
> 익스텐션의 `login_completed` 도 같은 이름·같은 `login_kind` 값을 싣고 `surface: EXT` 로 구분된다(익스텐션 트래킹 플랜 §5.5). 두 표면의 가입을 합칠 때는
> `login_kind = signup` 을 `surface` 구분 없이 더한다. `reconsent` 는 범위가 다르다 — 웹은 새로고침으로 되살린 세션의 재동의도 세지만, 익스텐션은
> 로그인하면서 재동의한 경우만 센다(이미 로그인된 채팅창의 재동의는 `login_completed` 가 없다). 같은 사람의 첫 저장 둘이 거의 같은 순간 서버에 닿으면 둘 다 `signup` 일 수 있다(드문 경합 — BE 가 받아들인 한계).

`nav_link_clicked` 발화 지점 — 랜딩(`docs/index.html`) 15곳 + `/discord/`(`docs/discord/index.html`) 2곳. 마크업의 `data-link`(=`target`) · `data-link-loc`(=`location`):

| `location` | `target` | 버튼·링크 | 이동 |
| --- | --- | --- | --- |
| `nav` | `top` | 로고 | `#top` |
| `nav` | `friends` · `how` · `faq` | 메뉴 "친구랑 보기" · "혼자 보기" · "자주 묻는 질문"(HP-664 — 그 전엔 `scenes` · `rooms`) | 섹션 앵커 |
| `nav` | `catalog` | 보조 버튼 "작품 탐색" | `/catalog/`(같은 탭) |
| `footer` | `top` | 로고 | `#top` |
| `footer` | `friends` · `faq` | "친구랑 보기" · "자주 묻는 질문"(HP-664 — 그 전엔 `scenes`) | 섹션 앵커 |
| `footer` | `catalog` | "작품 탐색" | `/catalog/`(같은 탭) |
| `footer` | `privacy` · `terms` | "개인정보처리방침" · "이용약관" | `/privacy` · `/terms`(같은 탭, **SDK 없는 페이지**) |
| `footer` | `contact_email` | 문의 메일 | `mailto:` |
| `footer` | `tmdb` | TMDB 출처 링크 | 새 탭 |
| `discord` | `discord_install` | 디스코드 섹션 "디스코드에 추가"(HP-497) — 익스텐션 설치가 아니라 `install_cta_clicked` 가 아니다 | 디스코드 봇 추가 창(새 탭) |
| `discord` | `discord` | 디스코드 섹션 "자세히 보기" | `/discord/`(같은 탭, **SDK 없는 페이지**) |
| `discord_page_hero` | `discord_install` | `/discord/` 머리의 "디스코드에 추가"(HP-671) — 이미 허용한 방문자만(§11) | 디스코드 봇 추가 창(새 탭) |
| `discord_page_close` | `discord_install` | `/discord/` 끝의 "디스코드에 추가"(HP-671) — 같은 조건 | 디스코드 봇 추가 창(새 탭) |

> 사이트의 봇 추가 클릭은 `target = discord_install` 하나로 모이고 자리는 `location` 이 가른다. **클릭은 설치가 아니다** — 승인은
> 디스코드 화면에서 끝나 웹으로 돌아오는 신호가 없다(설치 링크에 돌아올 주소가 없다). 실제로 봇이 서버에 들어간 수는 BE 지표
> `discord.guild_added`(`GET /api/v1/admin/stats/discord`, 표 `discord_daily_stats` — HP-671)이고, 디스코드 앱 프로필에서 바로 추가한
> 것처럼 웹·익스텐션을 거치지 않은 추가도 거기에만 잡힌다. 익스텐션의 같은 버튼 3곳은 익스텐션 `feature_engaged{feature: discord_install}`.

> ⚠️ **설치 버튼 5개는 여기 없다** — `install_cta_clicked{location: nav \| hero \| friends \| close \| float}` 로 이미 버튼마다 갈린다(W1). 둘을 합치지 않는다:
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
| `my_activity` | `opened` | `Chrome.tsx` 닉네임 메뉴의 「내 활동」 클릭(`#/me` 로 이동) | `source`: `menu` |
| `my_activity` | `more` | `#/me` 작품 카드의 'N개 더 보기' — 한 작품 전량 요청 **성공**(`Me.tsx`) | — |
| `my_activity` | `review_deleted` | `#/me` 에서 내 평가 지우기 **성공**(`DELETE /api/v1/comments/{id}` 204) | — |

> ⚠️ `demo_interacted{action: toggle}`(토글 클릭)은 HP-467 배포(2026-10-01)로 **발화 지점이 사라졌다** — 토글이 버튼이 아니라
> 스크롤 진행 표시가 됐다. 그 날짜 이후 값은 `scroll_complete` 뿐이고, 두 값은 뜻이 달라(클릭 vs 스크롤로 끝까지 봄) 한 추이로 잇지 않는다.
>
> ⚠️ `scroll_complete` 는 HP-602 배포(2026-10-13)로 **발화 지점이 앞당겨졌다** — 스크롤 비례 전환이 경계 방식으로 바뀌어,
> 제목·알약이 화면 위로 사라질 만큼 내려가야 잡히던 것이 화면 전체가 보이는 순간 잡힌다. 그날을 경계로 수치가 오를 수 있으니 전후를 한 추이로 비교하지 않는다.
>
> ⚠️ 카탈로그 `page_viewed` 는 HP-615 배포일(머지일)부터 **덜 센다** — 홈 안 앵커·공지 항목 이동과 로그인 왕복 로드가 빠졌다.
> 같은 조작(홈 → 앵커 셋 → 공지 → 공지 항목 → 홈 → 작품 → 회차)이 8건에서 4건이 됐다(2026-10-13 로컬 실측). 전후를 한 추이로 잇지 않는다.
> 앵커 이동의 흔적은 뒤이은 이벤트의 `page_path`(`/catalog/#/hot` 등)에 남는다 — 따로 이벤트를 두지 않았다.
>
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
>
> ⚠️ 내 활동(HP-443)도 새 이벤트를 만들지 않는다 — 입구는 `catalog_engaged{feature: my_activity, action: opened}`, 페이지 노출은
> `page_viewed{route: me}`, 회차 링크는 `watch_link_clicked{from: my_activity}`. **작품·회차 ID·채팅 본문·평가 본문은 어떤 속성에도
> 싣지 않는다**(§2). 익스텐션의 「전체 활동 보기」로 들어온 것은 따로 구분하지 않는다(해시에 출처를 싣지 않는다).

## 7. 전송 방식 — Browser SDK, 자동수집 최소화

- **SDK**: `https://cdn.amplitude.com/libs/analytics-browser-2.45.8-min.js.gz`. **동의 허용 뒤에만** `<script>` 를 주입한다(정적 태그 금지 — 테스트가 고정).
- **init 설정**(`SDK_CONFIG`):
  `autocapture: { attribution: true, sessions: true, pageViews: false, formInteractions: false, fileDownloads: false, elementInteractions: false, pageUrlEnrichment: false }` ·
  `trackingOptions: { ipAddress: false }` · `remoteConfig: { fetchRemoteConfig: false }` · `identityStorage: 'cookie'` · `cookieOptions: { sameSite: 'Lax', secure: <https 여부> }`
- **원격 설정을 끄는 이유**: 기본값(`true`)이면 SDK 가 `sr-client-cfg.amplitude.com` 에서 설정을 받아 오고, Amplitude 대시보드의
  Autocapture 설정이 코드의 `autocapture` 를 **덮어쓴다** — 누군가 대시보드에서 스위치를 켜면 §2 가 금지한 전체 URL·클릭 요소 텍스트가
  코드 변경 없이 실리기 시작한다. 계측 범위는 코드(이 문서)만이 정한다.
- **왜 끄나**: 자동 `pageViews` 와 `pageUrlEnrichment` 는 전체 URL(쿼리·해시)을 싣는다 — §2 의 마지막 줄. `formInteractions` 는 검색창 입력을 잡는다. `elementInteractions` 는 클릭한 요소의 텍스트(작품명)를 싣는다.
- **왜 SDK 인가**(익스텐션은 HTTP API 직접): 웹은 세션·어트리뷰션(W2)·재시도·배치를 SDK 가 이미 하고, 원격 스크립트 로딩 제약(MV3)도 없다. 대신 자동수집을 끄는 것이 조건이다.
- **떠날 때 flush**: `pagehide` 에서 `setTransport('beacon')` + `flush()`, bfcache 로 돌아오면(`pageshow` `persisted`) `fetch` 로 복귀.
  SDK 는 1초 배치라 같은 탭 링크 클릭 직후 페이지가 먼저 사라진다 — 그 이벤트는 localStorage 큐(`AMP_unsent_*`)에 남아 다음 SDK 페이지가
  보내지만, `/privacy`·`/terms` 처럼 **SDK 가 없는 페이지로 가면 다음 방문까지 밀린다**(2026-09-21 실측, HP-437). beacon 은 응답을 못 받아
  재시도가 없으므로 떠날 때만 쓴다. 철회 상태에서는 떠날 때 flush 하지 않고, SDK 의 묶음 전송도 관문이 막는다(§3 철회 행, HP-628 — optOut 만으로는 이미 큐에 든 묶음이 나갔다).
- **큐**: SDK 로드 전 `track`/`page` 호출은 메모리 큐 → `onload` 뒤 flush. 로드 실패(차단·오프라인)는 큐를 버리고 조용히 포기(fail-open).
- **카탈로그 연결**: `catalog/app/src/analytics.ts` 가 `/js/analytics.js` 를 런타임에 붙이고 `window.ReplixAnalytics` 로 부른다. 준비 전 호출은 shim 큐 → `replix-analytics-ready` 이벤트에서 flush. Vite dev·`file://` 에서는 no-op.
- **로컬 호스트는 보내지 않는다**(HP-615, `sendAllowed`): `localhost`·`127.*`·`[::1]`·`0.0.0.0`·사설망(`10.*`·`172.16~31.*`·`192.168.*`)·`*.local`·`*.localhost`·`file://`. 배너는 그대로 보이지만 허용해도 SDK·GA 를 붙이지 않는다 — GA 에 localhost 14세션이 섞였었다(2026-10-13 분석). 개발 중 실제 전송을 봐야 하면 `?replix_analytics_debug=1` 로 그 브라우저에 표시를 남긴다(`=0` 이면 해제) — 그때는 dev 프로젝트·`traffic_type=internal`·GA `debug_mode` 로 간다.
- **표시 쿼리**(`?replix_internal=1|0`·`?replix_analytics_debug=1|0`)는 부트에서 가장 먼저 읽어 localStorage(`replix_internal`·`replix_analytics_debug`)에 반영하고 **주소창에서 지운다** — 표시된 주소가 그대로 공유되면 밖의 방문자까지 팀으로 표시된다. 다른 쿼리(utm 등)는 그대로 둔다.

## 8. 검증 (구현 후 필수)

1. 미선택 상태: 네트워크에 `amplitude.com` 요청 0건, `AMP_*` 쿠키 없음
   (리플레이: 허용 뒤 랜딩 이벤트에 `[Amplitude] Session Replay ID` 가 붙고 떠날 때 `api-sr.amplitude.com` 으로 beacon ·
   카탈로그에서는 플러그인 스크립트 요청 0건 · 철회 뒤 떠나도 beacon 0건)
2. 허용 뒤 이벤트 8종을 각 1회 발생시키고 **요청 본문에 금지 항목이 없음**을 눈으로 확인 ← 가장 중요
3. 랜딩 → 카탈로그 이동 시 같은 `device_id`
4. 철회 뒤 요청 중단·쿠키 삭제
5. Amplitude dev 프로젝트 User Look-Up 에 도착 확인 — 로컬은 `?replix_analytics_debug=1` 로 표시한 뒤에만 보낸다(§7)
6. `node scripts/test-analytics.mjs` 통과(`npm run check` 가 전 검사를 돈다)

> 실제 수집 요청을 운영 데이터에 남기지 않고 보는 법(HP-615 에서 쓴 방식): 로컬 정적 서버 + 헤드리스 크롬에서 모든 요청을 가로채
> 기록한 뒤 끊는다(GA `…/g/collect`·Amplitude `api2.amplitude.com/2/httpapi`). Amplitude 는 JSON POST 라 CORS 사전 요청이 먼저 가므로
> 그 둘은 가로챈 자리에서 가짜 응답을 준다. GA 수집 요청의 키: 주소 `dl`, 리퍼러 `dr`, 내부 트래픽 `tt=internal`, 이벤트 속성 `ep.<이름>`
> (숫자는 `epn.`), 세션 시작 `_ss=1`. GA 는 `dl` 의 해시(`#/title`)를 버린다 — 카탈로그 화면 구분은 `ep.route` 로 본다.

## 9. 세션 리플레이 — 랜딩·작품 탐색 (HP-457)

이벤트가 아니라 **화면 조작 기록**이다(스크롤·클릭·화면 구성의 변화를 재생 가능한 형태로). W8 에 답한다.

| 항목 | 값 | 왜 |
| --- | --- | --- |
| 범위 | **랜딩·작품 탐색**(`replayOn()`, 2026-10-01 고경우 결정으로 작품 탐색 추가). 누구를 찍나는 `replayFor()`: **[허용]이면 어디서나 · 한국 시간대 랜딩은 2026-10-10 부터 미선택이어도(`REPLAY_OPTOUT_FROM`) · 작품 탐색·해외 미선택은 안 찍음 · 거부는 어디서든 안 찍음** | 랜딩 옵트아웃(2026-10-10 고경우): 국내 주요 사이트 실측 — 29CM(Datadog 0.1%)·당근·인프런·클래스101(Clarity)·무신사(Hotjar)·티빙(Amplitude)이 첫 화면에서 동의 배너 없이 녹화하고, 처리방침엔 "비식별 행태정보·브라우저 쿠키 설정으로 거부"만 적는다. 랜딩은 로그인·남의 글이 없어 비식별에 가깝다. 작품 탐색은 남의 평가·채팅·계정 이름이 뜨는 화면이라 가림에 기대므로 [허용] 유지. 작품 탐색 녹화에는 화면의 작품명·포스터가 담긴다 — §2 는 *이벤트 속성* 금지 목록이고, 녹화는 처리방침 1항이 밝힌다. 익스텐션은 넷플릭스 화면·채팅 본문이 찍혀 아예 불가 |
| 시행 | 운영은 **2026-10-01 00:00 KST 부터**(`REPLAY_FROM`) · 로컬은 항상 | 처음엔 공고(09-29) 7일 뒤(10-07)였으나, 2026-10-01 고경우 결정으로 GA·옵트아웃 개정과 묶어 공고와 동시에 시행. 법정 사전 공지 기간은 없고 개인정보위 작성지침도 "개정 전 또는 즉시 공지" — 처리방침 11항의 7일 약속도 같은 개정으로 고쳤다. ⚠️ 날짜를 옮기면 코드 상수와 `privacy.html` 시행일을 **같이**(테스트가 대조) |
| 동의 | 기존 배너, 버전 4(작품 탐색 녹화를 밝힘). 한국 시간대의 안내 배너는 2026-10-10 부터 첫 화면 녹화가 미선택에서도 이루어진다고 밝힌다 — 2026-10-12 두 층으로 바뀐 뒤(HP-585)의 요약은 "방문 통계와 첫 화면의 스크롤·클릭 기록을 미국 분석 도구로 수집해요. 허용하면 작품 탐색에서도 기록해요."(`noticeText(true)`), 받는 곳과 가림은 세부(`noticeDetail(true)`) | 범위가 늘 때마다 앞 버전으로 받은 허용은 무효 — 새 문구로 다시 묻는다(옵트아웃 지역은 이벤트는 계속, 녹화만 재허용 대기). 랜딩 옵트아웃은 '허용'의 범위가 아니라 '미선택'의 처리를 바꾼 것이라 버전을 올리지 않는다 — 4 로 허용한 사람은 이미 두 표면 녹화에 동의했고, 거부한 사람은 그대로 거부다 |
| 플러그인 | `plugin-session-replay-browser-1.35.4`(CDN), 동의 뒤 동적 주입, `init` **앞에** `add` | 정적 태그 금지(§7 과 같은 이유). 막히거나 실패하면 이벤트 계측만 간다(fail-open) |
| 표집 | `sampleRate: 1` | 방문이 적다. Starter 요금제 월 1,000건 한도에 닿으면 낮춘다 |
| 가림 | `defaultMaskLevel: 'medium'`(입력값 전부 — 검색창·평가·피드백 입력란) + 마크업 클래스 | **작품 탐색의 남의 글·이름**: 평가 한 건 `amp-mask`·작성자 사진 `amp-block`(Comments.tsx), 순간 채팅 목록 `amp-mask`(Title.tsx), 로그인 계정 메뉴 `amp-mask`(Chrome.tsx) — 테스트가 고정. 이런 화면을 새로 붙이면 같은 클래스를 단다 |
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
2026-10-20 부터 GA4 전환을 Google Ads 로 가져가 **광고 성과 측정**에도 쓴다(처리방침 2·5·6항 목적 추가, HP-542) — 보내는 값·설정은 그대로다.

| 항목 | 값 |
| --- | --- |
| 시행 | 운영 **2026-10-01 KST**(`GA_FROM`) — 공고(2026-10-01)와 동시(§9 시행 행 참조). 운영이 아닌 곳은 날짜와 무관하게 켜고 `traffic_type=internal`·`debug_mode` — 단 로컬 호스트는 디버그 표시가 있을 때만(§7, HP-615) |
| 로드 | 동의 허용 뒤 `gtag/js?id=…` 를 동적 주입(정적 태그 금지 — 테스트가 고정). 두 표면(랜딩·작품 탐색) 모두 |
| 이벤트 | `track()` 이 Amplitude 와 **같은 이름·속성**으로 GA 에도 보낸다(+`surface`). `page_viewed` 만 GA 표준 `page_view` 로 |
| 덮어쓰는 값 | `page_location` = `origin + cleanPath()` + **광고 캠페인 쿼리**(`GA_CAMPAIGN_PARAMS` = `utm_source`·`utm_medium`·`utm_campaign`·`utm_content`·`utm_term`·`utm_id` — 처음 나온 순서·첫 값을 원래 글자 그대로, 해시 앞) + **Google 광고 클릭 식별값**(`GA_CLICK_ID_PARAMS` = `gbraid`·`gclid`·`wbraid` — 부트가 주소에서 지우기 전에 받아 둔 것, 운영은 `GA_CLICK_FROM` 2026-10-21 부터, HP-691). 다른 광고 클릭 식별값(`fbclid`·`dclid` 등)·그 밖의 쿼리·작품 번호 없음 · `page_title` = 표면 이름 고정(`Replix 랜딩`·`Replix 작품 탐색`) · `page_referrer` = 외부면 출처만, 같은 출처면 정리된 경로(검색어·초대 토큰 차단) |
| 캠페인 쿼리를 남기는 이유 | GA 는 **세션 첫 page_view 의 주소**에서 캠페인을 읽는다. 쿼리를 통째로 지우던 때(HP-615 전)는 유료 광고 세션 약 3,130건이 리퍼러만 보고 'Organic Social'(instagram.com·m.facebook.com)로 잡혔다(2026-10-13 광고 성과 분석). 로드 때 `config` 의 `page_location` 에 실어 세션 첫 hit 부터 붙는다 — 2026-10-13 로컬 실측: 첫 hit `en=page_view`·`_ss=1` 의 `dl` 에 utm 이 있고 그 밖의 쿼리(`foo`)는 없다. Google Ads 자동 태깅 값(`gclid`·`gbraid`·`wbraid`)은 2026-10-21 부터 GA 에만 싣는다(아래 행). 유튜브 광고 주소에도 **utm 을 직접 붙인다** — Amplitude 가 광고를 가르는 값은 utm 뿐이다. Amplitude 도 2026-10-14 부터 광고 클릭 식별값을 받지 않는다 — 부트 때 주소에서 지운다(§2·§4, HP-628) |
| Google 광고 클릭 식별값(HP-691) | 유튜브(Google Ads) 광고를 설치 버튼 클릭(GA4 주요 이벤트 `install_cta_clicked`)으로 최적화하려면 Google Ads 가 그 전환을 광고 클릭에 이어야 하고, 그 고리가 GA 수집 요청 주소(`dl`)의 `gclid` 다 — 주소에서 지우기만 하면 GA4 에서 가져간 전환이 Google Ads 에 0 으로 보인다. 그래서 부트(`syncFlags`)가 지우기 직전에 Google 것 셋만 받아 두고(`gaClickParts`) `gaPage` 가 `page_location` 의 캠페인 쿼리 뒤에 붙인다(로드 때 `config`, `page_view` 때 `set` 모두). 주소창은 그대로 지워 Amplitude 귀속·리플레이·Meta 픽셀은 보지 못한다. 처리방침 1·5·6항 GA 수집 항목에 'Google 광고 클릭 식별값'(2026-10-21 공고·시행, 조현빈 결정). 동의 배너 문구·동의 버전은 그대로 — 배너는 GA 로 가는 항목을 나열하지 않는다. GA4 주요 이벤트 지정·Google Ads 연결은 Google Ads 쪽 설정이다(HP-542) |
| 이벤트 속성 이름 | GA 로 보낼 때만 **`source` → `click_source`**(`GA_PARAM_RENAME`). `catalog_engaged{source: 'nav'}` 가 세션 소스 `nav` 로 잡혔다(2026-10-13 GA 리포트 22세션) — gtag 는 `ep.source=nav` 로 그대로 보내고(2026-10-13 로컬 확인) 해석은 GA 서버가 한다. 같은 계열인 `medium`·`campaign`·`term`·`content` 도 GA 쪽 이름을 정하기 전에는 GA 에 싣지 않는다(`gaParams` — 새 이벤트가 실수로 써도 유입 경로가 흔들리지 않게). Amplitude 는 기존 차트를 깨지 않게 `source` 그대로 |
| 팀·개발 트래픽 | `traffic_type: 'internal'` 을 `config` 에 실어 이 페이지의 모든 수집 요청에 `tt=internal` 이 붙는다(2026-10-13 확인) — 팀 브라우저 표시(§5) 또는 운영이 아닌 곳. 버리지 않고 표시만 한다: GA 관리의 데이터 필터 'Internal Traffic' 이 **활성**이어야 리포트에서 빠진다(사람이 한다) |
| 끈 것 | 자동 `page_view`(`send_page_view: false`) · Google 신호 · 광고 개인화 |
| 철회 | `window['ga-disable-G-…'] = true` + `_ga*` 쿠키 삭제. 같은 페이지 재허용에서는 GA 를 다시 켜지 않는다(gtag 가 메모리에 쥔 옛 client id 가 이어지지 않게) — 다음 로드부터 새 쿠키 |

> ⚠️ **GA 관리 화면의 '향상된 측정'은 반드시 끈다.** 코드로 막을 수 없는 원격 설정이다. 켜 두면 이탈 클릭이
> 넷플릭스 재생 주소(`link_url` — 작품·회차 번호와 `?t=` 재생 위치)를, 사이트 검색이 검색어를 싣는다(§2 금지). 2026-10-01 로컬
> 검증에서 우리가 보내지 않은 `scroll` 이벤트가 나가 **아직 켜져 있음**을 확인했다. **2026-10-13(HP-615) 로컬 검증에서도 켜져 있다** —
> 이 측정 ID 로 받은 gtag.js 설정에 바깥 링크 클릭·스크롤·양식·기록 변경·사이트 검색이 켜져 있고, 랜딩의 TMDB 출처 링크를 누르자
> 우리가 보내지 않은 `click{link_url: https://www.themoviedb.org/, outbound: true}` 와 `scroll{percent_scrolled: 90}` 이 나갔다.
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
| 작품 탐색 · 한국 시간대 | **옵트아웃**(같은 날 추가, 고경우) | 로그인(Keycloak)이 있지만 웹 이벤트에 회원 식별값을 싣지 않는다 — 식별하지 않는다는 조건 유지. 로그인을 계측에 연결하면 이 행부터 무너진다 |
| 그 밖의 시간대·모름 | 옵트인 | EU: 분석 쿠키 사전 동의(GDPR·ePrivacy). 캘리포니아: 도청법(CIPA) 소송 |
| 세션 리플레이(§9) · 랜딩 · 한국 시간대 | **옵트아웃**(2026-10-10 부터, `REPLAY_OPTOUT_FROM`) | 국내 관행 실측(§9 범위 행) + 랜딩은 비식별에 가깝다. 처리방침 1·6항 개정 공고 2026-10-10, 공고와 동시 시행 |
| 세션 리플레이(§9) · 작품 탐색 · 해외 | 옵트인(허용 버튼) | 작품 탐색은 남의 글·계정 이름이 뜨는 화면. 해외는 미국 CIPA 세션 리플레이 소송의 주 대상(2025 9th Cir. Mikulsky v. Bloomingdale's) — 배너 동의가 방어 수단 |
| 익스텐션 | 옵트인(최초 실행 선택, 변경 없음) | 크롬 웹스토어 사용자 데이터 정책: 수집 전 눈에 띄는 고지 + 명시적 동의. 회원 식별값(user_id)과도 결합 |
| 그 밖의 페이지(`/discord/`) | **이미 [허용]한 방문자의 설치·봇 추가 클릭만**(HP-615·HP-671) — 배너·페이지뷰·리플레이 없음, SDK·GA 는 그 클릭에서야 붙는다 | 처리방침 1·6항이 미선택 수집 범위를 '웹사이트(첫 화면과 작품 탐색)'로 밝힌다 — 그 밖의 페이지까지 옵트아웃으로 넓히려면 처리방침 개정 공고가 먼저다. 허용(배너 세부 '사이트 개선을 위해 방문 통계를…')은 사이트 단위 동의라 이 클릭을 덮는다 |
| `/invite`·`/together` | 계측 없음(토큰, README 계약) — 스토어 링크 `utm_medium` 만(§12) | 주소와 화면에 토큰이 있다(§2 주석) |

> ⚠️ **되돌리지 말 것 — 이 근거의 전제는 "식별하지 않는다"이다.** 웹 이벤트에 회원 식별값(`user_id`)·이메일·IP 를 싣는 순간
> 근거가 무너져 동의가 필요해진다(§2·§4). 작품 탐색에 로그인 연결을 넣을 때 이 절부터 다시 본다.
>
> 시행 시점: 개정 전 처리방침 11항은 "시행 7일 전(중대한 변경은 30일 전) 공지"를 약속했다. 법정 의무가 아닌 자체 약속이라
> 고경우 지시("법적인 것만 따진다")에 따라 같은 개정에서 11항을 "시행 전 또는 시행과 동시에 공지"로 고치고 공고와 동시에 시행했다.

## 12. 웹 스토어 링크 UTM (HP-615)

모든 크롬 웹 스토어 링크에 `?utm_source=replix.tv&utm_medium=<위치>` 를 붙인다 — 스토어 개발자 대시보드가 replix.tv 에서 넘어온
방문을 위치별로 가르게 하는 값이다. 동의와 무관하다: 링크에 박힌 고정 값이고 우리 쪽에서 나가는 요청이 없다(스토어가 자기 방문을 센다).
`utm_medium` 은 그 버튼의 `install_cta_clicked.location` 과 같은 낱말이라 두 숫자를 나란히 볼 수 있다.

| 위치 | `utm_medium` | 파일 |
| --- | --- | --- |
| 랜딩 상단(헤더) 설치 버튼 | `nav` | `docs/index.html` |
| 랜딩 히어로 | `hero` | `docs/index.html` |
| 랜딩 '친구랑 같이 보기' 중간 버튼(HP-664) | `friends` | `docs/index.html` |
| 랜딩 하단(마지막 설치 구획) | `close` | `docs/index.html` |
| 랜딩 휴대폰 따라오는 버튼(HP-664 — 휴대폰 기기에서만 보인다) | `float` | `docs/index.html` |
| 작품 탐색 헤더 | `catalog_nav` | `catalog/app/src/components/Chrome.tsx` |
| 작품 탐색 작품 화면 첫 화면('넷플릭스에서 N화 보기' 옆) | `catalog_title_hero` | `catalog/app/src/pages/Title.tsx` |
| 작품 탐색 작품 화면(순간 채팅 아래) | `catalog_title` | `catalog/app/src/pages/Title.tsx` |
| 작품 탐색 푸터 | `catalog_footer` | `catalog/app/src/components/Chrome.tsx` |
| 작품 탐색 피드백 감사 화면(스토어 평가, `/reviews`) | `catalog_feedback` | `catalog/app/src/feedback-pure.js` |
| 디스코드 안내 `/discord/` 위 띠 | `discord` | `docs/discord/index.html` |
| 초대 착지 `/invite` | `invite` | `docs/invite/index.html` |
| 디스코드 연결 착지 `/together` | `together` | `docs/together/index.html` |
| 삭제 설문 `/bye` '다시 설치하기' | `bye` | `docs/bye/index.html` |

- 작품 탐색은 `catalog/app/src/store-pure.js` `storeUrl(medium)` 로만 만든다. 정적 페이지는 같은 형식을 글자로 적는다(`&amp;`).
- 휴대폰 설치 안내 시트의 웹 스토어 링크는 누른 버튼의 주소를 그대로 쓰므로 같은 `utm_medium` 이 실린다.
- 새 스토어 링크를 붙이면 이 표와 `scripts/test-analytics.mjs` 의 표를 같이 고친다 — 검사가 `docs/` 의 모든 HTML 을 훑어 utm 이 빠진 링크를 잡는다.
- ⚠️ 스토어 대시보드에서 이 값이 어떻게 보이는지는 이 저장소에서 확인할 수 없다 — 대시보드 화면은 사람이 확인한다.

## 13. Meta 픽셀 — 첫 화면만 (HP-542)

데이터 세트 'Replix 웹 (replix.tv)'(`META_PIXEL_ID` = `1791551955320987`). Meta 광고가 **PC 설치 의도**(설치 버튼 클릭)로 최적화하고
성과를 재게 한다. 이벤트 정본은 여전히 Amplitude 다 — 픽셀은 광고 플랫폼에 주는 최소 신호다. 2026-10-20 조현빈 결정.

| 항목 | 값 |
| --- | --- |
| 시행 | 운영 **2026-10-20 00:00 KST**(`META_FROM`) — 처리방침 1·2·3·6항 개정, 이번에 한해 공고와 동시 시행(2026-10-20, 조현빈 결정). 운영이 아닌 곳은 날짜와 무관(로컬은 디버그 표시가 있을 때만, §7). ⚠️ 날짜를 옮기면 코드 상수와 `privacy.html` 시행일을 **같이**(테스트가 대조) |
| 게이트 | GA 와 같은 `collecting()` — 허용, 또는 한국 시간대 미선택(옵트아웃, §11). 거부는 어디서나 없음. 추가로 ① **첫 화면 `/`·`/index.html` 만**(`metaOn`) ② 주소의 쿼리가 광고 캠페인 값(`GA_CAMPAIGN_PARAMS` — Meta 가 자동으로 붙이는 `utm_term`·`utm_id` 포함)뿐이고 같은 출처 리퍼러에 쿼리가 없을 때만(`metaPageSafe`) ③ 팀 브라우저 표시(`replix_internal`)가 없을 때만 |
| 왜 첫 화면만 | 픽셀은 전체 주소(`dl`)와 리퍼러(`rl`)를 그대로 보내고 GA 의 `page_location` 처럼 덮어쓸 수 없다. 작품 탐색은 해시에 작품·회차 번호가 실린다(§2). 그 밖의 페이지는 처리방침이 밝힌 픽셀 범위('첫 화면') 밖 |
| 왜 ②·③ | ② `/bye?v=…&d=…` 에서 첫 화면으로 오면 브라우저가 같은 출처 리퍼러를 전체 주소로 주고 픽셀이 `rl` 로 싣는다 — 그 로드는 건너뛴다. Meta 는 광고 주소에 빠진 utm 항목을 자동으로 채워 `utm_term`(광고 세트 번호)·`utm_id`(캠페인 번호)를 붙인다 — `utm_id` 가 목록 밖이던 2026-10-21 첫날에는 광고로 온 방문마다 픽셀이 빠져 Lead·SendToPc 가 Meta 에 한 건도 닿지 않았다(HP-690). 광고 클릭 식별값·팀/디버그 표시는 부트 첫 줄이 이미 지운다(§2). ③ GA 는 'Internal Traffic' 필터로 거르지만 Meta 데이터 세트에는 그런 필터가 없어 팀의 확인 클릭이 그대로 Lead 가 된다 |
| 로드 | 게이트를 지나면 Meta 공식 설치 코드의 큐 함수(`fbq`)를 만들고 `fbq.disablePushState = true` → `fbq('set', 'autoConfig', false, ID)` → `fbq('init', ID)`(고급 매칭 값 없음) → `fbq('track', 'PageView')` 1회 → `fbevents.js` 동적 주입(정적 태그 금지 — 테스트가 고정). 첫 화면 부트(`boot`)와 [허용](`setConsent`)에서만 붙인다 |
| 이벤트 | `track()` 이 그대로 넘긴다(`metaEvent`) — **`install_cta_clicked` → 표준 `Lead`(속성 없음)** · **`install_guide_action{action: copy_link \| share \| mail \| open_store}` → 맞춤 `SendToPc{action}`**. 그 밖의 이벤트(`opened`·`open_catalog` 포함)와 속성(`location`·`in_app` 등)은 보내지 않는다 |
| 끈 것 | `autoConfig`(버튼 글자·페이지 메타데이터·구조화 데이터 자동 수집) · `disablePushState`(주소 변화마다 자동 PageView) · 고급 매칭(이메일·전화번호 해시) |
| 쿠키 | `_fbp`(픽셀이 만든다). `_fbc` 는 `fbclid` 로 만드는데 부트가 주소에서 먼저 지워 생기지 않는다(§2, HP-628) — Meta 의 클릭 단위 귀속은 그만큼 약하다 |
| 철회 | `fbq('consent', 'revoke')`(Meta 공식 전송 보류) + `_fbp`·`_fbc` 쿠키 삭제. `fbevents.js` 는 떼어 낼 수 없어 이 페이지에서는 더 부르지 않는다(`_metaBlocked`, 같은 페이지 재허용에도) — 다음 로드부터는 게이트가 막는다 |
| 금지 목록 | §2 그대로 — 작품·회차 ID·검색어·전체 URL(첫 화면 밖)·토큰·회원 식별값은 싣지 않는다 |

> ⚠️ **Meta 이벤트 관리자의 원격 설정은 이 저장소에서 확인할 수 없다.** 자동 고급 매칭처럼 데이터 세트 쪽에서 켜고 끄는 수집이 있다 —
> 코드가 끈 수집(고급 매칭·자동 이벤트)이 원격에서 켜져 있지 않은지 사람이 이벤트 관리자 화면에서 확인한다(메뉴 이름은 추측하지 않는다).

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
| v7.1 | 2026-10-01 | 작품 탐색도 한국 시간대 옵트아웃(§11) — 처음엔 랜딩만이었다가 같은 날 확대. 처리방침 1·6항 문구 갱신, 웹 이벤트 `setUserId`·`identify` 금지를 테스트로 고정(HP-466) — 고경우 |
| v8 | 2026-10-01 | 세션 리플레이를 작품 탐색까지(§9) — 동의 버전 4, 남의 평가·채팅·닉네임·프로필 사진·계정 이름은 `amp-mask`/`amp-block` 으로 가림, 처리방침 1·3·5·6항 "웹사이트의 화면 조작 기록"(HP-457) — 고경우 |
| v9 | 2026-10-01 | 랜딩 제품 화면 토글이 버튼 → 스크롤 진행 표시로 바뀌어 `demo_interacted` 의 `action` 을 `toggle` → `scroll_complete`(원본에서 Replix 까지 다 넘긴 페이지뷰당 1회)로 교체. 섹션 순서 변경(함께 보기 3번째·설명 카드 6번째)은 `section_viewed` 열거값에 영향 없음(HP-467) — 고경우 |
| v10 | 2026-10-01 | 내 활동(`#/me`, HP-443) — `page_viewed{route: me}`, `catalog_engaged{feature: my_activity}`(`opened`·`more`·`review_deleted`), `watch_link_clicked{from: my_activity}`. 새 이벤트 없음, ID·본문 금지 유지 — 김지호 |
| v11 | 2026-10-02 | 휴대폰 설치 안내(HP-477) — 휴대폰 기기에서 설치 버튼은 웹 스토어 대신 'PC 크롬에서 써요' 시트를 연다. 새 이벤트 `install_guide_action{action: opened \| copy_link \| share \| open_store}`, `install_cta_clicked` 는 그대로(클릭 시점 계측). 랜딩 헤더는 760px 이하에서 설치 버튼 대신 '작품 탐색'(`nav_link_clicked{target: catalog, location: nav}` 이 휴대폰에서도 생긴다). `/invite` 는 여전히 계측하지 않는다 — 김지호 |
| v12 | 2026-10-05 | 랜딩 디스코드 섹션(HP-497) — `nav_link_clicked` 에 `location: discord` 와 `target: discord_install`(봇 추가, 새 탭) · `discord`(`/discord/` 페이지) 2곳을 더해 15곳. 봇 추가는 익스텐션 설치가 아니라 `install_cta_clicked` 에 넣지 않는다 — 조현빈 |
| v13 | 2026-10-10 | 랜딩·한국 시간대 세션 리플레이 옵트아웃(§9·§11) — `replayFor()` 가 가른다: 허용이면 어디서나, 한국 시간대 랜딩 미선택은 `REPLAY_OPTOUT_FROM`(2026-10-10) 부터, 작품 탐색·해외 미선택·거부는 안 찍음. 안내 배너 `noticeText(true)`, 처리방침 1·6항 공고=시행 2026-10-10, 동의 버전은 4 유지. 근거 = 국내 주요 사이트 실측(29CM·당근·무신사·티빙·인프런·클래스101 이 첫 화면에서 동의 없이 녹화)(HP-457 확대) — 고경우 |
| v14 | 2026-10-12 | 동의 배너를 두 층으로(§3 UI 행, HP-585) — 요약(70자 이하, 스크롤·클릭·미국·허용이 더하는 것) + 배너 안에서 펼치는 세부와 처리방침 링크, [거부]·[허용] 같은 크기. 휴대폰 첫 화면 가림 30% → 11%, PC 1366×640 에서 히어로 설치 버튼을 더는 가리지 않는다. 수집·옵트아웃·리플레이 범위와 동의 버전(4)은 그대로. 근거 = 수집 시점 화면 고지 의무를 찾지 못했고 법정 투명성 수단은 처리방침(법 제30조), 개인정보위 작성지침(2026.4.) p.93 의 "간결하게 + '더 알아보기'", 국내 서비스 18곳 배너 없음(2026-10-12 실측) — 조사 결과이며 법률 검토는 HP-282. 2026-10-02 HP-478 의 '문구를 줄이거나 접지 않는다'를 대체 — 조현빈 |
| v15 | 2026-10-13 | 랜딩 제품 화면 전환이 스크롤 비례 → 경계 방식으로 바뀌어 `demo_interacted{scroll_complete}` 의 발화 시점이 '진행도 1 도달'에서 '화면 전체가 들어와 전환 경계를 넘음'으로 앞당겨졌다. 이벤트 이름·속성은 그대로(HP-602) — 조현빈 |
| v16 | 2026-10-13 | 계측 정확도(HP-615, 2026-10-13 광고 성과 분석): ① GA `page_location` 에 광고 캠페인 쿼리(utm 다섯)를 남긴다 — 광고 클릭 식별값(`gclid` 등)은 처리방침의 GA 수집 항목 밖이라 남기지 않는다(§2·§10) ② GA 로 보낼 때만 `source` → `click_source`, 이름을 정하지 않은 유입 경로 예약어는 GA 에 싣지 않는다(§10) ③ 모든 웹 스토어 링크에 `utm_source=replix.tv&utm_medium=<위치>`(§12), `/discord/` 설치 버튼을 `install_cta_clicked{location: discord}` 로(허용한 방문자만, §11) — `/invite`·`/together` 는 계측 없음 유지 ④ 카탈로그 `page_viewed` 는 페이지가 바뀔 때만 — 홈 안 앵커·공지 항목·로그인 왕복 로드는 세지 않는다(§6) ⑤ 로컬 호스트 미전송(디버그 표시로만)·팀 브라우저 `traffic_type=internal` 표시(§5·§7) ⑥ 옵트아웃·리플레이·배너를 첫 화면·작품 탐색으로 묶는 `fullSurface`, §3 동의 버전 표기를 코드(4)와 맞춤. 동의 버전은 그대로 4 — 조현빈 |
| v17 | 2026-10-14 | `login_completed` 가입 정정(HP-619, §6): 새 속성 `login_kind`(`signup` · `reconsent` · `login` · `consent`) — 동의 저장 응답의 `newAccount`(Replix-be HP-619)로 가입과 재동의를 가르고, 그 BE 가 운영에 나가기 전에는 `consent`. `is_new_user` 는 뜻(동의 모달을 거쳤는가)을 바꾸지 않되 **가입 수가 아니라고** 정정. §5 `surface` 설명의 익스텐션 값을 실제 값(`EXT`, 피드백 2종·`login_completed` 만)으로 정정 — 조현빈(Claude Code) |
| v18 | 2026-10-14 | 처리방침 정합(HP-628): ① 거부 뒤 SDK 의 묶음 전송을 관문(`gateTransport`)이 막는다 — `setOptOut` 은 새 이벤트만 막아 이미 큐에 든 묶음이 거부 0.5~0.7초 뒤 나갔다(처리방침 6항 '철회하면 미전송 기록 즉시 삭제'와 반대, §3·§7) ② 광고 클릭 식별값 11종(`CLICK_ID_PARAMS`)을 부트 때 주소에서 지운다 — Amplitude 웹 귀속이 `gclid`·`fbclid` 를 사용자 속성으로 보내고 있었다(처리방침 수집 항목 밖, §2·§4·§10). 다시 모을지는 수집 범위 조사(HP-627)가 정한다. 이벤트·동의 버전은 그대로 — 조현빈(Claude Code) |
| v19 | 2026-10-14 | 작품 화면 첫 화면 설치 버튼(HP-636, §6·§12): '넷플릭스에서 N화 보기' 옆 '크롬 익스텐션 설치하기'가 2026-09-05부터 작품 탐색 홈(`#/`)으로 가고 `data-cta` 가 없어 설치 계측·휴대폰 안내 시트를 타지 않았다 — 웹 스토어(`utm_medium=catalog_title_hero`)로 고치고 `install_cta_clicked.location` 에 `catalog_title_hero` 를 더한다. 그 전의 `catalog_title` 은 순간 채팅 아래 링크만 센 값이다. 머리 제목의 판 번호를 v16 에서 v19 로 맞춤. 이벤트 이름·동의 버전은 그대로 — 김지호(Claude Code) |
| v20 | 2026-10-14 | 휴대폰 설치 안내 시트(HP-638, §6): `install_guide_action` 에 새 값 `mail`(메일로 나에게 보내기 — 공유 기능이 없는 앱 밖 브라우저의 두 번째 버튼)·`open_catalog`(랜딩에서 연 시트의 '휴대폰으로는 작품 탐색부터 둘러보기')과 새 속성 `in_app`(앱 안 브라우저 종류, UA 로 가림). 앱 안 브라우저에서는 '웹 스토어에서 PC로 보내기'를 빼고, 'PC 크롬 주소창에 이렇게 입력하세요' 아래 replix.tv 를 주소창 모양으로 보인다. 동의 버전은 그대로 — 김지호(Claude Code) |
| v21 | 2026-10-17 | 랜딩 본문 구성 개편(HP-664, §6·§12): 순서가 첫 화면 → 친구랑 같이 보기(`#friends`) → 디스코드 → 혼자 볼 때(`#how`) → FAQ → 마지막 버튼으로 바뀌어 `section_viewed.section` 을 `friends` · `discord` · `how` · `faq` · `install` 로 바꿨다(`intro`·`rooms`·`scenes`·`works` 는 빠진 섹션). 섹션 구성과 상관없는 새 이벤트 `scroll_depth{percent: 25 \| 50 \| 75 \| 100}`(W3). `install_cta_clicked.location`·`utm_medium` 에 `friends`(중간 버튼)·`float`(휴대폰 따라오는 버튼) — `together` 는 디스코드 연결 착지(`/together`)가 이미 쓰는 낱말이라 피했다. `nav_link_clicked` 메뉴·바닥 링크 `friends`·`how`(15곳 그대로). `demo_interacted` 는 제품 화면을 빼 발화 지점이 없다. `faq_opened.question_index` 의 순번이 가리키는 질문이 바뀌었다. 동의 버전은 그대로 — 조현빈(Claude Code) |
| v22 | 2026-10-17 | 디스코드 봇 추가 계측(HP-671, §3·§6·§11): `/discord/` 의 [디스코드에 추가] 2곳을 `nav_link_clicked{target: discord_install, location: discord_page_hero \| discord_page_close}` 로 센다 — 이미 허용한 방문자만(그 페이지의 웹 스토어 버튼과 같은 조건). 클릭은 설치가 아니라는 주의와 실제 추가 수의 출처(BE `discord.guild_added`)를 §6 에 적었다. 동의 버전은 그대로 — 조현빈(Claude Code) |
| v23 | 2026-10-20 | Meta 픽셀(§13, HP-542) — GA 와 같은 수집 게이트 뒤에 첫 화면 `/` 에서만, 운영 2026-10-20 시행(처리방침 2026-10-20 공고). `PageView`(로드 1회)·`Lead`(= `install_cta_clicked`)·`SendToPc{action}`(= `install_guide_action` 의 PC로 보내기 네 행동)만, `autoConfig`·`disablePushState` 끔, 고급 매칭 없음, 팀 브라우저 제외, 철회 시 `consent revoke`·`_fbp` 삭제. GA 를 광고 성과 측정에도 쓴다(§10). 동의 버전 **5**(운영은 2026-10-20 전까지 4 유효) — 조현빈(Claude Code) |
| v24 | 2026-10-21 | 광고 캠페인 쿼리에 `utm_id` 를 더했다(§10·§13, HP-690). Meta 가 광고 주소에 빠진 utm 항목을 자동으로 채워 `utm_term`(광고 세트 번호)·`utm_id`(캠페인 번호)를 붙이는데, `utm_id` 가 `GA_CAMPAIGN_PARAMS` 밖이라 `metaPageSafe` 가 광고로 온 모든 방문에서 픽셀을 붙이지 않았다 — 2026-10-21 광고 D 방문자 7명 모두 이 주소였고, Amplitude 의 설치 버튼 7명·PC로 보내기 4명이 Meta 에는 0건이었다. `utm_id` 는 캠페인 단위 값이라 방문자를 가리키지 않아 처리방침 수집 항목(방문한 페이지)은 그대로다. GA `page_location` 에도 남는다(GA4 표준 캠페인 ID). 이벤트·동의 버전은 그대로 — 조현빈(Claude Code) |
| v25 | 2026-10-21 | Google 광고 클릭 식별값을 GA 페이지 주소에만(§2·§10, HP-691). 부트가 광고 클릭 식별값을 주소에서 지우기 전에 `gclid`·`gbraid`·`wbraid` 만 받아 두고(`GA_CLICK_ID_PARAMS`·`gaClickParts`) `gaPage` 가 `page_location` 에 붙인다 — 유튜브 광고의 GA4 전환(설치 버튼 클릭)을 Google Ads 가 광고 클릭에 잇게 하려는 것. 운영은 처리방침 개정 시행일 `GA_CLICK_FROM`(2026-10-21, 공고와 동시 — 조현빈 결정)부터. 주소창·Amplitude·리플레이·Meta 픽셀은 그대로 보지 못한다. 이벤트·동의 버전은 그대로 — 조현빈(Claude Code) |
