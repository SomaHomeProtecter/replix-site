/* 자주 묻는 질문 — 아코디언. */
/* ═══ FAQ ═══════════════════════════════════════════════════ */
var QA = [
  ["넷플릭스 계정이 따로 필요한가요?",
   "쓰던 계정 그대로 씁니다. Replix 는 넷플릭스 화면에 얹히는 확장이라 재생은 평소와 똑같고, " +
   "채팅을 남길 때만 Google 계정으로 한 번 로그인합니다."],
  ["영상 위로 흐르는 글자는 뭔가요?",
   "탄막 모드입니다. 채팅을 옆 패널이 아니라 영상 위로 흘려 보여 줍니다. 화면 위쪽 네 줄만 " +
   "쓰기 때문에 자막과 인물은 가리지 않습니다. 그래도 화면 점유가 부담스러울 수 있어 " +
   "기본은 꺼져 있고, 설정에서 켜면 됩니다."],
  ["지금 아무도 안 보고 있으면 조용하겠네요?",
   "같은 시간에 접속한 사람만 보이는 것이 아닙니다. 며칠 전에 그 장면을 본 사람이 남긴 말도 " +
   "내가 그 지점에 닿을 때 함께 도착하기 때문에, 혼자 보고 있어도 채팅창이 비어 있지 않습니다. " +
   "반대로 내가 남긴 말은 앞으로 이 회차를 볼 사람에게 갑니다."],
  ["아직 안 본 부분 얘기가 보이면 어쩌죠?",
   "내가 아직 닿지 않은 지점의 채팅은 화면에 나타나지 않습니다. 그 지점을 지나면 그때 열립니다. " +
   "결말을 짐작하게 하는 말은 AI 가 한 번 더 걸러 주고, 어디까지 가릴지는 직접 정할 수 있습니다."],
  ["채팅이 영상을 가리지 않나요?",
   "패널은 화면 옆에 붙고 영상 위에 겹치지 않습니다. 접어 두면 재생바 위 반응 그래프만 남고, " +
   "필요할 때 다시 펼치면 됩니다."],
  ["친구가 없어도 쓸 수 있나요?",
   "회차마다 방이 이미 열려 있어서 재생만 하면 그 회차를 본 사람들의 말이 흐릅니다. " +
   "친구와만 볼 때는 링크로 따로 방을 엽니다."],
  ["넷플릭스 말고 다른 곳도 되나요?",
   "지금은 넷플릭스만 지원합니다. 다른 서비스는 순차적으로 넓혀 갈 계획입니다."],
  ["무료인가요?",
   "무료입니다. 설치와 사용에 비용이 들지 않습니다."]
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
    if (!was) { box.setAttribute("open", ""); q.setAttribute("aria-expanded", "true"); }
  });
}
