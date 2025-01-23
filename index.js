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
        port: 5005,
        discoveryEnabled: true,
        discoveryPort: 5006
    },
    logging: {
        level: 'info'
    },
    mcp: {
        serverName: 'SillyTavern MCP Server',
        version: '1.0.0',
        capabilities: ['tool_execution']
    }
};

/**
 * Plugin state
 */
let settings = { ...DEFAULT_SETTINGS };
let wsServer = null;
let discoveryServer = null;
let registeredTools = new Map();

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

    // Initialize servers
    initServers();
}

/**
 * Initialize servers
 */
function initServers() {
    // Initialize WebSocket server
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

    // Initialize discovery server if enabled
    if (settings.websocket.discoveryEnabled) {
        if (discoveryServer) {
            logger.info('Shutting down existing discovery server');
            discoveryServer.close();
        }

        try {
            discoveryServer = new WebSocketServer({ port: settings.websocket.discoveryPort });
            
            discoveryServer.on('listening', () => {
                logger.info(`MCP discovery server listening on port ${settings.websocket.discoveryPort}`);
            });

            discoveryServer.on('connection', handleDiscoveryConnection);

            discoveryServer.on('error', (error) => {
                logger.error('Discovery server error:', error);
            });
        } catch (error) {
            logger.error('Failed to initialize discovery server:', error);
        }
    }
}

/**
 * Handle discovery server connection
 * @param {WebSocket} ws WebSocket connection
 */
function handleDiscoveryConnection(ws) {
    logger.debug('New discovery connection');

    ws.on('message', async (data) => {
        try {
            const message = JSON.parse(data.toString());
            validateMCPMessage(message);

            if (message.type === MCPMessageTypes.DISCOVER) {
                // Send server information
                ws.send(JSON.stringify({
                    type: MCPMessageTypes.DISCOVER_RESPONSE,
                    server: {
                        name: settings.mcp.serverName,
                        version: settings.mcp.version,
                        capabilities: settings.mcp.capabilities,
                        websocketPort: settings.websocket.port,
                        tools: Array.from(registeredTools.values()).map(tool => ({
                            name: tool.name,
                            description: tool.description
                        }))
                    }
                }));
            }
        } catch (error) {
            logger.error('Failed to handle discovery message:', error);
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: MCPMessageTypes.ERROR,
                    error: {
                        code: error.code || ErrorCodes.SERVER_ERROR,
                        message: error.message
                    }
                }));
            }
        }
    });

    ws.on('error', (error) => {
        logger.error('Discovery connection error:', error);
    });
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
    validateMCPMessage(message);

    switch (message.type) {
        case MCPMessageTypes.DISCOVER:
            handleDiscovery(ws);
            break;

        case MCPMessageTypes.REGISTER_TOOL:
            validateToolRegistration(message.data);
            handleToolRegistration(ws, message.data);
            break;
            
        case MCPMessageTypes.EXECUTE_TOOL:
            validateToolExecution(message.data);
            await handleToolExecution(ws, message.data);
            break;
            
        default:
            throw new MCPError(
                ErrorCodes.INVALID_MESSAGE,
                `Unsupported message type: ${message.type}`
            );
    }
}

/**
 * Handle MCP discovery request
 * @param {WebSocket} ws WebSocket connection
 */
function handleDiscovery(ws) {
    logger.debug('Handling MCP discovery request');
    
    const response = {
        type: MCPMessageTypes.DISCOVER_RESPONSE,
        server: {
            name: settings.mcp.serverName,
            version: settings.mcp.version,
            capabilities: settings.mcp.capabilities
        }
    };

    ws.send(JSON.stringify(response));
}

/**
 * Handle tool registration
 * @param {WebSocket} ws WebSocket connection
 * @param {object} data Registration data
 */
function handleToolRegistration(ws, data) {
    const { name, schema, description } = data;
    logger.info(`Registering MCP tool: ${name}`);
    
    try {
        // Validate tool schema
        validateToolSchema(schema);
        
        // Store tool registration
        const tool = {
            name,
            schema,
            description,
            registeredAt: new Date().toISOString()
        };

        // Send registration response
        ws.send(JSON.stringify({
            type: MCPMessageTypes.REGISTER_TOOL_RESPONSE,
            data: {
                success: true,
                tool
            }
        }));
        
        // Broadcast tool registration to all clients
        wsServer.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: MCPMessageTypes.REGISTER_TOOL,
                    data: tool
                }));
            }
        });
    } catch (error) {
        logger.error('Tool registration failed:', error);
        ws.send(JSON.stringify({
            type: MCPMessageTypes.ERROR,
            error: {
                code: ErrorCodes.TOOL_REGISTRATION_FAILED,
                message: error.message
            }
        }));
    }
}

/**
 * Handle tool execution
 * @param {WebSocket} ws WebSocket connection
 * @param {object} data Execution data
 */
async function handleToolExecution(ws, data) {
    const { executionId, name, args } = data;
    logger.info(`Executing MCP tool: ${name}`, { executionId, args });
    
    // Send execution status
    const sendStatus = (status, details = {}) => {
        ws.send(JSON.stringify({
            type: MCPMessageTypes.EXECUTION_STATUS,
            data: {
                executionId,
                status,
                timestamp: new Date().toISOString(),
                ...details
            }
        }));
    };

    try {
        // Send started status
        sendStatus(MCPExecutionStatus.STARTED);
        
        // Execute tool
        const result = await executeTool(name, args);
        
        // Send completion status with result
        sendStatus(MCPExecutionStatus.COMPLETED, { result });
        
        // Send execution response
        ws.send(JSON.stringify({
            type: MCPMessageTypes.EXECUTE_TOOL_RESPONSE,
            data: {
                executionId,
                result
            }
        }));
    } catch (error) {
        logger.error(`Tool execution failed: ${name}`, error);
        
        // Send failure status
        sendStatus(MCPExecutionStatus.FAILED, {
            error: {
                code: error.code || ErrorCodes.TOOL_EXECUTION_FAILED,
                message: error.message
            }
        });
        
        // Send error response
        ws.send(JSON.stringify({
            type: MCPMessageTypes.ERROR,
            error: {
                code: error.code || ErrorCodes.TOOL_EXECUTION_FAILED,
                message: error.message,
                executionId
            }
        }));
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
        if (discoveryServer) {
            discoveryServer.close();
        }
    }
};