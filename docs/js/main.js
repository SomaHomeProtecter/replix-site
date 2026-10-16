/* 진입점 — 구획 모듈을 불러오기만 한다. 각 모듈은 자기 구획의 DOM 을
   찾아 스스로 붙으므로 여기서 호출할 것이 없다. 예외는 page_viewed 하나 —
   페이지 단위 사건이라 어느 구획에도 속하지 않아 여기서 1회 부른다. */
import { page } from './analytics.js';
import './install-guide.js';
/* 첫 화면 연출(top.js)은 여기서 부르지 않는다(HP-666) — index.html 이 직접 부른다. 여기서 부르면 top.js 를 받지 못할 때
   (캐시가 섞임·차단·네트워크 오류) 이 모듈 묶음 전체가 실행되지 않아 섹션 등장·FAQ·계측·설치 안내 창까지 함께 멈춘다. */
import './hero.js';
import './scenes.js';
import './rooms.js';
import './faq.js';
import './float-cta.js';   /* 휴대폰 따라오는 설치 버튼(HP-664) */
import './stats.js';
import './reveal.js';

/* 인기 작품 섹션은 운영 결정으로 숨겨져 있다. 숨긴 상태에서도 chart.js를 정적 import하면
   API 응답을 받아 보이지 않는 카드 DOM을 만들므로, 섹션을 실제로 되살린 배포에서만 모듈을
   가져온다. 민감 데이터의 최종 차단은 서버 kill switch가 담당하고 이 게이트는 불필요한
   import·렌더를 없애는 2선 방어다(HP-358). */
var chartSection = document.getElementById('chart');
if (chartSection && !chartSection.hidden && window.getComputedStyle(chartSection).display !== 'none') {
  import('./chart.js');
}

/* 계측(analytics/tracking-plan.md) — 동의 전이면 analytics.js 가 기억해 두고 허용 직후 1회 보낸다. */
page();
