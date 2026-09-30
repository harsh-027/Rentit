import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { cookieOptions, token, auth } from '../middleware/auth.js'
import type { AuthRequest } from '../types/auth.js'
const router = Router(), credentials = z.object({ email: z.string().email().max(160), password: z.string().min(8).max(128) }), register = credentials.extend({ name: z.string().trim().min(2).max(80) })
const safe = (user: { id: string; name: string; email: string }) => ({ id: user.id, name: user.name, email: user.email })
router.post('/register', async (req, res, next) => { try { const data = register.parse(req.body), email = data.email.toLowerCase(); if (await prisma.user.findUnique({ where: { email } })) return res.status(409).json({ message: 'An account with this email already exists' }); const user = await prisma.user.create({ data: { name: data.name, email, passwordHash: await bcrypt.hash(data.password, 12) } }); res.cookie('rentit_token', token(user.id), cookieOptions).status(201).json({ user: safe(user) }) } catch (e) { next(e) } })
router.post('/login', async (req, res, next) => { try { const data = credentials.parse(req.body), user = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } }); if (!user || !(await bcrypt.compare(data.password, user.passwordHash))) return res.status(401).json({ message: 'Invalid email or password' }); res.cookie('rentit_token', token(user.id), cookieOptions).json({ user: safe(user) }) } catch (e) { next(e) } })
router.post('/logout', (_req, res) => res.clearCookie('rentit_token', cookieOptions).status(204).end())
router.get('/me', auth, async (req: AuthRequest, res, next) => { try { const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { id: true, name: true, email: true } }); if (!user) return res.status(401).json({ message: 'Session expired' }); res.json({ user }) } catch (e) { next(e) } })
export default router
