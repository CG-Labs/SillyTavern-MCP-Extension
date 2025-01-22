/**
 * Logger utility for MCP extension
 */

/**
 * Log levels
 */
export const LogLevels = {
    DEBUG: 'debug',
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error'
};

/**
 * Numeric values for log levels (higher = more severe)
 */
const LOG_LEVEL_VALUES = {
    [LogLevels.DEBUG]: 0,
    [LogLevels.INFO]: 1,
    [LogLevels.WARN]: 2,
    [LogLevels.ERROR]: 3
};

/**
 * Logger class
 */
export class Logger {
    /**
     * Create a new logger
     * @param {string} name Logger name
     * @param {string} [level=info] Minimum log level
     */
    constructor(name, level = LogLevels.INFO) {
        this.name = name;
        this.level = level;
    }

    /**
     * Set minimum log level
     * @param {string} level Log level
     */
    setLevel(level) {
        if (level in LogLevels) {
            this.level = level;
        }
    }

    /**
     * Check if a log level is enabled
     * @param {string} level Log level to check
     * @returns {boolean} True if level is enabled
     */
    isLevelEnabled(level) {
        return LOG_LEVEL_VALUES[level] >= LOG_LEVEL_VALUES[this.level];
    }

    /**
     * Format a log message
     * @param {string} level Log level
     * @param {string} message Message to log
     * @param {object} [data] Additional data to log
     * @returns {string} Formatted log message
     */
    formatMessage(level, message, data) {
        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [${this.name}] [${level.toUpperCase()}]`;
        
        let formattedMessage = `${prefix} ${message}`;
        if (data) {
            formattedMessage += '\n' + JSON.stringify(data, null, 2);
        }
        
        return formattedMessage;
    }

    /**
     * Log a message at a specific level
     * @param {string} level Log level
     * @param {string} message Message to log
     * @param {object} [data] Additional data to log
     */
    log(level, message, data) {
        if (!this.isLevelEnabled(level)) return;

        const formattedMessage = this.formatMessage(level, message, data);
        
        switch (level) {
            case LogLevels.ERROR:
                console.error(formattedMessage);
                break;
            case LogLevels.WARN:
                console.warn(formattedMessage);
                break;
            case LogLevels.INFO:
                console.info(formattedMessage);
                break;
            case LogLevels.DEBUG:
                console.debug(formattedMessage);
                break;
            default:
                console.log(formattedMessage);
        }
    }

    /**
     * Log a debug message
     * @param {string} message Message to log
     * @param {object} [data] Additional data to log
     */
    debug(message, data) {
        this.log(LogLevels.DEBUG, message, data);
    }

    /**
     * Log an info message
     * @param {string} message Message to log
     * @param {object} [data] Additional data to log
     */
    info(message, data) {
        this.log(LogLevels.INFO, message, data);
    }

    /**
     * Log a warning message
     * @param {string} message Message to log
     * @param {object} [data] Additional data to log
     */
    warn(message, data) {
        this.log(LogLevels.WARN, message, data);
    }

    /**
     * Log an error message
     * @param {string} message Message to log
     * @param {object} [data] Additional data to log
     */
    error(message, data) {
        this.log(LogLevels.ERROR, message, data);
    }
}

/**
 * Create a new logger instance
 * @param {string} name Logger name
 * @param {string} [level=info] Minimum log level
 * @returns {Logger} Logger instance
 */
export function createLogger(name, level = LogLevels.INFO) {
    return new Logger(name, level);
}

// Default logger instance
export const logger = createLogger('MCP');