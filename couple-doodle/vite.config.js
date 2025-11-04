import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/couple_doodle/',   // 저장소명과 동일(언더바)
})
