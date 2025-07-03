// Common API types
export interface BaseApiResponse {
    success: boolean
    timestamp: string
}

export interface SuccessResponse<T = any> extends BaseApiResponse {
    success: true
    data: T
}

export interface ErrorResponse extends BaseApiResponse {
    success: false
    error: string
    code?: string
    details?: any
}

export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse

// Environment configuration
export interface EnvConfig {
    DISCORD_TOKEN?: string
    GITHUB_TOKEN?: string
    NODE_ENV: 'development' | 'production' | 'test'
    PORT?: string
}

// Request/Response types
export interface RequestContext {
    requestId: string
    timestamp: string
    userAgent?: string
    ip?: string
}

export interface PaginationParams {
    page?: number
    limit?: number
    offset?: number
}

export interface PaginatedResponse<T> {
    data: T[]
    pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
        hasNext: boolean
        hasPrev: boolean
    }
}

// Validation types
export interface ValidationResult {
    valid: boolean
    errors: string[]
    warnings?: string[]
}

export interface ValidationRule {
    type: 'required' | 'email' | 'url' | 'minLength' | 'maxLength' | 'pattern' | 'custom'
    value?: any
    message?: string
    validator?: (value: any) => boolean
}

// Logging types
export interface LogEntry {
    level: 'debug' | 'info' | 'warn' | 'error'
    message: string
    timestamp: string
    requestId?: string
    userId?: string
    metadata?: Record<string, any>
}

// Cache types
export interface CacheEntry<T = any> {
    key: string
    value: T
    expiresAt: number
    createdAt: number
}

export interface CacheOptions {
    ttl?: number // Time to live in seconds
    maxSize?: number
    namespace?: string
}

// Rate limiting types
export interface RateLimitConfig {
    windowMs: number
    maxRequests: number
    message?: string
    statusCode?: number
}

export interface RateLimitInfo {
    remaining: number
    reset: number
    limit: number
}

// Webhook types
export interface WebhookPayload {
    event: string
    data: any
    timestamp: string
    signature?: string
}

export interface WebhookHandler {
    event: string
    handler: (payload: WebhookPayload) => Promise<void>
}

// Service configuration
export interface ServiceConfig {
    name: string
    version: string
    enabled: boolean
    config: Record<string, any>
}

// Health check types
export interface HealthCheckResult {
    status: 'healthy' | 'unhealthy' | 'degraded'
    timestamp: string
    checks: Record<string, {
        status: 'healthy' | 'unhealthy'
        message?: string
        duration?: number
    }>
}

// Utility types
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>

export type Nullable<T> = T | null

export type AsyncFunction<T = any> = (...args: any[]) => Promise<T>

export type SyncFunction<T = any> = (...args: any[]) => T 