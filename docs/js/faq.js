/* 자주 묻는 질문 — 아코디언. */
import { track } from './analytics.js';
/* ═══ FAQ ═══════════════════════════════════════════════════ */
var QA = [
  /* HP-664(2026-10-17) — 방문자 99.8%가 휴대폰(2차 광고)이라 휴대폰 질문을 맨 위에(첫 질문은 열린 채로 뜬다), 그다음 그룹방 질문.
     공개 채팅 질문 넷 중 '아무도 없을 때'·'친구가 없어도'는 위 how 섹션이 답하므로 빼고, 흐르는 글자·영상 가림은 하나로 합쳤다. 다른 서비스 답은 디즈니+ 지원에 맞췄다. */
  ["휴대폰에서도 되나요?",
   "Replix 는 PC 크롬에 설치하는 익스텐션이라 휴대폰에서는 쓸 수 없습니다. 휴대폰으로 보고 계시면 PC 로 설치 링크를 " +
   "보내 두세요. PC 크롬 웹스토어에서 '리플릭스'를 검색해도 됩니다."],
  ["친구도 설치해야 하나요?",
   "네, 친구도 PC 크롬에 Replix 를 설치하고 각자 자기 계정으로 봅니다. 아직 설치하지 않은 친구가 초대 링크를 열면 " +
   "설치 안내가 나오고, 설치가 끝나면 그 방으로 바로 들어옵니다."],
  ["넷플릭스 말고 다른 곳도 되나요?",
   "넷플릭스와 디즈니+ 에서 쓸 수 있습니다. 다른 서비스는 순차적으로 넓혀 갈 계획입니다."],
  ["넷플릭스 계정이 따로 필요한가요?",
   "쓰던 계정 그대로 씁니다. Replix 는 넷플릭스 화면에 얹히는 익스텐션이라 재생은 평소와 똑같고, " +
   "채팅을 남길 때만 Google 계정으로 한 번 로그인합니다."],
  ["무료인가요?",
   "무료입니다. 설치와 사용에 비용이 들지 않습니다."],
  ["안 본 장면 얘기가 보이진 않나요?",
   "내가 아직 닿지 않은 지점의 채팅은 화면에 나타나지 않습니다. 그 지점을 지나면 그때 열립니다. " +
   "결말을 짐작하게 하는 말은 AI 가 한 번 더 걸러 주고, 어디까지 가릴지는 직접 정할 수 있습니다."],
  ["채팅이 영상을 가리지 않나요?",
   "채팅창은 영상 옆에 따로 열려서 화면을 가리지 않습니다. 영상 위로 채팅을 흘려 보는 탄막 모드도 있는데, " +
   "화면 위쪽 네 줄만 써서 자막과 인물은 가리지 않고 기본은 꺼져 있습니다."]
];
var faqEl = document.getElementById("faqList");
if (faqEl) {
  faqEl.innerHTML = QA.map(function (x, i) {
    return '<div class="qa"' + (i === 0 ? " open" : "") + '>' +
      '<button class="qa-q" type="button" aria-expanded="' + (i === 0) + '">' + x[0] +
        '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
        '<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
      '</button>' +
      '<div class="qa-a"><p>' + x[1] + '</p></div></div>';
  }).join("");
  faqEl.addEventListener("click", function (ev) {
    var q = ev.target.closest(".qa-q");
    if (!q) return;
    var box = q.parentElement, was = box.hasAttribute("open");
    faqEl.querySelectorAll(".qa").forEach(function (b) {
      b.removeAttribute("open");
      b.querySelector(".qa-q").setAttribute("aria-expanded", "false");
    });
    if (!was) {
      box.setAttribute("open", ""); q.setAttribute("aria-expanded", "true");
      /* 계측(W4) — 열 때만. 닫기까지 세면 한 번의 사용이 2건이 된다. 질문 본문 대신 순번을 싣는다. */
      track('faq_opened', { question_index: Array.prototype.indexOf.call(faqEl.children, box) });
    }
  });
}
