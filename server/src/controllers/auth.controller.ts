import type { RequestHandler } from 'express'
import * as authService from '../services/auth.service.js'
import { UnauthorizedError } from '../utils/errors.js'

export const register: RequestHandler = async (req, res, next) => {
  try {
    const result = await authService.register(req.body)
    res.status(201).json({ data: result })
  } catch (err) {
    next(err)
  }
}

export const login: RequestHandler = async (req, res, next) => {
  try {
    const result = await authService.login(req.body)
    res.json({ data: result })
  } catch (err) {
    next(err)
  }
}

export const me: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new UnauthorizedError()
    const user = await authService.getMe(req.user.id)
    res.json({ data: user })
  } catch (err) {
    next(err)
  }
}
