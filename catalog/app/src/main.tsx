import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { loadAnalytics } from './analytics'

loadAnalytics() // 동의 배너·SDK 는 /js/analytics.js 가 맡는다(랜딩과 공유). http(s) 가 아니면 no-op.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
