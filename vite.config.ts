import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base PHẢI khớp chính xác tên repo (kể cả hoa/thường) để GitHub Pages chạy đúng.
// Repo: hotrosinhvien2026/KHO_TRO_KTX2026
// URL:  https://hotrosinhvien2026.github.io/KHO_TRO_KTX2026/
// Có thể override bằng biến môi trường VITE_BASE khi build nếu cần.
const base = process.env.VITE_BASE ?? '/KHO_TRO_KTX2026/'

export default defineConfig({
  plugins: [react()],
  base,
})
