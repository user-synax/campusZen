import { NextResponse } from 'next/server'

export class APIError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.name = 'APIError'
  }
}

export class BadRequestError extends APIError {
  constructor(message = 'Bad request', details = null) {
    super(message, 400, 'BAD_REQUEST')
    this.details = details
  }
}

export class UnauthorizedError extends APIError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED')
  }
}

export class ForbiddenError extends APIError {
  constructor(message = 'Access denied') {
    super(message, 403, 'FORBIDDEN')
  }
}

export class NotFoundError extends APIError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND')
  }
}

export class ConflictError extends APIError {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'CONFLICT')
  }
}

export class TooManyRequestsError extends APIError {
  constructor(message = 'Too many requests', retryAfter = 60) {
    super(message, 429, 'RATE_LIMITED')
    this.retryAfter = retryAfter
  }
}

export function successResponse(data, options = {}) {
  const { status = 200, headers = {} } = options
  return NextResponse.json({
    success: true,
    data,
    timestamp: new Date().toISOString()
  }, { status, headers })
}

export function errorResponse(error, options = {}) {
  const { includeStack = false } = options

  const response = {
    success: false,
    error: {
      message: error.message || 'An unexpected error occurred',
      code: error.code || 'INTERNAL_ERROR'
    },
    timestamp: new Date().toISOString()
  }

  if (error.details) {
    response.error.details = error.details
  }

  if (includeStack && process.env.NODE_ENV === 'development') {
    response.error.stack = error.stack
  }

  const statusCode = error instanceof APIError ? error.statusCode : 500

  const headers = {}
  if (error instanceof TooManyRequestsError) {
    headers['Retry-After'] = String(error.retryAfter)
  }

  return NextResponse.json(response, { status: statusCode, headers })
}

export function paginatedResponse(items, options = {}) {
  const {
    page = 1,
    limit = 20,
    total = 0,
    hasMore = null
  } = options

  const calculatedHasMore = hasMore !== null ? hasMore : (page * limit) < total

  return NextResponse.json({
    success: true,
    data: items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: calculatedHasMore
    },
    timestamp: new Date().toISOString()
  })
}

export function withErrorHandler(fn) {
  return async (request, ...args) => {
    try {
      return await fn(request, ...args)
    } catch (error) {
      console.error('[API Error]', error)

      if (error instanceof APIError) {
        return errorResponse(error)
      }

      return errorResponse(new APIError(
        process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      ))
    }
  }
}

export function validate(schema, data) {
  const result = schema.safeParse(data)
  
  if (!result.success) {
    const zodIssues = result.error.issues || result.error.errors || []
    const errors = zodIssues.map(e => ({
      field: (e.path || []).join('.'),
      message: e.message
    }))
    throw new BadRequestError('Validation failed', errors)
  }

  return result.data
}
