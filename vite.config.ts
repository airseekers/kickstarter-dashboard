import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolveViteBase } from './shared/base.ts'

const pagesBase = resolveViteBase(process.env.VITE_BASE)

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
      name: 'canonical-base',
      transformIndexHtml: {
        order: 'post',
        handler(html) {
          return html.replaceAll('%CANONICAL%', `${pagesBase}ARANIX/`)
        },
      },
    },
    {
      name: 'github-pages-routes',
      apply: 'build',
      writeBundle(options) {
        const dist = options.dir ?? path.resolve('dist')
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
