import { defineConfig } from 'vite'
import viteReact from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    viteReact(),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://172.24.1.230:8370', // 替换为实际后端地址
        changeOrigin: true,
      },
    },
    allowedHosts: [
      'dh.local.innovors.info',
      'dh.innovors.info',
      'dh.innovors.com'
    ]
  },
})