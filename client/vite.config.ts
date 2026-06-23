import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appPackage = JSON.parse(readFileSync(path.resolve(__dirname, '../package.json'), 'utf8')) as {
  version: string
}

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(appPackage.version),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/rss.xml': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/sitemap.xml': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/robots.txt': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})
