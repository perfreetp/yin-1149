import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { useAppStore } from '@/store/useAppStore'

const AppInitializer = () => {
  const initMockData = useAppStore((state) => state.initMockData)
  const patients = useAppStore((state) => state.patients)
  
  useEffect(() => {
    const initialized = localStorage.getItem('sleep-clinic-initialized')
    if (!initialized && patients.length === 0) {
      initMockData()
      localStorage.setItem('sleep-clinic-initialized', 'true')
    }
  }, [initMockData, patients.length])
  
  return <App />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppInitializer />
  </StrictMode>,
)
