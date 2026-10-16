# 첫 화면 영상 — 가상의 작품 '밤의 정원' (HP-662)

첫 화면(#top) 재생 화면에 나오는 영상·사진이다. **넷플릭스·실제 작품의 장면이 아니다** — 공개 웹에 넷플릭스에서 꺼낸 저작물을
올리지 않는다(`Replix-workspace/CLAUDE.md` §7). 가상의 작품 '밤의 정원'의 장면을 Pexels 무료 영상 세 개로 만들었다.

| 파일 | 크기 | 쓰는 곳 |
| --- | --- | --- |
| `assets/scene/garden.mp4` | 960×540 · 24fps · 14.6초 · 0.6MB | 영상 칸(`js/top.js` 가 재생·멈춤·이동을 건다) |
| `assets/scene/garden-poster.jpg` | 960×540 | 영상을 받기 전 첫 그림(시작 장면, 영상 5.2초) |
| `assets/scene/firefly-thumb.jpg` | 256×144 | 진행 막대 위 미리보기(32:30 반딧불 장면) |

## 출처 — Pexels 라이선스

| 장면 | 영상(Pexels) | 촬영 | 쓴 구간 |
| --- | --- | --- | --- |
| 반딧불(32:30, 되돌리면 나오는 장면) | [Captivating Firefly Glows in Human Hands](https://www.pexels.com/video/captivating-firefly-glows-in-human-hands-35461543/) | Amel Uzunovic | 5.0~9.6초 |
| 등불 정원(시작 32:52) | [Enchanted Evening Lights Under Trees](https://www.pexels.com/video/enchanted-evening-lights-under-trees-32054992/) | Alberto Escalona | 1.0~6.0초 |
| 터널을 걷는 두 사람(뒷모습) | [A Couple Holding Hands In Walking The Underpass Hallway](https://www.pexels.com/video/a-couple-holding-hands-in-walking-the-underpass-hallway-4761878/) | cottonbro studio | 0.5~5.5초 |

[Pexels 라이선스](https://www.pexels.com/license/)(2026-10-16 원문 확인): 무료이고 출처 표시가 필요 없으며, 편집해도 되고 웹사이트·제품 홍보에
써도 된다. 금지는 알아볼 수 있는 사람을 나쁘게 그리기, 원본 그대로 팔기, 영상 속 사람·브랜드가 제품을 보증하는 것처럼 쓰기, 다른
스톡 사이트에 다시 올리기, 상표로 쓰기다. 세 장면 모두 얼굴이 나오지 않는다 — 터널 영상은 옆얼굴이 나오는 10초 뒤를 쓰지 않았다.

## 다시 만들 때

영상 안 순서는 32:30 장면(0~4.6초) → 시작 장면(4.6초 = 32:52) → 멈추는 장면이다. `js/top.js` 의 `V_START`(4.6)·`V_SEEK`(0)·`SUBS`
(장면별 대사 자막)가 이 시각에 맞춰져 있으니, 장면을 바꾸면 함께 고친다. 원본 세 개(Pexels 의 1280 폭 이상 파일)를 받아 이 순서로
잇고 장면별로 색을 맞췄다(값은 장면을 보며 정했다):

```bash
ffmpeg -ss 5.0 -t 4.6 -i firefly.mp4 -ss 1.0 -t 5.0 -i garden.mp4 -ss 0.5 -t 5.0 -i tunnel.mp4 -filter_complex "\
[0:v]fps=24,scale=960:540:flags=lanczos,setsar=1,eq=brightness=-0.02:saturation=0.86:contrast=1.06,colorbalance=rs=0.04:bs=-0.04,vignette=PI/4.5[d];\
[1:v]fps=24,scale=960:540:flags=lanczos,setsar=1,eq=brightness=-0.01:saturation=0.95:contrast=1.06,colorbalance=rs=0.03:bs=-0.02,vignette=PI/5[b];\
[2:v]fps=24,scale=960:540:flags=lanczos,setsar=1,eq=brightness=-0.06:saturation=0.8:contrast=1.08,vignette=PI/4.5[c];\
[d][b][c]concat=n=3:v=1:a=0,format=yuv420p[v]" -map "[v]" -c:v libx264 -preset slow -crf 25 -movflags +faststart -an assets/scene/garden.mp4
ffmpeg -ss 5.2 -i assets/scene/garden.mp4 -frames:v 1 -q:v 4 assets/scene/garden-poster.jpg
ffmpeg -ss 1.6 -i assets/scene/garden.mp4 -frames:v 1 -vf scale=256:144 -q:v 4 assets/scene/firefly-thumb.jpg
```

밝고 세밀한 장면(잎·꽃잎·비눗방울)은 같은 길이에서 영상이 2~3배 무겁다(2026-10-16 한낮 장면 안 1.6MB — 잡음 제거로도 거의 줄지 않음).
로컬에서 볼 때 `python3 -m http.server` 는 HTTP Range 를 지원하지 않아 영상이 받지 않은 구간으로 이동하지 못한다(0초부터 튼다).
운영(GitHub Pages)은 Range 를 지원한다.
