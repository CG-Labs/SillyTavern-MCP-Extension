/**
 * MCP Extension client-side script
 */
window.mcpExtension = {
    socket: null,
    settings: {
        websocket: {
            port: 5005
        },
        logging: {
            level: 'info'
        }
    },
    tools: new Map(),
    activeExecutions: new Map()
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
        case 'tool_registered':
            window.mcpExtension.tools.set(message.data.name, message.data.schema);
            updateToolsList();
            break;
            
        case 'tool_execution_started': {
            const { executionId, name, args } = message.data;
            const element = createToolExecutionElement(name, args);
            const executionsList = document.getElementById('mcp_executions_list');
            
            if (element && executionsList) {
                executionsList.appendChild(element);
                window.mcpExtension.activeExecutions.set(executionId, { name, args, element });
                updateToolExecution(executionId, 'running');
            }
            break;
        }
            
        case 'tool_execution_completed': {
            const { executionId, result } = message.data;
            updateToolExecution(executionId, 'success', result);
            break;
        }
            
        case 'tool_execution_failed': {
            const { executionId, error } = message.data;
            updateToolExecution(executionId, 'error', error);
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
        toolsList.innerHTML = '<div class="mcp-no-tools">No tools registered</div>';
        return;
    }

    const toolsHtml = Array.from(window.mcpExtension.tools.entries())
        .map(([name, schema]) => `
            <div class="mcp-tool">
                <div class="mcp-tool-name">${name}</div>
                <div class="mcp-tool-schema">
                    <pre>${JSON.stringify(schema, null, 2)}</pre>
                </div>
            </div>
        `)
        .join('');

    toolsList.innerHTML = toolsHtml;
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