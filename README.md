# replix-site — replix.tv 공개 웹 표면

Replix의 정적 웹 표면. GitHub Pages로 `https://replix.tv`에 서빙된다(커스텀 도메인 = `CNAME` 파일, DNS = 가비아 A 레코드 4개).

| 경로 | 현재 | 계획 |
| --- | --- | --- |
| `/` | 자리 지킴(워드마크) | **HP-87 랜딩 페이지**(소개·설치 CTA — 문구는 담당자 직접 작성 규칙). 작업본은 `docs/`에 있다 — 확정되면 아래 '배포 구조'대로 전환만 하면 된다 |
| `/invite` | **HP-186 초대 스텁**(C안) — `?w=<넷플릭스 watch id>&t=<초대 토큰>`을 받아 `netflix.com/watch/<w>#replix-invite=<t>`로 이동 | 랜딩형 초대 페이지로 교체(설치 CTA + "넷플릭스에서 열기") — **URL·파라미터 계약 불변** |

## 계약 (변경 금지)

- 초대 링크 형식: `https://replix.tv/invite?w=<watch id>&t=<토큰(base64url 43자)>` — 이미 밖으로 공유되는 영구 표면. 정본 = Jira **HP-186 코멘트 11185** · **HP-87 코멘트 11191**.
- 토큰은 넷플릭스 URL의 **해시(#)** 로만 나른다 — fragment는 서버·리퍼러로 전송되지 않는다.
- `/invite`는 `noindex` 유지, 토큰을 로그·분석 도구로 보내지 않는다.
- 설치자는 확장 background가 `replix.tv/invite` 진입을 가로채므로 이 페이지 도달 전에 처리된다 — 이 저장소는 **미설치자용 표면**이다.

## 배포 구조 (2026-08-06 결정, 같은 날 두 번 갱신)

**`replix.tv`는 이미 실공개 상태다** — GitHub Pages 소스가 `main`/`/docs`로 전환돼 있고, `main`에 push하면 그대로 나간다(순수 정적, 별도 빌드 없음 — **머지가 곧 배포**). 문구는 여전히 초안이다(담당자가 확정 전 override로 먼저 공개했다, `docs/README.md` 참조).

백엔드처럼 `develop`→dev 상시 환경을 두는 대신, 정적 페이지 성격에 맞게 세 단계로 정리했다.

| 무엇을 | 어떻게 | 브랜치 연결 |
| --- | --- | --- |
| 로컬 개발 | `docs/` 에서 작업, `python3 -m http.server`로 확인(`docs/README.md`) | 없음 |
| 팀 리뷰용 미리보기 | `landing.replix-dev.site` | **`main` push → 자동**(`.github/workflows/deploy-preview-on-main.yml`) — main에 반영된 걸 그대로 EKS dev에도 올린다. 그 사이 중간 상태를 보고 싶으면 `bash scripts/deploy-dev.sh`로 원하는 브랜치를 수동으로도 올릴 수 있다 |
| 실제 배포 | GitHub Pages | `main` push → 자동 |

**미리보기가 부르는 API는 지금도 dev(`api.replix-dev.site`)다 — `replix.tv`도 마찬가지다.** 둘을 분리하지 않은 이유는 실제 prod 백엔드가 아직 없기 때문이다(운영 EC2 정지, `PROD_DEPLOY_ENABLED=false` — HP-215). prod 백엔드가 실제로 뜨면 그때 `docs/index.html`의 `api-base`를 환경별로 나누는 걸 다시 볼 것(백로그 **HP-280**).

미리보기 자동 배포는 GitHub Actions가 AWS IAM 역할(`replix-site-gha-deploy`, OIDC — 레포에 장기 자격증명을 두지 않는다)을 맡아 ECR push + EKS `dev` 네임스페이스 롤아웃까지 한다. 그 역할은 `replix-landing` ECR 레포 push와 `dev` 네임스페이스 편집 권한만 가진다.

이후로는 별도 승격·복사 단계가 없다 — `docs/`가 계속 유일한 작업 위치이자 배포 소스다.
