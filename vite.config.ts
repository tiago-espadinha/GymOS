import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { serviceWorker } from './build/serviceWorker.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), serviceWorker()],
})
