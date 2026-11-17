import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const pagesBase = '/kickstarter-dashboard/'

export default defineConfig({
  base: pagesBase,
  build: {
    rollupOptions: {
      input: {
        main: path.resolve('index.html'),
        tron: path.resolve('TRON/index.html'),
        aranix: path.resolve('ARANIX/index.html'),
      },
    },
  },
  plugins: [
    react(),
    {
      name: 'github-pages-routes',
      apply: 'build',
      closeBundle() {
        const dist = path.resolve('dist')
        copyFileSync(path.join(dist, 'index.html'), path.join(dist, '404.html'))
        mkdirSync(dist, { recursive: true })
        copyFileSync(path.join(dist, 'TRON/index.html'), path.join(dist, 'TRON.html'))
        copyFileSync(path.join(dist, 'ARANIX/index.html'), path.join(dist, 'ARANIX.html'))
        writeFileSync(path.join(dist, '.nojekyll'), '')
      },
    },
  ],
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
  },
})
