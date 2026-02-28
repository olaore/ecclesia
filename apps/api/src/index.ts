import { Hono } from 'hono'
import auth from './routes/auth'
import members from './routes/members'
import guests from './routes/guests'
import attendance from './routes/attendance'

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
app.route('/api/v1/guests', guests)
app.route('/api/v1/attendance', attendance)

export default app
