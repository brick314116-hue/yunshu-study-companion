import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  plugins: [vue(), tailwindcss()],
  build: {
    // cloudbase SDK（760kB，已独立分包、仅认证时按需加载）无法再拆，放开告警阈值。
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // 大依赖独立分包：业务代码改动不再让用户重新下载整个 700kB+ 的包。
        manualChunks: {
          vue: ['vue'],
          cloudbase: ['@cloudbase/js-sdk'],
          ogl: ['ogl'],
        },
      },
    },
  },
})
