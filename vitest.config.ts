import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  resolve: {
    alias: [
      { find: '@edition', replacement: fileURLToPath(new URL('./src/editions/bible', import.meta.url)) },
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
    ],
  },
  test: { include: ['src/**/*.test.ts', 'scripts/**/*.test.ts', 'server/**/*.test.ts'] },
})
