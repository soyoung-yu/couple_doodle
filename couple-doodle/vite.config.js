// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/couple-doodle/', // ⚠️ 저장소명이 다르면 여기 변경
})
