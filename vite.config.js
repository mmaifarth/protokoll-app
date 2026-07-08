import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/protokoll-app/', // Erzwingt relative Pfade für GitHub Unterordner
})
})
