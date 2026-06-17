import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { useAppStore } from '@/store/useAppStore'

const AppInitializer = () => {
  const initMockData = useAppStore((state) => state.initMockData)
  
  useEffect(() => {
    initMockData()
  }, [initMockData])
  
  return <App />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppInitializer />
  </StrictMode>,
)
