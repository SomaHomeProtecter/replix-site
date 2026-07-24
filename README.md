# replix-site — replix.tv 공개 웹 표면

Replix의 정적 웹 표면. GitHub Pages로 `https://replix.tv`에 서빙된다(커스텀 도메인 = `CNAME` 파일, DNS = 가비아 A 레코드 4개).

| 경로 | 현재 | 계획 |
| --- | --- | --- |
| `/` | 자리 지킴(워드마크) | **HP-87 랜딩 페이지**(소개·설치 CTA — 문구는 담당자 직접 작성 규칙) |
| `/invite` | **HP-186 초대 스텁**(C안) — `?w=<넷플릭스 watch id>&t=<초대 토큰>`을 받아 `netflix.com/watch/<w>#replix-invite=<t>`로 이동 | 랜딩형 초대 페이지로 교체(설치 CTA + "넷플릭스에서 열기") — **URL·파라미터 계약 불변** |

## 계약 (변경 금지)

- 초대 링크 형식: `https://replix.tv/invite?w=<watch id>&t=<토큰(base64url 43자)>` — 이미 밖으로 공유되는 영구 표면. 정본 = Jira **HP-186 코멘트 11185** · **HP-87 코멘트 11191**.
- 토큰은 넷플릭스 URL의 **해시(#)** 로만 나른다 — fragment는 서버·리퍼러로 전송되지 않는다.
- `/invite`는 `noindex` 유지, 토큰을 로그·분석 도구로 보내지 않는다.
- 설치자는 확장 background가 `replix.tv/invite` 진입을 가로채므로 이 페이지 도달 전에 처리된다 — 이 저장소는 **미설치자용 표면**이다.

## 배포

`main`에 push하면 GitHub Pages가 자동 배포한다. 별도 빌드 없음(순수 정적, 외부 리소스 0 유지).
