#!/usr/bin/env python3
# 랜딩의 익스텐션 화면(docs/ext)에 쓰는 글꼴 만들기(HP-677) — scripts/ext-panel/bake.mjs 가 부른다.
#
# 원본은 익스텐션에 실린 Replix Sans(Replix-extension fonts/ReplixSans-Variable.woff2, 0.4MB — Pretendard 를 추려 이름을 바꾼 가변 글꼴, OFL 1.1)다.
# 랜딩의 패널은 지어낸 예시 장면 몇 개만 보이므로, 그 장면에 나오는 글자(표준 입력으로 받는다)만 남긴다. 굵기 축(400~900)은 그대로 둔다 —
# 익스텐션 화면이 쓰는 굵기를 다 그려야 폭이 익스텐션과 같다. 장면에 없는 글자는 글꼴 목록 뒤의 기기 글꼴이 그린다.
# 이름은 원본 그대로 'Replix Sans' 다(OFL 의 예약 글꼴 이름 Pretendard 는 원본에서 이미 뺐다). 라이선스 원문(OFL.txt)을 함께 싣는다(조건 2).
#
# 실행:  echo '글자들' | python scripts/ext-panel/subset-font.py <익스텐션 fonts 폴더> <docs/ext/fonts>     (fonttools + brotli 필요)
import os
import shutil
import sys

from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont

src_dir, out_dir = sys.argv[1], sys.argv[2]
text = sys.stdin.read()
os.makedirs(out_dir, exist_ok=True)

font = TTFont(os.path.join(src_dir, 'ReplixSans-Variable.woff2'))
opts = Options()
opts.flavor = 'woff2'
opts.layout_features = ['*']      # 원본이 가진 기능(tnum 등)을 그대로
opts.name_IDs = ['*']
opts.notdef_outline = True
sub = Subsetter(opts)
sub.populate(text=text)
sub.subset(font)
font.flavor = 'woff2'
dst = os.path.join(out_dir, 'ReplixSans-subset.woff2')
font.save(dst)
shutil.copyfile(os.path.join(src_dir, 'OFL.txt'), os.path.join(out_dir, 'OFL.txt'))
print('fonts/ReplixSans-subset.woff2: 글자 %d개, %.1fKB' % (len(set(text)), os.path.getsize(dst) / 1024))
