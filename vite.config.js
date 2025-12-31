import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  // 개발 서버 설정
  server: {
    port: 5173,
    open: true, // 브라우저 자동 열기
  },
  
  // 빌드 설정
  build: {
    outDir: 'dist',
    sourcemap: true, // 소스맵 생성
  },
  
  // 공개 디렉토리
  publicDir: 'public',
})

