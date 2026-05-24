import { createApp } from './app.js'
import { env } from './config/env.js'

const app = createApp()

app.listen(env.PORT, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(`✓ Server listening on http://0.0.0.0:${env.PORT}`)
  // eslint-disable-next-line no-console
  console.log(`  env=${env.NODE_ENV}`)
})
