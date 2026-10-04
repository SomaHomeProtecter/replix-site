// scripts/test-install-guide.mjs — 휴대폰 설치 안내(HP-477)의 순수 함수 + 소스 규칙 검사.
// 랜딩·초대 페이지는 빌드가 없어 이 검사가 회귀망이다. 실행: node scripts/test-install-guide.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');

// node 에는 window 가 없다 → 모듈이 부트(클릭 가로채기·시트)하지 않아야 import 자체가 성공한다.
const g = await import('../docs/js/install-guide.js');

// 익스텐션을 설치할 수 없는 기기 판정 — 실제 UA 문자열로 본다.
const UA = {
  androidPhone: 'Mozilla/5.0 (Linux; Android 14; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36',
  androidTablet: 'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1',
  ipadDesktopMode: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15',
  kakaotalk: 'Mozilla/5.0 (Linux; Android 14; SM-S918N Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.0.0 Mobile Safari/537.36;KAKAOTALK 2410870',
  macChrome: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  winChrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  chromeOS: 'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  // 큰 안드로이드 태블릿 크롬의 기본값 '데스크톱 사이트' — UA 에 Android 가 없다(리눅스 PC 와 같은 문자열).
  linuxDesktop: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
};
const CASES = [
  [{ ua: UA.androidPhone, platform: 'Linux armv81', maxTouchPoints: 5, uaMobile: true }, true, '안드로이드 휴대폰'],
  [{ ua: UA.androidTablet, platform: 'Linux armv81', maxTouchPoints: 10, uaMobile: false }, true,
    '안드로이드 태블릿 — UA-CH mobile 은 false 지만 익스텐션을 깔 수 없다'],
  [{ ua: UA.iphone, platform: 'iPhone', maxTouchPoints: 5 }, true, 'iPhone'],
  [{ ua: UA.ipadDesktopMode, platform: 'MacIntel', maxTouchPoints: 5 }, true, 'iPadOS 사파리(데스크톱 모드 UA = Mac 과 같음)'],
  [{ ua: UA.kakaotalk, platform: 'Linux armv81', maxTouchPoints: 5 }, true, '카카오톡 인앱 브라우저'],
  [{ ua: UA.macChrome, platform: 'MacIntel', maxTouchPoints: 0 }, false, 'Mac 크롬 — Mac 은 터치 지점이 없다'],
  [{ ua: UA.winChrome, platform: 'Win32', maxTouchPoints: 10, uaMobile: false }, false, '터치 화면 Windows 노트북 — 설치할 수 있다'],
  [{ ua: UA.chromeOS, platform: 'Linux x86_64', maxTouchPoints: 10, uaMobile: false }, false, '크롬북 — 설치할 수 있다'],
  [{ ua: UA.winChrome, platform: 'Win32', maxTouchPoints: 0, uaMobile: true }, true, 'UA-CH 가 mobile 이라고 하면 믿는다'],
  [{ ua: UA.linuxDesktop, platform: 'Linux x86_64', maxTouchPoints: 10, uaMobile: false, uaPlatform: 'Linux' }, true,
    '안드로이드 태블릿 데스크톱 모드 — UA·UA-CH 모두 리눅스 PC 처럼 보여도 터치 지점이 있다'],
  [{ ua: UA.linuxDesktop, platform: 'Linux x86_64', maxTouchPoints: 0, uaMobile: false, uaPlatform: 'Android' }, true,
    'UA-CH 플랫폼이 Android 면 안드로이드다'],
  [{ ua: UA.linuxDesktop, platform: 'Linux x86_64', maxTouchPoints: 0, uaMobile: false, uaPlatform: 'Linux' }, false,
    '터치 없는 리눅스 PC — 설치할 수 있다'],
  [{ ua: '', platform: '', maxTouchPoints: 0 }, false, '모르면 PC — 지금 동작(웹 스토어로) 그대로'],
  [undefined, false, '정보가 아예 없어도 PC'],
];
for (const [env, want, why] of CASES) assert.equal(g.isMobileDevice(env), want, why);

// 초대 페이지는 외부 리소스 0 원칙의 단일 파일이라 판정을 import 하지 못하고 사본을 둔다 — 같은 사례로 대조한다.
const invite = read('docs/invite/index.html');
const copy = /\/\* isMobileDevice:start \*\/([\s\S]*?)\/\* isMobileDevice:end \*\//.exec(invite);
assert.ok(copy, '초대 페이지에 휴대폰 판정 사본(isMobileDevice:start~end)이 있다');
const inviteIsMobile = new Function(`${copy[1]}; return isMobileDevice;`)();
for (const [env, want, why] of CASES) assert.equal(inviteIsMobile(env), want, `초대 페이지 사본: ${why}`);

// 초대 페이지 — 휴대폰은 자동 이동하지 않고 안내, PC 는 그대로 넷플릭스로. HP-186 계약(파라미터·fragment 토큰)과
// 외부 리소스 0·계측 없음(토큰이 실린 페이지)은 그대로다.
assert.match(invite, /id="mobile"/, '휴대폰 안내 화면이 있다');
assert.match(invite, /if \(isMobileDevice\(/, '휴대폰 판정으로 갈린다');
assert.match(invite, /location\.replace\(url\)/, 'PC 는 지금처럼 넷플릭스로 자동 이동한다');
assert.match(invite, /#replix-invite=/, '토큰은 fragment 로만 나른다(HP-186)');
assert.doesNotMatch(invite, /<script[^>]+src=|<link[^>]+href=/, '외부 리소스 0');
assert.doesNotMatch(invite, /analytics|amplitude|gtag/i, '/invite 는 계측하지 않는다(토큰)');

// 시트 안의 행동 계측 — 열거값은 트래킹 플랜과 같아야 한다. 웹 스토어 링크에 data-cta 를 달면 설치 의도를 두 번 센다.
const src = read('docs/js/install-guide.js');
const plan = read('docs/analytics/tracking-plan.md');
assert.deepEqual(g.GUIDE_ACTIONS, ['opened', 'copy_link', 'share', 'open_store']);
assert.match(plan, /`install_guide_action`/, '트래킹 플랜에 install_guide_action 이 있다');
for (const action of g.GUIDE_ACTIONS) assert.match(plan, new RegExp('`' + action + '`'), `트래킹 플랜에 action ${action}`);
assert.match(src, /track\('install_guide_action'/, '시트 행동은 install_guide_action 으로 센다');
for (const action of g.GUIDE_ACTIONS) assert.match(src, new RegExp(`track\\('${action}'\\)`), `시트가 ${action} 을 센다`);
assert.doesNotMatch(src, /data-cta="/, '시트의 웹 스토어 링크에 data-cta 를 달지 않는다');
// 뒤로 가기는 페이지를 떠나지 않고 시트만 닫는다(안드로이드는 뒤로 가기로 창을 닫는다) — 열 때 같은 주소로 히스토리 한 칸을
// 쌓고, 버튼·Esc·바깥으로 닫으면 그 칸을 되돌린다. 뒤로 가기·해시 이동으로 닫힐 때는 히스토리를 건드리지 않는다.
assert.match(src, /history\.pushState\(/, '열 때 히스토리 한 칸을 쌓는다');
assert.match(src, /history\.back\(\)/, '직접 닫으면 쌓은 칸을 되돌린다');
assert.match(src, /addEventListener\('popstate', onNavigate\)/, '뒤로 가기면 시트를 닫는다');
assert.match(src, /addEventListener\('hashchange', onNavigate\)/, '해시 이동이면 시트를 닫는다');

// 두 표면에 붙는다 — 랜딩은 main.js 가, 작품 탐색은 런타임 주입(analytics.js 와 같은 방식).
assert.match(read('docs/js/main.js'), /^import '\.\/install-guide\.js';$/m, '랜딩이 설치 안내를 불러온다');
assert.match(read('catalog/app/src/installGuide.ts'), /\/js\/install-guide\.js/, '작품 탐색이 /js/install-guide.js 를 붙인다');
assert.match(read('catalog/app/src/main.tsx'), /^loadInstallGuide\(\)/m, '작품 탐색 진입점에서 부른다(주석 아님)');

// 랜딩 헤더 — 760px 이하에선 설치 버튼 자리에 '작품 탐색'(휴대폰은 설치 불가), 로고는 줄이지 않는다.
const index = read('docs/index.html');
const tokens = read('docs/css/tokens.css');
assert.match(index, /class="[^"]*\bnav-install\b[^"]*"[^>]*data-cta="nav"/, '헤더 설치 버튼에 nav-install 표식');
const narrow = [...tokens.matchAll(/@media \(max-width: 760px\) \{([^}]*)\}/g)].map((m) => m[1]).join(' ');
assert.match(narrow, /\.nav \.nav-install/, '760px 이하에서 헤더 설치 버튼을 숨긴다');
assert.doesNotMatch(narrow, /nav-switch/, '760px 이하에서도 작품 탐색 버튼은 보인다');
assert.match(tokens, /\.nav \.wordmark \{[^}]*flex-shrink: 0/, '로고는 줄지 않는다(비율이 깨진다)');

// 히어로 — 휴대폰 기기엔 'PC 크롬에서 설치할 수 있어요', PC 엔 지금 문구.
assert.match(index, /class="rx-pc-only">Chrome 120 이상에서 사용 가능</, 'PC 문구');
assert.match(index, /class="rx-mobile-only">PC 크롬에서 설치할 수 있어요</, '휴대폰 문구');
assert.match(tokens, /\.rx-mobile-device \.rx-mobile-only/, '기기 표식이 붙으면 휴대폰 문구를 보인다');
assert.match(src, /classList\.add\('rx-mobile-device'\)/, '휴대폰 기기면 <html> 에 표식을 단다');

console.log('scripts/test-install-guide.mjs: 통과');
