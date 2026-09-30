import type { ErrorRequestHandler, Request, Response, NextFunction } from 'express'
export const notFound = (_req: Request, res: Response) => res.status(404).json({ message: 'Not found' })
export const errors: ErrorRequestHandler = (err, _req, res, _next: NextFunction) => { console.error('[api]', err); res.status(500).json({ message: 'Something went wrong' }) }
