/**
 * MCP Extension for SillyTavern
 */

import { logger, LogLevels } from './utils/logger.js';
import { MCPError, ErrorCodes, errorHandler } from './utils/errors.js';
import { validateToolRegistration, validateToolExecution, validateSettings } from './utils/validation.js';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Plugin manifest
 */
export const manifest = {
    name: 'MCP Extension',
    version: '1.0.0',
    description: 'Adds WebSocket-based tool execution support to SillyTavern',
    author: 'SillyTavern Community',
    homePage: 'https://github.com/SillyTavern/SillyTavern',
    type: 'module',
    requires: {
        api: '1.0.0'
    }
};

/**
 * Default settings
 */
const DEFAULT_SETTINGS = {
    websocket: {
        port: 5005
    },
    logging: {
        level: 'info'
    }
};

/**
 * Plugin state
 */
let settings = { ...DEFAULT_SETTINGS };
let wsServer = null;

/**
 * Initialize plugin
 * @param {object} pluginConfig Plugin configuration
 */
export async function init(pluginConfig) {
    logger.info('Initializing MCP Extension');
    
    // Load and validate settings
    const newSettings = {
        ...DEFAULT_SETTINGS,
        ...pluginConfig
    };
    validateSettings(newSettings);
    settings = newSettings;

    // Update log level
    logger.setLevel(settings.logging.level);

    // Initialize WebSocket server
    initWebSocketServer();
}

/**
 * Initialize WebSocket server
 */
function initWebSocketServer() {
    if (wsServer) {
        logger.info('Shutting down existing WebSocket server');
        wsServer.close();
    }

    try {
        wsServer = new WebSocketServer({ port: settings.websocket.port });
        
        wsServer.on('listening', () => {
            logger.info(`WebSocket server listening on port ${settings.websocket.port}`);
        });

        wsServer.on('connection', handleWebSocketConnection);

        wsServer.on('error', (error) => {
            logger.error('WebSocket server error:', error);
        });
    } catch (error) {
        logger.error('Failed to initialize WebSocket server:', error);
    }
}

/**
 * Handle WebSocket connection
 * @param {WebSocket} ws WebSocket connection
 */
function handleWebSocketConnection(ws) {
    logger.debug('New WebSocket connection');

    ws.on('message', async (data) => {
        try {
            const message = JSON.parse(data.toString());
            await handleWebSocketMessage(ws, message);
        } catch (error) {
            logger.error('Failed to handle WebSocket message:', error);
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'error',
                    error: {
                        code: error.code || ErrorCodes.SERVER_ERROR,
                        message: error.message
                    }
                }));
            }
        }
    });

    ws.on('close', () => {
        logger.debug('WebSocket connection closed');
    });

    ws.on('error', (error) => {
        logger.error('WebSocket connection error:', error);
    });
}

/**
 * Handle WebSocket message
 * @param {WebSocket} ws WebSocket connection
 * @param {object} message Message object
 */
async function handleWebSocketMessage(ws, message) {
    switch (message.type) {
        case 'register_tool':
            validateToolRegistration(message.data);
            handleToolRegistration(ws, message.data);
            break;
            
        case 'execute_tool':
            validateToolExecution(message.data);
            await handleToolExecution(ws, message.data);
            break;
            
        default:
            throw new MCPError(
                ErrorCodes.INVALID_REQUEST,
                `Unknown message type: ${message.type}`
            );
    }
}

/**
 * Handle tool registration
 * @param {WebSocket} ws WebSocket connection
 * @param {object} data Registration data
 */
function handleToolRegistration(ws, data) {
    const { name, schema } = data;
    logger.info(`Registering tool: ${name}`);
    
    // Broadcast tool registration to all clients
    wsServer.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'tool_registered',
                data: { name, schema }
            }));
        }
    });
}

/**
 * Handle tool execution
 * @param {WebSocket} ws WebSocket connection
 * @param {object} data Execution data
 */
async function handleToolExecution(ws, data) {
    const { executionId, name, args } = data;
    logger.info(`Executing tool: ${name}`, { executionId, args });
    
    // Broadcast execution start
    wsServer.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'tool_execution_started',
                data: { executionId, name, args }
            }));
        }
    });

    try {
        // Execute tool (implementation specific to each tool)
        const result = await executeTool(name, args);
        
        // Broadcast execution success
        wsServer.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'tool_execution_completed',
                    data: { executionId, result }
                }));
            }
        });
    } catch (error) {
        logger.error(`Tool execution failed: ${name}`, error);
        
        // Broadcast execution failure
        wsServer.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'tool_execution_failed',
                    data: {
                        executionId,
                        error: {
                            code: error.code || ErrorCodes.TOOL_EXECUTION_FAILED,
                            message: error.message
                        }
                    }
                }));
            }
        });
    }
}

/**
 * Execute a tool
 * @param {string} name Tool name
 * @param {object} args Tool arguments
 * @returns {Promise<any>} Tool result
 */
async function executeTool(name, args) {
    // This is a placeholder - actual tool execution would be implemented
    // based on the specific tools registered with the system
    throw new MCPError(
        ErrorCodes.TOOL_NOT_FOUND,
        `Tool not implemented: ${name}`
    );
}

/**
 * Create Express router for plugin endpoints
 * @returns {express.Router} Express router
 */
export function createRouter() {
    const router = express.Router();

    // Serve static files
    router.use('/public', express.static(path.join(__dirname, 'public')));

    // Settings endpoints
    router.get('/settings', (req, res) => {
        res.json(settings);
    });

    router.post('/settings', express.json(), (req, res, next) => {
        try {
            const newSettings = {
                ...settings,
                ...req.body
            };
            validateSettings(newSettings);
            settings = newSettings;
            
            // Update log level
            logger.setLevel(settings.logging.level);
            
            // Restart WebSocket server if port changed
            if (req.body.websocket?.port !== undefined) {
                initWebSocketServer();
            }
            
            res.json(settings);
        } catch (error) {
            next(error);
        }
    });

    // Error handling
    router.use(errorHandler);

    return router;
}

/**
 * Plugin event handlers
 */
export const events = {
    async onShutdown() {
        logger.info('Shutting down MCP Extension');
        if (wsServer) {
            wsServer.close();
        }
    }
};