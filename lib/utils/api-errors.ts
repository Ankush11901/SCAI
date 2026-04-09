/**
 * API Error Utilities
 * Standardized error handling for API routes
 */

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'BAD_REQUEST'
  | 'VALIDATION_ERROR'
  | 'QUOTA_EXCEEDED'
  | 'RATE_LIMITED'
  | 'GENERATION_FAILED'
  | 'IMAGE_GENERATION_FAILED'
  | 'AI_SERVICE_ERROR'
  | 'DATABASE_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'INTERNAL_ERROR'
  | 'UNKNOWN_ERROR'

export interface ApiError {
  code: ErrorCode
  message: string
  details?: Record<string, unknown>
  timestamp: string
  requestId?: string
}

export interface ApiErrorResponse {
  error: ApiError
  success: false
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR CLASSES
// ═══════════════════════════════════════════════════════════════════════════════

export class AppError extends Error {
  code: ErrorCode
  statusCode: number
  details?: Record<string, unknown>

  constructor(code: ErrorCode, message: string, statusCode: number, details?: Record<string, unknown>) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, 400, details)
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super('UNAUTHORIZED', message, 401)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super('FORBIDDEN', message, 403)
    this.name = 'AuthorizationError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super('NOT_FOUND', `${resource} not found`, 404)
    this.name = 'NotFoundError'
  }
}

export class QuotaError extends AppError {
  constructor(used: number, limit: number, resetsAt: Date) {
    super('QUOTA_EXCEEDED', 'Daily generation quota exceeded', 429, {
      used,
      limit,
      resetsAt: resetsAt.toISOString(),
    })
    this.name = 'QuotaError'
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    super('RATE_LIMITED', 'Too many requests', 429, {
      retryAfter: retryAfter || 60,
    })
    this.name = 'RateLimitError'
  }
}

export class GenerationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('GENERATION_FAILED', message, 500, details)
    this.name = 'GenerationError'
  }
}

export class AIServiceError extends AppError {
  constructor(service: string, message: string) {
    super('AI_SERVICE_ERROR', `${service} error: ${message}`, 502, { service })
    this.name = 'AIServiceError'
  }
}

export class TimeoutError extends AppError {
  constructor(operation: string, timeoutMs: number) {
    super('TIMEOUT', `${operation} timed out after ${timeoutMs}ms`, 504, {
      operation,
      timeoutMs,
    })
    this.name = 'TimeoutError'
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR RESPONSE BUILDERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a standardized error response
 */
export function createErrorResponse(error: AppError | Error, requestId?: string): Response {
  let statusCode = 500
  let apiError: ApiError

  if (error instanceof AppError) {
    statusCode = error.statusCode
    apiError = {
      code: error.code,
      message: error.message,
      details: error.details,
      timestamp: new Date().toISOString(),
      requestId,
    }
  } else {
    // Unknown error - don't expose details
    apiError = {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
      requestId,
    }
    // Log the actual error for debugging
    console.error('[API Error]', error)
  }

  const response: ApiErrorResponse = {
    error: apiError,
    success: false,
  }

  return new Response(JSON.stringify(response), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Create a JSON error response (simpler format for backwards compatibility)
 */
export function jsonError(message: string, status = 500): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR PARSING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parse error from various sources into consistent format
 */
export function parseError(error: unknown): { message: string; code: ErrorCode } {
  if (error instanceof AppError) {
    return { message: error.message, code: error.code }
  }

  if (error instanceof Error) {
    // Check for known error types
    if (error.message.includes('quota') || error.message.includes('limit')) {
      return { message: error.message, code: 'QUOTA_EXCEEDED' }
    }
    if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      return { message: 'Request timed out', code: 'TIMEOUT' }
    }
    if (error.message.includes('network') || error.message.includes('ECONNREFUSED')) {
      return { message: 'Network error', code: 'NETWORK_ERROR' }
    }
    if (error.message.includes('API') || error.message.includes('Gemini') || error.message.includes('OpenAI')) {
      return { message: error.message, code: 'AI_SERVICE_ERROR' }
    }
    return { message: error.message, code: 'UNKNOWN_ERROR' }
  }

  return { message: 'An unexpected error occurred', code: 'UNKNOWN_ERROR' }
}

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate required fields in request body
 */
export function validateRequired<T extends Record<string, unknown>>(
  body: T,
  requiredFields: (keyof T)[]
): ValidationError | null {
  const missing: string[] = []

  for (const field of requiredFields) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      missing.push(String(field))
    }
  }

  if (missing.length > 0) {
    return new ValidationError(
      `Missing required fields: ${missing.join(', ')}`,
      { missingFields: missing }
    )
  }

  return null
}

/**
 * Validate and sanitize topic/keyword input
 */
export function validateTopic(topic: string): { valid: boolean; sanitized: string; error?: string } {
  if (!topic || typeof topic !== 'string') {
    return { valid: false, sanitized: '', error: 'Topic is required' }
  }

  const sanitized = topic.trim()

  if (sanitized.length === 0) {
    return { valid: false, sanitized: '', error: 'Topic cannot be empty' }
  }

  if (sanitized.length < 2) {
    return { valid: false, sanitized, error: 'Topic must be at least 2 characters' }
  }

  if (sanitized.length > 200) {
    return { valid: false, sanitized: sanitized.slice(0, 200), error: 'Topic must be under 200 characters' }
  }

  // Check for suspicious patterns (potential injection)
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+=/i,
    /data:/i,
  ]

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(sanitized)) {
      return { valid: false, sanitized: '', error: 'Invalid characters in topic' }
    }
  }

  return { valid: true, sanitized }
}

/**
 * Validate article type
 */
export function validateArticleType(type: string, validTypes: string[]): boolean {
  return validTypes.includes(type)
}
