/**
 * Schema validation utilities for MCP tools and resources
 */

import { MCPError, ErrorCodes } from './errors.js';

/**
 * MCP message types
 */
export const MCPMessageTypes = {
    // Server discovery
    DISCOVER: 'discover',
    DISCOVER_RESPONSE: 'discover_response',
    
    // Tool registration
    REGISTER_TOOL: 'register_tool',
    REGISTER_TOOL_RESPONSE: 'register_tool_response',
    
    // Tool execution
    EXECUTE_TOOL: 'execute_tool',
    EXECUTE_TOOL_RESPONSE: 'execute_tool_response',
    EXECUTION_STATUS: 'execution_status',
    
    // Errors
    ERROR: 'error'
};

/**
 * MCP server capabilities
 */
export const MCPCapabilities = {
    TOOL_EXECUTION: 'tool_execution',
    STREAMING: 'streaming',
    ASYNC_EXECUTION: 'async_execution'
};

/**
 * MCP execution status types
 */
export const MCPExecutionStatus = {
    STARTED: 'started',
    RUNNING: 'running',
    COMPLETED: 'completed',
    FAILED: 'failed'
};

/**
 * Validate MCP message
 * @param {object} message Message object
 * @throws {MCPError} If validation fails
 */
export function validateMCPMessage(message) {
    if (!message || typeof message !== 'object') {
        throw new MCPError(
            ErrorCodes.INVALID_MESSAGE,
            'Message must be an object'
        );
    }

    if (!message.type || typeof message.type !== 'string') {
        throw new MCPError(
            ErrorCodes.INVALID_MESSAGE,
            'Message must have a type'
        );
    }

    if (!Object.values(MCPMessageTypes).includes(message.type)) {
        throw new MCPError(
            ErrorCodes.INVALID_MESSAGE,
            `Invalid message type: ${message.type}`
        );
    }

    // Validate message-specific fields
    switch (message.type) {
        case MCPMessageTypes.DISCOVER:
            // No additional fields required
            break;

        case MCPMessageTypes.DISCOVER_RESPONSE:
            validateDiscoverResponse(message);
            break;

        case MCPMessageTypes.REGISTER_TOOL:
            validateToolRegistration(message);
            break;

        case MCPMessageTypes.EXECUTE_TOOL:
            validateToolExecution(message);
            break;

        case MCPMessageTypes.ERROR:
            validateErrorMessage(message);
            break;
    }
}

/**
 * Validate discover response message
 * @param {object} message Message object
 * @throws {MCPError} If validation fails
 */
function validateDiscoverResponse(message) {
    if (!message.server || typeof message.server !== 'object') {
        throw new MCPError(
            ErrorCodes.INVALID_MESSAGE,
            'Discover response must include server information'
        );
    }

    if (!message.server.name || typeof message.server.name !== 'string') {
        throw new MCPError(
            ErrorCodes.INVALID_MESSAGE,
            'Server must have a name'
        );
    }

    if (!Array.isArray(message.server.capabilities)) {
        throw new MCPError(
            ErrorCodes.INVALID_MESSAGE,
            'Server capabilities must be an array'
        );
    }

    message.server.capabilities.forEach(capability => {
        if (!Object.values(MCPCapabilities).includes(capability)) {
            throw new MCPError(
                ErrorCodes.INVALID_MESSAGE,
                `Invalid capability: ${capability}`
            );
        }
    });
}

/**
 * Validate error message
 * @param {object} message Message object
 * @throws {MCPError} If validation fails
 */
function validateErrorMessage(message) {
    if (!message.error || typeof message.error !== 'object') {
        throw new MCPError(
            ErrorCodes.INVALID_MESSAGE,
            'Error message must include error information'
        );
    }

    if (!message.error.code || typeof message.error.code !== 'string') {
        throw new MCPError(
            ErrorCodes.INVALID_MESSAGE,
            'Error must have a code'
        );
    }

    if (!message.error.message || typeof message.error.message !== 'string') {
        throw new MCPError(
            ErrorCodes.INVALID_MESSAGE,
            'Error must have a message'
        );
    }
}

/**
 * Validates a value against a JSON Schema type
 * @param {any} value Value to validate
 * @param {string} type Expected type
 * @returns {boolean} True if value matches type
 */
function validateType(value, type) {
    switch (type) {
        case 'string':
            return typeof value === 'string';
        case 'number':
            return typeof value === 'number' && !isNaN(value);
        case 'integer':
            return Number.isInteger(value);
        case 'boolean':
            return typeof value === 'boolean';
        case 'array':
            return Array.isArray(value);
        case 'object':
            return typeof value === 'object' && value !== null && !Array.isArray(value);
        case 'null':
            return value === null;
        default:
            return false;
    }
}

/**
 * Validates a value against a JSON Schema
 * @param {any} value Value to validate
 * @param {object} schema JSON Schema
 * @returns {object} Validation result { valid: boolean, errors: string[] }
 */
export function validateSchema(value, schema) {
    const errors = [];

    // Type validation
    if (schema.type) {
        if (!validateType(value, schema.type)) {
            errors.push(`Expected type ${schema.type}, got ${typeof value}`);
            return { valid: false, errors };
        }
    }

    // Required properties
    if (schema.required && schema.type === 'object') {
        for (const required of schema.required) {
            if (!(required in value)) {
                errors.push(`Missing required property: ${required}`);
            }
        }
    }

    // Property validation
    if (schema.properties && schema.type === 'object') {
        for (const [key, propSchema] of Object.entries(schema.properties)) {
            if (key in value) {
                const propValue = value[key];
                const result = validateSchema(propValue, propSchema);
                if (!result.valid) {
                    errors.push(`Property ${key}: ${result.errors.join(', ')}`);
                }
            }
        }
    }

    // Array validation
    if (schema.type === 'array') {
        if (schema.items) {
            for (let i = 0; i < value.length; i++) {
                const result = validateSchema(value[i], schema.items);
                if (!result.valid) {
                    errors.push(`Array item ${i}: ${result.errors.join(', ')}`);
                }
            }
        }

        if (schema.minItems !== undefined && value.length < schema.minItems) {
            errors.push(`Array must have at least ${schema.minItems} items`);
        }

        if (schema.maxItems !== undefined && value.length > schema.maxItems) {
            errors.push(`Array must have at most ${schema.maxItems} items`);
        }

        if (schema.uniqueItems && new Set(value).size !== value.length) {
            errors.push('Array items must be unique');
        }
    }

    // String validation
    if (schema.type === 'string') {
        if (schema.minLength !== undefined && value.length < schema.minLength) {
            errors.push(`String length must be >= ${schema.minLength}`);
        }

        if (schema.maxLength !== undefined && value.length > schema.maxLength) {
            errors.push(`String length must be <= ${schema.maxLength}`);
        }

        if (schema.pattern) {
            const regex = new RegExp(schema.pattern);
            if (!regex.test(value)) {
                errors.push(`String must match pattern: ${schema.pattern}`);
            }
        }

        if (schema.format) {
            switch (schema.format) {
                case 'email':
                    if (!value.includes('@')) {
                        errors.push('Invalid email format');
                    }
                    break;
                case 'uri':
                    try {
                        new URL(value);
                    } catch {
                        errors.push('Invalid URI format');
                    }
                    break;
            }
        }
    }

    // Number validation
    if (schema.type === 'number' || schema.type === 'integer') {
        if (schema.minimum !== undefined && value < schema.minimum) {
            errors.push(`Value must be >= ${schema.minimum}`);
        }

        if (schema.maximum !== undefined && value > schema.maximum) {
            errors.push(`Value must be <= ${schema.maximum}`);
        }

        if (schema.multipleOf !== undefined && value % schema.multipleOf !== 0) {
            errors.push(`Value must be multiple of ${schema.multipleOf}`);
        }
    }

    // Enum validation
    if (schema.enum !== undefined && !schema.enum.includes(value)) {
        errors.push(`Value must be one of: ${schema.enum.join(', ')}`);
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Validates a tool schema
 * @param {object} schema Tool schema to validate
 * @returns {object} Validation result { valid: boolean, errors: string[] }
 */
export function validateToolSchema(schema) {
    const errors = [];

    // Basic schema structure
    if (!schema || typeof schema !== 'object') {
        errors.push('Schema must be an object');
        return { valid: false, errors };
    }

    // Required fields
    if (!schema.type) {
        errors.push('Schema must have a type field');
    }

    // Properties validation
    if (schema.properties && typeof schema.properties !== 'object') {
        errors.push('Properties must be an object');
    }

    // Required properties validation
    if (schema.required && !Array.isArray(schema.required)) {
        errors.push('Required must be an array');
    }

    // Validate property schemas
    if (schema.properties) {
        for (const [key, propSchema] of Object.entries(schema.properties)) {
            const result = validateToolSchema(propSchema);
            if (!result.valid) {
                errors.push(`Invalid property schema for ${key}: ${result.errors.join(', ')}`);
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Validates a resource URI
 * @param {string} uri Resource URI to validate
 * @returns {object} Validation result { valid: boolean, errors: string[] }
 */
export function validateResourceUri(uri) {
    const errors = [];

    if (typeof uri !== 'string') {
        errors.push('URI must be a string');
        return { valid: false, errors };
    }

    try {
        // Check if URI follows the format: protocol://path
        const [protocol, path] = uri.split('://');
        
        if (!protocol || !path) {
            errors.push('URI must follow format: protocol://path');
        }

        if (protocol && !/^[a-zA-Z][a-zA-Z0-9+.-]*$/.test(protocol)) {
            errors.push('Invalid protocol format');
        }

    } catch (error) {
        errors.push('Invalid URI format');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}