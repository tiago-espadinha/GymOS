import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/big-shoulders-display/latin-900'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-700.css'
import './styles/tokens.css'
import './styles/textLink.css'
import './index.css'
import App from './App.tsx'
import { applyAccent, loadAccent } from './utils/accentPrefs'

// Before the first paint, so a chosen accent never flashes lime.
applyAccent(loadAccent())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// sw.js only exists in production builds. If registration fails the app still works,
// it just needs the network to load.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/sw.js')
    .catch((error: unknown) => console.warn('Offline support unavailable:', error))
}
