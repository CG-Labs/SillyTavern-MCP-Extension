# Model Context Protocol (MCP) Extension for SillyTavern

This extension adds Model Context Protocol (MCP) support to SillyTavern, enabling seamless integration with AI tools and services through a standardized protocol.

## Features

- **MCP Protocol Support**: Full implementation of the Model Context Protocol
- **Tool Discovery**: Automatic discovery of MCP-compatible tools
- **Tool Management**: Register, execute, and manage MCP tools
- **Real-time Status**: Monitor tool execution status in real-time
- **WebSocket Interface**: Reliable WebSocket-based communication
- **User-friendly UI**: Integrated with SillyTavern's interface

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

#### Server Configuration
- **Server Name**: Name of your MCP server (default: "SillyTavern MCP Server")
- **Version**: MCP protocol version (read-only)
- **WebSocket Port**: Main server port (default: 5005)
- **Discovery Port**: Tool discovery port (default: 5006)
- **Discovery Enabled**: Enable/disable tool discovery

#### Logging
- **Log Level**: Logging verbosity level (debug, info, warn, error)

## Usage

### Using MCP Tools

#### Tool Discovery
1. Open the MCP Extension settings
2. Click "Discover Tools" to find available MCP-compatible tools
3. Tools will appear in the list with their descriptions

#### Managing Tools
- Click on a tool to view its details
- Tool details include:
  - Name and description
  - Input schema
  - Execution options
- Use the "Execute" button to run tools
- Monitor execution status in real-time

### Implementing MCP Tools

To register an MCP-compatible tool, send a WebSocket message:

```json
{
    "type": "register_tool",
    "data": {
        "name": "example_tool",
        "description": "Tool description",
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

### Validation Errors
- `INVALID_NAME`: Invalid tool name
- `INVALID_SCHEMA`: Invalid tool schema
- `INVALID_URI`: Invalid resource URI
- `INVALID_HANDLER`: Invalid handler implementation
- `INVALID_ARGUMENTS`: Invalid tool arguments
- `INVALID_MESSAGE`: Invalid MCP message format

### Protocol Errors
- `INVALID_MCP_VERSION`: Unsupported MCP version
- `UNSUPPORTED_CAPABILITY`: Requested capability not supported
- `INVALID_TOOL_SCHEMA`: Invalid MCP tool schema
- `TOOL_REGISTRATION_FAILED`: Failed to register tool
- `EXECUTION_NOT_FOUND`: Execution ID not found
- `EXECUTION_ALREADY_COMPLETED`: Tool execution already completed
- `STREAMING_NOT_SUPPORTED`: Streaming not supported
- `ASYNC_NOT_SUPPORTED`: Async execution not supported

### Server Errors
- `TOOL_EXISTS`: Tool already registered
- `TOOL_NOT_FOUND`: Tool not found
- `TOOL_EXECUTION_FAILED`: Tool execution failed
- `SERVER_ERROR`: Internal server error
- `SERVER_NOT_READY`: Server not ready
- `CONNECTION_ERROR`: Connection error

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