#!/usr/bin/env python3
# 같이보기 타이머 글꼴 만들기(HP-869, 2026-11-12 조현빈 팀장 결정) — 숫자·영문은 Source Sans 3, 한글은 본고딕(Noto Sans KR).
#
# 왜 싣나: 타이머(docs/overlay)는 방송 PC 의 기기 글꼴로 그려져 PC 마다 글자 폭이 달랐다(같은 '1:01:07' 이 어떤 PC 에서는 들어가고 어떤 PC 에서는
# 줄여야 했다). 글꼴을 함께 실으면 어느 PC 에서나 같은 폭으로 그려진다. 구글 글꼴 서버에서 받지 않고 이 레포에 파일을 올린다 — 방송 PC 가 타이머를
# 띄울 때 외부 회사로 요청이 나가지 않게(같은 출처 replix.tv 의 파일만 받는다).
#
# 원본(공식 배포처 google/fonts, 커밋 c30b221beb0c1da59d563feb91ec8656a1fa972a — 2026-11-12 에 받은 main):
#   https://raw.githubusercontent.com/google/fonts/c30b221beb0c1da59d563feb91ec8656a1fa972a/ofl/sourcesans3/SourceSans3%5Bwght%5D.ttf
#     sha256 042fe2cc0b933e328410d7acbd0aa6a1873dca5aef81875f4bc214b08825c7b9 · 같은 폴더 OFL.txt
#   https://raw.githubusercontent.com/google/fonts/c30b221beb0c1da59d563feb91ec8656a1fa972a/ofl/notosanskr/NotoSansKR%5Bwght%5D.ttf
#     sha256 194018e6b2b293a7964f037b25c0249ce1418bc9ab3c971060a03aa57861e252 · 같은 폴더 OFL.txt
#   두 글꼴의 판(name ID 5)은 이 스크립트가 끝에 찍는다.
#
# 남기는 것:
#   Replix Timer Digits(← Source Sans 3) — ASCII(숫자·영문 대소문자·기호·공백)와 줄바꿈 없는 공백. 카드는 초가 바뀌어도 폭이 같게
#     font-variant-numeric: tabular-nums 를 쓰는데, Source Sans 3 은 기본 숫자가 이미 고른 폭이다(원본에 tnum 기능은 없고 pnum 만 있다 —
#     굵기 600·700·800 에서 0~9 폭이 같은지 tabular_check 가 본다). tnum 이 생기면 남게 기능 목록에 넣어 둔다.
#   Replix Timer KR(← Noto Sans KR) — 한글 완성형 2,350자(KS X 1001)와 한글 자모(ㄱ~ㅣ), 자주 쓰는 문장 부호(· ‘ ’ “ ” … 、 。 〈 〉 《 》 「 」 『 』).
#     그 밖의 글자(한자·일본어·드문 한글)는 글꼴 목록 뒤의 기기 글꼴이 그린다.
#   굵기는 카드가 쓰는 600~800(작품명 600 · 회차·길이·칩 700 · 시각·상태 표 800)만 남긴 가변 글꼴 하나씩.
# 이름: 두 원본 모두 OFL 1.1 의 예약 글꼴 이름(Reserved Font Name) 'Source' 가 걸려 있다 — 추린 글꼴은 '수정본'이라 그 이름을 쓸 수 없다(조건 3).
#   글꼴 안의 이름표를 Replix Timer Digits / Replix Timer KR 로 바꾼다(CSS 의 font-family 도 이 이름 — 기기에 깔린 같은 이름의 글꼴과 섞이지 않는다).
#   저작권 고지와 라이선스 원문은 docs/overlay/fonts/OFL-SourceSans3.txt · OFL-NotoSansKR.txt 로 함께 싣는다(조건 2).
#
# 실행(fontTools + brotli — woff2 를 쓰려면 brotli 가 있어야 한다):
#   python3 -m venv /tmp/rx-font && /tmp/rx-font/bin/pip install fonttools==4.63.0 brotli
#   (위 두 ttf 와 OFL.txt 를 한 폴더에 sourcesans3-*, notosanskr-* 이름으로 받는다 — notes/overlay-fonts.md)
#   /tmp/rx-font/bin/python scripts/subset-timer-fonts.py <받은 폴더>
# 결과: docs/overlay/fonts/ReplixTimerDigits.woff2 · ReplixTimerKR.woff2 · OFL-*.txt (빌드 단계가 없는 레포라 결과를 커밋한다).
import os
import shutil
import sys
import tempfile

from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'docs', 'overlay', 'fonts')
WGHT = (600, 800)
FEATURES = ['calt', 'ccmp', 'kern', 'liga', 'locl', 'mark', 'mkmk', 'tnum', 'pnum', 'lnum', 'case']


def ascii_chars():
    return {chr(i) for i in range(0x20, 0x7f)} | {' '}


def korean_chars():
    out = set()
    for hi in range(0xB0, 0xC9):  # KS X 1001 한글 완성형 2,350자 — EUC-KR 0xB0A1~0xC8FE
        for lo in range(0xA1, 0xFF):
            try:
                out.add(bytes([hi, lo]).decode('euc-kr'))
            except UnicodeDecodeError:
                pass
    out |= {chr(c) for c in range(0x3131, 0x3164)}  # 한글 자모 ㄱ~ㅣ
    out |= set('·‘’“”…、。〈〉《》「」『』')
    return out


def rename(font, old_family, old_ps, family, ps):
    # 0(저작권)·7(상표)·13·14(라이선스)는 원문 그대로 둔다 — 예약 이름을 걷는 것은 글꼴 이름표다
    name = font['name']
    for rec in list(name.names):
        if rec.nameID in (0, 7, 13, 14):
            continue
        s = rec.toUnicode()
        t = s.replace(old_family, family).replace(old_ps, ps)
        if t != s:
            name.setName(t, rec.nameID, rec.platformID, rec.platEncID, rec.langID)
    for rec in name.names:
        if rec.nameID in (1, 3, 4, 6, 16, 21, 25) and 'Source' in rec.toUnicode():
            sys.exit('예약 이름이 남았다: %d %s' % (rec.nameID, rec.toUnicode()))


def build(src, chars, features, old_family, old_ps, family, ps, out_name):
    tmp = tempfile.mkdtemp()
    try:
        # 굵기 축을 먼저 좁혀 파일로 한 번 쓰고 다시 읽는다(익스텐션 scripts/subset-font.py 와 같은 까닭 — 메모리의 결과를 바로 추리면 멈췄다)
        limited = os.path.join(tmp, 'limited.ttf')
        inst = instancer.instantiateVariableFont(TTFont(src), {'wght': WGHT})
        inst.flavor = None
        inst.recalcTimestamp = False
        inst.save(limited)
        font = TTFont(limited)
        opts = Options()
        opts.layout_features = features
        opts.flavor = 'woff2'
        opts.name_IDs = ['*']
        opts.name_languages = ['*']
        opts.hinting = False  # 크롬은 힌팅을 쓰지 않는다 — 파일만 커진다
        sub = Subsetter(opts)
        sub.populate(text=''.join(sorted(chars)))
        sub.subset(font)
        rename(font, old_family, old_ps, family, ps)
        font.flavor = 'woff2'
        font.recalcTimestamp = False  # 같은 입력이면 같은 파일
        path = os.path.join(tmp, 'out.woff2')
        font.save(path)
        shutil.copyfile(path, os.path.join(OUT, out_name))
        cmap = font.getBestCmap()
        kept = sum(1 for c in chars if ord(c) in cmap)
        version = font['name'].getDebugName(5)
        print('docs/overlay/fonts/%s %d bytes — %d 글자(요청 %d) wght %s · 원본 판 %s' % (out_name, os.path.getsize(os.path.join(OUT, out_name)), kept, len(chars), WGHT, version))
        return font
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def tabular_check(path):
    # 숫자 폭이 같은가 — 카드가 쓰는 굵기마다 0~9 의 폭을 본다(가변 글꼴은 굵기에 따라 폭이 바뀐다)
    for w in (600, 700, 800):
        inst = instancer.instantiateVariableFont(TTFont(path), {'wght': w})
        cmap = inst.getBestCmap()
        widths = sorted({inst['hmtx'][cmap[ord(c)]][0] for c in '0123456789'})
        print('  wght %d 숫자 폭 %s' % (w, widths))
        if len(widths) != 1:
            sys.exit('굵기 %d 에서 숫자 폭이 같지 않다' % w)


def main():
    if len(sys.argv) != 2:
        sys.exit('사용법: subset-timer-fonts.py <원본 폴더>')
    src = sys.argv[1]
    os.makedirs(OUT, exist_ok=True)
    build(os.path.join(src, 'sourcesans3-SourceSans3[wght].ttf'), ascii_chars(), FEATURES,
                   'Source Sans 3', 'SourceSans3', 'Replix Timer Digits', 'ReplixTimerDigits', 'ReplixTimerDigits.woff2')
    tabular_check(os.path.join(OUT, 'ReplixTimerDigits.woff2'))
    build(os.path.join(src, 'notosanskr-NotoSansKR[wght].ttf'), korean_chars(), ['ccmp', 'locl', 'kern', 'mark', 'mkmk'],
          'Noto Sans KR', 'NotoSansKR', 'Replix Timer KR', 'ReplixTimerKR', 'ReplixTimerKR.woff2')
    shutil.copyfile(os.path.join(src, 'sourcesans3-OFL.txt'), os.path.join(OUT, 'OFL-SourceSans3.txt'))
    shutil.copyfile(os.path.join(src, 'notosanskr-OFL.txt'), os.path.join(OUT, 'OFL-NotoSansKR.txt'))


if __name__ == '__main__':
    main()
