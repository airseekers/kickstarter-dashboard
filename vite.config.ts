import { copyFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const pagesBase = '/kickstarter-dashboard/'

export default defineConfig({
  base: pagesBase,
  plugins: [
    react(),
    {
      name: 'github-pages-fallback',
      apply: 'build',
      closeBundle() {
        const dist = path.resolve('dist')
        copyFileSync(path.join(dist, 'index.html'), path.join(dist, '404.html'))
        writeFileSync(path.join(dist, '.nojekyll'), '')
      },
    },
  ],
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
  },
})
