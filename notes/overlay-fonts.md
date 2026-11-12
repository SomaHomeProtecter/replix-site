# 같이보기 타이머 글꼴 (HP-869)

같이보기 타이머(`docs/overlay`)는 2026-11-12 조현빈 팀장 결정으로 **숫자·영문은 Source Sans 3, 한글은 본고딕(Noto Sans KR)** 으로 그린다.
방송 PC 의 기기 글꼴로 그리면 PC 마다 같은 시각의 폭이 달라(어떤 PC 에서는 '1:01:07' 을 줄여야 했다) 글꼴을 함께 싣는다.
구글 글꼴 서버(fonts.googleapis.com)를 부르지 않고 이 레포에 추린 파일을 올린다 — 방송 PC 가 타이머를 띄울 때 외부 회사로 요청이 나가지 않게.

| 파일 | 원본 | 남긴 것 | 크기 |
| --- | --- | --- | --- |
| `docs/overlay/fonts/ReplixTimerDigits.woff2` | Source Sans 3 `SourceSans3[wght].ttf`, Version 3.052 | ASCII 95자 + 줄바꿈 없는 공백, 굵기 600~800 가변 | 13,948 B |
| `docs/overlay/fonts/ReplixTimerKR.woff2` | Noto Sans KR `NotoSansKR[wght].ttf`, Version 2.004-H2 | 한글 완성형 2,350자(KS X 1001) + 자모 51자 + 문장 부호 16자, 굵기 600~800 가변 | 243,528 B |
| `docs/overlay/fonts/OFL-SourceSans3.txt` · `OFL-NotoSansKR.txt` | 각 원본 폴더의 `OFL.txt` 그대로 | 저작권 고지 + SIL OFL 1.1 전문 | — |

- **받은 곳**: 구글 글꼴 공식 저장소 google/fonts, 커밋 `c30b221beb0c1da59d563feb91ec8656a1fa972a`(2026-11-12 의 main).
  `https://raw.githubusercontent.com/google/fonts/<커밋>/ofl/sourcesans3/SourceSans3%5Bwght%5D.ttf`(sha256 `042fe2cc…19a392`),
  `…/ofl/notosanskr/NotoSansKR%5Bwght%5D.ttf`(sha256 `194018e6…71a1`), 각 폴더의 `OFL.txt`. 전체 해시는 `scripts/subset-timer-fonts.py` 머리.
- **추린 명령**: 두 ttf 와 `OFL.txt` 를 한 폴더에 `sourcesans3-SourceSans3[wght].ttf` · `sourcesans3-OFL.txt` · `notosanskr-NotoSansKR[wght].ttf` ·
  `notosanskr-OFL.txt` 로 받고 `python scripts/subset-timer-fonts.py <폴더>`(fontTools 4.63+ · brotli). 같은 입력이면 같은 파일이 나온다.
- **이름**: 두 원본 모두 OFL 1.1 의 예약 글꼴 이름(Reserved Font Name) **'Source'** 가 걸려 있다. 추린 글꼴은 수정본이라 그 이름을 쓸 수 없어(조건 3)
  글꼴 안의 이름표와 CSS 의 `font-family` 를 `Replix Timer Digits` · `Replix Timer KR` 로 바꿨다(기기에 깔린 같은 이름의 글꼴과도 섞이지 않는다).
- **숫자 폭**: Source Sans 3 은 기본 숫자가 고른 폭이다(굵기 600·700·800 에서 0~9 폭이 각각 513·528·534 단위로 같다 — 스크립트가 확인한다).
  원본에는 `tnum` 기능이 없고 `pnum`(비례 숫자)만 있다. 카드의 `font-variant-numeric: tabular-nums` 는 그대로 둔다.
- **그리는 방식**: `font-display: block` 에 더해 페이지가 두 글꼴을 받을 때까지(최대 3초) 카드를 그리지 않는다(`waitFonts`). 못 받으면(파일 없음·느린 망)
  기기 글꼴로 그리고, 한 줄이 넘치면 안전장치(`fitText`)가 그 줄의 글자만 줄여 카드 크기를 지킨다.
- **익스텐션**: 방 설정의 타이머 미리보기는 같은 `ReplixTimerDigits.woff2`(같은 원본·같은 옵션이라 바이트가 같다)만 싣고 한글은 패널 글꼴 Replix Sans 를
  쓴다(Replix-extension `scripts/subset-timer-font.py`).
