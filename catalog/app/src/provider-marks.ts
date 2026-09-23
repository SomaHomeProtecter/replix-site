/* 소셜 로그인 버튼 심벌(HP-447) — 확장의 PROVIDER_ICONS(Replix-extension features/auth-ui.js, HP-71 D절)를 그대로 옮겼다.
   세 개 모두 각 사 공식 애셋에서 추출한 값이다: 구글 = 공식 signin-assets.zip 의 G(96×96 PNG, assets/google-g.png),
   카카오 = kakao_login_original.psd 의 벡터 마스크, 네이버 = NAVER_login_KR.ai 의 N 경로.
   ⚠️ 손으로 다시 그리거나 "간단한 SVG 로 정리"하지 말 것 — 세 사 가이드 모두 심벌의 형태·비율·색 변경을 금지하고,
   구글은 가이드 준수가 OAuth 앱 검수의 요건이다. 크기도 각 사 값(구글 G 만 20px — 가이드가 40px 버튼에 20px 로고를 요구). */
export { default as GOOGLE_G } from './assets/google-g.png'

export type Mark = { width: number; height: number; viewBox: string; fill: string; d: string }

export const KAKAO_MARK: Mark = { width: 16, height: 15, viewBox: '0 0 18 17', fill: '#000000',
  d: 'M9 0C4.03 0 0 3.13 0 6.99C0 9.39 1.56 11.5 3.93 12.76C3.93 12.76 2.93 16.42 2.93 16.42C2.84 16.75 3.21 17.01 3.5 16.82C3.5 16.82 7.87 13.92 7.87 13.92C8.24 13.95 8.62 13.97 9 13.97C13.97 13.97 18 10.84 18 6.99C18 3.13 13.97 0 9 0Z' }

export const NAVER_MARK: Mark = { width: 16, height: 16, viewBox: '0 0 16 16', fill: '#fff',
  d: 'M10.85 8.56L4.92 0L0 0L0 16L5.15 16L5.15 7.44L11.08 16L16 16L16 0L10.85 0Z' }
