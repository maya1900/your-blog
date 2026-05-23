import jwt, { type SignOptions } from 'jsonwebtoken'
import type { Role } from '@prisma/client'
import { env } from '../config/env.js'

export interface JwtPayload {
  sub: number
  role: Role
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  })
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET)
  if (typeof decoded === 'string') {
    throw new Error('Invalid token payload')
  }
  return decoded as unknown as JwtPayload
}
