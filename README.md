# replix-site — replix.tv 공개 웹 표면

Replix의 정적 웹 표면. GitHub Pages로 `https://replix.tv`에 서빙된다(커스텀 도메인 = `CNAME` 파일, DNS = 가비아 A 레코드 4개).

| 경로 | 현재 | 계획 |
| --- | --- | --- |
| `/catalog/` | **작품 탐색 페이지(HP-124, 내부 명칭 catalog — 2026-09-07 '큐레이션'에서 개명, 옛 경로 `/curation/`은 폐기)** — 실제 시청·채팅 기록을 작품 → 회차 → 순간으로 펼치는 참조 카탈로그. 소스 = `catalog/app`(Vite+React), 산출물 = `docs/catalog/index.html` 한 장(빌드해서 커밋). 대상 API 는 `catalog/app/index.html` 의 `<meta name="api-base">` |
| `/seeding/` | **관리자용 시딩 도구**(HP-435) — 작품·회차 선택 → 커뮤니티 수집(디시·더쿠) 실행·진행·결과·JSON 저장. 관리자 롤 로그인 필수, `noindex`. 소스 `seeding/app`, 산출물 `docs/seeding/index.html` |
| `/` | 자리 지킴(워드마크) | **HP-87 랜딩 페이지**(소개·설치 CTA — 문구는 담당자 직접 작성 규칙). 작업본은 `docs/`에 있다 — 확정되면 아래 '배포 구조'대로 전환만 하면 된다 |
| `/invite` | **HP-186 초대 스텁**(C안) — `?w=<넷플릭스 watch id>&t=<초대 토큰>`을 받아 `netflix.com/watch/<w>#replix-invite=<t>`로 이동 | 랜딩형 초대 페이지로 교체(설치 CTA + "넷플릭스에서 열기") — **URL·파라미터 계약 불변** |

## 계약 (변경 금지)

- 초대 링크 형식: `https://replix.tv/invite?w=<watch id>&t=<토큰(base64url 43자)>` — 이미 밖으로 공유되는 영구 표면. 정본 = Jira **HP-186 코멘트 11185** · **HP-87 코멘트 11191**.
- 토큰은 넷플릭스 URL의 **해시(#)** 로만 나른다 — fragment는 서버·리퍼러로 전송되지 않는다.
- `/invite`는 `noindex` 유지, 토큰을 로그·분석 도구로 보내지 않는다.
- 설치자는 확장 background가 `replix.tv/invite` 진입을 가로채므로 이 페이지 도달 전에 처리된다 — 이 저장소는 **미설치자용 표면**이다.

## 배포 구조 (2026-08-06 결정 · 2026-09-20 미리보기 제거, HP-433)

**`replix.tv`는 실공개 상태다** — GitHub Pages 소스가 `main`/`/docs`이고, `main`에 push하면 그대로 나간다(순수 정적, 별도 빌드 없음 — **머지가 곧 배포**). 문구는 여전히 초안이다(담당자가 확정 전 override로 먼저 공개했다, `docs/README.md` 참조).

| 무엇을 | 어떻게 | 브랜치 연결 |
| --- | --- | --- |
| 로컬 개발 | `docs/` 에서 작업, `python3 -m http.server`로 확인(`docs/README.md`) | 없음 |
| 실제 배포 | GitHub Pages | `main` push → 자동 |

**팀 리뷰용 미리보기(`landing.replix-dev.site`)는 2026-09-20 없앴다(HP-433).** 2026-08-06에 "랜딩 문구 확정 전 팀이 먼저 본다"는 용도로 EKS dev에 nginx 컨테이너로 띄웠는데, `replix.tv`가 확정 전에 공개되면서 같은 `main`이 두 주소에 동시에 나가는 중복이 됐다. 머지 전 확인은 로컬(`python3 -m http.server`)로 하고, 운영 데이터를 건드리지 않는 시험은 `api.replix-dev.site`를 겨눠서 한다. 그때 쓰던 워크플로(`deploy-preview-on-main.yml`)·`scripts/deploy-dev.sh`·`Dockerfile`·`nginx.conf`, Replix-be `k8s/overlays/dev/landing.yaml`, ECR `replix-landing`, IAM 역할 `replix-site-gha-deploy`, 가비아 `landing` 레코드가 그 흔적이다 — 되살릴 일이 있으면 `git log`의 HP-433 이전 상태와 Confluence `[운영] 인프라 구성`을 본다.

**`replix.tv`가 부르는 API는 아직 dev(`api.replix-dev.site`)다.** 분리하지 않은 이유는 실제 prod 백엔드가 아직 없기 때문이다(운영 EC2 정지, `PROD_DEPLOY_ENABLED=false` — HP-215). prod 백엔드가 실제로 뜨면 그때 `docs/index.html`의 `api-base`를 환경별로 나누는 걸 다시 볼 것(백로그 **HP-280**).

이후로는 별도 승격·복사 단계가 없다 — `docs/`가 계속 유일한 작업 위치이자 배포 소스다.

**같은 방식 = 시딩 도구(`/seeding/`).** 소스 `seeding/app`, 산출물 `docs/seeding/index.html`. `cd seeding/app && npm install && npm run build`
로 빌드해 커밋한다. 이 페이지는 **주소로 서버를 고른다**(`seeding/app/src/env.ts`) — `replix.tv` 면 운영(`api.replix.tv`·`auth.replix.tv`),
그 외(localhost:5175 등)면 개발 서버. 운영 데이터를 쓰는 도구라 메타·빌드 인자로 바꿀 수 없게 했다. Keycloak `replix-web` 의
redirect URI 에 `https://replix.tv/seeding/*` 와 `http://localhost:5175/*` 가 있어야 로그인이 된다. 서버 API 는 Replix-be
`/api/v1/admin/seeding/**`(HP-434).

**예외 = 작품 탐색(`/catalog/`).** 이 표면만 React 앱이라 소스는 `catalog/app`, 배포물은
`docs/catalog/index.html` 한 장이다(`vite-plugin-singlefile`). 고치면 `cd catalog/app && npm install && npm run preview:file`
로 다시 빌드해 산출물까지 함께 커밋한다 — 
커밋된 산출물이 곧 배포물이다(GitHub Pages는 빌드 단계가 없다). 작품 탐색이 부르는 API(`/contents`, `/episodes/{id}/moments`, `/also-watched`)는
Replix-be HP-390·391로 develop 에는 있고 **main(운영 `api.replix.tv`)에는 다음 릴리스 때 실린다** —
**그래서 2026-09-07부터 작품 탐색만 임시로 개발 서버(`api.replix-dev.site`)를 본다**(`catalog/app/index.html`
의 `api-base`, 조현빈 결정). 릴리스가 나가면 `api.replix.tv` 로 되돌린다.
