/* 시안 검토용 스크린샷. 개발 도구이며 산출물에 포함되지 않는다.
   사용: node shot.mjs <출력디렉터리> [너비] */
import puppeteer from 'puppeteer-core'
import { resolve } from 'node:path'

const OUT = process.argv[2] ?? '.'
const WIDTH = Number(process.argv[3] ?? 1440)
const FILE = `file://${resolve('../../docs/catalog/index.html')}`

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'shell',
  args: ['--allow-file-access-from-files', '--hide-scrollbars', '--force-color-profile=srgb'],
})

const routes = [
  ['home', ''],
  ['title', '#/title/35'],
]

for (const [name, hash] of routes) {
  const page = await browser.newPage()
  await page.setViewport({ width: WIDTH, height: 1000, deviceScaleFactor: 1 })
  await page.goto(FILE + hash, { waitUntil: 'networkidle0' })

  // 스크롤 진입 연출을 모두 발화시킨 뒤 찍는다.
  await page.evaluate(async () => {
    // smooth 스크롤이 켜져 있으면 맨 위로 돌아가는 도중에 찍혀 sticky 헤더가
    // 페이지 중간에 남는다. 캡처 동안은 즉시 이동으로 바꾼다.
    document.documentElement.style.scrollBehavior = 'auto'
    const step = window.innerHeight * 0.8
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 120))
    }
    window.scrollTo(0, 0)
    await new Promise((r) => setTimeout(r, 1800)) // 진입 연출 안전망(1.2초)보다 길게
  })

  /* overflow:clip 상태에서 scrollWidth 는 잘려 보이지 않는 부분까지 보고한다.
     fullPage 는 그 값을 따라가므로 뷰포트 폭으로 직접 잘라 찍는다. */
  /* captureBeyondViewport+clip 은 뷰포트를 순간 늘리면서 진입 연출을 되돌려 항목이 투명하게 찍혔다(2026-09-07).
     fullPage 로 찍고, 가로 넘침은 overflow:clip 이 막으므로 폭은 WIDTH 그대로다. */
  await page.screenshot({ path: `${OUT}/new-${name}-${WIDTH}.png`, fullPage: true })
  console.log(`${name} @${WIDTH}`)
  await page.close()
}

await browser.close()
