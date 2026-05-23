export class HttpError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

export class BadRequestError extends HttpError {
  constructor(message = 'Bad request') {
    super(400, 'BAD_REQUEST', message)
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = 'Authentication required') {
    super(401, 'UNAUTHORIZED', message)
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = 'Forbidden') {
    super(403, 'FORBIDDEN', message)
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'Not found') {
    super(404, 'NOT_FOUND', message)
  }
}

export class ConflictError extends HttpError {
  constructor(message = 'Resource conflict') {
    super(409, 'CONFLICT', message)
  }
}
