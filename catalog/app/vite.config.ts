import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

/* 빌드 결과를 자기완결 HTML 한 장으로 낸다.
   ① 레포 규칙이 "외부 리소스 0" 이다.
   ② 시안은 서버 없이 file:// 로 열어 검토한다. 분리된 JS 모듈은
      file:// 에서 CORS 로 막히므로 인라인이어야 한다. */
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), viteSingleFile()],
  build: {
    // 산출물 = docs/catalog/index.html 한 장. docs/ 는 번들러 없이 그대로 서빙되는 GitHub Pages
    // 소스라(레포 README '배포 구조'), 파일 하나면 커밋·배포가 단순하다.
    outDir: '../../docs/catalog',
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
  },
})
