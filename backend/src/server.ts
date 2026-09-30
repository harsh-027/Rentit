import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import authRoutes from './routes/auth.js'
import resourceRoutes from './routes/resources.js'
import { errors, notFound } from './middleware/errors.js'
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must be at least 32 characters')
const app = express(), port = Number(process.env.PORT || 4000), clientUrl = process.env.CLIENT_URL || 'http://localhost:5173'
app.set('trust proxy', 1); app.use(helmet()); app.use(cors({ origin: clientUrl, credentials: true })); app.use(express.json({ limit: '100kb' })); app.use(cookieParser()); app.get('/api/health', (_req, res) => res.json({ ok: true })); app.use('/api/auth', rateLimit({ windowMs: 900000, limit: 30, standardHeaders: true }), authRoutes); app.use('/api', rateLimit({ windowMs: 900000, limit: 300, standardHeaders: true }), resourceRoutes); app.use(notFound); app.use(errors)
app.listen(port, () => console.log(`[rentit] API listening on ${port}`))
export default app
