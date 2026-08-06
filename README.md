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

## 배포 구조 (2026-08-06 결정)

`main`에 push하면 GitHub Pages가 자동 배포한다. 별도 빌드 없음(순수 정적, 외부 리소스 0 유지) — **머지가 곧 배포**다.

**환경은 3단이 아니라 로컬 / (수동) 팀 리뷰용 미리보기 / 자동 배포, 이렇게 성격이 다른 셋이다.** 백엔드처럼 `develop`→dev 상시 환경을 두지 않는다 — 정적 페이지는 상태가 없어 잘못돼도 이전 커밋으로 되돌리면 그만이라, 상시 환경이 막아 주는 위험(데이터 손상·마이그레이션 실패)이 애초에 없다. 대신 "머지 전에 팀이 diff 말고 실제 화면을 보고 싶다"는 요구만 별도로 푼다.

| 무엇을 | 어떻게 | 브랜치 연결 |
| --- | --- | --- |
| 로컬 개발 | `docs/` 에서 작업, `python3 -m http.server`로 확인(`docs/README.md`) | 없음 |
| 팀 리뷰용 미리보기 | `bash scripts/deploy-dev.sh` — `landing.replix-dev.site`에 수동으로 올린다(`docs/README.md` '배포' 절) | **없음(의도적)** — 지금 로컬에 체크아웃된 걸 그대로 올리는 도구일 뿐, 어떤 브랜치에도 자동 반응하지 않는다 |
| 실제 배포 | GitHub Pages | `main` push → 자동 |

GitHub Pages는 소스를 레포 루트(`/`) 또는 `/docs` 둘 중 하나로만 지정할 수 있다. **지금은 아직 루트가 소스다**(자리 지킴 `index.html` + `/invite`가 서빙 중) — `docs/`는 이미 완성된 랜딩을 담고 있지만 문구가 초안이라(2026-07-13 팀 결정) 아직 공개하지 않는다.

**공개(승격) 절차 — 문구가 확정된 뒤 한 번만**:
1. `docs/index.html`에서 `<meta name="robots" content="noindex">`를 지운다(`docs/README.md` 참조 — 이 시점 이전에 지우면 초안이 색인된다).
2. GitHub Settings → Pages → Source를 `main` / `/docs`로 바꾼다(또는 `gh api -X PUT repos/SomaHomeProtecter/replix-site/pages -f "source[branch]=main" -f "source[path]=/docs"`).
3. 확인되면 루트의 `index.html`(자리 지킴)은 지워도 된다 — `docs/CNAME`·`docs/invite/`가 이미 있어 도메인·초대 스텁은 그대로 이어진다.

이후로는 별도 승격·복사 단계가 없다 — `docs/`가 계속 유일한 작업 위치이자 배포 소스다.
