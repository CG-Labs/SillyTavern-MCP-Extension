type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface ToolExecution {
    name: string;
    args: any;
    element: HTMLElement;
}

interface MCPSettings {
    websocket: {
        port: number;
    };
    logging: {
        level: LogLevel;
    };
}

interface MCPExtension {
    socket: WebSocket | null;
    settings: MCPSettings;
    tools: Map<string, any>;
    activeExecutions: Map<string, ToolExecution>;
}

interface Window {
    mcpExtension: MCPExtension;
}

interface HTMLInputElement {
    value: string;
}

interface HTMLSelectElement {
    value: string;
}

interface HTMLTemplateElement extends HTMLElement {
    content: DocumentFragment;
}

declare function isValidLogLevel(value: string): value is LogLevel;