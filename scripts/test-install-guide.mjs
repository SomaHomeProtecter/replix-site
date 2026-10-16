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
  ipadMobileMode: 'Mozilla/5.0 (iPad; CPU OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1',
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
  [{ ua: UA.ipadMobileMode, platform: 'iPad', maxTouchPoints: 5 }, true, 'iPad UA(데스크톱 모드를 끈 iPad) — UA 의 iPad 로만 잡힌다'],
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

// 초대·디스코드 연결 페이지는 외부 리소스 0 원칙의 단일 파일이라 판정을 import 하지 못하고 사본을 둔다 — 같은 사례로 대조한다.
// 랜딩도 첫 그림 전에 휴대폰 표식을 달려고 <head> 인라인 스크립트에 사본을 둔다(HP-662 — 모듈을 기다리면 PC 문구가 잠깐 보인다).
for (const [page, label] of [['docs/invite/index.html', '초대 페이지'], ['docs/together/index.html', '디스코드 연결 페이지(HP-497)'],
  ['docs/index.html', '랜딩 첫 그림 전 표식(HP-662)']]) {
  const copy = /\/\* isMobileDevice:start \*\/([\s\S]*?)\/\* isMobileDevice:end \*\//.exec(read(page));
  assert.ok(copy, `${label}에 휴대폰 판정 사본(isMobileDevice:start~end)이 있다`);
  const pageIsMobile = new Function(`${copy[1]}; return isMobileDevice;`)();
  for (const [env, want, why] of CASES) assert.equal(pageIsMobile(env), want, `${label} 사본: ${why}`);
}
const invite = read('docs/invite/index.html');

// 초대 페이지 — 휴대폰은 자동 이동하지 않고 안내. PC 도 곧바로 넘기지 않는다(HP-497 — 익스텐션 가로채기를 기다린 뒤
// 설치 안내, 상세 검사는 test-invite.mjs). HP-186 계약(파라미터·fragment 토큰)과 외부 리소스 0·계측 없음(토큰이 실린
// 페이지)은 그대로다.
assert.match(invite, /id="mobile"/, '휴대폰 안내 화면이 있다');
assert.match(invite, /if \(isMobileDevice\(/, '휴대폰 판정으로 갈린다');
assert.doesNotMatch(invite, /location\.replace\(/, 'PC 도 넷플릭스로 바로 넘기지 않는다 — 익스텐션 가로채기를 기다린다(HP-497)');
assert.match(invite, /#replix-invite=/, '토큰은 fragment 로만 나른다(HP-186)');
assert.doesNotMatch(invite, /<script[^>]+src=|<link[^>]+href=/, '외부 리소스 0');
assert.doesNotMatch(invite, /analytics|amplitude|gtag/i, '/invite 는 계측하지 않는다(토큰)');

// 시트 안의 행동 계측 — 열거값은 트래킹 플랜과 같아야 한다. 웹 스토어 링크에 data-cta 를 달면 설치 의도를 두 번 센다.
const src = read('docs/js/install-guide.js');
const plan = read('analytics/tracking-plan.md');
assert.deepEqual(g.GUIDE_ACTIONS, ['opened', 'copy_link', 'share', 'mail', 'open_store', 'open_catalog']);
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

// 앱 안 브라우저(HP-638) — 실제 UA 로 본다. 모르면 null(앱 밖으로 본다 — 지금 동작 그대로).
const IN_APP_UA = [
  ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0.17.89 (iPhone15,2; iOS 18_0; ko_KR; ko; scale=3.00; 1179x2556; 642358216)', 'instagram'],
  ['Mozilla/5.0 (Linux; Android 14; SM-S918N Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.0.0 Mobile Safari/537.36 Instagram 350.0.0.40.92 Android (34/14; 480dpi)', 'instagram'],
  ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/480.0.0.40.108;FBBV/650000000]', 'facebook'],
  [UA.kakaotalk, 'kakaotalk'],
  ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 NAVER(inapp; search; 2000; 12.6.6; 15PRO)', 'naver'],
  ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari Line/14.16.0', 'line'],
  ['Mozilla/5.0 (Linux; Android 14; SM-S918N Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.0.0 Mobile Safari/537.36', 'webview'],
  // 이름 모르는 iOS 앱 안 웹뷰(스레드 'Barcelona' 등) — 'Safari/' 가 없다
  ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Barcelona 289.0.0.77.109 (iPhone15,2; iOS 18_0; ko_KR; ko)', 'webview'],
  [UA.androidPhone, null],
  [UA.iphone, null],
  ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0.6668.69 Mobile/15E148 Safari/604.1', null],
  [UA.ipadDesktopMode, null],
  ['Mozilla/5.0 (Linux; Android 14; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36 Whale/3.28.266.14', null],
  ['', null],
  [undefined, null],
];
for (const [ua, want] of IN_APP_UA) assert.equal(g.inAppBrowser(ua), want, `앱 안 판정: ${String(ua).slice(-40)}`);
assert.ok(IN_APP_UA.every(([, want]) => want === null || g.IN_APP.includes(want)), 'IN_APP 열거값 안에서만');
// 시트에 무엇을 보일지 — sheetPlan 의 동작으로 본다(HP-638).
const planOf = (canShare, inApp, path) => g.sheetPlan({ canShare, inApp, path });
assert.deepEqual(planOf(true, null, '/'), { share: true, mail: false, store: true, catalog: true }, '앱 밖·공유 있음(아이폰 사파리 랜딩)');
assert.deepEqual(planOf(false, null, '/'), { share: false, mail: true, store: true, catalog: true }, '앱 밖·공유 없음 → 메일');
assert.deepEqual(planOf(false, 'instagram', '/'), { share: false, mail: false, store: false, catalog: true },
  '안드로이드 앱 안·공유 없음 → 링크 복사 하나(mailto 가 열리지 않을 수 있다), 웹 스토어 보내기 없음');
assert.deepEqual(planOf(true, 'instagram', '/catalog/'), { share: true, mail: false, store: false, catalog: false },
  'iOS 앱 안에서 연 작품 탐색 → 공유, 웹 스토어·작품 탐색 줄 없음');
assert.deepEqual(planOf(true, 'webview', '/catalog/'), planOf(true, 'kakaotalk', '/catalog/'), '앱 안이면 종류와 무관');
assert.deepEqual(g.sheetPlan(undefined), { share: false, mail: true, store: true, catalog: true }, '모르면 앱 밖·공유 없음으로');
// 화면에 붙이는 쪽 — 판정은 sheetPlan 한 곳에서, 행동마다 앱 안 종류(in_app)를 싣는다
assert.match(src, /var plan = sheetPlan\(\{ canShare: typeof navigator\.share === 'function', inApp: _inApp, path: location\.pathname \}\);/, '보이기 규칙은 sheetPlan 으로');
for (const k of ['share', 'mail', 'store', 'catalog']) assert.match(src, new RegExp(`if \\(!plan\\.${k}\\) \\$\\('\\.rxg-${k}'\\)\\.style\\.display = 'none';`), `plan.${k} 를 화면에 붙인다`);
assert.match(src, /track\('install_guide_action', \{ action: action, in_app: _inApp \|\| 'none' \}\)/, '시트 행동에 in_app');
assert.match(src, /<span class="rxg-omni-url" id="rxg-addr">replix\.tv<\/span>/, 'PC 주소창에 넣을 주소를 주소창 모양으로');
assert.match(src, /aria-describedby="rxg-desc rxg-addr"/, '화면낭독기 설명에 주소도 읽힌다');
assert.match(src, /'mailto:\?subject='/, '메일은 받는 사람 없이 mailto 로(우리 쪽 요청 없음)');
assert.match(src, /close\(true\);\s*if \(!pushed\) return;[\s\S]*?location\.replace\(ev\.currentTarget\.getAttribute\('href'\)\)/,
  '작품 탐색으로 가기 전에 시트를 닫고, 쌓은 히스토리 칸을 바꿔 들어간다');
assert.match(src, /addEventListener\('pageshow', function \(ev\) \{ if \(ev\.persisted\) onNavigate\(\); \}\)/, 'bfcache 로 되살아나면 시트를 닫는다');
assert.match(plan, /`in_app`/, '트래킹 플랜에 in_app');
for (const name of [...g.IN_APP, 'none']) assert.match(plan, new RegExp('`' + name + '`'), `트래킹 플랜에 in_app 값 ${name}`);

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

// 첫 화면·마지막 설치 버튼 — 휴대폰 기기엔 'PC로 설치 링크 보내기'(HP-662), PC 엔 웹 스토어로 가는 설치 문구.
// 문구 검사는 버튼 하나(<a>…</a>) 안에서만 맞춘다 — 넓게 찾으면 다른 버튼의 같은 문구에 맞아 바뀐 것을 놓친다.
assert.match(index, /data-cta="hero">\s*<span class="hv-lab rx-pc-only"><span class="chrome-ic"[^>]*><img[^>]*><\/span>크롬에 Replix 설치하기<\/span>\s*<span class="hv-lab rx-mobile-only"><svg(?:(?!<\/span>)[\s\S])*?<\/svg>PC로 설치 링크 보내기<\/span>\s*<\/a>/,
  '첫 화면 버튼 — PC·휴대폰 문구');
assert.match(index, /<span class="rx-mobile-only">PC 크롬 웹스토어에서 <b>'리플릭스'<\/b>를 검색해도 돼요<\/span>/, '첫 화면 휴대폰 안내 문구');
assert.match(index, /data-cta="close">\s*<span class="cta-lab rx-pc-only"><span class="chrome-ic"[^>]*><img[^>]*><\/span>크롬 익스텐션 설치하기<\/span>\s*<!--(?:(?!-->)[\s\S])*-->\s*<span class="cta-lab rx-mobile-only"><svg(?:(?!<\/span>)[\s\S])*?<\/svg>PC로 설치 링크 보내기<\/span>\s*<\/a>/,
  '마지막 버튼 — PC·휴대폰 문구');
assert.match(tokens, /\.rx-mobile-device \.rx-mobile-only/, '기기 표식이 붙으면 휴대폰 문구를 보인다');
assert.match(src, /classList\.add\('rx-mobile-device'\)/, '휴대폰 기기면 <html> 에 표식을 단다');

// 첫 그림 전 표식(HP-662) — 사본(위 대조)을 담은 인라인 스크립트가 <head> 안에서 표식을 단다.
const early = /<script>\s*\(function \(\) \{[\s\S]*?isMobileDevice:start[\s\S]*?classList\.add\('rx-mobile-device'\)[\s\S]*?<\/script>/.exec(index);
assert.ok(early && early.index < index.indexOf('</head>'), '랜딩 <head> 의 인라인 스크립트가 첫 그림 전에 휴대폰 표식을 단다');

console.log('scripts/test-install-guide.mjs: 통과');
