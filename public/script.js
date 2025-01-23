/**
 * MCP Extension client-side script
 */
window.mcpExtension = {
    socket: null,
    settings: {
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
    },
    tools: new Map(),
    activeExecutions: new Map(),
    selectedTool: null
};

/**
 * Check if a value is a valid log level
 * @param {string} value Value to check
 * @returns {boolean} True if value is a valid log level
 */
function isValidLogLevel(value) {
    return ['debug', 'info', 'warn', 'error'].includes(value);
}

/**
 * Set log level with type checking
 * @param {string} level Log level to set
 */
function setLogLevel(level) {
    if (isValidLogLevel(level)) {
        window.mcpExtension.settings.logging.level = level;
    }
}

/**
 * Create tool execution UI element
 * @param {string} toolName Tool name
 * @param {object} args Tool arguments
 * @returns {HTMLElement|null} Tool execution element
 */
function createToolExecutionElement(toolName, args) {
    const template = document.querySelector('#tool-execution-template');
    if (!(template instanceof HTMLTemplateElement)) {
        console.error('Tool execution template not found');
        return null;
    }

    const element = template.content.cloneNode(true);
    if (!(element instanceof DocumentFragment)) {
        console.error('Failed to clone template');
        return null;
    }

    const container = element.firstElementChild;
    if (!container || !(container instanceof HTMLElement)) {
        console.error('Template has no valid root element');
        return null;
    }

    const nameElement = container.querySelector('.mcp-tool-name');
    const argsElement = container.querySelector('.args-display');

    if (nameElement && argsElement) {
        nameElement.textContent = toolName;
        argsElement.textContent = JSON.stringify(args, null, 2);
    }

    return container;
}

/**
 * Update tool execution status
 * @param {string} executionId Execution ID
 * @param {string} status Status ('running'|'success'|'error')
 * @param {object} [data] Optional result or error data
 */
function updateToolExecution(executionId, status, data) {
    const execution = window.mcpExtension.activeExecutions.get(executionId);
    if (!execution || !execution.element) return;

    const { element } = execution;

    // Find all required elements
    const indicator = element.querySelector('.status-indicator');
    const statusText = element.querySelector('.status-text');
    const resultDisplay = element.querySelector('.result-display');
    const errorDisplay = element.querySelector('.error-display');
    const errorContainer = element.querySelector('.mcp-tool-error');

    // Update status if elements exist
    if (indicator && statusText) {
        indicator.className = 'status-indicator ' + status;
        statusText.textContent = status.charAt(0).toUpperCase() + status.slice(1);
    }

    // Update result/error if elements exist
    if (status === 'success' && resultDisplay && errorContainer) {
        resultDisplay.textContent = JSON.stringify(data, null, 2);
        errorContainer.classList.add('hidden');
    } else if (status === 'error' && errorDisplay && errorContainer) {
        errorDisplay.textContent = JSON.stringify(data, null, 2);
        errorContainer.classList.remove('hidden');
    }

    // Remove from active executions if completed
    if (status !== 'running') {
        window.mcpExtension.activeExecutions.delete(executionId);
    }
}

/**
 * Initialize the extension
 */
async function initializeMCP() {
    // Load settings
    await loadSettings();
    
    // Initialize WebSocket connection
    connectWebSocket();

    // Setup UI event handlers
    setupEventHandlers();

    // Update UI
    updateUI();
}

/**
 * Load extension settings
 */
async function loadSettings() {
    try {
        const response = await fetch('/api/plugins/mcp-extension/settings');
        if (response.ok) {
            const settings = await response.json();
            window.mcpExtension.settings = {
                ...window.mcpExtension.settings,
                ...settings
            };
        }
    } catch (error) {
        console.error('Failed to load MCP settings:', error);
    }
}

/**
 * Save extension settings
 */
async function saveSettings() {
    try {
        const response = await fetch('/api/plugins/mcp-extension/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(window.mcpExtension.settings)
        });
        
        if (!response.ok) {
            throw new Error('Failed to save settings');
        }
    } catch (error) {
        console.error('Failed to save MCP settings:', error);
        alert('Failed to save settings. Check console for details.');
    }
}

/**
 * Initialize WebSocket connection
 */
function connectWebSocket() {
    const { port } = window.mcpExtension.settings.websocket;
    
    if (window.mcpExtension.socket) {
        window.mcpExtension.socket.close();
    }

    const socket = new WebSocket(`ws://localhost:${port}`);
    
    socket.onopen = () => {
        console.log('WebSocket connected');
        updateConnectionStatus(true);
    };

    socket.onclose = () => {
        console.log('WebSocket disconnected');
        updateConnectionStatus(false);
        // Try to reconnect after 5 seconds
        setTimeout(connectWebSocket, 5000);
    };

    socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        updateConnectionStatus(false);
    };

    socket.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            handleWebSocketMessage(message);
        } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
        }
    };

    window.mcpExtension.socket = socket;
}

/**
 * Handle incoming WebSocket messages
 * @param {object} message Message object
 */
function handleWebSocketMessage(message) {
    switch (message.type) {
        case 'discover_response': {
            const { server } = message;
            console.log('MCP Server discovered:', server);
            // Update server info in UI if needed
            break;
        }

        case 'register_tool': {
            const tool = message.data;
            window.mcpExtension.tools.set(tool.name, tool);
            updateToolsList();
            break;
        }

        case 'register_tool_response': {
            const { success, tool, error } = message.data;
            if (success) {
                window.mcpExtension.tools.set(tool.name, tool);
                updateToolsList();
            } else {
                console.error('Tool registration failed:', error);
            }
            break;
        }

        case 'execution_status': {
            const { executionId, status, result, error } = message.data;
            const execution = window.mcpExtension.activeExecutions.get(executionId);
            if (execution) {
                execution.status = status;
                if (result) execution.result = result;
                if (error) execution.error = error;
                updateExecutionsList();
            }
            break;
        }

        case 'execute_tool_response': {
            const { executionId, result } = message.data;
            const execution = window.mcpExtension.activeExecutions.get(executionId);
            if (execution) {
                execution.status = 'completed';
                execution.result = result;
                execution.endTime = new Date();
                updateExecutionsList();
            }
            break;
        }

        case 'error': {
            const { code, message: errorMessage, executionId } = message.error;
            console.error('MCP Error:', code, errorMessage);
            
            if (executionId) {
                const execution = window.mcpExtension.activeExecutions.get(executionId);
                if (execution) {
                    execution.status = 'failed';
                    execution.error = { code, message: errorMessage };
                    execution.endTime = new Date();
                    updateExecutionsList();
                }
            }
            break;
        }

        default:
            console.log('Unknown message type:', message.type);
    }
}

/**
 * Update connection status in UI
 * @param {boolean} connected Connection status
 */
function updateConnectionStatus(connected) {
    const statusElement = document.getElementById('mcp_ws_status');
    if (statusElement) {
        statusElement.textContent = connected ? 'Connected' : 'Disconnected';
        statusElement.classList.toggle('connected', connected);
    }
}

/**
 * Update tools list in UI
 */
function updateToolsList() {
    const toolsList = document.getElementById('mcp_tools_list');
    if (!toolsList) return;

    if (window.mcpExtension.tools.size === 0) {
        toolsList.innerHTML = '<div class="mcp-no-tools">No MCP tools registered</div>';
        return;
    }

    const toolsHtml = Array.from(window.mcpExtension.tools.entries())
        .map(([name, tool]) => `
            <div class="mcp-tool" data-tool-name="${name}">
                <div class="mcp-tool-header">
                    <div class="mcp-tool-name">${name}</div>
                    <div class="mcp-tool-status">
                        <span class="mcp-tool-type">MCP Tool</span>
                    </div>
                </div>
                <div class="mcp-tool-description">${tool.description || ''}</div>
            </div>
        `)
        .join('');

    toolsList.innerHTML = toolsHtml;

    // Add click handlers
    toolsList.querySelectorAll('.mcp-tool').forEach(toolElement => {
        toolElement.addEventListener('click', () => {
            const toolName = toolElement.dataset.toolName;
            selectTool(toolName);
        });
    });
}

/**
 * Select a tool and show its details
 * @param {string} toolName Name of tool to select
 */
function selectTool(toolName) {
    const tool = window.mcpExtension.tools.get(toolName);
    if (!tool) return;

    window.mcpExtension.selectedTool = toolName;

    // Update tool details UI
    const detailsElement = document.getElementById('mcp_tool_details');
    if (!detailsElement) return;

    detailsElement.querySelector('.mcp-tool-name').textContent = toolName;
    detailsElement.querySelector('.mcp-tool-description').textContent = tool.description || '';
    detailsElement.querySelector('.mcp-schema-display').textContent = JSON.stringify(tool.schema, null, 2);
    
    detailsElement.classList.remove('hidden');

    // Update selected state in list
    const toolsList = document.getElementById('mcp_tools_list');
    if (toolsList) {
        toolsList.querySelectorAll('.mcp-tool').forEach(element => {
            element.classList.toggle('selected', element.dataset.toolName === toolName);
        });
    }
}

/**
 * Execute the selected tool
 * @param {object} args Tool arguments
 * @returns {Promise<void>}
 */
async function executeSelectedTool(args) {
    if (!window.mcpExtension.selectedTool) return;

    const executionId = crypto.randomUUID();
    const tool = window.mcpExtension.tools.get(window.mcpExtension.selectedTool);

    if (!window.mcpExtension.socket || window.mcpExtension.socket.readyState !== WebSocket.OPEN) {
        throw new Error('WebSocket not connected');
    }

    window.mcpExtension.socket.send(JSON.stringify({
        type: 'execute_tool',
        data: {
            executionId,
            name: window.mcpExtension.selectedTool,
            args
        }
    }));

    // Create execution UI
    const execution = {
        id: executionId,
        tool: window.mcpExtension.selectedTool,
        args,
        status: 'running',
        startTime: new Date()
    };

    window.mcpExtension.activeExecutions.set(executionId, execution);
    updateExecutionsList();
}

/**
 * Discover MCP tools
 * @returns {Promise<void>}
 */
async function discoverTools() {
    if (!window.mcpExtension.socket || window.mcpExtension.socket.readyState !== WebSocket.OPEN) {
        throw new Error('WebSocket not connected');
    }

    window.mcpExtension.socket.send(JSON.stringify({
        type: 'discover'
    }));
}

/**
 * Setup UI event handlers
 */
function setupEventHandlers() {
    // Port input
    const portInput = document.getElementById('mcp_websocket_port');
    if (portInput && portInput instanceof HTMLInputElement) {
        portInput.value = window.mcpExtension.settings.websocket.port.toString();
        portInput.addEventListener('change', (e) => {
            if (e.target instanceof HTMLInputElement) {
                window.mcpExtension.settings.websocket.port = parseInt(e.target.value, 10);
            }
        });
    }

    // Log level select
    const logLevelSelect = document.getElementById('mcp_log_level');
    if (logLevelSelect && logLevelSelect instanceof HTMLSelectElement) {
        logLevelSelect.value = window.mcpExtension.settings.logging.level;
        logLevelSelect.addEventListener('change', (e) => {
            if (e.target instanceof HTMLSelectElement) {
                setLogLevel(e.target.value);
            }
        });
    }

    // Restart server button
    const restartButton = document.getElementById('mcp_restart_server');
    if (restartButton) {
        restartButton.addEventListener('click', async () => {
            await saveSettings();
            connectWebSocket();
        });
    }

    // Apply settings button
    const applyButton = document.getElementById('mcp_apply_settings');
    if (applyButton) {
        applyButton.addEventListener('click', saveSettings);
    }
}

/**
 * Update all UI elements
 */
function updateUI() {
    updateConnectionStatus(window.mcpExtension.socket?.readyState === WebSocket.OPEN);
    updateToolsList();
}

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', initializeMCP);