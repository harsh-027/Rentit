import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import cookieParser from 'cookie-parser'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const app = express()
const port = Number(process.env.PORT || 4000)
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173'
const configuredJwtSecret = process.env.JWT_SECRET
if (!configuredJwtSecret || configuredJwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be set to a random value of at least 32 characters')
}
const jwtSecret: string = configuredJwtSecret

app.use(helmet())
app.use(cors({ origin: clientUrl, credentials: true }))
app.use(express.json({ limit: '100kb' }))
app.use(cookieParser())
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 200, standardHeaders: true, legacyHeaders: false }))

const authSchema = z.object({ name: z.string().trim().min(2).max(80).optional(), email: z.string().email().max(160), password: z.string().min(8).max(128) })
const tokenCookie = 'rentit_token'

type AuthRequest = express.Request & { userId?: string }
function signToken(userId: string) { return jwt.sign({ sub: userId }, jwtSecret, { expiresIn: '7d' }) }
function auth(req: AuthRequest, res: express.Response, next: express.NextFunction) {
  const token = req.cookies[tokenCookie] as string | undefined
  if (!token) return res.status(401).json({ message: 'Authentication required' })
  try { req.userId = String(jwt.verify(token, jwtSecret).sub); next() } catch { return res.status(401).json({ message: 'Session expired' }) }
}
function safeUser(user: { id: string; name: string; email: string }) { return { id: user.id, name: user.name, email: user.email } }
function error(res: express.Response, status = 400, message = 'Request could not be completed') { return res.status(status).json({ message }) }

app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.post('/api/auth/register', async (req, res) => {
  const parsed = authSchema.safeParse(req.body); if (!parsed.success) return error(res, 422, 'Enter a valid name, email, and password')
  const { name, email, password } = parsed.data
  try {
    const exists = await prisma.user.findUnique({ where: { email: email.toLowerCase() } }); if (exists) return error(res, 409, 'An account with this email already exists')
    const user = await prisma.user.create({ data: { name: name || 'Property owner', email: email.toLowerCase(), passwordHash: await bcrypt.hash(password, 12) } })
    res.cookie(tokenCookie, signToken(user.id), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 })
    return res.status(201).json({ user: safeUser(user) })
  } catch { return error(res, 500, 'Unable to create account') }
})
app.post('/api/auth/login', async (req, res) => {
  const parsed = authSchema.pick({ email: true, password: true }).safeParse(req.body); if (!parsed.success) return error(res, 422, 'Enter a valid email and password')
  try { const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } }); if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return error(res, 401, 'Invalid email or password'); res.cookie(tokenCookie, signToken(user.id), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 }); return res.json({ user: safeUser(user) }) } catch { return error(res, 500, 'Unable to sign in') }
})
app.post('/api/auth/logout', (_req, res) => { res.clearCookie(tokenCookie); res.status(204).end() })
app.get('/api/auth/me', auth, async (req: AuthRequest, res) => { const user = await prisma.user.findUnique({ where: { id: req.userId! } }); if (!user) return error(res, 401, 'Session expired'); res.json({ user: safeUser(user) }) })

app.get('/api/property', auth, async (req: AuthRequest, res) => res.json(await prisma.property.findFirst({ where: { userId: req.userId! } })) )
app.post('/api/property', auth, async (req: AuthRequest, res) => { const parsed = z.object({ name: z.string().trim().min(2).max(120), address: z.string().max(250).optional(), phone: z.string().max(30).optional(), currency: z.string().max(5).default('INR'), rentDueDay: z.number().int().min(1).max(31).default(1) }).safeParse(req.body); if (!parsed.success) return error(res, 422, 'Invalid property details'); const existing = await prisma.property.findFirst({ where: { userId: req.userId! } }); const property = existing ? await prisma.property.update({ where: { id: existing.id }, data: parsed.data }) : await prisma.property.create({ data: { ...parsed.data, userId: req.userId! } }); res.status(existing ? 200 : 201).json(property) })

app.get('/api/rooms', auth, async (req: AuthRequest, res) => res.json(await prisma.room.findMany({ where: { property: { userId: req.userId! } }, orderBy: { roomNumber: 'asc' } })))
app.post('/api/rooms', auth, async (req: AuthRequest, res) => { const parsed = z.object({ propertyId: z.string(), roomNumber: z.string().trim().min(1).max(30), floor: z.string().max(20).optional(), defaultRent: z.coerce.number().nonnegative(), notes: z.string().max(500).optional() }).safeParse(req.body); if (!parsed.success) return error(res, 422, 'Invalid room details'); const property = await prisma.property.findFirst({ where: { id: parsed.data.propertyId, userId: req.userId! } }); if (!property) return error(res, 404, 'Property not found'); try { res.status(201).json(await prisma.room.create({ data: parsed.data })) } catch { return error(res, 409, 'That room already exists') } })

app.get('/api/tenants', auth, async (req: AuthRequest, res) => res.json(await prisma.tenant.findMany({ where: { userId: req.userId!, status: 'active' }, include: { room: true }, orderBy: { name: 'asc' } })))
app.post('/api/tenants', auth, async (req: AuthRequest, res) => { const parsed = z.object({ propertyId: z.string(), roomId: z.string().optional(), name: z.string().trim().min(2).max(100), phone: z.string().trim().min(5).max(30), email: z.string().email().optional().or(z.literal('')), monthlyRent: z.coerce.number().positive(), securityDeposit: z.coerce.number().nonnegative().default(0), moveInDate: z.coerce.date().optional(), notes: z.string().max(500).optional() }).safeParse(req.body); if (!parsed.success) return error(res, 422, 'Invalid tenant details'); const property = await prisma.property.findFirst({ where: { id: parsed.data.propertyId, userId: req.userId! } }); if (!property) return error(res, 404, 'Property not found'); const tenant = await prisma.tenant.create({ data: { ...parsed.data, userId: req.userId!, email: parsed.data.email || null }, include: { room: true } }); if (tenant.roomId) await prisma.room.update({ where: { id: tenant.roomId }, data: { status: 'occupied' } }); res.status(201).json(tenant) })

app.get('/api/dashboard', auth, async (req: AuthRequest, res) => { const now = new Date(); const month = Number(req.query.month || now.getMonth() + 1); const year = Number(req.query.year || now.getFullYear()); const property = await prisma.property.findFirst({ where: { userId: req.userId! } }); if (!property) return res.json({ property: null, summary: { expected: 0, collected: 0, pending: 0, occupiedRooms: 0, totalRooms: 0 }, rent: [] }); const tenants = await prisma.tenant.findMany({ where: { userId: req.userId!, propertyId: property.id, status: 'active' }, include: { room: true, rents: { where: { month, year }, include: { payments: true } } } }); const rooms = await prisma.room.findMany({ where: { propertyId: property.id, status: { not: 'archived' } } }); const rent = tenants.map((t: (typeof tenants)[number]) => { const record = t.rents[0]; const expected = Number(record?.rentAmount ?? t.monthlyRent); const paid = record?.payments.reduce((sum: number, p: { amount: unknown }) => sum + Number(p.amount), 0) ?? 0; return { tenant: t, rentRecord: record, expected, paid, due: Math.max(expected - paid, 0), status: paid >= expected ? 'Paid' : paid > 0 ? 'Partial' : 'Pending' } }); const expected = rent.reduce((s: number, r: { expected: number }) => s + r.expected, 0), collected = rent.reduce((s: number, r: { paid: number }) => s + r.paid, 0); res.json({ property, summary: { expected, collected, pending: Math.max(expected - collected, 0), occupiedRooms: rooms.filter((r: (typeof rooms)[number]) => r.status === 'occupied').length, totalRooms: rooms.length }, rent }) })

app.get('/api/reports/monthly', auth, async (req: AuthRequest, res) => { const month = Number(req.query.month || new Date().getMonth() + 1); const year = Number(req.query.year || new Date().getFullYear()); if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year)) return error(res, 422, 'Invalid reporting period'); const payments = await prisma.payment.findMany({ where: { property: { userId: req.userId! }, month, year }, include: { tenant: true, room: true }, orderBy: { paymentDate: 'desc' } }); const total = payments.reduce((sum: number, payment: { amount: unknown }) => sum + Number(payment.amount), 0); res.json({ month, year, total, payments }) })
app.get('/api/reports/yearly', auth, async (req: AuthRequest, res) => { const year = Number(req.query.year || new Date().getFullYear()); if (!Number.isInteger(year) || year < 2000 || year > 2200) return error(res, 422, 'Invalid reporting year'); const payments = await prisma.payment.findMany({ where: { property: { userId: req.userId! }, year }, select: { month: true, amount: true } }); const monthly = Array.from({ length: 12 }, (_, index) => ({ month: index + 1, total: payments.filter((payment: { month: number }) => payment.month === index + 1).reduce((sum: number, payment: { amount: unknown }) => sum + Number(payment.amount), 0) })); res.json({ year, monthly, total: monthly.reduce((sum: number, item: { total: number }) => sum + item.total, 0) }) })
app.get('/api/payments', auth, async (req: AuthRequest, res) => res.json(await prisma.payment.findMany({ where: { property: { userId: req.userId! } }, include: { tenant: true, room: true }, orderBy: { paymentDate: 'desc' } })))
app.post('/api/payments', auth, async (req: AuthRequest, res) => { const parsed = z.object({ tenantId: z.string(), amount: z.coerce.number().positive(), month: z.coerce.number().int().min(1).max(12), year: z.coerce.number().int().min(2000).max(2200), paymentMethod: z.enum(['Cash', 'UPI', 'Bank Transfer', 'Other']).default('Other'), paymentDate: z.coerce.date().optional(), transactionReference: z.string().max(100).optional(), notes: z.string().max(500).optional() }).safeParse(req.body); if (!parsed.success) return error(res, 422, 'Invalid payment details'); const tenant = await prisma.tenant.findFirst({ where: { id: parsed.data.tenantId, userId: req.userId!, status: 'active' }, include: { room: true } }); if (!tenant) return error(res, 404, 'Tenant not found'); const record = await prisma.rentRecord.upsert({ where: { tenantId_month_year: { tenantId: tenant.id, month: parsed.data.month, year: parsed.data.year } }, create: { tenantId: tenant.id, roomId: tenant.roomId, propertyId: tenant.propertyId, month: parsed.data.month, year: parsed.data.year, rentAmount: tenant.monthlyRent }, update: {} }); const payment = await prisma.payment.create({ data: { ...parsed.data, tenantId: tenant.id, roomId: tenant.roomId, propertyId: tenant.propertyId, rentRecordId: record.id } }); res.status(201).json(payment) })

app.use((_req, res) => error(res, 404, 'Not found'))
app.use((_err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => error(res, 500, 'Something went wrong'))
app.listen(port, () => console.log(`[rentit] API listening on ${port}`))
process.on('SIGTERM', async () => { await prisma.$disconnect(); process.exit(0) })

export default app
