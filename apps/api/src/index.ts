import { Hono } from 'hono'
import { cors } from 'hono/cors'
import auth from './routes/auth'
import members from './routes/members'
import guests from './routes/guests'
import attendance from './routes/attendance'
import events from './routes/events'
import notes from './routes/notes'
import celebrants from './routes/celebrants'
import analytics from './routes/analytics'

type Bindings = {
  DB: D1Database
  JWT_SECRET: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/api/*', cors())

app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.route('/api/v1/auth', auth)
app.route('/api/v1/members', members)
app.route('/api/v1/guests', guests)
app.route('/api/v1/attendance', attendance)
app.route('/api/v1/events', events)
app.route('/api/v1/notes', notes)
app.route('/api/v1/celebrants', celebrants)
app.route('/api/v1/analytics', analytics)

export default app
