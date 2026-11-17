# 랜딩의 익스텐션 화면 — 익스텐션을 구워 넣는다 (HP-677)

랜딩(`docs/index.html`)에 보이는 익스텐션 패널 다섯 자리는 손으로 그린 모형이 아니라 **익스텐션의 실제 화면을 구워 둔 것**이다
(2026-11-16 조현빈 결정). 손으로 그린 모형은 익스텐션이 바뀔 때마다 낡았다 — 1.6.0 이 게시됐을 때 랜딩은 1.2.0 무렵의 화면이었다.

| 자리 | 장면 | 구운 크기 | 내용 |
| --- | --- | --- | --- |
| 첫 화면(#top) 재생 화면 옆 | `hero` | 360×560 | 시작 화면 → 방 만들기 → 초대 링크 복사 → 친구 둘 입장 → 대화 → 멈춤·이동·재생. `js/top.js` 가 돌린다 |
| 친구랑 같이 보기(#friends) 카드 | `friends` | 360×560 | 그룹방 창(라이트 테마) — 초대 링크 복사 → 수민 입장 → 대화 → 현우 입장 → 대화. `js/friends-fx.js` 가 돌린다(HP-885) |
| 디스코드(#discord) 크롬 창 속 | `discord` | 300×429 | 그룹방 창(라이트 테마), 멈춘 장면 하나. 칸이 좁아 폭 300px 로 굽는다 |
| 혼자 볼 때(#how) 첫 장 | `solo` | 360×424 | 커뮤니티 칸 — 먼저 본 사람들의 채팅 |
| 혼자 볼 때(#how) 둘째 장 | `live` | 360×530 | 커뮤니티 칸 — 실시간 글 셋이 차례로 들어온다(11초마다 되풀이) |

휴대폰(760px 이하)의 첫 화면은 구운 화면이 아니라 정리형 띠(`.yp-in`, `css/top.css`)다 — 2026-10-16 결정대로 덜어 낸 모양을 유지한다.

## 파일

| 경로 | 무엇 |
| --- | --- |
| `docs/ext/panel.html` · `panel.js` | iframe 으로 들어가는 페이지와 재생기(손으로 쓴 것). 장면은 주소의 `#` 뒤 이름. 색인되지 않게 `noindex` |
| `docs/ext/film-<장면>.js` | 구운 장면 목록 — 장면마다 `{ t: 시각 ms, c: 재생 위치 초, p: 재생 중, h: 패널 HTML }`. **만든 파일** |
| `docs/ext/panel.css` | 익스텐션 `styles.css`(약 0.7MB)에서 위 장면이 쓰는 규칙만 남긴 것(약 60KB). **만든 파일** |
| `docs/ext/fonts/` | 익스텐션의 Replix Sans 에서 장면에 나오는 글자만 남긴 글꼴(약 38KB)과 라이선스(OFL.txt). **만든 파일** |
| `docs/css/ext-panel.css` · `docs/js/ext-panels.js` | 랜딩 쪽 자리의 틀과 크기 맞추기(패널을 구운 폭으로 그리고 자리 폭에 맞춰 줄인다, 보이는 자리만 받는다) |
| `docs/css/friends.css`(.fx) · `docs/js/friends-fx.js` | 친구랑 같이 보기 카드 — 재생 화면 옆에 패널이 열리고(작품 화면은 레터박스), 친구가 들어온 뒤 재생 화면이 접혀 패널만 커진다. 크기·불러오기를 스스로 맡는다(`.rxfit` 을 쓰지 않는다) |
| `scripts/ext-panel/harness.html` | 굽는 페이지 — 익스텐션의 실제 마크업·CSS·모듈을 가짜 서버 응답으로 돌린다. 장면 대본(`SCRIPTS`)이 여기 있다 |
| `scripts/ext-panel/bake.mjs` · `subset-font.py` | 굽기 — 장면 뜨기, 쓰는 CSS 만 남기기, 글꼴 추리기 |

## 다시 굽기 — 익스텐션 화면이 바뀌었을 때

그룹방 창·시작 화면·상단바·커뮤니티 칸의 모양이나 문구가 바뀐 버전이 스토어에 게시되면 다시 굽는다.

```bash
git -C ../Replix-extension worktree add /tmp/ext-1.7.0 ext-v1.7.0        # 게시된 버전의 태그
python3 -m venv /tmp/rx-font && /tmp/rx-font/bin/pip install fonttools==4.63.0 brotli
node scripts/ext-panel/bake.mjs --ext /tmp/ext-1.7.0 --python /tmp/rx-font/bin/python
node scripts/test-ext-panel.mjs
python3 -m http.server 8000 --directory docs     # http://localhost:8000 에서 다섯 자리를 눈으로 본다
```

크롬이 기본 자리에 없으면 `--chrome <실행 파일>` 을 준다. 결과(`docs/ext/film-*.js` · `panel.css` · `fonts/`)를 커밋한다.

- **하네스가 깨지면** 익스텐션의 `test/manual/room-window.html` 을 본다. 하네스는 그 도구와 같은 방식(모듈을 그대로 싣고 `fetch` 만 흉내)이라,
  익스텐션이 모듈을 나누거나 `init` 에 넘기는 값을 바꾸면 그 도구가 먼저 고쳐진다. 하네스의 `<script src>` 목록과 `deps` 를 거기에 맞춘다.
- **'함께 보는 중'이 안 되고 '맞추는 중'으로 남으면** 하네스가 `ReplixPlayback` 의 `isPaused`·`getRoomSample`·`getTime`·`read`·`getAxisDurationSec`
  를 대본 시계로 바꿔 둔 자리를 본다. 이 페이지에는 영상이 없어, 그대로 두면 그룹방은 내 재생이 멈춘 줄 안다.
- **입장 줄('○○님이 들어왔어요')이 안 나오면** 멤버 폴링을 본다. 익스텐션은 입장을 서버 이벤트가 아니라 15초 폴링의 차이로 안다 — 하네스는
  8초 넘는 타이머를 모아 두었다가 멤버를 더한 직후 부른다(`window.__poll`). 대본의 타이머는 그 목록에 들지 않게 원래 `setTimeout` 으로 건다.
- **친구랑 같이 보기 대본의 시각을 옮기면** `harness.html` 의 `SCRIPTS.friends` 와 `docs/js/friends-fx.js` 의 `steps` 를 함께 옮기고 다시 굽는다.
  커서가 '초대 링크 복사'를 누르는 시각이 구운 복사 사건과 같은지는 `scripts/test-ext-panel.mjs` 가 대조한다. 재생 화면이 접히는 시각(4.7초)은 친구 입장(3.6초) 뒤에 두고 눈으로 본다.
- **첫 화면 대본의 시각을 옮기면** `harness.html` 의 `SCRIPTS.hero` 와 `docs/js/top.js` 의 `steps` 를 함께 옮기고 다시 굽는다. 패널은 구울 때의
  시각표대로 스스로 장면을 넘기고, 바깥 커서는 `top.js` 의 시각에 움직인다(`scripts/test-ext-panel.mjs` 가 두 시각표를 대조한다).

## 알아 둘 것

- **지어낸 예시다.** 사람(지우·민지·현우·지혜·수민 …)·작품('밤의 정원')·대화는 지어낸 것이고, 하네스와 `docs/ext` 는 어디로도 요청을 보내지 않는다.
  넷플릭스에서 꺼낸 것은 없다(워크스페이스 `CLAUDE.md` §7).
- **구운 화면은 누를 수 없는 그림이다**(`pointer-events: none`). 마우스·포커스 상태의 규칙은 `panel.css` 에 싣지 않는다.
- **움직이는 도중의 모양은 굽지 않는다.** 125ms 마다 떠서 다음 뜨기와 같은(멈춘) 모양만 남긴다. 장면 사이는 재생기가 달라진 곳만 고치고
  새로 생긴 줄을 살짝 띄운다 — 익스텐션의 화면 전환 움직임(방 창이 단추에서 펼쳐지는 것 등)은 나오지 않는다.
- **회차 표기**는 익스텐션 그대로 '시즌1 3화'다. 랜딩의 다른 글(넷플릭스 조작 막대·단계 설명)은 '3화'로 둔다.
- **글꼴**: 장면에 없는 글자는 기기 글꼴로 그려진다. 대본의 글을 바꾸면 `--python` 을 주고 구워 글꼴도 다시 만든다.
