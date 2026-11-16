# 스트리머 섹션 장면 그림 — AI 생성 이미지 (HP-876)

랜딩 '스트리머와 같이 보기'(`#streamer`)의 방송 화면 장면과 '내 화면'의 작품 장면은 **이미지 생성 모델로 만든 그림이다.**
그림 속 스트리머 '루나'는 애니 그림체의 오리지널 버추얼 캐릭터이고 실존 인물·실존 스트리머·기존 캐릭터가 아니다. 『밤의 정원』도 가상 드라마다.
그림에는 글자·로고·방송 플랫폼 화면이 없고, 화면의 글자(타이머·채팅·자막·플레이어)는 모두 HTML 로 얹었다.
광고 소재 원칙(실사 인물 없음, 가상 작품의 애니 그림체 인물 허용 — memory §1)과 맞는다.

| 파일 | 쓰는 곳 |
| --- | --- |
| `docs/assets/scene/stream-vtuber.jpg` (1600×900) | 방송 화면 장면(`.sx-room`) |
| `docs/assets/scene/garden-still.jpg` (1600×900) | '내 화면' 플레이어(`.sx-still`) — 2.39:1 로 레터박스해 보인다 |

## 만든 방법
- 도구: codex CLI 0.152.0(`codex exec -m gpt-5.6-sol`)의 내장 이미지 생성 도구. 2026-11-16 생성, 원본 1672×941 PNG.
- 장면마다 3안을 만들어 골랐다. 방송 장면은 머리 꼭대기가 화면 높이 28% 아래에서 시작해 타이머·오버레이 채팅과 얼굴이 겹치지 않는 안,
  작품 장면은 두 인물이 뒷모습으로 작게 가운데에 있고 아래가 어두워 자막이 읽히는 안이다.
- 웹용: 16:9 로 가운데 자른 뒤 1600×900 JPEG.

### 프롬프트 — 방송 장면
```
Wide 16:9 landscape illustration, original anime-style virtual streamer character, cozy anime illustration of a streaming room at night. Composition: the streamer is placed in the LOWER-LEFT third of the frame, shown from the chest up, slightly turned to the right, looking off-screen to the right as if watching a drama on another monitor, with a gentle surprised smile (lips slightly parted, bright eyes). She wears over-ear headphones with a small boom mic in soft cream color. Character design (original, must not resemble any existing VTuber or anime character): a young woman with shoulder-length wavy hair in deep teal with subtle copper-orange inner highlights, warm amber eyes, a loose mustard-yellow knit cardigan over a white collared shirt, a small crescent moon hair clip. Background: the same anime art style, a cozy small room — warm string lights, a bookshelf with plants, a window showing a deep blue night sky, soft purple and warm orange lamp glow, slightly blurred with depth of field. Keep the UPPER-LEFT and UPPER-RIGHT areas and the right side relatively calm and uncluttered (soft blurred wall, window, shelves) so that interface cards can be placed there later. Hands either out of frame or resting naturally. Clean high-quality anime illustration, soft cel shading, natural anatomy, correct eyes. Absolutely no text, no letters, no logos, no watermarks, no user interface, no chat overlay, no screen showing video content, no streaming platform elements.
```

### 프롬프트 — 작품 장면
```
Wide 16:9 cinematic film still from a fictional Korean romance drama titled "The Night Garden" (do not render any title). A secret garden at night: winding stone path, lush hedges and blooming white night flowers, many warm paper lanterns hanging from branches and placed along the path, fireflies, soft blue moonlight mixed with warm lantern glow, light mist. Two young people seen from behind, walking side by side along the lantern-lit path in the middle distance, small in the frame, faces not visible (back view or distant silhouette). Anamorphic cinematic look, shallow depth of field, gentle film grain, rich teal and amber color grading. Leave the lower third slightly darker and calm so subtitles can be overlaid later. Original scene, not resembling any real drama, movie or poster. No text, no letters, no subtitles, no logos, no watermarks, no borders.
```
