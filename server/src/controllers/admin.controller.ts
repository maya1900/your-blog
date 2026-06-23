import type { RequestHandler } from 'express'
import { z } from 'zod'
import * as adminService from '../services/admin.service.js'
import { UnauthorizedError } from '../utils/errors.js'

const IdParam = z.object({ id: z.coerce.number().int().positive() })

// ===== Stats =====

export const stats: RequestHandler = async (_req, res, next) => {
  try {
    const data = await adminService.getStats()
    res.json({ data })
  } catch (err) {
    next(err)
  }
}

export const exportSite: RequestHandler = async (_req, res, next) => {
  try {
    const { filename, payload } = await adminService.buildSiteExport()
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(JSON.stringify(payload, null, 2))
  } catch (err) {
    next(err)
  }
}

// ===== Users =====

export const listUsers: RequestHandler = async (req, res, next) => {
  try {
    const input = adminService.ListUsersSchema.parse(req.query)
    const data = await adminService.listUsers(input)
    res.json({ data })
  } catch (err) {
    next(err)
  }
}

export const updateUser: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new UnauthorizedError()
    const { id } = IdParam.parse(req.params)
    const input = adminService.UpdateUserSchema.parse(req.body)
    const data = await adminService.updateUser(req.user.id, id, input)
    res.json({ data })
  } catch (err) {
    next(err)
  }
}

export const resetUserPassword: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new UnauthorizedError()
    const { id } = IdParam.parse(req.params)
    const input = adminService.ResetPasswordSchema.parse(req.body)
    await adminService.resetUserPassword(id, input)
    res.json({ data: { ok: true } })
  } catch (err) {
    next(err)
  }
}

// ===== All comments =====

export const listAllComments: RequestHandler = async (req, res, next) => {
  try {
    const input = adminService.ListCommentsSchema.parse(req.query)
    const data = await adminService.listAllComments(input)
    res.json({ data })
  } catch (err) {
    next(err)
  }
}

// ===== Categories CRUD =====

export const createCategory: RequestHandler = async (req, res, next) => {
  try {
    const input = adminService.CategoryInputSchema.parse(req.body)
    const data = await adminService.createCategory(input)
    res.status(201).json({ data })
  } catch (err) {
    next(err)
  }
}

export const updateCategory: RequestHandler = async (req, res, next) => {
  try {
    const { id } = IdParam.parse(req.params)
    const input = adminService.CategoryInputSchema.parse(req.body)
    const data = await adminService.updateCategory(id, input)
    res.json({ data })
  } catch (err) {
    next(err)
  }
}

export const deleteCategory: RequestHandler = async (req, res, next) => {
  try {
    const { id } = IdParam.parse(req.params)
    await adminService.deleteCategory(id)
    res.status(204).send()
  } catch (err) {
    next(err)
  }
}

// ===== Tags delete =====

export const deleteTag: RequestHandler = async (req, res, next) => {
  try {
    const { id } = IdParam.parse(req.params)
    await adminService.deleteTag(id)
    res.status(204).send()
  } catch (err) {
    next(err)
  }
}
