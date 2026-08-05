# landing — HP-87 공개 랜딩 페이지

`replix.tv` 루트에 들어갈 랜딩 페이지다. 지금은 **dev 표면
`https://landing.replix-dev.site`** 에서 검토용으로 돌고 있고, 문구·디자인이
확정되면 레포 루트로 승격해 GitHub Pages(`replix.tv`)가 서빙하게 한다.

## 열어 보기

```bash
python3 -m http.server 8000     # http://localhost:8000
```

⚠️ **`file://` 로 직접 열면 동작하지 않는다.** JS 를 ES 모듈로 쪼갠 뒤부터
브라우저가 `file://` 의 모듈 로딩을 CORS 로 막기 때문이다. 반드시 서버로 연다.

## 구조

한 파일에 CSS·JS 를 모두 담던 방식(2,556줄)에서 2026-08-05 에 쪼갰다.
번들러는 쓰지 않는다 — 브라우저가 그대로 읽는 파일이 곧 배포물이라 빌드 단계가
없고, nginx 도 이 디렉토리를 그대로 서빙한다.

| 경로 | 내용 |
| --- | --- |
| `index.html` | 마크업. `<head>` 에서 CSS 9개를 순서대로 걸고, 끝에서 `js/main.js` 하나를 모듈로 부른다 |
| `css/tokens.css` | 색·간격·타이포 토큰과 리셋. **다른 CSS 보다 먼저 와야 한다** |
| `css/base.css` | 내비·구획 배경 등 화면 공통 |
| `css/hero.css` `scenes.css` `chart.css` `rooms.css` `start-faq.css` `close-footer.css` | 구획별 스타일 |
| `css/floaters.css` | 페이지 곳곳에 떠 있는 장면 카드(`.fcard`) — 전역 장식이라 따로 뒀다 |
| `js/common.js` | 여러 구획이 함께 쓰는 값·헬퍼. **반응 밀도 함수 `density()` 를 히어로와 히트맵이 공유**하는 것이 핵심이다 — 두 그래프가 어긋나지 않는다 |
| `js/hero.js` `scenes.js` `chart.js` `rooms.js` `faq.js` | 구획별 시뮬레이션. 각자 자기 DOM 을 찾아 스스로 붙는다 |
| `js/reveal.js` | 스크롤 조립·숫자 카운트업·내비 경계선(전역 동작) |
| `js/main.js` | 진입점. 위 모듈을 부르기만 한다 |
| `assets/*.jpg` | 실제 작품 스틸 5장(히어로 프레임 + 떠다니는 장면 카드 4장) |

모듈 사이 의존은 **`common.js` 한 방향뿐**이다(구획 모듈끼리는 서로 모른다).
구획을 하나 들어내도 나머지가 그대로 도는 구조이므로, 새 구획을 붙일 때도
`js/` 에 파일 하나를 더하고 `main.js` 에 한 줄 추가하면 된다.

## 고칠 때 알아 둘 것

- **문구는 전부 초안이다.** 최종 문구는 담당자가 직접 작성한다(2026-07-13 팀 결정).
  헤드라인 세 개가 서로 변주 관계다: 히어로 `혼자서도 같이 보는 즐거움, 넷플릭스에서`
  → 히트맵 `같은 장면에서, 시간이 달라도 우리는 만난다` → 마지막 `…, Replix에서`.
  하나를 고치면 나머지도 함께 본다.
- **설치 CTA 는 세 곳(내비·히어로·마지막)이 모두 `#install` 앵커**다. 웹 스토어
  URL 이 정해지면 그 세 곳의 `href` 만 바꾸면 된다(HP-193).
- **화면 안 UI 는 확장의 실제 구조·색을 옮긴 것**이다. `--accent: #e50914` 등
  토큰이 `Replix-extension/styles.css` 와 짝이므로 임의로 바꾸면 설치 전후가
  다른 제품으로 보인다.
- **없는 기능을 그리지 않는다.** 확장에 없는 UI(정렬 셀렉터, 회차 드롭다운 등)는
  의도적으로 뺐다.
- **이미지는 전부 실제 작품 실물 캡처다**(2026-08-03 조현빈 결정). 생성 이미지는
  쓰지 않는다. 작품명도 **넷플릭스 한국 TV Top 10 실물**이다(Tudum 2026-07-20~26
  주간: 동궁·김부장·아파트·오싹한 연애·모태솔로지만 연애는 하고 싶어 시즌2).
  순위가 낡으면 Tudum 에서 다시 받아 갱신한다.
- 채팅·시청 인원 등 활동 수치는 **전부 예시**이며 실제 배포 시 서버 데이터가 들어갈
  자리다 — 푸터에 밝혀 두었다. 인기 회차 카드 배경은 작품 분위기에서 딴 색 그라디언트다.
- **`meta robots noindex` 를 dev 동안 빼지 말 것.** nginx 도 `X-Robots-Tag` 를
  이중으로 건다(`../nginx.conf`) — 검토용 표면이 검색에 잡히면 안 된다. 운영
  승격 때 둘 다 제거한다.

### 시뮬레이션을 만지는 자리

| 상수 | 파일 | 역할 |
| --- | --- | --- |
| `LIVE` | `js/hero.js` | 히어로 라이브 채팅의 도착 시각과 내용 |
| `DM_*` | `js/hero.js` | 탄막 레인·속도·지연. 확장 `features/danmaku.js` 값을 옮겼다 |
| `OTT_ROLL` | `js/hero.js` | 헤드라인 OTT 이름 순환. **현재 꺼 둠** — 이름 길이가 달라 뒤의 '에서'가 밀린다(2026-07-31). 다시 켤 때는 전환 방식을 새로 설계할 것 |
| `PEAKS` / `density()` | `js/common.js` | 반응 밀도. 히트맵과 채팅 생성이 이 함수 하나를 공유한다 |
| `CHAT_POOL` / `ARCHIVE` | `js/scenes.js` | 회차에 쌓인 반응. 밀도 함수로 생성하며 시드 고정 |
| `PLAY_STEP` | `js/scenes.js` | 히트맵 재생 속도 |
| `TITLES` | `js/chart.js` | 인기 회차 카드의 작품·회차·수치 |
| `CIN_POOL` / `runChats()` | `js/rooms.js` | 함께 보는 방식 섹션의 말풍선 문장과 교체 속도 |

## 배포

이미지 빌드·푸시·롤아웃은 레포 루트의 `scripts/deploy-dev.sh` 한 줄이다.
클러스터에 어떻게 뜨는지(Deployment·Service·Ingress)는 **Replix-be 레포
`k8s/base/landing.yaml` · `k8s/overlays/dev/ingress.yaml`** 에 있다.

```bash
bash scripts/deploy-dev.sh          # 새 태그로 빌드·배포
bash scripts/deploy-dev.sh <태그>    # ECR 의 기존 태그로 롤백
```
