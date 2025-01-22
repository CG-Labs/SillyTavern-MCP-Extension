/**
 * Error handling utilities
 */

/**
 * Error codes
 */
export const ErrorCodes = {
    // Validation errors
    INVALID_NAME: 'INVALID_NAME',
    INVALID_SCHEMA: 'INVALID_SCHEMA',
    INVALID_URI: 'INVALID_URI',
    INVALID_HANDLER: 'INVALID_HANDLER',
    INVALID_ARGUMENTS: 'INVALID_ARGUMENTS',

    // Registration errors
    TOOL_EXISTS: 'TOOL_EXISTS',
    RESOURCE_EXISTS: 'RESOURCE_EXISTS',

    // Execution errors
    TOOL_NOT_FOUND: 'TOOL_NOT_FOUND',
    RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
    TOOL_EXECUTION_FAILED: 'TOOL_EXECUTION_FAILED',
    RESOURCE_ACCESS_DENIED: 'RESOURCE_ACCESS_DENIED',

    // Server errors
    SERVER_ERROR: 'SERVER_ERROR'
};

/**
 * Custom error class for MCP extension
 */
export class MCPError extends Error {
    /**
     * Create a new MCP error
     * @param {string} code Error code
     * @param {string} message Error message
     * @param {object} [details] Additional error details
     */
    constructor(code, message, details = {}) {
        super(message);
        this.name = 'MCPError';
        this.code = code;
        this.details = details;
    }

    /**
     * Convert error to JSON
     * @returns {object} JSON representation of error
     */
    toJSON() {
        return {
            name: this.name,
            code: this.code,
            message: this.message,
            details: this.details
        };
    }
}

/**
 * Assert a condition or throw an error
 * @param {boolean} condition Condition to check
 * @param {string} code Error code if condition fails
 * @param {string} message Error message if condition fails
 * @param {object} [details] Additional error details
 * @throws {MCPError} If condition is false
 */
export function assert(condition, code, message, details) {
    if (!condition) {
        throw new MCPError(code, message, details);
    }
}

/**
 * Express error handler middleware
 */
export function errorHandler(err, req, res, next) {
    if (err instanceof MCPError) {
        res.status(400).json(err.toJSON());
    } else {
        // Convert unknown errors to MCPError
        const mcpError = new MCPError(
            ErrorCodes.SERVER_ERROR,
            'Internal server error',
            {
                originalError: {
                    message: err.message,
                    stack: err.stack
                }
            }
        );
        res.status(500).json(mcpError.toJSON());
    }
}