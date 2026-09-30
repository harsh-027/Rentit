import type { Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import type { AuthRequest } from '../types/auth.js'
const secret = () => process.env.JWT_SECRET || ''
export function auth(req: AuthRequest, res: Response, next: NextFunction) { const token = req.cookies?.rentit_token; if (!token) return res.status(401).json({ message: 'Authentication required' }); try { const payload = jwt.verify(token, secret()) as jwt.JwtPayload; req.userId = String(payload.sub); next() } catch { return res.status(401).json({ message: 'Session expired' }) } }
export const token = (userId: string) => jwt.sign({ sub: userId }, secret(), { expiresIn: '7d' })
export const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax', maxAge: 604800000 }
