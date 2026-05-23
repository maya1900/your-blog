import { createApp } from './app.js'
import { env } from './config/env.js'

const app = createApp()

app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`✓ Server listening on http://localhost:${env.PORT}`)
  // eslint-disable-next-line no-console
  console.log(`  env=${env.NODE_ENV}`)
})
