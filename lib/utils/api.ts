export interface ApiResponse<T = any> {
    success: boolean
    data?: T
    error?: string
    timestamp: string
}

export interface ApiError {
    message: string
    code: string
    details?: any
}

export class ApiUtils {
    static createSuccessResponse<T>(data: T): ApiResponse<T> {
        return {
            success: true,
            data,
            timestamp: new Date().toISOString()
        }
    }

    static createErrorResponse(error: string, code?: string, details?: any): ApiResponse {
        return {
            success: false,
            error,
            timestamp: new Date().toISOString()
        }
    }

    static async handleApiRequest<T>(
        requestFn: () => Promise<T>,
        errorMessage: string = 'Request failed'
    ): Promise<ApiResponse<T>> {
        try {
            const data = await requestFn()
            return this.createSuccessResponse(data)
        } catch (error) {
            console.error('API Error:', error)
            return this.createErrorResponse(
                error instanceof Error ? error.message : errorMessage
            )
        }
    }

    static validateRequiredFields(data: any, fields: string[]): string[] {
        const missingFields: string[] = []

        for (const field of fields) {
            if (!data[field] || data[field] === '') {
                missingFields.push(field)
            }
        }

        return missingFields
    }

    static sanitizeInput(input: string): string {
        return input.trim().replace(/[<>]/g, '')
    }

    static formatDate(date: Date | string): string {
        const d = new Date(date)
        return d.toISOString()
    }

    static parseQueryParams(query: any): Record<string, string> {
        const params: Record<string, string> = {}

        for (const [key, value] of Object.entries(query)) {
            if (typeof value === 'string') {
                params[key] = value
            } else if (Array.isArray(value)) {
                params[key] = value[0] as string
            }
        }

        return params
    }

    static async retryRequest<T>(
        requestFn: () => Promise<T>,
        maxRetries: number = 3,
        delay: number = 1000
    ): Promise<T> {
        let lastError: Error

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await requestFn()
            } catch (error) {
                lastError = error as Error

                if (attempt === maxRetries) {
                    throw lastError
                }

                // Exponential backoff
                await new Promise(resolve => setTimeout(resolve, delay * attempt))
            }
        }

        throw lastError!
    }

    static validateUrl(url: string): boolean {
        try {
            new URL(url)
            return true
        } catch {
            return false
        }
    }

    static validateEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return emailRegex.test(email)
    }

    static generateRequestId(): string {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    static logApiRequest(method: string, url: string, requestId: string, params?: any): void {
        console.log(`[${requestId}] ${method} ${url}`, params ? `- Params: ${JSON.stringify(params)}` : '')
    }

    static logApiResponse(requestId: string, status: number, data?: any): void {
        console.log(`[${requestId}] Response ${status}`, data ? `- Data: ${JSON.stringify(data)}` : '')
    }
}

export const apiUtils = new ApiUtils() 