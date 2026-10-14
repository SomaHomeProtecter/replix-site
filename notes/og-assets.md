# 링크 미리보기·아이콘 이미지 (HP-478)

카카오톡·슬랙 등에 replix.tv 링크를 붙였을 때 뜨는 미리보기(`og:image`)와 브라우저·홈 화면 아이콘.
**전부 `docs/assets/logo/` 의 Replix 로고에서 만든다** — 작품 포스터·스틸은 쓰지 않는다(공개 웹에 작품 이미지를 올리지
않는다, `Replix-workspace/CLAUDE.md` §7 하드 게이트 ⑥).

| 파일 | 크기 | 원본 | 쓰는 곳 |
| --- | --- | --- | --- |
| `assets/og/replix-og.png` | 1200×630 | `replix-horizontal-light.png`(640px 폭) + 페이지 바탕색 `#faf9f9` + 히어로와 같은 옅은 붉은 후광 | 랜딩·작품 탐색 `og:image`(절대 주소) |
| `favicon.ico` | 16·32·48 | `replix-icon-square-light.png`(투명 바탕) | 모든 페이지(브라우저가 `/favicon.ico` 를 스스로 찾는다) |
| `apple-touch-icon.png` | 180×180 | `replix-profile-light.png`(불투명 — iOS 는 투명 영역을 검게 칠한다) | 아이폰 '홈 화면에 추가' |

로고가 바뀌면 같은 방식으로 다시 만든다(`docs/` 에서):

```python
from PIL import Image, ImageDraw, ImageFilter
W, H = 1200, 630
bg = Image.new('RGBA', (W, H), (250, 249, 249, 255))
glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
ImageDraw.Draw(glow).ellipse((W/2-420, H/2-300, W/2+420, H/2+300), fill=(229, 9, 20, 22))
bg.alpha_composite(glow.filter(ImageFilter.GaussianBlur(90)))
logo = Image.open('assets/logo/replix-horizontal-light.png').convert('RGBA')
logo = logo.resize((640, round(logo.height * 640 / logo.width)), Image.LANCZOS)
bg.alpha_composite(logo, ((W - 640) // 2, (H - logo.height) // 2))
bg.convert('RGB').save('assets/og/replix-og.png', optimize=True)
Image.open('assets/logo/replix-icon-square-light.png').convert('RGBA').save('favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])
Image.open('assets/logo/replix-profile-light.png').convert('RGB').resize((180, 180), Image.LANCZOS).save('apple-touch-icon.png', optimize=True)
```

미리보기는 카카오가 캐시한다 — 이미지를 바꾸면 [카카오 공유 디버거](https://developers.kakao.com/tool/debugger/sharing)에서
`https://replix.tv/` · `https://replix.tv/catalog/` 캐시를 지운다.
