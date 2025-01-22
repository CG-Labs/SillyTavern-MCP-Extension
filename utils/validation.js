/**
 * Validation utilities
 */

import { MCPError, ErrorCodes } from './errors.js';

/**
 * Validate tool registration data
 * @param {object} data Registration data
 * @throws {MCPError} If validation fails
 */
export function validateToolRegistration(data) {
    if (!data || typeof data !== 'object') {
        throw new MCPError(
            ErrorCodes.INVALID_ARGUMENTS,
            'Tool registration data must be an object'
        );
    }

    if (!data.name || typeof data.name !== 'string') {
        throw new MCPError(
            ErrorCodes.INVALID_NAME,
            'Tool name must be a non-empty string'
        );
    }

    if (!data.schema || typeof data.schema !== 'object') {
        throw new MCPError(
            ErrorCodes.INVALID_SCHEMA,
            'Tool schema must be an object'
        );
    }

    validateSchema(data.schema);
}

/**
 * Validate tool execution data
 * @param {object} data Execution data
 * @throws {MCPError} If validation fails
 */
export function validateToolExecution(data) {
    if (!data || typeof data !== 'object') {
        throw new MCPError(
            ErrorCodes.INVALID_ARGUMENTS,
            'Tool execution data must be an object'
        );
    }

    if (!data.executionId || typeof data.executionId !== 'string') {
        throw new MCPError(
            ErrorCodes.INVALID_ARGUMENTS,
            'Tool execution ID must be a non-empty string'
        );
    }

    if (!data.name || typeof data.name !== 'string') {
        throw new MCPError(
            ErrorCodes.INVALID_NAME,
            'Tool name must be a non-empty string'
        );
    }

    if (data.args !== undefined && typeof data.args !== 'object') {
        throw new MCPError(
            ErrorCodes.INVALID_ARGUMENTS,
            'Tool arguments must be an object if provided'
        );
    }
}

/**
 * Validate JSON schema
 * @param {object} schema JSON schema
 * @throws {MCPError} If validation fails
 */
export function validateSchema(schema) {
    if (!schema || typeof schema !== 'object') {
        throw new MCPError(
            ErrorCodes.INVALID_SCHEMA,
            'Schema must be an object'
        );
    }

    if (!schema.type) {
        throw new MCPError(
            ErrorCodes.INVALID_SCHEMA,
            'Schema must have a type'
        );
    }

    switch (schema.type) {
        case 'object':
            validateObjectSchema(schema);
            break;
        case 'array':
            validateArraySchema(schema);
            break;
        case 'string':
        case 'number':
        case 'integer':
        case 'boolean':
        case 'null':
            // Basic types are valid as-is
            break;
        default:
            throw new MCPError(
                ErrorCodes.INVALID_SCHEMA,
                `Invalid schema type: ${schema.type}`
            );
    }
}

/**
 * Validate object schema
 * @param {object} schema Object schema
 * @throws {MCPError} If validation fails
 */
function validateObjectSchema(schema) {
    if (schema.properties) {
        if (typeof schema.properties !== 'object') {
            throw new MCPError(
                ErrorCodes.INVALID_SCHEMA,
                'Object properties must be an object'
            );
        }

        // Validate each property schema
        Object.values(schema.properties).forEach(validateSchema);
    }

    if (schema.required) {
        if (!Array.isArray(schema.required)) {
            throw new MCPError(
                ErrorCodes.INVALID_SCHEMA,
                'Required properties must be an array'
            );
        }

        if (!schema.properties) {
            throw new MCPError(
                ErrorCodes.INVALID_SCHEMA,
                'Cannot have required properties without properties definition'
            );
        }

        // Validate each required property exists in properties
        schema.required.forEach(prop => {
            if (!schema.properties[prop]) {
                throw new MCPError(
                    ErrorCodes.INVALID_SCHEMA,
                    `Required property not defined: ${prop}`
                );
            }
        });
    }
}

/**
 * Validate array schema
 * @param {object} schema Array schema
 * @throws {MCPError} If validation fails
 */
function validateArraySchema(schema) {
    if (!schema.items) {
        throw new MCPError(
            ErrorCodes.INVALID_SCHEMA,
            'Array schema must have items definition'
        );
    }

    // Validate items schema
    validateSchema(schema.items);

    // Validate array constraints
    if (schema.minItems !== undefined && typeof schema.minItems !== 'number') {
        throw new MCPError(
            ErrorCodes.INVALID_SCHEMA,
            'minItems must be a number'
        );
    }

    if (schema.maxItems !== undefined && typeof schema.maxItems !== 'number') {
        throw new MCPError(
            ErrorCodes.INVALID_SCHEMA,
            'maxItems must be a number'
        );
    }

    if (schema.uniqueItems !== undefined && typeof schema.uniqueItems !== 'boolean') {
        throw new MCPError(
            ErrorCodes.INVALID_SCHEMA,
            'uniqueItems must be a boolean'
        );
    }
}

/**
 * Validate settings object
 * @param {object} settings Settings object
 * @throws {MCPError} If validation fails
 */
export function validateSettings(settings) {
    if (!settings || typeof settings !== 'object') {
        throw new MCPError(
            ErrorCodes.INVALID_ARGUMENTS,
            'Settings must be an object'
        );
    }

    // Validate WebSocket settings
    if (settings.websocket) {
        if (typeof settings.websocket !== 'object') {
            throw new MCPError(
                ErrorCodes.INVALID_ARGUMENTS,
                'WebSocket settings must be an object'
            );
        }

        if (settings.websocket.port !== undefined) {
            const port = settings.websocket.port;
            if (!Number.isInteger(port) || port < 1024 || port > 65535) {
                throw new MCPError(
                    ErrorCodes.INVALID_ARGUMENTS,
                    'WebSocket port must be an integer between 1024 and 65535'
                );
            }
        }
    }

    // Validate logging settings
    if (settings.logging) {
        if (typeof settings.logging !== 'object') {
            throw new MCPError(
                ErrorCodes.INVALID_ARGUMENTS,
                'Logging settings must be an object'
            );
        }

        if (settings.logging.level !== undefined) {
            const validLevels = ['debug', 'info', 'warn', 'error'];
            if (!validLevels.includes(settings.logging.level)) {
                throw new MCPError(
                    ErrorCodes.INVALID_ARGUMENTS,
                    `Invalid log level: ${settings.logging.level}`
                );
            }
        }
    }
}