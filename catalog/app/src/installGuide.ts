/* 휴대폰 설치 안내(HP-477) — 실제 구현은 랜딩과 공유하는 /js/install-guide.js(시트·휴대폰 판정·시트 안 계측).
   이 앱은 그 파일을 런타임에 붙이기만 한다(계측 /js/analytics.js 와 같은 방식). 휴대폰에서 설치 버튼([data-cta])을 누르면
   웹 스토어 대신 'PC 크롬에서 써요' 안내가 뜨고, PC 는 아무 일도 없다.
   Vite dev·file:// 시안 검토에서는 그 파일이 없어 no-op 이다 — 설치 버튼은 지금처럼 웹 스토어로 간다(fail-open). */
let injected = false

export function loadInstallGuide() {
  if (injected || typeof document === 'undefined') return
  injected = true
  if (!/^https?:$/.test(location.protocol)) return
  const s = document.createElement('script')
  s.type = 'module'
  s.src = '/js/install-guide.js'
  document.head.appendChild(s)
}
