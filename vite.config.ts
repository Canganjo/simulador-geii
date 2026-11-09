import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Em GitHub Pages a app fica em https://<utilizador>.github.io/<repositorio>/,
  // por isso o workflow de deploy define BASE_PATH=/<repositorio>/.
  // Em desenvolvimento (pnpm dev) fica na raiz "/".
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss()],
})
