import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { paraglideVitePlugin } from '@inlang/paraglide-js'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [paraglideVitePlugin({ project: './project.inlang', outdir: './src/paraglide' }), tailwindcss(), react()],
  resolve: {
    dedupe: ['react', 'react-dom', '@pikku/react', 'lucide-react'],
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    outDir: 'injected',
    emptyOutDir: true,
    minify: true,
    cssCodeSplit: false,
    lib: { entry: 'src/injected/panel.tsx', name: 'PikkuStudioInjectedPanel', formats: ['iife'], fileName: () => 'panel.js' },
  },
})
