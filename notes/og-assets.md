# 링크 미리보기·아이콘·로고 이미지 (HP-478 · HP-868)

카카오톡·슬랙 등에 replix.tv 링크를 붙였을 때 뜨는 미리보기(`og:image`), 브라우저·홈 화면 아이콘, 페이지에 쓰는 로고.
**전부 Replix 로고(팝콘 마스코트 + 'Replix' 글자)로 만든다** — 작품 포스터·스틸은 쓰지 않는다(공개 웹에 작품 이미지를 올리지
않는다, `Replix-workspace/CLAUDE.md` §7 하드 게이트 ⑥).

2026-11-11(HP-868)부터 로고는 익스텐션과 같은 팝콘 마스코트다. 원본은 이 레포가 아니라 **Replix-extension `store-assets/brand/`**
(`replix-mascot-red.svg` 마스코트 격자, `replix-wordmark-light·dark.png` 글자)이고, 익스텐션 아이콘을 만드는
`Replix-extension/scripts/make-brand-assets.py` 의 격자 읽기·그라데이션 값을 그대로 가져다 쓴다(두 곳의 그림이 어긋나지 않게).

| 파일 | 크기 | 만든 방법 | 쓰는 곳 |
| --- | --- | --- | --- |
| `assets/logo/replix-horizontal-light.png` · `-dark.png` | 990×288 · 990×285(투명 바탕) | 익스텐션 가로 배치(빨간 둥근 칸 56 · 간격 14 · 글자 높이 44)의 5배. 캔버스 높이는 옛 파일과 같다 | 상단바·하단·화면 예시 속 패널(랜딩, 디스코드 안내, 삭제 설문, 작품 탐색) |
| `assets/logo/replix-profile-96.png` | 96×96(불투명) | 빨간 면을 끝까지 채운 정사각 + 마스코트(칸 4px). 원으로 잘려 쓰인다 | 화면 예시 속 디스코드 봇 얼굴 |
| `assets/og/replix-og.png` | 1200×630(불투명) | 페이지 바탕색 `#faf9f9` + 히어로와 같은 옅은 붉은 후광 + 가로형 로고(높이 168px) | 랜딩·작품 탐색 `og:image`(절대 주소) |
| `favicon.ico` | 16·32·48 | 익스텐션 `icons/icon-16·32·48.png` 을 그대로 담는다 | 모든 페이지(브라우저가 `/favicon.ico` 를 스스로 찾는다) |
| `apple-touch-icon.png` | 180×180(불투명 — iOS 는 투명 영역을 검게 칠한다) | 빨간 면을 끝까지 채운 정사각 + 마스코트(칸 8px). iOS 가 모서리를 둥글게 자른다 | 아이폰 '홈 화면에 추가' |

**가로형 로고를 넣는 높이.** 새 가로형은 빨간 칸이 그림 높이를 다 쓰고 글자(대문자 R)는 그 63%다(옛 밝은 판 78% · 어두운 판 67%).
같은 높이로 넣으면 글자가 작아져서, 상단바 높이와 옆 요소의 세로 가운데가 달라지지 않는 범위에서 높이를 키워 글자 크기를 옛 것에 맞췄다 —
랜딩·작품 탐색 상단 42px(옛 34px, 작품 탐색 360px 미만 35px), 디스코드 안내 상단 37px(옛 30px), 삭제 설문·작품 탐색 하단 35px(옛 28px),
화면 예시 속 패널 머리(`.xt-phead`) 19px(옛 15px). 랜딩 하단(28px)과 '혼자 보기' 예시 패널(20px)은 어두운 판이라 글자 비율 차이가 작고(5%),
키우면 그 줄 높이가 늘어서 그대로 뒀다. 작품 탐색은 로고를 번들에 싣기 때문에 로고 파일을 바꾸면 `catalog/app` 을 다시 빌드한다.

**바꾸지 않은 파일.** `assets/logo/` 의 `replix-icon-*` · `replix-vertical-*` · `replix-logo-lockups-*` · `replix-icon-square-light` ·
`replix-profile-light` · `replix-profile` · `replix-wordmark-*` 는 옛 그림(말풍선 로고) 그대로다 — 어느 페이지도 쓰지 않는다(2026-11-11 조현빈 결정).
디스코드 봇의 실제 아바타는 이 폴더의 파일이 아니라 아래 `filled()` 와 같은 그림을 1024px 로 만든 것이다(Replix-be `docs/discord-bot.md`).

로고가 바뀌면 같은 방식으로 다시 만든다. `docs/` 에서 아래를 파일로 저장해 `python3 <파일> <Replix-extension 경로>` 로 돌린다(Pillow 필요).
2026-11-11 에 이 코드로 만든 결과가 커밋된 여섯 파일과 바이트까지 같았다(Pillow 버전이 다르면 PNG 압축 결과는 달라질 수 있다).

```python
import sys, importlib.util
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
EXT = Path(sys.argv[1])            # Replix-extension 체크아웃
OUT = Path(sys.argv[2]) if len(sys.argv) > 2 else Path('.')   # 기본 = 지금 폴더(docs/)
spec = importlib.util.spec_from_file_location('mb', EXT / 'scripts/make-brand-assets.py')
mb = importlib.util.module_from_spec(spec); spec.loader.exec_module(mb)
BR = EXT / 'store-assets/brand'
G = mb.read_grid(BR / 'replix-mascot-red.svg')                 # 마스코트 칸(격자) — 늘 정수 배로 찍는다

def grad(size):                                                # 익스텐션 아이콘과 같은 대각선 빨간 그라데이션
    n = 256; im = Image.new('RGB', (n, n)); px = im.load()
    for y in range(n):
        for x in range(n):
            t = (x + y) / (2 * (n - 1))
            for (a, ca), (b, cb) in zip(mb.STOPS, mb.STOPS[1:]):
                if a <= t <= b:
                    u = (t - a) / (b - a); px[x, y] = tuple(round(ca[i] + (cb[i] - ca[i]) * u) for i in range(3)); break
    return im.resize((size, size), Image.BICUBIC).convert('RGBA')

def icon(size, cell, ss=4):                                    # 빨간 둥근 칸(반지름 = 칸의 13/56) + 마스코트
    t = grad(size); m = Image.new('L', (size * ss, size * ss), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size * ss - 1, size * ss - 1], round(size * 13 / 56) * ss, fill=255)
    t.putalpha(m.resize((size, size), Image.LANCZOS))
    f = mb.mascot(*G, cell); t.alpha_composite(f, ((size - f.width) // 2, (size - f.height) // 2 + (size - f.height) % 2)); return t

def horizontal(kind, k=5):                                     # 익스텐션 welcome/replix-wordmark.png(칸 56 · 간격 14 · 글자 44)의 k배
    tx = Image.open(BR / f'replix-wordmark-{kind}.png').convert('RGBA')
    tx = tx.resize((round(tx.width * 44 * k / tx.height), 44 * k), Image.LANCZOS)
    out = Image.new('RGBA', (70 * k + tx.width, 56 * k), (0, 0, 0, 0))
    out.alpha_composite(icon(56 * k, 3 * k), (0, 0)); out.alpha_composite(tx, (70 * k, 7 * k)); return out

def filled(size, cell, dy):                                    # 빨간 면을 끝까지 채운 정사각(원·둥근 모서리로 잘려 쓰이는 자리)
    t = grad(size); f = mb.mascot(*G, cell); t.alpha_composite(f, ((size - f.width) // 2, (size - f.height) // 2 + dy)); return t.convert('RGB')

for kind, h in (('light', 288), ('dark', 285)):                # 캔버스 높이는 옛 파일 그대로(288·285), 폭은 내용에 맞춤(990)
    lg = horizontal(kind); c = Image.new('RGBA', (lg.width, h), (0, 0, 0, 0)); c.alpha_composite(lg, (0, (h - lg.height) // 2))
    c.save(OUT / f'assets/logo/replix-horizontal-{kind}.png', optimize=True)
filled(96, 4, 2).save(OUT / 'assets/logo/replix-profile-96.png', optimize=True)
filled(180, 8, 4).save(OUT / 'apple-touch-icon.png', optimize=True)
ics = [Image.open(EXT / f'icons/icon-{n}.png').convert('RGBA') for n in (16, 32, 48)]   # 파비콘 = 익스텐션 아이콘 그대로
ics[2].save(OUT / 'favicon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48)], append_images=ics[:2])
W, H = 1200, 630                                               # 공유 이미지 — 바탕 #faf9f9 + 히어로와 같은 옅은 붉은 후광 + 가로형 로고(높이 168)
bg = Image.new('RGBA', (W, H), (250, 249, 249, 255)); glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
ImageDraw.Draw(glow).ellipse((W / 2 - 420, H / 2 - 300, W / 2 + 420, H / 2 + 300), fill=(229, 9, 20, 22))
bg.alpha_composite(glow.filter(ImageFilter.GaussianBlur(90)))
lg = horizontal('light', 6); lg = lg.resize((round(lg.width * 168 / lg.height), 168), Image.LANCZOS)
bg.alpha_composite(lg, ((W - lg.width) // 2, (H - lg.height) // 2))
bg.convert('RGB').save(OUT / 'assets/og/replix-og.png', optimize=True)
```

디스코드 봇 아바타(1024px)는 같은 함수로 만든 `filled(1254, 52, 26)` 을 1024px 로 줄인 것이다 — 프로필 원 안에 마스코트가 들어오는 크기(폭의 2/3).

미리보기는 카카오가 캐시한다 — 이미지를 바꾸면 [카카오 공유 디버거](https://developers.kakao.com/tool/debugger/sharing)에서
`https://replix.tv/` · `https://replix.tv/catalog/` 캐시를 지운다.
