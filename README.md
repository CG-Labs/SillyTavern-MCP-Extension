# MCP Extension for SillyTavern

This extension adds WebSocket-based tool execution support to SillyTavern, allowing external tools to be registered and executed through a standardized interface.

## Features

- WebSocket server for real-time communication
- Tool registration and execution system
- JSON Schema validation for tool definitions
- Real-time execution status updates
- Configurable logging and WebSocket settings
- Web-based settings UI integrated into SillyTavern

## Installation

### Method 1: Web Interface (Recommended)

See [INSTRUCTIONS.md](INSTRUCTIONS.md) for step-by-step instructions on installing through SillyTavern's web interface.

### Method 2: Manual Installation

1. Clone this repository into your SillyTavern plugins directory:
   ```bash
   cd /path/to/SillyTavern/plugins
   git clone https://github.com/CG-Labs/SillyTavern-MCP-Extension.git mcp-extension
   ```

2. Install dependencies:
   ```bash
   cd mcp-extension
   npm install
   ```

3. Restart SillyTavern

## Configuration

The extension can be configured through the SillyTavern UI under Settings > Extensions > MCP Extension.

### Available Settings

- **WebSocket Port**: The port number for the WebSocket server (default: 5005)
- **Log Level**: Logging verbosity level (debug, info, warn, error)

## Usage

### Registering a Tool

To register a tool, send a WebSocket message with the following format:

```json
{
    "type": "register_tool",
    "data": {
        "name": "example_tool",
        "schema": {
            "type": "object",
            "properties": {
                "param1": {
                    "type": "string",
                    "description": "First parameter"
                },
                "param2": {
                    "type": "number",
                    "description": "Second parameter"
                }
            },
            "required": ["param1"]
        }
    }
}
```

### Executing a Tool

To execute a registered tool, send a WebSocket message with the following format:

```json
{
    "type": "execute_tool",
    "data": {
        "executionId": "unique_execution_id",
        "name": "example_tool",
        "args": {
            "param1": "value1",
            "param2": 42
        }
    }
}
```

### Execution Status Updates

The extension broadcasts execution status updates to all connected clients:

#### Execution Started
```json
{
    "type": "tool_execution_started",
    "data": {
        "executionId": "unique_execution_id",
        "name": "example_tool",
        "args": {
            "param1": "value1",
            "param2": 42
        }
    }
}
```

#### Execution Completed
```json
{
    "type": "tool_execution_completed",
    "data": {
        "executionId": "unique_execution_id",
        "result": {
            // Tool-specific result data
        }
    }
}
```

#### Execution Failed
```json
{
    "type": "tool_execution_failed",
    "data": {
        "executionId": "unique_execution_id",
        "error": {
            "code": "ERROR_CODE",
            "message": "Error message"
        }
    }
}
```

## Error Codes

- `INVALID_NAME`: Invalid tool name
- `INVALID_SCHEMA`: Invalid tool schema
- `INVALID_URI`: Invalid resource URI
- `INVALID_HANDLER`: Invalid handler implementation
- `INVALID_ARGUMENTS`: Invalid tool arguments
- `TOOL_EXISTS`: Tool already registered
- `TOOL_NOT_FOUND`: Tool not found
- `TOOL_EXECUTION_FAILED`: Tool execution failed
- `SERVER_ERROR`: Internal server error

## Development

### Project Structure

```
mcp-extension/
├── index.js              # Main plugin entry point
├── manifest.json         # Plugin manifest
├── package.json         # Dependencies and scripts
├── public/              # Public assets
│   ├── script.js        # Client-side JavaScript
│   ├── style.css        # Client-side styles
│   └── templates/       # HTML templates
├── utils/               # Utility modules
│   ├── errors.js        # Error handling
│   ├── logger.js        # Logging utility
│   └── validation.js    # Input validation
└── README.md            # This documentation
```

### Adding New Tools

To add a new tool:

1. Connect to the WebSocket server
2. Register your tool with a schema
3. Listen for execution requests
4. Handle execution and return results

Example tool implementation:

```javascript
const ws = new WebSocket('ws://localhost:5005');

ws.onopen = () => {
    // Register tool
    ws.send(JSON.stringify({
        type: 'register_tool',
        data: {
            name: 'example_tool',
            schema: {
                type: 'object',
                properties: {
                    input: {
                        type: 'string'
                    }
                },
                required: ['input']
            }
        }
    }));
};

ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    
    if (message.type === 'execute_tool' && 
        message.data.name === 'example_tool') {
        // Handle execution
        const result = doSomething(message.data.args.input);
        
        // Send result
        ws.send(JSON.stringify({
            type: 'tool_execution_completed',
            data: {
                executionId: message.data.executionId,
                result
            }
        }));
    }
};
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## Support

If you encounter any issues or have questions:

1. Check the [GitHub Issues](https://github.com/CG-Labs/SillyTavern-MCP-Extension/issues) for existing problems
2. Create a new issue if your problem hasn't been reported
3. Join the SillyTavern Discord community for support

## License

MIT License - see LICENSE file for details