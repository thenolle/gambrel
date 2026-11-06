import { defineConfig } from '@gambrel/compiler'

export default defineConfig({
  routesDir: 'src/routes',
  serverEntry: 'src/server.ts',
  clientEntry: 'src/client.ts',
  outDir: 'dist'
})