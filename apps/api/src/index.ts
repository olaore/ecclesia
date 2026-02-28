import { Hono } from 'hono'
import auth from './routes/auth'
import members from './routes/members'

type Bindings = {
  DB: D1Database
  JWT_SECRET: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.route('/api/v1/auth', auth)
app.route('/api/v1/members', members)

export default app
