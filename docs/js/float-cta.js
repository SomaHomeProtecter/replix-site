/* 휴대폰 따라오는 설치 버튼(HP-664) — 화면에 설치 버튼이 하나도 없는 구간에만 화면 아래 가운데에 뜬다.
   · 구간은 섹션이 아니라 버튼 위치로 정한다: '친구랑 같이 보기'의 설치 버튼이 화면 위(메뉴 막대 밑)로 다 지나간 뒤부터, 마지막
     섹션(#install)의 버튼이 화면 아래에서 들어오기 전까지. 섹션 경계로 정하면 한 화면에 설치 버튼이 둘 보이거나, 2번 섹션 안에서
     깜빡인다.
   · 교차 관찰(IntersectionObserver)로 하지 않는다 — 메뉴 링크·빠른 튕김처럼 버튼이 화면을 거치지 않고 아래에서 위로 건너뛰면
     교차 상태가 바뀌지 않아 알림이 오지 않는다(2026-10-17 HP-664 시안에서 확인). 스크롤 때마다 두 버튼의 위치를 읽고, 상태가 바뀔 때만
     쓴다(js/hero.js scrub 과 같은 방식 — 스크롤 이벤트는 브라우저가 이미 프레임당 한 번으로 묶어 보낸다).
   · 동의 배너가 떠 있으면 배너 윗변 위로 8px 띄워 올린다 — 배너가 생기거나 닫히거나 [자세히]로 높이가 바뀌면 다시 잰다.
   · 휴대폰 기기(rx-mobile-device)에서만 — PC 는 위에 붙은 메뉴 막대에 설치 버튼이 늘 있다. 누르면 js/install-guide.js 가
     다른 설치 버튼과 똑같이 'PC 크롬에서 써요' 안내 창을 띄운다(data-cta). */
var fc = document.getElementById('floatCta');
var after = document.querySelector('#friends .gt-cta');
var until = document.querySelector('#install .btn');
var nav = document.getElementById('nav');

if (fc && after && until && document.documentElement.classList.contains('rx-mobile-device')) {
  var on = null;
  var update = function () {
    var top = nav ? nav.offsetHeight : 0;   /* 메뉴 막대 밑에 깔린 버튼은 보이지 않는다 */
    var next = after.getBoundingClientRect().bottom <= top && until.getBoundingClientRect().top >= innerHeight;
    if (next === on) return;
    on = next;
    fc.classList.toggle('is-on', on);
    /* 숨은 동안은 읽기 프로그램·Tab 이동에서도 빠진다(visibility:hidden 이 함께 처리하지만 속성도 맞춘다) */
    fc.setAttribute('aria-hidden', on ? 'false' : 'true');
    fc.tabIndex = on ? 0 : -1;
  };
  addEventListener('scroll', update, { passive: true });
  addEventListener('resize', update);
  update();

  var place = function () {
    var b = document.getElementById('rx-consent');
    var r = b && b.style.display !== 'none' ? b.getBoundingClientRect() : null;
    if (r && r.height > 0) fc.style.setProperty('--fc-bottom', Math.round(innerHeight - r.top + 8) + 'px');
    else fc.style.removeProperty('--fc-bottom');   /* 배너가 없으면 css 의 기본값(아래 끝 + 홈 표시줄 여백) */
  };
  var watch = function (b) { if (window.ResizeObserver) new ResizeObserver(place).observe(b); place(); };
  var banner = document.getElementById('rx-consent');
  if (banner) watch(banner);
  else new MutationObserver(function (_, mo) {
    var b = document.getElementById('rx-consent');
    if (b) { mo.disconnect(); watch(b); }
  }).observe(document.body, { childList: true });
  addEventListener('resize', place);
  place();
}
