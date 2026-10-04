/* 함께 보는 방식 — 섹션이 화면 밖이면 카드 애니메이션(탄막·이모지)을 멈춘다. */

/* ═══ 함께 보는 방식 (밝은 지면, HP-496) ═══════════════════════
   탄막·이모지는 CSS 애니메이션이다(css/rooms.css). 여기서는 섹션이 화면 밖일 때
   .rm-off 를 붙여 멈추기만 한다 — 보이지 않는 곳에서 계속 그리지 않게. 동작 줄이기
   설정은 CSS 가 애니메이션 자체를 끈다. 숫자는 시안처럼 고정이다. */
var roomsEl = document.getElementById("rooms");
if (roomsEl) {
  new IntersectionObserver(function (es) {
    es.forEach(function (e) { roomsEl.classList.toggle("rm-off", !e.isIntersecting); });
  }).observe(roomsEl);
}
