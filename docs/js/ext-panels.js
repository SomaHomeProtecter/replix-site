/* 익스텐션 실제 화면(ext/panel.html) 자리 맞추기 — HP-677. 스타일 = css/ext-panel.css.
   ① 크기: 패널은 구운 폭(data-w, 기본 360px)으로 그리고 자리(.rxfit)의 폭에 맞춰 통째로 줄인다. 첫 화면(data-fit="hero")은 PC 에서 화면 높이에
      맞춘다 — 패널 높이 560px 이 재생 화면 높이와 같아지는 비율 k 를 구해 패널 칸 폭(--pw)을 360 × k 로 둔다. 태블릿은 칸 폭 300px 에 맞춘다.
   ② 불러오기: iframe 주소는 data-src 에 두고, 자리가 화면에 그려질 때만 src 로 옮긴다 — 휴대폰에서는 숨는 자리(첫 화면 패널)의
      파일을 받지 않는다. 화면 아래의 패널은 loading="lazy" 가 가까이 왔을 때 받는다.
   index.html 이 js/top.js 보다 먼저 부른다(모듈이 아니다 — 첫 그림 전에 --pw 를 잡는다). */
(function () {
  function fitOne(box) {
    var fr = box.querySelector('.rxp'); if (!fr) return;
    if (!fr.offsetParent) return;                       // 숨은 자리 — 받지도 재지도 않는다
    if (!fr.getAttribute('src') && fr.dataset.src) fr.setAttribute('src', fr.dataset.src);
    var w0 = Number(box.dataset.w) || 360, k, h;
    if (box.dataset.fit === 'hero') {
      var screen = box.closest('.hx-screen'); if (!screen) return;
      var H = screen.clientHeight; if (!H) return;
      if (matchMedia('(min-width: 1041px)').matches) { k = H / 560; screen.style.setProperty('--pw', Math.round(w0 * k) + 'px'); h = 560; }
      else { screen.style.removeProperty('--pw'); k = 300 / w0; h = H / k; }
    } else {
      var w = box.clientWidth; if (!w) return;
      k = w / w0; h = box.clientHeight / k;
    }
    fr.style.width = w0 + 'px';
    fr.style.height = Math.round(h) + 'px';
    fr.style.setProperty('--k', k.toFixed(4));
    fr.dataset.k = k.toFixed(4);                        // js/top.js 가 패널 안 단추의 자리를 바깥 좌표로 옮길 때 쓴다
  }
  function fitAll() { Array.prototype.forEach.call(document.querySelectorAll('.rxfit'), fitOne); }
  function start() {
    fitAll();
    if (window.ResizeObserver) { var ro = new ResizeObserver(fitAll); Array.prototype.forEach.call(document.querySelectorAll('.rxfit, .hx-screen'), function (b) { ro.observe(b); }); }
    window.addEventListener('resize', fitAll);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
